// Copy the web build into dist-native/ for Capacitor, keeping only the 3D
// models the app actually references (public/models also holds raw and
// superseded files that would add ~60 MB to the APK / IPA).
import { cp, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const from = path.join(root, 'dist/client');
const to = path.join(root, 'dist-native');

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else out.push(p);
  }
  return out;
}

// Every /models/... path mentioned in the source (breeds, plaza, scenes).
const used = new Set();
for (const f of await walk(path.join(root, 'src'))) {
  if (!/\.(ts|tsx)$/.test(f)) continue;
  for (const m of (await readFile(f, 'utf8')).matchAll(/\/models\/[\w./-]+\.(?:glb|gltf|bin|png|jpg|webp|ktx2)/g)) used.add(m[0]);
}

await rm(to, { recursive: true, force: true });
await mkdir(to, { recursive: true });
let kept = 0, dropped = 0, bytes = 0;
for (const f of await walk(from)) {
  const rel = '/' + path.relative(from, f).split(path.sep).join('/');
  if (rel.startsWith('/models/') && !rel.endsWith('.md') && !used.has(rel)) { dropped++; continue; }
  await mkdir(path.dirname(path.join(to, rel)), { recursive: true });
  await cp(f, path.join(to, rel));
  kept++; bytes += (await stat(f)).size;
}
console.log(`dist-native: ${kept} files, ${(bytes / 1048576).toFixed(0)} MB (${dropped} unused model files left out)`);
