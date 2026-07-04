# 3D Model Credits

## fox.glb
- **Model**: PixelMannen — CC0 (public domain)
- **Rigging & Animation**: [@tomkranis](https://sketchfab.com/tomkranis) — CC-BY 4.0
- **Source**: [KhronosGroup/glTF-Sample-Assets](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox)
- Animations: `Survey`, `Walk`, `Run`

## Adding more models

Drop `.glb` files here and register them in `src/data/petModels.ts`.
Recommended CC0/CC-BY sources:
- [quaternius.com](https://quaternius.com) — CC0 animated animal packs
- [poly.pizza](https://poly.pizza) — searchable low-poly library
- [Sketchfab](https://sketchfab.com) — filter by Downloadable + CC license

List a model's animation clip names:
```bash
node -e "const b=require('fs').readFileSync('public/models/YOUR.glb'); console.log(JSON.parse(b.slice(20,20+b.readUInt32LE(12))).animations.map(a=>a.name))"
```
