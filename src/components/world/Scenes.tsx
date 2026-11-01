import { Suspense } from 'react';
import { Birch, Butterflies, Drift, Fire, FlowerField, Glows, GrassTufts, Ground, Hill, Prop } from './sceneKit';
import { canvasTexture, GROUND, mottled, rng } from './sceneUtils';
import type { SceneId } from './sceneList';

/**
 * The six living-world scenes besides the snow field. Each is a 3D set
 * around the pet (at the origin, camera in front at z ≈ 5.6) plus its own
 * lights and fog; the sky behind lives in SceneBackdrop (DOM/CSS).
 */

// ————— 法式复古房间: warm lamplight, fireplace, herringbone floor —————
function Parlor() {
  const floor = canvasTexture('oak-planks', 512, 2, (c, sz) => {
    const r = rng(11);
    const rows = 8, h = sz / rows;
    for (let row = 0; row < rows; row++) {
      let x = -r() * sz * 0.5;
      while (x < sz) {
        const w = sz * (0.35 + r() * 0.4);
        const tone = 118 + r() * 34;
        c.fillStyle = `rgb(${tone + 46},${tone + 2},${tone - 38})`;
        c.fillRect(x, row * h, w - 2, h - 2);
        c.fillStyle = 'rgba(70,35,12,0.22)';
        for (let g = 0; g < 7; g++) c.fillRect(x, row * h + r() * h, w - 2, 1);
        x += w;
      }
    }
  });
  const rug = canvasTexture('rug', 512, 1, (c, s) => {
    c.fillStyle = '#8c2f3a'; c.fillRect(0, 0, s, s);
    const ring = (rad: number, col: string, wid: number) => { c.strokeStyle = col; c.lineWidth = wid; c.beginPath(); c.arc(s / 2, s / 2, rad, 0, 7); c.stroke(); };
    ring(s * 0.47, '#e9c88a', 10); ring(s * 0.42, '#2f4a5c', 18); ring(s * 0.3, '#e9c88a', 4); ring(s * 0.16, '#d97b5f', 26);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      c.fillStyle = '#f2dcae';
      c.beginPath(); c.ellipse(s / 2 + Math.cos(a) * s * 0.36, s / 2 + Math.sin(a) * s * 0.36, 16, 7, a, 0, 7); c.fill();
    }
  });
  const wall = '#c9b79a';
  return (
    <group>
      <Ground map={floor} radius={9} roughness={0.6} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND + 0.005, 0]} receiveShadow>
        <circleGeometry args={[1.6, 48]} />
        <meshStandardMaterial map={rug} roughness={1} />
      </mesh>
      {/* back wall with wainscoting and moulding */}
      <mesh position={[0, 1.6, -4.2]}>
        <planeGeometry args={[16, 5]} />
        <meshStandardMaterial color={wall} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0, -4.18]}>
        <planeGeometry args={[16, 1.3]} />
        <meshStandardMaterial color="#8e9e86" roughness={0.9} />
      </mesh>
      {[-5, -3, 3, 5].map(x => (
        <mesh key={x} position={[x, 0.02, -4.16]}>
          <boxGeometry args={[1.3, 0.8, 0.03]} />
          <meshStandardMaterial color="#9fae96" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0.66, -4.15]}>
        <boxGeometry args={[16, 0.06, 0.06]} />
        <meshStandardMaterial color="#e8d9b8" roughness={0.6} />
      </mesh>
      {/* side walls */}
      {[-1, 1].map(side => (
        <mesh key={side} position={[side * 6, 1.6, 0]} rotation={[0, -side * Math.PI / 2, 0]}>
          <planeGeometry args={[10, 5]} />
          <meshStandardMaterial color={wall} roughness={0.95} />
        </mesh>
      ))}
      {/* arched window glowing with late sun */}
      <group position={[-1.35, 1.55, -4.12]} scale={0.8}>
        <mesh>
          <planeGeometry args={[1.2, 1.8]} />
          <meshBasicMaterial color="#ffd8a0" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
          <circleGeometry args={[0.6, 24, 0, Math.PI]} />
          <meshBasicMaterial color="#ffe3b8" toneMapped={false} />
        </mesh>
        {[-0.3, 0.3].map(x => <mesh key={x} position={[x, 0.2, 0.01]}><boxGeometry args={[0.03, 2.3, 0.02]} /><meshStandardMaterial color="#f3ead6" /></mesh>)}
        {[-0.3, 0.3].map(y => <mesh key={y} position={[0, y, 0.01]}><boxGeometry args={[1.2, 0.03, 0.02]} /><meshStandardMaterial color="#f3ead6" /></mesh>)}
        {/* curtains */}
        {[-1, 1].map(side => (
          <mesh key={side} position={[side * 0.78, 0.1, 0.05]}>
            <boxGeometry args={[0.32, 2.5, 0.06]} />
            <meshStandardMaterial color="#b1475a" roughness={1} />
          </mesh>
        ))}
      </group>
      <spotLight position={[-1.35, 2.6, -3.4]} target-position={[0, GROUND, 0]} angle={0.7} penumbra={0.8} intensity={6} color="#ffc98a" castShadow />
      {/* marble fireplace (tools/blender/plush_props.py) with a live fire */}
      <Prop name="plush_fireplace" height={1.35} position={[0, -4.0]} />
      <Fire position={[0, GROUND + 0.06, -3.8]} scale={0.85} light={3.2} />
      {/* plush velvet armchair (tools/blender/plush_props.py) */}
      <Prop name="plush_armchair" height={1.15} position={[-1.6, -2.4]} rotation={0.6} />
      {/* floor lamp */}
      <Prop name="plush_lamp" height={2.2} position={[1.45, -3.9]} />
      <pointLight position={[1.45, GROUND + 1.95, -3.8]} color="#ffb766" intensity={4} distance={7} decay={1.5} castShadow />
      <Prop name="plush_sofa" height={0.95} position={[1.55, -2.6]} rotation={-0.75} />
      {/* gold-framed paintings */}
      {[[0.05, 2.35, 0.7, 0.5, '#7d6a4a'], [1.05, 2.65, 0.55, 0.42, '#5b6f7d']].map(([x, y, w, h, c]) => (
        <group key={x as number} position={[x as number, y as number, -4.12]}>
          <mesh><boxGeometry args={[(w as number) + 0.12, (h as number) + 0.12, 0.04]} /><meshStandardMaterial color="#c9a04a" metalness={0.7} roughness={0.35} /></mesh>
          <mesh position={[0, 0, 0.03]}><planeGeometry args={[w as number, h as number]} /><meshStandardMaterial color={c as string} /></mesh>
        </group>
      ))}
      <ambientLight intensity={0.35} color="#ffd9a8" />
      <fog attach="fog" args={['#4a3020', 9, 18]} />
    </group>
  );
}

