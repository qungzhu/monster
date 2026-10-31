// Build the 3D models for the native live wallpaper / lock-screen art.
//
//   node scripts/build-wallpaper-models.mjs [outDir]
//
// The app's GLBs use meshopt geometry compression and WebP textures, which
// the native renderers (Filament on Android) don't all read. This writes a
// plain copy of every breed's model: no meshopt, JPEG textures at 512 px,
// about 20k triangles (one pet on the lock screen; battery matters),
// quantized vertices (KHR_mesh_quantization), plus a fabric sheen
// (KHR_materials_sheen) so they look like plush under native PBR too. Also writes manifest.json (breed id -> file, names,
// facing). Default outDir: android/app/src/main/assets/wallpaper.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP, KHRMaterialsSheen } from '@gltf-transform/extensions';
import { quantize, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const root = new URL('../', import.meta.url).pathname;
const out = path.resolve(root, process.argv[2] ?? 'android/app/src/main/assets/wallpaper');

// Breed entries: id, names, model and facing, read from src/data/breeds.ts.
const src = await readFile(path.join(root, 'src/data/breeds.ts'), 'utf8');
const breeds = [];
for (const block of src.split(/\n\s*\{\n/).slice(1)) {
  const get = re => block.match(re)?.[1];
  const id = get(/\bid: '([^']+)'/);
  const glb = get(/\bglbUrl: '([^'?]+)/);
  if (!id || !glb) continue;
  breeds.push({
    id,
    species: get(/\bspecies: '([^']+)'/),
    name: get(/\bname: '([^']+)'/),
    petName: get(/\bpetName: '([^']+)'/),
    model: glb,
    rotationY: /glbRotationY: Math\.PI\b/.test(block) ? Math.PI : 0,
  });
}

await MeshoptDecoder.ready;
await MeshoptSimplifier.ready;
const TARGET_TRIANGLES = 20000;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

await mkdir(out, { recursive: true });
const manifest = [];
let total = 0;
for (const b of breeds) {
  const doc = await io.read(path.join(root, 'public', b.model));
  // Geometry is already decoded on read; drop the compression so it's
  // written back plain.
  for (const ext of doc.getRoot().listExtensionsUsed()) {
    if (ext instanceof EXTMeshoptCompression) ext.dispose();
  }
  const triangles = doc.getRoot().listMeshes().flatMap(m => m.listPrimitives())
    .reduce((n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0);
  await doc.transform(
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, TARGET_TRIANGLES / triangles), error: 0.01 }),
    quantize(),
  );
  await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [512, 512], quality: 85 }));
  for (const ext of doc.getRoot().listExtensionsUsed()) {
    if (ext instanceof EXTTextureWebP) ext.dispose();
  }
  // Plush fabric: soft sheen, no specular shine, and only a trace of the
  // self-glow some Meshy exports ship (same rule as plushMaterial.ts).
  const sheenExt = doc.createExtension(KHRMaterialsSheen);
  for (const m of doc.getRoot().listMaterials()) {
    m.setMetallicFactor(0).setRoughnessFactor(1);
    if (m.getEmissiveTexture()) m.setEmissiveFactor(m.getEmissiveFactor().map(v => v * 0.22));
    m.setExtension('KHR_materials_sheen', sheenExt.createSheen()
      .setSheenColorFactor([0.72, 0.66, 0.6])
      .setSheenRoughnessFactor(0.8));
  }
  const file = `${b.id}.glb`;
  const bytes = await io.writeBinary(doc);
  await writeFile(path.join(out, file), bytes);
  total += bytes.byteLength;
  manifest.push({ ...b, file });
  console.log(`${b.id}: ${(bytes.byteLength / 1048576).toFixed(1)} MB`);
}
await writeFile(path.join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${manifest.length} wallpaper models, ${(total / 1048576).toFixed(0)} MB -> ${path.relative(root, out)}`);
