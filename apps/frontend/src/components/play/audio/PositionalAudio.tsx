/**
 * Positional Audio Component
 * 3D spatial audio that follows position in the scene
 */

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PositionalAudio as DreiPositionalAudio } from '@react-three/drei';
import * as THREE from 'three';
import { useSoundStore, type SoundCategory } from './useSoundStore';

interface PositionalAudioProps {
  url: string;
  position: [number, number, number];
  category?: SoundCategory;
  volume?: number;
  refDistance?: number;
  rolloffFactor?: number;
  maxDistance?: number;
  loop?: boolean;
  autoplay?: boolean;
}

// Component using drei's PositionalAudio (easier integration)
export function PositionalAudioSource({
  url,
  position,
  category = 'ambient',
  volume = 1,
  refDistance = 1,
  loop = true,
  autoplay = true,
}: PositionalAudioProps) {
  const audioRef = useRef<THREE.PositionalAudio>(null);
  // Use individual selectors to prevent re-renders on unrelated store changes
  const getEffectiveVolume = useSoundStore((s) => s.getEffectiveVolume);
  const isInitialized = useSoundStore((s) => s.isInitialized);
  const initialize = useSoundStore((s) => s.initialize);

  // Update volume when settings change
  useEffect(() => {
    if (!audioRef.current) return;

    const effectiveVolume = getEffectiveVolume(category);
    audioRef.current.setVolume(effectiveVolume * volume);
  }, [getEffectiveVolume, category, volume]);

  // Initialize audio context
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  return (
    <group position={position}>
      <DreiPositionalAudio
        ref={audioRef}
        url={url}
        distance={refDistance}
        loop={loop}
        autoplay={autoplay}
      />
    </group>
  );
}

// Manual positional audio with Web Audio API (more control)
interface AudioEmitterProps {
  url: string;
  position: { x: number; y: number; z: number };
  category?: SoundCategory;
  volume?: number;
  refDistance?: number;
  rolloffFactor?: number;
  maxDistance?: number;
  loop?: boolean;
  coneInnerAngle?: number;
  coneOuterAngle?: number;
  coneOuterGain?: number;
}

export function AudioEmitter({
  url,
  position,
  category = 'ambient',
  volume = 1,
  refDistance = 1,
  rolloffFactor = 1,
  maxDistance = 100,
  loop = true,
  coneInnerAngle = 360,
  coneOuterAngle = 360,
  coneOuterGain = 0,
}: AudioEmitterProps) {
  const { camera } = useThree();
  // Use individual selectors to prevent re-renders on unrelated store changes
  const getEffectiveVolume = useSoundStore((s) => s.getEffectiveVolume);
  const audioContext = useSoundStore((s) => s.audioContext);
  const isInitialized = useSoundStore((s) => s.isInitialized);
  const initialize = useSoundStore((s) => s.initialize);

  // Pre-allocated vectors for useFrame (avoid GC pressure)
  const frameVectors = useRef({
    forward: new THREE.Vector3(),
    up: new THREE.Vector3(),
    temp1: new THREE.Vector3(),
    temp2: new THREE.Vector3(),
  });

  const audioRef = useRef<{
    source: AudioBufferSourceNode | null;
    panner: PannerNode | null;
    gain: GainNode | null;
    buffer: AudioBuffer | null;
    isPlaying: boolean;
  }>({
    source: null,
    panner: null,
    gain: null,
    buffer: null,
    isPlaying: false,
  });

  // Load audio buffer
  useEffect(() => {
    if (!audioContext) return;

    fetch(url)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
      .then((buffer) => {
        audioRef.current.buffer = buffer;
        // Auto-play if we have a buffer
        playAudio();
      })
      .catch((error) => {
        console.warn('Failed to load audio:', url, error);
      });

    return () => {
      stopAudio();
    };
  }, [audioContext, url]);

  // Play audio
  const playAudio = () => {
    if (!audioContext || !audioRef.current.buffer || audioRef.current.isPlaying) return;

    // Create nodes
    const source = audioContext.createBufferSource();
    const panner = audioContext.createPanner();
    const gain = audioContext.createGain();

    // Configure source
    source.buffer = audioRef.current.buffer;
    source.loop = loop;

    // Configure panner (3D position)
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = refDistance;
    panner.rolloffFactor = rolloffFactor;
    panner.maxDistance = maxDistance;
    panner.coneInnerAngle = coneInnerAngle;
    panner.coneOuterAngle = coneOuterAngle;
    panner.coneOuterGain = coneOuterGain;
    panner.setPosition(position.x, position.y, position.z);

    // Configure gain
    const effectiveVolume = getEffectiveVolume(category);
    gain.gain.value = effectiveVolume * volume;

    // Connect nodes
    source.connect(panner);
    panner.connect(gain);
    gain.connect(audioContext.destination);

    // Start playback
    source.start(0);

    // Store references
    audioRef.current.source = source;
    audioRef.current.panner = panner;
    audioRef.current.gain = gain;
    audioRef.current.isPlaying = true;

    // Handle non-looping audio end
    if (!loop) {
      source.onended = () => {
        audioRef.current.isPlaying = false;
      };
    }
  };

  // Stop audio
  const stopAudio = () => {
    if (audioRef.current.source) {
      try {
        audioRef.current.source.stop();
      } catch {
        // Already stopped
      }
      audioRef.current.source.disconnect();
      audioRef.current.source = null;
    }
    if (audioRef.current.panner) {
      audioRef.current.panner.disconnect();
      audioRef.current.panner = null;
    }
    if (audioRef.current.gain) {
      audioRef.current.gain.disconnect();
      audioRef.current.gain = null;
    }
    audioRef.current.isPlaying = false;
  };

  // Update position every frame
  useFrame(() => {
    if (!audioRef.current.panner) return;

    audioRef.current.panner.setPosition(position.x, position.y, position.z);

    // Update gain based on current volume settings
    if (audioRef.current.gain) {
      const effectiveVolume = getEffectiveVolume(category);
      audioRef.current.gain.gain.value = effectiveVolume * volume;
    }
  });

  // Update listener position (camera)
  useFrame(() => {
    if (!audioContext) return;

    const listener = audioContext.listener;

    // Set listener position to camera position
    if (listener.positionX) {
      listener.positionX.value = camera.position.x;
      listener.positionY.value = camera.position.y;
      listener.positionZ.value = camera.position.z;
    } else {
      listener.setPosition(camera.position.x, camera.position.y, camera.position.z);
    }

    // Set listener orientation based on camera direction
    // Reuse pre-allocated vectors to avoid GC pressure
    const { forward, up, temp1, temp2 } = frameVectors.current;
    camera.getWorldDirection(forward);
    camera.matrixWorld.extractBasis(temp1, up, temp2);

    if (listener.forwardX) {
      listener.forwardX.value = forward.x;
      listener.forwardY.value = forward.y;
      listener.forwardZ.value = forward.z;
      listener.upX.value = up.x;
      listener.upY.value = up.y;
      listener.upZ.value = up.z;
    } else {
      listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }
  });

  // Initialize audio on mount
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Visual indicator in dev mode
  if (process.env.NODE_ENV === 'development') {
    return (
      <mesh position={[position.x, position.y, position.z]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color="#22c55e" wireframe />
      </mesh>
    );
  }

  return null;
}

export default PositionalAudioSource;
