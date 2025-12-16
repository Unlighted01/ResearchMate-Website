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

  // Apple-inspired color palette - soft radial gradients that fade to transparent
  const colors = useMemo(
    () => [
      "radial-gradient(circle, rgba(0, 122, 255, 0.4) 0%, rgba(0, 122, 255, 0) 70%)",
      "radial-gradient(circle, rgba(88, 86, 214, 0.35) 0%, rgba(88, 86, 214, 0) 70%)",
      "radial-gradient(circle, rgba(175, 82, 222, 0.3) 0%, rgba(175, 82, 222, 0) 70%)",
      "radial-gradient(circle, rgba(52, 199, 89, 0.25) 0%, rgba(52, 199, 89, 0) 70%)",
      "radial-gradient(circle, rgba(255, 149, 0, 0.25) 0%, rgba(255, 149, 0, 0) 70%)",
      "radial-gradient(circle, rgba(90, 200, 250, 0.3) 0%, rgba(90, 200, 250, 0) 70%)",
    ],
    []
  );

  // Strategic orb positions for visual balance
  const orbConfigs = useMemo(
    () => [
      { x: 20, y: 25, sizeBase: 500 }, // Top-left
      { x: 75, y: 15, sizeBase: 450 }, // Top-right
      { x: 10, y: 60, sizeBase: 400 }, // Mid-left
      { x: 85, y: 55, sizeBase: 550 }, // Mid-right
      { x: 50, y: 80, sizeBase: 480 }, // Bottom-center
      { x: 35, y: 45, sizeBase: 350 }, // Center-left
    ],
    []
  );

  // Generate orbs with varied properties
  const orbs = useMemo<Orb[]>(() => {
    return Array.from({ length: Math.min(orbCount, 6) }, (_, i) => ({
      id: i,
      x: orbConfigs[i].x + (Math.random() * 10 - 5),
      y: orbConfigs[i].y + (Math.random() * 10 - 5),
      size: orbConfigs[i].sizeBase + Math.random() * 150,
      color: colors[i % colors.length],
      duration: 25 + Math.random() * 15, // 25-40s (very slow)
      delay: i * -5, // Stagger start times
      opacity: 0.7 + Math.random() * 0.3,
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
      {/* Subtle top gradient wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0, 122, 255, 0.03) 0%, transparent 50%)",
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
