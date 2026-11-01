// Pack the cartoon scene props (CC0) into public/models/scenes/:
// meshopt geometry + WebP textures, plus props.json with each prop's size
// (so scenes can place them by real height).
//
//   node scripts/build-scene-props.mjs KAYKIT_GLTF_DIR NETFORGE_LOWPOLY_DIR KENNEY_DIR
//
// KENNEY_DIR holds the unzipped Kenney packs (nature-kit, furniture-kit,
// survival-kit, holiday-kit from kenney.nl); their models are saved as
// k-<pack>-<name>.glb.
//
// Sources (both CC0 1.0):
//   KayKit Furniture Bits 1.0, Kay Lousberg
//     https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0
//   Kenney Nature Kit and Quaternius models, as packed in
//     @netforge/asset-library-files (library/lowpoly)
//   Kenney Nature Kit, Furniture Kit, Survival Kit, Holiday Kit
//     https://kenney.nl/assets (each archive's License.txt: CC0)
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds, meshopt, textureCompress } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const [kaykit, lowpoly, kenney] = process.argv.slice(2);
const root = new URL('../', import.meta.url).pathname;
const out = path.join(root, 'public/models/scenes');

const KAYKIT = ['armchair_pillows', 'couch_pillows', 'lamp_standing', 'lamp_table', 'table_low', 'table_small',
  'rug_oval_A', 'pictureframe_large_A', 'pictureframe_large_B', 'pictureframe_medium', 'shelf_B_large_decorated',
  'book_set', 'pillow_A', 'cactus_medium_A', 'cabinet_small_decorated', 'chair_A_wood'];
const LOWPOLY = ['tree_oak', 'tree_fat', 'tree_autumn', 'tree_pine', 'tree_pine_tall', 'tree_dark', 'bush', 'bush_large',
  'flower_red', 'mushroom_red', 'rock_large', 'rock_small', 'rock_tall', 'stump', 'log', 'fence', 'column', 'tent',
  'campfire', 'deer', 'stag', 'fox', 'monarch', 'pumpkin', 'crate', 'barrel'];

const KENNEY = {
  'furniture-kit': ['loungeSofa', 'loungeChair', 'loungeDesignChair', 'bookcaseOpen', 'lampRoundFloor', 'lampSquareTable',
    'rugRound', 'tableCoffee', 'pottedPlant', 'plantSmall1', 'sideTable', 'pillow', 'radio', 'televisionVintage', 'bear',
    'coatRackStanding', 'books'],
  'nature-kit': ['statue_column', 'statue_obelisk', 'tree_cone', 'tree_cone_dark', 'plant_bushDetailed', 'plant_bushLarge',
    'plant_bush', 'flower_redA', 'flower_redB', 'flower_purpleA', 'flower_purpleB', 'flower_yellowA', 'flower_yellowB',
    'fence_simple', 'pot_large', 'lily_large', 'lily_small', 'tree_pineTallA_detailed', 'tree_pineTallB_detailed',
    'tree_pineTallC_detailed', 'tree_pineRoundA', 'tree_pineRoundC', 'grass_large', 'grass_leafsLarge', 'rock_tallA',
    'rock_tallC', 'rock_largeA', 'stump_old', 'log_large', 'log_stack', 'mushroom_redGroup', 'mushroom_tanGroup',
    'tree_default', 'tree_oak', 'tree_detailed', 'tree_fat_fall', 'tree_default_fall', 'canoe', 'tent_detailedOpen',
    'campfire_logs', 'path_stone', 'path_stoneCircle'],
  'survival-kit': ['tent-canvas', 'campfire-pit', 'bedroll', 'barrel', 'box', 'signpost', 'tree-tall', 'chest'],
  'holiday-kit': ['tree-snow-a', 'tree-snow-b', 'tree-snow-c', 'snowman-hat', 'sled', 'snow-pile', 'lantern',
    'lantern-hanging', 'lights-colored', 'reindeer', 'bench', 'rocks-medium', 'present-a-round'],
};

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
await mkdir(out, { recursive: true });
const sizes = {};
const jobs = [
  ...KAYKIT.map(n => [path.join(kaykit, `${n}.gltf`), n]),
  ...LOWPOLY.map(n => [path.join(lowpoly, `${n}.glb`), n]),
  ...Object.entries(KENNEY).flatMap(([pack, names]) => names.map(n => {
    const dir = path.join(kenney, pack, 'Models');
    const sub = existsSync(path.join(dir, 'GLB format')) ? 'GLB format' : 'GLTF format';
    return [path.join(dir, sub, `${n}.glb`), `k-${pack.replace('-kit', '')}-${n}`];
  })),
];
{
  for (const [file, name] of jobs) {
    const doc = await io.read(file);
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
- Kenney (www.kenney.nl), CC0, k-*.glb: ${Object.entries(KENNEY).map(([p, n]) => `${p} (${n.join(', ')})`).join('; ')}

Built by scripts/build-scene-props.mjs.
`);
console.log(Object.keys(sizes).length, 'props');
