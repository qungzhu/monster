import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const galleryRoot = path.join(projectRoot, "src/assets/animal-gallery");
const seedRoot = path.join(projectRoot, ".r2-seed");
const modelKey = "../assets/animal-gallery/foxes-toy-material-v1/01_red_fox_toy_material.webp";

async function collectFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(fullPath));
    else if (entry.isFile() && entry.name.endsWith(".webp")) files.push(fullPath);
  }
  return files;
}

function speciesFor(key) {
  const normalized = key.toLowerCase();
  if (normalized.includes("/cats-") || normalized.includes("/猫咪")) return "cat";
  if (normalized.includes("/dogs-")) return "dog";
  if (normalized.includes("/foxes-")) return "fox";
  if (normalized.includes("pet-breed-cute")) {
    if (normalized.includes("cat") || normalized.includes("li_hua")) return "cat";
    if (normalized.includes("fox")) return "fox";
    return "dog";
  }
  return null;
}

function nameFor(filename) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+_/, "")
    .replace(/_(toy_material|v2_cute|original_kept).*$/i, "")
    .replaceAll("_", " ");
}

const pets = [];
const objects = new Map();
for (const filePath of await collectFiles(galleryRoot)) {
  const relativePath = path.relative(galleryRoot, filePath).split(path.sep).join("/");
  const key = `../assets/animal-gallery/${relativePath}`;
  const species = speciesFor(key);
  if (!species) continue;

  const sha256 = createHash("sha256").update(await readFile(filePath)).digest("hex");
  const objectKey = `gallery/${sha256}.webp`;
  const pet = {
    key,
    imageUrl: `/${objectKey}`,
    species,
    name: nameFor(path.basename(filePath)),
  };
  if (key === modelKey) pet.modelUrl = "/models/generated/red-fox.glb?v=3";
  pets.push(pet);
  if (!objects.has(objectKey)) objects.set(objectKey, { objectKey, file: `animal-gallery/${relativePath}` });
}

pets.sort((a, b) => a.key.localeCompare(b.key));
await mkdir(seedRoot, { recursive: true });
await writeFile(
  path.join(projectRoot, "src/data/generatedPetManifest.ts"),
  `export const generatedPetManifest = ${JSON.stringify(pets, null, 2)} as const;\n`,
);
await writeFile(
  path.join(seedRoot, "gallery-upload.json"),
  `${JSON.stringify({ objects: [...objects.values()] }, null, 2)}\n`,
);
console.log(`Manifest: ${pets.length} pets, ${objects.size} unique images`);
