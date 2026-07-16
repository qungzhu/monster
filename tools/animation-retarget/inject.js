// usage: node inject.js <tracksJson> <clipName> <inGlb> <outGlb>
const { NodeIO } = require(require('path').resolve('node_modules/@gltf-transform/core'));
const io = new NodeIO();
const [ , , tracksPath, clipName, inGlb, outGlb, boneFilter] = process.argv;
const allow = boneFilter ? new Set(boneFilter.split(',')) : null;
const data = JSON.parse(require('fs').readFileSync(tracksPath));
(async () => {
  const doc = await io.read(inGlb);
  // replace same-named clip if present
  for (const a of doc.getRoot().listAnimations()) if (a.getName() === clipName) a.dispose();
  const nodeByName = new Map(doc.getRoot().listNodes().map(n => [n.getName(), n]));
  const anim = doc.createAnimation(clipName);
  let added = 0;
  for (const t of data.tracks) {
    if (allow && !allow.has(t.name)) continue;
    const node = nodeByName.get(t.name);
    if (!node) continue;
    const isPos = t.path === 'translation';
    const input = doc.createAccessor().setType('SCALAR').setArray(new Float32Array(t.times));
    const output = doc.createAccessor().setType(isPos ? 'VEC3' : 'VEC4').setArray(new Float32Array(t.values));
    const sampler = doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation('LINEAR');
    anim.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(isPos ? 'translation' : 'rotation').setSampler(sampler));
    added++;
  }
  await io.write(outGlb, doc);
  console.log('injected', clipName, added, 'channels ->', outGlb);
})();
