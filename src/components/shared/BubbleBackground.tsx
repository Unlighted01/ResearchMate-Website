// ============================================
// INTERACTIVE BUBBLE BACKGROUND COMPONENT
// Smooth, organic floating bubbles
// ============================================

import React, { useState, useEffect, useCallback } from "react";

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  popping: boolean;
}

interface BubbleBackgroundProps {
  bubbleCount?: number;
}

const BubbleBackground: React.FC<BubbleBackgroundProps> = ({
  bubbleCount = 15,
}) => {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  // Track active timeouts for cleanup
  const timeoutsRef = React.useRef<Set<NodeJS.Timeout>>(new Set());

  // Generate a random bubble
  const createBubble = useCallback((id: number): Bubble => {
    return {
      id,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 80 + 40, // 40-120px
      duration: Math.random() * 15 + 20, // 20-35s (slower = smoother)
      delay: Math.random() * -20, // Negative delay so they start at different points
      popping: false,
    };
  }, []);

  // Initialize bubbles
  useEffect(() => {
    const initialBubbles = Array.from({ length: bubbleCount }, (_, i) =>
      createBubble(i)
    );
    setBubbles(initialBubbles);
  }, [bubbleCount, createBubble]);

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, []);

  // Handle bubble pop
  const handleBubblePop = (bubbleId: number) => {
    // Set popping state
    setBubbles((prev) =>
      prev.map((b) => (b.id === bubbleId ? { ...b, popping: true } : b))
    );

    // Respawn after pop animation completes
    const timeoutId = setTimeout(() => {
      setBubbles((prev) =>
        prev.map((b) =>
          b.id === bubbleId
            ? {
                ...createBubble(b.id),
                id: Date.now() + Math.random(), // New unique ID
              }
            : b
        )
      );
      // Remove timeout from tracking set after it executes
      timeoutsRef.current.delete(timeoutId);
    }, 500);

    // Track timeout for cleanup
    timeoutsRef.current.add(timeoutId);
  };

  return (
    <div className="bubble-container">
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className={`bubble ${bubble.popping ? "bubble-pop" : ""}`}
          onClick={() => !bubble.popping && handleBubblePop(bubble.id)}
          style={
            {
              left: `${bubble.x}%`,
              top: `${bubble.y}%`,
              width: `${bubble.size}px`,
              height: `${bubble.size}px`,
              // Use CSS custom properties for animation timing
              "--bubble-duration": `${bubble.duration}s`,
              "--bubble-delay": `${bubble.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};

export default BubbleBackground;
