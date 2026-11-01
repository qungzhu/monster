"""Hero props for the living-world scenes, modelled in code, plush-toy style:
soft rounded forms (bevels + subdivision), puffy cushions, and materials
named so the app knows what to do with them:

  fabric_*  -> plush fabric in the app (same shader as the cats)
  glow_*    -> emissive (lamp shades, fire glass)
  anything else (wood, brass, marble) keeps its glTF look

  .venv-blender/bin/python tools/blender/plush_props.py OUT_DIR [name ...]

Units: metres-ish; the app scales each prop to a height anyway.
"""
import bpy, bmesh, sys, os, math
from mathutils import Matrix, Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
OUT = args[0]
ONLY = set(args[1:])


# ---------- helpers

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(name, color, rough=0.8, metal=0.0, emit=None, sheen=0.0):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if sheen:
        b.inputs['Sheen Weight'].default_value = sheen
    if emit:
        b.inputs['Emission Color'].default_value = (*emit[0], 1)
        b.inputs['Emission Strength'].default_value = emit[1]
    return m


def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def finish(o, m, bevel=0.0, segs=4, subdiv=2, smooth=True):
    o.data.materials.append(m)
    if bevel:
        bv = o.modifiers.new('bevel', 'BEVEL')
        bv.width = bevel
        bv.segments = segs
        bv.limit_method = 'NONE'
    if subdiv:
        sd = o.modifiers.new('subd', 'SUBSURF')
        sd.levels = sd.render_levels = subdiv
    if smooth:
        for p in o.data.polygons:
            p.use_smooth = True
    return o


def box(name, size, loc, m, bevel=0.05, subdiv=2, segs=4):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    return finish(o, m, bevel, segs, subdiv)


