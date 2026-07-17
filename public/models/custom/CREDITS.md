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

## cat1.glb – cat5.glb
- Generated with Meshy AI (image-to-3D) from user-provided photos.
