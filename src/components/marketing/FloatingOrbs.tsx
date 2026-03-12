// ============================================
// FLOATING ORBS BACKGROUND - Apple-style
// Soft, ambient, organic floating color washes
// ============================================

import React, { useState, useEffect, useMemo } from "react";

interface Orb {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  opacity: number;
}

interface FloatingOrbsProps {
  /** Number of orbs (recommend 4-6 for best effect) */
  orbCount?: number;
  /** Enable subtle mouse parallax effect */
  enableParallax?: boolean;
}

const FloatingOrbs: React.FC<FloatingOrbsProps> = ({
  orbCount = 5,
  enableParallax = true,
}) => {
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  // Henning-style editorial glass palette — cyan, violet, indigo atmospheric washes
  const colors = useMemo(
    () => [
      // Cyan — top-left anchor, the primary glow
      "radial-gradient(circle, rgba(34, 211, 238, 0.38) 0%, rgba(34, 211, 238, 0) 70%)",
      // Violet — bottom-right anchor, warm contrast to cyan
      "radial-gradient(circle, rgba(167, 139, 250, 0.32) 0%, rgba(167, 139, 250, 0) 70%)",
      // Indigo — center depth layer
      "radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, rgba(99, 102, 241, 0) 70%)",
      // Soft blue — mid fill
      "radial-gradient(circle, rgba(59, 130, 246, 0.20) 0%, rgba(59, 130, 246, 0) 70%)",
      // Cyan secondary — bottom fade
      "radial-gradient(circle, rgba(34, 211, 238, 0.18) 0%, rgba(34, 211, 238, 0) 70%)",
      // Violet secondary — mid-left soft wash
      "radial-gradient(circle, rgba(167, 139, 250, 0.18) 0%, rgba(167, 139, 250, 0) 70%)",
    ],
    []
  );

  // Strategic orb positions — larger and more atmospheric
  const orbConfigs = useMemo(
    () => [
      { x: 15, y: 20, sizeBase: 700 }, // Top-left (primary cyan anchor)
      { x: 82, y: 78, sizeBase: 650 }, // Bottom-right (violet anchor)
      { x: 50, y: 45, sizeBase: 550 }, // Center (indigo depth layer)
      { x: 80, y: 18, sizeBase: 500 }, // Top-right (blue fill)
      { x: 12, y: 72, sizeBase: 480 }, // Bottom-left (cyan fade)
      { x: 40, y: 60, sizeBase: 420 }, // Mid-center-left (violet wash)
    ],
    []
  );

  // Generate orbs with varied properties — lower opacity for ambient atmospheric feel
  const orbs = useMemo<Orb[]>(() => {
    return Array.from({ length: Math.min(orbCount, 6) }, (_, i) => ({
      id: i,
      x: orbConfigs[i].x + (Math.random() * 8 - 4),
      y: orbConfigs[i].y + (Math.random() * 8 - 4),
      size: orbConfigs[i].sizeBase + Math.random() * 200,
      color: colors[i % colors.length],
      duration: 30 + Math.random() * 20, // 30-50s (very slow drift)
      delay: i * -6, // Stagger start times
      opacity: 0.55 + Math.random() * 0.2, // Lower opacity — ambient, not spotlight
    }));
  }, [orbCount, colors, orbConfigs]);

  // Mouse tracking for parallax (throttled for performance)
  useEffect(() => {
    if (!enableParallax) return;

    let rafId: number;
    let lastUpdate = 0;
    const throttleDelay = 60; // Update every 60ms (~16 fps)

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();

      // Cancel any pending animation frame
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      // Throttle updates to reduce re-renders
      if (now - lastUpdate >= throttleDelay) {
        lastUpdate = now;
        rafId = requestAnimationFrame(() => {
          setMousePosition({
            x: (e.clientX / window.innerWidth) * 100,
            y: (e.clientY / window.innerHeight) * 100,
          });
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [enableParallax]);

  // Calculate parallax offset (deeper orbs move more)
  const getParallaxOffset = (orbIndex: number) => {
    if (!enableParallax) return { x: 0, y: 0 };
    const sensitivity = 0.15 + orbIndex * 0.05;
    return {
      x: (mousePosition.x - 50) * sensitivity,
      y: (mousePosition.y - 50) * sensitivity,
    };
  };

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Subtle top gradient wash — cyan tint matching glass theme */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(34, 211, 238, 0.03) 0%, transparent 50%)",
        }}
      />

      {/* Floating orbs */}
      {orbs.map((orb, index) => {
        const parallax = getParallaxOffset(index);
        const animationName = `orb-float-${index % 3}`;

        return (
          <div
            key={orb.id}
            className="absolute rounded-full transition-transform duration-1000 ease-out"
            style={{
              left: `calc(${orb.x}% + ${parallax.x}px)`,
              top: `calc(${orb.y}% + ${parallax.y}px)`,
              width: `${orb.size}px`,
              height: `${orb.size}px`,
              background: orb.color,
              opacity: orb.opacity,
              filter: `blur(${orb.size * 0.12}px)`,
              transform: "translate(-50%, -50%)",
              animation: `${animationName} ${orb.duration}s ease-in-out infinite`,
              animationDelay: `${orb.delay}s`,
              willChange: "transform, opacity",
            }}
          />
        );
      })}
    </div>
  );
};

export default FloatingOrbs;
