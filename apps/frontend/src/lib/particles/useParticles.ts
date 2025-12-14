// React hooks for particle system integration with R3F
import { useEffect, useRef, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ParticleSystem,
  ParticleConfig,
  EmitterConfig,
  ParticlePresets,
  getParticleManager,
} from './ParticleSystem';

// Hook for a single particle system
export function useParticleSystem(config?: Partial<ParticleConfig>) {
  const systemRef = useRef<ParticleSystem | null>(null);
  const { scene } = useThree();

  useEffect(() => {
    const system = new ParticleSystem(config);
    systemRef.current = system;
    scene.add(system.getObject());

    return () => {
      scene.remove(system.getObject());
      system.dispose();
      systemRef.current = null;
    };
  }, [scene, config]);

  useFrame((_, delta) => {
    systemRef.current?.update(delta);
  });

  const addEmitter = useCallback((id: string, emitterConfig: EmitterConfig) => {
    systemRef.current?.addEmitter(id, emitterConfig);
  }, []);

  const removeEmitter = useCallback((id: string) => {
    systemRef.current?.removeEmitter(id);
  }, []);

  const stopEmitter = useCallback((id: string) => {
    systemRef.current?.stopEmitter(id);
  }, []);

  return {
    system: systemRef,
    addEmitter,
    removeEmitter,
    stopEmitter,
  };
}

// Hook for the global particle manager
export function useParticleManager() {
  const { scene } = useThree();
  const managerRef = useRef(getParticleManager());

  useEffect(() => {
    managerRef.current.setScene(scene);
  }, [scene]);

  useFrame((_, delta) => {
    managerRef.current.update(delta);
  });

  const spawnEffect = useCallback(
    (preset: keyof typeof ParticlePresets, position: THREE.Vector3) => {
      managerRef.current.spawnEffect(preset, position);
    },
    []
  );

  const createSystem = useCallback((id: string, config?: Partial<ParticleConfig>) => {
    return managerRef.current.createSystem(id, config);
  }, []);

  const getSystem = useCallback((id: string) => {
    return managerRef.current.getSystem(id);
  }, []);

  const removeSystem = useCallback((id: string) => {
    managerRef.current.removeSystem(id);
  }, []);

  return {
    spawnEffect,
    createSystem,
    getSystem,
    removeSystem,
  };
}

// Hook for spawning one-shot effects
export function useParticleEffect() {
  const { scene } = useThree();
  const systemRef = useRef<ParticleSystem | null>(null);
  const effectIdRef = useRef(0);

  useEffect(() => {
    const system = new ParticleSystem({ maxParticles: 500 });
    systemRef.current = system;
    scene.add(system.getObject());

    return () => {
      scene.remove(system.getObject());
      system.dispose();
    };
  }, [scene]);

  useFrame((_, delta) => {
    systemRef.current?.update(delta);
  });

  const spawn = useCallback(
    (preset: keyof typeof ParticlePresets, position: THREE.Vector3) => {
      if (!systemRef.current) return;

      const config = ParticlePresets[preset](position.clone());
      const id = `effect-${effectIdRef.current++}`;
      systemRef.current.addEmitter(id, config);
    },
    []
  );

  const spawnCustom = useCallback((config: EmitterConfig) => {
    if (!systemRef.current) return;

    const id = `custom-${effectIdRef.current++}`;
    systemRef.current.addEmitter(id, config);
  }, []);

  return {
    spawn,
    spawnCustom,
  };
}

// Hook for continuous emitters attached to an object
export function useAttachedEmitter(
  objectRef: React.RefObject<THREE.Object3D>,
  preset: keyof typeof ParticlePresets,
  active: boolean = true
) {
  const { scene } = useThree();
  const systemRef = useRef<ParticleSystem | null>(null);
  const emitterId = useRef(`attached-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const system = new ParticleSystem({ maxParticles: 200 });
    systemRef.current = system;
    scene.add(system.getObject());

    return () => {
      scene.remove(system.getObject());
      system.dispose();
    };
  }, [scene]);

  useFrame((_, delta) => {
    if (!systemRef.current || !objectRef.current) return;

    // Update emitter position to follow object
    const position = new THREE.Vector3();
    objectRef.current.getWorldPosition(position);

    if (active) {
      // Check if emitter exists, if not create it
      const config = ParticlePresets[preset](position);

      // Remove and re-add with updated position
      systemRef.current.removeEmitter(emitterId.current);
      systemRef.current.addEmitter(emitterId.current, config);
    } else {
      systemRef.current.stopEmitter(emitterId.current);
    }

    systemRef.current.update(delta);
  });

  return systemRef;
}
