// ============================================
// DASHBOARD UTILS - Shared helpers
// ============================================

import React from "react";
import { Laptop, Smartphone, PenTool, Globe, Layout } from "lucide-react";

export const getSourceIcon = (source: string): React.ReactNode => {
  const icons: Record<string, React.ReactNode> = {
    extension: <Laptop className="w-4 h-4" />,
    mobile: <Smartphone className="w-4 h-4" />,
    smart_pen: <PenTool className="w-4 h-4" />,
    web: <Globe className="w-4 h-4" />,
  };
  return icons[source] || <Layout className="w-4 h-4" />;
};

export const getSourceColor = (source: string): string => {
  const colors: Record<string, string> = {
    extension: "#007AFF",
    mobile: "#5856D6",
    smart_pen: "#FF9500",
    web: "#34C759",
  };
  return colors[source] || "#8E8E93";
};

export const stripMarkdown = (text: string) =>
  text
    .replace(/^#{1,6} /gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\|.*\|/g, "")
    .replace(/^[-*+] /gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-]{3,}\s*$/gm, "")
    .trim();

export const isMarkdown = (text: string) =>
  /^#{1,3} |\n#{1,3} |\|.+\|/.test(text);
