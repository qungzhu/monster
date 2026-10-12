import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const siteUrl = process.env.SITE_URL?.replace(/\/$/, "");
const uploadToken = process.env.GALLERY_UPLOAD_TOKEN;
const sitesToken = process.env.SITES_BYPASS_TOKEN;

if (!siteUrl || !uploadToken || !sitesToken) {
  throw new Error("SITE_URL, GALLERY_UPLOAD_TOKEN, and SITES_BYPASS_TOKEN are required");
}

const manifest = JSON.parse(
  await readFile(path.join(projectRoot, ".r2-seed/gallery-upload.json"), "utf8"),
);
const headers = {
  authorization: `Bearer ${uploadToken}`,
  "oai-sites-authorization": `Bearer ${sitesToken}`,
};

let nextIndex = 0;
let completed = 0;

async function requestWithRetry(url, options) {
  let response;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    response = await fetch(url, options);
    if (response.status !== 429 && response.status < 500) return response;
    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
  }
  return response;
}

async function worker() {
  while (nextIndex < manifest.objects.length) {
    const item = manifest.objects[nextIndex++];
    const url = `${siteUrl}/__seed/${item.objectKey}`;
    const existing = await requestWithRetry(url, { method: "HEAD", headers });
    if (existing.status !== 200) {
      if (existing.status !== 404) throw new Error(`HEAD ${item.objectKey}: ${existing.status}`);
      const body = await readFile(path.join(projectRoot, ".r2-seed", item.file));
      const uploaded = await requestWithRetry(url, {
        method: "PUT",
        headers: { ...headers, "content-type": "image/webp" },
        body,
      });
      if (uploaded.status !== 201) throw new Error(`PUT ${item.objectKey}: ${uploaded.status}`);
    }
    completed += 1;
    if (completed % 10 === 0 || completed === manifest.objects.length) {
      console.log(`Uploaded ${completed}/${manifest.objects.length}`);
    }
  }
}

await Promise.all(Array.from({ length: 4 }, () => worker()));
