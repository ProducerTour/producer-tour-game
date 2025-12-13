import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Html,
  Float,
  MeshDistortMaterial,
  Sparkles,
  Line,
  Stars,
  Environment,
  ContactShadows,
  Billboard,
  Trail,
  KeyboardControls,
  useKeyboardControls,
  Text,
  useFBX
} from '@react-three/drei';
// Post-processing disabled - incompatible with three.js 0.182+
// import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { NebulaSkybox } from './NebulaSkybox';
import { SpeedEffects } from './SpeedEffects';
import { Waypoints } from './Waypoints';
import { MiniMap } from './MiniMap';
import { WarpTunnel } from './WarpTunnel';
import { HoldingsInterior } from './HoldingsInterior';
import { useRef, useState, useMemo, Suspense, useEffect, useCallback } from 'react';
import { useSocket } from '../../hooks/useSocket';
import * as THREE from 'three';

// Modular imports - data, constants, and types from separate files
import { SCALE } from './constants';
import { entities, flowConnections, revenueSources } from './data';
import type { EntityData, FlowConnection, RevenueSourceData } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  FileText,
  Users,
  X,
  MapPin,
  ArrowDown,
  ArrowUp,
  DollarSign,
  Zap,
  Maximize2,
  Minimize2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Calculator,
  Scale,
  Volume2,
  VolumeX,
  Rocket,
  Eye,
  Camera,
  Settings
} from 'lucide-react';

// ============================================================================
// 3D COMPONENTS
// ============================================================================

// IMPROVED: Revenue source with larger animated dollars and clearer labeling
function RevenueSourceNode({
  source,
  targetPosition,
  onSelect,
  isSelected
}: {
  source: RevenueSourceData;
  targetPosition: [number, number, number];
  onSelect: (id: string | null) => void;
  isSelected: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const { camera } = useThree();
  const start = new THREE.Vector3(...source.position);
  const end = new THREE.Vector3(...targetPosition);
  const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
  mid.y += 2; // Arc upward for better visibility

  const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
  const points = curve.getPoints(40);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = source.position[1] + Math.sin(state.clock.elapsedTime * 1.2 + source.position[0]) * 0.3;
    }

    // Inverse distance scaling for labels - bigger when far, smaller when close
    if (labelRef.current) {
      const sourcePos = new THREE.Vector3(...source.position);
      const distance = camera.position.distanceTo(sourcePos);
      // Scale inversely with clamped range - about half the size of entity labels
      // Close (30 units) = 0.3x, Far (150+ units) = 0.6x max
      const clampedDist = Math.max(30, Math.min(150, distance));
      const inverseScale = 0.3 + ((clampedDist - 30) / 120) * 0.3;
      labelRef.current.style.transform = `scale(${inverseScale})`;
    }
  });

  const Icon = source.icon;

  return (
    <group>
      {/* Flow line - more visible */}
      <Line
        points={points}
        color={source.color}
        lineWidth={isSelected ? 4 : 2}
        transparent
        opacity={isSelected ? 0.9 : 0.5}
        dashed
        dashScale={6}
      />

      {/* Particle stream instead of solid tube - galaxy aesthetic */}
      <Line
        points={points}
        color={source.color}
        lineWidth={1}
        transparent
        opacity={0.2}
      />
      {/* Multiple flowing particles along the path */}
      {Array.from({ length: 8 }).map((_, i) => (
        <FlowParticle
          key={i}
          curve={curve}
          color={source.color}
          speed={0.15 + Math.random() * 0.1}
          delay={i * 0.125}
        />
      ))}
      {/* Sparkles along the path for plasma effect - 4x bigger */}
      <Sparkles
        count={60}
        scale={[16, 24, 16]}
        position={[
          (source.position[0] + targetPosition[0]) / 2,
          (source.position[1] + targetPosition[1]) / 2 + 1,
          (source.position[2] + targetPosition[2]) / 2
        ]}
        size={12}
        speed={0.8}
        color={source.color}
        opacity={0.6}
      />

      {/* Revenue source node - ethereal particle cloud - 4x bigger */}
      <group ref={groupRef} position={source.position}>
        {/* Core point - 4x larger */}
        <mesh>
          <sphereGeometry args={[1.2, 16, 16]} />
          <meshBasicMaterial color={source.color} />
        </mesh>
        {/* Particle cloud - 4x bigger */}
        <Sparkles
          count={120}
          scale={16.0}
          size={24}
          speed={0.6}
          color={source.color}
          opacity={0.8}
        />

        <Billboard follow={true}>
          <Html center style={{ pointerEvents: 'auto' }}>
            <div ref={labelRef} style={{ transition: 'transform 0.1s ease-out' }}>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`cursor-pointer transition-all duration-300 ${isSelected ? 'scale-105' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(isSelected ? null : source.id);
                }}
              >
                <div
                  className={`px-4 py-2.5 rounded-xl border-2 backdrop-blur-sm transition-all ${
                    isSelected ? 'ring-2 ring-white/40' : ''
                  }`}
                  style={{
                    backgroundColor: `${source.color}35`,
                    borderColor: `${source.color}90`,
                    boxShadow: `0 0 25px ${source.color}50`
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5" style={{ color: source.color }} />
                    <span className="text-white font-bold text-base">{source.label}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </Html>
        </Billboard>

        {isSelected && (
          <Sparkles
            count={80}
            scale={20}
            size={32}
            speed={0.5}
            color={source.color}
          />
        )}
      </group>
    </group>
  );
}

// Entity Node Component with billboarded labels - ENHANCED with size hierarchy and halos
function EntityNode({
  entity,
  isSelected,
  onSelect,
  isHovered,
  onHover
}: {
  entity: EntityData;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  isHovered: boolean;
  onHover: (id: string | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const glowRef = useRef<any>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const baseY = entity.position[1];

  // Size hierarchy: Holdings largest, PT LLC (hub) medium-large, others smaller
  const isHoldings = entity.id === 'holdings';
  const isPTLLC = entity.id === 'admin';
  const isDE = entity.jurisdiction === 'DE';
  const Icon = entity.icon;

  // Size multiplier based on entity importance (scaled 2x for expanded universe)
  const sizeMultiplier = (isHoldings ? 1.4 : isPTLLC ? 1.2 : 1.0) * SCALE.ENTITY_SIZE;
  const baseSize = isHoldings ? 1.1 : isDE ? 0.85 : 0.75;
  const actualSize = baseSize * sizeMultiplier;

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    if (meshRef.current) {
      meshRef.current.position.y = baseY + Math.sin(time * 0.8 + entity.position[0]) * 0.15;
      meshRef.current.rotation.y += 0.003;

      // Pulsing scale effect
      if (isSelected || isHovered) {
        const scale = sizeMultiplier * (1.15 + Math.sin(time * 3) * 0.05);
        meshRef.current.scale.setScalar(scale);
      } else {
        meshRef.current.scale.lerp(new THREE.Vector3(sizeMultiplier, sizeMultiplier, sizeMultiplier), 0.1);
      }

      // Pulsing emissive
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      if (material && material.emissiveIntensity !== undefined) {
        const pulse = Math.sin(time * 2) * 0.15 + 0.25;
        material.emissiveIntensity = isSelected ? 0.6 : isHovered ? 0.4 : pulse;
      }
    }

    // Animate main ring
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.01;
      ringRef.current.position.y = baseY + Math.sin(time * 0.8 + entity.position[0]) * 0.15;
    }

    // Pulsing glow sphere
    if (glowRef.current) {
      const glowPulse = Math.sin(time * 2) * 0.1 + 0.15;
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = isSelected ? 0.4 : isHovered ? 0.25 : glowPulse;
      const glowScale = sizeMultiplier * (1.8 + Math.sin(time * 1.5) * 0.1);
      glowRef.current.scale.setScalar(glowScale);
    }

    // Inverse distance scaling for labels - bigger when far, smaller when close
    if (labelRef.current) {
      const entityPos = new THREE.Vector3(...entity.position);
      const distance = state.camera.position.distanceTo(entityPos);
      // Scale inversely with clamped range to prevent infinite sizing
      // Close (30 units) = 0.7x, Far (150+ units) = 1.5x max
      const clampedDist = Math.max(30, Math.min(150, distance));
      const inverseScale = 0.7 + ((clampedDist - 30) / 120) * 0.8;
      labelRef.current.style.transform = `scale(${inverseScale})`;
    }
  });

  const ringSize = actualSize * 1.4;

  return (
    <group position={[entity.position[0], entity.position[1], entity.position[2]]}>
      {/* Ethereal particle cloud instead of solid glow spheres */}
      <Sparkles
        ref={glowRef}
        count={isHoldings ? 120 : isPTLLC ? 100 : 70}
        scale={actualSize * 3}
        size={isSelected ? 5 : isHovered ? 4 : 3}
        speed={0.4}
        color={entity.color}
        opacity={isSelected ? 1 : 0.7}
      />

      {/* Subtle ring - more ethereal */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ringSize * 0.9, 0.02, 8, 64]} />
        <meshBasicMaterial
          color={entity.color}
          transparent
          opacity={isSelected ? 0.6 : isHovered ? 0.4 : 0.2}
        />
      </mesh>

      {/* Main shape with trail effect */}
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
        <Trail
          width={isSelected ? 2.5 : 1.5}
          length={8}
          color={entity.color}
          attenuation={(t) => t * t}
        >
          <mesh
            ref={meshRef}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(isSelected ? null : entity.id);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHover(entity.id);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              onHover(null);
              document.body.style.cursor = 'auto';
            }}
          >
            {isHoldings ? (
              <dodecahedronGeometry args={[actualSize * 0.8, 0]} />
            ) : isDE ? (
              <octahedronGeometry args={[actualSize * 0.8, 0]} />
            ) : (
              <icosahedronGeometry args={[actualSize * 0.8, 0]} />
            )}
            <MeshDistortMaterial
              color={entity.color}
              speed={1.5}
              distort={isSelected || isHovered ? 0.2 : 0.08}
              roughness={0.2}
              metalness={0.6}
              emissive={entity.color}
              emissiveIntensity={isSelected ? 0.6 : isHovered ? 0.4 : 0.25}
              transparent
              opacity={0.85}
            />
          </mesh>
        </Trail>
      </Float>

      {/* Billboarded HTML Label - shows minimal when not hovered, full on hover/select */}
      {/* Holdings label goes ABOVE the entity, others go below */}
      {/* Inverse distance scaling: bigger when far away, smaller when close */}
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <Html
          position={[0, isHoldings ? 4.5 : -1.6, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div ref={labelRef} style={{ transition: 'transform 0.1s ease-out' }}>
          {/* Full label - only on hover or select */}
          {(isHovered || isSelected) ? (
            <motion.div
              className="text-center select-none"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15 }}
            >
              <div
                className={`px-4 py-2 rounded-xl backdrop-blur-md border-2 transition-all duration-300 ${
                  isSelected ? 'ring-2 ring-white/30' : ''
                }`}
                style={{
                  backgroundColor: isSelected ? `${entity.color}40` : `${entity.color}30`,
                  borderColor: entity.color,
                  boxShadow: isSelected
                    ? `0 0 30px ${entity.color}60, 0 4px 20px rgba(0,0,0,0.5)`
                    : `0 0 20px ${entity.color}40, 0 4px 15px rgba(0,0,0,0.4)`
                }}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Icon className="w-5 h-5" style={{ color: entity.color }} />
                  <span className="text-white font-bold text-base whitespace-nowrap">{entity.shortName}</span>
                </div>
                <div className="text-sm font-medium" style={{ color: entity.color }}>
                  {entity.type}
                </div>
              </div>
              <div
                className={`mt-2 text-sm font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 ${
                  isDE ? 'bg-blue-500/40 text-blue-200 border border-blue-400/50' : 'bg-emerald-500/40 text-emerald-200 border border-emerald-400/50'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                {entity.jurisdiction}
              </div>
              {/* Tax rate indicator */}
              <div className="mt-1.5 text-sm text-gray-400">
                {entity.taxRate} federal
              </div>
            </motion.div>
          ) : (
            /* Minimal label - just name when not hovered */
            <div className="text-center select-none">
              <div
                className="px-4 py-2 rounded-lg backdrop-blur-sm border transition-all duration-200"
                style={{
                  backgroundColor: `${entity.color}15`,
                  borderColor: `${entity.color}40`,
                }}
              >
                <span className="text-white/80 font-medium text-sm whitespace-nowrap">{entity.shortName}</span>
              </div>
            </div>
          )}
          </div>
        </Html>
      </Billboard>

      {/* Sparkles for selected entity */}
      {isSelected && (
        <Sparkles
          count={40}
          scale={3}
          size={4}
          speed={0.5}
          color={entity.color}
        />
      )}
    </group>
  );
}

// IMPROVED: Flow line with hover-only labels to reduce clutter
// Glowing energy particle that travels along the tube
function FlowParticle({ curve, color, speed, delay }: { curve: THREE.QuadraticBezierCurve3; color: string; speed: number; delay: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const progress = useRef(delay);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    progress.current = (progress.current + delta * speed) % 1;
    const point = curve.getPoint(progress.current);
    meshRef.current.position.copy(point);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.12, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} />
    </mesh>
  );
}

// Magic wisp particle with trailing effect
function WispParticle({
  curve,
  color,
  speed,
  delay,
  size = 0.06
}: {
  curve: THREE.QuadraticBezierCurve3;
  color: string;
  speed: number;
  delay: number;
  size?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const progress = useRef(delay);
  const trailColor = new THREE.Color(color);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    progress.current = (progress.current + delta * speed) % 1;
    const point = curve.getPoint(progress.current);
    meshRef.current.position.copy(point);

    // Subtle pulsing glow
    const pulse = Math.sin(progress.current * Math.PI * 2) * 0.3 + 0.7;
    meshRef.current.scale.setScalar(pulse);
  });

  return (
    <Trail
      width={size * 8}
      length={12}
      color={trailColor}
      attenuation={(width) => width * width}
      decay={1}
    >
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 6, 6]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.8}
        />
      </mesh>
    </Trail>
  );
}

