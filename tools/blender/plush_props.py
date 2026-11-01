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
    return finish(o, m, bevel, 3, subdiv)


def sphere(name, r, loc, m, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=24, ring_count=14)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    return finish(o, m, 0, subdiv=0)


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


PROPS = {'plush_sofa': plush_sofa, 'plush_fireplace': plush_fireplace, 'plush_lamp': plush_lamp}
for name, build in PROPS.items():
    if ONLY and name not in ONLY:
        continue
    reset()
    build()
