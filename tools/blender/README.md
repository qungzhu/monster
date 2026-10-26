# Blender pipeline (headless)

Blender runs as a Python module, no GUI needed:

```bash
python3.11 -m venv .venv-blender
.venv-blender/bin/pip install bpy==4.5.15      # Blender 4.5 LTS, ~1 GB
.venv-blender/bin/python tools/blender/base_cat.py OUT_DIR TAG
```

## base_cat.py — the standard plush cat

Built the way a stuffed toy is: blended metaballs (big round head
straight on a round body, short chunky legs, fluffy tail) → voxel remesh
(clean, even quad mesh, watertight) → eyes, nose and ears placed by
ray-casting onto the head surface so nothing floats.

The coat is painted per vertex by body region (currently colour-point:
face mask, ears, socks, tail) and the eyes get a blue iris + clear coat,
matching the owner's reference sheets in `assets/plush-refs/`.

Writes `TAG-front/q34/side.png` renders and `TAG.blend`.

Next: breed presets (shape + coat), skeleton + automatic weights, shared
keyframed animations, bake to texture, export GLB for the app.
