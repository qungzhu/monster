// Give the plush cats a skeleton so their legs walk, run and sit.
//
//   BLENDER_PY=.venv-blender/bin/python node scripts/rig-plush-cats.mjs [name ...]
//
// For each public/models/plush/meshy-<name>.glb: decode it to a plain GLB
// Blender can read (no meshopt / quantization), fit the plaza rig onto it
// with tools/blender/lite_rig.py (25 bones, 8 clips: Idle Walk Run Scratch
// Sleep Happy Eat Meow; weights copied from the rig's mesh), then compress
// it again into public/models/plush/rigged/<name>.glb. Check every result
// from the side mid-walk and mid-run before switching the breed to it.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';

const root = new URL('../', import.meta.url).pathname;
const plush = path.join(root, 'public/models/plush');
const out = path.join(plush, 'rigged');
const rig = path.join(root, 'public/models/lite/plush-himalayan.glb');
const blender = process.env.BLENDER_PY ?? path.join(root, '.venv-blender/bin/python');
const TRIANGLES = process.env.RIG_TRIANGLES ?? '40000';

const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(plush).filter(f => /^meshy-[a-z]+\.glb$/.test(f)).map(f => f.slice(6, -4));

await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

/** Plain copy of a compressed GLB, for Blender's importer. */
async function decode(src, dst) {
  const doc = await io.read(src);
  await doc.transform(dequantize());
  for (const ext of doc.getRoot().listExtensionsUsed()) {
    if (ext instanceof EXTMeshoptCompression || ext instanceof KHRMeshQuantization) ext.dispose();
  }
  await io.write(dst, doc);
}

mkdirSync(out, { recursive: true });
const work = mkdtempSync(path.join(tmpdir(), 'rig-'));
const rigPlain = path.join(work, 'rig.glb');
await decode(rig, rigPlain);
const gltfTransform = path.join(root, 'node_modules/.bin/gltf-transform');
for (const name of names) {
  const src = path.join(plush, `meshy-${name}.glb`);
  if (!existsSync(src)) { console.error(`${name}: no ${src}`); process.exitCode = 1; continue; }
  const plain = path.join(work, `${name}.glb`);
  const rigged = path.join(work, `${name}-rigged.glb`);
  try {
    await decode(src, plain);
    execFileSync(blender, [path.join(root, 'tools/blender/lite_rig.py'), rigPlain, plain, rigged, TRIANGLES, 'box'], { stdio: 'pipe' });
    const opt = path.join(work, `${name}-opt.glb`);
    execFileSync(gltfTransform, ['optimize', rigged, opt, '--texture-compress', 'webp', '--texture-size', '1024', '--simplify', 'false'], { stdio: 'pipe' });
    execFileSync(gltfTransform, ['quantize', opt, path.join(out, `${name}.glb`)], { stdio: 'pipe' });
    console.log(`${name}: rigged`);
  } catch (e) {
    console.error(`${name}: ${String(e.stderr ?? e.message).split('\n').filter(Boolean).slice(-3).join(' | ')}`);
    process.exitCode = 1;
  }
}
