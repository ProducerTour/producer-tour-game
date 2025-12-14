import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, Users } from 'lucide-react';
import { HoldingsInterior } from '../components/corporate-structure/HoldingsInterior';
import {
  OtherPlayerUNAFShip,
  OtherPlayerMonkeyShip,
  ModelErrorBoundary
} from '../components/corporate-structure/Structure3D';
import { useSocket } from '../hooks/useSocket';
import { useAuthStore } from '../store/auth.store';
import { usePlayerStore } from '../store/player.store';
import { Html, Billboard, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { Socket } from 'socket.io-client';

// Mouse drag hook for camera look - supports both left and right click drag
// Left click has a drag threshold so clicks on objects still work
const DRAG_THRESHOLD = 5; // pixels before drag starts

function useMouseLook() {
  const isDraggingRef = useRef(false);
  const isMouseDownRef = useRef(false);
  const mouseButtonRef = useRef<number | null>(null);
  const startMousePos = useRef({ x: 0, y: 0 });
  const lastMousePos = useRef({ x: 0, y: 0 });
  const lookOffsetRef = useRef({ yaw: 0, pitch: 0 });

  useFrame(() => {
    // This ensures the camera updates with the lookOffset
  });

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Prevent right-click menu
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Track both left (0) and right (2) clicks
      if (e.button === 0 || e.button === 2) {
        isMouseDownRef.current = true;
        mouseButtonRef.current = e.button;
        startMousePos.current = { x: e.clientX, y: e.clientY };
        lastMousePos.current = { x: e.clientX, y: e.clientY };

        // Right click starts dragging immediately
        if (e.button === 2) {
          isDraggingRef.current = true;
          document.body.style.cursor = 'grabbing';
        }
      }
    };

    const handleMouseUp = () => {
      isMouseDownRef.current = false;
      isDraggingRef.current = false;
      mouseButtonRef.current = null;
      document.body.style.cursor = 'auto';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDownRef.current) return;

      const deltaFromStart = Math.sqrt(
        Math.pow(e.clientX - startMousePos.current.x, 2) +
        Math.pow(e.clientY - startMousePos.current.y, 2)
      );

      // For left click, only start dragging after threshold
      if (mouseButtonRef.current === 0 && !isDraggingRef.current) {
        if (deltaFromStart > DRAG_THRESHOLD) {
          isDraggingRef.current = true;
          document.body.style.cursor = 'grabbing';
        }
      }

      if (!isDraggingRef.current) return;

      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      lastMousePos.current = { x: e.clientX, y: e.clientY };

      lookOffsetRef.current = {
        yaw: lookOffsetRef.current.yaw - deltaX * 0.005,
        pitch: Math.max(-0.8, Math.min(0.8, lookOffsetRef.current.pitch - deltaY * 0.003)),
      };
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      document.body.style.cursor = 'auto';
    };
  }, []);

  return { lookOffset: lookOffsetRef.current };
}

