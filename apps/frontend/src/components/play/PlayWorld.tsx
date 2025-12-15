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
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { usePlayMultiplayer } from './hooks/usePlayMultiplayer';
import { OtherPlayers } from './multiplayer/OtherPlayers';
import { PhysicsPlayerController } from './PhysicsPlayerController';
import { AnimationErrorBoundary } from './AnimationErrorBoundary';
import { WeaponAttachment, type WeaponType } from './WeaponAttachment';
import {
  ANIMATION_CONFIG,
  getFadeTime,
  isMixamoAnimation,
  type AnimationName,
} from './animations.config';
import { configureAllActions } from './hooks/useAnimationLoader';
import { VFXManager } from './vfx/VFXManager';
import { NPCManager } from './npc/NPCManager';
import { createPatrolNPC, createNPC } from './npc/useNPCStore';

// Assets URL (Cloudflare R2 CDN)
const ASSETS_URL = import.meta.env.VITE_ASSETS_URL || '';

// Animation URLs derived from config
const ANIMATIONS = Object.fromEntries(
  Object.entries(ANIMATION_CONFIG).map(([name, config]) => [name, config.url])
) as Record<AnimationName, string>;

// Track which weapon animations are available (set to true after downloading)
const WEAPON_ANIMATIONS_AVAILABLE = true;

// Track which crouch animations are available (set to true after downloading from Mixamo)
// Download: "crouching idle" and "crouch walk" from Mixamo
const CROUCH_ANIMATIONS_AVAILABLE = true;

// Flag to use Mixamo animations vs procedural (set to true once you have the GLB files)
const USE_MIXAMO_ANIMATIONS = true;

// Preload all animations at module level - eliminates pop-in on first trigger
Object.values(ANIMATIONS).forEach(url => useGLTF.preload(url));

import { Gamepad2, Music, Briefcase, Users, Mic2 } from 'lucide-react';
import { useKeyboardControls } from './hooks/useKeyboardControls';

// Debug mode - toggle with backtick (`) key
let DEBUG_MODE = false;

// Movement constants
const WALK_SPEED = 2.5;
const SPRINT_SPEED = 5;
const ROTATION_SPEED = 10;

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

// Store spine/head quaternions for posture adjustment
const originalSpineQuaternions = {
  spine: new THREE.Quaternion(),
  spine1: new THREE.Quaternion(),
  spine2: new THREE.Quaternion(),
  neck: new THREE.Quaternion(),
  head: new THREE.Quaternion(),
};

// LocalStorage key for bone settings
const BONE_SETTINGS_KEY = 'producerTour_boneSettings';

// Default bone rotation settings
const DEFAULT_BONE_SETTINGS = {
  arms: { axis: 'x' as const, angle: 1.26 },      // 72° - natural arm position
  forearms: { axis: 'x' as const, angle: 0 },     // neutral
  feet: { axis: 'x' as const, angle: 0.86 },      // 49° - flat feet
  spine: { axis: 'x' as const, angle: -0.09 },    // -5° - slight backward tilt
  head: { axis: 'x' as const, angle: 0.08 },      // 5° - slight upward tilt
};

