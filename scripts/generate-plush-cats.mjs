// Generate the plush cats from the multi-view reference sheets in
// assets/plush-refs/ with Meshy multi-image-to-3D.
//
//   MESHY_API_KEY=... node scripts/generate-plush-cats.mjs            # all five
//   MESHY_API_KEY=... node scripts/generate-plush-cats.mjs birman      # just one
//   ... generate-plush-cats.mjs --force mainecoon    # regenerate (new task)
//   MESHY_AI_MODEL=meshy-6 MESHY_VIEWS=front,side,back34 ...   # model / views
//
// Each cat sends 4 views (front, 3/4 front, side, 3/4 back). Task ids are
// saved to assets/plush-refs/tasks.json right after creation, so a re-run
// (or a crash mid-poll) resumes the same task instead of paying again.
// Finished models land in public/models/custom/plush-<name>.glb (raw Meshy
// output: optimise and register the breed afterwards, see
// docs/meshy-plush-retexture.md).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const KEY = process.env.MESHY_API_KEY;
const BASE = 'https://api.meshy.ai/openapi/v1/multi-image-to-3d';
const REFS = new URL('../assets/plush-refs/', import.meta.url);
const TASKS = new URL('tasks.json', REFS);
const OUT = new URL('../public/models/custom/', import.meta.url);
const ALL = ['himalayan', 'mainecoon', 'norwegian', 'birman', 'angora', 'ragdoll', 'silvertabby', 'siamese', 'lihua', 'persian', 'van', 'ginger', 'balinese', 'fold', 'bluelonghair', 'chinchilla', 'exotic', 'thai', 'russianblue', 'bengal', 'britishspotted', 'mau', 'oriental', 'bombay', 'burmese'];
const VIEWS = (process.env.MESHY_VIEWS || 'front,q34,side,back34').split(',');

if (!KEY) {
  console.error('MESHY_API_KEY is not set (add it in the environment settings, then start a new session).');
  process.exit(1);
}
const FORCE = process.argv.includes('--force');
const picked = process.argv.slice(2).filter(a => a !== '--force');
const names = picked.length ? picked : ALL;
for (const n of names) if (!ALL.includes(n)) { console.error(`unknown cat "${n}" (one of ${ALL.join(', ')})`); process.exit(1); }

const tasks = existsSync(TASKS) ? JSON.parse(readFileSync(TASKS, 'utf8')) : {};
const saveTasks = () => writeFileSync(TASKS, `${JSON.stringify(tasks, null, 2)}\n`);
const auth = { Authorization: `Bearer ${KEY}` };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function create(name) {
  const image_urls = VIEWS.map(v => `data:image/jpeg;base64,${readFileSync(new URL(`${name}-${v}.jpg`, REFS)).toString('base64')}`);
  // Same settings as the app's /api/meshy/generate multi-view path.
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_urls,
      ai_model: process.env.MESHY_AI_MODEL || 'meshy-6-lite',
      should_texture: true,
      enable_pbr: true,
      should_remesh: true,
      target_polycount: 100000,
      topology: 'triangle',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.result) throw new Error(`create failed (${res.status}): ${JSON.stringify(data).slice(0, 300)}`);
  return data.result;
}

async function waitFor(name, id) {
  let last = '';
  for (;;) {
    const res = await fetch(`${BASE}/${id}`, { headers: auth });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`status failed (${res.status}): ${JSON.stringify(data).slice(0, 300)}`);
    const line = `${name}: ${data.status} ${data.progress ?? 0}%`;
    if (line !== last) console.log((last = line));
    if (data.status === 'SUCCEEDED') return data.model_urls?.glb;
    if (data.status === 'FAILED' || data.status === 'CANCELED') throw new Error(`${name} ${data.status}: ${data.task_error?.message ?? ''}`);
    await sleep(10_000);
  }
}

// Create every missing task first (tasks.json is written after each), then
// poll them all at once so a batch takes as long as its slowest cat.
const todo = [];
for (const name of names) {
  const out = new URL(`plush-${name}.glb`, OUT);
  if (FORCE) delete tasks[name];
  else if (existsSync(out)) { console.log(`${name}: already downloaded, skipping`); continue; }
  try {
    if (!tasks[name]) {
      tasks[name] = await create(name);
      saveTasks();
      console.log(`${name}: task ${tasks[name]} created`);
    } else {
      console.log(`${name}: resuming task ${tasks[name]}`);
    }
    todo.push({ name, out });
  } catch (e) {
    console.error(`${name}: ${e.message}`);
    process.exitCode = 1;
  }
}

await Promise.all(todo.map(async ({ name, out }) => {
  try {
    const glbUrl = await waitFor(name, tasks[name]);
    const glb = await fetch(glbUrl);
    if (!glb.ok) throw new Error(`download failed (${glb.status})`);
    writeFileSync(out, Buffer.from(await glb.arrayBuffer()));
    console.log(`${name}: saved ${out.pathname}`);
  } catch (e) {
    console.error(`${name}: ${e.message}`);
    process.exitCode = 1;
  }
}));