// ————— 洛可可花园: pastel lawn, topiary, roses, fountain, gazebo —————
function RococoGarden() {
  const lawn = mottled('lawn-rococo', '#9cc98a', ['#b5dba0', '#86b877', '#c7e6b2'], 3, 8);
  const gravel = canvasTexture('gravel', 256, 6, (c, s) => {
    const r = rng(5); c.fillStyle = '#efe4d2'; c.fillRect(0, 0, s, s);
    for (let i = 0; i < 1600; i++) { c.fillStyle = r() > 0.5 ? '#d9cbb3' : '#fbf5ea'; c.fillRect(r() * s, r() * s, 2, 2); }
  });
  const rose = ['#f9a8c0', '#fbcfe0', '#f472a6', '#ffffff', '#fde2e4'];
  return (
    <group>
      <Ground map={lawn} />
      {/* gravel path to the fountain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND + 0.004, -2]}>
        <planeGeometry args={[1.1, 9]} />
        <meshStandardMaterial map={gravel} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND + 0.005, 0]}>
        <circleGeometry args={[1.5, 40]} />
        <meshStandardMaterial map={gravel} roughness={1} />
      </mesh>
      {/* tiered fountain and gazebo (tools/blender/plush_props.py) */}
      <Prop name="plush_fountain" height={1.5} position={[-1.2, -4.6]} />
      <group position={[-1.2, GROUND, -4.6]}>
        <Drift count={40} color="#d8f2ff" size={0.012} speed={1.2} area={1} sway={0.05} opacity={0.6} />
      </group>
      <Prop name="plush_gazebo" height={2.6} position={[1.5, -6.2]} rotation={0.3} />
      {/* topiary: clipped balls on stems, cone trees */}
      {[[-1.15, -1.3], [1.15, -1.3], [-1.6, -3.2], [1.6, -3.4]].map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, GROUND, z]}>
          <mesh position={[0, 0.18, 0]}><boxGeometry args={[0.4, 0.36, 0.4]} /><meshStandardMaterial color="#f4ede2" /></mesh>
          <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.03, 0.03, 0.3, 6]} /><meshStandardMaterial color="#6b4a33" /></mesh>
          <mesh position={[0, 0.85, 0]} castShadow><sphereGeometry args={[0.36, 20, 16]} /><meshStandardMaterial color="#5f9a58" roughness={0.95} /></mesh>
        </group>
      ))}
      {[[-2.3, -6.5, 2.2], [2.6, -8, 2.6], [-2.9, -9, 2.8], [0.3, -9.5, 2.4]].map(([x, z, h], i) => (
        <Prop key={i} name={i % 2 ? 'k-nature-tree_cone_dark' : 'k-nature-tree_cone'} height={h} position={[x, z]} />
      ))}
      <Prop name="k-nature-statue_obelisk" height={1.8} position={[0.2, -7.6]} />
      {[-1, 1].map(side => <Prop key={`pot${side}`} name="k-nature-pot_large" height={0.3} position={[side * 0.75, -0.9]} />)}
      {[[-1.9, -1.4], [1.9, -1.9], [-2.4, -3.8]].map(([x, z]) => <Prop key={`b${x}`} name="k-nature-plant_bushDetailed" height={0.45} position={[x, z]} rotation={x} />)}
      {/* garden columns and bushes */}
      {[-1, 1].map(side => <Prop key={side} name="k-nature-statue_column" height={1.5} position={[side * 0.95, -5.6]} />)}
      {[[-2.1, -2.3], [2.2, -2.6], [-2.6, -4.6], [2.7, -5]].map(([x, z]) => <Prop key={`${x}${z}`} name="bush_large" height={0.5} position={[x, z]} rotation={x} />)}
      {/* low hedges along the path */}
      {[-1, 1].map(side => (
        <mesh key={side} position={[side * 0.75, GROUND + 0.14, -2.6]}><boxGeometry args={[0.2, 0.28, 2.2]} /><meshStandardMaterial color="#5f9a58" roughness={0.95} /></mesh>
      ))}
      {/* rose beds */}
      <FlowerField count={260} colors={rose} area={[-3, -0.9, -6, 1.5]} seed={21} size={0.07} height={0.28} />
      <FlowerField count={260} colors={rose} area={[0.9, 3, -6, 1.5]} seed={22} size={0.07} height={0.28} />
      <Drift count={60} color="#fbcfe0" size={0.02} speed={0.25} sway={0.8} />
      <Butterflies count={5} colors={['#fbcfe0', '#ffffff', '#fde68a', '#c4b5fd']} />
      <directionalLight position={[4, 6, 3]} intensity={1.0} color="#fff1e0" castShadow />
      <fog attach="fog" args={['#f6dfe6', 9, 22]} />
    </group>
  );
}

