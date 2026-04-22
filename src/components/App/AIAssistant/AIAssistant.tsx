// ============================================
// AI ASSISTANT PAGE - Compositor
// Features: Summary Overview + Interactive Chat + Credit System
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { Zap, MessageSquare, Coins } from "lucide-react";
import useAIAssistant from "./useAIAssistant";
import SummaryOverview from "./SummaryOverview";
import ChatPanel from "./ChatPanel";
import SummaryModal from "./SummaryModal";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface AIProps {
  useToast: () => {
    showToast: (msg: string, type: "success" | "error" | "info") => void;
  };
}

// ============================================
// PART 3: MAIN COMPONENT
// ============================================

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

  // ---------- PART 3A: RENDER ----------
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            AI Assistant
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Analyze, summarize, and chat with your research
          </p>
        </div>

        {/* Credit Badge */}
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-sm">
            <Coins className="w-4 h-4 text-[#FF9500]" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {credits} Credits
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-1">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "overview"
              ? "text-[#007AFF] border-b-2 border-[#007AFF] bg-[#007AFF]/5"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          Overview & Stats
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === "chat"
              ? "text-[#007AFF] border-b-2 border-[#007AFF] bg-[#007AFF]/5"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Chat with Research
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

// ============================================
// PART 4: EXPORTS
// ============================================

export default AIAssistant;
