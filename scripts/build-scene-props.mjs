// Pack the cartoon scene props (CC0) into public/models/scenes/:
// meshopt geometry + WebP textures, plus props.json with each prop's size
// (so scenes can place them by real height).
//
//   node scripts/build-scene-props.mjs KAYKIT_GLTF_DIR NETFORGE_LOWPOLY_DIR
//
// Sources (both CC0 1.0):
//   KayKit Furniture Bits 1.0, Kay Lousberg
//     https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0
//   Kenney Nature Kit and Quaternius models, as packed in
//     @netforge/asset-library-files (library/lowpoly)
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds, meshopt, textureCompress } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const [kaykit, lowpoly] = process.argv.slice(2);
const root = new URL('../', import.meta.url).pathname;
const out = path.join(root, 'public/models/scenes');

const KAYKIT = ['armchair_pillows', 'couch_pillows', 'lamp_standing', 'lamp_table', 'table_low', 'table_small',
  'rug_oval_A', 'pictureframe_large_A', 'pictureframe_large_B', 'pictureframe_medium', 'shelf_B_large_decorated',
  'book_set', 'pillow_A', 'cactus_medium_A', 'cabinet_small_decorated', 'chair_A_wood'];
const LOWPOLY = ['tree_oak', 'tree_fat', 'tree_autumn', 'tree_pine', 'tree_pine_tall', 'tree_dark', 'bush', 'bush_large',
  'flower_red', 'mushroom_red', 'rock_large', 'rock_small', 'rock_tall', 'stump', 'log', 'fence', 'column', 'tent',
  'campfire', 'deer', 'stag', 'fox', 'monarch', 'pumpkin', 'crate', 'barrel'];

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
await mkdir(out, { recursive: true });
const sizes = {};
for (const [dir, names, ext] of [[kaykit, KAYKIT, '.gltf'], [lowpoly, LOWPOLY, '.glb']]) {
  for (const name of names) {
    const doc = await io.read(path.join(dir, name + ext));
    await doc.transform(
      textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512] }),
      meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
    );
    const b = getBounds(doc.getRoot().listScenes()[0]);
    sizes[name] = { w: +(b.max[0] - b.min[0]).toFixed(3), h: +(b.max[1] - b.min[1]).toFixed(3), d: +(b.max[2] - b.min[2]).toFixed(3), y0: +b.min[1].toFixed(3) };
    await writeFile(path.join(out, `${name}.glb`), await io.writeBinary(doc));
  }
}
await writeFile(path.join(out, 'props.json'), `${JSON.stringify(sizes, null, 1)}\n`);
await writeFile(path.join(out, 'CREDITS.md'), `# Scene props (CC0 1.0)

- KayKit Furniture Bits 1.0 by Kay Lousberg (www.kaylousberg.com), CC0:
  ${KAYKIT.join(', ')}
- Kenney (www.kenney.nl) and Quaternius (quaternius.com), CC0, via
  @netforge/asset-library-files: ${LOWPOLY.join(', ')}

Built by scripts/build-scene-props.mjs.
`);
console.log(Object.keys(sizes).length, 'props');
