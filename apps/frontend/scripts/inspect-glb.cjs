const fs = require('fs');

const glbPath = process.argv[2] || 'public/models/Foliage/Trees/oak_trees.glb';
const buffer = fs.readFileSync(glbPath);

// JSON chunk
const jsonChunkLength = buffer.readUInt32LE(12);
const jsonStr = buffer.toString('utf8', 20, 20 + jsonChunkLength);
const json = JSON.parse(jsonStr);

console.log('Materials Detail:');
json.materials?.forEach((mat, i) => {
  console.log('\n' + i + ': ' + mat.name);
  const pbr = mat.pbrMetallicRoughness;
  if (pbr) {
    console.log('  baseColorFactor:', pbr.baseColorFactor);
    console.log('  baseColorTexture:', pbr.baseColorTexture);
    console.log('  metallicFactor:', pbr.metallicFactor);
    console.log('  roughnessFactor:', pbr.roughnessFactor);
  }
  console.log('  alphaMode:', mat.alphaMode);
  console.log('  doubleSided:', mat.doubleSided);
});

console.log('\nTextures:');
json.textures?.forEach((tex, i) => {
  console.log(i + ': source image ' + tex.source + ', sampler ' + tex.sampler);
});

console.log('\nImages:');
json.images?.forEach((img, i) => {
  console.log(i + ': ' + (img.name || img.uri || 'embedded') + ' mimeType: ' + img.mimeType);
});

console.log('\nMesh -> Material mapping:');
json.meshes?.forEach((mesh, i) => {
  mesh.primitives?.forEach((prim, j) => {
    const matIdx = prim.material;
    const matName = matIdx != null ? json.materials[matIdx]?.name : 'none';
    console.log('  Mesh ' + mesh.name + ' prim ' + j + ' -> material: ' + matName + ' (idx ' + matIdx + ')');
  });
});