// ————— 新疆草原森林: rolling green hills, spruce forest, snow peaks —————
function Meadow() {
  const grass = mottled('grass-meadow', '#6fa548', ['#86bd57', '#5d9240', '#9ccb6a', '#4f8638'], 9, 10);
  const r = rng(77);
  const spruces = Array.from({ length: 22 }, () => [(r() - 0.5) * 8, -5 - r() * 7, 0.9 + r() * 1.2] as const)
    .filter(([x, z]) => !(Math.abs(x) < 0.9 && z > -7));
  return (
    <group>
      <Ground map={grass} color="#ffffff" radius={22} />
      {/* rolling hills behind */}
      <Hill position={[-6, -1.4, -9]} scale={[6, 2.2, 3.5]} color="#79ad4f" map={grass} />
      <Hill position={[5, -1.6, -10]} scale={[7, 2.6, 4]} color="#6b9f48" map={grass} />
      <Hill position={[0, -2.2, -14]} scale={[10, 3.4, 4]} color="#5f9442" map={grass} />
      {/* Tianshan snow peaks far away */}
      {[[-7, -20, 3.4], [-1.5, -22, 4.2], [5, -21, 3.6], [10, -19, 2.8]].map(([x, z, s]) => (
        <group key={x} position={[x, -0.7, z]}>
          <mesh scale={[s, s * 1.3, s]}><coneGeometry args={[1.4, 2.4, 6]} /><meshStandardMaterial color="#7e93ad" roughness={1} flatShading /></mesh>
          <mesh position={[0, s * 1.05, 0]} scale={[s * 0.6, s * 0.6, s * 0.6]}><coneGeometry args={[1.0, 1.2, 6]} /><meshStandardMaterial color="#f5f8fc" roughness={0.9} flatShading /></mesh>
        </group>
      ))}
      {spruces.map(([x, z, s], i) => (
        <Prop key={i} name={['k-nature-tree_pineTallA_detailed', 'k-nature-tree_pineTallB_detailed', 'k-nature-tree_pineTallC_detailed', 'k-nature-tree_pineRoundA'][i % 4]} height={2.0 * s} position={[x, z]} rotation={i} />
      ))}
      {[[0.8, -1.0, 'k-nature-flower_purpleA'], [-0.9, -1.3, 'k-nature-flower_yellowA'], [1.5, -2.6, 'k-nature-flower_purpleB'],
        [-1.6, -0.4, 'k-nature-flower_redA'], [0.3, -2.4, 'k-nature-flower_yellowB'], [-0.4, 0.8, 'k-nature-flower_purpleA'],
        [1.2, 0.7, 'k-nature-flower_yellowA'], [-1.3, -3.4, 'k-nature-flower_redB']].map(([x, z, n], i) => (
        <Prop key={`f${i}`} name={n as string} height={0.28} position={[x as number, z as number]} rotation={i} />
      ))}
      {[[1.8, -1.0], [-1.9, -2.0], [0.6, -3.6], [-0.4, -5.2]].map(([x, z]) => <Prop key={`g${x}`} name="k-nature-grass_large" height={0.25} position={[x, z]} rotation={x * 3} />)}
      <Prop name="k-nature-mushroom_redGroup" height={0.22} position={[-1.1, 0.2]} />
      <Prop name="k-nature-rock_tallA" height={0.9} position={[2.3, -5.5]} rotation={1} />
      <Prop name="k-nature-log_large" height={0.3} position={[1.9, -3.2]} rotation={0.8} />
      {/* a Kazakh yurt and a few sheep (tools/blender/plush_props.py) */}
      <Prop name="plush_yurt" height={1.6} position={[1.5, -5.4]} rotation={-0.5} />
      {[[-1.4, -2.2, 0.55, 0.9], [1.15, -1.6, 0.5, -0.7], [-0.6, -4.3, 0.48, 0.3], [0.4, -6.2, 0.45, -1.2]].map(([x, z, h, ry], i) => (
        <Prop key={`sheep${i}`} name="plush_sheep" height={h} position={[x, z]} rotation={ry} />
      ))}
      <Prop name="stag" height={1.4} position={[-1.9, -6.5]} rotation={0.7} />
      <Prop name="rock_large" height={0.35} position={[1.3, -1.6]} rotation={0.5} />
      <Prop name="rock_small" height={0.22} position={[-1.2, -0.9]} />
      <Prop name="stump" height={0.25} position={[-1.6, -2.4]} />
      {[[0.9, -0.6], [-0.8, 0.6], [1.6, 0.4]].map(([x, z]) => <Prop key={`${x}${z}`} name="mushroom_red" height={0.18} position={[x, z]} />)}
      {/* wildflowers: yellow buttercups, purple asters, white daisies */}
      <FlowerField count={420} colors={['#facc15', '#a78bfa', '#ffffff', '#f472b6', '#fde047']} area={[-7, 7, -7, 2.5]} seed={31} size={0.035} height={0.1} />
      <GrassTufts count={500} color="#5a9140" area={[-7, 7, -6, 2.5]} seed={32} />
      {/* a stream catching the sky */}
      <mesh rotation={[-Math.PI / 2, 0, 0.35]} position={[-1.3, GROUND + 0.003, -3.2]}>
        <planeGeometry args={[0.7, 9]} />
        <meshStandardMaterial color="#9ed0ec" roughness={0.08} metalness={0.4} />
      </mesh>
      <Butterflies count={4} colors={['#fde047', '#ffffff', '#fdba74']} />
      <directionalLight position={[5, 8, 4]} intensity={1.3} color="#fff6e0" castShadow />
      <fog attach="fog" args={['#cfe3ef', 12, 30]} />
    </group>
  );
}

