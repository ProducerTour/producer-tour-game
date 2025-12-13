import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Float, Sparkles, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Building2,
  Shield,
  BookOpen,
  Calendar,
  DollarSign,
  Users,
  ExternalLink
} from 'lucide-react';

// Quest/Task data for Holdings startup
interface Quest {
  id: string;
  title: string;
  description: string;
  status: 'not-started' | 'in-progress' | 'completed';
  icon: typeof FileText;
  priority: 'high' | 'medium' | 'low';
}

const holdingsQuests: Quest[] = [
  {
    id: 'bylaws',
    title: 'Set up corporate bylaws',
    description: 'Draft and adopt initial bylaws governing shareholder meetings, board procedures, and officer duties.',
    status: 'completed',
    icon: BookOpen,
    priority: 'high',
  },
  {
    id: 'franchise-tax',
    title: 'File Delaware franchise tax',
    description: 'Annual franchise tax filing due March 1st. Calculate based on authorized shares method.',
    status: 'in-progress',
    icon: DollarSign,
    priority: 'high',
  },
  {
    id: 'annual-meeting',
    title: 'Schedule annual meeting',
    description: 'Hold annual shareholder and board meetings. Document all resolutions in corporate minutes.',
    status: 'not-started',
    icon: Calendar,
    priority: 'medium',
  },
  {
    id: 'stock-certs',
    title: 'Issue stock certificates',
    description: 'Prepare and issue stock certificates to founders. Maintain cap table in stock ledger.',
    status: 'completed',
    icon: Users,
    priority: 'high',
  },
  {
    id: 'qsbs-tracking',
    title: 'Track QSBS eligibility',
    description: 'Maintain records proving $50M gross asset test and active business requirements for QSBS.',
    status: 'in-progress',
    icon: Shield,
    priority: 'medium',
  },
];

// Compliance documents
interface ComplianceDoc {
  id: string;
  name: string;
  status: 'current' | 'needs-update' | 'missing';
  lastUpdated?: string;
}

const complianceDocs: ComplianceDoc[] = [
  { id: 'bylaws', name: 'Corporate Bylaws', status: 'current', lastUpdated: '2024-01-15' },
  { id: 'shareholder-agreement', name: 'Shareholder Agreement', status: 'current', lastUpdated: '2024-01-15' },
  { id: 'board-resolutions', name: 'Board Resolutions', status: 'needs-update', lastUpdated: '2024-06-01' },
  { id: 'stock-certificates', name: 'Stock Certificates', status: 'current', lastUpdated: '2024-01-15' },
  { id: 'franchise-tax', name: 'Franchise Tax Receipt', status: 'missing' },
  { id: 'annual-minutes', name: 'Annual Meeting Minutes', status: 'needs-update', lastUpdated: '2023-12-01' },
];

