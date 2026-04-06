// ============================================
// ResearchItemPicker.tsx - Research Item Selection Panel
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { Button, Card } from "../../shared/ui";
import { FileText, Search, RefreshCw } from "lucide-react";
import { StorageItem } from "../../../services/storageService";
import { CitationData, EMPTY_CITATION_DATA, extractDomain } from "./citationUtils";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface ResearchItemPickerProps {
  items: StorageItem[];
  loading: boolean;
  searchQuery: string;
  selectedItem: StorageItem | null;
  onSearchChange: (query: string) => void;
  onSelectItem: (item: StorageItem) => void;
  onClearSelection: () => void;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const ResearchItemPicker: React.FC<ResearchItemPickerProps> = ({
  items,
  loading,
  searchQuery,
  selectedItem,
  onSearchChange,
  onSelectItem,
  onClearSelection,
}) => {
  const filteredItems = items.filter(
    (item) =>
      item.sourceTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.text?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectItem = (item: StorageItem) => {
    onSelectItem(item);
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Select Research Item
      </h3>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search your research..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
        />
      </div>

      {/* Items List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-4 text-gray-500">Loading...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No items found</div>
        ) : (
          filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelectItem(item)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selectedItem?.id === item.id
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <h4 className="font-medium text-sm line-clamp-1">
                {item.sourceTitle || "Untitled"}
              </h4>
              <p className="text-xs text-gray-500 truncate mt-1">
                {item.sourceUrl || "No URL"}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Or enter manually */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onClearSelection}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Enter Manually
        </Button>
      </div>
    </Card>
  );
};

export default ResearchItemPicker;
