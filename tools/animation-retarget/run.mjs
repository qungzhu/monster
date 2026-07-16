// Headless runner: serves the repo + an assets dir, opens a page, saves window.__result.
// usage: node tools/animation-retarget/run.mjs "<page>?<query>" <outJson> [assetsDir]
import pkg from 'playwright-core'; const { chromium } = pkg;
import http from 'http';
import { createReadStream, existsSync, writeFileSync } from 'fs';
import path from 'path';

const [, , pageUrl, outPath, assetsDir = 'tools/animation-retarget/assets'] = process.argv;
const ROOTS = [process.cwd(), path.resolve(assetsDir)];
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  for (const root of ROOTS) {
    // pages reference assets as /rig/<file>; also serve repo-relative paths
    for (const cand of [path.join(root, p), path.join(root, p.replace(/^\/rig\//, '/'))]) {
      if (existsSync(cand) && !cand.endsWith('/')) {
        res.setHeader('Content-Type', p.endsWith('.html') ? 'text/html' : p.endsWith('.js') ? 'text/javascript' : 'application/octet-stream');
        return createReadStream(cand).pipe(res);
      }
    }
  }
  res.statusCode = 404; res.end();
});
await new Promise(r => server.listen(4925, r));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto('http://localhost:4925/tools/animation-retarget/' + pageUrl);
await page.waitForFunction(() => window.__result, { timeout: 180000 });
const result = await page.evaluate(() => window.__result);
if (result.startsWith('ERROR')) console.log(result.slice(0, 600));
else { writeFileSync(outPath, result); const j = JSON.parse(result); console.log('saved', j.tracks ? j.tracks.length + ' tracks, ' + (+j.duration).toFixed(2) + 's' : 'data'); }
await browser.close(); server.close();
