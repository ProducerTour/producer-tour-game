import { useRef, useState, Suspense, useMemo, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  Html,
  Float,
  Sparkles,
  useGLTF,
  useFBX,
  useTexture,
  Grid,
  ContactShadows,
  Stars,
  useAnimations,
} from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { useControls, folder } from 'leva';

// Assets URL (Cloudflare R2 CDN)
const ASSETS_URL = import.meta.env.VITE_ASSETS_URL || '';

// Animation file paths - place converted Mixamo GLB files in public/animations/
const ANIMATIONS = {
  idle: '/animations/idle.glb',
  walking: '/animations/walking.glb',
  running: '/animations/running.glb',
} as const;

// Flag to use Mixamo animations vs procedural (set to true once you have the GLB files)
const USE_MIXAMO_ANIMATIONS = false;
import { Gamepad2, Music, Briefcase, Users, Mic2 } from 'lucide-react';
import { useKeyboardControls } from './hooks/useKeyboardControls';

// Debug mode - toggle with backtick (`) key
let DEBUG_MODE = false;

// Movement constants - realistic speeds (1 unit = ~1 meter)
// Average human walk: ~1.4 m/s, jog: ~2.5 m/s, run: ~4-5 m/s
const WALK_SPEED = 2.5;
const SPRINT_SPEED = 5;
const ROTATION_SPEED = 8;

// Ready Player Me uses Mixamo bone naming convention
// See: https://docs.readyplayer.me/ready-player-me/api-reference/avatars/full-body-avatars
const BONE_NAMES = {
  hips: 'Hips',
  spine: 'Spine',
  spine1: 'Spine1',
  spine2: 'Spine2',
  neck: 'Neck',
  head: 'Head',
  leftShoulder: 'LeftShoulder',
  leftArm: 'LeftArm',
  leftForeArm: 'LeftForeArm',
  leftHand: 'LeftHand',
  rightShoulder: 'RightShoulder',
  rightArm: 'RightArm',
  rightForeArm: 'RightForeArm',
  rightHand: 'RightHand',
  leftUpLeg: 'LeftUpLeg',
  leftLeg: 'LeftLeg',
  leftFoot: 'LeftFoot',
  leftToeBase: 'LeftToeBase',
  rightUpLeg: 'RightUpLeg',
  rightLeg: 'RightLeg',
  rightFoot: 'RightFoot',
  rightToeBase: 'RightToeBase',
} as const;

// Store original bone quaternions for reference
const originalArmQuaternions = {
  leftArm: new THREE.Quaternion(),
  rightArm: new THREE.Quaternion(),
  leftForeArm: new THREE.Quaternion(),
  rightForeArm: new THREE.Quaternion(),
};

// Store foot quaternions for flat feet positioning
const originalFootQuaternions = {
  leftFoot: new THREE.Quaternion(),
  rightFoot: new THREE.Quaternion(),
};

// Arm rotation settings - X axis at 1.31 rad (75°) for natural arm position
const ARM_ROTATION = {
  axis: 'x' as const,
  angle: 1.31, // radians (75 degrees)
};

// Foot rotation settings - X axis at 0.86 rad (49°) for flat feet
const FOOT_ROTATION = {
  axis: 'x' as const,
  angle: 0.86, // radians (49 degrees)
};

// Debug state for real-time adjustments
const debugState = {
  armDownAngle: ARM_ROTATION.angle,
  showSkeleton: true,
};

