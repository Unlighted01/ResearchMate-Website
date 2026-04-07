// ============================================
// sources.tsx - Source icon helpers
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { Laptop, Smartphone, PenTool, Globe, Layout } from "lucide-react";

// ============================================
// PART 2: SOURCE ICON HELPER
// ============================================

export const getSourceIcon = (source: string): React.ReactNode => {
  const icons: Record<string, React.ReactNode> = {
    extension: <Laptop className="w-4 h-4" />,
    mobile: <Smartphone className="w-4 h-4" />,
    smart_pen: <PenTool className="w-4 h-4" />,
    web: <Globe className="w-4 h-4" />,
  };
  return icons[source] || <Layout className="w-4 h-4" />;
};
