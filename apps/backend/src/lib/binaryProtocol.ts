/**
 * Binary Protocol Utilities (Backend)
 *
 * Compatible with @producer-tour/engine binary protocol.
 * Used for efficient network packets in multiplayer.
 *
 * Movement packet layout (24 bytes):
 * [0-3]   posX (Float32)
 * [4-7]   posY (Float32)
 * [8-11]  posZ (Float32)
 * [12-15] rotY (Float32)
 * [16-19] velX (Float32)
 * [20-23] velZ (Float32)
 *
 * Movement with animation (28 bytes):
 * [0-23]  Movement data
 * [24]    animClip (Uint8)
 * [25-27] padding
 */

// Pre-allocated buffer for encoding
const encodeBuffer = new ArrayBuffer(64);
const encodeView = new DataView(encodeBuffer);

// Reusable decode result (avoid allocations)
const decodeResult = {
  posX: 0,
  posY: 0,
  posZ: 0,
  rotY: 0,
  velX: 0,
  velZ: 0,
  animClip: 0,
};

/**
 * Encode movement data to binary (24 bytes).
 */
export function encodeMovement(
  posX: number,
  posY: number,
  posZ: number,
  rotY: number,
  velX: number,
  velZ: number
): Buffer {
  encodeView.setFloat32(0, posX, true);
  encodeView.setFloat32(4, posY, true);
  encodeView.setFloat32(8, posZ, true);
  encodeView.setFloat32(12, rotY, true);
  encodeView.setFloat32(16, velX, true);
  encodeView.setFloat32(20, velZ, true);

  return Buffer.from(encodeBuffer.slice(0, 24));
}

/**
 * Encode movement with animation (28 bytes).
 */
export function encodeMovementWithAnim(
  posX: number,
  posY: number,
  posZ: number,
  rotY: number,
  velX: number,
  velZ: number,
  animClip: number
): Buffer {
  encodeView.setFloat32(0, posX, true);
  encodeView.setFloat32(4, posY, true);
  encodeView.setFloat32(8, posZ, true);
  encodeView.setFloat32(12, rotY, true);
  encodeView.setFloat32(16, velX, true);
  encodeView.setFloat32(20, velZ, true);
  encodeView.setUint8(24, animClip);

  return Buffer.from(encodeBuffer.slice(0, 28));
}

/**
 * Decode movement data from binary.
 * Returns reused object - do not store reference.
 */
export function decodeMovement(buffer: Buffer | ArrayBuffer): typeof decodeResult {
  let view: DataView;
  if (Buffer.isBuffer(buffer)) {
    // Create DataView from Buffer's underlying ArrayBuffer
    view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  } else {
    view = new DataView(buffer);
  }

  decodeResult.posX = view.getFloat32(0, true);
  decodeResult.posY = view.getFloat32(4, true);
  decodeResult.posZ = view.getFloat32(8, true);
  decodeResult.rotY = view.getFloat32(12, true);
  decodeResult.velX = view.getFloat32(16, true);
  decodeResult.velZ = view.getFloat32(20, true);

  return decodeResult;
}

/**
 * Decode movement with animation.
 */
export function decodeMovementWithAnim(buffer: Buffer | ArrayBuffer): typeof decodeResult {
  let view: DataView;
  if (Buffer.isBuffer(buffer)) {
    view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  } else {
    view = new DataView(buffer);
  }

  decodeResult.posX = view.getFloat32(0, true);
  decodeResult.posY = view.getFloat32(4, true);
  decodeResult.posZ = view.getFloat32(8, true);
  decodeResult.rotY = view.getFloat32(12, true);
  decodeResult.velX = view.getFloat32(16, true);
  decodeResult.velZ = view.getFloat32(20, true);
  decodeResult.animClip = view.getUint8(24);

  return decodeResult;
}

/**
 * Encode broadcast packet with player ID prefix.
 * Layout:
 * [0-35]  playerId (36 chars as ASCII)
 * [36-59] movement data (24 bytes)
 * Total: 60 bytes
 */
export function encodeBroadcastMovement(
  playerId: string,
  posX: number,
  posY: number,
  posZ: number,
  rotY: number,
  velX: number,
  velZ: number
): Buffer {
  const buffer = Buffer.alloc(60);

  // Write player ID (36 chars for UUID, padded with zeros)
  buffer.write(playerId.slice(0, 36), 0, 'ascii');

  // Write movement data
  buffer.writeFloatLE(posX, 36);
  buffer.writeFloatLE(posY, 40);
  buffer.writeFloatLE(posZ, 44);
  buffer.writeFloatLE(rotY, 48);
  buffer.writeFloatLE(velX, 52);
  buffer.writeFloatLE(velZ, 56);

  return buffer;
}

/**
 * Decode broadcast packet.
 */
export function decodeBroadcastMovement(buffer: Buffer): {
  playerId: string;
  posX: number;
  posY: number;
  posZ: number;
  rotY: number;
  velX: number;
  velZ: number;
} {
  return {
    playerId: buffer.toString('ascii', 0, 36).replace(/\0+$/, ''),
    posX: buffer.readFloatLE(36),
    posY: buffer.readFloatLE(40),
    posZ: buffer.readFloatLE(44),
    rotY: buffer.readFloatLE(48),
    velX: buffer.readFloatLE(52),
    velZ: buffer.readFloatLE(56),
  };
}
