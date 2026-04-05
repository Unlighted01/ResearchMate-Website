// ============================================
// ItemDetailModal.tsx - Full detail modal for a research item
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Zap, Share2, FolderPlus } from "lucide-react";
import { Modal } from "../../shared/ui";
import { TrashIcon, CopyIcon, ExternalLinkIcon } from "../../icons";
import { StorageItem } from "../../../services/storageService";
import { HIGHLIGHT_COLORS } from "../../../constants/colors";
import { isMarkdown } from "./helpers";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface ItemDetailModalProps {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  selectedItem: StorageItem | null;
  handleCopyMarkdown: (item: StorageItem) => void;
  handleColorChange: (item: StorageItem, color: string) => void;
  handleGenerateSummary: (item: StorageItem) => void;
  isSummarizingItem: boolean;
  handleShare: (item: StorageItem) => void;
  handleDeleteItem: (id: string) => void;
  setCollectionActionType: (type: "single" | "bulk") => void;
  setShowCollectionModal: (show: boolean) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

// ============================================
// PART 3: MAIN COMPONENT
// ============================================

const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  isModalOpen,
  setIsModalOpen,
  selectedItem,
  handleCopyMarkdown,
  handleColorChange,
  handleGenerateSummary,
  isSummarizingItem,
  handleShare,
  handleDeleteItem,
  setCollectionActionType,
  setShowCollectionModal,
  showToast,
}) => {
  return (
    <Modal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      title={selectedItem?.sourceTitle || "Research Detail"}
      size="xl"
    >
      {selectedItem && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Content Card */}
            <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Content
                </h4>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopyMarkdown(selectedItem)}
                    aria-label="Copy as Markdown"
                    title="Copy as Markdown"
                    className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-[#3A3A3C] border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-file-type-2"
                    >
                      <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" />
                      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                      <path d="M2.5 15h3" />
                      <path d="M4 13v6" />
                      <path d="M9 13v6" />
                      <path d="M11 16l-2-3" />
                      <path d="M11 19l-2-3" />
                      <path d="M16 13v6" />
                      <path d="M14 15h3" />
                    </svg>
                    Markdown
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedItem.text || "");
                      showToast("Copied to clipboard!", "success");
                    }}
                    aria-label="Copy to clipboard"
                    title="Copy Raw Text"
                    className="p-1.5 text-[#007AFF] hover:bg-[#007AFF]/10 rounded-lg transition-colors border border-transparent"
                  >
                    <CopyIcon size={16} />
                  </button>
                </div>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-h-[300px] overflow-y-auto">
                {(() => {
                  const t = selectedItem.text || selectedItem.ocrText || "";
                  return isMarkdown(t) ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => (
                          <h1 className="text-base font-bold text-gray-900 dark:text-white mt-3 mb-1 border-b border-gray-200 dark:border-gray-700 pb-1">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-sm font-bold text-blue-900 dark:text-blue-300 mt-2 mb-1">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2 mb-0.5">
                            {children}
                          </h3>
                        ),
                        p: ({ children }) => (
                          <p className="mb-2 leading-relaxed">{children}</p>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-bold text-gray-900 dark:text-white">
                            {children}
                          </strong>
                        ),
                        em: ({ children }) => (
                          <em className="italic text-gray-500 dark:text-gray-400">
                            {children}
                          </em>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside space-y-0.5 mb-2">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-inside space-y-0.5 mb-2">
                            {children}
                          </ol>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-2 border-gray-300 dark:border-gray-600 pl-3 italic text-gray-500 dark:text-gray-400 text-xs my-1">
                            {children}
                          </blockquote>
                        ),
                        hr: () => (
                          <hr className="border-gray-200 dark:border-gray-700 my-2" />
                        ),
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-2">
                            <table className="w-full text-xs border-collapse">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => (
                          <thead className="bg-blue-50 dark:bg-blue-900/30">
                            {children}
                          </thead>
                        ),
                        th: ({ children }) => (
                          <th className="border border-gray-200 dark:border-gray-700 px-2 py-1 font-semibold text-gray-900 dark:text-white text-left">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 align-top">
                            {children}
                          </td>
                        ),
                      }}
                    >
                      {t}
                    </ReactMarkdown>
                  ) : (
                    <span className="whitespace-pre-wrap">{t}</span>
                  );
                })()}
              </div>
            </div>

            {/* Highlight Color Picker */}
            <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-xl p-4">
              <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                Highlight Color
              </h4>
              <div className="flex items-center gap-3">
                {[...HIGHLIGHT_COLORS].map((c) => (
                  <button
                    key={c.name}
                    onClick={() => handleColorChange(selectedItem, c.name)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      selectedItem.color === c.name
                        ? "border-gray-900 dark:border-white scale-110 shadow-sm"
                        : "border-transparent hover:scale-110"
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={`Mark as ${c.name}`}
                  />
                ))}
                {selectedItem.color && (
                  <button
                    onClick={() => handleColorChange(selectedItem, "")}
                    className="ml-auto text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors uppercase font-bold tracking-tighter"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Image Preview */}
            {selectedItem.imageUrl && (
              <img
                src={selectedItem.imageUrl}
                alt="Source"
                className="rounded-xl w-full object-cover border border-gray-200 dark:border-gray-700"
              />
            )}

            {/* Tags */}
            {selectedItem.tags && selectedItem.tags.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-[#F5F5F7] dark:bg-[#2C2C2E] text-gray-600 dark:text-gray-400 text-sm rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* AI Summary Card */}
            <div className="bg-gradient-to-br from-[#007AFF]/10 via-[#5856D6]/10 to-[#AF52DE]/10 dark:from-[#007AFF]/20 dark:via-[#5856D6]/20 dark:to-[#AF52DE]/20 rounded-xl p-5 border border-[#007AFF]/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  AI Summary
                </h4>
              </div>
              {selectedItem.aiSummary ? (
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {selectedItem.aiSummary}
                </p>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 mb-4">
                    No AI summary generated yet.
                  </p>
                  <button
                    onClick={() => handleGenerateSummary(selectedItem)}
                    disabled={isSummarizingItem}
                    className="w-full py-2.5 bg-[#007AFF] hover:bg-[#0066DD] text-white text-sm font-medium rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSummarizingItem ? (
                      <>
                        <svg
                          className="w-4 h-4 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Generating...
                      </>
                    ) : (
                      "Generate Summary"
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Actions
              </h4>
              {selectedItem.sourceUrl && (
                <a
                  href={selectedItem.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 bg-white dark:bg-[#2C2C2E] rounded-xl hover:bg-gray-50 dark:hover:bg-[#3A3A3C] transition-colors"
                >
                  <div className="w-9 h-9 bg-[#007AFF]/10 rounded-lg flex items-center justify-center">
                    <ExternalLinkIcon size={16} color="#007AFF" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Open Original Source
                  </span>
                </a>
              )}
              <button
                onClick={() => handleShare(selectedItem)}
                className="w-full flex items-center gap-3 p-3 bg-white dark:bg-[#2C2C2E] rounded-xl hover:bg-gray-50 dark:hover:bg-[#3A3A3C] transition-colors"
              >
                <div className="w-9 h-9 bg-[#5856D6]/10 rounded-lg flex items-center justify-center">
                  <Share2 className="w-4 h-4 text-[#5856D6]" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Share Research
                </span>
              </button>
              <button
                onClick={() => {
                  setCollectionActionType("single");
                  setShowCollectionModal(true);
                }}
                className="w-full flex items-center gap-3 p-3 bg-white dark:bg-[#2C2C2E] rounded-xl hover:bg-gray-50 dark:hover:bg-[#3A3A3C] transition-colors"
              >
                <div className="w-9 h-9 bg-[#8B5CF6]/10 rounded-lg flex items-center justify-center">
                  <FolderPlus className="w-4 h-4 text-[#8B5CF6]" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Add to Collection
                </span>
              </button>
              <button
                onClick={() => handleDeleteItem(selectedItem.id)}
                className="w-full flex items-center gap-3 p-3 bg-white dark:bg-[#2C2C2E] rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <div className="w-9 h-9 bg-[#FF3B30]/10 rounded-lg flex items-center justify-center">
                  <TrashIcon size={16} color="#FF3B30" dangerHover />
                </div>
                <span className="text-sm font-medium text-[#FF3B30]">
                  Delete Item
                </span>
              </button>
            </div>

            {/* Metadata */}
            <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-xl p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Details
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Source</span>
                  <span className="text-gray-900 dark:text-white capitalize">
                    {selectedItem.deviceSource || "Web"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(selectedItem.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Updated</span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(selectedItem.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default ItemDetailModal;
