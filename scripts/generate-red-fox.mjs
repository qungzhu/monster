import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = 'https://api.meshy.ai/openapi/v1';
const inputPath = path.resolve('src/assets/animal-gallery/foxes-toy-material-v1/01_red_fox_toy_material.png');
const outputPath = path.resolve('public/models/generated/red-fox.glb');
const apiKey = process.env.MESHY_API_KEY;

if (!apiKey) throw new Error('MESHY_API_KEY is missing from .env');
if (!fs.existsSync(inputPath)) throw new Error(`Input image not found: ${inputPath}`);

const headers = {
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
};
const imageDataUrl = `data:image/png;base64,${fs.readFileSync(inputPath).toString('base64')}`;

const createResponse = await fetch(`${API_BASE}/image-to-3d`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    image_url: imageDataUrl,
    ai_model: 'meshy-6',
    model_type: 'standard',
    should_texture: true,
    enable_pbr: true,
    should_remesh: true,
    target_polycount: 100000,
    topology: 'triangle',
    symmetry_mode: 'auto',
    image_enhancement: false,
    remove_lighting: false,
    target_formats: ['glb'],
  }),
});
const created = await createResponse.json();
if (!createResponse.ok) throw new Error(`Meshy submit failed: ${JSON.stringify(created)}`);

const taskId = created.result;
console.log(`Meshy task submitted: ${taskId}`);

for (;;) {
  await new Promise(resolve => setTimeout(resolve, 10000));
  const statusResponse = await fetch(`${API_BASE}/image-to-3d/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const task = await statusResponse.json();
  if (!statusResponse.ok) throw new Error(`Meshy status failed: ${JSON.stringify(task)}`);

  console.log(`Status: ${task.status} · ${task.progress ?? 0}%`);
  if (task.status === 'FAILED') {
    throw new Error(task.task_error?.message || 'Meshy generation failed');
  }
  if (task.status !== 'SUCCEEDED') continue;

  const glbUrl = task.model_urls?.glb;
  if (!glbUrl) throw new Error('Meshy completed without a GLB URL');
  const modelResponse = await fetch(glbUrl);
  if (!modelResponse.ok) throw new Error(`GLB download failed: ${modelResponse.status}`);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(await modelResponse.arrayBuffer()));
  console.log(`Saved: ${outputPath}`);
  console.log(`Credits consumed: ${task.consumed_credits ?? 'unknown'}`);
  break;
}
