import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';

const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const ARRAY_TYPES = {
  5121: Uint8Array,
  5123: Uint16Array,
  5125: Uint32Array,
  5126: Float32Array,
};

function parseGlb(file) {
  const bytes = fs.readFileSync(file);
  if (bytes.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file} is not a GLB`);
  let json;
  let bin;
  for (let offset = 12; offset < bytes.length;) {
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8').replace(/\0+$/, '').trim());
    if (type === 0x004e4942) bin = chunk;
    offset += 8 + length;
  }
  if (!json || !bin) throw new Error(`${file} is missing JSON or BIN data`);
  return { json, bin: bin.subarray(0, json.buffers[0].byteLength) };
}

function readAccessor(glb, index) {
  const accessor = glb.json.accessors[index];
  const view = glb.json.bufferViews[accessor.bufferView];
  const ArrayType = ARRAY_TYPES[accessor.componentType];
  const components = COMPONENTS[accessor.type];
  if (!ArrayType || !components) throw new Error(`Unsupported accessor ${index}`);
  const elementBytes = ArrayType.BYTES_PER_ELEMENT * components;
  const stride = view.byteStride ?? elementBytes;
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  if (stride === elementBytes) {
    return new ArrayType(glb.bin.buffer, glb.bin.byteOffset + start, accessor.count * components);
  }
  const output = new ArrayType(accessor.count * components);
  for (let i = 0; i < accessor.count; i++) {
    const source = new ArrayType(glb.bin.buffer, glb.bin.byteOffset + start + i * stride, components);
    output.set(source, i * components);
  }
  return output;
}

function pad4(length) {
  return (4 - (length % 4)) % 4;
}

function distanceToSegmentSquared(point, start, end) {
  const segment = end.clone().sub(start);
  const lengthSquared = segment.lengthSq();
  if (lengthSquared < 1e-10) return point.distanceToSquared(start);
  const t = THREE.MathUtils.clamp(point.clone().sub(start).dot(segment) / lengthSquared, 0, 1);
  return point.distanceToSquared(start.clone().addScaledVector(segment, t));
}

function createRiggedModel(donorFile, targetFile, outputFile, options = new Set()) {
  const donor = parseGlb(donorFile);
  const target = parseGlb(targetFile);
  const output = structuredClone(target.json);
  const donorSkin = donor.json.skins[0];
  const targetPrimitive = output.meshes[0].primitives[0];
  const targetPositionAccessor = targetPrimitive.attributes.POSITION;
  const targetPositions = readAccessor(target, targetPositionAccessor);
  const targetBounds = target.json.accessors[targetPositionAccessor];
  const donorPrimitive = donor.json.meshes[0].primitives[0];
  const donorBounds = donor.json.accessors[donorPrimitive.attributes.POSITION];
  const vertexCount = targetBounds.count;

  const donorCenter = [
    (donorBounds.min[0] + donorBounds.max[0]) / 2,
    donorBounds.min[1],
    (donorBounds.min[2] + donorBounds.max[2]) / 2,
  ];
  const targetCenter = [
    (targetBounds.min[0] + targetBounds.max[0]) / 2,
    targetBounds.min[1],
    (targetBounds.min[2] + targetBounds.max[2]) / 2,
  ];
  const donorHeight = donorBounds.max[1] - donorBounds.min[1];
  const targetHeight = targetBounds.max[1] - targetBounds.min[1];
  const scale = donorHeight / Math.max(targetHeight, 1e-6);
  const facingSign = options.has('--flip-facing') ? -1 : 1;
  const positions = new Float32Array(vertexCount * 3);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < vertexCount; i++) {
    const x = (targetPositions[i * 3] - targetCenter[0]) * scale * facingSign + donorCenter[0];
    const y = (targetPositions[i * 3 + 1] - targetCenter[1]) * scale + donorCenter[1];
    const z = (targetPositions[i * 3 + 2] - targetCenter[2]) * scale * facingSign + donorCenter[2];
    positions.set([x, y, z], i * 3);
    min[0] = Math.min(min[0], x); min[1] = Math.min(min[1], y); min[2] = Math.min(min[2], z);
    max[0] = Math.max(max[0], x); max[1] = Math.max(max[1], y); max[2] = Math.max(max[2], z);
  }

  const inverseBindMatrices = readAccessor(donor, donorSkin.inverseBindMatrices);
  const jointPoints = donorSkin.joints.map((nodeIndex, jointIndex) => {
    const matrix = new THREE.Matrix4().fromArray(inverseBindMatrices, jointIndex * 16).invert();
    return {
      jointIndex,
      nodeIndex,
      name: donor.json.nodes[nodeIndex].name,
      point: new THREE.Vector3().setFromMatrixPosition(matrix),
    };
  });
  const jointIndexByNode = new Map(jointPoints.map(joint => [joint.nodeIndex, joint.jointIndex]));
  const excluded = new Set(['head_end', 'headfront', 'LeftToeBase', 'RightToeBase', 'Tail']);
  const segments = jointPoints
    .filter(joint => !excluded.has(joint.name))
    .map(joint => {
      const children = donor.json.nodes[joint.nodeIndex].children ?? [];
      const childJoint = children.map(child => jointIndexByNode.get(child)).find(index => index !== undefined);
      const end = childJoint === undefined ? joint.point : jointPoints[childJoint].point;
      return { ...joint, end };
    });
  const head = jointPoints.find(joint => joint.name === 'Head');
  const neck = jointPoints.find(joint => joint.name === 'neck');
  const hips = jointPoints.find(joint => joint.name === 'Hips');
  if (!head || !neck || !hips) throw new Error('Donor rig is missing Head, neck or Hips');

  const joints = new Uint16Array(vertexCount * 4);
  const weights = new Float32Array(vertexCount * 4);
  const point = new THREE.Vector3();
  const targetDepth = targetBounds.max[2] - targetBounds.min[2];
  const axialBones = new Set(['Hips', 'Spine02', 'Spine01', 'Spine', 'neck']);
  for (let i = 0; i < vertexCount; i++) {
    point.fromArray(positions, i * 3);
    const normalizedTargetY = (targetPositions[i * 3 + 1] - targetBounds.min[1]) / targetHeight;
    const normalizedTargetZ = (targetPositions[i * 3 + 2] - targetCenter[2]) * facingSign / Math.max(targetDepth, 1e-6);
    // Generated cats face +Z. Bind the whole upper-front head volume rigidly
    // to Head so the face cannot be split between neck, shoulders and limbs.
    const rigidHead = normalizedTargetY > 0.45 && normalizedTargetZ > 0;
    if (rigidHead) {
      joints[i * 4] = head.jointIndex;
      weights[i * 4] = 1;
      continue;
    }
    // Keep the connected torso, long fur and curled tail rigid on the root.
    // Only the lower paw/leg volume receives articulated limb weights.
    if (normalizedTargetY > 0.2 || normalizedTargetZ < -0.25) {
      joints[i * 4] = hips.jointIndex;
      weights[i * 4] = 1;
      continue;
    }

    // Keep shoulders and limb bones away from the torso and long fur. They
    // may influence only the lower part of the mesh; otherwise an entire
    // chest patch can be pulled sideways by a foreleg animation.
    const candidates = segments.filter(segment => {
      if (segment.name === 'Head') return false;
      if (normalizedTargetY > 0.2) return axialBones.has(segment.name);
      return true;
    });
    const nearest = candidates
      .map(segment => ({ segment, distance: distanceToSegmentSquared(point, segment.point, segment.end) }))
      .sort((left, right) => left.distance - right.distance)
      .slice(0, 4);
    if (nearest[0].segment.name === 'Head') {
      joints[i * 4] = head.jointIndex;
      weights[i * 4] = 1;
      continue;
    }
    let total = 0;
    const raw = nearest.map(item => {
      const weight = 1 / ((item.distance + 1e-6) ** 1.35);
      total += weight;
      return weight;
    });
    for (let slot = 0; slot < nearest.length; slot++) {
      joints[i * 4 + slot] = nearest[slot].segment.jointIndex;
      weights[i * 4 + slot] = raw[slot] / total;
    }
  }

  const parts = [target.bin, Buffer.alloc(pad4(target.bin.length))];
  let byteOffset = parts.reduce((sum, part) => sum + part.length, 0);
  const append = (typedArray, targetType) => {
    const source = Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
    const offset = byteOffset;
    parts.push(source, Buffer.alloc(pad4(source.length)));
    byteOffset += source.length + pad4(source.length);
    const viewIndex = output.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: source.length, ...(targetType ? { target: targetType } : {}) }) - 1;
    return viewIndex;
  };
  const positionView = append(positions, 34962);
  const jointsView = append(joints, 34962);
  const weightsView = append(weights, 34962);
  const positionIndex = output.accessors.push({ bufferView: positionView, byteOffset: 0, componentType: 5126, count: vertexCount, type: 'VEC3', min, max }) - 1;
  const jointsIndex = output.accessors.push({ bufferView: jointsView, byteOffset: 0, componentType: 5123, count: vertexCount, type: 'VEC4' }) - 1;
  const weightsIndex = output.accessors.push({ bufferView: weightsView, byteOffset: 0, componentType: 5126, count: vertexCount, type: 'VEC4' }) - 1;
  targetPrimitive.attributes.POSITION = positionIndex;
  targetPrimitive.attributes.JOINTS_0 = jointsIndex;
  targetPrimitive.attributes.WEIGHTS_0 = weightsIndex;
  if (options.has('--remove-base')) {
    const sourceIndices = readAccessor(target, targetPrimitive.indices);
    const keptIndices = [];
    for (let offset = 0; offset < sourceIndices.length; offset += 3) {
      const a = sourceIndices[offset];
      const b = sourceIndices[offset + 1];
      const c = sourceIndices[offset + 2];
      if (targetPositions[a * 3 + 1] < -0.4
        && targetPositions[b * 3 + 1] < -0.4
        && targetPositions[c * 3 + 1] < -0.4) continue;
      keptIndices.push(a, b, c);
    }
    const filteredIndices = new Uint32Array(keptIndices);
    const filteredIndexView = append(filteredIndices, 34963);
    targetPrimitive.indices = output.accessors.push({
      bufferView: filteredIndexView,
      byteOffset: 0,
      componentType: 5125,
      count: filteredIndices.length,
      type: 'SCALAR',
      min: [0],
      max: [vertexCount - 1],
    }) - 1;
  }
  output.meshes[0].name = path.basename(targetFile, '.glb');

  const keptAnimations = donor.json.animations
    .filter(animation => !animation.name.includes('clip0'))
    .map(animation => {
      const clone = structuredClone(animation);
      clone.channels = clone.channels.filter(channel => donor.json.nodes[channel.target.node].name !== 'Tail');
      return clone;
    });
  const requiredDonorAccessors = new Set([donorSkin.inverseBindMatrices]);
  keptAnimations.forEach(animation => animation.samplers.forEach(sampler => {
    requiredDonorAccessors.add(sampler.input);
    requiredDonorAccessors.add(sampler.output);
  }));
  const donorViewMap = new Map();
  const donorAccessorMap = new Map();
  for (const accessorIndex of requiredDonorAccessors) {
    const accessor = donor.json.accessors[accessorIndex];
    const oldViewIndex = accessor.bufferView;
    if (!donorViewMap.has(oldViewIndex)) {
      const oldView = donor.json.bufferViews[oldViewIndex];
      const raw = donor.bin.subarray(oldView.byteOffset ?? 0, (oldView.byteOffset ?? 0) + oldView.byteLength);
      donorViewMap.set(oldViewIndex, append(raw, oldView.target));
    }
    const clone = structuredClone(accessor);
    clone.bufferView = donorViewMap.get(oldViewIndex);
    donorAccessorMap.set(accessorIndex, output.accessors.push(clone) - 1);
  }

  output.animations = structuredClone(keptAnimations).map(animation => {
    animation.samplers.forEach(sampler => {
      sampler.input = donorAccessorMap.get(sampler.input);
      sampler.output = donorAccessorMap.get(sampler.output);
    });
    return animation;
  });
  output.nodes = structuredClone(donor.json.nodes);
  output.skins = [structuredClone(donorSkin)];
  output.skins[0].inverseBindMatrices = donorAccessorMap.get(donorSkin.inverseBindMatrices);
  output.scenes = structuredClone(donor.json.scenes);
  output.scene = donor.json.scene ?? 0;
  output.asset = { ...output.asset, generator: 'FurryPal safe donor-rig transfer' };

  const bin = Buffer.concat(parts);
  output.buffers[0].byteLength = bin.length;
  let jsonBytes = Buffer.from(JSON.stringify(output));
  jsonBytes = Buffer.concat([jsonBytes, Buffer.alloc(pad4(jsonBytes.length), 0x20)]);
  const binPadding = Buffer.alloc(pad4(bin.length));
  const paddedBin = Buffer.concat([bin, binPadding]);
  const totalLength = 12 + 8 + jsonBytes.length + 8 + paddedBin.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBytes.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(paddedBin.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  fs.writeFileSync(outputFile, Buffer.concat([header, jsonHeader, jsonBytes, binHeader, paddedBin]));
  console.log(`${path.basename(targetFile)} -> ${path.basename(outputFile)} | ${vertexCount} vertices | ${output.animations.length} clips | ${(fs.statSync(outputFile).size / 1048576).toFixed(1)} MB`);
}

const [, , donorFile, targetFile, outputFile, ...flags] = process.argv;
if (!donorFile || !targetFile || !outputFile) {
  console.error('usage: node rig-static-cats.mjs <donor-rigged.glb> <target.glb> <output.glb> [--flip-facing] [--remove-base]');
  process.exit(1);
}
createRiggedModel(donorFile, targetFile, outputFile, new Set(flags));