// Debug Panel Component - Draggable
function DebugPanel({
  boneMap,
  onBoneAngleChange
}: {
  boneMap: Map<string, THREE.Bone>;
  onBoneAngleChange: (bone: 'arms' | 'feet', angle: number, axis: 'x' | 'y' | 'z') => void;
}) {
  const [selectedBone, setSelectedBone] = useState<'arms' | 'feet'>('feet');
  const [angle, setAngle] = useState(0);
  const [rotAxis, setRotAxis] = useState<'x' | 'y' | 'z'>('x');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const leftFoot = boneMap.get(BONE_NAMES.leftFoot);
  const leftArm = boneMap.get(BONE_NAMES.leftArm);

  // Handle drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'BUTTON') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  // Get current rotation info for selected bone
  const activeBone = selectedBone === 'arms' ? leftArm : leftFoot;
  const boneRot = activeBone ? {
    euler: activeBone.rotation.toArray().map(v => typeof v === 'number' ? v.toFixed(2) : v),
    quat: activeBone.quaternion.toArray().map(v => v.toFixed(3)),
    worldPos: activeBone.getWorldPosition(new THREE.Vector3()).toArray().map(v => v.toFixed(2)),
  } : null;

  const handleAngleChange = (newAngle: number) => {
    setAngle(newAngle);
    onBoneAngleChange(selectedBone, newAngle, rotAxis);
  };

  const handleAxisChange = (axis: 'x' | 'y' | 'z') => {
    setRotAxis(axis);
    onBoneAngleChange(selectedBone, angle, axis);
  };

  const handleBoneSelect = (bone: 'arms' | 'feet') => {
    setSelectedBone(bone);
    setAngle(0); // Reset angle when switching bones
  };

  return (
    <div
      ref={panelRef}
      onMouseDown={handleMouseDown}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      className="bg-black/90 text-white p-4 rounded-lg text-xs font-mono w-80 max-h-[500px] overflow-y-auto select-none shadow-xl border border-violet-500/30">
      <h3 className="text-violet-400 font-bold mb-3 text-sm">🦴 Bone Debug Panel</h3>

      {/* Bone Selection */}
      <div className="mb-3">
        <label className="block text-gray-400 mb-1">Select Bone:</label>
        <div className="flex gap-2">
          {(['arms', 'feet'] as const).map(bone => (
            <button
              key={bone}
              onClick={() => handleBoneSelect(bone)}
              className={`px-3 py-1 rounded capitalize ${selectedBone === bone ? 'bg-fuchsia-600' : 'bg-gray-700'}`}
            >
              {bone}
            </button>
          ))}
        </div>
      </div>

      {/* Rotation Axis Selection */}
      <div className="mb-3">
        <label className="block text-gray-400 mb-1">Rotation Axis:</label>
        <div className="flex gap-2">
          {(['x', 'y', 'z'] as const).map(axis => (
            <button
              key={axis}
              onClick={() => handleAxisChange(axis)}
              className={`px-3 py-1 rounded ${rotAxis === axis ? 'bg-violet-600' : 'bg-gray-700'}`}
            >
              {axis.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Angle Slider */}
      <div className="mb-3">
        <label className="block text-gray-400 mb-1">
          {selectedBone === 'arms' ? 'Arm' : 'Foot'} Rotation ({rotAxis.toUpperCase()}): {angle.toFixed(2)} rad ({(angle * 180 / Math.PI).toFixed(0)}°)
        </label>
        <input
          type="range"
          min="-3.14"
          max="3.14"
          step="0.05"
          value={angle}
          onChange={(e) => handleAngleChange(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-gray-500 text-[10px]">
          <span>-180°</span>
          <span>0°</span>
          <span>180°</span>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="mb-3">
        <label className="block text-gray-400 mb-1">Quick Presets:</label>
        <div className="flex gap-1 flex-wrap">
          {[0, 0.5, 1.0, 1.2, 1.57, 2.0].map(angle => (
            <button
              key={angle}
              onClick={() => handleAngleChange(angle)}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[10px]"
            >
              {angle}
            </button>
          ))}
        </div>
      </div>

      {/* Copy Settings Button */}
      <div className="mb-3">
        <button
          onClick={() => {
            const text = `${selectedBone === 'arms' ? 'Arm' : 'Foot'} Settings: axis=${rotAxis}, angle=${angle.toFixed(2)} rad (${Math.round(angle * 180 / Math.PI)}°)`;
            navigator.clipboard.writeText(text);
            alert('Copied to clipboard!');
          }}
          className="w-full px-3 py-2 bg-violet-600 hover:bg-violet-500 rounded font-bold text-sm"
        >
          📋 Copy Settings
        </button>
      </div>

      {/* Current Rotation Info */}
      {boneRot && (
        <div className="border-t border-gray-700 pt-2">
          <p className="text-gray-400">{selectedBone === 'arms' ? 'LeftArm' : 'LeftFoot'} Euler (XYZ):</p>
          <p className="text-green-400 text-[11px]">[{boneRot.euler.slice(0, 3).join(', ')}]</p>
          <p className="text-gray-400 mt-1">{selectedBone === 'arms' ? 'LeftArm' : 'LeftFoot'} Quaternion (XYZW):</p>
          <p className="text-cyan-400 text-[11px]">[{boneRot.quat.join(', ')}]</p>
          <p className="text-gray-400 mt-1">World Position:</p>
          <p className="text-yellow-400 text-[11px]">[{boneRot.worldPos.join(', ')}]</p>
        </div>
      )}

      {/* Bone List */}
      <div className="border-t border-gray-700 pt-2 mt-2">
        <p className="text-gray-400">Bones found: {boneMap.size}</p>
        <details className="mt-1">
          <summary className="text-gray-500 cursor-pointer text-[10px]">Show all bones</summary>
          <p className="text-gray-600 text-[9px] mt-1 max-h-20 overflow-y-auto">
            {Array.from(boneMap.keys()).join(', ')}
          </p>
        </details>
      </div>
    </div>
  );
}

// Helper function to set idle pose with arms at sides and feet flat
function setIdlePose(boneMap: Map<string, THREE.Bone>) {
  const leftArm = boneMap.get(BONE_NAMES.leftArm);
  const rightArm = boneMap.get(BONE_NAMES.rightArm);
  const leftForeArm = boneMap.get(BONE_NAMES.leftForeArm);
  const rightForeArm = boneMap.get(BONE_NAMES.rightForeArm);
  const leftFoot = boneMap.get(BONE_NAMES.leftFoot);
  const rightFoot = boneMap.get(BONE_NAMES.rightFoot);

  // Arms: X axis rotation at 1.31 rad (75°) for natural position
  const armAngle = ARM_ROTATION.angle;
  const xAxis = new THREE.Vector3(1, 0, 0);

  if (leftArm) {
    leftArm.quaternion.identity();
    const rotQ = new THREE.Quaternion().setFromAxisAngle(xAxis, armAngle);
    leftArm.quaternion.multiply(rotQ);
    originalArmQuaternions.leftArm.copy(leftArm.quaternion);
  }
  if (rightArm) {
    rightArm.quaternion.identity();
    const rotQ = new THREE.Quaternion().setFromAxisAngle(xAxis, armAngle);
    rightArm.quaternion.multiply(rotQ);
    originalArmQuaternions.rightArm.copy(rightArm.quaternion);
  }

  // Keep forearms in their position relative to upper arms
  if (leftForeArm) originalArmQuaternions.leftForeArm.copy(leftForeArm.quaternion);
  if (rightForeArm) originalArmQuaternions.rightForeArm.copy(rightForeArm.quaternion);

  // Feet: X axis rotation at 0.86 rad (49°) for flat positioning
  const footAngle = FOOT_ROTATION.angle;

  if (leftFoot) {
    leftFoot.quaternion.identity();
    const rotQ = new THREE.Quaternion().setFromAxisAngle(xAxis, footAngle);
    leftFoot.quaternion.multiply(rotQ);
    originalFootQuaternions.leftFoot.copy(leftFoot.quaternion);
  }
  if (rightFoot) {
    rightFoot.quaternion.identity();
    const rotQ = new THREE.Quaternion().setFromAxisAngle(xAxis, footAngle);
    rightFoot.quaternion.multiply(rotQ);
    originalFootQuaternions.rightFoot.copy(rightFoot.quaternion);
  }
}

// Animated Ready Player Me Avatar with procedural bone animation
// Ready Player Me uses Mixamo-compatible skeleton in T-pose
// Uses quaternions for reliable bone manipulation
function AnimatedAvatar({
  url,
  isMoving = false,
  isRunning = false,
}: {
  url: string;
  isMoving?: boolean;
  isRunning?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);
  const skeletonHelperRef = useRef<THREE.SkeletonHelper | null>(null);
  const { scene: threeScene } = useThree();

  // Store references to bones
  const bones = useRef<Map<string, THREE.Bone>>(new Map());
  const animPhase = useRef(0);
  const idlePhase = useRef(0);
  const initialized = useRef(false);
  const [boneMapState, setBoneMapState] = useState<Map<string, THREE.Bone>>(new Map());
  const [debugMode, setDebugMode] = useState(DEBUG_MODE);

  // Toggle debug mode with backtick key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '`' || e.key === '~') {
        DEBUG_MODE = !DEBUG_MODE;
        setDebugMode(DEBUG_MODE);
        console.log(`🔧 Debug mode: ${DEBUG_MODE ? 'ON' : 'OFF'}`);

        // Reset to default pose when exiting debug mode
        if (!DEBUG_MODE && bones.current.size > 0) {
          setIdlePose(bones.current);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Clone scene for this instance
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  // Find all bones after mounting
  useEffect(() => {
    if (!group.current || initialized.current) return;

    const boneMap = new Map<string, THREE.Bone>();

    group.current.traverse((child) => {
      if ((child as THREE.Bone).isBone) {
        const bone = child as THREE.Bone;
        boneMap.set(child.name, bone);
      }
    });

    bones.current = boneMap;
    setBoneMapState(boneMap);
    initialized.current = true;

    // Log found bones for debugging
    console.log('🦴 Found bones:', Array.from(boneMap.keys()));

    // Log initial arm quaternion before any modification
    const leftArm = boneMap.get(BONE_NAMES.leftArm);
    if (leftArm) {
      console.log('🦴 LeftArm INITIAL quaternion:', leftArm.quaternion.toArray());
      console.log('🦴 LeftArm INITIAL euler:', leftArm.rotation.toArray());
    }

    // Set initial idle pose - arms naturally at sides
    setIdlePose(boneMap);

    // Add skeleton helper for debugging
    if (DEBUG_MODE) {
      group.current.traverse((child) => {
        if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
          const skinnedMesh = child as THREE.SkinnedMesh;
          if (skinnedMesh.skeleton) {
            const helper = new THREE.SkeletonHelper(skinnedMesh);
            helper.visible = debugState.showSkeleton;
            skeletonHelperRef.current = helper;
            threeScene.add(helper);
          }
        }
      });
    }

    return () => {
      if (skeletonHelperRef.current) {
        threeScene.remove(skeletonHelperRef.current);
      }
    };
  }, [clonedScene, threeScene]);

  // Update skeleton helper visibility when debug mode changes
  useEffect(() => {
    if (skeletonHelperRef.current) {
      skeletonHelperRef.current.visible = debugMode;
    }
  }, [debugMode]);

  // Handle real-time bone angle adjustment with axis selection
  const handleBoneAngleChange = useCallback((bone: 'arms' | 'feet', newAngle: number, axis: 'x' | 'y' | 'z' = 'x') => {
    const boneMap = bones.current;

    // Create axis vector based on selection
    const axisVector = new THREE.Vector3(
      axis === 'x' ? 1 : 0,
      axis === 'y' ? 1 : 0,
      axis === 'z' ? 1 : 0
    );

    if (bone === 'arms') {
      const leftArm = boneMap.get(BONE_NAMES.leftArm);
      const rightArm = boneMap.get(BONE_NAMES.rightArm);

      if (leftArm) {
        leftArm.quaternion.identity();
        const rotQ = new THREE.Quaternion().setFromAxisAngle(axisVector, newAngle);
        leftArm.quaternion.multiply(rotQ);
        originalArmQuaternions.leftArm.copy(leftArm.quaternion);
      }
      if (rightArm) {
        rightArm.quaternion.identity();
        const rightAngle = (axis === 'x') ? newAngle : -newAngle;
        const rotQ = new THREE.Quaternion().setFromAxisAngle(axisVector, rightAngle);
        rightArm.quaternion.multiply(rotQ);
        originalArmQuaternions.rightArm.copy(rightArm.quaternion);
      }
    } else if (bone === 'feet') {
      const leftFoot = boneMap.get(BONE_NAMES.leftFoot);
      const rightFoot = boneMap.get(BONE_NAMES.rightFoot);

      console.log(`🦶 Adjusting feet: axis=${axis}, angle=${newAngle.toFixed(2)} rad`);

      if (leftFoot) {
        leftFoot.quaternion.identity();
        const rotQ = new THREE.Quaternion().setFromAxisAngle(axisVector, newAngle);
        leftFoot.quaternion.multiply(rotQ);
        originalFootQuaternions.leftFoot.copy(leftFoot.quaternion);
      }
      if (rightFoot) {
        rightFoot.quaternion.identity();
        const rotQ = new THREE.Quaternion().setFromAxisAngle(axisVector, newAngle);
        rightFoot.quaternion.multiply(rotQ);
        originalFootQuaternions.rightFoot.copy(rightFoot.quaternion);
      }
    }
  }, []);

  // Animate bones each frame
  useFrame((_, delta) => {
    const boneMap = bones.current;
    if (boneMap.size === 0) return;

    // Get bones
    const hips = boneMap.get(BONE_NAMES.hips);
    const spine = boneMap.get(BONE_NAMES.spine);
    const leftUpLeg = boneMap.get(BONE_NAMES.leftUpLeg);
    const rightUpLeg = boneMap.get(BONE_NAMES.rightUpLeg);
    const leftLeg = boneMap.get(BONE_NAMES.leftLeg);
    const rightLeg = boneMap.get(BONE_NAMES.rightLeg);
    const leftFoot = boneMap.get(BONE_NAMES.leftFoot);
    const rightFoot = boneMap.get(BONE_NAMES.rightFoot);
    const leftArm = boneMap.get(BONE_NAMES.leftArm);
    const rightArm = boneMap.get(BONE_NAMES.rightArm);
    const leftForeArm = boneMap.get(BONE_NAMES.leftForeArm);
    const rightForeArm = boneMap.get(BONE_NAMES.rightForeArm);

    if (isMoving) {
      // Walking/Running animation
      const speed = isRunning ? 10 : 6;
      animPhase.current += delta * speed;
      const t = animPhase.current;

      // Animation parameters
      const legSwingAmount = isRunning ? 0.45 : 0.22;
      const kneeAmount = isRunning ? 0.5 : 0.25;
      const armSwingAmount = isRunning ? 0.3 : 0.12;

      // Upper legs (thighs) - swing forward/back
      if (leftUpLeg) {
        leftUpLeg.rotation.x = Math.sin(t) * legSwingAmount;
      }
      if (rightUpLeg) {
        rightUpLeg.rotation.x = Math.sin(t + Math.PI) * legSwingAmount;
      }

      // Lower legs (knees) - bend naturally (negative X to bend forward like human knees)
      if (leftLeg) {
        leftLeg.rotation.x = -Math.max(0, Math.sin(t - 0.5)) * kneeAmount;
      }
      if (rightLeg) {
        rightLeg.rotation.x = -Math.max(0, Math.sin(t + Math.PI - 0.5)) * kneeAmount;
      }

      // Feet - use stored quaternion for flat positioning
      if (leftFoot) {
        leftFoot.quaternion.copy(originalFootQuaternions.leftFoot);
      }
      if (rightFoot) {
        rightFoot.quaternion.copy(originalFootQuaternions.rightFoot);
      }

      // Arms: swing front/back using Z axis (since arms are rotated to sides)
      if (leftArm) {
        const swingQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.sin(t + Math.PI) * armSwingAmount);
        leftArm.quaternion.copy(originalArmQuaternions.leftArm).multiply(swingQ);
      }
      if (rightArm) {
        const swingQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.sin(t) * armSwingAmount);
        rightArm.quaternion.copy(originalArmQuaternions.rightArm).multiply(swingQ);
      }

      // Forearms: keep original position
      if (leftForeArm) {
        leftForeArm.quaternion.copy(originalArmQuaternions.leftForeArm);
      }
      if (rightForeArm) {
        rightForeArm.quaternion.copy(originalArmQuaternions.rightForeArm);
      }

      // Hip bob and slight rotation
      if (hips) {
        hips.position.y = Math.abs(Math.sin(t * 2)) * 0.008;
        hips.rotation.z = Math.sin(t) * 0.03; // Side-to-side hip sway
      }

      // Spine sway and lean
      if (spine) {
        spine.rotation.y = Math.sin(t) * 0.04; // Twist with walk
        spine.rotation.z = Math.sin(t) * -0.02; // Counter-sway to hips
      }

      // Head bob and look
      const head = boneMap.get(BONE_NAMES.head);
      const neck = boneMap.get(BONE_NAMES.neck);
      if (head) {
        head.rotation.y = Math.sin(t * 0.5) * 0.03; // Subtle side look
        head.rotation.x = Math.sin(t * 2) * 0.02; // Slight nod with steps
      }
      if (neck) {
        neck.rotation.z = Math.sin(t) * 0.02; // Neck follows spine
      }

    } else {
      // Idle animation - subtle breathing
      idlePhase.current += delta * 1.2;
      const t = idlePhase.current;

      // Reset walk animation phase
      animPhase.current = 0;

      // Reset legs to standing - feet use stored quaternion
      if (leftUpLeg) leftUpLeg.rotation.x = 0;
      if (rightUpLeg) rightUpLeg.rotation.x = 0;
      if (leftLeg) leftLeg.rotation.x = 0;
      if (rightLeg) rightLeg.rotation.x = 0;
      if (leftFoot) leftFoot.quaternion.copy(originalFootQuaternions.leftFoot);
      if (rightFoot) rightFoot.quaternion.copy(originalFootQuaternions.rightFoot);

      // Arms: restore to original position
      if (leftArm) leftArm.quaternion.copy(originalArmQuaternions.leftArm);
      if (rightArm) rightArm.quaternion.copy(originalArmQuaternions.rightArm);
      if (leftForeArm) leftForeArm.quaternion.copy(originalArmQuaternions.leftForeArm);
      if (rightForeArm) rightForeArm.quaternion.copy(originalArmQuaternions.rightForeArm);

      // Reset head and neck
      const head = boneMap.get(BONE_NAMES.head);
      const neck = boneMap.get(BONE_NAMES.neck);
      if (head) {
        head.rotation.x = 0;
        head.rotation.y = 0;
      }
      if (neck) {
        neck.rotation.z = 0;
      }

      // Subtle breathing - gentle spine movement
      if (spine) {
        spine.rotation.x = Math.sin(t) * 0.01;
        spine.rotation.y = 0;
        spine.rotation.z = 0;
      }

      // Very subtle hip sway for breathing
      if (hips) {
        hips.position.y = Math.sin(t) * 0.002;
        hips.rotation.z = 0;
      }
    }
  });

  return (
    <group ref={group}>
      {/* RPM avatar origin is at hips - lift up so feet are on ground */}
      <primitive object={clonedScene} position={[0, 1.0, 0]} />

      {/* Debug panel rendered as HTML overlay */}
      {debugMode && boneMapState.size > 0 && (
        <Html position={[0, 3, 0]} center style={{ pointerEvents: 'auto' }}>
          <DebugPanel boneMap={boneMapState} onBoneAngleChange={handleBoneAngleChange} />
        </Html>
      )}
    </group>
  );
}

// Mixamo-animated Ready Player Me Avatar
// Uses pre-made animations from Mixamo for natural movement
function MixamoAnimatedAvatar({
  url,
  isMoving = false,
  isRunning = false,
}: {
  url: string;
  isMoving?: boolean;
  isRunning?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);

  // Load animation files
  const idleGltf = useGLTF(ANIMATIONS.idle);
  const walkingGltf = useGLTF(ANIMATIONS.walking);
  const runningGltf = useGLTF(ANIMATIONS.running);

  // Clone scene for this instance
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  // Collect all animations
  const animations = useMemo(() => {
    const anims: THREE.AnimationClip[] = [];

    // Rename animations for easy access
    if (idleGltf.animations[0]) {
      const idle = idleGltf.animations[0].clone();
      idle.name = 'idle';
      anims.push(idle);
    }
    if (walkingGltf.animations[0]) {
      const walking = walkingGltf.animations[0].clone();
      walking.name = 'walking';
      anims.push(walking);
    }
    if (runningGltf.animations[0]) {
      const running = runningGltf.animations[0].clone();
      running.name = 'running';
      anims.push(running);
    }

    return anims;
  }, [idleGltf.animations, walkingGltf.animations, runningGltf.animations]);

  // Setup animations with the cloned scene
  const { actions } = useAnimations(animations, group);

  // Current animation state
  const currentAction = useRef<string>('idle');

  // Handle animation transitions
  useEffect(() => {
    if (!actions) return;

    let targetAction = 'idle';
    if (isMoving) {
      targetAction = isRunning ? 'running' : 'walking';
    }

    if (targetAction !== currentAction.current) {
      const prevAction = actions[currentAction.current];
      const nextAction = actions[targetAction];

      if (prevAction && nextAction) {
        // Smooth crossfade between animations
        prevAction.fadeOut(0.2);
        nextAction.reset().fadeIn(0.2).play();
      } else if (nextAction) {
        nextAction.reset().play();
      }

      currentAction.current = targetAction;
    }
  }, [isMoving, isRunning, actions]);

  // Start idle animation on mount
  useEffect(() => {
    if (actions?.idle) {
      actions.idle.play();
    }
  }, [actions]);

  return (
    <group ref={group}>
      {/* RPM avatar - positioned so feet are on ground */}
      <primitive object={clonedScene} position={[0, 0, 0]} />
    </group>
  );
}

// Preload animation files
if (USE_MIXAMO_ANIMATIONS) {
  useGLTF.preload(ANIMATIONS.idle);
  useGLTF.preload(ANIMATIONS.walking);
  useGLTF.preload(ANIMATIONS.running);
}

// Simple placeholder avatar when no RPM avatar is loaded
function PlaceholderAvatar({ isMoving = false }: { isMoving?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const phase = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (isMoving) {
      phase.current += delta * 10;
      groupRef.current.position.y = Math.abs(Math.sin(phase.current)) * 0.08;
    } else {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.03;
      phase.current = 0;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[0.5, 0.8, 32]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.35} />
      </mesh>

      {/* Body */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.25, 0.6, 8, 16]} />
        <meshStandardMaterial color="#1a1a2e" emissive="#8b5cf6" emissiveIntensity={0.1} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.2} />
      </mesh>

      {/* Headphones */}
      <mesh position={[0, 1.7, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.22, 0.03, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// Third-person camera with mouse look
function ThirdPersonCamera({
  target
}: {
  target: React.RefObject<THREE.Group>;
}) {
  const { camera, gl } = useThree();
  const smoothPosition = useRef(new THREE.Vector3(0, 4, 10));
  const initialized = useRef(false);

  // Camera orbit angles (controlled by mouse)
  const orbitAngle = useRef(0); // Horizontal rotation (yaw)
  const pitchAngle = useRef(0.3); // Vertical angle (pitch) - start slightly above

  // Mouse tracking
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Camera settings
  const distance = 6;
  const minPitch = -0.2; // Don't go too far below
  const maxPitch = 1.2; // Don't go too far above
  const sensitivity = 0.003;

  // Set up mouse event listeners
  useEffect(() => {
    const canvas = gl.domElement;

    const handleMouseDown = (e: MouseEvent) => {
      // Only start drag on left click or right click
      if (e.button === 0 || e.button === 2) {
        isDragging.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = 'grabbing';
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      canvas.style.cursor = 'grab';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;

      const deltaX = e.clientX - lastMouse.current.x;
      const deltaY = e.clientY - lastMouse.current.y;

      // Update orbit angles
      orbitAngle.current -= deltaX * sensitivity;
      pitchAngle.current += deltaY * sensitivity;

      // Clamp pitch
      pitchAngle.current = Math.max(minPitch, Math.min(maxPitch, pitchAngle.current));

      lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => {
      isDragging.current = false;
      canvas.style.cursor = 'grab';
    };

    // Prevent context menu on right-click
    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };

    canvas.style.cursor = 'grab';
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('contextmenu', handleContextMenu);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [gl]);

  useFrame((_, delta) => {
    if (!target.current) return;

    const playerPos = target.current.position;
    const lookAtHeight = 1.6; // Look at chest/head level (avatar is ~1.8m tall)

    // Calculate camera position based on orbit angles
    const horizontalDist = distance * Math.cos(pitchAngle.current);
    const verticalOffset = distance * Math.sin(pitchAngle.current) + 1.5;

    const desiredPos = new THREE.Vector3(
      playerPos.x + Math.sin(orbitAngle.current) * horizontalDist,
      playerPos.y + verticalOffset,
      playerPos.z + Math.cos(orbitAngle.current) * horizontalDist
    );

    // Initialize on first frame
    if (!initialized.current) {
      smoothPosition.current.copy(desiredPos);
      camera.position.copy(smoothPosition.current);
      initialized.current = true;
    }

    // Smooth camera movement
    const lerpSpeed = 12;
    smoothPosition.current.lerp(desiredPos, 1 - Math.exp(-lerpSpeed * delta));

    // Apply camera position
    camera.position.copy(smoothPosition.current);

    // Always look at player
    camera.lookAt(playerPos.x, playerPos.y + lookAtHeight, playerPos.z);
  });

  return null;
}

// Ground level constant - character stands ON the ground
const GROUND_Y = 0.01;

// Main player controller with movement
function PlayerController({
  avatarUrl,
  onPositionChange,
}: {
  avatarUrl?: string;
  onPositionChange?: (pos: THREE.Vector3) => void;
}) {
  const keys = useKeyboardControls();
  const playerRef = useRef<THREE.Group>(null!);
  const { camera } = useThree();

  const velocity = useRef(new THREE.Vector3());
  const facingAngle = useRef(0);
  const [isMoving, setIsMoving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  useFrame((_, delta) => {
    if (!playerRef.current) return;

    // Get raw input
    let inputX = 0; // left/right
    let inputZ = 0; // forward/back

    if (keys.forward) inputZ = -1;
    if (keys.backward) inputZ = 1;
    if (keys.left) inputX = -1;
    if (keys.right) inputX = 1;

    const hasInput = inputX !== 0 || inputZ !== 0;

    // Update animation states
    if (hasInput !== isMoving) setIsMoving(hasInput);
    if ((hasInput && keys.sprint) !== isRunning) setIsRunning(hasInput && keys.sprint);

    if (hasInput) {
      // Normalize input
      const inputLen = Math.sqrt(inputX * inputX + inputZ * inputZ);
      inputX /= inputLen;
      inputZ /= inputLen;

      // Get camera's horizontal direction (ignore Y component)
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);
      cameraDir.y = 0;
      cameraDir.normalize();

      // Calculate camera's right vector
      const cameraRight = new THREE.Vector3();
      cameraRight.crossVectors(cameraDir, new THREE.Vector3(0, 1, 0)).normalize();

      // Calculate world-space movement direction relative to camera
      const moveDir = new THREE.Vector3();
      moveDir.addScaledVector(cameraDir, -inputZ); // Forward/back relative to camera
      moveDir.addScaledVector(cameraRight, inputX); // Left/right relative to camera
      moveDir.normalize();

      // Calculate speed
      const speed = keys.sprint ? SPRINT_SPEED : WALK_SPEED;

      // Set target velocity
      const targetVel = moveDir.multiplyScalar(speed);
      velocity.current.lerp(targetVel, 1 - Math.exp(-10 * delta));

      // Calculate target facing angle (direction of movement)
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);

      // Smoothly rotate player to face movement direction
      let angleDiff = targetAngle - facingAngle.current;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      facingAngle.current += angleDiff * Math.min(1, delta * ROTATION_SPEED);

      playerRef.current.rotation.y = facingAngle.current;
    } else {
      // Decelerate when no input
      velocity.current.lerp(new THREE.Vector3(0, 0, 0), 1 - Math.exp(-8 * delta));
    }

    // Apply movement (keep Y at ground level)
    playerRef.current.position.x += velocity.current.x * delta;
    playerRef.current.position.z += velocity.current.z * delta;
    playerRef.current.position.y = GROUND_Y; // Keep on ground

    // Report position
    onPositionChange?.(playerRef.current.position.clone());
  });

  return (
    <>
      <group ref={playerRef} position={[0, GROUND_Y, 5]}>
        <Suspense fallback={<PlaceholderAvatar isMoving={isMoving} />}>
          {avatarUrl ? (
            USE_MIXAMO_ANIMATIONS ? (
              <MixamoAnimatedAvatar
                url={avatarUrl}
                isMoving={isMoving}
                isRunning={isRunning}
              />
            ) : (
              <AnimatedAvatar
                url={avatarUrl}
                isMoving={isMoving}
                isRunning={isRunning}
              />
            )
          ) : (
            <PlaceholderAvatar isMoving={isMoving} />
          )}
        </Suspense>
      </group>

      <ThirdPersonCamera target={playerRef} />
    </>
  );
}

// Zone marker for game areas
function ZoneMarker({
  position,
  label,
  icon: Icon,
  color,
  description,
  onClick,
}: {
  position: [number, number, number];
  label: string;
  icon: typeof Music;
  color: string;
  description: string;
  onClick?: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5) * 0.3;
    }
  });

  return (
    <group position={position}>
      {/* Ground ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <ringGeometry args={[2, 2.5, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>

      <Float speed={2} floatIntensity={0.5}>
        <mesh
          ref={meshRef}
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
        >
          <octahedronGeometry args={[1.2, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={hovered ? 0.8 : 0.4}
            metalness={0.9}
            roughness={0.1}
            transparent
            opacity={0.9}
          />
        </mesh>
      </Float>

      <Sparkles count={hovered ? 50 : 20} scale={4} size={hovered ? 4 : 2} speed={0.5} color={color} />

      <Html position={[0, 4, 0]} center>
        <div className={`text-center transition-all ${hovered ? 'scale-110' : ''}`}>
          <div
            className="px-4 py-2.5 rounded-xl backdrop-blur-xl border"
            style={{
              backgroundColor: 'rgba(10,10,15,0.8)',
              borderColor: hovered ? color : 'rgba(255,255,255,0.1)',
              boxShadow: hovered ? `0 0 30px ${color}44` : 'none',
            }}
          >
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Icon className="w-4 h-4" style={{ color }} />
              {label}
            </div>
            <p className="text-[11px] text-white/50 mt-0.5">{description}</p>
          </div>
        </div>
      </Html>
    </group>
  );
}

// Generate procedural concrete texture
function createConcreteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base concrete color - dark asphalt
  ctx.fillStyle = '#1a1a22';
  ctx.fillRect(0, 0, 512, 512);

  // Add noise for texture variation
  const imageData = ctx.getImageData(0, 0, 512, 512);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Random noise for concrete grain
    const noise = (Math.random() - 0.5) * 20;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));     // R
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise)); // G
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise)); // B
  }

  ctx.putImageData(imageData, 0, 0);

  // Add some cracks and lines
  ctx.strokeStyle = 'rgba(30, 30, 40, 0.3)';
  ctx.lineWidth = 1;

  // Random cracks
  for (let i = 0; i < 15; i++) {
    ctx.beginPath();
    const startX = Math.random() * 512;
    const startY = Math.random() * 512;
    ctx.moveTo(startX, startY);

    let x = startX;
    let y = startY;
    for (let j = 0; j < 8; j++) {
      x += (Math.random() - 0.5) * 60;
      y += (Math.random() - 0.5) * 60;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Subtle concrete slabs (expansion joints)
  ctx.strokeStyle = 'rgba(40, 40, 50, 0.5)';
  ctx.lineWidth = 2;

  // Horizontal lines every ~128 pixels
  for (let y = 128; y < 512; y += 128) {
    ctx.beginPath();
    ctx.moveTo(0, y + (Math.random() - 0.5) * 4);
    ctx.lineTo(512, y + (Math.random() - 0.5) * 4);
    ctx.stroke();
  }

  // Vertical lines
  for (let x = 128; x < 512; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x + (Math.random() - 0.5) * 4, 0);
    ctx.lineTo(x + (Math.random() - 0.5) * 4, 512);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Cyberpunk ground - concrete street with grid overlay
function CyberpunkGround() {
  // Create procedural concrete texture
  const concreteTexture = useMemo(() => {
    const texture = createConcreteTexture();
    // 1 unit = 1 meter, tile every 4 meters for realistic scale
    texture.repeat.set(125, 125); // 500m / 4m per tile = 125 tiles
    return texture;
  }, []);

  return (
    <>
      {/* Concrete street surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial
          map={concreteTexture}
          metalness={0.1}
          roughness={0.9}
        />
      </mesh>

      {/* Grid overlay - neon lines on the concrete */}
      <Grid
        position={[0, 0.008, 0]}
        args={[200, 200]}
        cellSize={2}
        cellThickness={0.4}
        cellColor="#1a1a2e"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#8b5cf6"
        fadeDistance={60}
        fadeStrength={1.5}
        infiniteGrid
      />
    </>
  );
}

// Basketball Court component with Leva controls for positioning
function BasketballCourt() {
  // Leva controls for positioning - adjust these in real-time!
  // Note: folder() flattens values to top level, so we destructure x/y/z/rotY directly
  const { x, y, z, rotY, scale, visible } = useControls('Basketball Court', {
    visible: true,
    position: folder({
      x: { value: 30, min: -100, max: 100, step: 1 },
      y: { value: 0, min: -10, max: 10, step: 0.1 },
      z: { value: -20, min: -100, max: 100, step: 1 },
    }),
    rotation: folder({
      rotY: { value: 0, min: -Math.PI, max: Math.PI, step: 0.1 },
    }),
    scale: { value: 0.02, min: 0.001, max: 0.1, step: 0.001 },
  });

  // Load the court FBX from R2
  const court = useFBX(`${ASSETS_URL}/models/basketball-court/Court.fbx`);

  // Load court texture
  const courtTexture = useTexture(`${ASSETS_URL}/models/basketball-court/textures/court.jpg`);

  // Clone and setup model
  const model = useMemo(() => {
    const clone = court.clone();

    // Apply textures to meshes
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Apply court texture to appropriate meshes
        if (mesh.material) {
          const material = new THREE.MeshStandardMaterial({
            map: courtTexture,
            metalness: 0.1,
            roughness: 0.8,
          });
          mesh.material = material;
        }
      }
    });

    return clone;
  }, [court, courtTexture]);

  if (!visible) return null;

  return (
    <primitive
      object={model}
      position={[x, y, z]}
      rotation={[0, rotY, 0]}
      scale={scale}
    />
  );
}

