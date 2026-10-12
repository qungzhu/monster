import fs from 'node:fs';
import path from 'node:path';

const inputPath = path.resolve('public/models/generated/red-fox.glb');
const outputPath = path.resolve('public/models/generated/red-fox-animated.glb');

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

function parseGLB(filePath) {
  const file = fs.readFileSync(filePath);
  if (file.readUInt32LE(0) !== GLB_MAGIC || file.readUInt32LE(4) !== 2) {
    throw new Error('Expected a binary glTF 2.0 file.');
  }

  let json;
  let binary;
  for (let offset = 12; offset < file.length;) {
    const byteLength = file.readUInt32LE(offset);
    const type = file.readUInt32LE(offset + 4);
    const data = file.subarray(offset + 8, offset + 8 + byteLength);
    if (type === JSON_CHUNK) json = JSON.parse(data.toString('utf8').trim());
    if (type === BIN_CHUNK) binary = Buffer.from(data);
    offset += 8 + byteLength;
  }

  if (!json || !binary) throw new Error('GLB is missing its JSON or binary chunk.');
  return { json, binary };
}

function writeGLB(filePath, json, binary) {
  const jsonBytes = Buffer.from(JSON.stringify(json));
  const paddedJsonLength = Math.ceil(jsonBytes.length / 4) * 4;
  const paddedBinaryLength = Math.ceil(binary.length / 4) * 4;
  const totalLength = 12 + 8 + paddedJsonLength + 8 + paddedBinaryLength;
  const output = Buffer.alloc(totalLength);

  output.writeUInt32LE(GLB_MAGIC, 0);
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(totalLength, 8);
  output.writeUInt32LE(paddedJsonLength, 12);
  output.writeUInt32LE(JSON_CHUNK, 16);
  jsonBytes.copy(output, 20);
  output.fill(0x20, 20 + jsonBytes.length, 20 + paddedJsonLength);

  const binHeader = 20 + paddedJsonLength;
  output.writeUInt32LE(paddedBinaryLength, binHeader);
  output.writeUInt32LE(BIN_CHUNK, binHeader + 4);
  binary.copy(output, binHeader + 8);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, output);
}

const { json, binary: sourceBinary } = parseGLB(inputPath);
const primitive = json.meshes?.[0]?.primitives?.[0];
if (!primitive) throw new Error('Expected one mesh primitive in the source fox.');
if (json.skins?.length || json.animations?.length) {
  throw new Error('Source fox is already rigged; use the original static red-fox.glb.');
}

const positionAccessor = json.accessors[primitive.attributes.POSITION];
const positionView = json.bufferViews[positionAccessor.bufferView];
if (positionAccessor.componentType !== 5126 || positionAccessor.type !== 'VEC3') {
  throw new Error('Expected float VEC3 positions.');
}

const positionOffset = (positionView.byteOffset ?? 0) + (positionAccessor.byteOffset ?? 0);
const positions = new Float32Array(
  sourceBinary.buffer,
  sourceBinary.byteOffset + positionOffset,
  positionAccessor.count * 3,
);

