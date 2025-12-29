import type { TitleTemplate, DescriptionTemplate } from '../types/youtube';

// Load custom templates from localStorage
function loadCustomTemplates<T>(key: string, defaultValue: Record<string, T>): Record<string, T> {
  try {
    const stored = localStorage.getItem(key);
    return stored ? { ...defaultValue, ...JSON.parse(stored) } : defaultValue;
  } catch {
    return defaultValue;
  }
}

// Save custom templates to localStorage
function saveCustomTemplates<T>(key: string, templates: Record<string, T>): void {
  try {
    // Only save custom templates (ones that start with "Custom")
    const customOnly = Object.fromEntries(
      Object.entries(templates).filter(([name]) => name.startsWith('Custom'))
    );
    localStorage.setItem(key, JSON.stringify(customOnly));
  } catch (error) {
    console.warn(`Failed to save templates to ${key}:`, error);
  }
}

const defaultTitleTemplates: Record<string, TitleTemplate> = {
  'Keep File Name': (name: string) => name,
  'NEW 2025': (name: string) => `NEW 2025 ${name} Type Beat`,
  'Hard Type Beat': (name: string) => `${name} - Hard Type Beat (Prod. by Nully Beats)`,
  'Aggressive': (name: string) => `[HARD] ${name} Type Beat | Aggressive Trap Instrumental`,
};

export const titleTemplates: Record<string, TitleTemplate> = loadCustomTemplates(
  'youtube-title-templates',
  defaultTitleTemplates
);

const defaultDescriptionTemplates: Record<string, DescriptionTemplate> = {
  'Default': `🔥 New Beat Available Now!

📧 Contact: nullybeats@gmail.com
🌐 Website: https://nullybeats.com
📱 Instagram: @nullybeats

💰 Purchase (Instant Delivery): https://nullybeats.com
🎵 More Beats: https://nullybeats.com/beats

This beat is available for lease and exclusive purchase.
All sales are final and come with instant delivery.

#typebeat #beatsforsale #instrumentals #hiphopbeat #trapbeat #producer #nullybeats`,

  'Short & Sweet': `🔥 New beat by Nully Beats
💰 Purchase: https://nullybeats.com
📧 Contact: nullybeats@gmail.com`,

  'Detailed': `🎵 BPM: [ADD BPM]
🎹 Key: [ADD KEY]
🎧 Genre: Trap / Hip-Hop

📧 For collaborations & custom beats: nullybeats@gmail.com
🌐 Website: https://nullybeats.com
📱 Follow on Instagram: @nullybeats

💰 PURCHASE OPTIONS:
• MP3 Lease: Basic package
• WAV Lease: High quality
• Trackouts: Full stems
• Exclusive Rights: Full ownership

All beats come with instant delivery and commercial use rights.

Tags: #typebeat #beatsforsale #instrumentals #hiphopbeat #trapbeat #producer #beatmaker #nullybeats #musicproduction #studiobeats`,
};

export const descriptionTemplates: Record<string, DescriptionTemplate> = loadCustomTemplates(
  'youtube-description-templates',
  defaultDescriptionTemplates
);

// Metadata Presets
export interface MetadataPreset {
  name: string;
  tags: string[];
  privacy: 'public' | 'unlisted' | 'private';
  titleTemplate: string;
  descriptionTemplate: string;
}

const defaultPresets: Record<string, MetadataPreset> = {
  'Type Beat Standard': {
    name: 'Type Beat Standard',
    tags: ['type beat', 'beats for sale', 'instrumentals', 'hip hop beat', 'trap beat', 'producer', 'nully beats'],
    privacy: 'public',
    titleTemplate: 'NEW 2025',
    descriptionTemplate: 'Default',
  },
  'Hard Trap': {
    name: 'Hard Trap',
    tags: ['hard trap', 'aggressive beat', 'type beat', 'trap instrumental', 'dark beat', 'nully beats'],
    privacy: 'public',
    titleTemplate: 'Aggressive',
    descriptionTemplate: 'Detailed',
  },
};

function loadPresets(): Record<string, MetadataPreset> {
  try {
    const stored = localStorage.getItem('youtube-metadata-presets');
    return stored ? { ...defaultPresets, ...JSON.parse(stored) } : defaultPresets;
  } catch {
    return defaultPresets;
  }
}

function savePresets(presets: Record<string, MetadataPreset>): void {
  try {
    // Only save custom presets
    const customOnly = Object.fromEntries(
      Object.entries(presets).filter(([name]) => name.startsWith('Custom'))
    );
    localStorage.setItem('youtube-metadata-presets', JSON.stringify(customOnly));
  } catch (error) {
    console.warn('Failed to save presets:', error);
  }
}

export const metadataPresets: Record<string, MetadataPreset> = loadPresets();

// Helper to add custom presets
export function addMetadataPreset(preset: MetadataPreset): void {
  metadataPresets[preset.name] = preset;
  savePresets(metadataPresets);
}

export function removeMetadataPreset(name: string): void {
  if (!name.startsWith('Custom')) return; // Only allow deleting custom presets
  delete metadataPresets[name];
  savePresets(metadataPresets);
}

// Helper to add custom templates
export function addTitleTemplate(name: string, template: TitleTemplate): void {
  titleTemplates[name] = template;
  saveCustomTemplates('youtube-title-templates', titleTemplates);
}

export function addDescriptionTemplate(name: string, template: DescriptionTemplate): void {
  descriptionTemplates[name] = template;
  saveCustomTemplates('youtube-description-templates', descriptionTemplates);
}

export function removeTitleTemplate(name: string): void {
  if (!name.startsWith('Custom')) return; // Only allow deleting custom templates
  delete titleTemplates[name];
  saveCustomTemplates('youtube-title-templates', titleTemplates);
}

export function removeDescriptionTemplate(name: string): void {
  if (!name.startsWith('Custom')) return;
  delete descriptionTemplates[name];
  saveCustomTemplates('youtube-description-templates', descriptionTemplates);
}
