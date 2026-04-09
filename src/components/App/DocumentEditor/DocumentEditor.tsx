// ============================================
// DOCUMENT EDITOR - Main Orchestrator
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React, { useState, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { FileEdit } from "lucide-react";

import useDocumentEditor from "./useDocumentEditor";
import DocumentSidebar from "./DocumentSidebar";
import EditorToolbar from "./EditorToolbar";
import EditorCanvas from "./EditorCanvas";
import ItemImportDrawer from "./ItemImportDrawer";
import EditorSkeleton from "./EditorSkeleton";
import { exportToDocx, exportToPdf } from "./exportUtils";

// ============================================
// PART 2: COMPONENT
// ============================================

const DocumentEditor: React.FC = () => {
  const {
    documents,
    currentDoc,
    loading,
    saving,
    handleNewDocument,
    handleSelectDocument,
    handleRenameDocument,
    handleDeleteDocument,
    handleContentChange,
    dashboardItems,
    itemsLoading,
    showImportDrawer,
    setShowImportDrawer,
  } = useDocumentEditor();

  const [editor, setEditor] = useState<Editor | null>(null);

  const onEditorReady = useCallback((ed: Editor) => {
    setEditor(ed);
  }, []);

  const handleExport = useCallback(
    async (format: "docx" | "pdf") => {
      if (!currentDoc || !editor) return;
      try {
        if (format === "docx") {
          await exportToDocx(
            editor.getJSON() as Record<string, unknown>,
            currentDoc.title
          );
        } else {
          await exportToPdf("editor-canvas", currentDoc.title);
        }
      } catch (err) {
        console.error(`Export to ${format} failed:`, err);
      }
    },
    [currentDoc, editor]
  );

  // ---------- PART 2A: LOADING STATE ----------
  if (loading) return <EditorSkeleton />;

  // ---------- PART 2B: EMPTY STATE ----------
  if (!currentDoc && documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 animate-fade-in-up">
        <div className="w-20 h-20 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-2xl flex items-center justify-center">
          <FileEdit className="w-10 h-10 text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Document Editor
          </h2>
          <p className="text-gray-500 mt-2 max-w-md">
            Write research documents, import items from your dashboard, and
            export as Word or PDF.
          </p>
        </div>
        <button
          onClick={handleNewDocument}
          className="px-6 py-3 bg-[#007AFF] hover:bg-[#0066DD] text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-500/25"
        >
          Create Your First Document
        </button>
      </div>
    );
  }

  // ---------- PART 2C: RENDER ----------
  return (
    <div className="flex h-[calc(100vh-4rem)] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1C1C1E] animate-fade-in-up">
      <DocumentSidebar
        documents={documents}
        currentDocId={currentDoc?.id || null}
        onSelect={handleSelectDocument}
        onNew={handleNewDocument}
        onRename={handleRenameDocument}
        onDelete={handleDeleteDocument}
      />

      {currentDoc ? (
        <div className="flex-1 flex flex-col min-w-0">
          <EditorToolbar
            editor={editor}
            onInsertItem={() => setShowImportDrawer(true)}
            onExport={handleExport}
            saving={saving}
          />
          <EditorCanvas
            content={currentDoc.content}
            onEditorReady={onEditorReady}
            onContentChange={handleContentChange}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          Select a document to start editing
        </div>
      )}

      <ItemImportDrawer
        isOpen={showImportDrawer}
        onClose={() => setShowImportDrawer(false)}
        items={dashboardItems}
        loading={itemsLoading}
        editor={editor}
      />
    </div>
  );
};

// ============================================
// PART 3: EXPORTS
// ============================================

export default DocumentEditor;
