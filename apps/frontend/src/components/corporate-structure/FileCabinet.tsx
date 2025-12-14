import { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Text } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import {
  X,
  FileText,
  Folder,
  Download,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useCorporateDocuments } from './hooks';
import type { CorporateDocument, DocumentCategory, DocumentStatus } from './types';

// ============================================================================
// Document Viewer Modal
// ============================================================================

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  documents: CorporateDocument[];
  entityName: string;
}

function DocumentViewer({ isOpen, onClose, documents, entityName }: DocumentViewerProps) {
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'ALL'>('ALL');

  const categories: { value: DocumentCategory | 'ALL'; label: string; color: string }[] = [
    { value: 'ALL', label: 'All Documents', color: 'slate' },
    { value: 'FORMATION', label: 'Formation', color: 'blue' },
    { value: 'GOVERNANCE', label: 'Governance', color: 'purple' },
    { value: 'OWNERSHIP', label: 'Ownership', color: 'green' },
    { value: 'TAX', label: 'Tax', color: 'orange' },
    { value: 'COMPLIANCE', label: 'Compliance', color: 'yellow' },
    { value: 'CONTRACT', label: 'Contracts', color: 'pink' },
    { value: 'INSURANCE', label: 'Insurance', color: 'cyan' },
  ];

  const filteredDocs = selectedCategory === 'ALL'
    ? documents
    : documents.filter(doc => doc.category === selectedCategory);

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case 'CURRENT': return 'text-green-400 bg-green-500/20';
      case 'DRAFT': return 'text-yellow-400 bg-yellow-500/20';
      case 'PENDING_REVIEW': return 'text-blue-400 bg-blue-500/20';
      case 'NEEDS_UPDATE': return 'text-orange-400 bg-orange-500/20';
      case 'EXPIRED': return 'text-red-400 bg-red-500/20';
      case 'ARCHIVED': return 'text-slate-400 bg-slate-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  const getStatusIcon = (status: DocumentStatus) => {
    switch (status) {
      case 'CURRENT': return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'NEEDS_UPDATE':
      case 'EXPIRED': return <AlertCircle className="w-3.5 h-3.5" />;
      default: return <Clock className="w-3.5 h-3.5" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-[0_0_60px_rgba(245,158,11,0.2)]"
      >
        {/* Header */}
        <div className="p-5 border-b border-amber-500/20 bg-gradient-to-r from-amber-600/20 via-orange-600/20 to-amber-600/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Folder className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Corporate Documents</h3>
                <p className="text-xs text-amber-300/70">{entityName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Category Filter */}
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategory === cat.value
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Document List */}
        <div className="p-5 overflow-y-auto max-h-[calc(85vh-180px)]">
          {filteredDocs.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <div className="text-slate-400 text-sm">No documents found</div>
              <div className="text-slate-500 text-xs mt-1">
                Complete quests to add documents to this cabinet
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredDocs.map(doc => (
                <div
                  key={doc.id}
                  className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-amber-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-700/50 rounded-lg">
                        <FileText className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-white">{doc.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">{doc.category}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${getStatusColor(doc.status)}`}>
                            {getStatusIcon(doc.status)}
                            {doc.status.replace('_', ' ')}
                          </span>
                        </div>
                        {doc.effectiveDate && (
                          <div className="text-xs text-slate-500 mt-1">
                            Effective: {new Date(doc.effectiveDate).toLocaleDateString()}
                          </div>
                        )}
                        {doc.fileName && (
                          <div className="text-xs text-slate-600 mt-1">
                            {doc.fileName}
                            {doc.fileSize && ` (${(doc.fileSize / 1024).toFixed(1)} KB)`}
                          </div>
                        )}
                      </div>
                    </div>
                    {doc.fileUrl && (
                      <div className="flex gap-2">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
                          title="View Document"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <a
                          href={doc.fileUrl}
                          download={doc.fileName}
                          className="p-2 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
                          title="Download Document"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}</span>
            <span>Press ESC to close</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// 3D File Cabinet Component
// ============================================================================

interface FileCabinet3DProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  entityId: string;
  entityName: string;
  onInteract?: () => void;
}

export function FileCabinet3D({
  position,
  rotation = [0, 0, 0],
  entityId,
  entityName,
}: FileCabinet3DProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(0);
  const meshRef = useRef<THREE.Group>(null);
  const { data: documents = [] } = useCorporateDocuments(entityId);

  // Animate drawer
  useFrame((_, delta) => {
    if (isHovered && drawerOpen < 1) {
      setDrawerOpen(prev => Math.min(1, prev + delta * 3));
    } else if (!isHovered && drawerOpen > 0) {
      setDrawerOpen(prev => Math.max(0, prev - delta * 3));
    }
  });

  // Document count by category
  const docCounts = {
    governance: documents.filter(d => d.category === 'GOVERNANCE').length,
    formation: documents.filter(d => d.category === 'FORMATION').length,
    tax: documents.filter(d => d.category === 'TAX').length,
    total: documents.length,
  };

  return (
    <>
      <group
        ref={meshRef}
        position={position}
        rotation={rotation}
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
        onClick={() => setIsOpen(true)}
      >
        {/* Cabinet Body */}
        <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 3, 0.8]} />
          <meshStandardMaterial
            color={isHovered ? '#F59E0B' : '#334155'}
            metalness={0.6}
            roughness={0.4}
          />
        </mesh>

        {/* Drawer 1 (Top) - Governance */}
        <group position={[0, 2.5, 0.1 + drawerOpen * 0.3]}>
          <mesh castShadow>
            <boxGeometry args={[1.1, 0.7, 0.6]} />
            <meshStandardMaterial color="#1E293B" metalness={0.5} roughness={0.5} />
          </mesh>
          {/* Handle */}
          <mesh position={[0, 0, 0.35]}>
            <boxGeometry args={[0.4, 0.1, 0.1]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Label */}
          <Text
            position={[0, 0.15, 0.31]}
            fontSize={0.08}
            color={docCounts.governance > 0 ? '#22C55E' : '#64748B'}
            anchorX="center"
            anchorY="middle"
          >
            GOVERNANCE ({docCounts.governance})
          </Text>
        </group>

        {/* Drawer 2 (Middle) - Formation */}
        <group position={[0, 1.5, 0.1 + drawerOpen * 0.25]}>
          <mesh castShadow>
            <boxGeometry args={[1.1, 0.7, 0.6]} />
            <meshStandardMaterial color="#1E293B" metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.35]}>
            <boxGeometry args={[0.4, 0.1, 0.1]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.2} />
          </mesh>
          <Text
            position={[0, 0.15, 0.31]}
            fontSize={0.08}
            color={docCounts.formation > 0 ? '#3B82F6' : '#64748B'}
            anchorX="center"
            anchorY="middle"
          >
            FORMATION ({docCounts.formation})
          </Text>
        </group>

        {/* Drawer 3 (Bottom) - Tax */}
        <group position={[0, 0.5, 0.1 + drawerOpen * 0.2]}>
          <mesh castShadow>
            <boxGeometry args={[1.1, 0.7, 0.6]} />
            <meshStandardMaterial color="#1E293B" metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.35]}>
            <boxGeometry args={[0.4, 0.1, 0.1]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.2} />
          </mesh>
          <Text
            position={[0, 0.15, 0.31]}
            fontSize={0.08}
            color={docCounts.tax > 0 ? '#F97316' : '#64748B'}
            anchorX="center"
            anchorY="middle"
          >
            TAX ({docCounts.tax})
          </Text>
        </group>

        {/* Interaction Label */}
        {isHovered && (
          <Html position={[0, 3.5, 0]} center>
            <div className="bg-slate-900/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-amber-500/30 whitespace-nowrap">
              <div className="text-amber-400 text-sm font-medium">File Cabinet</div>
              <div className="text-slate-400 text-xs">{docCounts.total} documents • Click to view</div>
            </div>
          </Html>
        )}
      </group>

      {/* Document Viewer Modal (rendered in React DOM) */}
      <Html portal={{ current: document.body }}>
        <DocumentViewer
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          documents={documents}
          entityName={entityName}
        />
      </Html>
    </>
  );
}

export default FileCabinet3D;