// ————— 北海道粉雪: powder snow, birches, a red-roofed cabin at dusk —————
function Hokkaido() {
  const snow = mottled('snow-hokkaido', '#f2f5fb', ['#ffffff', '#dfe7f4', '#e9eef8'], 4, 6);
  const r = rng(91);
  return (
    <group>
      <Ground map={snow} />
      {[[-3, -2.2, 0.6], [3.2, -2.6, 0.7], [-1.2, -4, 0.8], [5, -4.5, 1]].map(([x, z, s], i) => (
        <Hill key={i} position={[x, GROUND - 0.1, z]} scale={[s * 1.8, s * 0.45, s * 1.2]} color="#f5f8fd" map={snow} />
      ))}
      {Array.from({ length: 20 }, (_, i) => {
        const z = -2 - r() * 7, x = (r() < 0.5 ? -1 : 1) * (0.9 + r() * (0.5 + (5.6 - z) * 0.12));
        return <Birch key={i} position={[x, GROUND, z]} scale={1 + r() * 0.6} />;
      })}
      {Array.from({ length: 12 }, (_, i) => (
        <Prop key={`s${i}`} name={['k-holiday-tree-snow-a', 'k-holiday-tree-snow-b', 'k-holiday-tree-snow-c'][i % 3]} height={1.6 + r() * 1.6} position={[(r() - 0.5) * 7, -6.5 - r() * 5]} rotation={i} />
      ))}
      <Prop name="plush_snowman" height={1.05} position={[1.35, -1.9]} rotation={-0.4} />
      <Prop name="k-holiday-sled" height={0.3} position={[-1.15, -0.9]} rotation={0.9} />
      <Prop name="k-holiday-lantern" height={1.6} position={[1.75, -3.6]} />
      <pointLight position={[1.75, GROUND + 1.5, -3.5]} color="#ffbf6b" intensity={1.6} distance={4} />
      <Prop name="k-holiday-reindeer" height={0.8} position={[-1.7, -5.0]} rotation={0.8} />
      <Prop name="k-holiday-snow-pile" height={0.25} position={[0.6, -3.2]} />
      {/* log cabin with a snowy roof (tools/blender/plush_props.py) */}
      <Prop name="plush_cabin" height={2.2} position={[-1.4, -6]} rotation={0.35} />
      <pointLight position={[-1.0, GROUND + 0.7, -4.9]} color="#ffb35c" intensity={2.4} distance={5} />
      <Prop name="fox" height={0.5} position={[-0.6, -3.6]} rotation={0.6} />
      <Prop name="log" height={0.28} position={[-1.2, -1.6]} rotation={0.4} />
      {/* soft, slow, big flakes: powder snow */}
      <Drift count={300} color="#ffffff" size={0.022} speed={0.35} sway={0.5} />
      <directionalLight position={[-4, 4, -3]} intensity={0.7} color="#ffd1c4" />
      <directionalLight position={[3, 6, 5]} intensity={0.6} color="#dfe8ff" castShadow />
      <fog attach="fog" args={['#c9d3ea', 7, 20]} />
    </group>
  );
}

