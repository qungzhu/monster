"""Give a static (Meshy) cat a proper long, fluffy tail.

Meshy turns big plume tails into short stubs. This grows one tail from the
stub along a curve (blended metaballs, so it's round and soft like a plush
toy), colours it to match the sheet (base colour sampled from the stub's
texture, optional stripes / band / tip) as vertex colours, and exports
just the tail; merge-tail.mjs then joins it to the
untouched body file (re-exporting a Meshy body scrambles it). The stub stays inside the new
tail's root, so there's still exactly one tail.

  .venv-blender/bin/python tools/blender/add_tail.py IN.glb TAIL.glb PRESET
  node tools/blender/merge-tail.mjs IN.glb TAIL.glb OUT.glb

Presets are below; coordinates are fractions of the body height, in the
mesh's local space (Blender axes: Z up, tail toward +Y).
"""
import bpy, sys, math, os
from mathutils import Vector, noise

src, dst, preset = sys.argv[-3], sys.argv[-2], sys.argv[-1]

PRESETS = {
    # Maine Coon sheet: thick plume sweeping back, then curling up (kept low
    # enough that it doesn't show above the head from the front).
    'mainecoon': dict(
        path=[(0, -0.02, 0.05), (0, 0.14, 0.07), (0, 0.28, 0.12), (0, 0.39, 0.21), (0, 0.43, 0.31), (0, 0.38, 0.38)],
        radius=[0.08, 0.11, 0.155, 0.18, 0.165, 0.10],
        stripes=dict(count=6, depth=0.28), tip=dict(start=0.85, colour=(0.18, 0.13, 0.09)),
    ),
    # Norwegian sheet: plume sweeping back and slightly down, grey band, light tip.
    'norwegian': dict(
        path=[(0, -0.02, 0.05), (0, 0.12, 0.04), (0, 0.26, -0.02), (0, 0.38, -0.05), (0, 0.48, -0.02), (0, 0.55, 0.04)],
        radius=[0.075, 0.105, 0.15, 0.17, 0.16, 0.09],
        stripes=dict(count=4, depth=0.18), band=dict(start=0.45, end=0.78, colour=(0.33, 0.31, 0.30)),
        tip=dict(start=0.82, colour=(0.90, 0.86, 0.80)),
    ),
    # Exotic sheet: thick plush tail hanging back and down, tip lifting a little.
    'exotic': dict(
        # Starts high and thick so Meshy's little hooked stub ends up inside it.
        path=[(0, -0.05, 0.10), (0, 0.05, 0.08), (0, 0.16, 0.01), (0, 0.27, -0.05), (0, 0.36, -0.07), (0, 0.42, -0.03)],
        radius=[0.10, 0.115, 0.12, 0.125, 0.115, 0.075],
        stripes=dict(count=4, depth=0.08),
    ),
    # Egyptian Mau sheet: long tail sweeping back, low, tip lifting; black
    # rings and a black tip.
    'mau': dict(
        path=[(0, -0.04, 0.07), (0, 0.08, 0.04), (0, 0.22, -0.02), (0, 0.36, -0.05), (0, 0.48, -0.03), (0, 0.56, 0.03)],
        radius=[0.10, 0.09, 0.085, 0.08, 0.075, 0.06],
        stripes=dict(count=7, depth=0.75), tip=dict(start=0.86, colour=(0.03, 0.03, 0.03)),
    ),
    # Grey tabby sheet: long striped tail hanging back, tip lifting a little.
    'greytabby': dict(
        path=[(0, -0.04, 0.07), (0, 0.08, 0.04), (0, 0.22, -0.02), (0, 0.36, -0.06), (0, 0.48, -0.05), (0, 0.56, 0.0)],
        radius=[0.10, 0.09, 0.085, 0.08, 0.075, 0.06],
        stripes=dict(count=7, depth=0.6),
    ),
    # Snowshoe sheet: thick dark-brown point tail sweeping back and down.
    # Meshy left a white stub, so the colour is given, not sampled.
    'snowshoe': dict(
        path=[(0, -0.04, 0.08), (0, 0.08, 0.05), (0, 0.22, -0.01), (0, 0.35, -0.05), (0, 0.47, -0.04), (0, 0.55, 0.01)],
        radius=[0.11, 0.105, 0.10, 0.095, 0.085, 0.065],
        colour=(0.075, 0.052, 0.04),
    ),
}
P = PRESETS[preset]

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=src)
body = max((o for o in scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
me = body.data
co = [v.co for v in me.vertices]
lo = Vector([min(c[i] for c in co) for i in range(3)])
hi = Vector([max(c[i] for c in co) for i in range(3)])
H = hi.z - lo.z

# Root: the stub's surface at the back of the body, upper half.
back = hi.y - 0.10 * (hi.y - lo.y)
stub = [c for c in co if c.y > back]
root = sum(stub, Vector()) / len(stub)
root.z = max(c.z for c in stub) - 0.35 * (max(c.z for c in stub) - min(c.z for c in stub))
print(f'root at {tuple(round(x, 3) for x in root)}, body height {H:.3f}')

# Base fur colour: the texture under the stub.
img = next((n.image for m in me.materials if m and m.node_tree for n in m.node_tree.nodes
            if n.type == 'TEX_IMAGE' and n.image and 'color' in (n.image.name + n.label).lower()), None) \
    or next((n.image for m in me.materials if m and m.node_tree for n in m.node_tree.nodes
             if n.type == 'TEX_IMAGE' and n.image), None)
uv = me.uv_layers.active.data
w, h = img.size
px = img.pixels[:]
acc, n = Vector((0, 0, 0)), 0
stub_ids = {v.index for v in me.vertices if v.co.y > back}
for poly in me.polygons:
    if all(i in stub_ids for i in poly.vertices):
        for li in poly.loop_indices:
            u = uv[li].uv
            i = (min(h - 1, int(u.y % 1 * h)) * w + min(w - 1, int(u.x % 1 * w))) * 4
            acc += Vector(px[i:i + 3]); n += 1
base = Vector([c ** 2.2 for c in acc / max(n, 1)])  # texture values are sRGB; paint is linear
if 'colour' in P:
    base = Vector(P['colour'])  # linear; for stubs whose texture has the wrong colour
print(f'base colour {tuple(round(c, 3) for c in base)} from {n} samples')

# ---- tail shape: metaballs along a smooth curve
pts = [root + Vector(p) * H for p in P['path']]
rad = [r * H for r in P['radius']]

def catmull(ps, t):
    k = min(int(t), len(ps) - 2); f = t - k
    p0, p1, p2, p3 = ps[max(k - 1, 0)], ps[k], ps[k + 1], ps[min(k + 2, len(ps) - 1)]
    return 0.5 * ((2 * p1) + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f ** 3)

mb = bpy.data.metaballs.new('tail'); mb.resolution = mb.render_resolution = H * 0.012; mb.threshold = 0.5
mbo = bpy.data.objects.new('tail', mb); scene.collection.objects.link(mbo)
steps = 60
for s in range(steps + 1):
    t = s / steps * (len(pts) - 1)
    e = mb.elements.new(); e.co = catmull(pts, t)
    k = min(int(t), len(rad) - 2); f = t - k
    e.radius = rad[k] * (1 - f) + rad[k + 1] * f
    e.stiffness = 2.0
bpy.context.view_layer.objects.active = mbo; mbo.select_set(True)
bpy.ops.object.convert(target='MESH')
tail = bpy.context.active_object
rm = tail.modifiers.new('r', 'REMESH'); rm.mode, rm.voxel_size = 'VOXEL', H * 0.008
bpy.ops.object.modifier_apply(modifier='r')
sm = tail.modifiers.new('s', 'CORRECTIVE_SMOOTH'); sm.factor, sm.iterations = 0.6, 6
bpy.ops.object.modifier_apply(modifier='s')
# Soft fur clumps on the surface, like a plush toy's long pile.
tex = bpy.data.textures.new('clumps', 'CLOUDS'); tex.noise_scale = H * 0.035; tex.noise_depth = 1
dp = tail.modifiers.new('d', 'DISPLACE'); dp.texture = tex; dp.strength = H * 0.012; dp.mid_level = 0.5
bpy.ops.object.modifier_apply(modifier='d')
bpy.ops.object.shade_smooth()
print(f'tail faces {len(tail.data.polygons)}')

# ---- colour: base + stripes/band/tip + fur streaks, painted per vertex
samples = [catmull(pts, s / 200 * (len(pts) - 1)) for s in range(201)]
def along(p):
    return min(range(201), key=lambda i: (samples[i] - p).length) / 200
col = tail.data.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
for v in tail.data.vertices:
    a = along(v.co)
    c = base.copy()
    if 'stripes' in P:
        sp = P['stripes']
        ring = 0.5 + 0.5 * math.sin(a * sp['count'] * 2 * math.pi + noise.noise(v.co * 25 / H) * 1.5)
        c *= 1 - sp['depth'] * ring
    if 'band' in P:
        b = P['band']
        wgt = max(0.0, min(1.0, (a - b['start']) / 0.08)) * max(0.0, min(1.0, (b['end'] - a) / 0.08))
        c = c.lerp(Vector(b['colour']), wgt)
    if 'tip' in P:
        tp = P['tip']
        c = c.lerp(Vector(tp['colour']), max(0.0, min(1.0, (a - tp['start']) / (1 - tp['start']))))
    streak = 1 + 0.08 * noise.noise(Vector((v.co.x * 120 / H, v.co.y * 120 / H, v.co.z * 30 / H)))
    c *= streak
    col.data[v.index].color = (*[max(0.0, min(1.0, x)) for x in c], 1)

mat = bpy.data.materials.new('tail_fur'); mat.use_nodes = True
nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']
vc = nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'Col'
nt.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 0.9
tail.data.materials.append(mat)
# The paint is exported as vertex colours (glTF COLOR_0): no texture bake,
# so no dark texels at UV-island seams.
# Export only the tail: the Meshy body must not round-trip through Blender
# (that scrambles its textures); merge-tail.mjs joins it to the original.
bpy.ops.object.select_all(action='DESELECT')
tail.select_set(True)
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', use_selection=True,
                          export_vertex_color='ACTIVE')
print('wrote', dst)
