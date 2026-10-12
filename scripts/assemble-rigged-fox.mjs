import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const partsDir = path.join(projectRoot, 'assets/model-parts');
const output = path.join(
  projectRoot,
  'public/models/generated/red-fox-meshy-rigged-walk-optimized.glb',
);
const partNames = (await readdir(partsDir))
  .filter(name => name.startsWith('red-fox-meshy-rigged-walk-optimized.part-'))
  .sort();

if (partNames.length === 0) {
  throw new Error('Optimized rigged fox model parts are missing.');
}

const parts = await Promise.all(partNames.map(name => readFile(path.join(partsDir, name))));
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, Buffer.concat(parts));
console.log(`Assembled ${path.relative(projectRoot, output)}`);