// The generated fox is already posed sitting down. This deliberately compact
// quadruped rig follows that silhouette instead of trying to force a standing
// rest pose, which would stretch the texture and folded rear legs.
const bones = [
  { name: 'RigRoot', position: [0, 0, 0], parent: null, radius: 0.9 },
  { name: 'Pelvis', position: [0.08, -0.28, 0], parent: 'RigRoot', radius: 0.5 },
  { name: 'Spine', position: [-0.12, -0.02, 0], parent: 'Pelvis', radius: 0.45 },
  { name: 'Chest', position: [-0.27, 0.22, 0], parent: 'Spine', radius: 0.38 },
  { name: 'Neck', position: [-0.38, 0.43, 0], parent: 'Chest', radius: 0.28 },
  { name: 'Head', position: [-0.48, 0.63, 0], parent: 'Neck', radius: 0.26 },
  { name: 'Snout', position: [-0.67, 0.52, 0], parent: 'Head', radius: 0.18 },
  { name: 'EarL', position: [-0.39, 0.79, 0.16], parent: 'Head', radius: 0.13 },
  { name: 'EarR', position: [-0.39, 0.79, -0.16], parent: 'Head', radius: 0.13 },
  { name: 'FrontUpperL', position: [-0.28, 0.08, 0.14], parent: 'Chest', radius: 0.25 },
  { name: 'FrontLowerL', position: [-0.34, -0.38, 0.14], parent: 'FrontUpperL', radius: 0.24 },
  { name: 'FrontPawL', position: [-0.39, -0.82, 0.14], parent: 'FrontLowerL', radius: 0.2 },
  { name: 'FrontUpperR', position: [-0.28, 0.08, -0.14], parent: 'Chest', radius: 0.25 },
  { name: 'FrontLowerR', position: [-0.34, -0.38, -0.14], parent: 'FrontUpperR', radius: 0.24 },
  { name: 'FrontPawR', position: [-0.39, -0.82, -0.14], parent: 'FrontLowerR', radius: 0.2 },
  { name: 'HindUpperL', position: [0.03, -0.3, 0.24], parent: 'Pelvis', radius: 0.34 },
  { name: 'HindLowerL', position: [0.08, -0.61, 0.27], parent: 'HindUpperL', radius: 0.3 },
  { name: 'HindPawL', position: [0.18, -0.82, 0.25], parent: 'HindLowerL', radius: 0.22 },
  { name: 'HindUpperR', position: [0.03, -0.3, -0.24], parent: 'Pelvis', radius: 0.34 },
  { name: 'HindLowerR', position: [0.08, -0.61, -0.27], parent: 'HindUpperR', radius: 0.3 },
  { name: 'HindPawR', position: [0.18, -0.82, -0.25], parent: 'HindLowerR', radius: 0.22 },
  { name: 'TailBase', position: [0.18, -0.4, 0.12], parent: 'Pelvis', radius: 0.3 },
  { name: 'TailMid', position: [0.4, -0.58, 0.23], parent: 'TailBase', radius: 0.28 },
  { name: 'TailTip', position: [0.66, -0.72, 0.36], parent: 'TailMid', radius: 0.25 },
];

const boneByName = new Map(bones.map((bone, index) => [bone.name, { ...bone, index }]));

function sideName(z, left, right) {
  return z >= 0 ? left : right;
}

function candidateNames(x, y, z) {
  if (y > 0.66 && x > -0.58 && x < -0.16) {
    return [sideName(z, 'EarL', 'EarR'), 'Head', 'Neck'];
  }
  if (x < -0.57 && y > 0.25) return ['Snout', 'Head', 'Neck'];
  if (x < -0.25 && y > 0.22) return ['Head', 'Neck', 'Chest', 'Snout'];

  const tailRegion = x > 0.16 && y < -0.42 && z > 0.02;
  if (tailRegion) return ['TailBase', 'TailMid', 'TailTip', 'Pelvis'];

  if (x < -0.12 && y < 0.1) {
    return z >= 0
      ? ['FrontUpperL', 'FrontLowerL', 'FrontPawL', 'Chest']
      : ['FrontUpperR', 'FrontLowerR', 'FrontPawR', 'Chest'];
  }

  if (x > -0.16 && y < -0.18) {
    return z >= 0
      ? ['HindUpperL', 'HindLowerL', 'HindPawL', 'Pelvis']
      : ['HindUpperR', 'HindLowerR', 'HindPawR', 'Pelvis'];
  }

  return ['Pelvis', 'Spine', 'Chest', 'Neck'];
}

function weightsFor(x, y, z) {
  const candidates = candidateNames(x, y, z).map(name => {
    const bone = boneByName.get(name);
    const dx = x - bone.position[0];
    const dy = y - bone.position[1];
    const dz = z - bone.position[2];
    const distance2 = dx * dx + dy * dy + dz * dz;
    const score = Math.exp(-distance2 / (2 * bone.radius * bone.radius)) + 1e-6;
    return { index: bone.index, score };
  }).sort((a, b) => b.score - a.score).slice(0, 4);

  const total = candidates.reduce((sum, candidate) => sum + candidate.score, 0);
  return candidates.map(candidate => ({ index: candidate.index, weight: candidate.score / total }));
}

