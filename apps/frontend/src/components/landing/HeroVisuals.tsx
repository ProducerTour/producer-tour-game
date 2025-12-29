import { useEffect, useRef } from 'react';

/**
 * Floating Particles - Simple drifting particles
 */
export function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width: number = canvas.offsetWidth || 800;
    let height: number = canvas.offsetHeight || 600;

    const resize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * 2;
      canvas.height = height * 2;
      ctx.scale(2, 2);
    };
    resize();
    window.addEventListener('resize', resize);

    // Create particles
    const particles: { x: number; y: number; size: number; speedX: number; speedY: number; opacity: number }[] = [];
    const numParticles = 50;

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3 - 0.2, // Slight upward drift
        opacity: Math.random() * 0.4 + 0.1,
      });
    }

    let animationFrame: number;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        // Update position
        p.x += p.speedX;
        p.y += p.speedY;

        // Wrap around edges
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Draw particle with glow
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        gradient.addColorStop(0, `rgba(59, 130, 246, ${p.opacity})`);
        gradient.addColorStop(0.5, `rgba(34, 197, 94, ${p.opacity * 0.5})`);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-70"
      />
    </div>
  );
}

// Keep for backwards compatibility
export function WireframeGraph() {
  return null;
}

// Keep these for backwards compatibility
export function RisingIcons() {
  return null;
}

export function MiniGrowthChart() {
  return null;
}

export function FloatingStat() {
  return null;
}

/**
 * Ambient Glow - Subtle background glow
 */
export function AmbientGlow() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Top center glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[600px] h-[400px] bg-brand-blue/10 rounded-full blur-[100px]" />
      {/* Subtle side accents */}
      <div className="absolute top-1/3 right-0 w-[300px] h-[300px] bg-green-500/5 rounded-full blur-[80px]" />
      <div className="absolute bottom-1/4 left-0 w-[250px] h-[250px] bg-brand-blue/5 rounded-full blur-[60px]" />
    </div>
  );
}

// Keep these exports for backwards compatibility but empty
export function FloatingGrid() {
  return null;
}

export function AnimatedOrbs() {
  return null;
}

export function FloatingCards() {
  return null;
}

export function ParticleField() {
  return null;
}
