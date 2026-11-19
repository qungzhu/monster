"""Give a Meshy cat built from overlapping fur flakes one clean skin.

Some Meshy cats (Turkish Angora, Silver Chinchilla) are hundreds of loose,
overlapping sheets rather than one surface. However they are weighted, the
sheets' edges show as cracks and flakes once the app's plush shading and fur
shells go over them. This rebuilds the surface as one closed skin (voxel
remesh, then decimated back to the original triangle count), lays out new
UVs, and bakes the original colour and roughness (the roughness map marks
the glossy eyes, which the app looks for) onto it.

  .venv-blender/bin/python tools/blender/reskin.py IN.glb OUT.glb [EYES]

EYES (optional, JSON): eyes to paint onto the new skin, as
{"marks": [[u, v, r], [u, v, r]], "iris": [r, g, b]} with the hand marks in
the original's UVs (r: radius as a fraction of the model's bounding radius)
and the iris colour in sRGB 0..1. Meshy paints some eyes as tiny dots that
only looked big through the flakes; these get a proper eye: dark pupil, an
iris in the breed's colour, a catch light, and a glossy patch in the
roughness map so the app can find them for its eyelids.
"""
import bpy, sys, math, json
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
src, dst = args[0], args[1]
EYES = json.loads(args[2]) if len(args) > 2 else None
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

def eye_centres(marks):
    """3D centres and radii of the hand-marked eyes on the original mesh
    (same rule as markedEyes in the app's plushEyes.ts)."""
    me = old.data
    uv = me.uv_layers.active.data
    cs = [v.co for v in me.vertices]
    centre = sum(cs, Vector()) / len(cs)
    lo = Vector([min(c[i] for c in cs) for i in range(3)])
    hi = Vector([max(c[i] for c in cs) for i in range(3)])
    bound = max((c - (lo + hi) / 2).length for c in cs)
    corners = [(uv[li].uv, me.vertices[me.loops[li].vertex_index].co) for li in range(len(me.loops))]
    out = []
    for u, v, r in marks:
        t = Vector((u, 1 - v))  # glTF v runs down, Blender's up
        uvp, anchor = min(corners, key=lambda c: (c[0] - t).length)
        radius = r * bound * 1.1
        near = [co for q, co in corners if (q - t).length < 0.02 and (co - anchor).length < radius * 0.6]
        out.append((sum(near, Vector()) / len(near), radius))
    return out, centre

eyes3d = None
if EYES:
    eyes3d, body_centre = eye_centres(EYES['marks'])
    print('eyes at', [(tuple(round(x, 3) for x in c), round(r, 3)) for c, r in eyes3d])

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

if eyes3d:
    # Where every texel of the new skin sits in space: bake the position.
    lo = Vector([min(v.co[i] for v in new.data.vertices) for i in range(3)])
    span = max(new.dimensions)
    pm = bpy.data.materials.new('pos')
    pm.use_nodes = True
    pn = pm.node_tree
    for n in list(pn.nodes):
        if n.type != 'OUTPUT_MATERIAL':
            pn.nodes.remove(n)
    geo = pn.nodes.new('ShaderNodeNewGeometry')
    sub = pn.nodes.new('ShaderNodeVectorMath'); sub.operation = 'SUBTRACT'; sub.inputs[1].default_value = lo
    scl = pn.nodes.new('ShaderNodeVectorMath'); scl.operation = 'SCALE'; scl.inputs['Scale'].default_value = 1 / span
    em = pn.nodes.new('ShaderNodeEmission')
    pn.links.new(geo.outputs['Position'], sub.inputs[0])
    pn.links.new(sub.outputs[0], scl.inputs[0])
    pn.links.new(scl.outputs[0], em.inputs['Color'])
    pn.links.new(em.outputs[0], next(n for n in pn.nodes if n.type == 'OUTPUT_MATERIAL').inputs['Surface'])
    pos_img = bpy.data.images.new('pos', TEX, TEX, alpha=False, float_buffer=True)
    pos_img.colorspace_settings.name = 'Non-Color'
    ptn = pn.nodes.new('ShaderNodeTexImage'); ptn.image = pos_img
    pn.nodes.active = ptn
    new.data.materials[0] = pm
    bake.use_selected_to_active = False
    bpy.ops.object.select_all(action='DESELECT')
    new.select_set(True)
    bpy.context.view_layer.objects.active = new
    bpy.ops.object.bake(type='EMIT')
    new.data.materials[0] = mat
    P = np.array(pos_img.pixels[:], dtype=np.float32).reshape(TEX, TEX, 4)[..., :3] * span + np.array(lo, dtype=np.float32)

    col = np.array(base_img.pixels[:], dtype=np.float32).reshape(TEX, TEX, 4)
    rough = np.array(rough_img.pixels[:], dtype=np.float32).reshape(TEX, TEX, 4)
    # pixels of the 8-bit colour image are its stored sRGB values
    lin = lambda c: np.array(c, dtype=np.float32)
    iris = lin(EYES.get('iris', [0.2, 0.45, 0.9]))
    up = Vector((0, 0, 1))
    for c, R in eyes3d:
        out_dir = (c - body_centre); out_dir.z = 0; out_dir.normalize()
        # catch light: up and a little toward the outer corner
        hl = c + (up * 0.38 + out_dir * 0.22) * R
        d = np.linalg.norm(P - np.array(c, dtype=np.float32), axis=-1) / R
        dh = np.linalg.norm(P - np.array(hl, dtype=np.float32), axis=-1) / R
        eye = d < 1.0
        # iris: lighter toward the pupil, a darker ring at the edge
        t = np.clip((d - 0.42) / 0.5, 0, 1)[..., None]
        iris_c = iris * (1.25 - 0.55 * t)
        pupil = np.array(lin([0.03, 0.04, 0.09]), dtype=np.float32)
        ring = np.clip((d - 0.86) / 0.08, 0, 1)[..., None]
        c_eye = np.where((d < 0.42)[..., None], pupil, iris_c)
        c_eye = c_eye * (1 - ring) + pupil * ring
        hi_m = np.clip((0.22 - dh) / 0.06, 0, 1)[..., None]
        c_eye = c_eye * (1 - hi_m) + np.array([1, 1, 1], dtype=np.float32) * hi_m
        edge = np.clip((1.0 - d) / 0.06, 0, 1)[..., None]   # soft into the fur
        col[..., :3] = np.where(eye[..., None], col[..., :3] * (1 - edge) + c_eye * edge, col[..., :3])
        rough[..., :3] = np.where(eye[..., None], rough[..., :3] * (1 - edge) + 0.12 * edge, rough[..., :3])
        print(f'painted eye: {int(eye.sum())} texels')
    base_img.pixels[:] = col.ravel()
    rough_img.pixels[:] = rough.ravel()

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
