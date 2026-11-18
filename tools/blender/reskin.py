"""Give a Meshy cat built from overlapping fur flakes one clean skin.

Some Meshy cats (Turkish Angora, Silver Chinchilla) are hundreds of loose,
overlapping sheets rather than one surface. However they are weighted, the
sheets' edges show as cracks and flakes once the app's plush shading and fur
shells go over them. This rebuilds the surface as one closed skin (voxel
remesh, then decimated back to the original triangle count), lays out new
UVs, and bakes the original colour and roughness (the roughness map marks
the glossy eyes, which the app looks for) onto it.

  .venv-blender/bin/python tools/blender/reskin.py IN.glb OUT.glb
"""
import bpy, sys, math

src, dst = sys.argv[-2], sys.argv[-1]
TEX = 1024

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=src)
old = max((o for o in scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.polygons))
for o in [o for o in scene.objects if o.type == 'MESH' and o is not old]:
    bpy.data.objects.remove(o)
bpy.ops.object.select_all(action='DESELECT')
old.select_set(True)
bpy.context.view_layer.objects.active = old
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
tris = sum(len(p.vertices) - 2 for p in old.data.polygons)
size = max(old.dimensions)

# ---- new skin: closed voxel surface, back down to the original budget
new = old.copy()
new.data = old.data.copy()
new.name = 'skin'
scene.collection.objects.link(new)
new.data.materials.clear()
for a in [a for a in new.data.attributes if a.name.lower().startswith('color')]:
    new.data.attributes.remove(a)
bpy.ops.object.select_all(action='DESELECT')
new.select_set(True)
bpy.context.view_layer.objects.active = new
rm = new.modifiers.new('r', 'REMESH')
rm.mode, rm.voxel_size = 'VOXEL', size / 200
rm.use_smooth_shade = True
bpy.ops.object.modifier_apply(modifier='r')
# Loose flakes leave pits and tunnels in the voxel skin (dark dots once
# baked): smooth them shut, gently, so ears and toes keep their shape.
sm = new.modifiers.new('s', 'SMOOTH')
sm.factor, sm.iterations = 0.5, 6
bpy.ops.object.modifier_apply(modifier='s')
cur = sum(len(p.vertices) - 2 for p in new.data.polygons)
if cur > tris:
    d = new.modifiers.new('d', 'DECIMATE')
    d.ratio = tris / cur
    bpy.ops.object.modifier_apply(modifier='d')
bpy.ops.object.shade_smooth()
for uv in list(new.data.uv_layers):
    new.data.uv_layers.remove(uv)
new.data.uv_layers.new(name='UVMap')
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004)
bpy.ops.object.mode_set(mode='OBJECT')
print(f'skin: {len(new.data.polygons)} faces (was {tris} triangles)')

# ---- material: the original's, with new baked images
src_mat = old.data.materials[0]
mat = src_mat.copy()
mat.name = 'skin'
new.data.materials.append(mat)
nt = mat.node_tree
bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
# normal map: its detail belongs to the flakes; the fur shells replace it
for l in list(bsdf.inputs['Normal'].links):
    nt.links.remove(l)

scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 4
bake = scene.render.bake
bake.use_selected_to_active = True
bake.cage_extrusion = size * 0.06
bake.max_ray_distance = size * 0.16
bake.margin = 8

def bake_into(name, kind, colorspace, link_to):
    img = bpy.data.images.new(name, TEX, TEX, alpha=False)
    img.colorspace_settings.name = colorspace
    tn = nt.nodes.new('ShaderNodeTexImage')
    tn.image = img
    for n in nt.nodes:
        n.select = False
    tn.select = True
    nt.nodes.active = tn
    bpy.ops.object.select_all(action='DESELECT')
    old.select_set(True)
    new.select_set(True)
    bpy.context.view_layer.objects.active = new
    if kind == 'DIFFUSE':
        bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'})
    else:
        bpy.ops.object.bake(type=kind)
    return tn, img

base_tn, base_img = bake_into('skin_base', 'DIFFUSE', 'sRGB', 'Base Color')
# Rays that slip between flakes see the dark inside of the coat: lift any
# speck much darker than the fur around it to its surroundings.
import numpy as np
px = np.array(base_img.pixels[:], dtype=np.float32).reshape(TEX, TEX, 4)
def box(a, r):
    c = np.cumsum(np.cumsum(np.pad(a, ((r + 1, r), (r + 1, r), (0, 0)), mode='edge'), 0), 1)
    k = 2 * r + 1
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)
blur = box(px[..., :3], 6)
lum = px[..., :3] @ np.array([0.3, 0.59, 0.11], dtype=np.float32)
blum = blur @ np.array([0.3, 0.59, 0.11], dtype=np.float32)
speck = (lum < 0.6 * blum) & (blum > 0.25)
px[speck, :3] = blur[speck]
base_img.pixels[:] = px.ravel()
print(f'specks lifted: {int(speck.sum())} texels')
rough_tn, rough_img = bake_into('skin_rough', 'ROUGHNESS', 'Non-Color', 'Roughness')
print('baked colour and roughness')

# rewire: baked colour and roughness (glTF wants roughness in G)
for inp in ('Base Color', 'Roughness', 'Metallic'):
    for l in list(bsdf.inputs[inp].links):
        nt.links.remove(l)
nt.links.new(base_tn.outputs['Color'], bsdf.inputs['Base Color'])
sep = nt.nodes.new('ShaderNodeSeparateColor')
nt.links.new(rough_tn.outputs['Color'], sep.inputs['Color'])
nt.links.new(sep.outputs['Green'], bsdf.inputs['Roughness'])
bsdf.inputs['Metallic'].default_value = 0.0
# the colour is baked; some Meshy materials also glow with it (emission)
for l in list(bsdf.inputs['Emission Color'].links):
    nt.links.remove(l)
bsdf.inputs['Emission Color'].default_value = (0, 0, 0, 1)
bsdf.inputs['Emission Strength'].default_value = 0.0
for n in [n for n in nt.nodes if n.type == 'TEX_IMAGE' and n not in (base_tn, rough_tn)]:
    nt.nodes.remove(n)

bpy.data.objects.remove(old)
bpy.ops.object.select_all(action='DESELECT')
new.select_set(True)
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', use_selection=True,
                          export_image_format='JPEG')
print('wrote', dst)
