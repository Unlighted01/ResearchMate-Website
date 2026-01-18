import React, { useEffect, useRef, useState } from "react";

interface AnimateOnScrollProps {
  children: React.ReactNode;
  animation?: "fade-up" | "fade-in" | "scale-in" | "slide-in-right";
  duration?: number;
  delay?: number;
  className?: string;
  threshold?: number;
}

export const AnimateOnScroll: React.FC<AnimateOnScrollProps> = ({
  children,
  animation = "fade-up",
  duration = 700,
  delay = 0,
  className = "",
  threshold = 0.1,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold }
    );

    const currentRef = domRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold]);

  const getAnimationClass = () => {
    switch (animation) {
      case "fade-up":
        return "animate-fade-up";
      case "fade-in":
        return "animate-fade-in";
      case "scale-in":
        return "animate-scale-in";
      // Add more as needed, assuming these classes exist in index.css
      default:
        return "animate-fade-up";
    }
  };

  return (
    <div
      ref={domRef}
      className={`${className} ${
        isVisible ? getAnimationClass() : "opacity-0"
      }`}
      style={{
        animationDuration: `${duration}ms`,
        animationDelay: `${delay}ms`,
        animationFillMode: "both",
      }}
    >
      {children}
    </div>
  );
};