const jointData = Buffer.alloc(positionAccessor.count * 4 * 2);
const weightData = Buffer.alloc(positionAccessor.count * 4 * 4);
for (let vertex = 0; vertex < positionAccessor.count; vertex += 1) {
  const x = positions[vertex * 3];
  const y = positions[vertex * 3 + 1];
  const z = positions[vertex * 3 + 2];
  const influences = weightsFor(x, y, z);
  for (let slot = 0; slot < 4; slot += 1) {
    const influence = influences[slot] ?? { index: 0, weight: 0 };
    jointData.writeUInt16LE(influence.index, (vertex * 4 + slot) * 2);
    weightData.writeFloatLE(influence.weight, (vertex * 4 + slot) * 4);
  }
}

const appended = [];
let appendedByteLength = 0;
function appendBuffer(data) {
  const padding = (4 - ((sourceBinary.length + appendedByteLength) % 4)) % 4;
  if (padding) {
    appended.push(Buffer.alloc(padding));
    appendedByteLength += padding;
  }
  const byteOffset = sourceBinary.length + appendedByteLength;
  appended.push(data);
  appendedByteLength += data.length;
  return { byteOffset, byteLength: data.length };
}

json.bufferViews ??= [];
json.accessors ??= [];

function addAccessor(data, accessor, target) {
  const range = appendBuffer(data);
  const bufferView = json.bufferViews.length;
  json.bufferViews.push({ buffer: 0, ...range, ...(target ? { target } : {}) });
  const index = json.accessors.length;
  json.accessors.push({ bufferView, byteOffset: 0, ...accessor });
  return index;
}

primitive.attributes.JOINTS_0 = addAccessor(jointData, {
  componentType: 5123,
  count: positionAccessor.count,
  type: 'VEC4',
}, 34962);
primitive.attributes.WEIGHTS_0 = addAccessor(weightData, {
  componentType: 5126,
  count: positionAccessor.count,
  type: 'VEC4',
}, 34962);

const inverseBindData = Buffer.alloc(bones.length * 16 * 4);
for (let index = 0; index < bones.length; index += 1) {
  const [x, y, z] = bones[index].position;
  const matrix = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    -x, -y, -z, 1,
  ];
  matrix.forEach((value, component) => {
    inverseBindData.writeFloatLE(value, (index * 16 + component) * 4);
  });
}
const inverseBindAccessor = addAccessor(inverseBindData, {
  componentType: 5126,
  count: bones.length,
  type: 'MAT4',
});

json.nodes ??= [];
const firstBoneNode = json.nodes.length;
for (const bone of bones) {
  const parentPosition = bone.parent ? boneByName.get(bone.parent).position : [0, 0, 0];
  json.nodes.push({
    name: bone.name,
    translation: bone.position.map((value, axis) => value - parentPosition[axis]),
  });
}
for (const [boneIndex, bone] of bones.entries()) {
  if (!bone.parent) continue;
  const parent = boneByName.get(bone.parent);
  const parentNode = json.nodes[firstBoneNode + parent.index];
  parentNode.children ??= [];
  parentNode.children.push(firstBoneNode + boneIndex);
}

const rootNode = firstBoneNode + boneByName.get('RigRoot').index;
json.scenes[json.scene ?? 0].nodes ??= [];
json.scenes[json.scene ?? 0].nodes.push(rootNode);
json.skins = [{
  name: 'RedFoxRig',
  inverseBindMatrices: inverseBindAccessor,
  skeleton: rootNode,
  joints: bones.map((_, index) => firstBoneNode + index),
}];
json.nodes[0].skin = 0;

function quaternionFromEuler(x, y, z) {
  const sx = Math.sin(x / 2); const cx = Math.cos(x / 2);
  const sy = Math.sin(y / 2); const cy = Math.cos(y / 2);
  const sz = Math.sin(z / 2); const cz = Math.cos(z / 2);
  return [
    sx * cy * cz + cx * sy * sz,
    cx * sy * cz - sx * cy * sz,
    cx * cy * sz + sx * sy * cz,
    cx * cy * cz - sx * sy * sz,
  ];
}

const q = (x = 0, y = 0, z = 0) => quaternionFromEuler(x, y, z);
const v3 = (x = 0, y = 0, z = 0) => [x, y, z];

function floatBuffer(values) {
  const output = Buffer.alloc(values.length * 4);
  values.forEach((value, index) => output.writeFloatLE(value, index * 4));
  return output;
}