// Load saved bone settings from localStorage
function loadBoneSettings(): typeof DEFAULT_BONE_SETTINGS {
  try {
    const saved = localStorage.getItem(BONE_SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_BONE_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load bone settings:', e);
  }
  return DEFAULT_BONE_SETTINGS;
}

// Save bone settings to localStorage
function saveBoneSettings(settings: typeof DEFAULT_BONE_SETTINGS) {
  try {
    localStorage.setItem(BONE_SETTINGS_KEY, JSON.stringify(settings));
    console.log('🦴 Bone settings saved!', settings);
    return true;
  } catch (e) {
    console.error('Failed to save bone settings:', e);
    return false;
  }
}

// Mutable bone settings (loaded from localStorage)
// Using let so we can update it when user saves new settings
let boneSettings = loadBoneSettings();

// Function to update module-level settings (called when user saves)
function updateBoneSettings(newSettings: typeof DEFAULT_BONE_SETTINGS) {
  boneSettings = newSettings;
}

// Getter functions for bone settings (always read from current boneSettings)
function getArmRotation() { return boneSettings.arms; }
function getFootRotation() { return boneSettings.feet; }
function getSpineRotation() { return boneSettings.spine; }
function getHeadRotation() { return boneSettings.head; }

// Debug state for real-time adjustments
const debugState = {
  armDownAngle: boneSettings.arms.angle,
  showSkeleton: true,
};

// Debug Panel Component - Draggable
type BoneType = 'arms' | 'forearms' | 'feet' | 'spine' | 'head';

function DebugPanel({
  boneMap,
  onBoneAngleChange
}: {
  boneMap: Map<string, THREE.Bone>;
  onBoneAngleChange: (bone: BoneType, angle: number, axis: 'x' | 'y' | 'z') => void;
}) {
  const [selectedBone, setSelectedBone] = useState<BoneType>('spine');
  // Initialize angle and axis from saved settings for default bone (spine)
  const initialSettings = loadBoneSettings();
  const [angle, setAngle] = useState(initialSettings.spine.angle);
  const [rotAxis, setRotAxis] = useState<'x' | 'y' | 'z'>(initialSettings.spine.axis);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const panelRef = useRef<HTMLDivElement>(null);
  const leftFoot = boneMap.get(BONE_NAMES.leftFoot);
  const leftArm = boneMap.get(BONE_NAMES.leftArm);
  const leftForeArm = boneMap.get(BONE_NAMES.leftForeArm);
  const spine = boneMap.get(BONE_NAMES.spine);
  const head = boneMap.get(BONE_NAMES.head);

  // Track current settings for all bones
  const [currentSettings, setCurrentSettings] = useState(loadBoneSettings());

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
  const activeBone = selectedBone === 'arms' ? leftArm
    : selectedBone === 'forearms' ? leftForeArm
    : selectedBone === 'feet' ? leftFoot
    : selectedBone === 'spine' ? spine
    : head;
  const boneRot = activeBone ? {
    euler: activeBone.rotation.toArray().map(v => typeof v === 'number' ? v.toFixed(2) : v),
    quat: activeBone.quaternion.toArray().map(v => v.toFixed(3)),
    worldPos: activeBone.getWorldPosition(new THREE.Vector3()).toArray().map(v => v.toFixed(2)),
  } : null;

  const handleAngleChange = (newAngle: number) => {
    setAngle(newAngle);
    onBoneAngleChange(selectedBone, newAngle, rotAxis);
    // Track the change
    setCurrentSettings(prev => ({
      ...prev,
      [selectedBone]: { axis: rotAxis, angle: newAngle }
    }));
    setSaveStatus('idle');
  };

  const handleAxisChange = (axis: 'x' | 'y' | 'z') => {
    setRotAxis(axis);
    onBoneAngleChange(selectedBone, angle, axis);
    // Track the change
    setCurrentSettings(prev => ({
      ...prev,
      [selectedBone]: { axis, angle }
    }));
    setSaveStatus('idle');
  };

  const handleBoneSelect = (bone: BoneType) => {
    setSelectedBone(bone);
    // Load current settings for this bone
    const boneConfig = currentSettings[bone];
    setAngle(boneConfig.angle);
    setRotAxis(boneConfig.axis);
  };

  const handleSaveSettings = () => {
    if (saveBoneSettings(currentSettings)) {
      // Also update the module-level settings so setIdlePose uses new values
      updateBoneSettings(currentSettings);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } else {
      setSaveStatus('error');
    }
  };

  const handleResetToDefaults = () => {
    setCurrentSettings(DEFAULT_BONE_SETTINGS);
    // Apply defaults to all bones
    Object.entries(DEFAULT_BONE_SETTINGS).forEach(([bone, config]) => {
      onBoneAngleChange(bone as BoneType, config.angle, config.axis);
    });
    // Update current view
    const defaultConfig = DEFAULT_BONE_SETTINGS[selectedBone];
    setAngle(defaultConfig.angle);
    setRotAxis(defaultConfig.axis);
    // Clear saved settings
    localStorage.removeItem(BONE_SETTINGS_KEY);
    setSaveStatus('idle');
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
        <div className="flex gap-2 flex-wrap">
          {(['spine', 'head', 'arms', 'forearms', 'feet'] as const).map(bone => (
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
          {selectedBone.charAt(0).toUpperCase() + selectedBone.slice(1)} Rotation ({rotAxis.toUpperCase()}): {angle.toFixed(2)} rad ({(angle * 180 / Math.PI).toFixed(0)}°)
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

      {/* Save/Reset Buttons */}
      <div className="mb-3 space-y-2">
        <button
          onClick={handleSaveSettings}
          className={`w-full px-3 py-2 rounded font-bold text-sm transition-colors ${
            saveStatus === 'saved'
              ? 'bg-emerald-600 text-white'
              : saveStatus === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-violet-600 hover:bg-violet-500 text-white'
          }`}
        >
          {saveStatus === 'saved' ? '✓ Saved!' : saveStatus === 'error' ? '✗ Error' : '💾 Save All Settings'}
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleResetToDefaults}
            className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-[11px]"
          >
            ↺ Reset Defaults
          </button>
          <button
            onClick={() => {
              const boneName = selectedBone.charAt(0).toUpperCase() + selectedBone.slice(1);
              const text = `${boneName} Settings: axis=${rotAxis}, angle=${angle.toFixed(2)} rad (${Math.round(angle * 180 / Math.PI)}°)`;
              navigator.clipboard.writeText(text);
            }}
            className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-[11px]"
          >
            📋 Copy
          </button>
        </div>
      </div>

      {/* All Settings Summary */}
      <div className="mb-3 p-2 bg-gray-800/50 rounded text-[10px]">
        <div className="text-gray-400 mb-1 font-bold">Current Settings:</div>
        {Object.entries(currentSettings).map(([bone, config]) => (
          <div key={bone} className="flex justify-between text-gray-500">
            <span className="capitalize">{bone}:</span>
            <span className={selectedBone === bone ? 'text-violet-400' : ''}>
              {config.axis.toUpperCase()} {config.angle.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Current Rotation Info */}
      {boneRot && (
        <div className="border-t border-gray-700 pt-2">
          <p className="text-gray-400">{selectedBone.charAt(0).toUpperCase() + selectedBone.slice(1)} Euler (XYZ):</p>
          <p className="text-green-400 text-[11px]">[{boneRot.euler.slice(0, 3).join(', ')}]</p>
          <p className="text-gray-400 mt-1">{selectedBone.charAt(0).toUpperCase() + selectedBone.slice(1)} Quaternion (XYZW):</p>
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

// Helper function to set idle pose with arms at sides, feet flat, and upright posture
function setIdlePose(boneMap: Map<string, THREE.Bone>) {
  const leftArm = boneMap.get(BONE_NAMES.leftArm);
  const rightArm = boneMap.get(BONE_NAMES.rightArm);
  const leftForeArm = boneMap.get(BONE_NAMES.leftForeArm);
  const rightForeArm = boneMap.get(BONE_NAMES.rightForeArm);
  const leftFoot = boneMap.get(BONE_NAMES.leftFoot);
  const rightFoot = boneMap.get(BONE_NAMES.rightFoot);
  const spine = boneMap.get(BONE_NAMES.spine);
  const spine1 = boneMap.get(BONE_NAMES.spine1);
  const spine2 = boneMap.get(BONE_NAMES.spine2);
  const neck = boneMap.get(BONE_NAMES.neck);
  const head = boneMap.get(BONE_NAMES.head);

  // Get current settings (uses saved values from localStorage)
  const armRotation = getArmRotation();
  const footRotation = getFootRotation();
  const spineRotation = getSpineRotation();
  const headRotation = getHeadRotation();

  // Arms: use saved angle for natural position
  const armAngle = armRotation.angle;
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

  // Feet: use saved angle for flat positioning
  const footAngle = footRotation.angle;

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

  // Spine: use saved angle for posture
  const spineAngle = spineRotation.angle;
  if (spine) {
    spine.quaternion.identity();
    const rotQ = new THREE.Quaternion().setFromAxisAngle(xAxis, spineAngle);
    spine.quaternion.multiply(rotQ);
    originalSpineQuaternions.spine.copy(spine.quaternion);
  }
  if (spine1) {
    spine1.quaternion.identity();
    const rotQ = new THREE.Quaternion().setFromAxisAngle(xAxis, spineAngle);
    spine1.quaternion.multiply(rotQ);
    originalSpineQuaternions.spine1.copy(spine1.quaternion);
  }
  if (spine2) {
    spine2.quaternion.identity();
    const rotQ = new THREE.Quaternion().setFromAxisAngle(xAxis, spineAngle);
    spine2.quaternion.multiply(rotQ);
    originalSpineQuaternions.spine2.copy(spine2.quaternion);
  }

  // Neck: keep neutral
  if (neck) {
    originalSpineQuaternions.neck.copy(neck.quaternion);
  }

  // Head: use saved angle for tilt
  const headAngle = headRotation.angle;
  if (head) {
    head.quaternion.identity();
    const rotQ = new THREE.Quaternion().setFromAxisAngle(xAxis, headAngle);
    head.quaternion.multiply(rotQ);
    originalSpineQuaternions.head.copy(head.quaternion);
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
  const handleBoneAngleChange = useCallback((bone: BoneType, newAngle: number, axis: 'x' | 'y' | 'z' = 'x') => {
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
    } else if (bone === 'spine') {
      const spine = boneMap.get(BONE_NAMES.spine);
      const spine1 = boneMap.get(BONE_NAMES.spine1);
      const spine2 = boneMap.get(BONE_NAMES.spine2);

      console.log(`🦴 Adjusting spine: axis=${axis}, angle=${newAngle.toFixed(2)} rad`);

      // Apply same rotation to all spine segments
      if (spine) {
        spine.quaternion.identity();
        const rotQ = new THREE.Quaternion().setFromAxisAngle(axisVector, newAngle);
        spine.quaternion.multiply(rotQ);
        originalSpineQuaternions.spine.copy(spine.quaternion);
      }
      if (spine1) {
        spine1.quaternion.identity();
        const rotQ = new THREE.Quaternion().setFromAxisAngle(axisVector, newAngle);
        spine1.quaternion.multiply(rotQ);
        originalSpineQuaternions.spine1.copy(spine1.quaternion);
      }
      if (spine2) {
        spine2.quaternion.identity();
        const rotQ = new THREE.Quaternion().setFromAxisAngle(axisVector, newAngle);
        spine2.quaternion.multiply(rotQ);
        originalSpineQuaternions.spine2.copy(spine2.quaternion);
      }
    } else if (bone === 'head') {
      const head = boneMap.get(BONE_NAMES.head);
      const neck = boneMap.get(BONE_NAMES.neck);

      console.log(`🦴 Adjusting head: axis=${axis}, angle=${newAngle.toFixed(2)} rad`);

      if (head) {
        head.quaternion.identity();
        const rotQ = new THREE.Quaternion().setFromAxisAngle(axisVector, newAngle);
        head.quaternion.multiply(rotQ);
        originalSpineQuaternions.head.copy(head.quaternion);
      }
      // Optionally adjust neck with half the angle for natural look
      if (neck) {
        neck.quaternion.identity();
        const rotQ = new THREE.Quaternion().setFromAxisAngle(axisVector, newAngle * 0.5);
        neck.quaternion.multiply(rotQ);
        originalSpineQuaternions.neck.copy(neck.quaternion);
      }
    } else if (bone === 'forearms') {
      const leftForeArm = boneMap.get(BONE_NAMES.leftForeArm);
      const rightForeArm = boneMap.get(BONE_NAMES.rightForeArm);

      console.log(`🦴 Adjusting forearms: axis=${axis}, angle=${newAngle.toFixed(2)} rad`);

      if (leftForeArm) {
        leftForeArm.quaternion.identity();
        const rotQ = new THREE.Quaternion().setFromAxisAngle(axisVector, newAngle);
        leftForeArm.quaternion.multiply(rotQ);
        originalArmQuaternions.leftForeArm.copy(leftForeArm.quaternion);
      }
      if (rightForeArm) {
        rightForeArm.quaternion.identity();
        // Mirror the angle for right forearm on Y and Z axes
        const rightAngle = (axis === 'x') ? newAngle : -newAngle;
        const rotQ = new THREE.Quaternion().setFromAxisAngle(axisVector, rightAngle);
        rightForeArm.quaternion.multiply(rotQ);
        originalArmQuaternions.rightForeArm.copy(rightForeArm.quaternion);
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
      // Walking/Running animation - smoother speeds
      const speed = isRunning ? 6 : 4;
      animPhase.current += delta * speed;
      const t = animPhase.current;

      // Animation parameters - reduced for smoother motion
      const legSwingAmount = isRunning ? 0.35 : 0.18;
      const kneeAmount = isRunning ? 0.4 : 0.2;
      const armSwingAmount = isRunning ? 0.22 : 0.1;

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

      // Hip bob and slight rotation - reduced for smoothness
      if (hips) {
        hips.position.y = Math.abs(Math.sin(t * 2)) * 0.005;
        hips.rotation.z = Math.sin(t) * 0.02; // Side-to-side hip sway
      }

      // Spine sway and lean - reduced
      if (spine) {
        spine.rotation.y = Math.sin(t) * 0.025; // Twist with walk
        spine.rotation.z = Math.sin(t) * -0.015; // Counter-sway to hips
      }

      // Head bob and look - reduced
      const head = boneMap.get(BONE_NAMES.head);
      const neck = boneMap.get(BONE_NAMES.neck);
      if (head) {
        head.rotation.y = Math.sin(t * 0.5) * 0.02; // Subtle side look
        head.rotation.x = Math.sin(t * 2) * 0.01; // Slight nod with steps
      }
      if (neck) {
        neck.rotation.z = Math.sin(t) * 0.015; // Neck follows spine
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
  isJumping = false,
  isDancing = false,
  isCrouching = false,
  isStrafingLeft = false,
  isStrafingRight = false,
  weaponType = null,
}: {
  url: string;
  isMoving?: boolean;
  isRunning?: boolean;
  isJumping?: boolean;
  isDancing?: boolean;
  isCrouching?: boolean;
  isStrafingLeft?: boolean;
  isStrafingRight?: boolean;
  weaponType?: WeaponType;
}) {
  const group = useRef<THREE.Group>(null);
  const avatarRef = useRef<THREE.Group>(null);
  const crouchOffset = useRef(0);
  const { scene } = useGLTF(url);

  // Load animation files
  const idleGltf = useGLTF(ANIMATIONS.idle);
  const idleVar1Gltf = useGLTF(ANIMATIONS.idleVar1);
  const idleVar2Gltf = useGLTF(ANIMATIONS.idleVar2);
  const walkingGltf = useGLTF(ANIMATIONS.walking);
  const runningGltf = useGLTF(ANIMATIONS.running);
  const jumpGltf = useGLTF(ANIMATIONS.jump);
  const jumpJogGltf = useGLTF(ANIMATIONS.jumpJog);
  const jumpRunGltf = useGLTF(ANIMATIONS.jumpRun);
  const dance1Gltf = useGLTF(ANIMATIONS.dance1);
  const dance2Gltf = useGLTF(ANIMATIONS.dance2);
  const dance3Gltf = useGLTF(ANIMATIONS.dance3);

  // Crouch animations - all loaded for proper crouch state handling
  // Note: No proper "Crouching Idle" FBX exists yet - using crouchWalk as fallback
  const crouchWalkGltf = useGLTF(CROUCH_ANIMATIONS_AVAILABLE ? ANIMATIONS.crouchWalk : ANIMATIONS.walking);
  const crouchIdleGltf = crouchWalkGltf; // Use walk as idle until proper idle is downloaded
  const crouchStrafeLeftGltf = useGLTF(CROUCH_ANIMATIONS_AVAILABLE ? ANIMATIONS.crouchStrafeLeft : ANIMATIONS.walking);
  const crouchStrafeRightGltf = useGLTF(CROUCH_ANIMATIONS_AVAILABLE ? ANIMATIONS.crouchStrafeRight : ANIMATIONS.walking);
  // Crouch transitions
  const standToCrouchGltf = useGLTF(CROUCH_ANIMATIONS_AVAILABLE ? ANIMATIONS.standToCrouch : ANIMATIONS.idle);
  const crouchToStandGltf = useGLTF(CROUCH_ANIMATIONS_AVAILABLE ? ANIMATIONS.crouchToStand : ANIMATIONS.idle);
  const crouchToSprintGltf = useGLTF(CROUCH_ANIMATIONS_AVAILABLE ? ANIMATIONS.crouchToSprint : ANIMATIONS.running);

  // Weapon animations (only load if available)
  const rifleIdleGltf = useGLTF(WEAPON_ANIMATIONS_AVAILABLE ? ANIMATIONS.rifleIdle : ANIMATIONS.idle);
  const rifleWalkGltf = useGLTF(WEAPON_ANIMATIONS_AVAILABLE ? ANIMATIONS.rifleWalk : ANIMATIONS.walking);
  const rifleRunGltf = useGLTF(WEAPON_ANIMATIONS_AVAILABLE ? ANIMATIONS.rifleRun : ANIMATIONS.running);
  const pistolIdleGltf = useGLTF(WEAPON_ANIMATIONS_AVAILABLE ? ANIMATIONS.pistolIdle : ANIMATIONS.idle);
  const pistolWalkGltf = useGLTF(WEAPON_ANIMATIONS_AVAILABLE ? ANIMATIONS.pistolWalk : ANIMATIONS.walking);
  const pistolRunGltf = useGLTF(WEAPON_ANIMATIONS_AVAILABLE ? ANIMATIONS.pistolRun : ANIMATIONS.running);

  // Crouch + weapon animations - files don't exist yet, use regular weapon anims as fallback
  const crouchRifleIdleGltf = useGLTF(WEAPON_ANIMATIONS_AVAILABLE ? ANIMATIONS.rifleIdle : ANIMATIONS.idle);
  const crouchRifleWalkGltf = useGLTF(WEAPON_ANIMATIONS_AVAILABLE ? ANIMATIONS.rifleWalk : ANIMATIONS.walking);
  const crouchPistolIdleGltf = useGLTF(WEAPON_ANIMATIONS_AVAILABLE ? ANIMATIONS.pistolIdle : ANIMATIONS.idle);
  const crouchPistolWalkGltf = useGLTF(WEAPON_ANIMATIONS_AVAILABLE ? ANIMATIONS.pistolWalk : ANIMATIONS.walking);

  // Clone scene for this instance
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Debug: log avatar's actual bone names (only once)
    const bones: string[] = [];
    clone.traverse((child) => {
      if ((child as THREE.Bone).isBone) {
        bones.push(child.name);
      }
    });
    if (bones.length > 0) {
      console.log(`🦴 Avatar bones (${bones.length} total):`, bones.slice(0, 10));
    }

    return clone;
  }, [scene]);

  // Strip root motion, scale tracks, and remap bone names from Mixamo format to RPM format
  const stripRootMotion = (clip: THREE.AnimationClip, clipName?: string): THREE.AnimationClip => {
    const newClip = clip.clone();
    // Check config to see if this is a Mixamo animation (needs special track filtering)
    const isMixamoAnim = clipName ? isMixamoAnimation(clipName) : false;

    // Debug: log original tracks for Mixamo anims
    if (isMixamoAnim) {
      console.log(`🔧 Processing ${clipName}: ${newClip.tracks.length} original tracks`);
      console.log(`   Sample tracks:`, newClip.tracks.slice(0, 5).map(t => t.name));
    }

    // Process tracks: remap bone names and filter problematic tracks
    newClip.tracks = newClip.tracks
      .map(track => {
        let newName = track.name;

        // Handle various Mixamo naming conventions from Blender export:
        // 1. "mixamorig:Hips.quaternion" -> "Hips.quaternion"
        // 2. "mixamorigHips.quaternion" -> "Hips.quaternion" (no colon)
        // 3. "Armature|mixamorig:Hips.quaternion" -> "Hips.quaternion"
        // 4. "mixamorig10:Hips.quaternion" -> "Hips.quaternion" (numbered rig)

        // Remove armature prefix if present
        if (newName.includes('|')) {
          newName = newName.split('|').pop() || newName;
        }

        // Remove mixamorig variants (with colon, without, numbered)
        newName = newName.replace(/mixamorig\d*:/g, ''); // mixamorig: or mixamorig10:
        newName = newName.replace(/^mixamorig(\d*)([A-Z])/g, '$2'); // mixamorigHips -> Hips

        if (newName !== track.name) {
          const newTrack = track.clone();
          newTrack.name = newName;
          return newTrack;
        }
        return track;
      })
      .filter(track => {
        // For Mixamo animations (weapons, crouch): ONLY keep quaternion (rotation) tracks
        // EXCEPT for Hips - the Hips rotation would flip the whole character
        // because Mixamo's reference pose differs from RPM's
        if (isMixamoAnim) {
          const isQuaternion = track.name.endsWith('.quaternion');
          const isHips = track.name.startsWith('Hips');

          // For all Mixamo animations (weapons and crouch): keep only rotations, filter Hips
          if (!isQuaternion || isHips) {
            console.log(`   ❌ Filtering track: ${track.name}`);
            return false;
          }
          return true;
        }

        // For regular animations (designed for RPM): keep rotations and non-Hips positions
        if (!track.name.endsWith('.quaternion')) {
          // Allow position tracks only for non-Hips bones
          if (track.name.endsWith('.position') && !track.name.includes('Hips')) {
            return true;
          }
          return false;
        }
        return true;
      });

    if (isMixamoAnim) {
      console.log(`   ✅ Kept ${newClip.tracks.length} tracks after filtering`);
      console.log(`   Sample kept:`, newClip.tracks.slice(0, 5).map(t => t.name));
    }

    return newClip;
  };

  // Track current dance for cycling
  const currentDanceIndex = useRef(0);

  // Collect all animations (with root motion stripped)
  const animations = useMemo(() => {
    const anims: THREE.AnimationClip[] = [];

    // Helper to add animation safely
    const addAnim = (gltf: { animations: THREE.AnimationClip[] }, name: string) => {
      if (gltf.animations[0]) {
        // Pass name to stripRootMotion for debug logging
        const clip = stripRootMotion(gltf.animations[0], name);
        clip.name = name;
        anims.push(clip);
      } else {
        console.warn(`⚠️ No animation found for ${name}`);
      }
    };

    // Core animations
    addAnim(idleGltf, 'idle');
    addAnim(idleVar1Gltf, 'idleVar1');
    addAnim(idleVar2Gltf, 'idleVar2');
    addAnim(walkingGltf, 'walking');
    addAnim(runningGltf, 'running');
    addAnim(jumpGltf, 'jump');
    addAnim(jumpJogGltf, 'jumpJog');
    addAnim(jumpRunGltf, 'jumpRun');
    addAnim(dance1Gltf, 'dance1');
    addAnim(dance2Gltf, 'dance2');
    addAnim(dance3Gltf, 'dance3');

    // Crouch animations (only add if available)
    if (CROUCH_ANIMATIONS_AVAILABLE) {
      addAnim(crouchIdleGltf, 'crouchIdle');
      addAnim(crouchWalkGltf, 'crouchWalk');
      addAnim(crouchStrafeLeftGltf, 'crouchStrafeLeft');
      addAnim(crouchStrafeRightGltf, 'crouchStrafeRight');
      // Crouch transitions (one-shot animations)
      addAnim(standToCrouchGltf, 'standToCrouch');
      addAnim(crouchToStandGltf, 'crouchToStand');
      addAnim(crouchToSprintGltf, 'crouchToSprint');
    }

    // Weapon animations (only add if available)
    if (WEAPON_ANIMATIONS_AVAILABLE) {
      addAnim(rifleIdleGltf, 'rifleIdle');
      addAnim(rifleWalkGltf, 'rifleWalk');
      addAnim(rifleRunGltf, 'rifleRun');
      addAnim(pistolIdleGltf, 'pistolIdle');
      addAnim(pistolWalkGltf, 'pistolWalk');
      addAnim(pistolRunGltf, 'pistolRun');
    }

    // Crouch + weapon animations (only add if both available)
    if (CROUCH_ANIMATIONS_AVAILABLE && WEAPON_ANIMATIONS_AVAILABLE) {
      addAnim(crouchRifleIdleGltf, 'crouchRifleIdle');
      addAnim(crouchRifleWalkGltf, 'crouchRifleWalk');
      addAnim(crouchPistolIdleGltf, 'crouchPistolIdle');
      addAnim(crouchPistolWalkGltf, 'crouchPistolWalk');
    }

    return anims;
  }, [idleGltf.animations, idleVar1Gltf.animations, idleVar2Gltf.animations,
      walkingGltf.animations, runningGltf.animations, jumpGltf.animations,
      jumpJogGltf.animations, jumpRunGltf.animations,
      dance1Gltf.animations, dance2Gltf.animations, dance3Gltf.animations,
      crouchWalkGltf.animations, // crouchIdleGltf uses same ref
      crouchStrafeLeftGltf.animations, crouchStrafeRightGltf.animations,
      standToCrouchGltf.animations, crouchToStandGltf.animations, crouchToSprintGltf.animations,
      rifleIdleGltf.animations, rifleWalkGltf.animations, rifleRunGltf.animations,
      pistolIdleGltf.animations, pistolWalkGltf.animations, pistolRunGltf.animations,
      crouchRifleIdleGltf.animations, crouchRifleWalkGltf.animations,
      crouchPistolIdleGltf.animations, crouchPistolWalkGltf.animations]);

  // Setup animations with the cloned scene
  const { actions } = useAnimations(animations, group);

  // Current animation state
  const currentAction = useRef<string>('idle');
  const lastDanceState = useRef(false);
  const lastCrouchState = useRef(false);
  const crouchTransitionPlaying = useRef<string | null>(null); // Track active transition
  const lastMovementState = useRef({ isMoving: false, isRunning: false });
  const transitionLock = useRef(0); // Prevents rapid state flickering

  // Configure animation properties once on setup
  useEffect(() => {
    if (!actions) return;

    // Debug: log available animations
    console.log('🎬 Available animations:', Object.keys(actions));
    if (WEAPON_ANIMATIONS_AVAILABLE) {
      console.log('🔫 Weapon anims available:',
        ['rifleIdle', 'rifleWalk', 'rifleRun', 'pistolIdle', 'pistolWalk', 'pistolRun']
          .map(n => `${n}: ${actions[n] ? '✓' : '✗'}`).join(', '));

      // Debug: Show track names from weapon animations
      const pistolAction = actions['pistolIdle'];
      if (pistolAction) {
        const clip = pistolAction.getClip();
        console.log(`🔫 pistolIdle clip tracks (${clip.tracks.length}):`,
          clip.tracks.slice(0, 8).map(t => t.name));
      }

      // Debug: Show avatar bone names for comparison
      if (group.current) {
        const bones: string[] = [];
        group.current.traverse((child) => {
          if ((child as THREE.Bone).isBone && bones.length < 10) {
            bones.push(child.name);
          }
        });
        console.log('🦴 Avatar bones for comparison:', bones);
      }
    }

    // Configure all actions with loop modes from config (looping vs one-shot)
    configureAllActions(actions);
  }, [actions]);

  // Handle crouch transition animation completion
  useEffect(() => {
    if (!actions) return;

    const handleFinished = (e: { action: THREE.AnimationAction }) => {
      const finishedClip = e.action.getClip().name;
      // Clear transition state when a transition animation finishes
      if (finishedClip === 'standToCrouch' || finishedClip === 'crouchToStand' || finishedClip === 'crouchToSprint') {
        crouchTransitionPlaying.current = null;
      }
    };

    // Get the mixer from any action
    const mixer = actions.idle?.getMixer();
    if (mixer) {
      mixer.addEventListener('finished', handleFinished);
      return () => {
        mixer.removeEventListener('finished', handleFinished);
      };
    }
  }, [actions]);

  // Handle animation transitions
  useEffect(() => {
    if (!actions) return;

    // Transition cooldown to prevent flickering
    const now = Date.now();
    if (now - transitionLock.current < 50) return; // 50ms debounce

    // Detect crouch state changes
    const justStartedCrouching = isCrouching && !lastCrouchState.current;
    const justStoppedCrouching = !isCrouching && lastCrouchState.current;
    lastCrouchState.current = isCrouching;

    // Determine target animation based on priority
    let targetAction = 'idle';

    if (isDancing && !isMoving && !weaponType) {
      // Cycle through dances when E is pressed (only without weapon)
      if (!lastDanceState.current) {
        currentDanceIndex.current = (currentDanceIndex.current + 1) % 3;
      }
      targetAction = `dance${currentDanceIndex.current + 1}`;
    } else if (isJumping) {
      // Contextual jump - use previous movement state to pick animation
      const wasRunning = lastMovementState.current.isRunning;
      const wasMoving = lastMovementState.current.isMoving;
      if (wasRunning) {
        targetAction = 'jumpRun';
      } else if (wasMoving) {
        targetAction = 'jumpJog';
      } else {
        targetAction = 'jump';
      }
    } else if (justStartedCrouching && CROUCH_ANIMATIONS_AVAILABLE) {
      // Entering crouch - play stand to crouch transition
      targetAction = 'standToCrouch';
      crouchTransitionPlaying.current = 'standToCrouch';
    } else if (justStoppedCrouching && CROUCH_ANIMATIONS_AVAILABLE) {
      // Exiting crouch - play crouch to stand transition
      targetAction = 'crouchToStand';
      crouchTransitionPlaying.current = 'crouchToStand';
    } else if (crouchTransitionPlaying.current) {
      // Transition is playing - don't interrupt it
      return;
    } else if (isCrouching && isRunning && CROUCH_ANIMATIONS_AVAILABLE) {
      // Trying to sprint while crouching - play crouch to sprint transition
      targetAction = 'crouchToSprint';
      crouchTransitionPlaying.current = 'crouchToSprint';
      // Note: After this transition, isCrouching should be set to false by the controller
    } else if (isCrouching && CROUCH_ANIMATIONS_AVAILABLE && WEAPON_ANIMATIONS_AVAILABLE && weaponType) {
      // Crouching with weapon - use crouch weapon animations
      if (weaponType === 'rifle') {
        targetAction = isMoving ? 'crouchRifleWalk' : 'crouchRifleIdle';
      } else if (weaponType === 'pistol') {
        targetAction = isMoving ? 'crouchPistolWalk' : 'crouchPistolIdle';
      }
      // Fall back to regular crouch if crouch weapon animation doesn't exist
      if (!actions[targetAction]) {
        targetAction = 'crouchWalk'; // Use walk for both idle and moving
      }
    } else if (isCrouching && CROUCH_ANIMATIONS_AVAILABLE) {
      // Crouching without weapon
      if (isStrafingLeft) {
        targetAction = 'crouchStrafeLeft';
      } else if (isStrafingRight) {
        targetAction = 'crouchStrafeRight';
      } else {
        // Use crouchWalk for both idle and moving (no proper crouchIdle animation yet)
        targetAction = 'crouchWalk';
      }
    } else if (isCrouching) {
      // Crouching but no crouch animations available - use walking as fallback
      // This at least shows the crouch state is being detected
      targetAction = isMoving ? 'walking' : 'idle';
    } else if (WEAPON_ANIMATIONS_AVAILABLE && weaponType) {
      // Standing with weapon - use weapon-specific animations
      if (weaponType === 'rifle') {
        if (isRunning) targetAction = 'rifleRun';
        else if (isMoving) targetAction = 'rifleWalk';
        else targetAction = 'rifleIdle';
      } else if (weaponType === 'pistol') {
        if (isRunning) targetAction = 'pistolRun';
        else if (isMoving) targetAction = 'pistolWalk';
        else targetAction = 'pistolIdle';
      }
      // Fall back to regular animation if weapon animation doesn't exist
      if (!actions[targetAction]) {
        targetAction = isRunning ? 'running' : isMoving ? 'walking' : 'idle';
      }
    } else if (weaponType) {
      // Weapon equipped but no weapon animations available - use regular animations
      targetAction = isRunning ? 'running' : isMoving ? 'walking' : 'idle';
    } else if (isMoving) {
      targetAction = isRunning ? 'running' : 'walking';
    }

    lastDanceState.current = isDancing;
    // Only update movement state when grounded (not during jump)
    if (!isJumping) {
      lastMovementState.current = { isMoving, isRunning };
    }

    if (targetAction !== currentAction.current) {
      const prevAction = actions[currentAction.current];
      const nextAction = actions[targetAction];

      if (prevAction && nextAction) {
        // Smooth crossfade - duration from config (dance=0.3, jump=0.1, default=0.15)
        const fadeDuration = getFadeTime(targetAction);

        // Stop previous animation gracefully
        prevAction.fadeOut(fadeDuration);

        // Start next animation
        nextAction.reset();
        nextAction.fadeIn(fadeDuration);
        nextAction.play();

        // Lock transitions briefly
        transitionLock.current = now;
      } else if (nextAction) {
        nextAction.reset().play();
      }

      currentAction.current = targetAction;
    }
  }, [isMoving, isRunning, isJumping, isDancing, isCrouching, isStrafingLeft, isStrafingRight, weaponType, actions]);

  // Start idle animation on mount
  useEffect(() => {
    if (actions?.idle) {
      actions.idle.play();
    }
  }, [actions]);

  // Crouch offset - smoothly lower the character visually when crouching
  // Since we filter position tracks from Mixamo animations, we need to manually offset
  const CROUCH_Y_OFFSET = -0.35;
  const CROUCH_LERP_SPEED = 8; // How fast to transition

  useFrame((_, delta) => {
    if (!avatarRef.current) return;

    // Smoothly interpolate toward target offset
    const targetOffset = isCrouching ? CROUCH_Y_OFFSET : 0;
    crouchOffset.current += (targetOffset - crouchOffset.current) * Math.min(1, CROUCH_LERP_SPEED * delta);

    // Apply to avatar group position
    avatarRef.current.position.y = crouchOffset.current;
  });

  return (
    <group ref={group}>
      {/* RPM avatar - positioned so feet are on ground, lowered when crouching */}
      <group ref={avatarRef}>
        <primitive object={clonedScene} position={[0, 0, 0]} />
      </group>
      {/* Weapon attachment */}
      {weaponType && (
        <WeaponAttachment
          weaponType={weaponType}
          avatarRef={avatarRef}
        />
      )}
    </group>
  );
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

// Collision detection constants
const PLAYER_RADIUS = 0.5; // Player collision radius
const COLLISION_CHECK_HEIGHT = 1.0; // Height at which to check collisions (chest level)

// Validate avatar URL - must be a valid HTTPS URL ending with .glb
function isValidAvatarUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    // Must be HTTPS and end with .glb
    if (parsed.protocol !== 'https:') return false;
    if (!url.includes('.glb')) return false;
    // Must be from readyplayer.me and be a models URL (not a subdomain like 'producer-tour-play')
    if (parsed.hostname.endsWith('readyplayer.me')) {
      // Valid RPM URLs are like: https://models.readyplayer.me/{id}.glb
      return parsed.hostname === 'models.readyplayer.me';
    }
    return false;
  } catch {
    return false;
  }
}

// Legacy player controller with movement (non-physics, kept as fallback)
export function LegacyPlayerController({
  avatarUrl,
  onPositionChange,
}: {
  avatarUrl?: string;
  onPositionChange?: (pos: THREE.Vector3, rotation?: THREE.Euler) => void;
}) {
  const keys = useKeyboardControls();
  const playerRef = useRef<THREE.Group>(null!);
  const { camera, scene } = useThree();

  // Validate avatar URL - skip invalid URLs to prevent fetch errors
  const validAvatarUrl = isValidAvatarUrl(avatarUrl) ? avatarUrl : undefined;

  const velocity = useRef(new THREE.Vector3());
  const facingAngle = useRef(0);
  const [isMoving, setIsMoving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Raycaster for collision detection
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  // Reusable vectors to avoid GC pressure (allocated once, reused every frame)
  const tempVectors = useRef({
    cameraDir: new THREE.Vector3(),
    cameraRight: new THREE.Vector3(),
    moveDir: new THREE.Vector3(),
    targetVel: new THREE.Vector3(),
    upVector: new THREE.Vector3(0, 1, 0),
    zeroVel: new THREE.Vector3(0, 0, 0),
    rayOrigin: new THREE.Vector3(),
    rayDir: new THREE.Vector3(),
    dirX: new THREE.Vector3(),
    dirZ: new THREE.Vector3(),
  });

  // Cache collidable objects (rebuild when scene changes significantly)
  const collidablesRef = useRef<THREE.Object3D[]>([]);
  const lastCollidableUpdate = useRef(0);

  // Update collidables cache periodically (not every frame)
  const updateCollidables = useCallback(() => {
    const now = Date.now();
    if (now - lastCollidableUpdate.current < 1000) return; // Only update every second
    lastCollidableUpdate.current = now;

    const collidables: THREE.Object3D[] = [];
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const name = mesh.name.toLowerCase();
        // Only collide with buildings, fences, walls
        if (name.includes('fence') || name.includes('building') ||
            name.includes('wall') || name.includes('reja')) {
          collidables.push(obj);
        }
      }
    });
    collidablesRef.current = collidables;
  }, [scene]);

  // Check for collision in a given direction (horizontal only, uses reusable vectors)
  const checkCollision = useCallback((
    posX: number,
    posZ: number,
    dirX: number,
    dirZ: number,
    distance: number
  ): boolean => {
    updateCollidables();

    if (collidablesRef.current.length === 0) return false;

    const vecs = tempVectors.current;

    // Set raycaster origin at player's chest height
    vecs.rayOrigin.set(posX, COLLISION_CHECK_HEIGHT, posZ);
    vecs.rayDir.set(dirX, 0, dirZ).normalize(); // Horizontal collision only

    raycaster.set(vecs.rayOrigin, vecs.rayDir);
    raycaster.far = distance + PLAYER_RADIUS;

    const intersects = raycaster.intersectObjects(collidablesRef.current, true);
    return intersects.length > 0 && intersects[0].distance < distance + PLAYER_RADIUS;
  }, [raycaster, updateCollidables]);

  useFrame((_, delta) => {
    if (!playerRef.current) return;

    const vecs = tempVectors.current;
    const pos = playerRef.current.position;

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

      // Get camera's horizontal direction (ignore Y component) - reuse vector
      camera.getWorldDirection(vecs.cameraDir);
      vecs.cameraDir.y = 0;
      vecs.cameraDir.normalize();

      // Calculate camera's right vector - reuse vectors
      vecs.upVector.set(0, 1, 0);
      vecs.cameraRight.crossVectors(vecs.cameraDir, vecs.upVector).normalize();

      // Calculate world-space movement direction relative to camera - reuse vector
      vecs.moveDir.set(0, 0, 0);
      vecs.moveDir.addScaledVector(vecs.cameraDir, -inputZ); // Forward/back relative to camera
      vecs.moveDir.addScaledVector(vecs.cameraRight, inputX); // Left/right relative to camera
      vecs.moveDir.normalize();

      // Calculate speed
      const speed = keys.sprint ? SPRINT_SPEED : WALK_SPEED;

      // Set target velocity - reuse vector
      vecs.targetVel.copy(vecs.moveDir).multiplyScalar(speed);
      velocity.current.lerp(vecs.targetVel, 1 - Math.exp(-10 * delta));

      // Calculate target facing angle (direction of movement)
      const targetAngle = Math.atan2(vecs.moveDir.x, vecs.moveDir.z);

      // Smoothly rotate player to face movement direction
      let angleDiff = targetAngle - facingAngle.current;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      facingAngle.current += angleDiff * Math.min(1, delta * ROTATION_SPEED);

      playerRef.current.rotation.y = facingAngle.current;
    } else {
      // Decelerate when no input - reuse zero vector
      vecs.zeroVel.set(0, 0, 0);
      velocity.current.lerp(vecs.zeroVel, 1 - Math.exp(-8 * delta));
    }

    // Calculate proposed movement
    const proposedX = velocity.current.x * delta;
    const proposedZ = velocity.current.z * delta;

    // Check X movement (use primitive values to avoid object allocation)
    if (Math.abs(proposedX) > 0.001) {
      const signX = Math.sign(proposedX);
      if (!checkCollision(pos.x, pos.z, signX, 0, Math.abs(proposedX))) {
        pos.x += proposedX;
      } else {
        velocity.current.x = 0; // Stop X velocity on collision
      }
    }

    // Check Z movement
    if (Math.abs(proposedZ) > 0.001) {
      const signZ = Math.sign(proposedZ);
      if (!checkCollision(pos.x, pos.z, 0, signZ, Math.abs(proposedZ))) {
        pos.z += proposedZ;
      } else {
        velocity.current.z = 0; // Stop Z velocity on collision
      }
    }

    // Keep on ground
    pos.y = GROUND_Y;

    // Report position and rotation (only allocate when callback exists)
    if (onPositionChange) {
      onPositionChange(pos.clone(), playerRef.current.rotation.clone());
    }
  });

  // Use placeholder if no valid avatar URL
  const shouldShowAvatar = !!validAvatarUrl;

  return (
    <>
      <group ref={playerRef} position={[30, GROUND_Y, -20]}>
        <Suspense fallback={<PlaceholderAvatar isMoving={isMoving} />}>
          {shouldShowAvatar ? (
            USE_MIXAMO_ANIMATIONS ? (
              <AnimationErrorBoundary
                fallback={
                  <AnimatedAvatar
                    url={validAvatarUrl}
                    isMoving={isMoving}
                    isRunning={isRunning}
                  />
                }
              >
                <MixamoAnimatedAvatar
                  url={validAvatarUrl}
                  isMoving={isMoving}
                  isRunning={isRunning}
                />
              </AnimationErrorBoundary>
            ) : (
              <AnimatedAvatar
                url={validAvatarUrl}
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

// Inner Basketball Court component that loads assets
function BasketballCourtModel({ posX, posY, posZ, rotY, scale }: {
  posX: number;
  posY: number;
  posZ: number;
  rotY: number;
  scale: number;
}) {
  // Load the court FBX (textures will 404 but we'll reassign them)
  const court = useFBX(`${ASSETS_URL}/models/basketball-court/Court.fbx`);

  // Load all textures from R2 CDN
  const textures = useTexture({
    court: `${ASSETS_URL}/models/basketball-court/textures/court.png`,
    floor1: `${ASSETS_URL}/models/basketball-court/textures/floor1.png`,
    floor2: `${ASSETS_URL}/models/basketball-court/textures/floor2.png`,
    hoop1: `${ASSETS_URL}/models/basketball-court/textures/hoop1.png`,
    hoop2: `${ASSETS_URL}/models/basketball-court/textures/hoop2.png`,
    hoop3: `${ASSETS_URL}/models/basketball-court/textures/hoop3.png`,
    hoop4: `${ASSETS_URL}/models/basketball-court/textures/hoop4.png`,
    hoop5: `${ASSETS_URL}/models/basketball-court/textures/hoop5.png`,
    fence1: `${ASSETS_URL}/models/basketball-court/textures/fence1.png`,
    fence2: `${ASSETS_URL}/models/basketball-court/textures/fence2.png`,
    fence1Alpha: `${ASSETS_URL}/models/basketball-court/textures/fence1_alpha.png`,
    metalfence: `${ASSETS_URL}/models/basketball-court/textures/metalfence.png`,
    building1: `${ASSETS_URL}/models/basketball-court/textures/building1.png`,
    building2: `${ASSETS_URL}/models/basketball-court/textures/building2.png`,
    window1: `${ASSETS_URL}/models/basketball-court/textures/window1.png`,
    window2: `${ASSETS_URL}/models/basketball-court/textures/window2.png`,
  });

  // Track if we've already processed the model
  const processedRef = useRef(false);

  // Clone and setup model with manual texture assignment (only once)
  const model = useMemo(() => {
    const clone = court.clone();

    // Log mesh names for debugging (only once)
    if (!processedRef.current) {
      console.log('🏀 Basketball Court - Mesh names in model:');
      const meshNames: string[] = [];
      clone.traverse((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((mat) => {
            const m = mat as THREE.MeshStandardMaterial;
            meshNames.push(`  Mesh: "${mesh.name}" | Material: "${m.name}"`);
          });
        }
      });
      meshNames.forEach(n => console.log(n));
      console.log('🏀 Total meshes:', meshNames.length);
      processedRef.current = true;
    }

    // Texture assignment - material names match texture file names exactly
    const textureMap: Record<string, { tex: THREE.Texture; isFence: boolean }> = {
      'court': { tex: textures.court, isFence: false },
      'floor1': { tex: textures.floor1, isFence: false },
      'floor2': { tex: textures.floor2, isFence: false },
      'hoop1': { tex: textures.hoop1, isFence: false },
      'hoop2': { tex: textures.hoop2, isFence: false },
      'hoop3': { tex: textures.hoop3, isFence: false },
      'hoop4': { tex: textures.hoop4, isFence: false },
      'hoop5': { tex: textures.hoop5, isFence: false },
      'fence1': { tex: textures.fence1, isFence: true },  // Chainlink with alpha
      'fence2': { tex: textures.fence2, isFence: false },
      'metalfence': { tex: textures.metalfence, isFence: false },
      'building1': { tex: textures.building1, isFence: false },
      'building2': { tex: textures.building2, isFence: false },
      'window1': { tex: textures.window1, isFence: false },
      'window2': { tex: textures.window2, isFence: false },
    };

    const getTexture = (_meshName: string, matName: string): { tex: THREE.Texture; isFence: boolean } => {
      const key = matName.toLowerCase();
      return textureMap[key] || { tex: textures.floor1, isFence: false };
    };

    // Apply textures to all meshes
    clone.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        materials.forEach((mat, idx) => {
          const m = mat as THREE.MeshStandardMaterial;
          const { tex, isFence } = getTexture(mesh.name, m.name);

          if (isFence) {
            // Chainlink fence with alpha transparency
            const newMat = new THREE.MeshStandardMaterial({
              map: tex,
              alphaMap: textures.fence1Alpha,
              transparent: true,
              alphaTest: 0.5,
              side: THREE.DoubleSide,
              metalness: 0.7,
              roughness: 0.4,
            });
            if (Array.isArray(mesh.material)) {
              mesh.material[idx] = newMat;
            } else {
              mesh.material = newMat;
            }
          } else {
            // Regular texture assignment
            m.map = tex;
            m.needsUpdate = true;
          }
        });
      }
    });

    return clone;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [court]);

  return (
    <primitive
      object={model}
      position={[posX, posY, posZ]}
      rotation={[0, rotY, 0]}
      scale={scale}
    />
  );
}

// Basketball Court - positioned and scaled for the play world
// Court dimensions at scale 0.01: approximately 28m x 15m
const COURT_BOUNDS = {
  width: 14,      // Half-width (total 28m)
  depth: 8,       // Half-depth (total 16m)
  fenceHeight: 3, // Fence height in meters
  fenceThickness: 0.3,
};

function BasketballCourt() {
  // Fixed position values (previously configured with Leva debug controls)
  const posX = 30;
  const posY = 0;
  const posZ = -20;
  const rotY = 0;
  const scale = 0.01;

  // Skip if no ASSETS_URL configured
  if (!ASSETS_URL) {
    return null;
  }

  return (
    <RigidBody type="fixed" colliders={false} position={[posX, posY, posZ]}>
      {/* Court visual model */}
      <BasketballCourtModel
        posX={0}
        posY={0}
        posZ={0}
        rotY={rotY}
        scale={scale}
      />

      {/* Fence colliders - invisible walls around the court */}
      {/* North fence */}
      <CuboidCollider
        args={[COURT_BOUNDS.width, COURT_BOUNDS.fenceHeight, COURT_BOUNDS.fenceThickness]}
        position={[0, COURT_BOUNDS.fenceHeight, -COURT_BOUNDS.depth]}
      />
      {/* South fence */}
      <CuboidCollider
        args={[COURT_BOUNDS.width, COURT_BOUNDS.fenceHeight, COURT_BOUNDS.fenceThickness]}
        position={[0, COURT_BOUNDS.fenceHeight, COURT_BOUNDS.depth]}
      />
      {/* East fence */}
      <CuboidCollider
        args={[COURT_BOUNDS.fenceThickness, COURT_BOUNDS.fenceHeight, COURT_BOUNDS.depth]}
        position={[COURT_BOUNDS.width, COURT_BOUNDS.fenceHeight, 0]}
      />
      {/* West fence */}
      <CuboidCollider
        args={[COURT_BOUNDS.fenceThickness, COURT_BOUNDS.fenceHeight, COURT_BOUNDS.depth]}
        position={[-COURT_BOUNDS.width, COURT_BOUNDS.fenceHeight, 0]}
      />

      {/* Hoop poles - cylindrical colliders approximated as thin boxes */}
      <CuboidCollider args={[0.15, 2, 0.15]} position={[-12, 2, 0]} />
      <CuboidCollider args={[0.15, 2, 0.15]} position={[12, 2, 0]} />
    </RigidBody>
  );
}

// Animation names from the monkey GLB
const MONKEY_ANIMS = {
  idle: 'Armature|Idle',
  idle2: 'Armature|Idle2',
  run: 'Armature|Run',
  eat: 'Armature|Eat',
  roar: 'Armature|Roar',
  smile: 'Armature|Smile',
  jump: 'Armature|Jump',
  sit: 'Armature|Sit',
  sitIdle: 'Armature|SitIdle',
};

type MonkeyAnimState = 'idle' | 'run' | 'special';

// Animated Monkey NPC that wanders around the basketball court
function MonkeyNPC({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<Record<string, THREE.AnimationAction>>({});
  const currentAnimRef = useRef<MonkeyAnimState>('idle');
  const currentActionRef = useRef<string>(MONKEY_ANIMS.idle);

  // Wandering state
  const wanderState = useRef({
    targetX: position[0],
    targetZ: position[2],
    waitTime: 2,
    speed: 0.8,
    isMoving: false,
    specialActionTime: 0, // Time until next special action
    isDoingSpecial: false,
    specialDuration: 0,
  });

  // Procedural animation state
  const proceduralState = useRef({
    breathPhase: 0,
    lookPhase: 0,
    bobPhase: 0,
    currentRotY: 0,
    targetRotY: 0,
  });

  // Load the monkey GLB model from R2 CDN
  const gltf = useGLTF(`${ASSETS_URL}/models/Monkey/Monkey.glb`);

  // Load the diffuse texture (only used if model doesn't have embedded textures)
  const diffuseTexture = useTexture(`${ASSETS_URL}/models/Monkey/Textures_B3/Monkey_B3_diffuse_1k.jpg`);

  // Check if model has embedded textures
  const hasEmbeddedTextures = useMemo(() => {
    let hasTextures = false;
    gltf.scene.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((mat) => {
          if ((mat as THREE.MeshStandardMaterial).map) {
            hasTextures = true;
          }
        });
      }
    });
    return hasTextures;
  }, [gltf.scene]);

  // Clone and set up model
  const { model, scale } = useMemo(() => {
    const clone = SkeletonUtils.clone(gltf.scene);

    // Calculate scale - 150x smaller than human-sized (1.8m / 150 = 0.012m)
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const autoScale = maxDim > 0 ? 0.012 / maxDim : 0.01;

    return { model: clone, scale: autoScale };
  }, [gltf]);

  // Apply material and set up animations
  useEffect(() => {
    if (!model) return;

    // Log mesh and material info for debugging
    console.log('🐵 Monkey mesh structure:');
    model.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        console.log(`  Mesh: "${mesh.name}" | Materials: ${materials.length}`);
        materials.forEach((mat, i) => {
          const m = mat as THREE.MeshStandardMaterial;
          console.log(`    [${i}] "${m.name}" | hasMap: ${!!m.map}`);
        });
      }
    });

    // Apply texture and fix transparency
    model.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((_mat, idx) => {
          // Create new material with proper settings
          const newMat = new THREE.MeshStandardMaterial({
            map: diffuseTexture,
            metalness: 0.2,
            roughness: 0.8,
            transparent: false,
            opacity: 1,
            side: THREE.FrontSide,
            alphaTest: 0,
          });

          // Ensure texture is set to repeat properly
          if (diffuseTexture) {
            diffuseTexture.flipY = false; // GLB models typically need flipY = false
            diffuseTexture.needsUpdate = true;
          }

          if (Array.isArray(mesh.material)) {
            mesh.material[idx] = newMat;
          } else {
            mesh.material = newMat;
          }
        });
      }
    });

    console.log('🐵 Monkey has embedded textures:', hasEmbeddedTextures);

    // Set up animation mixer
    if (gltf.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(model);
      mixerRef.current = mixer;

      // Remove root motion from animation to prevent drifting
      const removeRootMotion = (clip: THREE.AnimationClip): THREE.AnimationClip => {
        const filteredTracks = clip.tracks.filter(track => {
          if (track.name.endsWith('.position')) return false;
          if (track.name.endsWith('.quaternion') || track.name.endsWith('.rotation')) {
            const boneName = track.name.split('.')[0].toLowerCase();
            if (boneName.includes('root') || boneName.includes('armature')) return false;
          }
          return true;
        });
        return new THREE.AnimationClip(clip.name, clip.duration, filteredTracks);
      };

      // Create actions for all animations
      gltf.animations.forEach(clip => {
        const cleanedClip = removeRootMotion(clip);
        const action = mixer.clipAction(cleanedClip);
        action.setLoop(THREE.LoopRepeat, Infinity);
        actionsRef.current[clip.name] = action;
      });

      // Start with idle animation
      const idleAction = actionsRef.current[MONKEY_ANIMS.idle];
      if (idleAction) {
        idleAction.timeScale = 0.8;
        idleAction.play();
      }

      // Schedule first special action
      wanderState.current.specialActionTime = 5 + Math.random() * 10;
    }

    return () => {
      mixerRef.current?.stopAllAction();
    };
  }, [model, diffuseTexture, hasEmbeddedTextures, gltf.animations]);

  // Crossfade to a specific animation
  const crossfadeTo = useCallback((animName: string, duration = 0.3, timeScale = 1.0) => {
    if (currentActionRef.current === animName) return;

    const fromAction = actionsRef.current[currentActionRef.current];
    const toAction = actionsRef.current[animName];

    if (fromAction && toAction) {
      fromAction.fadeOut(duration);
      toAction.reset().setEffectiveTimeScale(timeScale).setEffectiveWeight(1).fadeIn(duration).play();
    } else if (toAction) {
      toAction.reset().setEffectiveTimeScale(timeScale).play();
    }

    currentActionRef.current = animName;
  }, []);

  // Play a special action (one-shot or short loop)
  const playSpecialAction = useCallback(() => {
    const specials = [
      { name: MONKEY_ANIMS.eat, duration: 2.5, timeScale: 1.0 },
      { name: MONKEY_ANIMS.roar, duration: 1.5, timeScale: 1.0 },
      { name: MONKEY_ANIMS.smile, duration: 2.0, timeScale: 0.8 },
      { name: MONKEY_ANIMS.idle2, duration: 3.0, timeScale: 0.7 },
      { name: MONKEY_ANIMS.jump, duration: 1.0, timeScale: 1.2 },
    ];

    const special = specials[Math.floor(Math.random() * specials.length)];
    const action = actionsRef.current[special.name];

    if (action) {
      crossfadeTo(special.name, 0.2, special.timeScale);
      wanderState.current.isDoingSpecial = true;
      wanderState.current.specialDuration = special.duration;
      currentAnimRef.current = 'special';
    }
  }, [crossfadeTo]);

  // Animate: update mixer and wander around
  useFrame((_, delta) => {
    if (!groupRef.current || !modelRef.current) return;

    // Update animation mixer
    mixerRef.current?.update(delta);

    const pos = groupRef.current.position;
    const state = wanderState.current;
    const proc = proceduralState.current;

    // Update procedural animation phases
    proc.breathPhase += delta * 2;
    proc.lookPhase += delta * 0.5;
    proc.bobPhase += delta * 8;

    // Handle special action duration
    if (state.isDoingSpecial) {
      state.specialDuration -= delta;
      if (state.specialDuration <= 0) {
        state.isDoingSpecial = false;
        state.specialActionTime = 8 + Math.random() * 15; // Next special in 8-23 seconds
        crossfadeTo(MONKEY_ANIMS.idle, 0.3, 0.8);
        currentAnimRef.current = 'idle';
      }
      return; // Don't move during special actions
    }

    // Check for special action trigger (only when idle)
    if (!state.isMoving && state.waitTime > 0) {
      state.specialActionTime -= delta;
      if (state.specialActionTime <= 0) {
        playSpecialAction();
        return;
      }
    }

    // Waiting state - idle animation with procedural details
    if (state.waitTime > 0) {
      state.waitTime -= delta;

      if (state.isMoving) {
        state.isMoving = false;
        crossfadeTo(MONKEY_ANIMS.idle, 0.3, 0.8);
        currentAnimRef.current = 'idle';
      }

      // Subtle breathing/idle movement
      const breathOffset = Math.sin(proc.breathPhase) * 0.0001;
      modelRef.current.position.y = breathOffset;

      // Occasional look around (head/body slight rotation)
      const lookOffset = Math.sin(proc.lookPhase) * 0.15;
      modelRef.current.rotation.y = lookOffset;

      // Reset lean
      modelRef.current.rotation.x = 0;

    } else {
      // Moving state
      const dx = state.targetX - pos.x;
      const dz = state.targetZ - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 0.3) {
        // Reached target, pick a new one
        state.waitTime = 2 + Math.random() * 4;
        const courtCenterX = position[0];
        const courtCenterZ = position[2];
        const wanderRadius = 5;
        state.targetX = courtCenterX + (Math.random() - 0.5) * wanderRadius * 2;
        state.targetZ = courtCenterZ + (Math.random() - 0.5) * wanderRadius * 2;
      } else {
        if (!state.isMoving) {
          state.isMoving = true;
          crossfadeTo(MONKEY_ANIMS.run, 0.2, 1.0);
          currentAnimRef.current = 'run';
        }

        // Move towards target
        const moveSpeed = state.speed * delta;
        pos.x += (dx / dist) * moveSpeed;
        pos.z += (dz / dist) * moveSpeed;

        // Smooth rotation to face movement direction
        proc.targetRotY = Math.atan2(dx, dz);
        let rotDiff = proc.targetRotY - proc.currentRotY;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        proc.currentRotY += rotDiff * Math.min(1, delta * 5);
        groupRef.current.rotation.y = proc.currentRotY;

        // Walking bob
        const bobOffset = Math.abs(Math.sin(proc.bobPhase)) * 0.0002;
        modelRef.current.position.y = bobOffset;

        // Slight body lean while running
        modelRef.current.rotation.x = 0.08;
        modelRef.current.rotation.y = 0;
      }
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <group ref={modelRef}>
        <primitive object={model} scale={scale} />
      </group>
    </group>
  );
}

// Preload monkey model
useGLTF.preload(`${ASSETS_URL}/models/Monkey/Monkey.glb`);

// Main world component
export function PlayWorld({
  avatarUrl,
  onPlayerPositionChange,
  onMultiplayerReady,
}: {
  avatarUrl?: string;
  onPlayerPositionChange?: (pos: THREE.Vector3) => void;
  onMultiplayerReady?: (data: { playerCount: number; isConnected: boolean }) => void;
}) {
  const [playerPos, setPlayerPos] = useState(new THREE.Vector3(0, 0, 5));
  const playerRotation = useRef(new THREE.Euler());
  const [physicsDebug, setPhysicsDebug] = useState(false);
  const [weaponType, setWeaponType] = useState<WeaponType>(null);

  // Weapon toggle (Q key) - cycles: none -> pistol -> rifle -> none
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyQ') {
        e.preventDefault();
        setWeaponType(prev => {
          const next = prev === null ? 'pistol' : prev === 'pistol' ? 'rifle' : null;
          console.log('🔫 Weapon:', next || 'none');
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Physics debug toggle (F3 key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'F3') {
        e.preventDefault();
        setPhysicsDebug(prev => {
          console.log(`🔧 Physics debug: ${!prev ? 'ON' : 'OFF'}`);
          return !prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Multiplayer - connect to play room
  const { otherPlayers, playerCount, isConnected, updatePosition } = usePlayMultiplayer({
    enabled: true,
    avatarUrl,
  });

  // Notify parent of multiplayer status
  useEffect(() => {
    onMultiplayerReady?.({ playerCount, isConnected });
  }, [playerCount, isConnected, onMultiplayerReady]);

  const handlePositionChange = useCallback((pos: THREE.Vector3, rotation?: THREE.Euler) => {
    setPlayerPos(pos);
    if (rotation) {
      playerRotation.current.copy(rotation);
    }
    onPlayerPositionChange?.(pos);

    // Update multiplayer position
    updatePosition(pos, playerRotation.current);
  }, [onPlayerPositionChange, updatePosition]);

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

      {/* Physics World - Suspense needed for Rapier WASM loading */}
      {/* Press F3 to toggle debug visualization */}
      <Suspense fallback={null}>
        <Physics gravity={[0, -20, 0]} timeStep={1/60} debug={physicsDebug}>
          {/* Ground Collider */}
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[250, 0.1, 250]} position={[0, -0.1, 0]} />
          </RigidBody>

          {/* Ground Visual */}
          <CyberpunkGround />

          {/* Basketball Court */}
          <Suspense fallback={null}>
            <BasketballCourt />
            {/* Animated Monkey NPC on the court */}
            <MonkeyNPC position={[32, 0.01, -18]} />
          </Suspense>

          {/* Physics Player Controller with animation state */}
          <PhysicsPlayerController onPositionChange={handlePositionChange}>
            {({ isMoving, isRunning, isJumping, isDancing, isCrouching, isStrafingLeft, isStrafingRight }) => (
              <Suspense fallback={<PlaceholderAvatar isMoving={false} />}>
                {avatarUrl ? (
                  USE_MIXAMO_ANIMATIONS ? (
                    <AnimationErrorBoundary
                      fallback={<AnimatedAvatar url={avatarUrl} isMoving={isMoving} isRunning={isRunning} />}
                    >
                      <MixamoAnimatedAvatar
                        url={avatarUrl}
                        isMoving={isMoving}
                        isRunning={isRunning}
                        isJumping={isJumping}
                        isDancing={isDancing}
                        isCrouching={isCrouching}
                        isStrafingLeft={isStrafingLeft}
                        isStrafingRight={isStrafingRight}
                        weaponType={weaponType}
                      />
                    </AnimationErrorBoundary>
                  ) : (
                    <AnimatedAvatar url={avatarUrl} isMoving={isMoving} isRunning={isRunning} />
                  )
                ) : (
                  <PlaceholderAvatar isMoving={isMoving} />
                )}
              </Suspense>
            )}
          </PhysicsPlayerController>

          {/* Contact shadow - sits just above ground */}
          <ContactShadows
            position={[playerPos.x, 0.005, playerPos.z]}
            opacity={0.6}
            scale={10}
            blur={1.5}
            far={3}
            color="#8b5cf6"
          />
        </Physics>
      </Suspense>

      {/* Other Players (multiplayer) - outside physics for performance */}
      <OtherPlayers players={otherPlayers} />

      {/* Zones */}
      {zones.map((zone) => (
        <ZoneMarker key={zone.label} {...zone} />
      ))}

      {/* Spawn indicator - at basketball court center */}
      <mesh position={[30, 0.006, -20]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1, 32]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.3} />
      </mesh>

      {/* VFX Manager - renders all active visual effects */}
      <VFXManager />

      {/* NPC Manager - renders all NPCs in scene */}
      <NPCManager
        playerPosition={{ x: playerPos.x, y: playerPos.y, z: playerPos.z }}
        renderDistance={50}
        initialNPCs={[
          // Wandering NPC near spawn
          createNPC({
            position: { x: 5, y: 0, z: 0 },
            behavior: 'wander',
            name: 'Producer Bob',
            type: 'friendly',
          }),
          // Patrolling NPC around the zones
          createPatrolNPC(
            'Guard',
            [
              { x: 10, y: 0, z: -10 },
              { x: -10, y: 0, z: -10 },
              { x: -10, y: 0, z: 10 },
              { x: 10, y: 0, z: 10 },
            ],
            { type: 'neutral' }
          ),
          // Idle NPC at marketplace
          createNPC({
            position: { x: -20, y: 0, z: 5 },
            behavior: 'idle',
            name: 'Merchant',
            type: 'friendly',
          }),
        ]}
      />
    </>
  );
}
