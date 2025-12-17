import React, { useState } from 'react';
import { X, Filter, Calendar, Tag, Laptop, Sparkles } from 'lucide-react';

export interface SearchFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  deviceSource?: string[];
  hasAiSummary?: boolean;
  tags?: string[];
}

interface AdvancedSearchFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: SearchFilters) => void;
  availableTags?: string[];
}

const AdvancedSearchFilter: React.FC<AdvancedSearchFilterProps> = ({
  isOpen,
  onClose,
  onApply,
  availableTags = [],
}) => {
  const [filters, setFilters] = useState<SearchFilters>({});

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters({});
  };

  const toggleDeviceSource = (source: string) => {
    const current = filters.deviceSource || [];
    if (current.includes(source)) {
      setFilters({
        ...filters,
        deviceSource: current.filter((s) => s !== source),
      });
    } else {
      setFilters({
        ...filters,
        deviceSource: [...current, source],
      });
    }
  };

  const toggleTag = (tag: string) => {
    const current = filters.tags || [];
    if (current.includes(tag)) {
      setFilters({
        ...filters,
        tags: current.filter((t) => t !== tag),
      });
    } else {
      setFilters({
        ...filters,
        tags: [...current, tag],
      });
    }
  };

  if (!isOpen) return null;

  const deviceSources = [
    { id: 'extension', label: 'Browser Extension', icon: Laptop },
    { id: 'mobile', label: 'Mobile', icon: Laptop },
    { id: 'smart_pen', label: 'Smart Pen', icon: Laptop },
    { id: 'web', label: 'Web', icon: Laptop },
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-[#1C1C1E] border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <Filter className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2
              id="filter-modal-title"
              className="text-xl font-bold text-gray-900 dark:text-white"
            >
              Advanced Filters
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Date Range */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              <Calendar className="w-4 h-4" />
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      dateRange: {
                        start: e.target.value,
                        end: filters.dateRange?.end || '',
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      dateRange: {
                        start: filters.dateRange?.start || '',
                        end: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>
            </div>
          </div>

          {/* Device Source */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              <Laptop className="w-4 h-4" />
              Device Source
            </label>
            <div className="grid grid-cols-2 gap-2">
              {deviceSources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => toggleDeviceSource(source.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    filters.deviceSource?.includes(source.id)
                      ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  aria-pressed={filters.deviceSource?.includes(source.id)}
                >
                  <source.icon className="w-4 h-4" />
                  <span className="text-sm">{source.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* AI Summary */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              <Sparkles className="w-4 h-4" />
              AI Summary
            </label>
            <button
              onClick={() =>
                setFilters({
                  ...filters,
                  hasAiSummary:
                    filters.hasAiSummary === undefined ? true : !filters.hasAiSummary,
                })
              }
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                filters.hasAiSummary
                  ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              aria-pressed={filters.hasAiSummary}
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm">Only items with AI summary</span>
            </button>
          </div>

          {/* Tags */}
          {availableTags.length > 0 && (
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                <Tag className="w-4 h-4" />
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTags.slice(0, 20).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      filters.tags?.includes(tag)
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                    aria-pressed={filters.tags?.includes(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-[#1C1C1E] border-t border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Reset Filters
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearchFilter;
