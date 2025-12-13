import { Suspense, useEffect, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, Users } from 'lucide-react';
import { HoldingsInterior } from '../components/corporate-structure/HoldingsInterior';
import { useSocket } from '../hooks/useSocket';
import { useAuthStore } from '../store/auth.store';
import { Html, Billboard } from '@react-three/drei';
import * as THREE from 'three';

// Player interface for multiplayer
interface Player3D {
  id: string;
  username: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  color: string;
  shipModel: 'rocket' | 'fighter' | 'unaf' | 'monkey';
}

// Other player avatar in holdings interior
function OtherPlayerAvatar({ player }: { player: Player3D }) {
  const groupRef = useRef<THREE.Group>(null);
  const targetPosition = useRef(new THREE.Vector3(player.position.x, player.position.y, player.position.z));

  useEffect(() => {
    targetPosition.current.set(player.position.x, player.position.y, player.position.z);
  }, [player.position]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Smooth interpolation to target position
      groupRef.current.position.lerp(targetPosition.current, Math.min(1, delta * 10));
    }
  });

  return (
    <group ref={groupRef} position={[player.position.x, player.position.y, player.position.z]}>
      {/* Simple avatar representation - glowing orb with username */}
      <mesh>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color={player.color}
          emissive={player.color}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Username label */}
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <Html center position={[0, 0.6, 0]} style={{ pointerEvents: 'none' }}>
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

  // Multiplayer state
  const [otherPlayers, setOtherPlayers] = useState<Player3D[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [isInRoom, setIsInRoom] = useState(false);

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

    const username = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : `Guest_${Math.random().toString(36).slice(2, 6)}`;

    // Join the holdings room
    socket.emit('3d:join', {
      username,
      room: 'holdings',
      shipModel: 'rocket' // Default ship for holdings
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
          camera={{ position: [0, 5, 15], fov: 60 }}
          gl={{ antialias: true, alpha: false }}
          dpr={[1, 2]}
        >
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
        <p className="text-slate-500 text-sm">
          Click on stations to view compliance tasks and documents
        </p>
      </motion.div>
    </div>
  );
}