// Enhanced glowing flow tube with energy particles
function FlowLine({
  connection,
  isActive,
  onSelect,
  isSelected,
  showLabels = false
}: {
  connection: FlowConnection;
  isActive: boolean;
  onSelect: (conn: FlowConnection | null) => void;
  isSelected: boolean;
  showLabels?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const tubeRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const fromEntity = entities.find(e => e.id === connection.from);
  const toEntity = entities.find(e => e.id === connection.to);

  // Animate tube glow
  useFrame((state) => {
    if (tubeRef.current && connection.type !== 'ownership') {
      const material = tubeRef.current.material as THREE.MeshStandardMaterial;
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.3 + 0.7;
      material.emissiveIntensity = isActive ? (isSelected || isHovered ? 1.5 : pulse * 0.8) : 0.2;
    }
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.2 + 0.4;
      material.opacity = isActive ? (isSelected || isHovered ? 0.5 : pulse) : 0.1;
    }
  });

  if (!fromEntity || !toEntity) return null;

  const start = new THREE.Vector3(...fromEntity.position);
  const end = new THREE.Vector3(...toEntity.position);

  // Offset connection points to sit just below planet meshes (not at center)
  // Holdings needs larger offset since it's the biggest planet
  if (toEntity.id === 'holdings') {
    end.y += 6; // Raise anchor to sit just below Holdings planet
  }
  if (fromEntity.id === 'holdings') {
    start.y += 6; // Also offset outgoing connections from Holdings
  }

  const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);

  if (connection.type === 'ownership') {
    mid.y += 2;
  } else {
    const perpendicular = new THREE.Vector3()
      .subVectors(end, start)
      .cross(new THREE.Vector3(0, 1, 0))
      .normalize()
      .multiplyScalar(2);
    mid.add(perpendicular);
    mid.y += 1;
  }

  const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
  const points = curve.getPoints(50);
  const shouldShowLabel = connection.type !== 'ownership' && (isHovered || isSelected || showLabels);
  const isOwnership = connection.type === 'ownership';

  return (
    <group>
      {/* Magic wisp effect - thin ethereal lines instead of solid tube */}
      {!isOwnership && (
        <>
          {/* Connection anchor nodes - tiny glowing cores inside the planets */}
          {[start, end].map((pos, i) => (
            <group key={`anchor-${i}`} position={pos}>
              {/* Tiny bright core - sits inside the planet geometry */}
              <mesh>
                <sphereGeometry args={[0.06, 12, 12]} />
                <meshStandardMaterial
                  color={connection.color}
                  emissive={connection.color}
                  emissiveIntensity={isActive ? 3 : 2}
                  transparent
                  opacity={1}
                />
              </mesh>
              {/* Small inner glow */}
              <mesh>
                <sphereGeometry args={[0.1, 12, 12]} />
                <meshBasicMaterial
                  color={connection.color}
                  transparent
                  opacity={isActive ? 0.5 : 0.3}
                />
              </mesh>
            </group>
          ))}
          {/* Core thin line connecting the anchors */}
          <Line
            points={points}
            color={connection.color}
            lineWidth={isActive ? 1.5 : 0.8}
            transparent
            opacity={isActive ? 0.6 : 0.25}
          />
          {/* Multiple wispy trails flowing along path */}
          {Array.from({ length: 6 }).map((_, i) => (
            <WispParticle
              key={i}
              curve={curve}
              color={connection.color}
              speed={0.2 + Math.random() * 0.15}
              delay={i * 0.16}
              size={isActive ? 0.08 : 0.05}
            />
          ))}
          {/* Sparkle dust along the path */}
          <Sparkles
            count={30}
            scale={[
              Math.abs(end.x - start.x) + 2,
              Math.abs(end.y - start.y) + 2,
              Math.abs(end.z - start.z) + 2
            ]}
            position={[mid.x, mid.y, mid.z]}
            size={isActive ? 2.5 : 1.5}
            speed={0.5}
            color={connection.color}
            opacity={isActive ? 0.6 : 0.3}
          />
        </>
      )}

      {/* Ownership: dashed line effect with energy nodes */}
      {isOwnership && (
        <>
          <Line
            points={points}
            color={connection.color}
            lineWidth={2}
            transparent
            opacity={isActive ? 0.8 : 0.3}
            dashed
            dashScale={8}
            dashSize={0.5}
            dashOffset={0}
          />
          {/* Energy nodes at endpoints */}
          {[start, end].map((pos, i) => (
            <mesh key={i} position={pos}>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshStandardMaterial
                color={connection.color}
                emissive={connection.color}
                emissiveIntensity={1}
              />
            </mesh>
          ))}
        </>
      )}

      {/* Invisible wider hit area for hover detection */}
      {!isOwnership && (
        <mesh
          onPointerOver={() => setIsHovered(true)}
          onPointerOut={() => setIsHovered(false)}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(isSelected ? null : connection);
          }}
        >
          <tubeGeometry args={[curve, 32, 0.4, 8, false]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}

      {/* Flow label - holographic style */}
      {shouldShowLabel && (
        <Billboard follow={true} position={[mid.x, mid.y + 0.8, mid.z]}>
          <Html center distanceFactor={10}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 10 }}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(isSelected ? null : connection);
              }}
            >
              <div
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap border-2 transition-all backdrop-blur-sm ${
                  isSelected ? 'ring-2 ring-white/40' : ''
                }`}
                style={{
                  backgroundColor: `${connection.color}40`,
                  color: 'white',
                  borderColor: connection.color,
                  boxShadow: `0 0 30px ${connection.color}90, 0 0 60px ${connection.color}50, inset 0 0 20px ${connection.color}30`
                }}
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 animate-pulse" style={{ color: '#fbbf24' }} />
                  <span>{connection.label}</span>
                  {connection.amount && (
                    <span className="text-yellow-300 font-bold">{connection.amount}</span>
                  )}
                </div>
              </div>
            </motion.div>
          </Html>
        </Billboard>
      )}
    </group>
  );
}

// Camera Controller with view centered on PT LLC - now also updates look-at target
function CameraController({ selectedEntity, orbitControlsRef }: { selectedEntity: string | null; orbitControlsRef: React.RefObject<any> }) {
  const { camera } = useThree();
  const targetPosition = useRef(new THREE.Vector3(100, 60, 120)); // Camera position (expanded for 3.5x universe)
  const lookAtTarget = useRef(new THREE.Vector3(0, 10, 0)); // What camera looks at
  const isAnimating = useRef(false);
  const lastSelectedEntity = useRef<string | null>(null);
  const animationProgress = useRef(0);

  useEffect(() => {
    if (selectedEntity !== lastSelectedEntity.current) {
      isAnimating.current = true;
      animationProgress.current = 0;
      lastSelectedEntity.current = selectedEntity;

      if (selectedEntity) {
        const entity = entities.find(e => e.id === selectedEntity);
        if (entity) {
          const entityPos = new THREE.Vector3(...entity.position);
          // Position camera to view selected entity from a good angle - scaled for larger entities
          targetPosition.current.set(
            entityPos.x + 25,
            entityPos.y + 15,
            entityPos.z + 30
          );
          // Look directly at the entity
          lookAtTarget.current.copy(entityPos);
        }
      } else {
        // Default view - looking at structure from elevated front-right (expanded universe)
        targetPosition.current.set(100, 60, 120);
        lookAtTarget.current.set(0, 10, 0);
      }
    }
  }, [selectedEntity]);

  useFrame(() => {
    if (isAnimating.current) {
      camera.position.lerp(targetPosition.current, 0.06);
      animationProgress.current += 0.04;

      // Also update the OrbitControls target
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.lerp(lookAtTarget.current, 0.06);
        orbitControlsRef.current.update();
      }

      const distance = camera.position.distanceTo(targetPosition.current);
      if (distance < 0.2 || animationProgress.current > 1) {
        isAnimating.current = false;
      }
    }
  });

  return null;
}

// Shield bubble effect for IP LLC - clean wireframe outside entity mesh
function ShieldBubble({ position, isActive }: { position: [number, number, number]; isActive: boolean }) {
  const shieldRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!isActive) return;
    const time = state.clock.elapsedTime;

    if (shieldRef.current) {
      // Pulsing scale - scaled up for 3.5x larger planets
      const scale = 5.5 + Math.sin(time * 2) * 0.2;
      shieldRef.current.scale.setScalar(scale);
      // Slow rotation
      shieldRef.current.rotation.y += 0.003;
      shieldRef.current.rotation.x = Math.sin(time * 0.5) * 0.05;
    }
  });

  if (!isActive) return null;

  return (
    <group position={position}>
      {/* Outer wireframe - surrounds entity mesh */}
      <mesh ref={shieldRef}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color="#a855f7"
          emissive="#a855f7"
          emissiveIntensity={0.4}
          transparent
          opacity={0.2}
          wireframe
        />
      </mesh>
    </group>
  );
}

// Crown/Power effect for Holdings - clean wireframe outside entity mesh (blue)
function CrownEffect({ position, isActive }: { position: [number, number, number]; isActive: boolean }) {
  const shieldRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!isActive) return;
    const time = state.clock.elapsedTime;

    if (shieldRef.current) {
      // Pulsing scale - larger for Holdings (biggest entity) - scaled up for 3.5x planets
      const scale = 7.0 + Math.sin(time * 2) * 0.3;
      shieldRef.current.scale.setScalar(scale);
      // Slow rotation
      shieldRef.current.rotation.y += 0.003;
      shieldRef.current.rotation.x = Math.sin(time * 0.5) * 0.05;
    }
  });

  if (!isActive) return null;

  return (
    <group position={position}>
      {/* Outer wireframe - surrounds entity mesh */}
      <mesh ref={shieldRef}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color="#3b82f6"
          emissive="#3b82f6"
          emissiveIntensity={0.4}
          transparent
          opacity={0.2}
          wireframe
        />
      </mesh>
    </group>
  );
}

// Gear/Mechanical effect for Ops LLC - clean wireframe outside entity mesh (green)
function GearEffect({ position, isActive }: { position: [number, number, number]; isActive: boolean }) {
  const shieldRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!isActive) return;
    const time = state.clock.elapsedTime;

    if (shieldRef.current) {
      // Pulsing scale - scaled up for 3.5x larger planets
      const scale = 5.5 + Math.sin(time * 2) * 0.2;
      shieldRef.current.scale.setScalar(scale);
      // Slow rotation
      shieldRef.current.rotation.y += 0.003;
      shieldRef.current.rotation.x = Math.sin(time * 0.5) * 0.05;
    }
  });

  if (!isActive) return null;

  return (
    <group position={position}>
      {/* Outer wireframe - surrounds entity mesh */}
      <mesh ref={shieldRef}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color="#22c55e"
          emissive="#22c55e"
          emissiveIntensity={0.4}
          transparent
          opacity={0.2}
          wireframe
        />
      </mesh>
    </group>
  );
}

// Vault/Treasury effect for Finance LLC - clean wireframe outside entity mesh (emerald)
function VaultEffect({ position, isActive }: { position: [number, number, number]; isActive: boolean }) {
  const shieldRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!isActive) return;
    const time = state.clock.elapsedTime;

    if (shieldRef.current) {
      // Pulsing scale - scaled up for 3.5x larger planets
      const scale = 5.5 + Math.sin(time * 2) * 0.2;
      shieldRef.current.scale.setScalar(scale);
      // Slow rotation
      shieldRef.current.rotation.y += 0.003;
      shieldRef.current.rotation.x = Math.sin(time * 0.5) * 0.05;
    }
  });

  if (!isActive) return null;

  return (
    <group position={position}>
      {/* Outer wireframe - surrounds entity mesh */}
      <mesh ref={shieldRef}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#10b981"
          emissiveIntensity={0.4}
          transparent
          opacity={0.2}
          wireframe
        />
      </mesh>
    </group>
  );
}

// Enhanced pulse effect for PT LLC (Admin) - clean wireframe outside entity mesh (amber/orange)
function AdminPulseEffect({ position, isActive }: { position: [number, number, number]; isActive: boolean }) {
  const shieldRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!isActive) return;
    const time = state.clock.elapsedTime;

    if (shieldRef.current) {
      // Pulsing scale - scaled up for 3.5x larger planets
      const scale = 5.5 + Math.sin(time * 2) * 0.2;
      shieldRef.current.scale.setScalar(scale);
      // Slow rotation
      shieldRef.current.rotation.y += 0.003;
      shieldRef.current.rotation.x = Math.sin(time * 0.5) * 0.05;
    }
  });

  if (!isActive) return null;

  return (
    <group position={position}>
      {/* Outer wireframe - surrounds entity mesh */}
      <mesh ref={shieldRef}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#f59e0b"
          emissiveIntensity={0.4}
          transparent
          opacity={0.2}
          wireframe
        />
      </mesh>
    </group>
  );
}

// Pulse wave effect rippling from PT LLC
function PulseWaves({ position }: { position: [number, number, number] }) {
  const wave1Ref = useRef<THREE.Mesh>(null);
  const wave2Ref = useRef<THREE.Mesh>(null);
  const wave3Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Wave 1
    if (wave1Ref.current) {
      const scale1 = ((time * 0.5) % 3) * 2 + 0.5;
      wave1Ref.current.scale.set(scale1, 0.1, scale1);
      const material = wave1Ref.current.material as THREE.MeshBasicMaterial;
      material.opacity = Math.max(0, 0.4 - (scale1 / 8));
    }

    // Wave 2 (offset)
    if (wave2Ref.current) {
      const scale2 = (((time * 0.5) + 1) % 3) * 2 + 0.5;
      wave2Ref.current.scale.set(scale2, 0.1, scale2);
      const material = wave2Ref.current.material as THREE.MeshBasicMaterial;
      material.opacity = Math.max(0, 0.4 - (scale2 / 8));
    }

    // Wave 3 (offset)
    if (wave3Ref.current) {
      const scale3 = (((time * 0.5) + 2) % 3) * 2 + 0.5;
      wave3Ref.current.scale.set(scale3, 0.1, scale3);
      const material = wave3Ref.current.material as THREE.MeshBasicMaterial;
      material.opacity = Math.max(0, 0.4 - (scale3 / 8));
    }
  });

  return (
    <group position={position}>
      <mesh ref={wave1Ref} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.08, 8, 64]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.4} />
      </mesh>
      <mesh ref={wave2Ref} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.08, 8, 64]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.4} />
      </mesh>
      <mesh ref={wave3Ref} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.08, 8, 64]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

// Compliance warning indicator - 3D holographic alert orbiting an entity
function ComplianceWarning({ position, count, yOffset = 2.0 }: { position: [number, number, number]; count: number; yOffset?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  const outerGlowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Orbit around entity in a 3D path - closer to entity
    if (groupRef.current) {
      const radius = 2; // Reduced from 3 - closer orbit
      const orbitSpeed = 0.8;
      groupRef.current.position.x = position[0] + Math.cos(time * orbitSpeed) * radius;
      groupRef.current.position.y = position[1] + yOffset + Math.sin(time * 1.5) * 0.3;
      groupRef.current.position.z = position[2] + Math.sin(time * orbitSpeed) * radius;
    }

    // Core rotation and pulse
    if (coreRef.current) {
      coreRef.current.rotation.x += 0.02;
      coreRef.current.rotation.y += 0.03;
      const scale = 1 + Math.sin(time * 4) * 0.15;
      coreRef.current.scale.setScalar(scale);
      const material = coreRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 2 + Math.sin(time * 5) * 0.5;
    }

    // Multiple orbiting rings at different angles
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = time * 2;
      ring1Ref.current.rotation.y = time * 0.5;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = time * 1.5 + Math.PI / 3;
      ring2Ref.current.rotation.z = time * 0.8;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.y = time * 2.5;
      ring3Ref.current.rotation.z = time * 0.3 + Math.PI / 6;
    }

    // Outer glow pulse
    if (outerGlowRef.current) {
      const scale = 1.2 + Math.sin(time * 3) * 0.2;
      outerGlowRef.current.scale.setScalar(scale);
      const material = outerGlowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.15 + Math.sin(time * 4) * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Outer glow sphere */}
      <mesh ref={outerGlowRef}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.15} />
      </mesh>

      {/* Core icosahedron */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.25, 0]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={2.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Ring 1 - horizontal */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[0.5, 0.03, 8, 32]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={1.5}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Ring 2 - tilted */}
      <mesh ref={ring2Ref}>
        <torusGeometry args={[0.6, 0.02, 8, 32]} />
        <meshStandardMaterial
          color="#fca5a5"
          emissive="#ef4444"
          emissiveIntensity={1}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Ring 3 - perpendicular */}
      <mesh ref={ring3Ref}>
        <torusGeometry args={[0.45, 0.015, 8, 32]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.5} />
      </mesh>

      {/* 3D Text label using Text component */}
      <Billboard follow={true} position={[0, 0.9, 0]}>
        <Text
          fontSize={0.18}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#ef4444"
        >
          {count} OVERDUE
        </Text>
      </Billboard>

      {/* Orbiting particles */}
      <Sparkles
        count={15}
        scale={1.8}
        size={2}
        speed={1.5}
        color="#ef4444"
        opacity={0.9}
      />

      {/* Energy trail effect */}
      <Trail
        width={0.8}
        length={8}
        color="#ef4444"
        attenuation={(t) => t * t}
      >
        <mesh position={[0.4, 0, 0]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      </Trail>
    </group>
  );
}

// Simulated overdue compliance data (in a real app, this would come from your backend)
const overdueComplianceByEntity: Record<string, number> = {
  // Simulate some overdue items for demonstration
  'holdings': 1, // 1 overdue: Annual meeting
  'admin': 2,    // 2 overdue: Client trust reconciliation, PRO audit
  'ip': 0,       // None overdue
  'ops': 0,      // None overdue
  'finance': 1,  // 1 overdue: Intercompany reconciliation
};

// Y-offset for each entity's compliance warning orbiter (adjust individually)
const complianceOrbiterYOffsets: Record<string, number> = {
  'holdings': 5.0,  // Higher offset for Holdings
  'admin': 2.0,     // PT LLC orbiter offset
  'finance': 2.0,   // Finance orbiter offset
};

// UNAF FBX Ship component - loads modular FBX parts
function UNAFShip() {
  // Load all the FBX parts
  const front = useFBX('/models/Front_01.FBX');
  const cockpit = useFBX('/models/Cockpit_01.FBX');
  const back = useFBX('/models/Back_01.FBX');
  const wing = useFBX('/models/Wing_01.FBX');

  // Clone and apply custom colored materials
  const parts = useMemo(() => {
    const hullMaterial = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      emissive: '#3b82f6',
      emissiveIntensity: 0.1,
      metalness: 0.85,
      roughness: 0.25,
    });
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: '#334155',
      emissive: '#60a5fa',
      emissiveIntensity: 0.15,
      metalness: 0.9,
      roughness: 0.2,
    });

    const setupModel = (fbx: THREE.Group, material: THREE.Material) => {
      const clone = fbx.clone();
      clone.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.material = material;
        }
      });
      return clone;
    };
    return {
      front: setupModel(front, hullMaterial),
      cockpit: setupModel(cockpit, accentMaterial),
      back: setupModel(back, hullMaterial),
      wing: setupModel(wing, accentMaterial),
    };
  }, [front, cockpit, back, wing]);

  const scale = 0.001; // Scaled down ~7x

  return (
    <group scale={[scale, scale, scale]} rotation={[0, 0, 0]}>
      <primitive object={parts.front} position={[0, 0, 0]} />
      <primitive object={parts.cockpit} position={[0, 0, 0]} />
      <primitive object={parts.back} position={[0, 0, 0]} />
      <primitive object={parts.wing} position={[0, 0, 0]} />
      {/* Cockpit glow */}
      <pointLight color="#60a5fa" intensity={0.5} distance={300} position={[0, 50, -100]} />
    </group>
  );
}

// Spaceship component for fly mode - Multiple ship designs
function Spaceship({ position, rotation, viewMode, model = 'rocket' }: {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  viewMode: 'first' | 'third';
  model?: 'rocket' | 'fighter' | 'unaf';
}) {
  const groupRef = useRef<THREE.Group>(null);
  const flameRef = useRef<THREE.Mesh>(null);
  const innerFlameRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Frame-rate independent smooth follow position
      const dt = Math.min(delta, 0.05);
      const lerpFactor = 1 - Math.exp(-12 * dt); // Higher = more responsive
      groupRef.current.position.lerp(position, lerpFactor);

      // Smooth rotation
      groupRef.current.rotation.y = rotation.y;

      // Slight banking effect when turning
      const time = state.clock.elapsedTime;
      groupRef.current.rotation.z = Math.sin(time * 2) * 0.03;
    }

    // Animated engine flame
    if (flameRef.current) {
      const time = state.clock.elapsedTime;
      const scale = 1 + Math.sin(time * 15) * 0.2;
      flameRef.current.scale.set(1, scale, 1);
      const material = flameRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.7 + Math.sin(time * 20) * 0.2;
    }
    if (innerFlameRef.current) {
      const time = state.clock.elapsedTime;
      const scale = 1 + Math.sin(time * 18) * 0.3;
      innerFlameRef.current.scale.set(1, scale, 1);
    }
  });

  // Don't render in first person mode (we ARE the ship)
  if (viewMode === 'first') return null;

  // Shared engine effects
  const EngineEffects = () => (
    <>
      <mesh ref={flameRef} position={[0, 0, 1.3]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.2, 0.8, 8]} />
        <meshBasicMaterial color="#f97316" transparent opacity={0.8} />
      </mesh>
      <mesh ref={innerFlameRef} position={[0, 0, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.12, 0.5, 8]} />
        <meshBasicMaterial color="#fef08a" transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0, 1.1]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.06, 0.3, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <Sparkles count={30} scale={1.5} size={3} speed={3} color="#f97316" position={[0, 0, 1.5]} />
    </>
  );

  return (
    <group ref={groupRef}>
      {/* ROCKET - Classic retro rocket */}
      {model === 'rocket' && (
        <>
          <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.25, 0.3, 1.8, 16]} />
            <meshStandardMaterial color="#e5e7eb" emissive="#3b82f6" emissiveIntensity={0.1} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.25, 0.7, 16]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.27, 0.27, 0.15, 16]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.2} metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.22, -0.5]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#60a5fa" emissive="#60a5fa" emissiveIntensity={1} transparent opacity={0.9} />
          </mesh>
          {[0, 90, 180, 270].map((angle) => (
            <mesh key={angle} position={[Math.sin((angle * Math.PI) / 180) * 0.3, Math.cos((angle * Math.PI) / 180) * 0.3, 0.7]} rotation={[0, 0, (-angle * Math.PI) / 180]}>
              <boxGeometry args={[0.02, 0.5, 0.4]} />
              <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.2} metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
          <mesh position={[0, 0, 0.95]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.28, 0.15, 16]} />
            <meshStandardMaterial color="#374151" emissive="#f59e0b" emissiveIntensity={0.3} metalness={0.9} roughness={0.1} />
          </mesh>
        </>
      )}

      {/* FIGHTER - Sleek X-wing style */}
      {model === 'fighter' && (
        <>
          {/* Main body - elongated hexagon shape */}
          <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.2, 2.2, 6]} />
            <meshStandardMaterial color="#1e293b" emissive="#6366f1" emissiveIntensity={0.15} metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Cockpit bubble */}
          <mesh position={[0, 0.15, -0.4]}>
            <sphereGeometry args={[0.18, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#60a5fa" emissive="#60a5fa" emissiveIntensity={0.8} transparent opacity={0.7} />
          </mesh>
          {/* Nose cone - sharp */}
          <mesh position={[0, 0, -1.4]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.15, 0.6, 6]} />
            <meshStandardMaterial color="#475569" emissive="#6366f1" emissiveIntensity={0.2} metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Wings - X configuration */}
          {[-1, 1].map((side) => (
            <group key={side}>
              {/* Upper wing */}
              <mesh position={[side * 0.6, 0.3, 0.2]} rotation={[0, 0, side * 0.3]}>
                <boxGeometry args={[1.0, 0.03, 0.6]} />
                <meshStandardMaterial color="#334155" emissive="#6366f1" emissiveIntensity={0.1} metalness={0.8} roughness={0.3} />
              </mesh>
              {/* Lower wing */}
              <mesh position={[side * 0.6, -0.3, 0.2]} rotation={[0, 0, side * -0.3]}>
                <boxGeometry args={[1.0, 0.03, 0.6]} />
                <meshStandardMaterial color="#334155" emissive="#6366f1" emissiveIntensity={0.1} metalness={0.8} roughness={0.3} />
              </mesh>
              {/* Wing tip lasers */}
              <mesh position={[side * 1.1, 0.35, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
              </mesh>
              <mesh position={[side * 1.1, -0.35, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
              </mesh>
            </group>
          ))}
          {/* Engine pods */}
          {[-0.4, 0.4].map((x) => (
            <mesh key={x} position={[x, 0, 0.9]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.1, 0.12, 0.4, 8]} />
              <meshStandardMaterial color="#1e293b" emissive="#f59e0b" emissiveIntensity={0.4} metalness={0.9} roughness={0.1} />
            </mesh>
          ))}
        </>
      )}

      {/* UNAF - FBX modular spaceship */}
      {model === 'unaf' && (
        <Suspense fallback={null}>
          <UNAFShip />
        </Suspense>
      )}

      <EngineEffects />
    </group>
  );
}


// ============================================================================
// MULTIPLAYER COMPONENTS
// ============================================================================

// Player3D interface for multiplayer state
interface Player3D {
  id: string;
  username: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  color: string;
}

// Other player's rocketship with username label
function OtherPlayerShip({ player }: { player: Player3D }) {
  const groupRef = useRef<THREE.Group>(null);
  const targetPosition = useRef(new THREE.Vector3(player.position.x, player.position.y, player.position.z));
  const targetRotation = useRef(new THREE.Euler(player.rotation.x, player.rotation.y, player.rotation.z));
  const flameRef = useRef<THREE.Mesh>(null);

  // Update targets when player data changes
  useEffect(() => {
    targetPosition.current.set(player.position.x, player.position.y, player.position.z);
    targetRotation.current.set(player.rotation.x, player.rotation.y, player.rotation.z);
  }, [player.position, player.rotation]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Smooth interpolation to target position
      const dt = Math.min(delta, 0.05);
      const lerpFactor = 1 - Math.exp(-8 * dt);
      groupRef.current.position.lerp(targetPosition.current, lerpFactor);

      // Smooth rotation
      groupRef.current.rotation.y += (targetRotation.current.y - groupRef.current.rotation.y) * lerpFactor;
    }

    // Animated engine flame
    if (flameRef.current) {
      const time = state.clock.elapsedTime;
      const scale = 1 + Math.sin(time * 15 + player.id.charCodeAt(0)) * 0.2;
      flameRef.current.scale.set(1, scale, 1);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Username label above ship */}
      <Billboard position={[0, 1.8, 0]} follow lockX={false} lockY={false} lockZ={false}>
        <Html
          center
          distanceFactor={15}
          style={{
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <div
            className="px-2 py-1 rounded-lg text-xs font-bold shadow-lg"
            style={{
              backgroundColor: player.color + '40',
              border: `2px solid ${player.color}`,
              color: player.color,
              textShadow: '0 0 10px rgba(0,0,0,0.8)',
            }}
          >
            {player.username}
          </div>
        </Html>
      </Billboard>

      {/* Rocket body - main fuselage */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 1.5, 16]} />
        <meshStandardMaterial
          color={player.color}
          emissive={player.color}
          emissiveIntensity={0.3}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Nose cone */}
      <mesh position={[0, 0, -1]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.2, 0.5, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.2}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Stripe band */}
      <mesh position={[0, 0, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.1, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Porthole window */}
      <mesh position={[0, 0.18, -0.4]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial
          color={player.color}
          emissive={player.color}
          emissiveIntensity={1}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Fins - 4 stabilizer fins */}
      {[0, 90, 180, 270].map((angle) => (
        <mesh
          key={angle}
          position={[
            Math.sin((angle * Math.PI) / 180) * 0.25,
            Math.cos((angle * Math.PI) / 180) * 0.25,
            0.6
          ]}
          rotation={[0, 0, (-angle * Math.PI) / 180]}
        >
          <boxGeometry args={[0.015, 0.4, 0.3]} />
          <meshStandardMaterial
            color={player.color}
            emissive={player.color}
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}

      {/* Engine nozzle */}
      <mesh position={[0, 0, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.22, 0.12, 16]} />
        <meshStandardMaterial
          color="#374151"
          emissive={player.color}
          emissiveIntensity={0.3}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Outer flame */}
      <mesh ref={flameRef} position={[0, 0, 1.1]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.15, 0.6, 8]} />
        <meshBasicMaterial color={player.color} transparent opacity={0.7} />
      </mesh>

      {/* Inner flame */}
      <mesh position={[0, 0, 1]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.08, 0.4, 8]} />
        <meshBasicMaterial color="#fef08a" transparent opacity={0.9} />
      </mesh>

      {/* Trail sparkles */}
      <Sparkles
        count={20}
        scale={[0.5, 0.5, 1.5]}
        size={2}
        speed={2}
        color={player.color}
        opacity={0.6}
        position={[0, 0, 1.2]}
      />
    </group>
  );
}

// Spaceship camera controller with smooth frame-rate independent following
function SpaceshipCameraController({
  shipPosition,
  shipRotation,
  viewMode,
  isActive
}: {
  shipPosition: THREE.Vector3;
  shipRotation: THREE.Euler;
  viewMode: 'first' | 'third';
  isActive: boolean;
}) {
  const { camera } = useThree();
  const targetPosition = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const smoothPosition = useRef(new THREE.Vector3());
  const smoothLookAt = useRef(new THREE.Vector3());
  const initialized = useRef(false);

  useFrame((_, delta) => {
    if (!isActive) return;

    // Clamp delta to prevent huge jumps
    const dt = Math.min(delta, 0.05);

    if (viewMode === 'first') {
      // First person - camera inside cockpit
      targetPosition.current.copy(shipPosition);
      targetPosition.current.y += 0.3;

      // Look in direction of ship
      const lookDir = new THREE.Vector3(0, 0, -10);
      lookDir.applyEuler(shipRotation);
      targetLookAt.current.copy(shipPosition).add(lookDir);
    } else {
      // Third person - camera behind and above ship
      const offset = new THREE.Vector3(0, 3, 8);
      offset.applyEuler(new THREE.Euler(0, shipRotation.y, 0));
      targetPosition.current.copy(shipPosition).add(offset);
      targetLookAt.current.copy(shipPosition);
    }

    // Initialize smooth values on first frame
    if (!initialized.current) {
      smoothPosition.current.copy(targetPosition.current);
      smoothLookAt.current.copy(targetLookAt.current);
      initialized.current = true;
    }

    // Frame-rate independent smoothing using exponential decay
    // Higher smoothFactor = smoother but laggier
    const positionSmoothFactor = 8; // Higher = more responsive
    const lookAtSmoothFactor = 10;

    const positionLerpFactor = 1 - Math.exp(-positionSmoothFactor * dt);
    const lookAtLerpFactor = 1 - Math.exp(-lookAtSmoothFactor * dt);

    smoothPosition.current.lerp(targetPosition.current, positionLerpFactor);
    smoothLookAt.current.lerp(targetLookAt.current, lookAtLerpFactor);

    camera.position.copy(smoothPosition.current);
    camera.lookAt(smoothLookAt.current);
  });

  return null;
}

// Spaceship fly controller - handles keyboard input with momentum physics (frame-rate independent)
function SpaceshipFlyController({
  isActive,
  shipPosition,
  shipRotation,
  setShipPosition,
  setShipRotation,
  setVelocityMagnitude
}: {
  isActive: boolean;
  shipPosition: THREE.Vector3;
  shipRotation: THREE.Euler;
  setShipPosition: (pos: THREE.Vector3) => void;
  setShipRotation: (rot: THREE.Euler) => void;
  setVelocityMagnitude?: (vel: number) => void;
}) {
  const [, getKeys] = useKeyboardControls();

  // Physics parameters - scaled for expanded 3.5x universe
  const baseMaxSpeed = 1.2; // Normal max speed
  const boostMaxSpeed = 3.6; // 3x speed when boosting
  const baseAcceleration = 4.0; // Per-second acceleration
  const boostAcceleration = 12.0; // 3x acceleration when boosting
  const baseDrag = 3.0; // Per-second drag factor
  const baseTurnSpeed = 2.5; // Per-second turn speed
  const baseTurnDrag = 5.0; // Per-second angular drag
  const maxTurnRate = 0.04;

  // Momentum state
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const angularVelocity = useRef(0);

  useFrame((_, delta) => {
    if (!isActive) return;

    // Clamp delta to prevent huge jumps on frame drops
    const dt = Math.min(delta, 0.05);

    const keys = getKeys();
    const newPosition = shipPosition.clone();
    const newRotation = shipRotation.clone();

    // Check if boosting
    const isBoosting = keys.boost;
    const currentAcceleration = isBoosting ? boostAcceleration : baseAcceleration;
    const currentMaxSpeed = isBoosting ? boostMaxSpeed : baseMaxSpeed;

    // Get forward direction based on ship rotation
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyEuler(newRotation);

    // Apply thrust with frame-rate independent acceleration
    if (keys.forward) {
      velocity.current.add(forward.clone().multiplyScalar(currentAcceleration * dt));
    }
    if (keys.backward) {
      velocity.current.add(forward.clone().multiplyScalar(-currentAcceleration * 0.5 * dt));
    }

    // Apply vertical thrust
    if (keys.up) {
      velocity.current.y += currentAcceleration * 0.7 * dt;
    }
    if (keys.down) {
      velocity.current.y -= currentAcceleration * 0.7 * dt;
    }

    // Apply turn with angular momentum (frame-rate independent)
    if (keys.left) {
      angularVelocity.current += baseTurnSpeed * dt;
    }
    if (keys.right) {
      angularVelocity.current -= baseTurnSpeed * dt;
    }

    // Apply frame-rate independent drag (exponential decay) - less drag when boosting
    const dragMultiplier = Math.exp(-(isBoosting ? baseDrag * 0.5 : baseDrag) * dt);
    velocity.current.multiplyScalar(dragMultiplier);

    const angularDragMultiplier = Math.exp(-baseTurnDrag * dt);
    angularVelocity.current *= angularDragMultiplier;

    // Clamp velocity to max speed
    if (velocity.current.length() > currentMaxSpeed) {
      velocity.current.normalize().multiplyScalar(currentMaxSpeed);
    }

    // Clamp angular velocity
    angularVelocity.current = Math.max(-maxTurnRate, Math.min(maxTurnRate, angularVelocity.current));

    // Apply velocity to position (already frame-rate independent since velocity is per-frame)
    newPosition.add(velocity.current);

    // Apply angular velocity to rotation
    newRotation.y += angularVelocity.current;

    // Clamp Y position with soft bounce - scaled for expanded universe
    if (newPosition.y < 1) {
      newPosition.y = 1;
      velocity.current.y = Math.abs(velocity.current.y) * 0.2;
    }
    if (newPosition.y > 80) {
      newPosition.y = 80;
      velocity.current.y = -Math.abs(velocity.current.y) * 0.2;
    }

    // Boundary check for X and Z - scaled 3.5x for expanded universe
    const boundary = 150;
    if (Math.abs(newPosition.x) > boundary) {
      newPosition.x = Math.sign(newPosition.x) * boundary;
      velocity.current.x *= -0.2;
    }
    if (Math.abs(newPosition.z) > boundary) {
      newPosition.z = Math.sign(newPosition.z) * boundary;
      velocity.current.z *= -0.2;
    }

    setShipPosition(newPosition);
    setShipRotation(newRotation);

    // Report velocity magnitude for speed effects
    if (setVelocityMagnitude) {
      setVelocityMagnitude(velocity.current.length());
    }
  });

  return null;
}

// Orbit Mode Controller - automatically orbits the ship around a target entity
function OrbitModeController({
  isActive,
  targetEntity,
  shipPosition,
  shipRotation,
  setShipPosition,
  setShipRotation,
  onExitOrbit
}: {
  isActive: boolean;
  targetEntity: EntityData | null;
  shipPosition: THREE.Vector3;
  shipRotation: THREE.Euler;
  setShipPosition: (pos: THREE.Vector3) => void;
  setShipRotation: (rot: THREE.Euler) => void;
  onExitOrbit: () => void;
}) {
  const [, getKeys] = useKeyboardControls();
  const orbitAngle = useRef(0);
  const transitionProgress = useRef(0);
  const initialPosition = useRef(new THREE.Vector3());
  const isTransitioning = useRef(true);

  // Orbit parameters
  const orbitRadius = 20; // Distance from entity center
  const orbitHeight = 8; // Height above entity
  const orbitSpeed = 0.3; // Radians per second
  const transitionDuration = 1.5; // Seconds to transition into orbit

  useFrame((_, delta) => {
    if (!isActive || !targetEntity) return;

    const dt = Math.min(delta, 0.05);
    const keys = getKeys();

    // Check for exit orbit key
    if (keys.exitOrbit) {
      onExitOrbit();
      return;
    }

    const targetPos = new THREE.Vector3(...targetEntity.position);

    // Handle transition into orbit
    if (isTransitioning.current) {
      if (transitionProgress.current === 0) {
        // Store initial position when starting transition
        initialPosition.current.copy(shipPosition);
        // Calculate initial angle based on ship position relative to target
        const toShip = shipPosition.clone().sub(targetPos);
        orbitAngle.current = Math.atan2(toShip.x, toShip.z);

        // IMMEDIATELY face the planet at the start of orbit transition
        const lookDir = targetPos.clone().sub(shipPosition);
        const immediateRotationY = Math.atan2(lookDir.x, lookDir.z);
        const immediateRotation = shipRotation.clone();
        immediateRotation.y = immediateRotationY;
        setShipRotation(immediateRotation);
      }

      transitionProgress.current += dt / transitionDuration;

      if (transitionProgress.current >= 1) {
        transitionProgress.current = 1;
        isTransitioning.current = false;
      }

      // Smoothly interpolate to orbit position
      const t = smoothstep(0, 1, transitionProgress.current);

      // Calculate target orbit position
      const orbitX = targetPos.x + Math.sin(orbitAngle.current) * orbitRadius;
      const orbitZ = targetPos.z + Math.cos(orbitAngle.current) * orbitRadius;
      const orbitY = targetPos.y + orbitHeight;

      const newPosition = new THREE.Vector3(
        lerp(initialPosition.current.x, orbitX, t),
        lerp(initialPosition.current.y, orbitY, t),
        lerp(initialPosition.current.z, orbitZ, t)
      );

      setShipPosition(newPosition);

      // Keep facing target during transition (already set to face target initially)
      const lookDir = targetPos.clone().sub(newPosition);
      const targetRotationY = Math.atan2(lookDir.x, lookDir.z);
      const currentRotation = shipRotation.clone();
      currentRotation.y = targetRotationY; // Direct assignment, no lerp - always face planet
      setShipRotation(currentRotation);

    } else {
      // Normal orbiting
      orbitAngle.current += orbitSpeed * dt;

      // Calculate new orbit position
      const orbitX = targetPos.x + Math.sin(orbitAngle.current) * orbitRadius;
      const orbitZ = targetPos.z + Math.cos(orbitAngle.current) * orbitRadius;
      const orbitY = targetPos.y + orbitHeight;

      const newPosition = new THREE.Vector3(orbitX, orbitY, orbitZ);
      setShipPosition(newPosition);

      // Keep facing the target
      const lookDir = targetPos.clone().sub(newPosition);
      const targetRotationY = Math.atan2(lookDir.x, lookDir.z);
      const currentRotation = shipRotation.clone();
      currentRotation.y = targetRotationY;
      setShipRotation(currentRotation);
    }
  });

  // Reset transition state when target changes
  useEffect(() => {
    if (isActive && targetEntity) {
      transitionProgress.current = 0;
      isTransitioning.current = true;
    }
  }, [isActive, targetEntity?.id]);

  return null;
}

// Helper functions for orbit mode
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Portal Controller - detects proximity and handles portal entry
function PortalController({
  isActive,
  shipPosition,
  portalState,
  setPortalState,
  warpProgress,
  setWarpProgress,
  setNearPortal,
  setOrbitTarget
}: {
  isActive: boolean;
  shipPosition: THREE.Vector3;
  portalState: 'outside' | 'warping-in' | 'inside' | 'warping-out';
  setPortalState: (state: 'outside' | 'warping-in' | 'inside' | 'warping-out') => void;
  warpProgress: number;
  setWarpProgress: (progress: number) => void;
  setNearPortal: (id: string | null) => void;
  setOrbitTarget: (id: string | null) => void;
}) {
  const [, getKeys] = useKeyboardControls();
  const hasEnteredPortal = useRef(false);
  const warpDuration = 2.5; // seconds

  useFrame((_, delta) => {
    if (!isActive) return;

    const dt = Math.min(delta, 0.05);
    const keys = getKeys();

    // Get Holdings position
    const holdingsEntity = entities.find(e => e.id === 'holdings');
    if (!holdingsEntity) return;

    const holdingsPos = new THREE.Vector3(...holdingsEntity.position);
    const distanceToHoldings = shipPosition.distanceTo(holdingsPos);
    const portalRadius = 25; // Distance to activate portal prompt

    // Check if near Holdings portal
    if (distanceToHoldings < portalRadius && portalState === 'outside') {
      setNearPortal('holdings');

      // Check for portal entry key
      if (keys.enterPortal && !hasEnteredPortal.current) {
        hasEnteredPortal.current = true;
        setPortalState('warping-in');
        setWarpProgress(0);
        setOrbitTarget(null); // Exit orbit if in one
      }
    } else if (portalState === 'outside') {
      setNearPortal(null);
    }

    // Reset key tracking when released
    if (!keys.enterPortal) {
      hasEnteredPortal.current = false;
    }

    // Handle warp animation
    if (portalState === 'warping-in') {
      const newProgress = warpProgress + dt / warpDuration;
      if (newProgress >= 1) {
        setWarpProgress(1);
        setPortalState('inside');
      } else {
        setWarpProgress(newProgress);
      }
    }

    if (portalState === 'warping-out') {
      const newProgress = warpProgress + dt / warpDuration;
      if (newProgress >= 1) {
        setWarpProgress(0);
        setPortalState('outside');
      } else {
        setWarpProgress(newProgress);
      }
    }
  });

  return null;
}

// Ambient sound manager hook - Ecosystem soundscape
function useAmbientSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const noiseNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const isInitializedRef = useRef(false);

  const initAudio = useCallback(() => {
    if (isInitializedRef.current) return;

    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = 0.02; // Very quiet ambient ecosystem
      gainNodeRef.current.connect(audioContextRef.current.destination);

      // Create layered ecosystem soundscape

      // 1. Gentle wind/air flow - filtered noise
      const noiseBuffer = audioContextRef.current.createBuffer(1, audioContextRef.current.sampleRate * 2, audioContextRef.current.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBuffer.length; i++) {
        noiseData[i] = Math.random() * 2 - 1;
      }
      noiseNodeRef.current = audioContextRef.current.createBufferSource();
      noiseNodeRef.current.buffer = noiseBuffer;
      noiseNodeRef.current.loop = true;

      // Low-pass filter for wind effect
      const windFilter = audioContextRef.current.createBiquadFilter();
      windFilter.type = 'lowpass';
      windFilter.frequency.value = 400;
      windFilter.Q.value = 1;

      const windGain = audioContextRef.current.createGain();
      windGain.gain.value = 0.15;

      noiseNodeRef.current.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(gainNodeRef.current);
      noiseNodeRef.current.start();

      // 2. Deep forest ambience - layered low frequencies
      const forestFreqs = [55, 82, 110, 165]; // A1, E2, A2, E3 - natural harmonics
      forestFreqs.forEach((freq, i) => {
        const osc = audioContextRef.current!.createOscillator();
        const oscGain = audioContextRef.current!.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        // Slow LFO modulation for organic feel
        const lfo = audioContextRef.current!.createOscillator();
        const lfoGain = audioContextRef.current!.createGain();
        lfo.frequency.value = 0.05 + i * 0.02; // Very slow modulation
        lfoGain.gain.value = 2 + i; // Subtle frequency wobble
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        oscGain.gain.value = 0.08 / (i + 1); // Lower volume for higher harmonics

        osc.connect(oscGain);
        oscGain.connect(gainNodeRef.current!);
        osc.start();

        oscillatorsRef.current.push(osc);
      });

      // 3. High ethereal shimmer - like distant birds/chimes
      const shimmerFreqs = [880, 1320, 1760]; // A5, E6, A6
      shimmerFreqs.forEach((freq, i) => {
        const osc = audioContextRef.current!.createOscillator();
        const oscGain = audioContextRef.current!.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        // Amplitude modulation for twinkling effect
        const ampLfo = audioContextRef.current!.createOscillator();
        const ampLfoGain = audioContextRef.current!.createGain();
        ampLfo.frequency.value = 0.3 + Math.random() * 0.5;
        ampLfoGain.gain.value = 0.01;

        ampLfo.connect(ampLfoGain);
        ampLfoGain.connect(oscGain.gain);
        ampLfo.start();

        oscGain.gain.value = 0.015 / (i + 1);

        osc.connect(oscGain);
        oscGain.connect(gainNodeRef.current!);
        osc.start();

        oscillatorsRef.current.push(osc);
      });

      isInitializedRef.current = true;
    } catch (e) {
      console.log('Audio not available');
    }
  }, []);

  const playSelectSound = useCallback(() => {
    if (!audioContextRef.current) return;

    try {
      const osc = audioContextRef.current.createOscillator();
      const gain = audioContextRef.current.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, audioContextRef.current.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, audioContextRef.current.currentTime + 0.1);

      gain.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(audioContextRef.current.destination);

      osc.start();
      osc.stop(audioContextRef.current.currentTime + 0.2);
    } catch (e) {}
  }, []);

  const playHoverSound = useCallback(() => {
    if (!audioContextRef.current) return;

    try {
      const osc = audioContextRef.current.createOscillator();
      const gain = audioContextRef.current.createGain();

      osc.type = 'sine';
      osc.frequency.value = 600;

      gain.gain.setValueAtTime(0.05, audioContextRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(audioContextRef.current.destination);

      osc.start();
      osc.stop(audioContextRef.current.currentTime + 0.1);
    } catch (e) {}
  }, []);

  useEffect(() => {
    return () => {
      // Stop all ecosystem oscillators
      oscillatorsRef.current.forEach(osc => {
        try { osc.stop(); } catch (e) {}
      });
      // Stop noise node
      if (noiseNodeRef.current) {
        try { noiseNodeRef.current.stop(); } catch (e) {}
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { initAudio, playSelectSound, playHoverSound };
}

// Hexagonal grid floor - scaled for expanded universe
function GridFloor() {
  // Generate hexagonal grid positions - scaled 3.5x for expanded layout
  const hexPositions = useMemo(() => {
    const hexes: [number, number][] = [];
    const hexSize = 14; // Larger hex for expanded universe (was 4)
    const gridSize = 12; // More hexes for larger area

    for (let q = -gridSize; q <= gridSize; q++) {
      for (let r = -gridSize; r <= gridSize; r++) {
        const x = hexSize * (3 / 2 * q);
        const z = hexSize * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
        if (Math.sqrt(x * x + z * z) > 160) continue; // Expanded radius (was 45)
        hexes.push([x, z]);
      }
    }
    return hexes;
  }, []);

  return (
    <group position={[0, -28, 0]}> {/* Lowered for expanded universe (was -8) */}
      {/* Dark base plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} /> {/* Expanded from 100 */}
        <meshStandardMaterial
          color="#020617"
          transparent
          opacity={0.98}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Hexagonal grid lines - scaled for expanded layout */}
      {hexPositions.map(([x, z], i) => (
        <mesh key={i} position={[x, 0, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[11.5, 12, 6]} /> {/* Scaled from 3.3, 3.45 */}
          <meshBasicMaterial
            color="#1e3a5f"
            transparent
            opacity={0.15}
          />
        </mesh>
      ))}

      {/* Center hex highlight with bloom simulation */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[12, 13, 6]} /> {/* Scaled from 3.5, 3.8 */}
        <meshStandardMaterial
          color="#3b82f6"
          emissive="#3b82f6"
          emissiveIntensity={1.5}
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* Bloom glow layer */}
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[11, 15, 6]} /> {/* Scaled from 3.2, 4.2 */}
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* Radial glow rings - scaled 3.5x */}
      {[52, 105].map((radius, i) => ( /* Was 15, 30 */
        <mesh key={i} position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius - 0.3, radius + 0.3, 64]} />
          <meshBasicMaterial
            color="#1e40af"
            transparent
            opacity={0.12 - i * 0.04}
          />
        </mesh>
      ))}

      {/* Contact shadows - scaled */}
      <ContactShadows
        position={[0, 0.02, 0]}
        opacity={0.4}
        scale={250}
        blur={3}
        far={80}
      />
    </group>
  );
}

// Orbital ring
function OrbitalRing({ radius, speed, color, thickness = 0.02 }: {
  radius: number;
  speed: number;
  color: string;
  thickness?: number;
}) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.PI / 2 + Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
      ringRef.current.rotation.z = state.clock.elapsedTime * speed;
    }
  });

  return (
    <mesh ref={ringRef} position={[0, 5, 0]}> {/* Raised for expanded universe */}
      <torusGeometry args={[radius, thickness, 16, 100]} />
      <meshBasicMaterial color={color} transparent opacity={0.25} />
    </mesh>
  );
}

// Simplified ambient particles - scaled for expanded universe
function AmbientParticles() {
  const particlesRef1 = useRef<THREE.Points>(null);

  // Single sparse galaxy cloud - scaled 3.5x for expanded universe
  const positions = useMemo(() => {
    const count = 600; // More particles for larger space
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 80 + Math.random() * 180; // Expanded from 25 + 50
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = (r * Math.cos(phi) * 0.3) + (Math.random() - 0.5) * 28; // Scaled vertical
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return pos;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (particlesRef1.current) {
      particlesRef1.current.rotation.y = t * 0.008;
    }
  });

  return (
    <>
      {/* Single optimized particle system */}
      <points ref={particlesRef1}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.4}
          color="#a5b4fc"
          transparent
          opacity={0.4}
          sizeAttenuation
        />
      </points>
      {/* Expanded sparkles */}
      <Sparkles
        count={150}
        scale={350}
        size={2}
        speed={0.1}
        color="#e0e7ff"
        opacity={0.25}
      />
    </>
  );
}

// Main Scene
function Scene({
  selectedEntity,
  setSelectedEntity,
  hoveredEntity,
  setHoveredEntity,
  selectedFlow,
  setSelectedFlow,
  selectedRevenue,
  setSelectedRevenue,
  showFlows: _showFlows,
  flyMode,
  shipPosition,
  shipRotation,
  setShipPosition,
  setShipRotation,
  shipVelocity,
  setShipVelocity,
  orbitTarget,
  setOrbitTarget,
  portalState,
  setPortalState,
  warpProgress,
  setWarpProgress,
  setNearPortal,
  otherPlayers,
  shipModel
}: {
  selectedEntity: string | null;
  setSelectedEntity: (id: string | null) => void;
  hoveredEntity: string | null;
  setHoveredEntity: (id: string | null) => void;
  selectedFlow: FlowConnection | null;
  setSelectedFlow: (f: FlowConnection | null) => void;
  selectedRevenue: string | null;
  setSelectedRevenue: (id: string | null) => void;
  showFlows: boolean;
  flyMode: 'off' | 'first' | 'third';
  shipPosition: THREE.Vector3;
  shipRotation: THREE.Euler;
  setShipPosition: (pos: THREE.Vector3) => void;
  setShipRotation: (rot: THREE.Euler) => void;
  shipVelocity: number;
  setShipVelocity: (vel: number) => void;
  orbitTarget: string | null;
  setOrbitTarget: (id: string | null) => void;
  portalState: 'outside' | 'warping-in' | 'inside' | 'warping-out';
  setPortalState: (state: 'outside' | 'warping-in' | 'inside' | 'warping-out') => void;
  warpProgress: number;
  setWarpProgress: (progress: number) => void;
  setNearPortal: (id: string | null) => void;
  otherPlayers: Player3D[];
  shipModel: 'rocket' | 'fighter' | 'unaf';
}) {
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const interactionTimeout = useRef<NodeJS.Timeout | null>(null);
  const orbitControlsRef = useRef<any>(null);

  const activeFlows = selectedEntity
    ? flowConnections.filter(f => f.from === selectedEntity || f.to === selectedEntity).map(f => f.from + f.to)
    : [];

  const handleInteractionStart = useCallback(() => {
    setIsUserInteracting(true);
    if (interactionTimeout.current) {
      clearTimeout(interactionTimeout.current);
    }
  }, []);

  const handleInteractionEnd = useCallback(() => {
    interactionTimeout.current = setTimeout(() => {
      setIsUserInteracting(false);
    }, 3000);
  }, []);

  return (
    <>
      {/* Depth fog for immersive atmosphere */}
      <fog attach="fog" args={['#020617', SCALE.FOG_NEAR, SCALE.FOG_FAR]} />

      {/* Lighting - scaled for expanded universe */}
      <ambientLight intensity={0.3} />
      <pointLight position={[35, 50, 35]} intensity={2} color="#ffffff" castShadow />
      <pointLight position={[-35, 35, -35]} intensity={1} color="#3b82f6" />
      <pointLight position={[0, -15, 0]} intensity={0.6} color="#10b981" />
      <spotLight
        position={[0, 100, 0]}
        intensity={1.5}
        angle={0.4}
        penumbra={1}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      {/* Nebula galaxy background */}
      <NebulaSkybox />

      {/* Stars background - expanded for 3.5x universe */}
      <Stars
        radius={500}
        depth={200}
        count={4000}
        factor={5}
        saturation={0.5}
        fade
        speed={0.2}
      />

      {/* Environment */}
      <Environment preset="night" />

      {/* Ambient particles */}
      <AmbientParticles />

      {/* Orbital rings - scaled 3.5x for expanded universe */}
      <OrbitalRing radius={70} speed={0.02} color="#3b82f6" thickness={0.08} />
      <OrbitalRing radius={112} speed={-0.01} color="#a855f7" thickness={0.06} />

      {/* Grid floor */}
      <GridFloor />

      {/* Flow connections */}
      {flowConnections.map((connection, index) => (
        <FlowLine
          key={index}
          connection={connection}
          isActive={!selectedEntity || activeFlows.includes(connection.from + connection.to)}
          onSelect={setSelectedFlow}
          isSelected={selectedFlow?.from === connection.from && selectedFlow?.to === connection.to}
        />
      ))}

      {/* Money flow using energy pulses in tubes instead of floating $ */}

      {/* Revenue sources */}
      {revenueSources.map((source) => (
        <RevenueSourceNode
          key={source.id}
          source={source}
          targetPosition={entities.find(e => e.id === 'admin')?.position || [0, 0, 0]}
          onSelect={setSelectedRevenue}
          isSelected={selectedRevenue === source.id}
        />
      ))}

      {/* Revenue funnel and ownership beams removed - too cluttered */}

      {/* Entity nodes */}
      {entities.map((entity) => (
        <EntityNode
          key={entity.id}
          entity={entity}
          isSelected={selectedEntity === entity.id || orbitTarget === entity.id}
          onSelect={(id) => {
            // If in fly mode and not already orbiting, start orbit mode
            if (flyMode !== 'off' && id && !orbitTarget) {
              setOrbitTarget(id);
              setSelectedEntity(id); // Also show the info panel when orbiting
            } else if (flyMode !== 'off' && orbitTarget === id) {
              // Clicking same entity while orbiting - exit orbit
              setOrbitTarget(null);
              setSelectedEntity(null); // Hide info panel when exiting orbit
            } else if (flyMode === 'off') {
              // Normal selection in non-fly mode
              setSelectedEntity(id);
            }
          }}
          isHovered={hoveredEntity === entity.id}
          onHover={setHoveredEntity}
        />
      ))}

      {/* Camera controller */}
      <CameraController selectedEntity={selectedEntity} orbitControlsRef={orbitControlsRef} />

      {/* Shield bubble around IP LLC on hover - raised to encapsulate planet */}
      <ShieldBubble
        position={(() => {
          const pos = entities.find(e => e.id === 'ip')?.position || [-8, 2, 4];
          return [pos[0], pos[1] + 5.5, pos[2]] as [number, number, number];
        })()}
        isActive={hoveredEntity === 'ip'}
      />

      {/* Crown effect for Holdings on hover - raised more for larger planet */}
      <CrownEffect
        position={(() => {
          const pos = entities.find(e => e.id === 'holdings')?.position || [0, 6, 0];
          return [pos[0], pos[1] + 9.5, pos[2]] as [number, number, number];
        })()}
        isActive={hoveredEntity === 'holdings'}
      />

      {/* Gear effect for Ops LLC on hover - raised to encapsulate planet */}
      <GearEffect
        position={(() => {
          const pos = entities.find(e => e.id === 'ops')?.position || [8, 2, -4];
          return [pos[0], pos[1] + 5.5, pos[2]] as [number, number, number];
        })()}
        isActive={hoveredEntity === 'ops'}
      />

      {/* Vault effect for Finance LLC on hover - raised to encapsulate planet */}
      <VaultEffect
        position={(() => {
          const pos = entities.find(e => e.id === 'finance')?.position || [8, 2, 4];
          return [pos[0], pos[1] + 5.5, pos[2]] as [number, number, number];
        })()}
        isActive={hoveredEntity === 'finance'}
      />

      {/* Enhanced pulse effect for PT LLC (Admin) on hover - raised to encapsulate planet */}
      <AdminPulseEffect
        position={(() => {
          const pos = entities.find(e => e.id === 'admin')?.position || [0, 2, 0];
          return [pos[0], pos[1] + 5.5, pos[2]] as [number, number, number];
        })()}
        isActive={hoveredEntity === 'admin'}
      />

      {/* Pulse waves from PT LLC (admin entity) - always visible */}
      <PulseWaves position={entities.find(e => e.id === 'admin')?.position || [0, 2, 0]} />

      {/* Compliance warnings for entities with overdue items */}
      {entities.map((entity) => {
        const overdueCount = overdueComplianceByEntity[entity.id] || 0;
        if (overdueCount === 0) return null;
        return (
          <ComplianceWarning
            key={`warning-${entity.id}`}
            position={entity.position}
            count={overdueCount}
            yOffset={complianceOrbiterYOffsets[entity.id] || 2.0}
          />
        );
      })}

      {/* Spaceship fly mode components */}
      {flyMode !== 'off' && portalState === 'outside' && (
        <>
          <Spaceship
            position={shipPosition}
            rotation={shipRotation}
            viewMode={flyMode}
            model={shipModel}
          />
          <SpaceshipCameraController
            shipPosition={shipPosition}
            shipRotation={shipRotation}
            viewMode={flyMode}
            isActive={true}
          />
          {/* Regular fly controller - disabled when in orbit mode */}
          <SpaceshipFlyController
            isActive={!orbitTarget}
            shipPosition={shipPosition}
            shipRotation={shipRotation}
            setShipPosition={setShipPosition}
            setShipRotation={setShipRotation}
            setVelocityMagnitude={setShipVelocity}
          />
          {/* Orbit mode controller - takes over when orbiting an entity */}
          <OrbitModeController
            isActive={!!orbitTarget}
            targetEntity={orbitTarget ? entities.find(e => e.id === orbitTarget) || null : null}
            shipPosition={shipPosition}
            shipRotation={shipRotation}
            setShipPosition={setShipPosition}
            setShipRotation={setShipRotation}
            onExitOrbit={() => {
              setOrbitTarget(null);
              setSelectedEntity(null); // Also hide info panel when exiting orbit via keyboard
            }}
          />
          {/* Speed effects (wind streaks) when moving fast - disabled in orbit */}
          <SpeedEffects
            shipPosition={shipPosition}
            shipRotation={shipRotation}
            velocity={orbitTarget ? 0 : shipVelocity}
            isActive={!orbitTarget}
          />
          {/* Waypoint markers above entities */}
          <Waypoints
            entities={entities.map(e => ({
              id: e.id,
              name: e.shortName,
              position: e.position,
              color: e.color,
            }))}
            shipPosition={shipPosition}
            isActive={true}
          />
        </>
      )}

      {/* Portal Controller - runs always when flying, handles warp progress */}
      {flyMode !== 'off' && (
        <PortalController
          isActive={true}
          shipPosition={shipPosition}
          portalState={portalState}
          setPortalState={setPortalState}
          warpProgress={warpProgress}
          setWarpProgress={setWarpProgress}
          setNearPortal={setNearPortal}
          setOrbitTarget={setOrbitTarget}
        />
      )}

      {/* Warp Tunnel Effect - shown during warp transitions */}
      <WarpTunnel
        isActive={portalState === 'warping-in' || portalState === 'warping-out'}
        progress={warpProgress}
        direction={portalState === 'warping-in' ? 'in' : 'out'}
      />

      {/* Holdings Interior - shown when inside the portal */}
      <HoldingsInterior
        isActive={portalState === 'inside'}
        onExit={() => {
          setPortalState('warping-out');
          setWarpProgress(0);
        }}
      />

      {/* Other multiplayer players */}
      {otherPlayers.map((player) => (
        <OtherPlayerShip key={player.id} player={player} />
      ))}

      {/* Controls - adjusted for expanded 3.5x universe */}
      <OrbitControls
        ref={orbitControlsRef}
        enabled={flyMode === 'off'}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={SCALE.ZOOM_MIN}
        maxDistance={SCALE.ZOOM_MAX}
        target={[0, 10, 0]} // Center for expanded layout
        maxPolarAngle={Math.PI / 2 + 0.3}
        minPolarAngle={0.3}
        autoRotate={!selectedEntity && !isUserInteracting && flyMode === 'off'}
        autoRotateSpeed={0.1}
        enableDamping={true}
        dampingFactor={0.06}
        rotateSpeed={0.5}
        zoomSpeed={1.2}
        panSpeed={0.8}
        onStart={handleInteractionStart}
        onEnd={handleInteractionEnd}
      />

      {/* Post-processing disabled - incompatible with three.js 0.182+ */}
    </>
  );
}

// ============================================================================
// KEYBOARD CONTROLS HANDLER
// ============================================================================

// Control mapping for KeyboardControls
enum Controls {
  forward = 'forward',
  backward = 'backward',
  left = 'left',
  right = 'right',
  up = 'up',
  down = 'down',
  boost = 'boost',
  exitOrbit = 'exitOrbit',
  enterPortal = 'enterPortal',
}

const keyboardMap = [
  { name: Controls.forward, keys: ['KeyW', 'ArrowUp'] },
  { name: Controls.backward, keys: ['KeyS', 'ArrowDown'] },
  { name: Controls.left, keys: ['KeyA', 'ArrowLeft'] },
  { name: Controls.right, keys: ['KeyD', 'ArrowRight'] },
  { name: Controls.up, keys: ['KeyQ', 'Space'] },
  { name: Controls.down, keys: ['KeyE', 'ShiftLeft'] },
  { name: Controls.boost, keys: ['KeyZ'] },
  { name: Controls.exitOrbit, keys: ['Escape', 'KeyX'] },
  { name: Controls.enterPortal, keys: ['KeyF', 'Enter'] },
];

// Keyboard movement handler - enables WASD free movement
function KeyboardHandler() {
  const { camera } = useThree();
  const [, getKeys] = useKeyboardControls<Controls>();

  useFrame((_, delta) => {
    const { forward, backward, left, right, up, down } = getKeys();
    const speed = 15 * delta;

    // Get camera direction vectors
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0; // Keep movement horizontal
    direction.normalize();

    const sideVector = new THREE.Vector3();
    sideVector.crossVectors(camera.up, direction).normalize();

    // Apply movement
    if (forward) {
      camera.position.addScaledVector(direction, speed);
    }
    if (backward) {
      camera.position.addScaledVector(direction, -speed);
    }
    if (left) {
      camera.position.addScaledVector(sideVector, speed);
    }
    if (right) {
      camera.position.addScaledVector(sideVector, -speed);
    }
    if (up) {
      camera.position.y += speed;
    }
    if (down) {
      camera.position.y -= speed;
    }
  });

  return null;
}

// ============================================================================
// INFO PANELS
// ============================================================================

// Comprehensive Entity Info Panel
function EntityInfoPanel({
  entity,
  onClose
}: {
  entity: EntityData | null;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'compliance' | 'docs'>('overview');

  if (!entity) return null;

  const Icon = entity.icon;
  const isDE = entity.jurisdiction === 'DE';

  const incomingFlows = flowConnections.filter(f => f.to === entity.id && f.type !== 'ownership');
  const outgoingFlows = flowConnections.filter(f => f.from === entity.id && f.type !== 'ownership');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 20, scale: 0.95 }}
        className="absolute top-4 right-4 w-96 bg-surface/95 backdrop-blur-xl border rounded-2xl z-20 max-h-[calc(100%-2rem)] overflow-hidden flex flex-col shadow-2xl"
        style={{ borderColor: entity.color + '50' }}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-text-muted" />
          </button>

          <div className="flex items-start gap-3">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center border-2"
              style={{ backgroundColor: entity.color + '20', borderColor: entity.color }}
            >
              <Icon className="w-7 h-7" style={{ color: entity.color }} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white text-base">{entity.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-text-muted">{entity.type}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isDE ? 'bg-blue-500/30 text-blue-300' : 'bg-emerald-500/30 text-emerald-300'
                  }`}
                >
                  <MapPin className="w-3 h-3" />
                  {entity.jurisdiction}
                </span>
              </div>
            </div>
          </div>

          {/* Tax summary */}
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 p-2 rounded-lg bg-white/5 text-center">
              <div className="text-lg font-bold" style={{ color: entity.color }}>{entity.taxRate}</div>
              <div className="text-xs text-text-muted">Federal Rate</div>
            </div>
            <div className="flex-1 p-2 rounded-lg bg-white/5 text-center">
              <div className="text-lg font-bold text-emerald-400">{entity.stateTax}</div>
              <div className="text-xs text-text-muted">State Tax</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10">
          {(['overview', 'compliance', 'docs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === tab
                  ? 'text-white border-b-2'
                  : 'text-text-muted hover:text-white'
              }`}
              style={{ borderColor: activeTab === tab ? entity.color : 'transparent' }}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'compliance' && 'Compliance'}
              {tab === 'docs' && 'Documents'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'overview' && (
            <>
              {/* Purpose */}
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs font-medium text-text-muted mb-1">Purpose</p>
                <p className="text-sm text-white">{entity.purpose}</p>
              </div>

              {/* Tax Treatment */}
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: entity.color + '15' }}
              >
                <p className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: entity.color }}>
                  <Calculator className="w-3 h-3" /> Tax Treatment
                </p>
                <p className="text-sm text-text-secondary">{entity.taxNote}</p>
              </div>

              {/* What it owns */}
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <p className="text-xs font-medium text-emerald-400 mb-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> This Entity Handles
                </p>
                <ul className="space-y-1">
                  {entity.owns.map((item, i) => (
                    <li key={i} className="text-xs text-text-secondary flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* What it does NOT do */}
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-xs font-medium text-red-400 mb-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Does NOT
                </p>
                <ul className="space-y-1">
                  {entity.doesNot.map((item, i) => (
                    <li key={i} className="text-xs text-text-secondary flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Money flows */}
              {incomingFlows.length > 0 && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <p className="text-xs font-medium text-blue-400 mb-2 flex items-center gap-1">
                    <ArrowDown className="w-3 h-3" /> Receives Money From
                  </p>
                  <ul className="space-y-1">
                    {incomingFlows.map((flow, i) => {
                      const fromEntity = entities.find(e => e.id === flow.from);
                      return (
                        <li key={i} className="text-xs text-text-secondary flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: flow.color }} />
                          <span className="font-medium text-white">{flow.label}</span>
                          <span className="text-text-muted">from {fromEntity?.shortName}</span>
                          {flow.amount && <span className="text-yellow-400">{flow.amount}</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {outgoingFlows.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <p className="text-xs font-medium text-amber-400 mb-2 flex items-center gap-1">
                    <ArrowUp className="w-3 h-3" /> Sends Money To
                  </p>
                  <ul className="space-y-1">
                    {outgoingFlows.map((flow, i) => {
                      const toEntity = entities.find(e => e.id === flow.to);
                      return (
                        <li key={i} className="text-xs text-text-secondary flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: flow.color }} />
                          <span className="font-medium text-white">{flow.label}</span>
                          <span className="text-text-muted">to {toEntity?.shortName}</span>
                          {flow.amount && <span className="text-yellow-400">{flow.amount}</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          )}

          {activeTab === 'compliance' && (
            <>
              <div className="text-xs text-text-muted mb-2">
                Regular compliance tasks to maintain corporate separateness
              </div>
              {entity.complianceItems.map((item, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border ${
                    item.critical
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium">{item.task}</p>
                      <p className="text-xs text-text-muted mt-1">{item.frequency}</p>
                    </div>
                    {item.critical && (
                      <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full">
                        Critical
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {activeTab === 'docs' && (
            <>
              <div className="text-xs text-text-muted mb-2">
                Critical documents for this entity
              </div>
              {entity.criticalDocs.map((doc, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center gap-3"
                >
                  <FileText className="w-4 h-4 text-text-muted flex-shrink-0" />
                  <span className="text-sm text-white">{doc}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10">
          <p className="text-xs text-text-muted text-center">
            {isDE ? '🔵 Delaware - Strong legal protection & QSBS' : '🟢 Florida - $0 state income tax'}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Flow Info Panel
function FlowInfoPanel({
  flow,
  onClose
}: {
  flow: FlowConnection | null;
  onClose: () => void;
}) {
  if (!flow) return null;

  const fromEntity = entities.find(e => e.id === flow.from);
  const toEntity = entities.find(e => e.id === flow.to);

  if (!fromEntity || !toEntity) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 w-96 bg-surface/95 backdrop-blur-xl border rounded-2xl p-4 shadow-2xl"
        style={{ borderColor: flow.color + '50' }}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 rounded-lg hover:bg-white/10"
        >
          <X className="w-4 h-4 text-text-muted" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <DollarSign className="w-6 h-6" style={{ color: flow.color }} />
          <div>
            <h4 className="text-white font-bold">{flow.label}</h4>
            <p className="text-xs text-text-muted">
              {fromEntity.shortName} → {toEntity.shortName}
            </p>
          </div>
          {flow.amount && (
            <span className="ml-auto text-lg font-bold text-yellow-400">{flow.amount}</span>
          )}
        </div>

        {flow.description && (
          <p className="text-sm text-text-secondary">{flow.description}</p>
        )}

        <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
          <div
            className="flex-1 p-2 rounded-lg text-center"
            style={{ backgroundColor: fromEntity.color + '20' }}
          >
            <fromEntity.icon className="w-4 h-4 mx-auto mb-1" style={{ color: fromEntity.color }} />
            <div className="text-xs text-white font-medium">{fromEntity.shortName}</div>
          </div>
          <TrendingUp className="w-5 h-5" style={{ color: flow.color }} />
          <div
            className="flex-1 p-2 rounded-lg text-center"
            style={{ backgroundColor: toEntity.color + '20' }}
          >
            <toEntity.icon className="w-4 h-4 mx-auto mb-1" style={{ color: toEntity.color }} />
            <div className="text-xs text-white font-medium">{toEntity.shortName}</div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Revenue Source Info Panel
function RevenueInfoPanel({
  sourceId,
  onClose
}: {
  sourceId: string | null;
  onClose: () => void;
}) {
  const source = revenueSources.find(s => s.id === sourceId);
  if (!source) return null;

  const Icon = source.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 w-80 bg-surface/95 backdrop-blur-xl border rounded-2xl p-4 shadow-2xl"
        style={{ borderColor: source.color + '50' }}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 rounded-lg hover:bg-white/10"
        >
          <X className="w-4 h-4 text-text-muted" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: source.color + '20' }}
          >
            <Icon className="w-5 h-5" style={{ color: source.color }} />
          </div>
          <div>
            <h4 className="text-white font-bold">{source.fullName}</h4>
            <p className="text-xs" style={{ color: source.color }}>{source.label}</p>
          </div>
        </div>

        <p className="text-sm text-text-secondary mb-3">{source.description}</p>

        <div className="p-3 rounded-lg bg-white/5">
          <p className="text-xs font-medium text-text-muted mb-2">Examples:</p>
          <div className="flex flex-wrap gap-1">
            {source.examples.map((ex, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-full bg-white/10 text-white">
                {ex}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-white/10 text-center">
          <p className="text-xs text-text-muted">
            Flows to <span className="text-amber-400 font-medium">PT LLC</span> as trust liability
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Flow Legend
function FlowLegend() {
  const flowTypes = [
    { type: 'ownership', label: 'Ownership (100%)', color: '#3b82f6', dashed: true },
    { type: 'license', label: 'IP License Fees', color: '#a855f7', dashed: false },
    { type: 'services', label: 'Services Agreement', color: '#22c55e', dashed: false },
    { type: 'distribution', label: 'Distributions', color: '#f59e0b', dashed: false },
    { type: 'revenue', label: 'Revenue Sources', color: '#ef4444', dashed: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="absolute bottom-4 left-4 z-10 p-4 bg-surface/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-xl"
    >
      <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
        <Zap className="w-3 h-3 text-amber-400" />
        Money Flow Legend
      </h4>
      <div className="space-y-2">
        {flowTypes.map((flow) => (
          <div key={flow.type} className="flex items-center gap-2 text-xs">
            <div
              className={`w-8 h-0.5 ${flow.dashed ? 'border-t-2 border-dashed' : ''}`}
              style={{ backgroundColor: flow.dashed ? 'transparent' : flow.color, borderColor: flow.color }}
            />
            <span className="text-text-muted">{flow.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-white/10">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rotate-45 bg-blue-500 rounded-sm" />
            <span className="text-text-muted">Delaware</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-text-muted">Florida</span>
          </div>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-white/10">
        <div className="flex items-center gap-2 text-xs text-yellow-400">
          <DollarSign className="w-3 h-3" />
          <span>= Animated money flow</span>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function Structure3D() {
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<FlowConnection | null>(null);
  const [selectedRevenue, setSelectedRevenue] = useState<string | null>(null);
  const [showFlows, setShowFlows] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [flyMode, setFlyMode] = useState<'off' | 'first' | 'third'>('off');

  // UI Panel visibility state
  const [showSettings, setShowSettings] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showMultiplayer, setShowMultiplayer] = useState(true);
  const [shipModel, setShipModel] = useState<'rocket' | 'fighter' | 'unaf'>('rocket');
  const [shipPosition, setShipPosition] = useState(() => new THREE.Vector3(50, 15, 50)); // Scaled for expanded universe
  const [shipRotation, setShipRotation] = useState(() => new THREE.Euler(0, -Math.PI / 4, 0));
  const [shipVelocity, setShipVelocity] = useState(0); // Speed magnitude for effects
  const [orbitTarget, setOrbitTarget] = useState<string | null>(null); // Entity we're orbiting

  // Portal system state
  const [portalState, setPortalState] = useState<'outside' | 'warping-in' | 'inside' | 'warping-out'>('outside');
  const [warpProgress, setWarpProgress] = useState(0);
  const [nearPortal, setNearPortal] = useState<string | null>(null); // Which entity portal we're near

  const containerRef = useRef<HTMLDivElement>(null);

  // Multiplayer state
  const { socket, isConnected } = useSocket();
  const [otherPlayers, setOtherPlayers] = useState<Player3D[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [username, setUsername] = useState('');
  const [showUsernameInput, setShowUsernameInput] = useState(false);
  const [isInRoom, setIsInRoom] = useState(false);
  const lastPositionUpdate = useRef(0);

  // Ambient sounds
  const { initAudio, playSelectSound, playHoverSound } = useAmbientSounds();

  const selectedEntityData = selectedEntity ? entities.find(e => e.id === selectedEntity) || null : null;

  // Wrapped setters that play sounds
  const handleSelectEntity = useCallback((id: string | null) => {
    if (soundEnabled && id) playSelectSound();
    setSelectedEntity(id);
  }, [soundEnabled, playSelectSound]);

  const handleHoverEntity = useCallback((id: string | null) => {
    if (soundEnabled && id && id !== hoveredEntity) playHoverSound();
    setHoveredEntity(id);
  }, [soundEnabled, hoveredEntity, playHoverSound]);

  const handleSelectFlow = useCallback((f: FlowConnection | null) => {
    if (soundEnabled && f) playSelectSound();
    setSelectedFlow(f);
  }, [soundEnabled, playSelectSound]);

  const handleSelectRevenue = useCallback((id: string | null) => {
    if (soundEnabled && id) playSelectSound();
    setSelectedRevenue(id);
  }, [soundEnabled, playSelectSound]);

  // Initialize audio on first click
  const handleContainerClick = useCallback(() => {
    if (!soundEnabled) {
      initAudio();
      setSoundEnabled(true);
    }
  }, [soundEnabled, initAudio]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.log('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const resetView = useCallback(() => {
    setSelectedEntity(null);
    setSelectedFlow(null);
    setSelectedRevenue(null);
  }, []);

  // Clear other selections when one is made
  useEffect(() => {
    if (selectedEntity) {
      setSelectedFlow(null);
      setSelectedRevenue(null);
    }
  }, [selectedEntity]);

  useEffect(() => {
    if (selectedFlow) {
      setSelectedEntity(null);
      setSelectedRevenue(null);
    }
  }, [selectedFlow]);

  useEffect(() => {
    if (selectedRevenue) {
      setSelectedEntity(null);
      setSelectedFlow(null);
    }
  }, [selectedRevenue]);

  // Multiplayer socket connection and event handling
  useEffect(() => {
    if (!socket || !isConnected) {
      console.log('[3D Multiplayer] Socket not ready:', { socket: !!socket, isConnected });
      return;
    }

    console.log('[3D Multiplayer] Setting up event handlers');

    // Handle receiving current players when joining
    const handlePlayers = (players: Player3D[]) => {
      console.log('[3D Multiplayer] Received players:', players);
      setOtherPlayers(players);
    };

    // Handle new player joining
    const handlePlayerJoined = (player: Player3D) => {
      console.log('[3D Multiplayer] Player joined:', player);
      setOtherPlayers(prev => [...prev, player]);
    };

    // Handle player leaving
    const handlePlayerLeft = (data: { id: string }) => {
      console.log('[3D Multiplayer] Player left:', data.id);
      setOtherPlayers(prev => prev.filter(p => p.id !== data.id));
    };

    // Handle player movement updates
    const handlePlayerMoved = (data: { id: string; position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number } }) => {
      setOtherPlayers(prev => prev.map(p =>
        p.id === data.id
          ? { ...p, position: data.position, rotation: data.rotation }
          : p
      ));
    };

    // Handle player username update
    const handlePlayerUpdated = (data: { id: string; username: string }) => {
      setOtherPlayers(prev => prev.map(p =>
        p.id === data.id
          ? { ...p, username: data.username }
          : p
      ));
    };

    // Handle player count update
    const handlePlayerCount = (count: number) => {
      setPlayerCount(count);
    };

    socket.on('3d:players', handlePlayers);
    socket.on('3d:player-joined', handlePlayerJoined);
    socket.on('3d:player-left', handlePlayerLeft);
    socket.on('3d:player-moved', handlePlayerMoved);
    socket.on('3d:player-updated', handlePlayerUpdated);
    socket.on('3d:player-count', handlePlayerCount);

    return () => {
      socket.off('3d:players', handlePlayers);
      socket.off('3d:player-joined', handlePlayerJoined);
      socket.off('3d:player-left', handlePlayerLeft);
      socket.off('3d:player-moved', handlePlayerMoved);
      socket.off('3d:player-updated', handlePlayerUpdated);
      socket.off('3d:player-count', handlePlayerCount);
    };
  }, [socket, isConnected]);

  // Join/leave 3D room when entering/exiting fly mode
  useEffect(() => {
    if (!socket || !isConnected) {
      console.log('[3D Multiplayer] Cannot join room - not connected:', { socket: !!socket, isConnected });
      return;
    }

    if (flyMode !== 'off' && !isInRoom) {
      // Join 3D room with username
      const pilotName = username || `Pilot_${Math.random().toString(36).slice(2, 6)}`;
      console.log('[3D Multiplayer] Joining 3D room as:', pilotName);
      socket.emit('3d:join', { username: pilotName });
      setIsInRoom(true);
    } else if (flyMode === 'off' && isInRoom) {
      // Leave 3D room
      console.log('[3D Multiplayer] Leaving 3D room');
      socket.emit('3d:leave');
      setIsInRoom(false);
      setOtherPlayers([]);
    }
  }, [flyMode, socket, isConnected, isInRoom, username]);

  // Broadcast position updates when flying (throttled to 60fps = ~16ms)
  useEffect(() => {
    if (!socket || !isInRoom || flyMode === 'off') return;

    const now = Date.now();
    if (now - lastPositionUpdate.current > 50) { // Throttle to 20 updates per second
      socket.emit('3d:update', {
        position: { x: shipPosition.x, y: shipPosition.y, z: shipPosition.z },
        rotation: { x: shipRotation.x, y: shipRotation.y, z: shipRotation.z },
      });
      lastPositionUpdate.current = now;
    }
  }, [socket, isInRoom, flyMode, shipPosition, shipRotation]);

  // Handle username change
  const handleSetUsername = useCallback((newUsername: string) => {
    setUsername(newUsername);
    if (socket && isInRoom) {
      socket.emit('3d:set-username', { username: newUsername });
    }
    setShowUsernameInput(false);
  }, [socket, isInRoom]);

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className={`relative w-full rounded-2xl overflow-hidden bg-[#020617] ${
        isFullscreen ? 'h-screen' : 'h-[750px]'
      }`}
    >
      {/* Header / Instructions - Collapsible */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute top-4 left-4 z-10 bg-surface/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden"
          >
            <div className="p-3 flex items-center justify-between gap-4 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                Corporate Structure
              </h3>
              <button
                onClick={() => setShowInstructions(false)}
                className="p-1 rounded hover:bg-white/10 text-text-muted hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-2 text-xs text-text-muted max-w-[200px]">
              <p><span className="text-white font-medium">Rotate:</span> Drag</p>
              <p><span className="text-white font-medium">Zoom:</span> Scroll</p>
              <p><span className="text-white font-medium">Select:</span> Click</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimized instructions button */}
      <AnimatePresence>
        {!showInstructions && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => setShowInstructions(true)}
            className="absolute top-4 left-4 z-10 p-2.5 bg-surface/90 backdrop-blur-xl rounded-xl border border-white/10 text-text-muted hover:text-white hover:border-white/20 transition-all shadow-lg"
            title="Show instructions"
          >
            <Building2 className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Control buttons */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        {/* Settings Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2.5 bg-surface/90 backdrop-blur-xl rounded-xl border text-text-muted hover:text-white transition-all shadow-lg ${
            showSettings ? 'border-blue-500/50 text-blue-400' : 'border-white/10 hover:border-white/20'
          }`}
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </motion.button>
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (!soundEnabled) {
              initAudio();
              setSoundEnabled(true);
            } else {
              setSoundEnabled(false);
            }
          }}
          className={`p-2.5 bg-surface/90 backdrop-blur-xl rounded-xl border text-text-muted hover:text-white transition-all shadow-lg ${
            soundEnabled ? 'border-blue-500/50 text-blue-400' : 'border-white/10 hover:border-white/20'
          }`}
          title={soundEnabled ? 'Disable sounds' : 'Enable sounds'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </motion.button>
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={resetView}
          className="p-2.5 bg-surface/90 backdrop-blur-xl rounded-xl border border-white/10 text-text-muted hover:text-white hover:border-white/20 transition-all shadow-lg"
          title="Reset view"
        >
          <RotateCcw className="w-4 h-4" />
        </motion.button>
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleFullscreen}
          className="p-2.5 bg-surface/90 backdrop-blur-xl rounded-xl border border-white/10 text-text-muted hover:text-white hover:border-white/20 transition-all shadow-lg"
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </motion.button>
        {/* Fly Mode Toggle - cycles through off -> third person -> first person */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            const modes: Array<'off' | 'first' | 'third'> = ['off', 'third', 'first'];
            const currentIndex = modes.indexOf(flyMode);
            const nextIndex = (currentIndex + 1) % modes.length;
            setFlyMode(modes[nextIndex]);
            if (modes[nextIndex] !== 'off') {
              // Reset ship position when entering fly mode - scaled for expanded universe
              setShipPosition(new THREE.Vector3(50, 15, 50));
              setShipRotation(new THREE.Euler(0, -Math.PI / 4, 0));
            }
          }}
          className={`p-2.5 bg-surface/90 backdrop-blur-xl rounded-xl border text-text-muted hover:text-white transition-all shadow-lg ${
            flyMode !== 'off'
              ? 'border-purple-500/50 text-purple-400 bg-purple-500/20'
              : 'border-white/10 hover:border-white/20'
          }`}
          title={
            flyMode === 'off'
              ? 'Enable spaceship mode (3rd person)'
              : flyMode === 'third'
              ? 'Switch to 1st person'
              : 'Exit spaceship mode'
          }
        >
          {flyMode === 'off' ? (
            <Rocket className="w-4 h-4" />
          ) : flyMode === 'third' ? (
            <Camera className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </motion.button>
      </div>

      {/* Settings Dropdown Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-16 right-4 z-20 w-64 bg-surface/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden"
          >
            <div className="p-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400" />
                Settings
              </h3>
            </div>
            <div className="p-3 space-y-3">
              {/* Show Flows Toggle */}
              <label className="flex items-center justify-between text-xs cursor-pointer group">
                <span className="text-text-muted group-hover:text-white transition-colors">Money Flow Animation</span>
                <input
                  type="checkbox"
                  checked={showFlows}
                  onChange={(e) => setShowFlows(e.target.checked)}
                  className="rounded border-white/20 bg-white/10 text-blue-500"
                />
              </label>
              {/* Sound Toggle */}
              <label className="flex items-center justify-between text-xs cursor-pointer group">
                <span className="text-text-muted group-hover:text-white transition-colors">Sound Effects</span>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => {
                    if (e.target.checked) initAudio();
                    setSoundEnabled(e.target.checked);
                  }}
                  className="rounded border-white/20 bg-white/10 text-blue-500"
                />
              </label>
              {/* Panel Visibility */}
              <div className="pt-2 border-t border-white/10">
                <p className="text-xs text-text-muted mb-2 font-medium">Show Panels</p>
                <div className="space-y-2">
                  <label className="flex items-center justify-between text-xs cursor-pointer group">
                    <span className="text-text-muted group-hover:text-white transition-colors">Instructions</span>
                    <input
                      type="checkbox"
                      checked={showInstructions}
                      onChange={(e) => setShowInstructions(e.target.checked)}
                      className="rounded border-white/20 bg-white/10 text-blue-500"
                    />
                  </label>
                  {flyMode !== 'off' && (
                    <>
                      <label className="flex items-center justify-between text-xs cursor-pointer group">
                        <span className="text-text-muted group-hover:text-white transition-colors">Controls Guide</span>
                        <input
                          type="checkbox"
                          checked={showControls}
                          onChange={(e) => setShowControls(e.target.checked)}
                          className="rounded border-white/20 bg-white/10 text-blue-500"
                        />
                      </label>
                      <label className="flex items-center justify-between text-xs cursor-pointer group">
                        <span className="text-text-muted group-hover:text-white transition-colors">Multiplayer Panel</span>
                        <input
                          type="checkbox"
                          checked={showMultiplayer}
                          onChange={(e) => setShowMultiplayer(e.target.checked)}
                          className="rounded border-white/20 bg-white/10 text-blue-500"
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>
              {/* Ship Model Selector */}
              {flyMode !== 'off' && (
                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs text-text-muted mb-2 font-medium">Ship Model</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'rocket', name: 'Rocket', icon: '🚀' },
                      { id: 'fighter', name: 'Fighter', icon: '✈️' },
                      { id: 'unaf', name: 'UNAF', icon: '🛸' },
                    ].map((ship) => (
                      <button
                        key={ship.id}
                        onClick={() => setShipModel(ship.id as 'rocket' | 'fighter' | 'unaf')}
                        className={`px-2 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1.5 justify-center ${
                          shipModel === ship.id
                            ? 'bg-blue-500/30 border border-blue-500/50 text-blue-300'
                            : 'bg-white/5 border border-white/10 text-text-muted hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span>{ship.icon}</span>
                        <span>{ship.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fly mode indicator */}
      <AnimatePresence>
        {flyMode !== 'off' && showControls && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`absolute top-16 right-4 z-10 p-3 backdrop-blur-xl rounded-xl border shadow-lg ${
              orbitTarget
                ? 'bg-cyan-500/20 border-cyan-500/50'
                : 'bg-purple-500/20 border-purple-500/50'
            }`}
          >
            {orbitTarget ? (
              <>
                <div className="flex items-center gap-2 text-cyan-300 text-sm font-medium mb-2">
                  <RotateCcw className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
                  Orbiting: {entities.find(e => e.id === orbitTarget)?.shortName || 'Entity'}
                </div>
                <div className="text-xs text-cyan-300/70 space-y-1">
                  <p><kbd className="px-1 bg-white/10 rounded">ESC</kbd> or <kbd className="px-1 bg-white/10 rounded">X</kbd> Exit orbit</p>
                  <p className="text-cyan-300/50 italic">Click entity again to exit</p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-purple-300 text-sm font-medium mb-2">
                  <Rocket className="w-4 h-4" />
                  {flyMode === 'third' ? '3rd Person' : '1st Person'} Spaceship Mode
                </div>
                <div className="text-xs text-purple-300/70 space-y-1">
                  <p><kbd className="px-1 bg-white/10 rounded">W/S</kbd> Forward / Back</p>
                  <p><kbd className="px-1 bg-white/10 rounded">A/D</kbd> Turn Left / Right</p>
                  <p><kbd className="px-1 bg-white/10 rounded">Q/E</kbd> Up / Down</p>
                  <p><kbd className="px-1 bg-yellow-500/30 rounded text-yellow-300">Z</kbd> <span className="text-yellow-300">Boost (3x speed)</span></p>
                  <p className="text-cyan-300/70 mt-2"><span className="text-cyan-300">Click entity</span> to orbit around it</p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Multiplayer panel - shows when in fly mode (shows connection status) */}
      <AnimatePresence>
        {flyMode !== 'off' && showMultiplayer && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`absolute ${showControls ? 'top-40' : 'top-16'} right-4 z-10 p-3 backdrop-blur-xl rounded-xl border shadow-lg ${
              isConnected ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-amber-500/20 border-amber-500/50'
            }`}
          >
            <div className={`flex items-center gap-2 text-sm font-medium mb-2 ${isConnected ? 'text-emerald-300' : 'text-amber-300'}`}>
              <Users className="w-4 h-4" />
              Multiplayer
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
            </div>
            <div className={`text-xs space-y-2 ${isConnected ? 'text-emerald-300/70' : 'text-amber-300/70'}`}>
              {!isConnected ? (
                <p className="text-amber-300/90">Not connected - login required for multiplayer</p>
              ) : isInRoom ? (
                <p>{playerCount} pilot{playerCount !== 1 ? 's' : ''} in room</p>
              ) : (
                <p>Connecting to room...</p>
              )}
              {isConnected && (
              <>
              <div className="flex items-center gap-2">
                <span className="text-emerald-300/50">You:</span>
                {showUsernameInput ? (
                  <input
                    type="text"
                    autoFocus
                    placeholder="Enter username"
                    defaultValue={username}
                    className="px-2 py-1 bg-white/10 rounded text-emerald-300 text-xs w-24 border border-emerald-500/30 focus:border-emerald-500/60 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSetUsername((e.target as HTMLInputElement).value);
                      } else if (e.key === 'Escape') {
                        setShowUsernameInput(false);
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value) {
                        handleSetUsername(e.target.value);
                      } else {
                        setShowUsernameInput(false);
                      }
                    }}
                  />
                ) : (
                  <button
                    onClick={() => setShowUsernameInput(true)}
                    className="px-2 py-1 bg-white/10 rounded text-emerald-300 text-xs hover:bg-white/20 transition-colors"
                  >
                    {username || 'Set Username'}
                  </button>
                )}
              </div>
              {otherPlayers.length > 0 && (
                <div className="pt-2 border-t border-emerald-500/30">
                  <p className="text-emerald-300/50 mb-1">Other pilots:</p>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {otherPlayers.map((player) => (
                      <div key={player.id} className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: player.color }}
                        />
                        <span className="text-xs" style={{ color: player.color }}>
                          {player.username}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flow Legend */}
      <FlowLegend />

      {/* Portal prompt - when near Holdings in fly mode */}
      <AnimatePresence>
        {flyMode !== 'off' && nearPortal && portalState === 'outside' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600/90 to-purple-600/90 backdrop-blur-xl rounded-xl border border-white/30 shadow-2xl">
              <div className="flex items-center gap-3 text-white">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-lg">Enter Holdings Portal</div>
                  <div className="text-sm text-white/80">
                    Press <kbd className="px-2 py-0.5 bg-white/20 rounded font-mono mx-1">F</kbd> or
                    <kbd className="px-2 py-0.5 bg-white/20 rounded font-mono mx-1">Enter</kbd> to warp inside
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Portal status - when warping or inside */}
      <AnimatePresence>
        {portalState !== 'outside' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 pointer-events-none"
          >
            {/* Warp progress indicator */}
            {(portalState === 'warping-in' || portalState === 'warping-out') && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <div className="text-white text-2xl font-bold mb-4">
                  {portalState === 'warping-in' ? 'Entering Holdings...' : 'Returning to Space...'}
                </div>
                <div className="w-48 h-2 bg-white/20 rounded-full overflow-hidden mx-auto">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                    style={{ width: `${warpProgress * 100}%` }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Key insight - hide when fly mode is active to make room for minimap */}
      {flyMode === 'off' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute bottom-4 right-4 z-10 p-3 bg-blue-500/10 backdrop-blur-xl rounded-xl border border-blue-500/30 max-w-xs shadow-lg"
        >
          <p className="text-xs text-blue-300">
            <Scale className="w-3 h-3 inline mr-1" />
            <strong>Key:</strong> Revenue sources (PROs, MLC, DSPs) flow to PT LLC as <span className="text-amber-300">trust liability</span> — only your commission is taxable income.
          </p>
        </motion.div>
      )}

      {/* Mini-map when in fly mode */}
      <AnimatePresence>
        {flyMode !== 'off' && (
          <MiniMap
            entities={entities.map(e => ({
              id: e.id,
              name: e.shortName,
              position: e.position,
              color: e.color,
            }))}
            shipPosition={shipPosition}
            shipRotation={shipRotation}
            isActive={true}
          />
        )}
      </AnimatePresence>

      {/* Controls hint panel */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
        className="absolute bottom-4 left-4 z-10 p-3 bg-surface/80 backdrop-blur-xl rounded-xl border border-white/10 shadow-lg"
      >
        <p className="text-xs text-text-muted mb-2 font-medium">Navigation</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-text-secondary">W A S D</kbd>
            <span className="text-text-muted">Move</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-text-secondary">Q E</kbd>
            <span className="text-text-muted">Up/Down</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-text-secondary">Drag</kbd>
            <span className="text-text-muted">Rotate</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-text-secondary">Scroll</kbd>
            <span className="text-text-muted">Zoom</span>
          </div>
        </div>
      </motion.div>

      {/* 3D Canvas - camera positioned for expanded 3.5x universe */}
      <KeyboardControls map={keyboardMap}>
        <Canvas
          camera={{ position: [100, 60, 120], fov: 55, near: 0.5, far: 1000 }}
          dpr={[1, 2]}
          shadows
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            stencil: false,
          }}
          style={{ background: '#020617' }}
        >
          <Suspense fallback={null}>
            <KeyboardHandler />
            <Scene
              selectedEntity={selectedEntity}
              setSelectedEntity={handleSelectEntity}
              hoveredEntity={hoveredEntity}
              setHoveredEntity={handleHoverEntity}
              selectedFlow={selectedFlow}
              setSelectedFlow={handleSelectFlow}
              selectedRevenue={selectedRevenue}
              setSelectedRevenue={handleSelectRevenue}
              showFlows={showFlows}
              flyMode={flyMode}
              shipPosition={shipPosition}
              shipRotation={shipRotation}
              setShipPosition={setShipPosition}
              setShipRotation={setShipRotation}
              shipVelocity={shipVelocity}
              setShipVelocity={setShipVelocity}
              orbitTarget={orbitTarget}
              setOrbitTarget={setOrbitTarget}
              portalState={portalState}
              setPortalState={setPortalState}
              warpProgress={warpProgress}
              setWarpProgress={setWarpProgress}
              setNearPortal={setNearPortal}
              otherPlayers={otherPlayers}
              shipModel={shipModel}
            />
          </Suspense>
        </Canvas>
      </KeyboardControls>

      {/* Info Panels */}
      <EntityInfoPanel
        entity={selectedEntityData}
        onClose={() => setSelectedEntity(null)}
      />
      <FlowInfoPanel
        flow={selectedFlow}
        onClose={() => setSelectedFlow(null)}
      />
      <RevenueInfoPanel
        sourceId={selectedRevenue}
        onClose={() => setSelectedRevenue(null)}
      />

      {/* Fullscreen indicator */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 bg-surface/80 backdrop-blur-sm rounded-full border border-white/10 text-xs text-text-muted"
          >
            Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded mx-1">ESC</kbd> to exit fullscreen
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