function addClip(name, times, tracks) {
  const timeAccessor = addAccessor(floatBuffer(times), {
    componentType: 5126,
    count: times.length,
    type: 'SCALAR',
    min: [Math.min(...times)],
    max: [Math.max(...times)],
  });
  const animation = { name, samplers: [], channels: [] };

  for (const track of tracks) {
    if (track.values.length !== times.length) {
      throw new Error(`${name}/${track.bone}/${track.path} has the wrong key count.`);
    }
    const width = track.path === 'rotation' ? 4 : 3;
    const outputAccessor = addAccessor(floatBuffer(track.values.flat()), {
      componentType: 5126,
      count: times.length,
      type: width === 4 ? 'VEC4' : 'VEC3',
    });
    const sampler = animation.samplers.length;
    animation.samplers.push({ input: timeAccessor, output: outputAccessor, interpolation: 'LINEAR' });
    animation.channels.push({
      sampler,
      target: {
        node: firstBoneNode + boneByName.get(track.bone).index,
        path: track.path,
      },
    });
  }
  json.animations.push(animation);
}

json.animations = [];

addClip('Idle', [0, 1, 2, 3, 4], [
  { bone: 'Head', path: 'rotation', values: [q(), q(0, -0.05, 0.025), q(0, 0.04, -0.02), q(0, 0.06, 0.018), q()] },
  { bone: 'EarL', path: 'rotation', values: [q(), q(0.05, 0, -0.04), q(-0.03, 0, 0.025), q(0.04, 0, -0.02), q()] },
  { bone: 'EarR', path: 'rotation', values: [q(), q(-0.025, 0, 0.035), q(0.05, 0, -0.03), q(-0.04, 0, 0.025), q()] },
  { bone: 'Chest', path: 'scale', values: [v3(1, 1, 1), v3(1.008, 1.014, 1.008), v3(1, 1, 1), v3(1.006, 1.012, 1.006), v3(1, 1, 1)] },
  { bone: 'TailMid', path: 'rotation', values: [q(), q(0, 0.06, 0), q(0, -0.05, 0), q(0, 0.045, 0), q()] },
  { bone: 'TailTip', path: 'rotation', values: [q(), q(0, 0.1, 0), q(0, -0.09, 0), q(0, 0.08, 0), q()] },
]);

const pounceTimes = [0, 0.35, 0.7, 1.05, 1.35, 1.75, 2.2, 2.6];
addClip('Pounce', pounceTimes, [
  { bone: 'RigRoot', path: 'translation', values: [v3(), v3(0, -0.05, 0), v3(-0.05, 0.05, 0), v3(-0.18, 0.34, 0), v3(-0.3, 0.16, 0), v3(-0.18, 0.01, 0), v3(-0.05, -0.02, 0), v3()] },
  { bone: 'RigRoot', path: 'rotation', values: [q(), q(0, 0, 0.07), q(0, 0, -0.08), q(0, 0, -0.18), q(0, 0, 0.1), q(0, 0, 0.07), q(), q()] },
  { bone: 'Head', path: 'rotation', values: [q(), q(0, 0, 0.1), q(0, 0, -0.08), q(0, 0, -0.12), q(0, 0, 0.16), q(0, 0, 0.08), q(0, 0, -0.03), q()] },
  { bone: 'TailBase', path: 'rotation', values: [q(), q(0, -0.08, 0.04), q(0, 0.12, -0.04), q(0, 0.22, -0.08), q(0, -0.16, 0.05), q(0, -0.08, 0.03), q(), q()] },
  { bone: 'TailMid', path: 'rotation', values: [q(), q(0, -0.12, 0), q(0, 0.18, 0), q(0, 0.28, 0), q(0, -0.22, 0), q(0, -0.12, 0), q(), q()] },
]);