// Interactive station in the interior
function InteractiveStation({
  position,
  label,
  icon: Icon,
  color,
  onClick,
  isActive
}: {
  position: [number, number, number];
  label: string;
  icon: typeof FileText;
  color: string;
  onClick: () => void;
  isActive: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;
      meshRef.current.position.y = position[1] + Math.sin(time * 2 + position[0]) * 0.2;
      meshRef.current.rotation.y += 0.01;

      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = hovered || isActive ? 0.8 : 0.3 + Math.sin(time * 2) * 0.1;
    }
  });

  return (
    <group position={position}>
      <Float speed={1.5} floatIntensity={0.3}>
        <mesh
          ref={meshRef}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          onPointerOver={() => {
            setHovered(true);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = 'auto';
          }}
        >
          <dodecahedronGeometry args={[1.2, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.3}
            metalness={0.6}
            roughness={0.2}
            transparent
            opacity={0.9}
          />
        </mesh>
      </Float>

      {/* Sparkle effect */}
      <Sparkles
        count={isActive ? 40 : 20}
        scale={3}
        size={isActive ? 4 : 2}
        speed={0.5}
        color={color}
      />

      {/* Label */}
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <Html
          center
          position={[0, 2.5, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className={`px-3 py-1.5 rounded-lg text-white text-sm font-medium whitespace-nowrap transition-all ${
              hovered || isActive ? 'scale-110' : ''
            }`}
            style={{
              backgroundColor: `${color}cc`,
              boxShadow: hovered || isActive ? `0 0 20px ${color}` : 'none',
            }}
          >
            <Icon className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
            {label}
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

// Exit portal component
function ExitPortal({
  position,
  onExit
}: {
  position: [number, number, number];
  onExit: () => void;
}) {
  const portalRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    if (portalRef.current) {
      const material = portalRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.3 + Math.sin(time * 3) * 0.1;
    }

    if (ringRef.current) {
      ringRef.current.rotation.z = time * 0.5;
      const scale = hovered ? 1.2 : 1;
      ringRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
    }
  });

  return (
    <group position={position}>
      {/* Portal surface */}
      <mesh
        ref={portalRef}
        onClick={(e) => {
          e.stopPropagation();
          onExit();
        }}
        onPointerOver={() => {
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <circleGeometry args={[3, 32]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Rotating ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[3.5, 0.15, 16, 64]} />
        <meshBasicMaterial
          color="#60a5fa"
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Inner glow */}
      <pointLight position={[0, 0, 1]} intensity={2} color="#3b82f6" distance={10} />

      {/* Particles */}
      <Sparkles
        count={50}
        scale={8}
        size={3}
        speed={1}
        color="#60a5fa"
        opacity={0.6}
      />

      {/* Label */}
      <Billboard>
        <Html center position={[0, 5, 0]}>
          <div className="px-4 py-2 bg-blue-500/80 backdrop-blur rounded-lg text-white font-medium">
            <ExternalLink className="w-4 h-4 inline-block mr-2 -mt-0.5" />
            Exit to Space
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

// Crystal floor environment
function CrystalEnvironment() {
  const floorRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (floorRef.current) {
      const material = floorRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.05 + Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    }
  });

  return (
    <>
      {/* Crystalline floor */}
      <mesh ref={floorRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <circleGeometry args={[50, 64]} />
        <meshStandardMaterial
          color="#1e3a5f"
          emissive="#3b82f6"
          emissiveIntensity={0.05}
          metalness={0.8}
          roughness={0.2}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Grid lines on floor */}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh
          key={`h-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -1.99, -50 + i * 5]}
        >
          <planeGeometry args={[100, 0.05]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.2} />
        </mesh>
      ))}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh
          key={`v-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[-50 + i * 5, -1.99, 0]}
        >
          <planeGeometry args={[0.05, 100]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.2} />
        </mesh>
      ))}

      {/* Dome skybox - blue crystalline */}
      <mesh>
        <sphereGeometry args={[100, 32, 32]} />
        <meshBasicMaterial
          color="#0a1929"
          side={THREE.BackSide}
        />
      </mesh>

      {/* Ambient particles */}
      <Sparkles
        count={300}
        scale={80}
        size={2}
        speed={0.2}
        color="#60a5fa"
        opacity={0.4}
      />

      {/* Central light pillar */}
      <mesh position={[0, 25, 0]}>
        <cylinderGeometry args={[0.5, 2, 50, 16]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.1}
        />
      </mesh>
    </>
  );
}

interface HoldingsInteriorProps {
  onExit: () => void;
  isActive: boolean;
}

