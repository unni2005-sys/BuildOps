import React, { useEffect, useRef } from 'react';

/**
 * Lightweight 60fps atmospheric canvas rendering slow-drifting Doomsday ash
 * and subtle emerald embers in 3D depth parallax, paired with a cinema film grain overlay.
 */
export const DoomsdayAtmosphere = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    let animId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const onMouseMove = (e) => {
      mouse.tx = (e.clientX / width - 0.5) * 2;
      mouse.ty = (e.clientY / height - 0.5) * 2;
    };

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    // Subtle atmospheric particle count (lightweight on CPU/GPU)
    const count = Math.min(48, Math.max(24, Math.floor(width / 32)));
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: 0.3 + Math.random() * 0.9, // depth factor for parallax
      size: 0.8 + Math.random() * 1.8,
      vx: (Math.random() - 0.5) * 0.16,
      vy: -(0.12 + Math.random() * 0.28),
      alpha: 0.08 + Math.random() * 0.32,
      isEmber: Math.random() < 0.38,
      phase: Math.random() * Math.PI * 2,
    }));

    const render = (time) => {
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx + Math.sin(time * 0.0005 + p.phase) * 0.08;
        p.y += p.vy * p.z;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const px = p.x - mouse.x * 22 * p.z;
        const py = p.y - mouse.y * 16 * p.z;
        const flicker = 0.72 + 0.28 * Math.sin(time * 0.0018 + p.phase);

        ctx.beginPath();
        ctx.arc(px, py, p.size * p.z, 0, Math.PI * 2);
        if (p.isEmber) {
          ctx.fillStyle = `rgba(16, 185, 129, ${(p.alpha * flicker).toFixed(3)})`;
        } else {
          ctx.fillStyle = `rgba(210, 224, 214, ${(p.alpha * 0.45 * flicker).toFixed(3)})`;
        }
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[1] opacity-80"
      />
      {/* Subtle 35mm film grain texture for tactile cinema depth */}
      <div aria-hidden="true" className="doomsday-grain pointer-events-none fixed inset-0 z-[2]" />
    </>
  );
};
