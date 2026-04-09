// ============================================
// useDocumentEditor.ts - Document Editor Hook
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import { useState, useEffect, useRef, useCallback } from "react";
import {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  Document,
} from "../../../services/documentService";
import { getAllItems, StorageItem } from "../../../services/storageService";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

export interface UseDocumentEditorReturn {
  // Documents
  documents: Document[];
  currentDoc: Document | null;
  loading: boolean;
  saving: boolean;

  // Actions
  handleNewDocument: () => Promise<void>;
  handleSelectDocument: (id: string) => Promise<void>;
  handleRenameDocument: (id: string, title: string) => Promise<void>;
  handleDeleteDocument: (id: string) => Promise<void>;
  handleContentChange: (content: Record<string, unknown>) => void;

  // Item import
  dashboardItems: StorageItem[];
  itemsLoading: boolean;
  showImportDrawer: boolean;
  setShowImportDrawer: (v: boolean) => void;
}

// ============================================
// PART 3: CONSTANTS
// ============================================

const AUTOSAVE_DELAY = 2000;

// ============================================
// PART 4: HOOK
// ============================================

const useDocumentEditor = (): UseDocumentEditorReturn => {
  // ---------- PART 4A: STATE ----------
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDoc, setCurrentDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Item import
  const [dashboardItems, setDashboardItems] = useState<StorageItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [showImportDrawer, setShowImportDrawer] = useState(false);

  // Autosave
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContent = useRef<Record<string, unknown> | null>(null);

  // ---------- PART 4B: EFFECTS ----------

  // Load documents on mount
  useEffect(() => {
    const load = async () => {
      try {
        const docs = await getDocuments();
        setDocuments(docs);
        if (docs.length > 0) {
          setCurrentDoc(docs[0]);
        }
      } catch (err) {
        console.error("Failed to load documents:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load dashboard items when import drawer opens
  useEffect(() => {
    if (!showImportDrawer) return;
    setItemsLoading(true);
    getAllItems(500)
      .then(setDashboardItems)
      .finally(() => setItemsLoading(false));
  }, [showImportDrawer]);

  // Cleanup autosave on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      // Flush pending save
      if (pendingContent.current && currentDoc) {
        updateDocument(currentDoc.id, { content: pendingContent.current });
      }
    };
  }, [currentDoc]);

  // ---------- PART 4C: HANDLERS ----------

  const handleContentChange = useCallback(
    (content: Record<string, unknown>) => {
      if (!currentDoc) return;
      pendingContent.current = content;

      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(async () => {
        if (!pendingContent.current) return;
        setSaving(true);
        try {
          await updateDocument(currentDoc.id, {
            content: pendingContent.current,
          });
          pendingContent.current = null;
          // Update local state timestamp
          setCurrentDoc((prev) =>
            prev ? { ...prev, updatedAt: new Date().toISOString() } : prev
          );
          setDocuments((prev) =>
            prev.map((d) =>
              d.id === currentDoc.id
                ? { ...d, updatedAt: new Date().toISOString() }
                : d
            )
          );
        } catch (err) {
          console.error("Autosave failed:", err);
        } finally {
          setSaving(false);
        }
      }, AUTOSAVE_DELAY);
    },
    [currentDoc]
  );

  const handleNewDocument = useCallback(async () => {
    try {
      const doc = await createDocument();
      setDocuments((prev) => [doc, ...prev]);
      setCurrentDoc(doc);
    } catch (err) {
      console.error("Failed to create document:", err);
    }
  }, []);

  const handleSelectDocument = useCallback(
    async (id: string) => {
      // Flush pending save before switching
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      if (pendingContent.current && currentDoc) {
        await updateDocument(currentDoc.id, {
          content: pendingContent.current,
        });
        pendingContent.current = null;
      }

      const doc = await getDocument(id);
      if (doc) setCurrentDoc(doc);
    },
    [currentDoc]
  );

  const handleRenameDocument = useCallback(
    async (id: string, title: string) => {
      await updateDocument(id, { title });
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, title } : d))
      );
      if (currentDoc?.id === id) {
        setCurrentDoc((prev) => (prev ? { ...prev, title } : prev));
      }
    },
    [currentDoc]
  );

  const handleDeleteDocument = useCallback(
    async (id: string) => {
      await deleteDocument(id);
      setDocuments((prev) => {
        const remaining = prev.filter((d) => d.id !== id);
        if (currentDoc?.id === id) {
          setCurrentDoc(remaining[0] || null);
        }
        return remaining;
      });
    },
    [currentDoc]
  );

  // ============================================
  // PART 5: RETURN
  // ============================================

  return {
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
  };
};

export default useDocumentEditor;
