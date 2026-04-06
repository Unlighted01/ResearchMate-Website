// ============================================
// useDashboardActions.ts - Dashboard action handlers
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import { supabase } from "../../../services/supabaseClient";
import {
  deleteItem,
  updateItem,
  StorageItem,
} from "../../../services/storageService";
import {
  addItemToCollection,
  moveItemsToCollection,
} from "../../../services/collectionsService";
import { generateItemSummary } from "../../../services/geminiService";
import { exportItems } from "../../../utils/export";
import { generateMarkdownTemplate } from "../../../utils/markdownGenerator";
import { importImageFile, importPdfFile, importJsonFile } from "../../../services/importService";
import { useNotifications } from "../../../context/NotificationContext";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface UseDashboardActionsParams {
  items: StorageItem[];
  setItems: React.Dispatch<React.SetStateAction<StorageItem[]>>;
  selectedItem: StorageItem | null;
  setSelectedItem: (item: StorageItem | null) => void;
  setIsModalOpen: (open: boolean) => void;
  selectedItems: Set<string>;
  setSelectedItems: React.Dispatch<React.SetStateAction<Set<string>>>;
  setIsBulkDeleting: (v: boolean) => void;
  confirmDialog: { isOpen: boolean; itemId: string | null; isDeleting: boolean };
  setConfirmDialog: React.Dispatch<React.SetStateAction<{ isOpen: boolean; itemId: string | null; isDeleting: boolean }>>;
  isSummarizingItem: boolean;
  setIsSummarizingItem: (v: boolean) => void;
  showCollectionModal: boolean;
  setShowCollectionModal: (show: boolean) => void;
  collectionActionType: "single" | "bulk" | null;
  setCollectionActionType: (type: "single" | "bulk" | null) => void;
  setIsImporting: (loading: boolean) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
  filteredItems: StorageItem[];
}

// ============================================
// PART 3: HOOK IMPLEMENTATION
// ============================================

