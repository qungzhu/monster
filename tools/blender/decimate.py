"""Reduce a static GLB to about N triangles, keeping UVs and textures.

  .venv-blender/bin/python tools/blender/decimate.py IN.glb OUT.glb 40000
"""
import bpy, sys
src, dst, target = sys.argv[-3], sys.argv[-2], int(sys.argv[-1])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for o in [o for o in bpy.context.scene.objects if o.type == 'MESH']:
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    if tris > target:
        m = o.modifiers.new('dec', 'DECIMATE')
        m.ratio = target / tris
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier='dec')
    print(o.name, tris, '->', sum(len(p.vertices) - 2 for p in o.data.polygons))
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_image_format='WEBP', export_image_quality=85)
