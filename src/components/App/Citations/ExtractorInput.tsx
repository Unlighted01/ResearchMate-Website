// ============================================
// ExtractorInput.tsx - Citation Extractor Input Controls
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { Button } from "../../shared/ui";
import {
  Sparkles,
  Link as LinkIcon,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { DetectedType, ExtractedMetadata, getTypeBadge } from "./extractorUtils";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface ExtractorInputProps {
  input: string;
  loading: boolean;
  useAI: boolean;
  error: string | null;
  liveDetection: DetectedType | null;
  metadata: ExtractedMetadata | null;
  onInputChange: (value: string) => void;
  onToggleAI: (value: boolean) => void;
  onExtract: () => void;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const ExtractorInput: React.FC<ExtractorInputProps> = ({
  input,
  loading,
  useAI,
  error,
  liveDetection,
  metadata,
  onInputChange,
  onToggleAI,
  onExtract,
}) => {
  const badge = liveDetection && !metadata ? getTypeBadge(liveDetection) : null;

  return (
    <div className="space-y-4">
      {/* Input Row */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="https://... or 10.1000/xyz or 978-0-123456-78-9"
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            onKeyDown={(e) => e.key === "Enter" && onExtract()}
          />
        </div>
        <Button onClick={onExtract} disabled={loading || !input.trim()}>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Extract
            </>
          )}
        </Button>
      </div>

      {/* Live Detection Badge */}
      {badge && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Detected:</span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}
          >
            {badge.icon}
            {badge.label}
          </span>
        </div>
      )}

      {/* AI Toggle - only show for URL-like input */}
      {(!liveDetection ||
        liveDetection === "url" ||
        liveDetection === "unknown") &&
        !metadata && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useAI}
              onChange={(e) => onToggleAI(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Use AI to enhance extraction (better author/date detection)
            </span>
          </label>
        )}

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p>{error}</p>
            <p className="mt-1 text-xs opacity-75">
              Tip: For academic papers, try entering just the DOI (e.g.,
              10.1038/nature12373)
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtractorInput;
