import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import type { Group } from 'three';
import * as THREE from 'three';
import type { GLBModelConfig } from '../../data/petModels';
import { glbModels } from '../../data/petModels';

interface GLBPetProps {
  config: GLBModelConfig;
  isHovered: boolean;
  /** Multiplied into every material color — '#ffffff' keeps the original look. */
  tint?: string;
}

/**
 * Renders a professional skinned GLB model with animation blending.
 * Idle animation loops by default; hovering cross-fades to the hover
 * animation and back. The scene graph is cloned per instance so the
 * same GLB can appear in several canvases at once.
 */
export function GLBPet({ config, isHovered, tint }: GLBPetProps) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(config.url);

  // SkeletonUtils.clone keeps skinned meshes bound to their own bone copies
  const clonedScene = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions, mixer } = useAnimations(animations, group);

  useEffect(() => {
    const tintColor = tint ? new THREE.Color(tint) : null;
    clonedScene.traverse(obj => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        const mesh = obj as THREE.Mesh;
        // Clone materials before mutating: SkeletonUtils.clone shares
        // them across instances, and tinting one pet must not recolor
        // every other pet using the same GLB.
        let mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat && 'roughness' in mat) {
          mat = mat.clone();
          mat.roughness = Math.min(mat.roughness ?? 1, 0.9);
          if (tintColor) mat.color.copy(tintColor);
          mesh.material = mat;
        }
      }
    });
  }, [clonedScene, tint]);

  useEffect(() => {
    const idle = actions[config.idleAnimation];
    const hover = actions[config.hoverAnimation];
    const target = isHovered && hover ? hover : idle;
    const other = isHovered && hover ? idle : hover;

    if (!target) return;
    mixer.timeScale = config.timeScale ?? 1;
    target.reset().fadeIn(0.3).play();
    other?.fadeOut(0.3);

    return () => {
      target.fadeOut(0.3);
    };
  }, [actions, mixer, isHovered, config]);

  // Gentle whole-body bob on top of the skeletal animation
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.position.y = config.yOffset + (isHovered ? 0 : Math.sin(t * 1.2) * 0.015);
  });

  return (
    <group
      ref={group}
      position={[0, config.yOffset, 0]}
      rotation={[0, config.rotationY ?? 0, 0]}
      scale={config.scale}
    >
      <primitive object={clonedScene} />
    </group>
  );
}

// Preload every registered GLB so the first render doesn't hitch
Object.values(glbModels).forEach(m => useGLTF.preload(m.url));
