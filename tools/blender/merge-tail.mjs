// Join a tail GLB (from add_tail.py) to the original body GLB without
// re-encoding the body: one scene, both meshes, body textures untouched.
//   node tools/blender/merge-tail.mjs BODY.glb TAIL.glb OUT.glb
// Needs @gltf-transform/core + extensions + functions resolvable.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, unpartition } from '@gltf-transform/functions';

const [bodyPath, tailPath, outPath] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const body = await io.read(bodyPath);
const tail = await io.read(tailPath);
const map = mergeDocuments(body, tail);
const root = body.getRoot();
const [mainScene] = root.listScenes();
for (const scene of root.listScenes().slice(1)) {
  for (const node of scene.listChildren()) mainScene.addChild(node);
  scene.dispose();
}
await body.transform(unpartition());
await io.write(outPath, body);
console.log('wrote', outPath, '- meshes:', root.listMeshes().length, map ? '' : '');