// ————— 蝴蝶公园: lawn, flowerbeds, trees, a bench, butterflies —————
function ButterflyPark() {
  const lawn = mottled('lawn-park', '#7fbf58', ['#93cf6a', '#6aa848', '#a8dc80'], 13, 9);
  const path = mottled('path-park', '#e3d3b4', ['#d2bf9c', '#f0e4cc'], 14, 4);
  const beds: [number, number, string[]][] = [
    [-1.3, -1.0, ['#f43f5e', '#fb7185', '#fda4af']],
    [1.35, -1.2, ['#facc15', '#fde047', '#fb923c']],
    [-0.9, -4.4, ['#a78bfa', '#c4b5fd', '#818cf8']],
    [1.4, -4.0, ['#f472b6', '#ffffff', '#f9a8d4']],
  ];
  return (
    <group>
      <Ground map={lawn} />
      <mesh rotation={[-Math.PI / 2, 0, 0.5]} position={[0.4, GROUND + 0.004, -2.5]}>
        <planeGeometry args={[1.1, 12]} />
        <meshStandardMaterial map={path} roughness={1} />
      </mesh>
      {beds.map(([x, z, colors], i) => (
        <group key={i}>
          <mesh position={[x, GROUND + 0.06, z]}><cylinderGeometry args={[0.6, 0.64, 0.12, 28]} /><meshStandardMaterial color="#6b4a33" roughness={1} /></mesh>
          <FlowerField count={90} colors={colors} area={[x - 0.5, x + 0.5, z - 0.5, z + 0.5]} seed={50 + i} avoid={0} size={0.06} height={0.3} />
        </group>
      ))}
      {([[-2.1, -5.5, 2.4, 'k-nature-tree_oak'], [2.3, -6.5, 2.8, 'k-nature-tree_detailed'], [-0.6, -10, 3.4, 'k-nature-tree_fat_fall'], [3.4, -10.5, 3, 'k-nature-tree_default'], [-3.4, -9.5, 3.2, 'k-nature-tree_default_fall']] as const).map(([x, z, h, name], i) => (
        <Prop key={i} name={name} height={h} position={[x, z]} rotation={i * 1.3} />
      ))}
      {[-1.5, -0.5, 0.5, 1.5].map(x => <Prop key={x} name="fence" height={0.3} position={[x, -7.2]} />)}
      {[[1.9, -2.4], [-1.9, -1.2]].map(([x, z]) => <Prop key={`${x}`} name="k-nature-plant_bushLarge" height={0.5} position={[x, z]} />)}
      <Prop name="k-nature-path_stoneCircle" height={0.04} position={[0, 0]} />
      <Prop name="k-holiday-lantern" height={1.7} position={[2.2, -5.2]} />
      <Prop name="plush_flowercart" height={0.9} position={[1.5, -3.4]} rotation={-0.5} />
      <Prop name="plush_bench" height={0.75} position={[-1.45, -2.8]} rotation={0.5} />
      <GrassTufts count={400} color="#6aa848" area={[-7, 7, -7, 2.5]} seed={60} />
      <FlowerField count={160} colors={['#ffffff', '#fde047']} area={[-7, 7, -7, 2.5]} seed={61} size={0.025} height={0.06} />
      <Butterflies count={12} />
      <Drift count={40} color="#fff7c2" size={0.01} speed={0.1} sway={0.6} opacity={0.7} />
      <directionalLight position={[5, 8, 4]} intensity={1.2} color="#fff4dc" castShadow />
      <fog attach="fog" args={['#d6ecf7', 12, 28]} />
    </group>
  );
}

