// ============================================
// LibraryTab.tsx - Library Search Settings Tab
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { LibrarySearch } from "../LibrarySearch";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface LibraryTabProps {
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const LibraryTab: React.FC<LibraryTabProps> = ({ showToast }) => {
  return <LibrarySearch showToast={showToast} />;
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default LibraryTab;
