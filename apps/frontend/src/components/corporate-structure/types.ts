import { Building2, Music2 } from 'lucide-react';

// Entity data structure for corporate entities
export interface EntityData {
  id: string;
  name: string;
  shortName: string;
  type: string;
  jurisdiction: string;
  color: string;
  position: [number, number, number];
  purpose: string;
  taxNote: string;
  icon: typeof Building2;
  owns: string[];
  doesNot: string[];
  criticalDocs: string[];
  taxRate: string;
  stateTax: string;
  complianceItems: { task: string; frequency: string; critical: boolean }[];
}

// Flow connection between entities
export interface FlowConnection {
  from: string;
  to: string;
  label: string;
  type: 'ownership' | 'license' | 'services' | 'distribution' | 'revenue';
  color: string;
  amount?: string;
  description?: string;
}

// Revenue source data
export interface RevenueSourceData {
  id: string;
  label: string;
  fullName: string;
  position: [number, number, number];
  color: string;
  icon: typeof Music2;
  description: string;
  examples: string[];
}

// Multiplayer player data
export interface Player3D {
  id: string;
  username: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  color: string;
}

// Portal states
export type PortalState = 'outside' | 'warping-in' | 'inside' | 'warping-out';

// Fly mode states
export type FlyMode = 'off' | 'first' | 'third';

// ============================================================================
// Quest System Types - From Database Schema
// ============================================================================

export type EntityType = 'C_CORP' | 'LLC';
export type EntityStatus = 'NOT_FORMED' | 'PENDING' | 'ACTIVE' | 'DISSOLVED';

export type QuestCategory = 'FORMATION' | 'GOVERNANCE' | 'COMPLIANCE' | 'FINANCIAL' | 'PROTECTION';
export type QuestStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';

export type StepStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
export type StepActionType = 'INFO' | 'EXTERNAL_LINK' | 'TEMPLATE' | 'UPLOAD' | 'VERIFY';

export type DocumentCategory = 'FORMATION' | 'GOVERNANCE' | 'OWNERSHIP' | 'TAX' | 'COMPLIANCE' | 'CONTRACT' | 'INSURANCE';
export type DocumentStatus = 'DRAFT' | 'PENDING_REVIEW' | 'CURRENT' | 'NEEDS_UPDATE' | 'EXPIRED' | 'ARCHIVED';

export type ComplianceFrequency = 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type ComplianceItemStatus = 'UPCOMING' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED';

// Database Entity (from API)
export interface CorporateEntity {
  id: string;
  name: string;
  shortName: string;
  type: EntityType;
  jurisdiction: string;
  status: EntityStatus;
  formedDate?: string | null;
  ein?: string | null;
  stateFileNumber?: string | null;
  registeredAgent?: string | null;
  color: string;
  biomeType?: string | null;
  createdAt: string;
  updatedAt: string;
  quests?: CorporateQuest[];
  documents?: CorporateDocument[];
  complianceItems?: ComplianceItem[];
  _count?: {
    quests: number;
    documents: number;
    complianceItems: number;
  };
}

export interface CorporateQuest {
  id: string;
  entityId: string;
  entity?: CorporateEntity;
  title: string;
  description: string;
  category: QuestCategory;
  order: number;
  status: QuestStatus;
  prerequisiteIds: string[];
  xpReward: number;
  completedAt?: string | null;
  completedBy?: string | null;
  steps: CorporateQuestStep[];
  progress?: number; // Calculated field
  createdAt: string;
  updatedAt: string;
}

export interface CorporateQuestStep {
  id: string;
  questId: string;
  quest?: CorporateQuest;
  title: string;
  description: string;
  order: number;
  status: StepStatus;
  actionType: StepActionType;
  actionData?: Record<string, unknown> | null;
  requiresUpload: boolean;
  documentId?: string | null;
  completedAt?: string | null;
  completedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CorporateDocument {
  id: string;
  entityId: string;
  entity?: CorporateEntity;
  name: string;
  category: DocumentCategory;
  status: DocumentStatus;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  version: number;
  previousVersion?: string | null;
  effectiveDate?: string | null;
  expirationDate?: string | null;
  uploadedBy?: string | null;
  uploadedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceItem {
  id: string;
  entityId: string;
  entity?: {
    name: string;
    shortName: string;
    color: string;
  };
  title: string;
  description: string;
  frequency: ComplianceFrequency;
  dueDate?: string | null;
  reminderDays: number;
  status: ComplianceItemStatus;
  completedAt?: string | null;
  completedBy?: string | null;
  documentId?: string | null;
  createdAt: string;
  updatedAt: string;
  daysUntilDue?: number; // Calculated field
}

export interface CorporateUserProgress {
  id: string;
  userId: string;
  totalXp: number;
  questsCompleted: number;
  achievements: string[];
  level: number; // Calculated
  xpForNextLevel: number; // Calculated
  xpProgress: number; // Calculated
  createdAt: string;
  updatedAt: string;
}

export interface CorporateStats {
  entities: {
    total: number;
    formed: number;
    pending: number;
  };
  quests: {
    total: number;
    completed: number;
    available: number;
    progress: number;
  };
  compliance: {
    urgent: number;
  };
  documents: {
    current: number;
  };
}

// UI State Types
export interface QuestPanelState {
  selectedQuest: CorporateQuest | null;
  selectedStep: CorporateQuestStep | null;
  isExpanded: boolean;
}

// Action Data Types for Quest Steps
export interface InfoActionData {
  content?: string;
  checklist?: string[];
}

export interface ExternalLinkActionData {
  url: string;
  label?: string;
}

export interface TemplateActionData {
  templateName?: string;
  templateId?: string;
}

// AI Quest Advisor Response
export interface QuestStepExplanation {
  summary: string;
  whyItMatters: string;
  taxImplications: string;
  legalConsiderations: string;
  commonMistakes: string[];
  proTips: string[];
  estimatedTime: string;
  estimatedCost?: string;
}

// ============================================================================
// Entity Verification Types (OpenCorporates)
// ============================================================================

export interface EntityVerificationResult {
  verified: boolean;
  confidence: 'high' | 'medium' | 'low' | 'none';
  matchedEntity?: {
    id: string;
    name: string;
    score: number;
    opencorporatesUrl: string;
  };
  suggestedMatches?: Array<{
    id: string;
    name: string;
    score: number;
    opencorporatesUrl: string;
  }>;
  message: string;
}

export interface CompanyDetails {
  name: string;
  companyNumber: string;
  jurisdictionCode: string;
  incorporationDate?: string;
  companyType?: string;
  currentStatus?: string;
  registeredAddress?: {
    streetAddress?: string;
    locality?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
  opencorporatesUrl: string;
}
