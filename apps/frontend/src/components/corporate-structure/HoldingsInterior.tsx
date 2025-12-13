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
  Calendar,
  ExternalLink,
  Play,
  Loader2,
  Star,
  Link,
  Upload,
  Info,
  Check,
  Sparkles as SparklesIcon,
  X,
  Lightbulb,
  AlertTriangle,
  DollarSign,
  Scale
} from 'lucide-react';
import { useHoldingsData, useStartQuest, useCompleteStep, useCompleteQuest, useExplainQuestStep, useUploadStepDocument } from './hooks';
import type { CorporateQuest, CorporateQuestStep, StepActionType, QuestStepExplanation } from './types';

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

// AI Explanation Modal
function ExplanationModal({
  isOpen,
  onClose,
  step,
  quest,
  explanation,
  isLoading,
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  step: CorporateQuestStep | null;
  quest: CorporateQuest | null;
  explanation: QuestStepExplanation | null;
  isLoading: boolean;
  error: Error | null;
}) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-900 border border-blue-500/30 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white">AI Quest Advisor</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          {step && (
            <div className="mt-2">
              <div className="text-sm text-blue-300">{quest?.title}</div>
              <div className="text-xs text-slate-400">{step.title}</div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-100px)]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400 mb-4" />
              <div className="text-slate-400">Consulting the AI advisor...</div>
              <div className="text-xs text-slate-500 mt-1">This may take a few seconds</div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
              <div className="text-red-400">Failed to get explanation</div>
              <div className="text-xs text-slate-500 mt-1">{error.message}</div>
            </div>
          ) : explanation ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="text-sm font-medium text-blue-300 mb-1">Summary</div>
                <div className="text-sm text-slate-300">{explanation.summary}</div>
              </div>

              {/* Why It Matters */}
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-300">Why It Matters</span>
                </div>
                <div className="text-sm text-slate-300">{explanation.whyItMatters}</div>
              </div>

              {/* Tax & Legal Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-green-300">Tax Implications</span>
                  </div>
                  <div className="text-xs text-slate-300">{explanation.taxImplications}</div>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Scale className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-purple-300">Legal Considerations</span>
                  </div>
                  <div className="text-xs text-slate-300">{explanation.legalConsiderations}</div>
                </div>
              </div>

              {/* Common Mistakes */}
              <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium text-red-300">Common Mistakes</span>
                </div>
                <ul className="space-y-1">
                  {explanation.commonMistakes.map((mistake, i) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      <span>{mistake}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pro Tips */}
              <div className="p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-300">Pro Tips</span>
                </div>
                <ul className="space-y-1">
                  {explanation.proTips.map((tip, i) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Time & Cost */}
              <div className="flex gap-3">
                <div className="flex-1 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <div className="text-xs text-slate-500 mb-0.5">Estimated Time</div>
                  <div className="text-sm font-medium text-white flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-400" />
                    {explanation.estimatedTime}
                  </div>
                </div>
                {explanation.estimatedCost && (
                  <div className="flex-1 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <div className="text-xs text-slate-500 mb-0.5">Estimated Cost</div>
                    <div className="text-sm font-medium text-white flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-green-400" />
                      {explanation.estimatedCost}
                    </div>
                  </div>
                )}
              </div>

              {/* Disclaimer */}
              <div className="text-xs text-slate-500 text-center pt-2 border-t border-slate-700/50">
                <Info className="w-3 h-3 inline mr-1" />
                This is general information, not legal or tax advice. Consult professionals for specific guidance.
              </div>
            </div>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Quest card with step expansion
function QuestCard({
  quest,
  isExpanded,
  onToggle,
  onStartQuest,
  onCompleteStep,
  onCompleteQuest,
  onExplainStep,
  onUploadFile,
  isStarting,
  isCompletingStep,
  isCompletingQuest,
  isExplaining,
  isUploading
}: {
  quest: CorporateQuest;
  isExpanded: boolean;
  onToggle: () => void;
  onStartQuest: () => void;
  onCompleteStep: (stepId: string) => void;
  onCompleteQuest: () => void;
  onExplainStep: (step: CorporateQuestStep) => void;
  onUploadFile: (step: CorporateQuestStep, file: File) => void;
  isStarting: boolean;
  isCompletingStep: boolean;
  isCompletingQuest: boolean;
  isExplaining: boolean;
  isUploading: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingStepId, setUploadingStepId] = useState<string | null>(null);

  const handleFileSelect = (step: CorporateQuestStep) => {
    setUploadingStepId(step.id);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, step: CorporateQuestStep) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(step, file);
    }
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUploadingStepId(null);
  };
  const getStepIcon = (actionType: StepActionType) => {
    switch (actionType) {
      case 'INFO': return Info;
      case 'EXTERNAL_LINK': return Link;
      case 'TEMPLATE': return FileText;
      case 'UPLOAD': return Upload;
      case 'VERIFY': return Check;
      default: return Info;
    }
  };

  const statusColors = {
    LOCKED: 'bg-slate-800/50 border-slate-700/50',
    AVAILABLE: 'bg-blue-500/10 border-blue-500/30 hover:border-blue-400',
    IN_PROGRESS: 'bg-yellow-500/10 border-yellow-500/30',
    COMPLETED: 'bg-green-500/10 border-green-500/30',
  };

  const statusTextColors = {
    LOCKED: 'text-slate-500',
    AVAILABLE: 'text-blue-400',
    IN_PROGRESS: 'text-yellow-400',
    COMPLETED: 'text-green-400',
  };

  const progress = quest.progress || 0;
  const canComplete = quest.status === 'IN_PROGRESS' &&
    quest.steps.every(s => s.status === 'COMPLETED' || s.status === 'SKIPPED');

  return (
    <div className={`rounded-lg border transition-all ${statusColors[quest.status]}`}>
      <div
        className="p-3 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-start gap-2">
          <div className={`mt-0.5 ${statusTextColors[quest.status]}`}>
            {quest.status === 'COMPLETED' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : quest.status === 'IN_PROGRESS' ? (
              <Clock className="w-4 h-4" />
            ) : quest.status === 'LOCKED' ? (
              <Shield className="w-4 h-4" />
            ) : (
              <Star className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1">
            <div className={`font-medium text-sm ${statusTextColors[quest.status]} ${
              quest.status === 'COMPLETED' ? 'line-through' : ''
            }`}>
              {quest.title}
            </div>
            <div className="text-xs text-slate-400 mt-1">{quest.description}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-300">
                +{quest.xpReward} XP
              </span>
              <span className="text-xs text-slate-500">
                {quest.steps.filter(s => s.status === 'COMPLETED').length}/{quest.steps.length} steps
              </span>
            </div>
          </div>
          <ArrowRight className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>

        {/* Progress bar */}
        {quest.status !== 'LOCKED' && quest.status !== 'COMPLETED' && (
          <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Expanded Steps */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 border-t border-slate-700/50 space-y-2">
              {/* Start Quest Button */}
              {quest.status === 'AVAILABLE' && (
                <button
                  onClick={(e) => { e.stopPropagation(); onStartQuest(); }}
                  disabled={isStarting}
                  className="w-full py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2"
                >
                  {isStarting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Start Quest
                </button>
              )}

              {/* Quest Steps */}
              {quest.steps.map((step, index) => {
                const StepIcon = getStepIcon(step.actionType);
                const isCurrentStep = step.status === 'IN_PROGRESS';
                const canCompleteStep = isCurrentStep && !step.requiresUpload;

                return (
                  <div
                    key={step.id}
                    className={`p-2 rounded border ${
                      step.status === 'COMPLETED' ? 'bg-green-500/10 border-green-500/20' :
                      step.status === 'IN_PROGRESS' ? 'bg-yellow-500/10 border-yellow-500/20' :
                      'bg-slate-800/30 border-slate-700/30'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 ${
                        step.status === 'COMPLETED' ? 'text-green-400' :
                        step.status === 'IN_PROGRESS' ? 'text-yellow-400' :
                        'text-slate-600'
                      }`}>
                        {step.status === 'COMPLETED' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <StepIcon className="w-3 h-3" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-medium ${
                          step.status === 'COMPLETED' ? 'text-green-300 line-through' :
                          step.status === 'IN_PROGRESS' ? 'text-yellow-300' :
                          'text-slate-400'
                        }`}>
                          {index + 1}. {step.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">
                          {step.description}
                        </div>

                        {/* Action buttons for current step */}
                        {isCurrentStep && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {/* Explain This Button - always visible for active step */}
                            <button
                              onClick={(e) => { e.stopPropagation(); onExplainStep(step); }}
                              disabled={isExplaining}
                              className="text-xs px-2 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 rounded hover:from-blue-500/30 hover:to-purple-500/30 disabled:opacity-50 flex items-center gap-1"
                            >
                              {isExplaining ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <SparklesIcon className="w-3 h-3" />
                              )}
                              Explain This
                            </button>
                            {step.actionType === 'EXTERNAL_LINK' && step.actionData && (
                              <a
                                href={(step.actionData as { url?: string }).url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="w-3 h-3 inline mr-1" />
                                Open Link
                              </a>
                            )}
                            {canCompleteStep && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onCompleteStep(step.id); }}
                                disabled={isCompletingStep}
                                className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 disabled:opacity-50"
                              >
                                {isCompletingStep ? (
                                  <Loader2 className="w-3 h-3 inline animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3 inline mr-1" />
                                )}
                                Complete
                              </button>
                            )}
                            {step.requiresUpload && (
                              <>
                                <input
                                  type="file"
                                  ref={fileInputRef}
                                  className="hidden"
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                  onChange={(e) => handleFileChange(e, step)}
                                />
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleFileSelect(step); }}
                                  disabled={isUploading}
                                  className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 disabled:opacity-50 flex items-center gap-1"
                                >
                                  {isUploading && uploadingStepId === step.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Upload className="w-3 h-3" />
                                  )}
                                  Upload Document
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Complete Quest Button */}
              {canComplete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onCompleteQuest(); }}
                  disabled={isCompletingQuest}
                  className="w-full py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2"
                >
                  {isCompletingQuest ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Complete Quest (+{quest.xpReward} XP)
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HoldingsInterior({ onExit, isActive }: HoldingsInteriorProps) {
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [showQuestPanel, setShowQuestPanel] = useState(false);
  const [showDocsPanel, setShowDocsPanel] = useState(false);
  const [expandedQuest, setExpandedQuest] = useState<string | null>(null);

  // Explanation modal state
  const [showExplanation, setShowExplanation] = useState(false);
  const [selectedStepForExplanation, setSelectedStepForExplanation] = useState<CorporateQuestStep | null>(null);
  const [selectedQuestForExplanation, setSelectedQuestForExplanation] = useState<CorporateQuest | null>(null);

  // Fetch data from API
  const { quests, compliance, progress, stats, isLoading, isError } = useHoldingsData();

  // Mutations
  const startQuestMutation = useStartQuest();
  const completeStepMutation = useCompleteStep();
  const completeQuestMutation = useCompleteQuest();
  const explainStepMutation = useExplainQuestStep();
  const uploadDocumentMutation = useUploadStepDocument();

  // Handle file upload for a step
  const handleUploadFile = (step: CorporateQuestStep, file: File) => {
    uploadDocumentMutation.mutate({ stepId: step.id, file });
  };

  // Handle explaining a step
  const handleExplainStep = (step: CorporateQuestStep, quest: CorporateQuest) => {
    setSelectedStepForExplanation(step);
    setSelectedQuestForExplanation(quest);
    setShowExplanation(true);

    // Fetch the explanation
    explainStepMutation.mutate({
      stepTitle: step.title,
      stepDescription: step.description,
      actionType: step.actionType,
      questTitle: quest.title,
      questCategory: quest.category,
      entityName: 'Producer Tour Holdings, Inc.',
      entityType: 'C_CORP',
      jurisdiction: 'Delaware',
      actionData: step.actionData || undefined,
    });
  };

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
              className="absolute left-4 top-20 w-96 max-h-[calc(100vh-10rem)] bg-slate-900/95 backdrop-blur-xl rounded-xl border border-blue-500/30 shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-blue-500/20 bg-blue-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
                      <Star className="w-5 h-5" />
                      Quest Log
                    </h3>
                    <p className="text-xs text-blue-300/70 mt-1">Complete quests to build your corporate empire</p>
                  </div>
                  {progress && (
                    <div className="text-right">
                      <div className="text-sm font-bold text-yellow-400">Level {progress.level}</div>
                      <div className="text-xs text-slate-400">{progress.totalXp} XP</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 space-y-2 flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                    <span className="ml-2 text-slate-400">Loading quests...</span>
                  </div>
                ) : isError ? (
                  <div className="text-center py-8 text-red-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                    <p>Failed to load quests</p>
                    <p className="text-xs text-slate-500 mt-1">Check your connection</p>
                  </div>
                ) : quests.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                    <p>No quests available</p>
                    <p className="text-xs text-slate-500 mt-1">Check back later!</p>
                  </div>
                ) : (
                  quests.map((quest) => (
                    <QuestCard
                      key={quest.id}
                      quest={quest}
                      isExpanded={expandedQuest === quest.id}
                      onToggle={() => setExpandedQuest(expandedQuest === quest.id ? null : quest.id)}
                      onStartQuest={() => startQuestMutation.mutate(quest.id)}
                      onCompleteStep={(stepId) => completeStepMutation.mutate({ stepId })}
                      onCompleteQuest={() => completeQuestMutation.mutate(quest.id)}
                      onExplainStep={(step) => handleExplainStep(step, quest)}
                      onUploadFile={(step, file) => handleUploadFile(step, file)}
                      isStarting={startQuestMutation.isPending}
                      isCompletingStep={completeStepMutation.isPending}
                      isCompletingQuest={completeQuestMutation.isPending}
                      isExplaining={explainStepMutation.isPending}
                      isUploading={uploadDocumentMutation.isPending}
                    />
                  ))
                )}
              </div>

              {stats && (
                <div className="p-3 border-t border-blue-500/20 bg-blue-500/5">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-slate-400">Quest Progress</span>
                    <span className="text-blue-400">{stats.quests.completed} / {stats.quests.total} completed</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                      style={{ width: `${stats.quests.progress}%` }}
                    />
                  </div>
                  {progress && (
                    <div className="flex justify-between text-xs mt-2">
                      <span className="text-slate-500">Next Level</span>
                      <span className="text-yellow-400">{progress.xpProgress} / {progress.xpForNextLevel} XP</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {showDocsPanel && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="absolute right-4 top-20 w-80 max-h-[calc(100vh-10rem)] bg-slate-900/95 backdrop-blur-xl rounded-xl border border-purple-500/30 shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-purple-500/20 bg-purple-500/10">
                <h3 className="text-lg font-bold text-purple-400 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Compliance Calendar
                </h3>
                <p className="text-xs text-purple-300/70 mt-1">Upcoming compliance requirements</p>
              </div>

              <div className="p-3 space-y-2 flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                    <span className="ml-2 text-slate-400">Loading...</span>
                  </div>
                ) : compliance.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
                    <p>All caught up!</p>
                    <p className="text-xs text-slate-500 mt-1">No upcoming compliance items</p>
                  </div>
                ) : (
                  compliance.map((item) => {
                    const statusColors = {
                      UPCOMING: 'bg-blue-500/10 border-blue-500/30',
                      DUE_SOON: 'bg-yellow-500/10 border-yellow-500/30',
                      OVERDUE: 'bg-red-500/10 border-red-500/30',
                      COMPLETED: 'bg-green-500/10 border-green-500/30',
                    };
                    const statusIcons = {
                      UPCOMING: <Clock className="w-4 h-4 text-blue-400" />,
                      DUE_SOON: <AlertCircle className="w-4 h-4 text-yellow-400" />,
                      OVERDUE: <AlertCircle className="w-4 h-4 text-red-400" />,
                      COMPLETED: <CheckCircle2 className="w-4 h-4 text-green-400" />,
                    };
                    const frequencyLabels = {
                      ONE_TIME: 'One-time',
                      MONTHLY: 'Monthly',
                      QUARTERLY: 'Quarterly',
                      ANNUAL: 'Annual',
                    };

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border transition-all hover:scale-[1.02] ${statusColors[item.status]}`}
                      >
                        <div className="flex items-start gap-2">
                          {statusIcons[item.status]}
                          <div className="flex-1">
                            <span className="font-medium text-sm text-white">{item.title}</span>
                            <div className="text-xs text-slate-400 mt-1">{item.description}</div>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-300">
                                {frequencyLabels[item.frequency]}
                              </span>
                              {item.dueDate && (
                                <span className={`text-xs ${
                                  item.status === 'OVERDUE' ? 'text-red-400' :
                                  item.status === 'DUE_SOON' ? 'text-yellow-400' :
                                  'text-slate-400'
                                }`}>
                                  Due: {new Date(item.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {stats && (
                <div className="p-3 border-t border-purple-500/20 bg-purple-500/5">
                  <div className="flex justify-between text-xs">
                    <span className="text-green-400">
                      {compliance.filter(c => c.status === 'COMPLETED').length} Completed
                    </span>
                    <span className="text-yellow-400">
                      {compliance.filter(c => c.status === 'DUE_SOON').length} Due Soon
                    </span>
                    <span className="text-red-400">
                      {stats.compliance.urgent} Urgent
                    </span>
                  </div>
                </div>
              )}
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

        {/* AI Explanation Modal */}
        <AnimatePresence>
          <ExplanationModal
            isOpen={showExplanation}
            onClose={() => {
              setShowExplanation(false);
              setSelectedStepForExplanation(null);
              setSelectedQuestForExplanation(null);
            }}
            step={selectedStepForExplanation}
            quest={selectedQuestForExplanation}
            explanation={explainStepMutation.data || null}
            isLoading={explainStepMutation.isPending}
            error={explainStepMutation.error}
          />
        </AnimatePresence>
      </Html>
    </>
  );
}

export default HoldingsInterior;
