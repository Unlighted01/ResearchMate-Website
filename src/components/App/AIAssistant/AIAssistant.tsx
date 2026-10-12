// ============================================
// AI ASSISTANT PAGE - Academic Synthesis Assistant
// Powered by Gemini 2.5 Flash
// ============================================

import React from "react";
import { Sparkles, MessageSquare, Cpu } from "lucide-react";
import useAIAssistant from "./useAIAssistant";
import SummaryOverview from "./SummaryOverview";
import ChatPanel from "./ChatPanel";
import SummaryModal from "./SummaryModal";

interface AIProps {
  useToast: () => {
    showToast: (msg: string, type: "success" | "error" | "info") => void;
  };
}

const AIAssistant: React.FC<AIProps> = ({ useToast }) => {
  const { showToast } = useToast();
  const {
    activeTab,
    setActiveTab,
    items,
    itemsWithoutSummary,
    itemsWithSummary,
    summarizing,
    batchProcessing,
    searchQuery,
    setSearchQuery,
    selectedItem,
    setSelectedItem,
    summaryMode,
    setSummaryMode,
    handleSummarize,
    handleBatchSummarize,
    chatInput,
    chatHistory,
    isChatting,
    chatEndRef,
    chatAbortRef,
    handleSendMessage,
    isMentionMenuOpen,
    filteredMentions,
    inputRef,
    handleInputChange,
    insertMention,
    handleKeyDown,
    credits,
    clearHistory,
  } = useAIAssistant(showToast);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-title tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Research Assistant
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-400">
              Gemini 2.5 Flash
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
            Synthesize corpus findings, extract methodology notes, and query literature context.
          </p>
        </div>

        {/* Compute Quota Badge */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
              {credits} Quota Units
            </span>
          </div>
        </div>
      </div>

      {/* Academic Tabs */}
      <div className="flex gap-1 border-b border-slate-200/80 dark:border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            activeTab === "overview"
              ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          Corpus Overview & Stats
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === "chat"
              ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Interactive Chat</span>
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <SummaryOverview
          items={items}
          itemsWithoutSummary={itemsWithoutSummary}
          itemsWithSummary={itemsWithSummary}
          summarizing={summarizing}
          batchProcessing={batchProcessing}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          summaryMode={summaryMode}
          setSummaryMode={setSummaryMode}
          handleSummarize={handleSummarize}
          handleBatchSummarize={handleBatchSummarize}
          setSelectedItem={setSelectedItem}
        />
      )}

      {/* Chat Tab */}
      {activeTab === "chat" && (
        <ChatPanel
          items={items}
          chatInput={chatInput}
          chatHistory={chatHistory}
          isChatting={isChatting}
          chatEndRef={chatEndRef}
          chatAbortRef={chatAbortRef}
          handleSendMessage={handleSendMessage}
          isMentionMenuOpen={isMentionMenuOpen}
          filteredMentions={filteredMentions}
          inputRef={inputRef}
          handleInputChange={handleInputChange}
          insertMention={insertMention}
          handleKeyDown={handleKeyDown}
          clearHistory={clearHistory}
        />
      )}

      {/* Detail Modal */}
      <SummaryModal
        selectedItem={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
};

export default AIAssistant;
