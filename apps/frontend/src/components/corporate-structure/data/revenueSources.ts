import { Radio, Landmark, Headphones } from 'lucide-react';
import { RevenueSourceData } from '../types';

// Revenue sources positioned in front of PT LLC
// Colors: red, orange, pink - distinct from entity colors
// Positions scaled 3.5x for expanded universe
export const revenueSources: RevenueSourceData[] = [
  {
    id: 'pro',
    label: 'PROs',
    fullName: 'Performance Rights Organizations',
    position: [-42, -14, 56], // LEFT - Performance royalties
    color: '#ef4444', // Red
    icon: Radio,
    description: 'Performance royalties from BMI, ASCAP, SESAC, GMR',
    examples: ['Radio airplay', 'TV sync', 'Live venues', 'Streaming performance']
  },
  {
    id: 'mlc',
    label: 'MLC',
    fullName: 'Mechanical Licensing Collective',
    position: [0, -14, 70], // CENTER - Mechanicals
    color: '#f97316', // Orange
    icon: Landmark,
    description: 'Mechanical royalties for US streaming reproductions',
    examples: ['Spotify mechanicals', 'Apple Music', 'Amazon Music', 'YouTube Music']
  },
  {
    id: 'dsp',
    label: 'DSPs',
    fullName: 'Digital Service Providers',
    position: [42, -14, 56], // RIGHT - Direct streaming
    color: '#ec4899', // Pink
    icon: Headphones,
    description: 'Direct distribution royalties from streaming platforms',
    examples: ['Spotify', 'Apple Music', 'Tidal', 'Deezer']
  },
];