// Keyboard controls hook for WASD movement
function useKeyboardControls() {
  const [keys, setKeys] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    sprint: false,
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    switch (e.code) {
      case 'KeyW': case 'ArrowUp': setKeys(k => ({ ...k, forward: true })); break;
      case 'KeyS': case 'ArrowDown': setKeys(k => ({ ...k, backward: true })); break;
      case 'KeyA': case 'ArrowLeft': setKeys(k => ({ ...k, left: true })); break;
      case 'KeyD': case 'ArrowRight': setKeys(k => ({ ...k, right: true })); break;
      case 'Space': setKeys(k => ({ ...k, up: true })); break;
      case 'ControlLeft': case 'ControlRight': setKeys(k => ({ ...k, down: true })); break;
      case 'ShiftLeft': case 'ShiftRight': setKeys(k => ({ ...k, sprint: true })); break;
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': setKeys(k => ({ ...k, forward: false })); break;
      case 'KeyS': case 'ArrowDown': setKeys(k => ({ ...k, backward: false })); break;
      case 'KeyA': case 'ArrowLeft': setKeys(k => ({ ...k, left: false })); break;
      case 'KeyD': case 'ArrowRight': setKeys(k => ({ ...k, right: false })); break;
      case 'Space': setKeys(k => ({ ...k, up: false })); break;
      case 'ControlLeft': case 'ControlRight': setKeys(k => ({ ...k, down: false })); break;
      case 'ShiftLeft': case 'ShiftRight': setKeys(k => ({ ...k, sprint: false })); break;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return keys;
}

// Player interface for multiplayer
interface Player3D {
  id: string;
  username: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  color: string;
  shipModel: 'rocket' | 'fighter' | 'unaf' | 'monkey';
}

// Other player avatar in holdings interior - shows actual ship models
function OtherPlayerAvatar({ player }: { player: Player3D }) {
  const groupRef = useRef<THREE.Group>(null);
  const targetPosition = useRef(new THREE.Vector3(player.position.x, player.position.y, player.position.z));
  const targetRotation = useRef(new THREE.Euler(player.rotation.x, player.rotation.y, player.rotation.z));

  useEffect(() => {
    targetPosition.current.set(player.position.x, player.position.y, player.position.z);
    targetRotation.current.set(player.rotation.x, player.rotation.y, player.rotation.z);
  }, [player.position, player.rotation]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Smooth interpolation to target position
      groupRef.current.position.lerp(targetPosition.current, Math.min(1, delta * 10));
      // Smooth rotation
      groupRef.current.rotation.y += (targetRotation.current.y - groupRef.current.rotation.y) * Math.min(1, delta * 8);
    }
  });

  const shipModel = player.shipModel || 'rocket';

  // Procedural rocket for simple ships
  const ProceduralRocket = () => (
    <>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 1.2, 16]} />
        <meshStandardMaterial color={player.color} emissive={player.color} emissiveIntensity={0.3} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, -0.8]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.15, 0.4, 16]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.2} />
      </mesh>
      <Sparkles count={10} scale={0.5} size={2} speed={2} color={player.color} position={[0, 0, 0.8]} />
    </>
  );

  // Procedural fighter
  const ProceduralFighter = () => (
    <>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 1.5, 6]} />
        <meshStandardMaterial color={player.color} emissive={player.color} emissiveIntensity={0.15} metalness={0.9} roughness={0.2} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.4, 0.2, 0.1]} rotation={[0, 0, side * 0.3]}>
          <boxGeometry args={[0.7, 0.02, 0.4]} />
          <meshStandardMaterial color={player.color} emissive={player.color} emissiveIntensity={0.1} />
        </mesh>
      ))}
      <Sparkles count={10} scale={0.5} size={2} speed={2} color={player.color} position={[0, 0, 0.9]} />
    </>
  );

  return (
    <group ref={groupRef} position={[player.position.x, player.position.y, player.position.z]}>
      {/* Ship model based on player selection */}
      {shipModel === 'rocket' && <ProceduralRocket />}
      {shipModel === 'fighter' && <ProceduralFighter />}

      {/* UNAF - Load actual FBX model */}
      {shipModel === 'unaf' && (
        <ModelErrorBoundary modelName={`${player.username}'s UNAF`} fallbackColor={player.color}>
          <Suspense fallback={
            <mesh>
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshStandardMaterial color={player.color} emissive={player.color} emissiveIntensity={0.3} wireframe />
            </mesh>
          }>
            <OtherPlayerUNAFShip color={player.color} />
          </Suspense>
        </ModelErrorBoundary>
      )}

      {/* MONKEY - Load actual GLB model */}
      {shipModel === 'monkey' && (
        <ModelErrorBoundary modelName={`${player.username}'s Monkey`} fallbackColor={player.color}>
          <Suspense fallback={
            <mesh>
              <sphereGeometry args={[0.4, 16, 16]} />
              <meshStandardMaterial color={player.color} emissive={player.color} emissiveIntensity={0.5} wireframe />
            </mesh>
          }>
            <OtherPlayerMonkeyShip color={player.color} />
          </Suspense>
        </ModelErrorBoundary>
      )}

      {/* Username label */}
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <Html center position={[0, 1.2, 0]} style={{ pointerEvents: 'none' }}>
          <div
            className="px-2 py-1 rounded text-white text-xs font-medium whitespace-nowrap"
            style={{
              backgroundColor: `${player.color}cc`,
              boxShadow: `0 0 10px ${player.color}`,
            }}
          >
            {player.username}
          </div>
        </Html>
      </Billboard>

      {/* Point light for presence */}
      <pointLight color={player.color} intensity={0.5} distance={3} />
    </group>
  );
}