const playTimes = [0, 0.45, 0.9, 1.35, 1.8, 2.25, 2.7, 3.2, 3.6];
addClip('Play', playTimes, [
  { bone: 'RigRoot', path: 'translation', values: [v3(), v3(0, 0.04, 0.04), v3(0, 0, -0.03), v3(-0.02, 0.08, 0.05), v3(), v3(0, 0.05, -0.04), v3(-0.01, 0.09, 0.04), v3(0, 0.02, -0.02), v3()] },
  { bone: 'RigRoot', path: 'rotation', values: [q(), q(0, 0.05, 0.05), q(0, -0.06, -0.04), q(0, 0.08, 0.07), q(), q(0, -0.07, -0.05), q(0, 0.08, 0.06), q(0, -0.03, -0.02), q()] },
  { bone: 'Head', path: 'rotation', values: [q(), q(0.08, -0.2, -0.04), q(-0.06, 0.22, 0.05), q(0.1, -0.24, -0.06), q(), q(-0.08, 0.2, 0.05), q(0.08, -0.18, -0.05), q(0, 0.08, 0.02), q()] },
  { bone: 'TailBase', path: 'rotation', values: [q(), q(0, 0.22, 0), q(0, -0.24, 0), q(0, 0.28, 0), q(0, -0.26, 0), q(0, 0.25, 0), q(0, -0.28, 0), q(0, 0.16, 0), q()] },
  { bone: 'TailMid', path: 'rotation', values: [q(), q(0, 0.3, 0), q(0, -0.34, 0), q(0, 0.38, 0), q(0, -0.36, 0), q(0, 0.35, 0), q(0, -0.38, 0), q(0, 0.22, 0), q()] },
  { bone: 'TailTip', path: 'rotation', values: [q(), q(0, 0.36, 0), q(0, -0.4, 0), q(0, 0.44, 0), q(0, -0.42, 0), q(0, 0.4, 0), q(0, -0.44, 0), q(0, 0.26, 0), q()] },
]);

const affectionTimes = [0, 0.6, 1.2, 1.8, 2.4, 3, 3.6, 4];
addClip('Affection', affectionTimes, [
  { bone: 'RigRoot', path: 'translation', values: [v3(), v3(-0.015, 0.02, 0.025), v3(-0.03, 0.035, 0.045), v3(-0.04, 0.04, 0.055), v3(-0.025, 0.03, 0.04), v3(-0.015, 0.02, 0.025), v3(0, 0.01, 0.01), v3()] },
  { bone: 'Neck', path: 'rotation', values: [q(), q(0.04, 0.08, -0.03), q(0.08, 0.14, -0.06), q(0.11, 0.18, -0.08), q(0.08, 0.13, -0.06), q(0.04, 0.07, -0.03), q(), q()] },
  { bone: 'Head', path: 'rotation', values: [q(), q(0.08, 0.14, -0.05), q(0.14, 0.24, -0.1), q(0.18, 0.3, -0.14), q(0.13, 0.22, -0.1), q(0.07, 0.12, -0.05), q(0, -0.05, 0.02), q()] },
  { bone: 'EarL', path: 'rotation', values: [q(), q(0.05, 0, -0.06), q(0.08, 0, -0.11), q(0.1, 0, -0.14), q(0.07, 0, -0.1), q(0.04, 0, -0.05), q(), q()] },
  { bone: 'EarR', path: 'rotation', values: [q(), q(-0.04, 0, 0.05), q(-0.07, 0, 0.1), q(-0.09, 0, 0.13), q(-0.06, 0, 0.09), q(-0.03, 0, 0.04), q(), q()] },
  { bone: 'TailBase', path: 'rotation', values: [q(), q(0, 0.09, 0), q(0, -0.1, 0), q(0, 0.12, 0), q(0, -0.11, 0), q(0, 0.08, 0), q(0, -0.04, 0), q()] },
  { bone: 'TailMid', path: 'rotation', values: [q(), q(0, 0.15, 0), q(0, -0.17, 0), q(0, 0.19, 0), q(0, -0.18, 0), q(0, 0.14, 0), q(0, -0.07, 0), q()] },
]);

const binary = Buffer.concat([sourceBinary, ...appended]);
json.buffers[0].byteLength = binary.length;
json.asset.generator = `${json.asset.generator}; FurryPal seated-fox rig`;
json.extras = {
  ...(json.extras ?? {}),
  furryPalRig: {
    version: 1,
    source: 'red-fox.glb',
    clips: json.animations.map(animation => animation.name),
    note: 'Reference-driven stylized animation for the original seated pose.',
  },
};

writeGLB(outputPath, json, binary);
console.log(`Created ${path.relative(process.cwd(), outputPath)}`);
console.log(`${bones.length} joints · ${json.animations.map(animation => animation.name).join(', ')}`);
