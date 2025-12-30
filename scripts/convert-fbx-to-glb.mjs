/**
 * convert-fbx-to-glb.mjs
 *
 * Converts FBX files to GLB using Three.js (handles older FBX versions).
 *
 * Usage:
 *   node scripts/convert-fbx-to-glb.mjs
 */

import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Input/Output directories
const NEW_ANIMS_DIR = path.join(PROJECT_ROOT, 'apps/frontend/public/animations/new animations');
const LOCOMOTION_DIR = path.join(NEW_ANIMS_DIR, 'Male Locomotion Pack');
const RIFLE_DIR = path.join(NEW_ANIMS_DIR, 'Lite Rifle Pack');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'apps/frontend/public/assets/animations/xbot');

// Animation mapping: [sourceDir, inputFile, outputFile]
const ANIMATIONS = [
  // Basic locomotion
  [LOCOMOTION_DIR, 'idle.fbx', 'idle.glb'],
  [LOCOMOTION_DIR, 'walking.fbx', 'walk.glb'],
  [LOCOMOTION_DIR, 'standard run.fbx', 'run.glb'],
  [LOCOMOTION_DIR, 'jump.fbx', 'jump.glb'],
  [LOCOMOTION_DIR, 'left strafe.fbx', 'strafe_left_run.glb'],
  [LOCOMOTION_DIR, 'right strafe.fbx', 'strafe_right_run.glb'],
  [LOCOMOTION_DIR, 'left strafe walking.fbx', 'strafe_left_walk.glb'],
  [LOCOMOTION_DIR, 'right strafe walking.fbx', 'strafe_right_walk.glb'],
  [LOCOMOTION_DIR, 'left turn 90.fbx', 'turn_left.glb'],
  [LOCOMOTION_DIR, 'right turn 90.fbx', 'turn_right.glb'],

  // Rifle animations
  [RIFLE_DIR, 'idle.fbx', 'rifle_idle.glb'],
  [RIFLE_DIR, 'idle aiming.fbx', 'rifle_aim_idle.glb'],
  [RIFLE_DIR, 'idle crouching.fbx', 'rifle_crouch_idle.glb'],
  [RIFLE_DIR, 'run forward.fbx', 'rifle_run_forward.glb'],
  [RIFLE_DIR, 'run forward left.fbx', 'rifle_run_forward_left.glb'],
  [RIFLE_DIR, 'run forward right.fbx', 'rifle_run_forward_right.glb'],
  [RIFLE_DIR, 'run backward.fbx', 'rifle_run_backward.glb'],
  [RIFLE_DIR, 'run backward left.fbx', 'rifle_run_backward_left.glb'],
  [RIFLE_DIR, 'run backward right.fbx', 'rifle_run_backward_right.glb'],
  [RIFLE_DIR, 'run left.fbx', 'rifle_strafe_left.glb'],
  [RIFLE_DIR, 'run right.fbx', 'rifle_strafe_right.glb'],
  [RIFLE_DIR, 'turn 90 left.fbx', 'rifle_turn_left.glb'],
  [RIFLE_DIR, 'turn 90 right.fbx', 'rifle_turn_right.glb'],
  [RIFLE_DIR, 'death from front headshot.fbx', 'death.glb'],

  // Character model (with mesh)
  [LOCOMOTION_DIR, 'character.fbx', 'xbot.glb'],
];

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const loader = new FBXLoader();
const exporter = new GLTFExporter();

async function convertFile(sourceDir, inputFile, outputFile) {
  const inputPath = path.join(sourceDir, inputFile);
  const outputPath = path.join(OUTPUT_DIR, outputFile);

  if (!fs.existsSync(inputPath)) {
    console.log(`⚠️  Skip: ${inputFile} (not found)`);
    return false;
  }

  console.log(`Converting: ${inputFile} -> ${outputFile}`);

  try {
    // Read FBX file
    const fbxData = fs.readFileSync(inputPath);
    const arrayBuffer = fbxData.buffer.slice(
      fbxData.byteOffset,
      fbxData.byteOffset + fbxData.byteLength
    );

    // Parse FBX
    const object = loader.parse(arrayBuffer, path.dirname(inputPath) + '/');

    // Export as GLB
    const glbData = await new Promise((resolve, reject) => {
      exporter.parse(
        object,
        (result) => resolve(result),
        (error) => reject(error),
        {
          binary: true,
          animations: object.animations,
          includeCustomExtensions: false,
        }
      );
    });

    // Write GLB file
    const buffer = Buffer.from(glbData);
    fs.writeFileSync(outputPath, buffer);

    const sizeKB = (buffer.length / 1024).toFixed(1);
    console.log(`   ✅ ${outputFile} (${sizeKB} KB)`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('CONVERT FBX TO GLB (Three.js)');
  console.log('═'.repeat(60));
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log('═'.repeat(60));

  let success = 0;
  let failed = 0;

  for (const [sourceDir, inputFile, outputFile] of ANIMATIONS) {
    const result = await convertFile(sourceDir, inputFile, outputFile);
    if (result) success++;
    else failed++;
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`COMPLETE: ${success} converted, ${failed} failed`);
  console.log('═'.repeat(60));

  // List output files
  console.log('\nOutput files:');
  const files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith('.glb'));
  for (const file of files.sort()) {
    const stats = fs.statSync(path.join(OUTPUT_DIR, file));
    const sizeKB = (stats.size / 1024).toFixed(1);
    console.log(`  ${file.padEnd(35)} ${sizeKB} KB`);
  }
}

main().catch(console.error);