export function HoldingsInterior({ onExit, isActive }: HoldingsInteriorProps) {
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [showQuestPanel, setShowQuestPanel] = useState(false);
  const [showDocsPanel, setShowDocsPanel] = useState(false);

  if (!isActive) return null;

  return (
    <>
      {/* 3D Environment */}
      <CrystalEnvironment />

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 20, 0]} intensity={2} color="#60a5fa" />
      <pointLight position={[10, 5, 10]} intensity={1} color="#3b82f6" />
      <pointLight position={[-10, 5, -10]} intensity={1} color="#a855f7" />

      {/* Interactive Stations */}
      <InteractiveStation
        position={[-8, 0, -5]}
        label="Compliance Tasks"
        icon={CheckCircle2}
        color="#22c55e"
        onClick={() => {
          setActiveStation('quests');
          setShowQuestPanel(true);
          setShowDocsPanel(false);
        }}
        isActive={activeStation === 'quests'}
      />

      <InteractiveStation
        position={[8, 0, -5]}
        label="Documents"
        icon={FileText}
        color="#a855f7"
        onClick={() => {
          setActiveStation('docs');
          setShowDocsPanel(true);
          setShowQuestPanel(false);
        }}
        isActive={activeStation === 'docs'}
      />

      <InteractiveStation
        position={[0, 0, -12]}
        label="Holdings Overview"
        icon={Building2}
        color="#3b82f6"
        onClick={() => {
          setActiveStation('overview');
          setShowQuestPanel(false);
          setShowDocsPanel(false);
        }}
        isActive={activeStation === 'overview'}
      />

      {/* Exit Portal */}
      <ExitPortal position={[0, 3, 20]} onExit={onExit} />

      {/* Central title */}
      <Text
        position={[0, 12, 0]}
        fontSize={2}
        color="#60a5fa"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Bold.woff"
      >
        Producer Tour Holdings, Inc.
      </Text>
      <Text
        position={[0, 9.5, 0]}
        fontSize={0.8}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        Delaware C-Corporation • Parent Company
      </Text>

      {/* UI Panels (HTML overlay) */}
      <Html fullscreen>
        <AnimatePresence>
          {showQuestPanel && (
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-80 bg-slate-900/95 backdrop-blur-xl rounded-xl border border-green-500/30 shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-green-500/20 bg-green-500/10">
                <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Startup Onboarding Tasks
                </h3>
                <p className="text-xs text-green-300/70 mt-1">Complete these to become operational</p>
              </div>

              <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
                {holdingsQuests.map((quest) => (
                  <div
                    key={quest.id}
                    className={`p-3 rounded-lg border transition-all ${
                      quest.status === 'completed'
                        ? 'bg-green-500/10 border-green-500/30'
                        : quest.status === 'in-progress'
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 ${
                        quest.status === 'completed' ? 'text-green-400' :
                        quest.status === 'in-progress' ? 'text-yellow-400' : 'text-slate-500'
                      }`}>
                        {quest.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : quest.status === 'in-progress' ? (
                          <Clock className="w-4 h-4" />
                        ) : (
                          <quest.icon className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium text-sm ${
                          quest.status === 'completed' ? 'text-green-300 line-through' :
                          quest.status === 'in-progress' ? 'text-yellow-300' : 'text-slate-300'
                        }`}>
                          {quest.title}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{quest.description}</div>
                        {quest.priority === 'high' && quest.status !== 'completed' && (
                          <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
                            High Priority
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-green-500/20 bg-green-500/5">
                <div className="text-xs text-slate-400">
                  Progress: {holdingsQuests.filter(q => q.status === 'completed').length} / {holdingsQuests.length} completed
                </div>
                <div className="mt-2 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
                    style={{
                      width: `${(holdingsQuests.filter(q => q.status === 'completed').length / holdingsQuests.length) * 100}%`
                    }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {showDocsPanel && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-80 bg-slate-900/95 backdrop-blur-xl rounded-xl border border-purple-500/30 shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-purple-500/20 bg-purple-500/10">
                <h3 className="text-lg font-bold text-purple-400 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Corporate Documents
                </h3>
                <p className="text-xs text-purple-300/70 mt-1">Critical compliance documents</p>
              </div>

              <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
                {complianceDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${
                      doc.status === 'current'
                        ? 'bg-green-500/10 border-green-500/30'
                        : doc.status === 'needs-update'
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {doc.status === 'current' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : doc.status === 'needs-update' ? (
                          <Clock className="w-4 h-4 text-yellow-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        )}
                        <span className="font-medium text-sm text-white">{doc.name}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="mt-1 text-xs">
                      {doc.status === 'current' && doc.lastUpdated && (
                        <span className="text-green-400/70">Updated: {doc.lastUpdated}</span>
                      )}
                      {doc.status === 'needs-update' && (
                        <span className="text-yellow-400/70">Needs update • Last: {doc.lastUpdated}</span>
                      )}
                      {doc.status === 'missing' && (
                        <span className="text-red-400/70">Missing - action required</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-purple-500/20 bg-purple-500/5">
                <div className="flex justify-between text-xs">
                  <span className="text-green-400">
                    {complianceDocs.filter(d => d.status === 'current').length} Current
                  </span>
                  <span className="text-yellow-400">
                    {complianceDocs.filter(d => d.status === 'needs-update').length} Need Update
                  </span>
                  <span className="text-red-400">
                    {complianceDocs.filter(d => d.status === 'missing').length} Missing
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Close panel button */}
        {(showQuestPanel || showDocsPanel) && (
          <button
            onClick={() => {
              setShowQuestPanel(false);
              setShowDocsPanel(false);
              setActiveStation(null);
            }}
            className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800/80 backdrop-blur rounded-lg text-slate-300 text-sm hover:bg-slate-700/80 transition-colors"
          >
            Press ESC or click to close panel
          </button>
        )}
      </Html>
    </>
  );
}

export default HoldingsInterior;
