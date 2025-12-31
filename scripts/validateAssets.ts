#!/usr/bin/env npx tsx
/**
 * GLB Asset Validation Script
 *
 * Validates GLB files against project standards:
 * - Unit scale (1 unit = 1 meter)
 * - Pivot point (feet at origin)
 * - Bone naming (no mixamorig prefix)
 * - Animation tracks (no scale tracks)
 * - File size limits
 * - Dual skeleton detection
 *
 * Usage:
 *   npx tsx scripts/validateAssets.ts                    # Validate all assets
 *   npx tsx scripts/validateAssets.ts path/to/file.glb   # Validate specific file
 *   npx tsx scripts/validateAssets.ts path/to/dir/       # Validate directory
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

interface ValidationResult {
  file: string;
  errors: string[];
  warnings: string[];
  info: string[];
}

interface GLTFJson {
  asset?: { version?: string; generator?: string };
  scenes?: Array<{ nodes?: number[] }>;
  nodes?: Array<{
    name?: string;
    mesh?: number;
    skin?: number;
    children?: number[];
    translation?: [number, number, number];
    rotation?: [number, number, number, number];
    scale?: [number, number, number];
  }>;
  meshes?: Array<{
    name?: string;
    primitives?: Array<{
      attributes?: Record<string, number>;
    }>;
  }>;
  skins?: Array<{
    joints?: number[];
    skeleton?: number;
  }>;
  animations?: Array<{
    name?: string;
    channels?: Array<{
      target?: {
        node?: number;
        path?: string;
      };
    }>;
    samplers?: Array<{
      input?: number;
      output?: number;
      interpolation?: string;
    }>;
  }>;
  accessors?: Array<{
    min?: number[];
    max?: number[];
    count?: number;
    type?: string;
  }>;
  bufferViews?: Array<{
    buffer?: number;
    byteLength?: number;
    byteOffset?: number;
  }>;
}

interface ValidationStats {
  totalFiles: number;
  passed: number;
  warnings: number;
  errors: number;
}

// ============================================================================
// Constants
// ============================================================================

const ASSET_DIRS = [
  'apps/frontend/public/assets',
  'apps/frontend/public/models',
];

// File size limits (in bytes)
const SIZE_LIMITS = {
  animation: 500 * 1024, // 500 KB
  character: 5 * 1024 * 1024, // 5 MB
  model: 10 * 1024 * 1024, // 10 MB
};

// Expected height range for humanoid characters (meters)
const CHARACTER_HEIGHT = {
  min: 0.5,
  max: 3.0,
};

// Expected Mixamo bones
const EXPECTED_BONES = new Set([
  'Hips',
  'Spine',
  'Spine1',
  'Spine2',
  'Neck',
  'Head',
  'LeftShoulder',
  'LeftArm',
  'LeftForeArm',
  'LeftHand',
  'RightShoulder',
  'RightArm',
  'RightForeArm',
  'RightHand',
  'LeftUpLeg',
  'LeftLeg',
  'LeftFoot',
  'RightUpLeg',
  'RightLeg',
  'RightFoot',
]);

// ============================================================================
// GLB Parsing
// ============================================================================

function parseGLB(filePath: string): GLTFJson | null {
  try {
    const buffer = fs.readFileSync(filePath);

    // GLB header
    const magic = buffer.readUInt32LE(0);
    if (magic !== 0x46546c67) {
      // 'glTF' in little endian
      return null;
    }

    // Get JSON chunk
    const jsonLength = buffer.readUInt32LE(12);
    const jsonChunk = buffer.subarray(20, 20 + jsonLength);
    return JSON.parse(jsonChunk.toString('utf8')) as GLTFJson;
  } catch {
    return null;
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

function validateScale(
  gltf: GLTFJson,
  result: ValidationResult,
  isAnimation: boolean
): void {
  if (!gltf.nodes || isAnimation) return;

  // Find all nodes with meshes to calculate bounds
  const meshNodes = gltf.nodes.filter((n) => n.mesh !== undefined);
  if (meshNodes.length === 0) return;

  // Try to get bounds from accessors (position min/max)
  if (gltf.accessors) {
    let minY = Infinity;
    let maxY = -Infinity;

    for (const accessor of gltf.accessors) {
      if (accessor.min && accessor.max && accessor.type === 'VEC3') {
        minY = Math.min(minY, accessor.min[1]);
        maxY = Math.max(maxY, accessor.max[1]);
      }
    }

    if (minY !== Infinity && maxY !== -Infinity) {
      const height = maxY - minY;

      // Check pivot point (feet at origin)
      if (Math.abs(minY) > 0.1) {
        result.warnings.push(
          `Pivot not at feet: min.y=${minY.toFixed(3)} (expected ~0)`
        );
      }

      // Check height for characters
      if (height < CHARACTER_HEIGHT.min || height > CHARACTER_HEIGHT.max) {
        if (height < CHARACTER_HEIGHT.min) {
          result.errors.push(
            `Model too small: height=${height.toFixed(2)}m (min: ${CHARACTER_HEIGHT.min}m)`
          );
        } else {
          result.warnings.push(
            `Model very tall: height=${height.toFixed(2)}m (max expected: ${CHARACTER_HEIGHT.max}m)`
          );
        }
      } else {
        result.info.push(`Height: ${height.toFixed(2)}m`);
      }
    }
  }
}

function validateBoneNaming(gltf: GLTFJson, result: ValidationResult): void {
  if (!gltf.nodes) return;

  const boneNodes = gltf.nodes.filter(
    (n) => n.name && (n.children !== undefined || n.skin !== undefined)
  );

  const prefixedBones: string[] = [];
  const duplicateBones: string[] = [];

  for (const node of boneNodes) {
    if (!node.name) continue;

    // Check for mixamorig prefix
    if (node.name.startsWith('mixamorig:') || node.name.startsWith('mixamorig')) {
      prefixedBones.push(node.name);
    }

    // Check for duplicate skeleton (_1 suffix)
    if (node.name.endsWith('_1') || node.name.includes('_1.')) {
      duplicateBones.push(node.name);
    }
  }

  if (prefixedBones.length > 0) {
    result.warnings.push(
      `${prefixedBones.length} bones have mixamorig prefix (will be remapped at runtime)`
    );
  }

  if (duplicateBones.length > 0) {
    result.errors.push(
      `Dual skeleton detected: ${duplicateBones.length} bones with _1 suffix (${duplicateBones.slice(0, 3).join(', ')}...)`
    );
  }
}

function validateAnimationTracks(
  gltf: GLTFJson,
  result: ValidationResult
): void {
  if (!gltf.animations || gltf.animations.length === 0) return;

  let scaleTrackCount = 0;
  let rootMotionCount = 0;

  for (const animation of gltf.animations) {
    if (!animation.channels) continue;

    for (const channel of animation.channels) {
      if (!channel.target) continue;

      const path = channel.target.path;
      const nodeIdx = channel.target.node;
      const nodeName =
        nodeIdx !== undefined && gltf.nodes?.[nodeIdx]?.name
          ? gltf.nodes[nodeIdx].name
          : 'unknown';

      // Check for scale tracks
      if (path === 'scale') {
        scaleTrackCount++;
      }

      // Check for root motion (Hips translation)
      if (path === 'translation' && nodeName?.includes('Hips')) {
        rootMotionCount++;
      }
    }
  }

  if (scaleTrackCount > 0) {
    result.errors.push(
      `${scaleTrackCount} scale tracks found (must be removed to prevent stretching)`
    );
  }

  if (rootMotionCount > 0) {
    result.warnings.push(
      `${rootMotionCount} Hips translation tracks found (root motion - may cause drift)`
    );
  }

  result.info.push(`Animations: ${gltf.animations.length}`);
}

function validateFileSize(
  filePath: string,
  result: ValidationResult,
  isAnimation: boolean
): void {
  const stats = fs.statSync(filePath);
  const sizeKB = stats.size / 1024;
  const sizeMB = sizeKB / 1024;

  result.info.push(`Size: ${sizeKB < 1024 ? `${sizeKB.toFixed(0)}KB` : `${sizeMB.toFixed(2)}MB`}`);

  if (isAnimation && stats.size > SIZE_LIMITS.animation) {
    result.warnings.push(
      `Animation file large: ${sizeKB.toFixed(0)}KB (max: ${SIZE_LIMITS.animation / 1024}KB)`
    );
  } else if (!isAnimation && stats.size > SIZE_LIMITS.character) {
    result.warnings.push(
      `Model file large: ${sizeMB.toFixed(2)}MB (max: ${SIZE_LIMITS.character / 1024 / 1024}MB)`
    );
  }
}

function validateSkeleton(gltf: GLTFJson, result: ValidationResult): void {
  if (!gltf.skins || gltf.skins.length === 0) return;

  for (const skin of gltf.skins) {
    if (!skin.joints || !gltf.nodes) continue;

    const boneNames = new Set(
      skin.joints.map((idx) => {
        const name = gltf.nodes?.[idx]?.name || '';
        // Strip prefix for comparison
        return name.replace(/^mixamorig:?/, '');
      })
    );

    // Check for expected bones
    const missingBones: string[] = [];
    for (const expected of EXPECTED_BONES) {
      if (!boneNames.has(expected)) {
        missingBones.push(expected);
      }
    }

    if (missingBones.length > 0 && missingBones.length < 10) {
      result.warnings.push(`Missing bones: ${missingBones.join(', ')}`);
    }

    // Check Hips is properly set as skeleton root
    const hipsIdx = skin.joints.find((idx) => {
      const name = gltf.nodes?.[idx]?.name || '';
      return name.includes('Hips');
    });

    if (hipsIdx === undefined) {
      result.errors.push('No Hips bone found in skeleton');
    }

    result.info.push(`Skeleton: ${skin.joints.length} bones`);
  }
}

// ============================================================================
// Main Validation
// ============================================================================

function validateFile(filePath: string): ValidationResult {
  const result: ValidationResult = {
    file: filePath,
    errors: [],
    warnings: [],
    info: [],
  };

  // Check file exists
  if (!fs.existsSync(filePath)) {
    result.errors.push('File not found');
    return result;
  }

  // Check extension
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.glb' && ext !== '.gltf') {
    result.errors.push(`Invalid extension: ${ext} (expected .glb or .gltf)`);
    return result;
  }

  // Parse GLB
  const gltf = parseGLB(filePath);
  if (!gltf) {
    result.errors.push('Failed to parse GLB file');
    return result;
  }

  // Determine if this is an animation file
  const isAnimation =
    filePath.includes('/animations/') ||
    (gltf.animations && gltf.animations.length > 0 && (!gltf.meshes || gltf.meshes.length === 0));

  // Run validations
  validateFileSize(filePath, result, isAnimation);
  validateScale(gltf, result, isAnimation);
  validateBoneNaming(gltf, result);
  validateSkeleton(gltf, result);
  validateAnimationTracks(gltf, result);

  return result;
}

function findGLBFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      files.push(...findGLBFiles(fullPath));
    } else if (item.isFile() && (item.name.endsWith('.glb') || item.name.endsWith('.gltf'))) {
      files.push(fullPath);
    }
  }

  return files;
}

function printResult(result: ValidationResult, verbose: boolean = false): void {
  const relativePath = path.relative(process.cwd(), result.file);
  const hasErrors = result.errors.length > 0;
  const hasWarnings = result.warnings.length > 0;

  // Status icon
  let icon: string;
  if (hasErrors) {
    icon = '\x1b[31m✗\x1b[0m'; // Red X
  } else if (hasWarnings) {
    icon = '\x1b[33m!\x1b[0m'; // Yellow !
  } else {
    icon = '\x1b[32m✓\x1b[0m'; // Green checkmark
  }

  console.log(`${icon} ${relativePath}`);

  if (verbose || hasErrors || hasWarnings) {
    for (const info of result.info) {
      console.log(`    \x1b[90m${info}\x1b[0m`);
    }
  }

  for (const warning of result.warnings) {
    console.log(`    \x1b[33m⚠ ${warning}\x1b[0m`);
  }

  for (const error of result.errors) {
    console.log(`    \x1b[31m✗ ${error}\x1b[0m`);
  }
}

function printSummary(stats: ValidationStats): void {
  console.log('\n' + '='.repeat(60));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total files:  ${stats.totalFiles}`);
  console.log(`\x1b[32mPassed:       ${stats.passed}\x1b[0m`);
  console.log(`\x1b[33mWarnings:     ${stats.warnings}\x1b[0m`);
  console.log(`\x1b[31mErrors:       ${stats.errors}\x1b[0m`);
  console.log('='.repeat(60));

  if (stats.errors > 0) {
    console.log('\n\x1b[31mValidation failed with errors.\x1b[0m');
    process.exitCode = 1;
  } else if (stats.warnings > 0) {
    console.log('\n\x1b[33mValidation passed with warnings.\x1b[0m');
  } else {
    console.log('\n\x1b[32mAll assets valid!\x1b[0m');
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

function main(): void {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const jsonOutput = args.includes('--json');
  const pathArg = args.find((a) => !a.startsWith('-'));

  console.log('='.repeat(60));
  console.log('ASSET VALIDATION');
  console.log('='.repeat(60));
  console.log('');

  let files: string[] = [];

  if (pathArg) {
    // Validate specific file or directory
    const targetPath = path.resolve(pathArg);

    if (fs.statSync(targetPath).isDirectory()) {
      files = findGLBFiles(targetPath);
    } else {
      files = [targetPath];
    }
  } else {
    // Validate all asset directories
    for (const dir of ASSET_DIRS) {
      const fullDir = path.resolve(process.cwd(), dir);
      files.push(...findGLBFiles(fullDir));
    }
  }

  if (files.length === 0) {
    console.log('No GLB/GLTF files found.');
    return;
  }

  console.log(`Found ${files.length} file(s) to validate\n`);

  const results: ValidationResult[] = [];
  const stats: ValidationStats = {
    totalFiles: files.length,
    passed: 0,
    warnings: 0,
    errors: 0,
  };

  for (const file of files) {
    const result = validateFile(file);
    results.push(result);

    if (result.errors.length > 0) {
      stats.errors++;
    } else if (result.warnings.length > 0) {
      stats.warnings++;
    } else {
      stats.passed++;
    }

    if (!jsonOutput) {
      printResult(result, verbose);
    }
  }

  if (jsonOutput) {
    const output = {
      stats,
      results: results.filter((r) => r.errors.length > 0 || r.warnings.length > 0),
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    printSummary(stats);
  }

  // Write error file for CI
  if (stats.errors > 0) {
    const errorResults = results.filter((r) => r.errors.length > 0);
    fs.writeFileSync(
      'validation-errors.json',
      JSON.stringify(errorResults, null, 2)
    );
  }
}

main();
