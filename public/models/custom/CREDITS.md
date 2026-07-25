# Model & Animation Credits

## pixiebob-rigged.glb
- Mesh & textures: Meshy multi-image-to-3D from a user-provided multi-angle
  reference sheet of 斑斑 (Pixie-Bob); auto-rigged via Meshy Rigging API.
- All 8 clips retargeted via tools/animation-retarget (rotation-delta):
  - `Idle`: Fox "Survey" (CC-BY 4.0, see cat1-rigged.glb entry below)
  - `Walk` / `Run` / `Scratch` / `Eat` / `Sleep` / `Meow` / `Happy`:
    Catson v1.00 by Omabuarts Studio (purchased, commercial license;
    source FBX not redistributed). Meshy's own Walk/Run clips were
    dropped — their translation tracks tore the fragile lower-front-leg
    skin weights; Catson retargets are rotation-only. Sleep/Scratch
    carry torso+head channels only for the same reason.

## cat1-rigged.glb
- Mesh & textures: generated with Meshy AI from user photos; auto-rigged via Meshy Rigging API (Walk/Run clips from Meshy quadruped basic animations).
- `Idle` clip: retargeted from the "Survey" animation of the glTF Sample Models **Fox**:
  - Model: [PixelMannen](https://opengameart.org/content/fox-and-shiba) (CC0)
  - Rigging & Animation: [@tomkranis](https://sketchfab.com/tomkranis) (CC-BY 4.0)
  - Source: [KhronosGroup/glTF-Sample-Models](https://github.com/KhronosGroup/glTF-Sample-Models/tree/main/2.0/Fox)
  - Retargeted onto the Meshy rig via world-space rotation-delta transfer (rotations only).

- `Scratch` / `Eat` / `Sleep` / `Meow` / `Happy` clips: retargeted from
  **Catson v1.00** by Omabuarts Studio (purchased, commercial license;
  source FBX not redistributed — only baked retargeted animation data
  is embedded here).

## mesh-tabby2 / mesh-norweg / mesh-mainecoon / mesh-persian / mesh-ragdoll .glb
- Meshy multi-image-to-3D from user-provided 5-view reference sheets
  (front/side/back/quarter crops).
- Meshy pose estimation rejected these chunkier plush designs, so instead
  of auto-rigging, the working Pixie-Bob skeleton + its 8 clips were
  TRANSFERRED onto each mesh (tools/animation-retarget/transfer-skin.cjs):
  target geometry normalized into the rig's bind space, skin weights
  recomputed by Gaussian falloff over bone rest positions, skeleton/skin/
  animations kept verbatim. Then weld + simplify(0.5) + 1024 WebP.
- All 8 skeletal clips (Walk/Run/Idle/Scratch/Eat/Sleep/Meow/Happy) —
  same animation provenance as pixiebob-rigged.glb (Fox + Catson, above).

## cat1.glb – cat5.glb
- Generated with Meshy AI (image-to-3D) from user-provided photos.

## Tail sway (all 6 rigged cats)
- A `Tail` bone was added under Hips on every rigged cat (tools/animation-
  retarget/add-tail-bone.cjs): tail vertices auto-detected by position
  (rear + elevated, within a radius column to exclude ears), reweighted
  with a base->tip falloff, and given a gentle looping sway baked into all
  8 clips. The bone follows body motion (child of Hips) and adds life.
- The European Tabby tail also carries a per-vertex COLOR_0 warm tint
  (its reconstructed tail texture ran cold grey; scattered UVs ruled out
  a texture-space fix, so vertex colors warm it toward the body tone).
