// ============================================
// CURSOR BUBBLE — Bubble Theme Only
// Large, lagged orb that follows the cursor.
// Uses lerp (linear interpolation) via rAF for
// the fluid, liquid feel — no libraries needed.
// ============================================

import { useEffect, useRef } from "react";

const LERP_FACTOR = 0.1; // Lower = more lag (0.05 = very slow, 0.2 = snappy)

const CursorBubble: React.FC = () => {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  // Target position (actual mouse)
  const target = useRef({ x: -9999, y: -9999 });
  // Current rendered position (lerped)
  const current = useRef({ x: -9999, y: -9999 });
  const rafId = useRef<number>(0);
  const hasEntered = useRef(false);

  useEffect(() => {
    const bubble = bubbleRef.current;
    const dot = dotRef.current;
    if (!bubble) return;

    // Track mouse position
    const onMouseMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
      // Dot tracks instantly — precise click indicator
      if (dot) {
        dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      }
      if (!hasEntered.current) {
        // Snap to position on first entry so it doesn't slide in from the corner
        current.current = { x: e.clientX, y: e.clientY };
        hasEntered.current = true;
        bubble.style.opacity = "1";
        if (dot) dot.style.opacity = "1";
      }
    };

    const onMouseLeave = () => {
      bubble.style.opacity = "0";
      if (dot) dot.style.opacity = "0";
      hasEntered.current = false;
    };

    const onMouseEnter = () => {
      bubble.style.opacity = "1";
      if (dot) dot.style.opacity = "1";
    };

    // Animation loop — lerps bubble toward target each frame
    const animate = () => {
      current.current.x += (target.current.x - current.current.x) * LERP_FACTOR;
      current.current.y += (target.current.y - current.current.y) * LERP_FACTOR;

      if (bubble) {
        bubble.style.transform = `translate(${current.current.x}px, ${current.current.y}px) translate(-50%, -50%)`;
      }

      rafId.current = requestAnimationFrame(animate);
    };

    document.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseenter", onMouseEnter);
    rafId.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <>
      <div
        ref={bubbleRef}
        className="cursor-bubble"
        aria-hidden="true"
      />
      <div
        ref={dotRef}
        className="cursor-dot"
        aria-hidden="true"
      />
    </>
  );
};

export default CursorBubble;
