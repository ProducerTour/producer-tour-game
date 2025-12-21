const fs = require("fs");
const path = "./apps/frontend/public/models/Bandit/bandit.glb";
const buffer = fs.readFileSync(path);

// Parse JSON chunk
const jsonChunkLength = buffer.readUInt32LE(12);
const jsonStr = buffer.slice(20, 20 + jsonChunkLength).toString("utf8");
const gltf = JSON.parse(jsonStr);

console.log("=== MATERIALS ===");
gltf.materials?.forEach((mat, i) => {
  console.log(`\nMaterial ${i}: ${mat.name}`);
  if (mat.pbrMetallicRoughness) {
    const pbr = mat.pbrMetallicRoughness;
    console.log("  baseColorTexture:", pbr.baseColorTexture ? "YES (index: " + pbr.baseColorTexture.index + ")" : "NO");
    console.log("  baseColorFactor:", pbr.baseColorFactor);
  }
});

console.log("\n=== IMAGES ===");
console.log("Total images:", gltf.images?.length || 0);
gltf.images?.forEach((img, i) => {
  if (img.uri) {
    console.log(`Image ${i}: EXTERNAL URI = ${img.uri.substring(0, 60)}`);
  } else if (img.bufferView !== undefined) {
    console.log(`Image ${i}: EMBEDDED (bufferView ${img.bufferView}, mimeType: ${img.mimeType})`);
  }
});

console.log("\n=== MESH VERTEX COUNTS ===");
let totalVerts = 0;
gltf.meshes?.forEach((mesh, i) => {
  mesh.primitives?.forEach((prim, j) => {
    const posAccessor = gltf.accessors[prim.attributes.POSITION];
    const count = posAccessor?.count || 0;
    totalVerts += count;
    console.log(`Mesh ${i} primitive ${j}: ${count} vertices`);
  });
});
console.log(`\nTOTAL VERTICES: ${totalVerts}`);
