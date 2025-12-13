// ============================================
// AI ASSISTANT PAGE - Apple Design
// ============================================

import React, { useState, useEffect } from "react";
import {
  Zap,
  RefreshCw,
  Search,
  CheckCircle2,
  Sparkles,
  Clock,
  ArrowRight,
  Brain,
  Wand2,
} from "lucide-react";
import { Button, Card, Badge, Modal } from "../shared/UIComponents";
import {
  getAllItems,
  updateItem,
  StorageItem,
} from "../../services/storageService";
import { generateSummary } from "../../services/geminiService";

interface AIProps {
  useToast: () => {
    showToast: (msg: string, type: "success" | "error" | "info") => void;
  };
}

const AIAssistant: React.FC<AIProps> = ({ useToast }) => {
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    getAllItems().then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  const itemsWithoutSummary = items.filter(
    (i) =>
      !i.aiSummary &&
      (searchQuery
        ? i.sourceTitle?.toLowerCase().includes(searchQuery.toLowerCase())
        : true)
  );

  const itemsWithSummary = items.filter(
    (i) =>
      i.aiSummary &&
      (searchQuery
        ? i.sourceTitle?.toLowerCase().includes(searchQuery.toLowerCase())
        : true)
  );

  const handleSummarize = async (item: StorageItem) => {
    setSummarizing(item.id);
    try {
      const summary = await generateSummary(item.text || item.ocrText || "");
      if (summary) {
        await updateItem(item.id, { aiSummary: summary });
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, aiSummary: summary } : i))
        );
        showToast("Summary generated!", "success");
      }
    } catch (e) {
      showToast("Failed to summarize", "error");
    }
    setSummarizing(null);
  };

  const handleBatchSummarize = async () => {
    if (itemsWithoutSummary.length === 0) return;
    setBatchProcessing(true);

    for (const item of itemsWithoutSummary.slice(0, 5)) {
      try {
        const summary = await generateSummary(item.text || item.ocrText || "");
        if (summary) {
          await updateItem(item.id, { aiSummary: summary });
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, aiSummary: summary } : i
            )
          );
        }
      } catch (e) {
        console.error("Failed to summarize item:", item.id);
      }
    }

    showToast(
      `Processed ${Math.min(5, itemsWithoutSummary.length)} items!`,
      "success"
    );
    setBatchProcessing(false);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ========== HEADER ========== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            AI Assistant
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Generate AI summaries for your research items
          </p>
        </div>

        {itemsWithoutSummary.length > 0 && (
          <button
            onClick={handleBatchSummarize}
            disabled={batchProcessing}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#007AFF] to-[#5856D6] text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95 disabled:opacity-50"
          >
            {batchProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Summarize All ({Math.min(5, itemsWithoutSummary.length)})
              </>
            )}
          </button>
        )}
      </div>

      {/* ========== STATS ========== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-gray-200/50 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#FF9500]/10 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#FF9500]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {itemsWithoutSummary.length}
              </p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-gray-200/50 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#34C759]/10 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-[#34C759]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {itemsWithSummary.length}
              </p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-gray-200/50 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#007AFF]/10 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-[#007AFF]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {items.length > 0
                  ? Math.round((itemsWithSummary.length / items.length) * 100)
                  : 0}
                %
              </p>
              <p className="text-xs text-gray-500">Coverage</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========== SEARCH ========== */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 transition-all"
        />
      </div>

      {/* ========== CONTENT ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Items */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#FF9500]" />
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Needs Summary ({itemsWithoutSummary.length})
            </h2>
          </div>

          {itemsWithoutSummary.length === 0 ? (
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-8 border border-gray-200/50 dark:border-gray-800 text-center">
              <div className="w-12 h-12 bg-[#34C759]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-[#34C759]" />
              </div>
              <p className="text-gray-500">All caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {itemsWithoutSummary.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-[#1C1C1E] rounded-xl p-4 border border-gray-200/50 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {item.sourceTitle || "Untitled"}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleSummarize(item)}
                      disabled={summarizing === item.id}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#007AFF] hover:bg-[#0066DD] text-white text-xs font-medium rounded-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                      {summarizing === item.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      {summarizing === item.id ? "..." : "Summarize"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Items */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#34C759]" />
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Completed ({itemsWithSummary.length})
            </h2>
          </div>

          {itemsWithSummary.length === 0 ? (
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-8 border border-gray-200/50 dark:border-gray-800 text-center">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500">No summaries yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {itemsWithSummary.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="bg-white dark:bg-[#1C1C1E] rounded-xl p-4 border border-gray-200/50 dark:border-gray-800 hover:border-[#34C759]/50 cursor-pointer transition-all group"
                >
                  <h4 className="font-medium text-gray-900 dark:text-white truncate mb-2">
                    {item.sourceTitle || "Untitled"}
                  </h4>
                  <p className="text-sm text-[#34C759] line-clamp-2 italic">
                    "{item.aiSummary}"
                  </p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-[#007AFF] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      View <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========== DETAIL MODAL ========== */}
      <Modal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title="AI Summary"
      >
        {selectedItem && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-[#007AFF]/10 via-[#5856D6]/10 to-[#AF52DE]/10 rounded-xl p-5 border border-[#007AFF]/20">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-[#007AFF]" />
                <span className="font-semibold text-gray-900 dark:text-white">
                  AI Generated Summary
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {selectedItem.aiSummary}
              </p>
            </div>

            <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-xl p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Original Content
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-4">
                {selectedItem.text || selectedItem.ocrText}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AIAssistant;
