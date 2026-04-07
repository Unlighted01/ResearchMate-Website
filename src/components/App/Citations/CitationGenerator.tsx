// ============================================
// CitationGenerator.tsx - Citation Generation Tool (Compositor)
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React, { useState, useEffect } from "react";
import { Quote } from "lucide-react";
import { getAllItems, StorageItem } from "../../../services/storageService";
import {
  CitationData,
  EMPTY_CITATION_DATA,
  extractDomain,
} from "./citationUtils";
import AICitationExtractor from "./AICitationExtractor";
import ResearchItemPicker from "./ResearchItemPicker";
import CitationDetailsForm from "./CitationDetailsForm";
import GeneratedCitations from "./GeneratedCitations";

// ============================================
// PART 2: MAIN COMPONENT
// ============================================

const CitationGenerator: React.FC = () => {
  // ---------- PART 2A: STATE ----------
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null);
  const [citationData, setCitationData] =
    useState<CitationData>(EMPTY_CITATION_DATA);

  // ---------- PART 2B: EFFECTS ----------
  useEffect(() => {
    fetchItems();
  }, []);

  // ---------- PART 2C: HANDLERS ----------
  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await getAllItems();
      setItems(data);
    } catch (error) {
      // silent fail — UI shows empty state
    }
    setLoading(false);
  };

  const handleSelectItem = (item: StorageItem) => {
    setSelectedItem(item);
    setCitationData({
      title: item.sourceTitle || "Untitled",
      author: "",
      publishDate: item.createdAt,
      accessDate: new Date().toISOString(),
      url: item.sourceUrl || "",
      publisher: "",
      websiteName: extractDomain(item.sourceUrl || ""),
    });
  };

  const handleClearSelection = () => {
    setSelectedItem(null);
    setCitationData({ ...EMPTY_CITATION_DATA });
  };

  // ---------- PART 2D: RENDER ----------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Quote className="w-6 h-6 text-primary-600" />
            Citation Generator
          </h1>
          <p className="text-gray-500 mt-1">
            Generate properly formatted citations for your research
          </p>
        </div>
      </div>

      {/* AI Citation Extractor */}
      <AICitationExtractor
        onCitationExtracted={(metadata) => {
          setCitationData({
            title: metadata.title,
            author: metadata.author,
            publishDate: metadata.publishDate || new Date().toISOString(),
            accessDate: metadata.accessDate,
            url: metadata.url,
            publisher: "",
            websiteName: metadata.siteName,
          });
          setSelectedItem(null);
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Research Item Picker */}
        <div className="lg:col-span-1">
          <ResearchItemPicker
            items={items}
            loading={loading}
            searchQuery={searchQuery}
            selectedItem={selectedItem}
            onSearchChange={setSearchQuery}
            onSelectItem={handleSelectItem}
            onClearSelection={handleClearSelection}
          />
        </div>

        {/* Middle: Citation Details Form */}
        <div className="lg:col-span-1">
          <CitationDetailsForm
            citationData={citationData}
            onChange={setCitationData}
          />
        </div>

        {/* Right: Generated Citations */}
        <div className="lg:col-span-1">
          <GeneratedCitations citationData={citationData} />
        </div>
      </div>
    </div>
  );
};

export default CitationGenerator;
