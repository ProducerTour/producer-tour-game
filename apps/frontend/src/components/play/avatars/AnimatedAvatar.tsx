import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { BONE_NAMES, ARM_ROTATION, FOOT_ROTATION } from '../types';

// Debug mode - toggle with backtick (`) key (intentionally global - keyboard toggle affects all instances)
let DEBUG_MODE = false;

// Type for quaternion refs (instance-specific, not global)
interface ArmQuaternions {
  leftArm: THREE.Quaternion;
  rightArm: THREE.Quaternion;
  leftForeArm: THREE.Quaternion;
  rightForeArm: THREE.Quaternion;
}

interface FootQuaternions {
  leftFoot: THREE.Quaternion;
  rightFoot: THREE.Quaternion;
}

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
    setAngle(0);
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

      <div className="mb-3">
        <label className="block text-gray-400 mb-1">Quick Presets:</label>
        <div className="flex gap-1 flex-wrap">
          {[0, 0.5, 1.0, 1.2, 1.57, 2.0].map(presetAngle => (
            <button
              key={presetAngle}
              onClick={() => handleAngleChange(presetAngle)}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[10px]"
            >
              {presetAngle}
            </button>
          ))}
        </div>
      </div>

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
// Takes instance-specific quaternion refs to avoid global state issues
function setIdlePose(
  boneMap: Map<string, THREE.Bone>,
  armQuaternions: ArmQuaternions,
  footQuaternions: FootQuaternions
) {
  const leftArm = boneMap.get(BONE_NAMES.leftArm);
  const rightArm = boneMap.get(BONE_NAMES.rightArm);
  const leftForeArm = boneMap.get(BONE_NAMES.leftForeArm);
  const rightForeArm = boneMap.get(BONE_NAMES.rightForeArm);
  const leftFoot = boneMap.get(BONE_NAMES.leftFoot);
  const rightFoot = boneMap.get(BONE_NAMES.rightFoot);

  const armAngle = ARM_ROTATION.angle;
  const xAxis = new THREE.Vector3(1, 0, 0);

  if (leftArm) {
    leftArm.quaternion.identity();
    const rotQ = new THREE.Quaternion().setFromAxisAngle(xAxis, armAngle);
    leftArm.quaternion.multiply(rotQ);
    armQuaternions.leftArm.copy(leftArm.quaternion);
  }
  if (rightArm) {
    rightArm.quaternion.identity();
    const rotQ = new THREE.Quaternion().setFromAxisAngle(xAxis, armAngle);
    rightArm.quaternion.multiply(rotQ);
    armQuaternions.rightArm.copy(rightArm.quaternion);
  }

  if (leftForeArm) armQuaternions.leftForeArm.copy(leftForeArm.quaternion);
  if (rightForeArm) armQuaternions.rightForeArm.copy(rightForeArm.quaternion);

  const footAngle = FOOT_ROTATION.angle;

  if (leftFoot) {
    leftFoot.quaternion.identity();
    const rotQ = new THREE.Quaternion().setFromAxisAngle(xAxis, footAngle);
    leftFoot.quaternion.multiply(rotQ);
    footQuaternions.leftFoot.copy(leftFoot.quaternion);
  }
  if (rightFoot) {
    rightFoot.quaternion.identity();
    const rotQ = new THREE.Quaternion().setFromAxisAngle(xAxis, footAngle);
    rightFoot.quaternion.multiply(rotQ);
    footQuaternions.rightFoot.copy(rightFoot.quaternion);
  }
}

export interface AnimatedAvatarProps {
  url: string;
  isMoving?: boolean;
  isRunning?: boolean;
}

