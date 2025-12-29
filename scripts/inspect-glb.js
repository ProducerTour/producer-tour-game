#!/usr/bin/env node
/**
 * GLB Structure Analyzer
 */
const fs = require('fs');
const path = require('path');

const glbPath = process.argv[2] || 'apps/frontend/public/assets/avatars/base_male.glb';
const buffer = fs.readFileSync(glbPath);
const jsonLength = buffer.readUInt32LE(12);
const jsonChunk = buffer.slice(20, 20 + jsonLength);
const json = JSON.parse(jsonChunk.toString('utf8'));

console.log('=== GLB STRUCTURE ANALYSIS ===');
console.log('File:', glbPath);
console.log('');

// Nodes (scene graph)
console.log('NODES:');
json.nodes.forEach((node, i) => {
  let info = `[${i}] ${node.name || 'unnamed'}`;
  if (node.mesh !== undefined) info += ` (mesh: ${node.mesh})`;
  if (node.skin !== undefined) info += ` (skin: ${node.skin})`;
  if (node.translation) info += ` pos:[${node.translation.map(v => v.toFixed(2)).join(',')}]`;
  if (node.rotation) info += ` rot:[${node.rotation.map(v => v.toFixed(2)).join(',')}]`;
  if (node.scale) info += ` scale:[${node.scale.map(v => v.toFixed(2)).join(',')}]`;
  if (node.children) info += ` children:[${node.children.join(',')}]`;
  console.log(info);
});

console.log('\n\nMESHES:');
json.meshes.forEach((mesh, i) => {
  console.log(`[${i}] ${mesh.name || 'unnamed'}`);
  mesh.primitives.forEach((prim, j) => {
    let attrs = Object.keys(prim.attributes).join(', ');
    let targets = prim.targets ? `targets: ${prim.targets.length}` : 'no targets';
    console.log(`  Primitive ${j}: ${attrs} | ${targets}`);
  });
  if (mesh.extras && mesh.extras.targetNames) {
    console.log(`  Target names: ${mesh.extras.targetNames.join(', ')}`);
  }
});

console.log('\n\nSKINS:');
if (json.skins) {
  json.skins.forEach((skin, i) => {
    const jointCount = skin.joints ? skin.joints.length : 0;
    console.log(`[${i}] joints: ${jointCount}, skeleton node: ${skin.skeleton !== undefined ? skin.skeleton : 'none'}`);

    // Show first few bone names
    if (skin.joints && skin.joints.length > 0) {
      const boneNames = skin.joints.slice(0, 5).map(idx => json.nodes[idx].name);
      console.log(`  First bones: ${boneNames.join(', ')}...`);
    }
  });
}

// Check scene structure
console.log('\n\nSCENE:');
console.log('Root nodes:', json.scenes[0] ? json.scenes[0].nodes : []);

// Check for any weird transforms on root nodes
console.log('\n\nROOT NODE TRANSFORMS:');
if (json.scenes[0] && json.scenes[0].nodes) {
  json.scenes[0].nodes.forEach(nodeIdx => {
    const node = json.nodes[nodeIdx];
    console.log(`[${nodeIdx}] ${node.name}:`);
    console.log(`  translation: ${JSON.stringify(node.translation || null)}`);
    console.log(`  rotation: ${JSON.stringify(node.rotation || null)}`);
    console.log(`  scale: ${JSON.stringify(node.scale || null)}`);
  });
}

// Analyze morph targets
console.log('\n\nMORPH TARGET ANALYSIS:');
json.meshes.forEach((mesh, i) => {
  if (mesh.extras && mesh.extras.targetNames) {
    console.log(`Mesh [${i}] "${mesh.name}" has ${mesh.extras.targetNames.length} morph targets:`);
    mesh.extras.targetNames.forEach((name, j) => {
      console.log(`  [${j}] ${name}`);
    });
  }
});
