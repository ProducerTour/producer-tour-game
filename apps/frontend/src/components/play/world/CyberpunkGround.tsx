import { useMemo } from 'react';
import { Grid } from '@react-three/drei';
import * as THREE from 'three';

// Generate procedural concrete texture
function createConcreteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base concrete color - dark asphalt
  ctx.fillStyle = '#1a1a22';
  ctx.fillRect(0, 0, 512, 512);

  // Add noise for texture variation
  const imageData = ctx.getImageData(0, 0, 512, 512);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 20;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }

  ctx.putImageData(imageData, 0, 0);

  // Add some cracks and lines
  ctx.strokeStyle = 'rgba(30, 30, 40, 0.3)';
  ctx.lineWidth = 1;

  for (let i = 0; i < 15; i++) {
    ctx.beginPath();
    const startX = Math.random() * 512;
    const startY = Math.random() * 512;
    ctx.moveTo(startX, startY);

    let x = startX;
    let y = startY;
    for (let j = 0; j < 8; j++) {
      x += (Math.random() - 0.5) * 60;
      y += (Math.random() - 0.5) * 60;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Subtle concrete slabs (expansion joints)
  ctx.strokeStyle = 'rgba(40, 40, 50, 0.5)';
  ctx.lineWidth = 2;

  for (let y = 128; y < 512; y += 128) {
    ctx.beginPath();
    ctx.moveTo(0, y + (Math.random() - 0.5) * 4);
    ctx.lineTo(512, y + (Math.random() - 0.5) * 4);
    ctx.stroke();
  }

  for (let x = 128; x < 512; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x + (Math.random() - 0.5) * 4, 0);
    ctx.lineTo(x + (Math.random() - 0.5) * 4, 512);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export interface CyberpunkGroundProps {
  size?: number;
}

// Cyberpunk ground - concrete street with grid overlay
export function CyberpunkGround({ size = 500 }: CyberpunkGroundProps) {
  const concreteTexture = useMemo(() => {
    const texture = createConcreteTexture();
    texture.repeat.set(size / 4, size / 4);
    return texture;
  }, [size]);

  return (
    <>
      {/* Concrete street surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial
          map={concreteTexture}
          metalness={0.1}
          roughness={0.9}
        />
      </mesh>

      {/* Grid overlay - neon lines on the concrete */}
      <Grid
        position={[0, 0.008, 0]}
        args={[200, 200]}
        cellSize={2}
        cellThickness={0.4}
        cellColor="#1a1a2e"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#8b5cf6"
        fadeDistance={60}
        fadeStrength={1.5}
        infiniteGrid
      />
    </>
  );
}