// Animated Ready Player Me Avatar with procedural bone animation
export function AnimatedAvatar({
  url,
  isMoving = false,
  isRunning = false,
}: AnimatedAvatarProps) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);
  const skeletonHelperRef = useRef<THREE.SkeletonHelper | null>(null);
  const { scene: threeScene } = useThree();

  const bones = useRef<Map<string, THREE.Bone>>(new Map());
  const animPhase = useRef(0);
  const idlePhase = useRef(0);
  const initialized = useRef(false);
  const [boneMapState, setBoneMapState] = useState<Map<string, THREE.Bone>>(new Map());
  const [debugMode, setDebugMode] = useState(DEBUG_MODE);

  // Instance-specific quaternion storage (not shared across avatar instances)
  const originalArmQuaternions = useRef<ArmQuaternions>({
    leftArm: new THREE.Quaternion(),
    rightArm: new THREE.Quaternion(),
    leftForeArm: new THREE.Quaternion(),
    rightForeArm: new THREE.Quaternion(),
  });

  const originalFootQuaternions = useRef<FootQuaternions>({
    leftFoot: new THREE.Quaternion(),
    rightFoot: new THREE.Quaternion(),
  });

  // Toggle debug mode with backtick key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '`' || e.key === '~') {
        DEBUG_MODE = !DEBUG_MODE;
        setDebugMode(DEBUG_MODE);
        console.log(`🔧 Debug mode: ${DEBUG_MODE ? 'ON' : 'OFF'}`);

        if (!DEBUG_MODE && bones.current.size > 0) {
          setIdlePose(bones.current, originalArmQuaternions.current, originalFootQuaternions.current);
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

    console.log('🦴 Found bones:', Array.from(boneMap.keys()));

    setIdlePose(boneMap, originalArmQuaternions.current, originalFootQuaternions.current);

    if (DEBUG_MODE) {
      group.current.traverse((child) => {
        if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
          const skinnedMesh = child as THREE.SkinnedMesh;
          if (skinnedMesh.skeleton) {
            const helper = new THREE.SkeletonHelper(skinnedMesh);
            helper.visible = true;
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

  useEffect(() => {
    if (skeletonHelperRef.current) {
      skeletonHelperRef.current.visible = debugMode;
    }
  }, [debugMode]);

  const handleBoneAngleChange = useCallback((bone: 'arms' | 'feet', newAngle: number, axis: 'x' | 'y' | 'z' = 'x') => {
    const boneMap = bones.current;
    const armQuats = originalArmQuaternions.current;
    const footQuats = originalFootQuaternions.current;

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
        armQuats.leftArm.copy(leftArm.quaternion);
      }
      if (rightArm) {
        rightArm.quaternion.identity();
        const rightAngle = (axis === 'x') ? newAngle : -newAngle;
        const rotQ = new THREE.Quaternion().setFromAxisAngle(axisVector, rightAngle);
        rightArm.quaternion.multiply(rotQ);
        armQuats.rightArm.copy(rightArm.quaternion);
      }
    } else if (bone === 'feet') {
      const leftFoot = boneMap.get(BONE_NAMES.leftFoot);
      const rightFoot = boneMap.get(BONE_NAMES.rightFoot);

      if (leftFoot) {
        leftFoot.quaternion.identity();
        const rotQ = new THREE.Quaternion().setFromAxisAngle(axisVector, newAngle);
        leftFoot.quaternion.multiply(rotQ);
        footQuats.leftFoot.copy(leftFoot.quaternion);
      }
      if (rightFoot) {
        rightFoot.quaternion.identity();
        const rotQ = new THREE.Quaternion().setFromAxisAngle(axisVector, newAngle);
        rightFoot.quaternion.multiply(rotQ);
        footQuats.rightFoot.copy(rightFoot.quaternion);
      }
    }
  }, []);

  // Animate bones each frame
  useFrame((_, delta) => {
    const boneMap = bones.current;
    if (boneMap.size === 0) return;

    const armQuats = originalArmQuaternions.current;
    const footQuats = originalFootQuaternions.current;

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
      const speed = isRunning ? 10 : 6;
      animPhase.current += delta * speed;
      const t = animPhase.current;

      const legSwingAmount = isRunning ? 0.45 : 0.22;
      const kneeAmount = isRunning ? 0.5 : 0.25;
      const armSwingAmount = isRunning ? 0.3 : 0.12;

      if (leftUpLeg) leftUpLeg.rotation.x = Math.sin(t) * legSwingAmount;
      if (rightUpLeg) rightUpLeg.rotation.x = Math.sin(t + Math.PI) * legSwingAmount;

      if (leftLeg) leftLeg.rotation.x = -Math.max(0, Math.sin(t - 0.5)) * kneeAmount;
      if (rightLeg) rightLeg.rotation.x = -Math.max(0, Math.sin(t + Math.PI - 0.5)) * kneeAmount;

      if (leftFoot) leftFoot.quaternion.copy(footQuats.leftFoot);
      if (rightFoot) rightFoot.quaternion.copy(footQuats.rightFoot);

      if (leftArm) {
        const swingQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.sin(t + Math.PI) * armSwingAmount);
        leftArm.quaternion.copy(armQuats.leftArm).multiply(swingQ);
      }
      if (rightArm) {
        const swingQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.sin(t) * armSwingAmount);
        rightArm.quaternion.copy(armQuats.rightArm).multiply(swingQ);
      }

      if (leftForeArm) leftForeArm.quaternion.copy(armQuats.leftForeArm);
      if (rightForeArm) rightForeArm.quaternion.copy(armQuats.rightForeArm);

      if (hips) {
        hips.position.y = Math.abs(Math.sin(t * 2)) * 0.008;
        hips.rotation.z = Math.sin(t) * 0.03;
      }

      if (spine) {
        spine.rotation.y = Math.sin(t) * 0.04;
        spine.rotation.z = Math.sin(t) * -0.02;
      }

      const head = boneMap.get(BONE_NAMES.head);
      const neck = boneMap.get(BONE_NAMES.neck);
      if (head) {
        head.rotation.y = Math.sin(t * 0.5) * 0.03;
        head.rotation.x = Math.sin(t * 2) * 0.02;
      }
      if (neck) {
        neck.rotation.z = Math.sin(t) * 0.02;
      }
    } else {
      idlePhase.current += delta * 1.2;
      const t = idlePhase.current;

      animPhase.current = 0;

      if (leftUpLeg) leftUpLeg.rotation.x = 0;
      if (rightUpLeg) rightUpLeg.rotation.x = 0;
      if (leftLeg) leftLeg.rotation.x = 0;
      if (rightLeg) rightLeg.rotation.x = 0;
      if (leftFoot) leftFoot.quaternion.copy(footQuats.leftFoot);
      if (rightFoot) rightFoot.quaternion.copy(footQuats.rightFoot);

      if (leftArm) leftArm.quaternion.copy(armQuats.leftArm);
      if (rightArm) rightArm.quaternion.copy(armQuats.rightArm);
      if (leftForeArm) leftForeArm.quaternion.copy(armQuats.leftForeArm);
      if (rightForeArm) rightForeArm.quaternion.copy(armQuats.rightForeArm);

      const head = boneMap.get(BONE_NAMES.head);
      const neck = boneMap.get(BONE_NAMES.neck);
      if (head) {
        head.rotation.x = 0;
        head.rotation.y = 0;
      }
      if (neck) {
        neck.rotation.z = 0;
      }

      if (spine) {
        spine.rotation.x = Math.sin(t) * 0.01;
        spine.rotation.y = 0;
        spine.rotation.z = 0;
      }

      if (hips) {
        hips.position.y = Math.sin(t) * 0.002;
        hips.rotation.z = 0;
      }
    }
  });

  return (
    <group ref={group}>
      <primitive object={clonedScene} position={[0, 1.0, 0]} />

      {debugMode && boneMapState.size > 0 && (
        <Html position={[0, 3, 0]} center style={{ pointerEvents: 'auto' }}>
          <DebugPanel boneMap={boneMapState} onBoneAngleChange={handleBoneAngleChange} />
        </Html>
      )}
    </group>
  );
}
