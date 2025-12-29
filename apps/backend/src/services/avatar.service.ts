/**
 * Avatar Service
 * Handles CRUD operations for user avatar configurations
 */

import { prisma } from '../lib/prisma';

// Type definitions matching frontend CharacterConfig
type BodyType = 'male' | 'female' | 'neutral';
type BuildType = 'slim' | 'average' | 'athletic' | 'heavy';

interface CharacterConfig {
  version: number;
  bodyType: BodyType;
  skinTone: string;
  height: number;
  build: BuildType;
  facePreset: number;
  eyeSize: number;
  eyeSpacing: number;
  noseWidth: number;
  noseLength: number;
  jawWidth: number;
  chinLength: number;
  lipFullness: number;
  cheekboneHeight: number;
  hairStyleId: string | null;
  hairColor: string;
  hairHighlightColor?: string;
  eyeColor: string;
  createdAt: string;
  updatedAt: string;
}

// Validation constants
const VALID_BODY_TYPES: BodyType[] = ['male', 'female', 'neutral'];
const VALID_BUILD_TYPES: BuildType[] = ['slim', 'average', 'athletic', 'heavy'];
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

class AvatarService {
  /**
   * Validate a CharacterConfig object
   */
  validateConfig(config: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config || typeof config !== 'object') {
      return { valid: false, errors: ['Config must be an object'] };
    }

    const c = config as Record<string, unknown>;

    // Version check
    if (typeof c.version !== 'number' || c.version < 1) {
      errors.push('version must be a positive number');
    }

    // Body type validation
    if (!VALID_BODY_TYPES.includes(c.bodyType as BodyType)) {
      errors.push(`bodyType must be one of: ${VALID_BODY_TYPES.join(', ')}`);
    }

    // Build type validation
    if (!VALID_BUILD_TYPES.includes(c.build as BuildType)) {
      errors.push(`build must be one of: ${VALID_BUILD_TYPES.join(', ')}`);
    }

    // Color validations
    if (typeof c.skinTone !== 'string' || !HEX_COLOR_REGEX.test(c.skinTone)) {
      errors.push('skinTone must be a valid hex color (e.g., #FFE0BD)');
    }
    if (typeof c.hairColor !== 'string' || !HEX_COLOR_REGEX.test(c.hairColor)) {
      errors.push('hairColor must be a valid hex color');
    }
    if (typeof c.eyeColor !== 'string' || !HEX_COLOR_REGEX.test(c.eyeColor)) {
      errors.push('eyeColor must be a valid hex color');
    }
    if (c.hairHighlightColor && (typeof c.hairHighlightColor !== 'string' || !HEX_COLOR_REGEX.test(c.hairHighlightColor))) {
      errors.push('hairHighlightColor must be a valid hex color if provided');
    }

    // Numeric range validations
    const numericRangeFields = [
      { key: 'height', min: 0, max: 1 },
      { key: 'eyeSize', min: -1, max: 1 },
      { key: 'eyeSpacing', min: -1, max: 1 },
      { key: 'noseWidth', min: -1, max: 1 },
      { key: 'noseLength', min: -1, max: 1 },
      { key: 'jawWidth', min: -1, max: 1 },
      { key: 'chinLength', min: -1, max: 1 },
      { key: 'lipFullness', min: -1, max: 1 },
      { key: 'cheekboneHeight', min: -1, max: 1 },
    ];

    for (const field of numericRangeFields) {
      const val = c[field.key];
      if (typeof val !== 'number' || val < field.min || val > field.max) {
        errors.push(`${field.key} must be a number between ${field.min} and ${field.max}`);
      }
    }

    // Face preset validation
    if (typeof c.facePreset !== 'number' || c.facePreset < 1 || c.facePreset > 6) {
      errors.push('facePreset must be a number between 1 and 6');
    }

    // Hair style ID (nullable string)
    if (c.hairStyleId !== null && typeof c.hairStyleId !== 'string') {
      errors.push('hairStyleId must be a string or null');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get avatar config for a user
   */
  async getConfig(userId: string): Promise<{ config: CharacterConfig | null; version: number }> {
    const avatar = await prisma.userAvatar.findUnique({
      where: { userId },
    });

    if (!avatar) {
      return { config: null, version: 0 };
    }

    return {
      config: avatar.configJson as unknown as CharacterConfig,
      version: avatar.version,
    };
  }

  /**
   * Save or update avatar config for a user
   */
  async saveConfig(
    userId: string,
    config: CharacterConfig
  ): Promise<{ success: boolean; avatar: { id: string; version: number } }> {
    // Update timestamps
    const now = new Date().toISOString();
    const configWithTimestamps = {
      ...config,
      updatedAt: now,
    };

    // Upsert the avatar record
    const avatar = await prisma.userAvatar.upsert({
      where: { userId },
      create: {
        userId,
        configJson: configWithTimestamps as unknown as object,
        bodyType: config.bodyType,
        version: 1,
      },
      update: {
        configJson: configWithTimestamps as unknown as object,
        bodyType: config.bodyType,
        version: { increment: 1 },
      },
    });

    return {
      success: true,
      avatar: {
        id: avatar.id,
        version: avatar.version,
      },
    };
  }

  /**
   * Get avatar config for another player (multiplayer)
   */
  async getPlayerConfig(
    playerId: string
  ): Promise<{ config: CharacterConfig | null; bodyType: string | null }> {
    const avatar = await prisma.userAvatar.findUnique({
      where: { userId: playerId },
      select: {
        configJson: true,
        bodyType: true,
      },
    });

    if (!avatar) {
      return { config: null, bodyType: null };
    }

    return {
      config: avatar.configJson as unknown as CharacterConfig,
      bodyType: avatar.bodyType,
    };
  }

  /**
   * Get multiple player configs (for batch loading in multiplayer)
   */
  async getPlayerConfigs(
    playerIds: string[]
  ): Promise<Map<string, CharacterConfig>> {
    const avatars = await prisma.userAvatar.findMany({
      where: { userId: { in: playerIds } },
      select: {
        userId: true,
        configJson: true,
      },
    });

    const configMap = new Map<string, CharacterConfig>();
    for (const avatar of avatars) {
      configMap.set(avatar.userId, avatar.configJson as unknown as CharacterConfig);
    }

    return configMap;
  }

  /**
   * Delete avatar config for a user
   */
  async deleteConfig(userId: string): Promise<boolean> {
    try {
      await prisma.userAvatar.delete({
        where: { userId },
      });
      return true;
    } catch {
      // Record doesn't exist
      return false;
    }
  }
}

export const avatarService = new AvatarService();