// Movement constants for interior space (2x scale)
const MOVE_SPEED = 5;
const SPRINT_MULTIPLIER = 2;
const ROTATION_SPEED = 5;

// Local player ship with WASD controls and camera follow
function LocalPlayerShip({
  color,
  shipModel,
  username,
  socket,
}: {
  color: string;
  shipModel: 'rocket' | 'fighter' | 'unaf' | 'monkey';
  username: string;
  socket: Socket | null;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const keys = useKeyboardControls();
  const { lookOffset } = useMouseLook();

  const velocity = useRef(new THREE.Vector3());
  const facingAngle = useRef(0);
  const lastEmitTime = useRef(0);

  // Camera follow offset (2x scale interior)
  const baseCameraOffset = useRef(new THREE.Vector3(0, 6, 14));
  const cameraLookOffset = useRef(new THREE.Vector3(0, 1, 0));

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const pos = groupRef.current.position;
    const speed = keys.sprint ? MOVE_SPEED * SPRINT_MULTIPLIER : MOVE_SPEED;

    // Calculate movement direction based on camera
    let inputX = 0;
    let inputZ = 0;
    let inputY = 0;

    if (keys.forward) inputZ = -1;
    if (keys.backward) inputZ = 1;
    if (keys.left) inputX = -1;
    if (keys.right) inputX = 1;
    if (keys.up) inputY = 1;
    if (keys.down) inputY = -1;

    const hasInput = inputX !== 0 || inputZ !== 0 || inputY !== 0;

    if (hasInput) {
      // Get camera's horizontal direction
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);
      cameraDir.y = 0;
      cameraDir.normalize();

      const cameraRight = new THREE.Vector3();
      cameraRight.crossVectors(cameraDir, new THREE.Vector3(0, 1, 0)).normalize();

      // Calculate movement vector
      const moveDir = new THREE.Vector3();
      moveDir.addScaledVector(cameraDir, -inputZ);
      moveDir.addScaledVector(cameraRight, inputX);
      moveDir.y = inputY * 0.5; // Vertical movement
      moveDir.normalize();

      // Apply velocity
      velocity.current.lerp(moveDir.multiplyScalar(speed), delta * 5);

      // Update facing angle based on movement direction (horizontal only)
      if (inputX !== 0 || inputZ !== 0) {
        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        const angleDiff = targetAngle - facingAngle.current;
        const wrappedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        facingAngle.current += wrappedDiff * delta * ROTATION_SPEED;
      }
    } else {
      // Decelerate
      velocity.current.lerp(new THREE.Vector3(0, 0, 0), delta * 3);
    }

    // Apply movement
    pos.add(velocity.current.clone().multiplyScalar(delta));

    // Clamp to interior bounds (2x scale)
    pos.x = Math.max(-40, Math.min(40, pos.x));
    pos.y = Math.max(0, Math.min(24, pos.y));
    pos.z = Math.max(-40, Math.min(45, pos.z));

    // Apply rotation
    groupRef.current.rotation.y = facingAngle.current;

    // Tilt based on movement
    const targetTiltX = -velocity.current.z * 0.05;
    const targetTiltZ = velocity.current.x * 0.1;
    groupRef.current.rotation.x += (targetTiltX - groupRef.current.rotation.x) * delta * 5;
    groupRef.current.rotation.z += (targetTiltZ - groupRef.current.rotation.z) * delta * 5;

    // Camera follow - chase camera behind ship with mouse look offset
    const cameraYaw = facingAngle.current + lookOffset.yaw;
    const idealOffset = baseCameraOffset.current.clone();
    // Apply pitch to camera height
    idealOffset.y += lookOffset.pitch * 10;
    idealOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
    const idealPosition = pos.clone().add(idealOffset);

    camera.position.lerp(idealPosition, delta * 3);

    const lookTarget = pos.clone().add(cameraLookOffset.current);
    camera.lookAt(lookTarget);

    // Emit position to server (throttled to 20 times per second)
    const now = Date.now();
    if (socket && now - lastEmitTime.current > 50) {
      socket.emit('3d:move', {
        position: { x: pos.x, y: pos.y, z: pos.z },
        rotation: { x: groupRef.current.rotation.x, y: groupRef.current.rotation.y, z: groupRef.current.rotation.z },
      });
      lastEmitTime.current = now;
    }
  });

  // Procedural rocket
  const ProceduralRocket = () => (
    <>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 1.5, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, -1]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.2, 0.5, 16]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
      </mesh>
      {/* Engine glow */}
      <Sparkles count={20} scale={0.8} size={3} speed={3} color={color} position={[0, 0, 1]} />
      <pointLight color={color} intensity={1} distance={5} position={[0, 0, 1]} />
    </>
  );

  // Procedural fighter
  const ProceduralFighter = () => (
    <>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 2, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} metalness={0.9} roughness={0.2} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.5, 0.25, 0.2]} rotation={[0, 0, side * 0.3]}>
          <boxGeometry args={[0.9, 0.03, 0.5]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} />
        </mesh>
      ))}
      <Sparkles count={20} scale={0.8} size={3} speed={3} color={color} position={[0, 0, 1.2]} />
      <pointLight color={color} intensity={1} distance={5} position={[0, 0, 1.2]} />
    </>
  );

  return (
    <group ref={groupRef} position={[0, 6, 30]}>
      {/* Ship model based on selection */}
      {shipModel === 'rocket' && <ProceduralRocket />}
      {shipModel === 'fighter' && <ProceduralFighter />}

      {/* UNAF model */}
      {shipModel === 'unaf' && (
        <ModelErrorBoundary modelName="Your UNAF" fallbackColor={color}>
          <Suspense fallback={
            <mesh>
              <sphereGeometry args={[0.4, 16, 16]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} wireframe />
            </mesh>
          }>
            <OtherPlayerUNAFShip color={color} />
          </Suspense>
        </ModelErrorBoundary>
      )}

      {/* Monkey model */}
      {shipModel === 'monkey' && (
        <ModelErrorBoundary modelName="Your Monkey" fallbackColor={color}>
          <Suspense fallback={
            <mesh>
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} wireframe />
            </mesh>
          }>
            <OtherPlayerMonkeyShip color={color} />
          </Suspense>
        </ModelErrorBoundary>
      )}

      {/* Username label */}
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <Html center position={[0, 1.5, 0]} style={{ pointerEvents: 'none' }}>
          <div
            className="px-2 py-1 rounded text-white text-xs font-medium whitespace-nowrap"
            style={{
              backgroundColor: `${color}cc`,
              boxShadow: `0 0 15px ${color}`,
            }}
          >
            {username} (You)
          </div>
        </Html>
      </Billboard>

      {/* Ship light */}
      <pointLight color={color} intensity={0.8} distance={8} />
    </group>
  );
}

