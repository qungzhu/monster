# Plan: plush-toy textures via Meshy Retexture

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

## Notes

- Retexture costs Meshy credits per model: do one, show the user, then batch.
- Material side is already plush (`src/components/pets/plushMaterial.ts`):
  sheen, pile noise, wrap lighting. A fabric-looking albedo is what's missing.