// Main world component
export function PlayWorld({
  avatarUrl,
  onPlayerPositionChange,
}: {
  avatarUrl?: string;
  onPlayerPositionChange?: (pos: THREE.Vector3) => void;
}) {
  const [playerPos, setPlayerPos] = useState(new THREE.Vector3(0, 0, 5));

  const handlePositionChange = useCallback((pos: THREE.Vector3) => {
    setPlayerPos(pos);
    onPlayerPositionChange?.(pos);
  }, [onPlayerPositionChange]);

  const zones = [
    { position: [15, 2, -15] as [number, number, number], label: 'Studio District', icon: Mic2, color: '#8b5cf6', description: 'Create & collaborate' },
    { position: [-15, 2, -15] as [number, number, number], label: 'Business Hub', icon: Briefcase, color: '#22c55e', description: 'Deals & contracts' },
    { position: [0, 2, -25] as [number, number, number], label: 'Social Plaza', icon: Users, color: '#f59e0b', description: 'Network & connect' },
    { position: [-20, 2, 5] as [number, number, number], label: 'Marketplace', icon: Music, color: '#ec4899', description: 'Buy & sell assets' },
    { position: [20, 2, 5] as [number, number, number], label: 'Game Arena', icon: Gamepad2, color: '#06b6d4', description: 'Compete & earn' },
  ];

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-15, 8, -15]} intensity={1} color="#8b5cf6" distance={30} />
      <pointLight position={[15, 8, -15]} intensity={1} color="#22c55e" distance={30} />
      <pointLight position={[0, 5, 5]} intensity={0.5} color="#8b5cf6" distance={20} />
      <hemisphereLight args={['#8b5cf6', '#0a0a0f', 0.3]} />

      {/* Environment */}
      <fog attach="fog" args={['#0a0a0f', 30, 120]} />
      <color attach="background" args={['#0a0a0f']} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Ground */}
      <CyberpunkGround />

      {/* Basketball Court - use Leva panel to adjust position */}
      <Suspense fallback={null}>
        <BasketballCourt />
      </Suspense>

      {/* Contact shadow - sits just above ground */}
      <ContactShadows
        position={[playerPos.x, 0.005, playerPos.z]}
        opacity={0.6}
        scale={10}
        blur={1.5}
        far={3}
        color="#8b5cf6"
      />

      {/* Player */}
      <PlayerController
        avatarUrl={avatarUrl}
        onPositionChange={handlePositionChange}
      />

      {/* Zones */}
      {zones.map((zone) => (
        <ZoneMarker key={zone.label} {...zone} />
      ))}

      {/* Spawn indicator */}
      <mesh position={[0, 0.006, 5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1, 32]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.3} />
      </mesh>
    </>
  );
}