// Loading screen during 3D scene initialization
function LoadingScreen() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Entering Holdings...</h2>
        <p className="text-slate-400">Initializing corporate interior</p>
      </motion.div>
    </div>
  );
}

export default function HoldingsInteriorPage() {
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const { user } = useAuthStore();

  // Player data from persistent store (consistent across all spaces)
  const { shipModel: playerShipModel, color: playerColor, displayName } = usePlayerStore();

  // Multiplayer state
  const [otherPlayers, setOtherPlayers] = useState<Player3D[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [isInRoom, setIsInRoom] = useState(false);

  // Username - use display name from store, or fall back to auth user name
  const playerUsername = displayName
    || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Admin' : `Guest_${Math.random().toString(36).slice(2, 6)}`);

  const handleExit = () => {
    // Leave the holdings room before navigating
    if (socket && isInRoom) {
      socket.emit('3d:leave');
    }
    // Navigate back to the 3D space
    navigate('/play');
  };

  // Join holdings room on mount
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join the holdings room with player's persistent ship/color data
    socket.emit('3d:join', {
      username: playerUsername,
      room: 'holdings',
      shipModel: playerShipModel,
      color: playerColor,
    });
    setIsInRoom(true);

    // Handle receiving current players
    const handlePlayers = (players: Player3D[]) => {
      setOtherPlayers(players);
    };

    // Handle new player joining
    const handlePlayerJoined = (player: Player3D) => {
      setOtherPlayers(prev => [...prev.filter(p => p.id !== player.id), player]);
    };

    // Handle player leaving
    const handlePlayerLeft = (data: { id: string }) => {
      setOtherPlayers(prev => prev.filter(p => p.id !== data.id));
    };

    // Handle player movement
    const handlePlayerMoved = (data: { id: string; position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number } }) => {
      setOtherPlayers(prev => prev.map(p =>
        p.id === data.id ? { ...p, position: data.position, rotation: data.rotation } : p
      ));
    };

    // Handle player count update
    const handlePlayerCount = (count: number) => {
      setPlayerCount(count);
    };

    // Handle player updates (username, ship, etc)
    const handlePlayerUpdated = (data: { id: string; username?: string; shipModel?: string }) => {
      setOtherPlayers(prev => prev.map(p =>
        p.id === data.id
          ? { ...p, ...(data.username && { username: data.username }), ...(data.shipModel && { shipModel: data.shipModel as Player3D['shipModel'] }) }
          : p
      ));
    };

    socket.on('3d:players', handlePlayers);
    socket.on('3d:player-joined', handlePlayerJoined);
    socket.on('3d:player-left', handlePlayerLeft);
    socket.on('3d:player-moved', handlePlayerMoved);
    socket.on('3d:player-count', handlePlayerCount);
    socket.on('3d:player-updated', handlePlayerUpdated);

    return () => {
      socket.off('3d:players', handlePlayers);
      socket.off('3d:player-joined', handlePlayerJoined);
      socket.off('3d:player-left', handlePlayerLeft);
      socket.off('3d:player-moved', handlePlayerMoved);
      socket.off('3d:player-count', handlePlayerCount);
      socket.off('3d:player-updated', handlePlayerUpdated);

      // Leave room on unmount
      socket.emit('3d:leave');
    };
  }, [socket, isConnected, user]);

  return (
    <div className="w-full h-screen bg-slate-950 relative">
      {/* Back button overlay */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        onClick={handleExit}
        className="absolute top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-slate-800/80 backdrop-blur-sm rounded-lg text-white hover:bg-slate-700/80 transition-colors border border-slate-600/50"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Space
      </motion.button>

      {/* Title overlay */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-50"
      >
        <h1 className="text-2xl font-bold text-white">
          <span className="text-blue-400">Producer Tour Holdings, Inc.</span>
        </h1>
        <p className="text-center text-slate-400 text-sm">Delaware C-Corporation • Parent Company</p>
      </motion.div>

      {/* Multiplayer indicator */}
      <AnimatePresence>
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-4 right-4 z-50 p-3 bg-emerald-500/20 backdrop-blur-sm rounded-xl border border-emerald-500/50"
          >
            <div className="flex items-center gap-2 text-emerald-300 text-sm font-medium">
              <Users className="w-4 h-4" />
              <span>{playerCount} in Holdings</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            {otherPlayers.length > 0 && (
              <div className="mt-2 pt-2 border-t border-emerald-500/30">
                <p className="text-emerald-300/50 text-xs mb-1">Others here:</p>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {otherPlayers.map((player) => (
                    <div key={player.id} className="flex items-center gap-1 text-xs">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: player.color }}
                      />
                      <span className="text-emerald-300/70">{player.username}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Canvas */}
      <Suspense fallback={<LoadingScreen />}>
        <Canvas
          camera={{ position: [0, 8, 25], fov: 60 }}
          gl={{ antialias: true, alpha: false }}
          dpr={[1, 2]}
        >
          {/* Local player ship with WASD controls */}
          <LocalPlayerShip
            color={playerColor}
            shipModel={playerShipModel}
            username={playerUsername}
            socket={socket}
          />

          <HoldingsInterior isActive={true} onExit={handleExit} />

          {/* Render other players */}
          {otherPlayers.map((player) => (
            <OtherPlayerAvatar key={player.id} player={player} />
          ))}
        </Canvas>
      </Suspense>

      {/* Instructions overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 text-center"
      >
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-700/50">
          <p className="text-slate-300 text-sm font-medium">
            <span className="text-blue-400">WASD</span> Move •
            <span className="text-blue-400 ml-2">Space/Ctrl</span> Up/Down •
            <span className="text-blue-400 ml-2">Shift</span> Sprint •
            <span className="text-blue-400 ml-2">Click+Drag</span> Look
          </p>
          <p className="text-slate-500 text-xs mt-1">
            Fly to stations to view compliance tasks and documents
          </p>
        </div>
      </motion.div>
    </div>
  );
}