def cyl(name, r, depth, loc, m, rot=(0, 0, 0), verts=32, bevel=0.0, subdiv=1, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    if subdiv and not bevel:
        # round the cap edges first, or subdivision pulls the caps to a point
        bevel = min(r if r2 is None else min(r, r2 or r), depth) * 0.25
    return finish(o, m, bevel, 3, subdiv)


def sphere(name, r, loc, m, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=24, ring_count=14)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    return finish(o, m, 0, subdiv=0)


def prism(name, w, d, h, z0, m, subdiv=0, bevel=0.0):
    """Gable roof: a triangular prism along X, eaves at z0, ridge at z0 + h."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    vs = [bm.verts.new(v) for v in ((-w / 2, -d / 2, z0), (-w / 2, d / 2, z0), (-w / 2, 0, z0 + h),
                                    (w / 2, -d / 2, z0), (w / 2, d / 2, z0), (w / 2, 0, z0 + h))]
    for f in ((0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)):
        bm.faces.new([vs[i] for i in f])
    bm.normal_update()
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    return finish(o, m, bevel, 3, subdiv, smooth=bool(subdiv))


def puff(o, amount):
    """Make a cushion puffy: push the middle of every face outwards."""
    c = o.modifiers.new('puff', 'CAST')
    c.cast_type = 'SPHERE'
    c.factor = amount
    c.use_x = c.use_y = c.use_z = True
    return o


def export(name):
    """Props are built facing +Y; turn them to face the glTF camera (+Z)."""
    os.makedirs(OUT, exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    for o in bpy.context.selected_objects:
        o.matrix_world = Matrix.Rotation(math.pi, 4, 'Z') @ o.matrix_world
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, f'{name}.glb'), export_format='GLB',
                              export_apply=True, export_yup=True)
    print('wrote', name)


# ---------- props

def plush_sofa():
    """Tufted velvet chesterfield-ish sofa with rolled arms and gold legs."""
    velvet = mat('fabric_velvet_rose', srgb('#c98792'), rough=1, sheen=1)
    tuft = mat('fabric_velvet_rose_dark', srgb('#9e5f6c'), rough=1, sheen=1)
    gold = mat('brass', srgb('#c9a04a'), rough=0.35, metal=1)
    W, D = 2.0, 0.9
    box('base', (W - 0.2, D, 0.3), (0, 0, 0.3), velvet, bevel=0.1)
    for i, x in enumerate((-0.42, 0.42)):
        c = box(f'seat{i}', (0.84, 0.74, 0.24), (x, 0.06, 0.58), velvet, bevel=0.11, subdiv=3)
        puff(c, 0.25)
    back = box('back', (W - 0.1, 0.3, 0.66), (0, -D / 2 + 0.15, 0.84), velvet, bevel=0.14, subdiv=3)
    puff(back, 0.15)
    # tufting buttons on the back, two rows
    for row, z in enumerate((0.72, 0.95)):
        for k in range(5 - row):
            x = -0.72 + k * 0.36 + row * 0.18
            sphere(f'tuft{row}{k}', 0.032, (x, -D / 2 + 0.31, z), tuft, scale=(1, 0.7, 1))
    # rolled arms
    for s in (-1, 1):
        cyl(f'arm{s}', 0.17, D, (s * (W / 2 - 0.04), 0, 0.62), velvet, rot=(math.pi / 2, 0, 0), bevel=0.06, subdiv=2)
        box(f'armside{s}', (0.2, D, 0.4), (s * (W / 2 - 0.04), 0, 0.42), velvet, bevel=0.08)
    for x in (-W / 2 + 0.12, W / 2 - 0.12):
        for y in (-D / 2 + 0.12, D / 2 - 0.12):
            cyl('leg', 0.035, 0.18, (x, y, 0.09), gold, r2=0.022, subdiv=1)
    # two throw cushions
    for i, (x, tilt) in enumerate(((-0.62, 0.25), (0.6, -0.2))):
        p = box(f'pillow{i}', (0.42, 0.16, 0.4), (x, -0.08, 0.9), mat('fabric_pillow_sage', srgb('#9db59a'), rough=1, sheen=1), bevel=0.06, subdiv=3)
        p.rotation_euler = (0.25, tilt, 0)
        puff(p, 0.45)
    export('plush_sofa')


def plush_fireplace():
    """Cream marble mantel with an arched opening, brass fender, candles."""
    marble = mat('marble', srgb('#efe6d6'), rough=0.3)
    dark = mat('soot', srgb('#1a120d'), rough=1)
    gold = mat('brass', srgb('#c9a04a'), rough=0.35, metal=1)
    wax = mat('wax', srgb('#fbf3e2'), rough=0.6)
    flame = mat('glow_flame', srgb('#ffb347'), emit=(srgb('#ffb347'), 8))
    W, H, D = 1.8, 1.3, 0.45
    for s in (-1, 1):
        box(f'pillar{s}', (0.36, D, H - 0.12), (s * (W / 2 - 0.18), 0, (H - 0.12) / 2), marble, bevel=0.04)
        for k in range(3):  # carved flutes
            box(f'flute{s}{k}', (0.04, 0.02, H - 0.45), (s * (W / 2 - 0.18) + (k - 1) * 0.09, D / 2, (H - 0.12) / 2), marble, bevel=0.01, subdiv=1)
    box('lintel', (W - 0.5, D, 0.32), (0, 0, H - 0.28), marble, bevel=0.04)
    box('shelf', (W + 0.2, D + 0.14, 0.09), (0, 0.04, H - 0.06), marble, bevel=0.035)
    # arch: half torus across the opening
    bpy.ops.mesh.primitive_torus_add(major_radius=0.42, minor_radius=0.05, location=(0, D / 2 - 0.02, H - 0.62),
                                     rotation=(math.pi / 2, 0, 0), major_segments=48, minor_segments=12)
    t = bpy.context.active_object
    bm = bmesh.new(); bm.from_mesh(t.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y < -0.01], context='VERTS')
    bm.to_mesh(t.data); bm.free()
    finish(t, marble, subdiv=1)
    box('firebox', (W - 0.72, 0.1, H - 0.4), (0, -D / 2 + 0.05, (H - 0.4) / 2), dark, bevel=0.02, subdiv=0)
    box('hearth', (W + 0.3, D + 0.45, 0.07), (0, 0.18, 0.035), marble, bevel=0.03)
    # brass fender
    cyl('fender', 0.018, W - 0.6, (0, D / 2 + 0.12, 0.16), gold, rot=(0, math.pi / 2, 0), subdiv=0)
    for x in (-(W - 0.6) / 2, (W - 0.6) / 2):
        sphere('finial', 0.04, (x, D / 2 + 0.12, 0.16), gold)
    # candles and a little clock on the mantel
    for i, x in enumerate((-0.7, -0.55, 0.62)):
        h = (0.22, 0.16, 0.2)[i]
        cyl(f'stick{i}', 0.045, 0.04, (x, 0.05, H + 0.01), gold, subdiv=0)
        cyl(f'candle{i}', 0.028, h, (x, 0.05, H + 0.03 + h / 2), wax, subdiv=0)
        sphere(f'flame{i}', 0.022, (x, 0.05, H + 0.06 + h), flame, scale=(0.7, 0.7, 1.5))
    box('clock', (0.26, 0.12, 0.3), (0.1, 0.02, H + 0.17), gold, bevel=0.05)
    cyl('clockface', 0.08, 0.02, (0.1, 0.09, H + 0.2), wax, rot=(math.pi / 2, 0, 0), subdiv=0)
    export('plush_fireplace')


def plush_lamp():
    """Brass floor lamp with a pleated fabric shade that glows."""
    gold = mat('brass', srgb('#c9a04a'), rough=0.3, metal=1)
    shade = mat('glow_shade', srgb('#f6dcb4'), rough=1, emit=(srgb('#ffc77a'), 1.6))
    trim = mat('fabric_trim', srgb('#b36a4f'), rough=1, sheen=1)
    cyl('foot', 0.2, 0.05, (0, 0, 0.025), gold, bevel=0.02, subdiv=1)
    cyl('foot2', 0.12, 0.08, (0, 0, 0.08), gold, r2=0.05, subdiv=1)
    cyl('pole', 0.018, 1.45, (0, 0, 0.83), gold, subdiv=0)
    for z in (0.5, 1.0):
        sphere(f'knob{z}', 0.035, (0, 0, z), gold)
    # pleated shade: a cone whose rim wobbles in and out
    bpy.ops.mesh.primitive_cone_add(vertices=64, radius1=0.32, radius2=0.18, depth=0.36, location=(0, 0, 1.68), end_fill_type='NOTHING')
    o = bpy.context.active_object
    for v in o.data.vertices:
        a = math.atan2(v.co.y, v.co.x)
        k = 1 + 0.035 * math.cos(a * 32)
        v.co.x *= k
        v.co.y *= k
    sol = o.modifiers.new('thick', 'SOLIDIFY')
    sol.thickness = 0.008
    finish(o, shade, subdiv=1)
    for z, r in ((1.5, 0.33), (1.86, 0.19)):
        bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=0.012, location=(0, 0, z), major_segments=64, minor_segments=8)
        finish(bpy.context.active_object, trim, subdiv=0)
    export('plush_lamp')


def plush_armchair():
    """Single tufted velvet armchair matching the sofa (sage)."""
    velvet = mat('fabric_velvet_sage', srgb('#8fae95'), rough=1, sheen=1)
    tuft = mat('fabric_velvet_sage_dark', srgb('#6c8a72'), rough=1, sheen=1)
    gold = mat('brass', srgb('#c9a04a'), rough=0.35, metal=1)
    W, D = 1.0, 0.9
    box('base', (W - 0.15, D, 0.3), (0, 0, 0.3), velvet, bevel=0.1)
    puff(box('seat', (0.74, 0.74, 0.24), (0, 0.06, 0.58), velvet, bevel=0.11, subdiv=3), 0.25)
    puff(box('back', (W - 0.05, 0.3, 0.72), (0, -D / 2 + 0.15, 0.88), velvet, bevel=0.14, subdiv=3), 0.15)
    for x in (-0.18, 0.18):
        for z in (0.8, 1.02):
            sphere('tuft', 0.03, (x, -D / 2 + 0.31, z), tuft, scale=(1, 0.7, 1))
    for s in (-1, 1):
        cyl(f'arm{s}', 0.16, D, (s * (W / 2 - 0.02), 0, 0.62), velvet, rot=(math.pi / 2, 0, 0), bevel=0.06, subdiv=2)
        box(f'armside{s}', (0.18, D, 0.4), (s * (W / 2 - 0.02), 0, 0.42), velvet, bevel=0.08)
    for x in (-W / 2 + 0.12, W / 2 - 0.12):
        for y in (-D / 2 + 0.12, D / 2 - 0.12):
            cyl('leg', 0.035, 0.18, (x, y, 0.09), gold, r2=0.022, subdiv=1)
    export('plush_armchair')


def plush_fountain():
    """Three-tier garden fountain with scalloped basins and glowing water."""
    stone = mat('marble', srgb('#f1ebe0'), rough=0.45)
    water = mat('glow_water', srgb('#8fd3ea'), rough=0.05, emit=(srgb('#9edcf0'), 0.6))
    gold = mat('brass', srgb('#d4ad5a'), rough=0.3, metal=1)
    cyl('basin', 1.0, 0.36, (0, 0, 0.18), stone, bevel=0.05, subdiv=2, verts=48)
    cyl('pool', 0.9, 0.04, (0, 0, 0.34), water, subdiv=0, verts=48)
    for i in range(16):  # scalloped rim
        a = i / 16 * 2 * math.pi
        sphere(f'scallop{i}', 0.12, (math.cos(a) * 0.98, math.sin(a) * 0.98, 0.36), stone, scale=(1, 1, 0.6))
    cyl('stem', 0.13, 0.75, (0, 0, 0.72), stone, r2=0.09, subdiv=1)
    cyl('bowl', 0.55, 0.2, (0, 0, 1.12), stone, r2=0.18, rot=(math.pi, 0, 0), subdiv=2, verts=40)
    cyl('pool2', 0.5, 0.03, (0, 0, 1.21), water, subdiv=0, verts=40)
    cyl('stem2', 0.07, 0.4, (0, 0, 1.4), stone, subdiv=1)
    cyl('bowl2', 0.28, 0.12, (0, 0, 1.62), stone, r2=0.1, rot=(math.pi, 0, 0), subdiv=2)
    sphere('finial', 0.08, (0, 0, 1.8), gold)
    for i in range(8):  # streams falling from the upper bowl
        a = i / 8 * 2 * math.pi
        cyl(f'stream{i}', 0.018, 0.75, (math.cos(a) * 0.5, math.sin(a) * 0.5, 0.78), water, subdiv=0, verts=8)
    export('plush_fountain')


def plush_gazebo():
    """White garden gazebo: six columns, scalloped mint dome, gold finial."""
    white = mat('paint_white', srgb('#fbf7ef'), rough=0.5)
    roof = mat('fabric_roof_mint', srgb('#bfe0d2'), rough=1, sheen=1)
    gold = mat('brass', srgb('#d4ad5a'), rough=0.3, metal=1)
    cyl('floor', 1.25, 0.16, (0, 0, 0.08), white, verts=6, bevel=0.03, subdiv=0)
    for i in range(6):
        a = i / 6 * 2 * math.pi
        x, y = math.cos(a) * 1.0, math.sin(a) * 1.0
        cyl(f'col{i}', 0.06, 1.7, (x, y, 1.0), white, subdiv=1, verts=16)
        sphere(f'cap{i}', 0.09, (x, y, 1.86), white)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.25, location=(0, 0, 1.9), segments=48, ring_count=24)
    d = bpy.context.active_object
    bm = bmesh.new(); bm.from_mesh(d.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.01], context='VERTS')
    bm.to_mesh(d.data); bm.free()
    d.scale = (1, 1, 0.7)
    finish(d, roof, subdiv=1)
    for i in range(18):  # scalloped valance
        a = i / 18 * 2 * math.pi
        sphere(f'val{i}', 0.15, (math.cos(a) * 1.22, math.sin(a) * 1.22, 1.88), roof, scale=(1, 1, 0.55))
    cyl('spire', 0.04, 0.3, (0, 0, 2.95), gold, subdiv=0)
    sphere('ball', 0.09, (0, 0, 3.12), gold)
    export('plush_gazebo')


def plush_sheep():
    """A fluffy sheep: cloud of wool puffs, dark face and legs."""
    wool = mat('fabric_wool', srgb('#f6f1e6'), rough=1, sheen=1)
    face = mat('fabric_face', srgb('#3b3330'), rough=1, sheen=0.5)
    eye = mat('eye', srgb('#111111'), rough=0.2)
    import random
    rnd = random.Random(3)
    for i in range(22):
        x = rnd.uniform(-0.38, 0.38); y = rnd.uniform(-0.22, 0.22); z = 0.52 + rnd.uniform(-0.12, 0.14)
        sphere(f'puff{i}', rnd.uniform(0.17, 0.24), (y * 0, x, z) if False else (y, x, z), wool)
    sphere('head', 0.15, (0, 0.5, 0.62), face, scale=(0.8, 1.1, 1))
    sphere('topknot', 0.1, (0, 0.46, 0.78), wool)
    for s in (-1, 1):
        sphere(f'ear{s}', 0.06, (s * 0.15, 0.45, 0.68), face, scale=(1.6, 0.5, 0.6))
        sphere(f'eye{s}', 0.022, (s * 0.07, 0.63, 0.67), eye)
    for x in (-0.12, 0.12):
        for y in (-0.22, 0.25):
            cyl('leg', 0.045, 0.32, (x, y, 0.16), face, subdiv=1)
    export('plush_sheep')


def plush_yurt():
    """Kazakh yurt of the Tianshan meadows: white felt, red band, carved door."""
    felt = mat('fabric_felt', srgb('#f4ede0'), rough=1, sheen=1)
    band = mat('fabric_band_red', srgb('#b5373a'), rough=1, sheen=1)
    wood = mat('wood_red', srgb('#9b3b2c'), rough=0.6)
    gold = mat('paint_gold', srgb('#e2b54e'), rough=0.5)
    cyl('wall', 1.3, 1.0, (0, 0, 0.5), felt, verts=48, subdiv=1, bevel=0.03)
    cyl('roof', 1.38, 0.75, (0, 0, 1.36), felt, r2=0.32, verts=48, subdiv=1)
    cyl('crown', 0.34, 0.12, (0, 0, 1.78), wood, verts=24, subdiv=0)
    for z in (0.18, 0.92):
        cyl(f'band{z}', 1.31, 0.12, (0, 0, z), band, verts=48, subdiv=0)
    bpy.ops.mesh.primitive_torus_add(major_radius=1.1, minor_radius=0.06, location=(0, 0, 1.25), major_segments=48, minor_segments=8)
    finish(bpy.context.active_object, band, subdiv=0)
    box('door', (0.6, 0.12, 0.85), (0, 1.27, 0.45), wood, bevel=0.03, subdiv=0)
    for z in (0.3, 0.6):
        box(f'carve{z}', (0.4, 0.13, 0.05), (0, 1.29, z), gold, bevel=0.01, subdiv=0)
    export('plush_yurt')


def plush_cabin():
    """Log cabin with a thick snowy roof, glowing windows and a chimney."""
    log = mat('wood_log', srgb('#8a5a3c'), rough=0.8)
    snow = mat('fabric_snow', srgb('#f7f9fd'), rough=1, sheen=1)
    roof = mat('roof_red', srgb('#b2392f'), rough=0.7)
    glow = mat('glow_window', srgb('#ffc56b'), emit=(srgb('#ffc56b'), 3))
    stone = mat('stone', srgb('#9a948c'), rough=1)
    W, D = 2.0, 1.6
    for k in range(7):
        z = 0.12 + k * 0.17
        for s in (-1, 1):
            cyl(f'logx{k}{s}', 0.09, W + 0.2, (0, s * D / 2, z), log, rot=(0, math.pi / 2, 0), subdiv=1, verts=12)
            cyl(f'logy{k}{s}', 0.09, D + 0.2, (s * W / 2, 0, z + 0.08), log, rot=(math.pi / 2, 0, 0), subdiv=1, verts=12)
    prism('roof', W + 0.5, D + 0.6, 0.85, 1.25, roof)
    prism('roofsnow', W + 0.6, D + 0.75, 0.95, 1.3, snow, subdiv=2, bevel=0.08)
    for x in (-0.55, 0.55):
        box(f'win{x}', (0.38, 0.06, 0.36), (x, D / 2 + 0.06, 0.62), glow, subdiv=0)
        box(f'frame{x}', (0.46, 0.05, 0.44), (x, D / 2 + 0.04, 0.62), log, subdiv=0)
    box('door', (0.42, 0.06, 0.8), (0, D / 2 + 0.06, 0.4), mat('wood_door', srgb('#5e3a26'), rough=0.7), bevel=0.02, subdiv=0)
    box('chimney', (0.3, 0.3, 1.0), (0.6, -0.35, 2.0), stone, bevel=0.03, subdiv=0)
    puff(box('chimsnow', (0.38, 0.38, 0.12), (0.6, -0.35, 2.52), snow, bevel=0.05, subdiv=2), 0.3)
    export('plush_cabin')


def plush_snowman():
    """Snowman with a knitted scarf, top hat and carrot nose."""
    snow = mat('fabric_snow', srgb('#f7f9fd'), rough=1, sheen=1)
    scarf = mat('fabric_scarf', srgb('#c8394a'), rough=1, sheen=1)
    black = mat('coal', srgb('#1d1d22'), rough=0.6)
    carrot = mat('carrot', srgb('#f08a2c'), rough=0.6)
    sphere('base', 0.42, (0, 0, 0.4), snow)
    sphere('mid', 0.31, (0, 0, 0.98), snow)
    sphere('head', 0.23, (0, 0, 1.42), snow)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.25, minor_radius=0.07, location=(0, 0, 1.22), major_segments=32, minor_segments=10)
    finish(bpy.context.active_object, scarf, subdiv=1)
    t = box('tail', (0.12, 0.06, 0.38), (0.12, 0.24, 1.02), scarf, bevel=0.03)
    t.rotation_euler = (0.1, 0.25, 0)
    cyl('brim', 0.24, 0.03, (0, 0, 1.6), black, subdiv=0)
    cyl('hat', 0.15, 0.26, (0, 0, 1.75), black, subdiv=0)
    cyl('nose', 0.04, 0.22, (0, 0.32, 1.42), carrot, r2=0.0, rot=(-math.pi / 2, 0, 0), subdiv=0)
    for s in (-1, 1):
        sphere(f'eye{s}', 0.03, (s * 0.08, 0.2, 1.5), black)
    for z in (0.85, 1.0, 1.15):
        sphere(f'btn{z}', 0.035, (0, 0.3, z - 0.02), black)
    export('plush_snowman')


def plush_bench():
    """Park bench: rounded wooden slats on curly iron frames."""
    wood = mat('wood_bench', srgb('#a8703f'), rough=0.6)
    iron = mat('iron', srgb('#2f3a35'), rough=0.4, metal=0.6)
    for k, (y, z) in enumerate(((0.12, 0.45), (0.0, 0.45), (-0.12, 0.45), (-0.2, 0.62), (-0.24, 0.78))):
        box(f'slat{k}', (1.5, 0.1, 0.05), (0, y, z), wood, bevel=0.02, subdiv=1)
    for s in (-1, 1):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.22, minor_radius=0.025, location=(s * 0.7, 0.0, 0.3), rotation=(0, math.pi / 2, 0), major_segments=32, minor_segments=8)
        finish(bpy.context.active_object, iron, subdiv=0)
        box(f'leg{s}', (0.05, 0.45, 0.05), (s * 0.7, -0.05, 0.05), iron, subdiv=0)
        bpy.ops.mesh.primitive_torus_add(major_radius=0.12, minor_radius=0.025, location=(s * 0.7, 0.05, 0.6), rotation=(0, math.pi / 2, 0), major_segments=24, minor_segments=8)
        finish(bpy.context.active_object, iron, subdiv=0)
    export('plush_bench')


def plush_flowercart():
    """Wooden flower cart heaped with blooms."""
    wood = mat('wood_cart', srgb('#b98252'), rough=0.6)
    import random
    rnd = random.Random(8)
    box('bed', (1.2, 0.7, 0.35), (0, 0, 0.6), wood, bevel=0.03, subdiv=0)
    for s in (-1, 1):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.32, minor_radius=0.04, location=(s * 0.4, 0.4, 0.34), rotation=(math.pi / 2, 0, 0), major_segments=32, minor_segments=8)
        finish(bpy.context.active_object, wood, subdiv=0)
        cyl(f'hub{s}', 0.06, 0.08, (s * 0.4, 0.4, 0.34), wood, rot=(math.pi / 2, 0, 0), subdiv=0)
        box(f'handle{s}', (0.05, 0.05, 0.6), (s * 0.3, -0.55, 0.65), wood, subdiv=0).rotation_euler = (0.9, 0, 0)
    cols = ['#f472a6', '#fbcfe0', '#fde047', '#c084fc', '#ffffff', '#fb923c']
    for i in range(30):
        c = mat(f'fabric_bloom{i % len(cols)}', srgb(cols[i % len(cols)]), rough=1, sheen=1)
        sphere(f'bloom{i}', rnd.uniform(0.07, 0.11), (rnd.uniform(-0.5, 0.5), rnd.uniform(-0.28, 0.28), 0.82 + rnd.uniform(0, 0.15)), c)
    for i in range(10):
        sphere(f'leaf{i}', 0.08, (rnd.uniform(-0.55, 0.55), rnd.uniform(-0.3, 0.3), 0.78), mat('fabric_leaf', srgb('#6fa55a'), rough=1, sheen=1), scale=(1.4, 0.8, 0.5))
    export('plush_flowercart')


def plush_belltent():
    """Canvas bell tent with an open, glowing doorway and bunting."""
    canvas = mat('fabric_canvas', srgb('#efe4cf'), rough=1, sheen=1)
    glow = mat('glow_inside', srgb('#ffb766'), emit=(srgb('#ffb766'), 2.5))
    wood = mat('wood_pole', srgb('#6b4a33'), rough=0.7)
    cyl('wall', 1.3, 0.75, (0, 0, 0.375), canvas, verts=48, subdiv=1)
    cyl('roof', 1.38, 1.15, (0, 0, 1.32), canvas, r2=0.03, verts=48, subdiv=1)
    box('door', (0.62, 0.05, 0.95), (0, 1.29, 0.5), glow, bevel=0.03, subdiv=0)
    for s in (-1, 1):
        f = box(f'flap{s}', (0.32, 0.05, 0.9), (s * 0.42, 1.31, 0.52), canvas, bevel=0.04)
        f.rotation_euler = (0, 0, s * 0.35)
    cyl('pole', 0.025, 0.35, (0, 0, 2.05), wood, subdiv=0)
    cols = ['#e76f51', '#f4a261', '#2a9d8f', '#e9c46a']
    for i in range(10):
        a = i / 10 * 2 * math.pi
        fl = mat(f'fabric_flag{i % 4}', srgb(cols[i % 4]), rough=1, sheen=1)
        cyl(f'flag{i}', 0.07, 0.12, (math.cos(a) * 0.9, math.sin(a) * 0.9, 1.02), fl, r2=0.0, verts=3, rot=(math.pi, 0, a), subdiv=0)
    export('plush_belltent')


def plush_campfire():
    """Stone ring with crossed logs (the app adds the flames and light)."""
    stone = mat('fabric_stone', srgb('#9b968e'), rough=1, sheen=0.5)
    wood = mat('wood_log', srgb('#7a4e33'), rough=0.8)
    ember = mat('glow_ember', srgb('#ff6a2a'), emit=(srgb('#ff6a2a'), 4))
    for i in range(10):
        a = i / 10 * 2 * math.pi
        sphere(f'stone{i}', 0.11, (math.cos(a) * 0.42, math.sin(a) * 0.42, 0.07), stone, scale=(1.2, 1, 0.75))
    for k in range(4):
        l = cyl(f'log{k}', 0.055, 0.6, (0, 0, 0.12 + (k % 2) * 0.03), wood, rot=(0, math.pi / 2, k * math.pi / 4), subdiv=1, verts=12)
    sphere('embers', 0.16, (0, 0, 0.06), ember, scale=(1, 1, 0.35))
    export('plush_campfire')


def plush_picnic():
    """Gingham picnic blanket with a wicker basket."""
    red = mat('fabric_gingham_red', srgb('#d4464f'), rough=1, sheen=1)
    white = mat('fabric_gingham_white', srgb('#f8efe6'), rough=1, sheen=1)
    wicker = mat('wicker', srgb('#c99a5b'), rough=0.8)
    for i in range(6):
        for j in range(6):
            box(f'sq{i}{j}', (0.25, 0.25, 0.02), (-0.625 + i * 0.25, -0.625 + j * 0.25, 0.01), red if (i + j) % 2 else white, bevel=0.005, subdiv=0)
    box('basket', (0.42, 0.3, 0.26), (0.35, 0.2, 0.15), wicker, bevel=0.04)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.17, minor_radius=0.02, location=(0.35, 0.2, 0.3), rotation=(0, math.pi / 2, 0), major_segments=24, minor_segments=8)
    t = bpy.context.active_object
    bm = bmesh.new(); bm.from_mesh(t.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.x < 0], context='VERTS')
    bm.to_mesh(t.data); bm.free()
    finish(t, wicker, subdiv=0)
    sphere('apple', 0.06, (-0.2, 0.3, 0.07), mat('apple', srgb('#d93a3a'), rough=0.4))
    export('plush_picnic')


PROPS = {f.__name__: f for f in (plush_sofa, plush_fireplace, plush_lamp, plush_armchair, plush_fountain, plush_gazebo,
                                  plush_sheep, plush_yurt, plush_cabin, plush_snowman, plush_bench, plush_flowercart,
                                  plush_belltent, plush_campfire, plush_picnic)}
for name, build in PROPS.items():
    if ONLY and name not in ONLY:
        continue
    reset()
    build()