// ————— 露营地: dusk, bell tent, string lights, campfire, lantern —————
function Campsite() {
  const ground = mottled('camp-ground', '#5d6b45', ['#4a5838', '#6f7d50', '#7a6a4a'], 17, 8);
  const r = rng(5150);
  const bulbs: [number, number, number][] = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    bulbs.push([-1.9 + t * 3.8, 1.75 - Math.sin(t * Math.PI) * 0.3, -3.4 - t * 0.4]);
  }
  return (
    <group>
      <Ground map={ground} />
      {/* canvas bell tent, campfire and picnic blanket (tools/blender/plush_props.py) */}
      <Prop name="plush_belltent" height={2.0} position={[1.15, -4.6]} rotation={-0.6} />
      <pointLight position={[0.6, GROUND + 0.6, -3.6]} color="#ffae55" intensity={2.2} distance={4} />
      {/* string lights between two poles */}
      {[[-1.9, -3.4], [1.9, -3.8]].map(([x, z]) => <mesh key={x} position={[x, GROUND + 1.25, z]}><cylinderGeometry args={[0.025, 0.03, 2.5, 6]} /><meshStandardMaterial color="#5b4636" /></mesh>)}
      <Glows points={bulbs} color="#ffd98a" size={0.035} />
      {/* campfire ring */}
      <group position={[-0.95, GROUND, -1.6]}>
        <Prop name="plush_campfire" height={0.22} position={[0, 0]} y={0} />
        <Fire position={[0, 0.06, 0]} scale={0.9} light={3.5} />
        <Drift count={30} color="#ffb04a" size={0.008} speed={-0.5} area={0.6} sway={0.15} />
      </group>
      <Prop name="log" height={0.3} position={[-1.7, -1.0]} rotation={1.2} />
      <Prop name="stump" height={0.28} position={[-0.2, -0.7]} />
      <Prop name="fox" height={0.5} position={[1.6, -2.0]} rotation={-1.2} />
      <Prop name="k-survival-tent-canvas" height={0.9} position={[-1.8, -4.6]} rotation={0.5} />
      <Prop name="plush_picnic" height={0.3} position={[0.95, -0.6]} rotation={-0.35} />
      <Prop name="k-survival-barrel" height={0.45} position={[1.9, -3.0]} />
      <Prop name="k-survival-signpost" height={0.9} position={[-2.1, -2.2]} rotation={0.7} />
      <Prop name="k-nature-log_stack" height={0.35} position={[0.5, -3.4]} rotation={0.2} />
      <Prop name="k-nature-canoe" height={0.25} position={[1.9, -0.7]} rotation={1.1} />
      <Prop name="k-holiday-lantern-hanging" height={0.7} position={[0.55, -4.0]} />
      {/* folding chairs and a lantern */}
      {[[-1.45, -2.7, 0.9], [-0.1, -3.0, -0.3]].map(([x, z, ry]) => (
        <group key={x} position={[x, GROUND, z]} rotation={[0, ry, 0]}>
          <mesh position={[0, 0.32, 0]}><boxGeometry args={[0.5, 0.04, 0.45]} /><meshStandardMaterial color="#c2683f" roughness={1} /></mesh>
          <mesh position={[0, 0.55, -0.22]} rotation={[-0.2, 0, 0]}><boxGeometry args={[0.5, 0.45, 0.03]} /><meshStandardMaterial color="#c2683f" roughness={1} /></mesh>
          {[[-0.22, 0.2], [0.22, 0.2], [-0.22, -0.2], [0.22, -0.2]].map(([a, b]) => <mesh key={`${a}${b}`} position={[a, 0.16, b]}><cylinderGeometry args={[0.012, 0.012, 0.32, 5]} /><meshStandardMaterial color="#2c2c2c" metalness={0.6} /></mesh>)}
        </group>
      ))}
      <group position={[0.85, GROUND, -1.3]}>
        <mesh position={[0, 0.14, 0]}><cylinderGeometry args={[0.07, 0.08, 0.22, 12]} /><meshBasicMaterial color="#ffd27a" toneMapped={false} /></mesh>
        <mesh position={[0, 0.28, 0]}><cylinderGeometry args={[0.05, 0.08, 0.06, 12]} /><meshStandardMaterial color="#2c2c2c" metalness={0.6} /></mesh>
        <pointLight position={[0, 0.2, 0]} color="#ffc36b" intensity={1.2} distance={3} />
      </group>
      {/* pines around, fireflies */}
      {Array.from({ length: 16 }, (_, i) => {
        const x = (r() - 0.5) * 8, z = -6 - r() * 6;
        return <Prop key={i} name={['k-nature-tree_pineTallA_detailed', 'k-nature-tree_pineTallC_detailed', 'k-survival-tree-tall'][i % 3]} height={2.4 + r() * 1.8} position={[x, z]} rotation={i} />;
      })}
      <Glows points={Array.from({ length: 24 }, () => [(r() - 0.5) * 8, GROUND + 0.3 + r() * 1.4, -1 - r() * 5] as [number, number, number])} color="#d9ff8a" size={0.015} />
      <ambientLight intensity={0.25} color="#8fa0d8" />
      <directionalLight position={[-3, 5, -6]} intensity={0.35} color="#9fb3ff" />
      <fog attach="fog" args={['#1c2140', 7, 20]} />
    </group>
  );
}

export function SceneSet({ id }: { id: Exclude<SceneId, 'snow'> }) {
  return <Suspense fallback={null}><SceneBody id={id} /></Suspense>;
}

function SceneBody({ id }: { id: Exclude<SceneId, 'snow'> }) {
  switch (id) {
    case 'parlor': return <Parlor />;
    case 'rococo': return <RococoGarden />;
    case 'meadow': return <Meadow />;
    case 'hokkaido': return <Hokkaido />;
    case 'park': return <ButterflyPark />;
    case 'camp': return <Campsite />;
  }
}