export function useDashboardActions({
  items,
  setItems,
  selectedItem,
  setSelectedItem,
  setIsModalOpen,
  selectedItems,
  setSelectedItems,
  setIsBulkDeleting,
  confirmDialog,
  setConfirmDialog,
  isSummarizingItem,
  setIsSummarizingItem,
  setShowCollectionModal,
  collectionActionType,
  setIsImporting,
  showToast,
  filteredItems,
}: UseDashboardActionsParams) {
  const { addNotification } = useNotifications();

  const handleGenerateSummary = async (item: StorageItem) => {
    if (isSummarizingItem) return;
    setIsSummarizingItem(true);
    showToast("Generating AI summary...", "info");

    try {
      const result = await generateItemSummary(item.id, item.text || item.ocrText || "");
      if (result.ok && result.summary) {
        const updated = { ...item, aiSummary: result.summary };
        setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
        setSelectedItem(updated);
        showToast("Summary generated!", "success");
        addNotification(
          "summary",
          `AI summary generated for "${item.sourceTitle || "Untitled"}"`,
        );
      } else {
        showToast(`Failed to generate summary: ${result.error || result.reason}`, "error");
      }
    } catch (error) {
      showToast("Failed to generate summary", "error");
    } finally {
      setIsSummarizingItem(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    setConfirmDialog({ isOpen: true, itemId: id, isDeleting: false });
  };

  const handleColorChange = async (item: StorageItem, color: string) => {
    try {
      const newColor = item.color === color ? undefined : (color as any);
      const updates = { color: newColor };
      await updateItem(item.id, updates);

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, ...updates } : i)),
      );

      if (selectedItem?.id === item.id) {
        setSelectedItem(selectedItem ? { ...selectedItem, ...updates } : null);
      }

      showToast("Color updated!", "success");
    } catch (err) {
      showToast("Failed to update color", "error");
    }
  };

  const confirmDeleteItem = async () => {
    if (!confirmDialog.itemId) return;

    setConfirmDialog((prev) => ({ ...prev, isDeleting: true }));

    try {
      await deleteItem(confirmDialog.itemId);
      setItems((prev) =>
        prev.filter((item) => item.id !== confirmDialog.itemId),
      );
      showToast("Item deleted successfully", "success");
      if (selectedItem?.id === confirmDialog.itemId) {
        setIsModalOpen(false);
        setSelectedItem(null);
      }
      setConfirmDialog({ isOpen: false, itemId: null, isDeleting: false });
    } catch (error) {
      showToast("Failed to delete item", "error");
      setConfirmDialog((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const selectAllItems = () => {
    setSelectedItems(new Set(items.map((item) => item.id)));
  };

  const deselectAllItems = () => {
    setSelectedItems(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;

    if (
      !confirm(`Delete ${selectedItems.size} items? This cannot be undone.`)
    ) {
      return;
    }

    setIsBulkDeleting(true);
    try {
      const deletePromises = Array.from(selectedItems).map((id) =>
        deleteItem(id),
      );
      await Promise.all(deletePromises);
      setItems((prev) => prev.filter((item) => !selectedItems.has(item.id)));
      showToast(`${selectedItems.size} items deleted successfully`, "success");
      setSelectedItems(new Set());
    } catch (error) {
      showToast("Failed to delete some items", "error");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkExport = async (format: "json" | "csv" | "md" | "pdf") => {
    if (selectedItems.size === 0) {
      showToast("No items selected for export", "error");
      return;
    }

    const itemsToExport = items.filter((item) => selectedItems.has(item.id));

    try {
      if (format === "pdf") {
        showToast("Generating PDF...", "info");
      }
      await exportItems(itemsToExport, format);
      showToast(
        `Exported ${itemsToExport.length} items to ${format.toUpperCase()}`,
        "success",
      );
    } catch (error) {
      showToast(`Export failed: ${(error as Error).message}`, "error");
    }
  };

  const handleShare = async (item: StorageItem) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.sourceTitle || "Research Note",
          text: item.aiSummary || item.text || item.ocrText,
          url: item.sourceUrl,
        });
      } else {
        const textToCopy = `${item.sourceTitle || "Research Note"}\n\n${
          item.aiSummary || item.text || item.ocrText
        }\n\n${item.sourceUrl || ""}`;
        await navigator.clipboard.writeText(textToCopy);
        showToast("Copied to clipboard for sharing", "success");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        showToast("Failed to share item", "error");
      }
    }
  };

  const handleCopyMarkdown = async (item: StorageItem) => {
    try {
      const mdContent = generateMarkdownTemplate(item);
      await navigator.clipboard.writeText(mdContent);
      showToast("Markdown copied to clipboard!", "success");
    } catch (e) {
      showToast("Failed to copy markdown", "error");
    }
  };

  const handleAddToCollection = async (collectionId: string) => {
    try {
      if (collectionActionType === "single" && selectedItem) {
        await addItemToCollection(selectedItem.id, collectionId);
        showToast("Added to collection", "success");
      } else if (collectionActionType === "bulk" && selectedItems.size > 0) {
        await moveItemsToCollection(Array.from(selectedItems), collectionId);
        showToast(`Added ${selectedItems.size} items to collection`, "success");
        setSelectedItems(new Set());
      }
      setShowCollectionModal(false);
    } catch (error) {
      showToast("Failed to add to collection", "error");
    }
  };

  const handleApplyFilters = (filters: any) => {
    // This is set directly on the parent state
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsImporting(true);
    let successCount = 0;
    const errors: string[] = [];

    const { data: { user } } = await supabase.auth.getUser();

    for (const file of files) {
      try {
        if (file.name.toLowerCase().endsWith(".pdf")) {
          showToast(`Extracting text from "${file.name}"...`, "info");
          await importPdfFile(file, user?.id);
          successCount++;
        } else if (file.type.startsWith("image/")) {
          showToast(`Running OCR on "${file.name}"...`, "info");
          await importImageFile(file);
          successCount++;
        } else if (file.name.toLowerCase().endsWith(".json")) {
          const count = await importJsonFile(file, user?.id);
          successCount += count;
        } else {
          errors.push(`"${file.name}": unsupported format`);
        }
      } catch (err: any) {
        errors.push(`"${file.name}": ${err.message}`);
      }
    }

    if (successCount > 0) showToast(`Imported ${successCount} item(s)!`, "success");
    if (errors.length > 0) showToast(`${errors.length} file(s) failed.`, "error");
    setIsImporting(false);
    e.target.value = "";
  };

  return {
    handleGenerateSummary,
    handleDeleteItem,
    handleColorChange,
    confirmDeleteItem,
    toggleItemSelection,
    selectAllItems,
    deselectAllItems,
    handleBulkDelete,
    handleBulkExport,
    handleShare,
    handleCopyMarkdown,
    handleAddToCollection,
    handleApplyFilters,
    handleImport,
  };
}
