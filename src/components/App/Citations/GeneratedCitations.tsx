// ============================================
// GeneratedCitations.tsx - Citation Output Panel
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React, { useState } from "react";
import { Button, Card } from "../../shared/ui";
import { Copy, Quote, CheckCircle2, AtSign } from "lucide-react";
import {
  CitationData,
  CitationFormat,
  CITATION_FORMATS,
  generateCitation,
  generateInTextCitation,
} from "./citationUtils";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface GeneratedCitationsProps {
  citationData: CitationData;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const GeneratedCitations: React.FC<GeneratedCitationsProps> = ({
  citationData,
}) => {
  const [copiedFormat, setCopiedFormat] = useState<CitationFormat | null>(null);
  const [copiedInText, setCopiedInText] = useState<CitationFormat | null>(null);

  const handleCopy = async (format: CitationFormat) => {
    const citation = generateCitation(citationData, format);
    await navigator.clipboard.writeText(citation);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handleCopyInText = async (format: CitationFormat) => {
    const inText = generateInTextCitation(citationData, format);
    await navigator.clipboard.writeText(inText);
    setCopiedInText(format);
    setTimeout(() => setCopiedInText(null), 2000);
  };

  const handleCopyAll = async () => {
    const allCitations = CITATION_FORMATS.map(
      (f) => `${f.name}:\n${generateCitation(citationData, f.id)}`
    ).join("\n\n");
    await navigator.clipboard.writeText(allCitations);
    setCopiedFormat("apa");
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Quote className="w-4 h-4" />
        Generated Citations
      </h3>

      <div className="space-y-3">
        {CITATION_FORMATS.map((format) => (
          <div
            key={format.id}
            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs font-bold text-primary-600">
                  {format.name}
                </span>
                <p className="text-xs text-gray-400">{format.description}</p>
              </div>
              <button
                onClick={() => handleCopy(format.id)}
                className={`p-1.5 rounded-lg transition-all ${
                  copiedFormat === format.id
                    ? "bg-green-100 text-green-600"
                    : "text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                title={`Copy ${format.name} citation`}
                aria-label={`Copy ${format.name} citation`}
              >
                {copiedFormat === format.id ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <p
              className={`text-xs text-gray-600 dark:text-gray-400 break-all ${
                format.id === "bibtex" ? "font-mono whitespace-pre-wrap" : ""
              }`}
            >
              {generateCitation(citationData, format.id) ||
                "Fill in the details to generate citation"}
            </p>
            {/* In-text citation row */}
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <AtSign className="w-2.5 h-2.5" />
                In-text:
              </span>
              <code className="text-[10px] text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded">
                {generateInTextCitation(citationData, format.id)}
              </code>
              <button
                onClick={() => handleCopyInText(format.id)}
                className={`ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-all ${
                  copiedInText === format.id
                    ? "bg-green-100 text-green-600"
                    : "text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                }`}
                title="Copy in-text citation"
              >
                {copiedInText === format.id ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedInText === format.id ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Copy All Button */}
      <Button variant="outline" className="w-full mt-4" onClick={handleCopyAll}>
        <Copy className="w-4 h-4 mr-2" />
        Copy All Formats
      </Button>
    </Card>
  );
};

export default GeneratedCitations;
