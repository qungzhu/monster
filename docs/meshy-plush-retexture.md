# Plan: plush-toy textures via Meshy Retexture

> **Also queued: five new plush cats** from the owner's multi-view sheets —
> see "New plush cats" at the end. Run that first; it may replace the
> Maine Coon and Norwegian models (and their texture defects) outright.

Goal: make the cats look like real plush toys (minky / short-pile fabric,
soft embroidered-looking eyes and nose) by regenerating their textures with
Meshy, while keeping the rigs and animations we built.

## Prerequisite

`MESHY_API_KEY` in the environment (environment settings → Network secrets
or environment variable; a new session picks it up). Never commit it or put
it in chat.

## Pipeline

1. For each model, send the mesh to Meshy Retexture with a plush-toy style
   prompt and **keep the original UVs** (so the new texture fits our mesh).
2. Download the result and take only its base-color texture.
3. Swap that texture into our own rigged GLB (skeleton, skin weights,
   animation clips, tail bone stay untouched). Re-run
   `tools/animation-retarget/fix-normals.mjs --check` afterwards.
4. Keep the old texture next to it; compare before/after renders with the
   `?plushlab` page before replacing anything. Lite plaza models
   (`public/models/lite/`) get the same texture downscaled to 512 WebP.

## Models (start with one, compare, then do the rest)

- `public/models/custom/cat3-rigged-safe.glb` (三花, calico) — start here
- `cat4-rigged-safe.glb` (奶油长毛), `cat5-rigged-safe.glb` (灰白虎斑),
  `cat2-rigged-safe.glb` (胖虎斑), `pixiebob-rigged.glb` (皮克斯鲍勃)
- `mesh-*.glb` (欧短 / 挪威森林 / 缅因 / 波斯 / 布偶)

## Audit of the current models (what retexturing should fix)

Checked every cat with a fixed-angle viewer on a magenta background
(holes would show magenta), with colour / normal maps toggled.

| Cat | Issue | Where it lives | Fix |
|---|---|---|---|
| 挪威森林猫 `mesh-norweg` | dark "harness" lines around body and legs | painted into the colour texture where Meshy stitched the front/side/back views; not UV seams (texture dilation and edge refill don't remove them) | retexture |
| 挪威森林猫 | white torn-looking patch on both sides of the neck | colour texture + a crease in the mesh; not a hole | retexture (+ maybe smooth the crease) |
| 欧洲短毛虎斑 `mesh-tabby2` | rectangular patch on the hip (back view) | colour texture | retexture |
| 金吉拉波斯 `mesh-persian` | a few dark specks on the body | colour texture | retexture |
| 奶油长毛 `cat4` | faint light seam lines | colour texture | retexture |
| 胖虎斑 `cat2` | a second long thin tail hangs to the ground behind the pom-pom tail, and pokes out as a hook beside the left shoulder from the front | geometry | ask the owner: remove it or keep it as the curly tail |

Already fixed: inverted normals on cat3/4/5 and their backwards facing
(see `tools/animation-retarget/fix-normals.mjs`, `glbRotationY`). Small
holes exist in several meshes (9–142 loops) but none are visible.

## Notes

- Retexture costs Meshy credits per model: do one, show the user, then batch.
- Material side is already plush (`src/components/pets/plushMaterial.ts`):
  sheen, pile noise, wrap lighting. A fabric-looking albedo is what's missing.

## New plush cats (multi-view → 3D)

Reference sheets from the owner (plush-toy renders, 5 views each) are in
`assets/plush-refs/sheets/`; clean per-view crops (768², one cat per image,
no neighbours leaking in) are `assets/plush-refs/<name>-<view>.jpg`.

| name | breed | look |
|---|---|---|
| `himalayan` | 喜马拉雅猫 (new) | cream long coat, seal-point mask/ears/paws/tail, blue eyes |
| `mainecoon` | 缅因猫 (replace current model?) | brown tabby, lynx ear tufts, big round tail |
| `norwegian` | 挪威森林猫 (replace current model?) | brown tabby + white bib and socks, bushy tail |
| `birman` | 伯曼猫 (new) | colourpoint with white gloves, blue eyes |
| `angora` | 土耳其安哥拉 (new) | all white, blue eyes, plume tail |

1. `node scripts/generate-plush-cats.mjs [name…]` — 4 views each (front,
   3/4, side, 3/4 back), same Meshy settings as the app; task ids are saved
   to `assets/plush-refs/tasks.json` so re-runs resume instead of re-paying.
   Do **one** cat first and show the owner before the rest.
2. Check: `fix-normals.mjs --check`, the magenta-background viewer for holes,
   facing (+Z toward camera; else `glbRotationY`).
3. Optimise like the other `mesh-*.glb` (weld, ~100k tris, 1024 WebP
   textures) and make a lite copy for the plaza (`public/models/lite/`).
4. Register in `src/data/breeds.ts` (procedural motion like the other
   multi-view cats: `glbDisableSkeletalAnimation: true`).
