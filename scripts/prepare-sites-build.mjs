import { cp, mkdir, readdir, rename, rm } from "node:fs/promises";

const distDirectory = new URL("../dist/", import.meta.url);
const clientDirectory = new URL("../dist/client/", import.meta.url);

await mkdir(clientDirectory, { recursive: true });
for (const entry of await readdir(distDirectory)) {
  if (entry === "client" || entry === "server") continue;
  await rename(new URL(entry, distDirectory), new URL(entry, clientDirectory));
}

await rm(new URL("models/generated/red-fox-animated.glb", clientDirectory), { force: true });
await rm(new URL("models/generated/red-fox-meshy-rigged-walk.glb", clientDirectory), { force: true });
await rm(new URL("models/generated/red-fox-meshy-rigged-walk-lossless.glb", clientDirectory), { force: true });

await mkdir(new URL("../dist/server/", import.meta.url), { recursive: true });
await cp(new URL("../worker/", import.meta.url), new URL("../dist/server/", import.meta.url), { recursive: true });

await mkdir(new URL("../dist/.openai/", import.meta.url), { recursive: true });
await cp(
  new URL("../.openai/hosting.json", import.meta.url),
  new URL("../dist/.openai/hosting.json", import.meta.url),
);
await cp(
  new URL("../.openai/drizzle/", import.meta.url),
  new URL("../dist/.openai/drizzle/", import.meta.url),
  { recursive: true },
);
