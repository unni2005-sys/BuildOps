import React, { useRef, useEffect } from 'react';

/**
 * Silky 60fps physics-lerped 3D tilt container with cursor-tracking
 * metallic emerald specular light sheen. Automatically passive on touch devices.
 */
export const Tilt3D = ({
  children,
  className = '',
  maxTilt = 8,
  perspective = 1100,
  glare = true,
}) => {
  const containerRef = useRef(null);
  const glareRef = useRef(null);
  const stateRef = useRef({
    rx: 0,
    ry: 0,
    trx: 0,
    try: 0,
    gx: 50,
    gy: 50,
    hovering: false,
    rafId: null,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isCoarse || reduced) return;

    const s = stateRef.current;

    const animate = () => {
      s.rx += (s.trx - s.rx) * 0.1;
      s.ry += (s.try - s.ry) * 0.1;

      el.style.transform = `perspective(${perspective}px) rotateX(${s.rx.toFixed(3)}deg) rotateY(${s.ry.toFixed(3)}deg) translateZ(0)`;

      if (glare && glareRef.current) {
        glareRef.current.style.opacity = s.hovering ? '1' : '0';
        glareRef.current.style.background = `radial-gradient(420px circle at ${s.gx}% ${s.gy}%, rgba(16, 185, 129, 0.13), transparent 65%)`;
      }

      const settled =
        !s.hovering && Math.abs(s.rx) < 0.02 && Math.abs(s.ry) < 0.02;

      if (!settled) {
        s.rafId = requestAnimationFrame(animate);
      } else {
        el.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) translateZ(0)`;
        s.rafId = null;
      }
    };

    const startLoop = () => {
      if (!s.rafId) {
        s.rafId = requestAnimationFrame(animate);
      }
    };

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      s.trx = (0.5 - py) * maxTilt * 2;
      s.try = (px - 0.5) * maxTilt * 2;
      s.gx = Math.round(px * 100);
      s.gy = Math.round(py * 100);
      s.hovering = true;
      startLoop();
    };

    const onLeave = () => {
      s.trx = 0;
      s.try = 0;
      s.hovering = false;
      startLoop();
    };

    el.addEventListener('mousemove', onMove, { passive: true });
    el.addEventListener('mouseleave', onLeave, { passive: true });

    return () => {
      if (s.rafId) cancelAnimationFrame(s.rafId);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [maxTilt, perspective, glare]);

  return (
    <div
      ref={containerRef}
      className={`relative will-change-transform [transform-style:preserve-3d] ${className}`}
    >
      {glare && (
        <div
          ref={glareRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-300"
        />
      )}
      {children}
    </div>
  );
};
