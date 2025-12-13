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
