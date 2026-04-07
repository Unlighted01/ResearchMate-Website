// ============================================
// CollectionsPage.tsx - Collections Feature Compositor
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React, { useState, useEffect, useCallback } from "react";
import {
  getAllCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  getItemsInCollection,
  removeItemFromCollection,
  moveItemsToCollection,
  Collection as CollectionType,
} from "../../../services/collectionsService";
import {
  StorageItem,
  getAllItems,
  deleteItem,
} from "../../../services/storageService";
import { Button } from "../../shared/ui";
import ConfirmDialog from "../../shared/ConfirmDialog";
import { SkeletonCollection } from "../../shared/SkeletonLoader";
import { FolderPlus } from "lucide-react";
import CollectionCard from "./CollectionCard";
import CollectionFormModal from "./CollectionFormModal";
import CollectionDetailView from "./CollectionDetailView";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface CollectionsPageProps {
  useToast: () => {
    showToast: (msg: string, type: "success" | "error" | "info") => void;
  };
}

// ============================================
// PART 3: CONSTANTS
// ============================================

const DEFAULT_COLOR = "#4F46E5";

// ============================================
// PART 4: MAIN COMPONENT
// ============================================

const CollectionsPage: React.FC<CollectionsPageProps> = ({ useToast }) => {
  // ---------- PART 4A: STATE ----------

  const [collections, setCollections] = useState<CollectionType[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal open state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Selected / viewing
  const [selectedCollection, setSelectedCollection] =
    useState<CollectionType | null>(null);
  const [viewingCollection, setViewingCollection] =
    useState<CollectionType | null>(null);

  // Detail view state
  const [collectionItems, setCollectionItems] = useState<StorageItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);

  // Selection and Add Items state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableItems, setAvailableItems] = useState<StorageItem[]>([]);
  const [selectedAvailableItems, setSelectedAvailableItems] = useState<
    Set<string>
  >(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isBulkRemoving, setIsBulkRemoving] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Confirm delete dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    collection: CollectionType | null;
    isDeleting: boolean;
  }>({ isOpen: false, collection: null, isDeleting: false });

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState(DEFAULT_COLOR);

  const { showToast } = useToast();

  // ---------- PART 4B: EFFECTS ----------

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllCollections();
      setCollections(data);
    } catch (error) {
      showToast("Failed to load collections", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // ---------- PART 4C: SELECTION HANDLERS ----------

  const toggleItemSelection = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAvailableItemSelection = (id: string) => {
    setSelectedAvailableItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllItems = () =>
    setSelectedItems(new Set(collectionItems.map((i) => i.id)));

  const deselectAllItems = () => setSelectedItems(new Set());

  // ---------- PART 4D: BULK ACTION HANDLERS ----------

  const handleBulkRemove = async () => {
    setIsBulkRemoving(true);
    try {
      await moveItemsToCollection(Array.from(selectedItems), null);
      setCollectionItems((prev) => prev.filter((i) => !selectedItems.has(i.id)));
      setSelectedItems(new Set());
      showToast("Removed items from collection", "success");
      fetchCollections();
    } catch {
      showToast("Failed to remove items", "error");
    } finally {
      setIsBulkRemoving(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      for (const id of selectedItems) {
        await deleteItem(id);
      }
      setCollectionItems((prev) => prev.filter((i) => !selectedItems.has(i.id)));
      setSelectedItems(new Set());
      showToast("Deleted items successfully", "success");
      fetchCollections();
    } catch {
      showToast("Failed to delete items", "error");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // ---------- PART 4E: ADD ITEMS HANDLERS ----------

  const openAddModal = async () => {
    if (!viewingCollection) return;
    setShowAddModal(true);
    try {
      const allItems = await getAllItems();
      const currentIds = new Set(collectionItems.map((i) => i.id));
      setAvailableItems(allItems.filter((i) => !currentIds.has(i.id)));
    } catch {
      showToast("Failed to load available items", "error");
    }
  };

  const transformItems = (items: any[]): StorageItem[] =>
    items.map((i) => ({
      id: i.id,
      text: i.text || "",
      tags: i.tags || [],
      note: i.note || "",
      sourceUrl: i.source_url || "",
      sourceTitle: i.source_title || "",
      createdAt: i.created_at,
      updatedAt: i.updated_at,
      aiSummary: i.ai_summary || "",
      deviceSource: i.device_source || "web",
      collectionId: i.collection_id,
    }));

  const handleAddSelectedItems = async () => {
    if (!viewingCollection || selectedAvailableItems.size === 0) return;
    try {
      await moveItemsToCollection(
        Array.from(selectedAvailableItems),
        viewingCollection.id,
      );
      const items = await getItemsInCollection(viewingCollection.id);
      setCollectionItems(transformItems(items));
      fetchCollections();
      setShowAddModal(false);
      setSelectedAvailableItems(new Set());
      showToast(
        `Added ${selectedAvailableItems.size} items to collection`,
        "success",
      );
    } catch {
      showToast("Failed to add items", "error");
    }
  };

  // ---------- PART 4F: REMOVE SINGLE ITEM ----------

  const handleRemoveItem = async (itemId: string) => {
    setRemovingItemId(itemId);
    try {
      await removeItemFromCollection(itemId);
      setCollectionItems((prev) => prev.filter((i) => i.id !== itemId));
      showToast("Removed from collection", "success");
    } catch {
      showToast("Failed to remove item", "error");
    } finally {
      setTimeout(() => setRemovingItemId(null), 500);
    }
  };

  // ---------- PART 4G: COLLECTION CRUD HANDLERS ----------

  const handleCreate = async () => {
    if (!formName.trim()) return showToast("Name required", "error");
    try {
      const newCol = await createCollection({
        name: formName,
        description: formDescription,
        color: formColor,
      });
      setCollections((prev) => [newCol, ...prev]);
      setIsCreateModalOpen(false);
      showToast("Collection created!", "success");
    } catch {
      showToast("Creation failed", "error");
    }
  };

  const handleUpdate = async () => {
    if (!selectedCollection || !formName.trim()) return;
    try {
      const updated = await updateCollection(selectedCollection.id, {
        name: formName,
        description: formDescription,
        color: formColor,
      });
      setCollections((prev) =>
        prev.map((c) =>
          c.id === updated.id ? { ...updated, itemCount: c.itemCount } : c,
        ),
      );
      setIsEditModalOpen(false);
      showToast("Updated!", "success");
    } catch {
      showToast("Update failed", "error");
    }
  };

  const handleDelete = (col: CollectionType) => {
    setConfirmDialog({ isOpen: true, collection: col, isDeleting: false });
  };

  const confirmDeleteCollection = async () => {
    if (!confirmDialog.collection) return;
    setConfirmDialog((prev) => ({ ...prev, isDeleting: true }));
    try {
      await deleteCollection(confirmDialog.collection.id);
      setCollections((prev) =>
        prev.filter((c) => c.id !== confirmDialog.collection?.id),
      );
      showToast("Collection deleted successfully", "success");
      setConfirmDialog({ isOpen: false, collection: null, isDeleting: false });
    } catch {
      showToast("Failed to delete collection", "error");
      setConfirmDialog((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const handleViewCollection = async (col: CollectionType) => {
    setViewingCollection(col);
    setLoadingItems(true);
    try {
      const items = await getItemsInCollection(col.id);
      setCollectionItems(transformItems(items));
    } catch {
      showToast("Failed to load items", "error");
    } finally {
      setLoadingItems(false);
    }
  };

  const handleEditCollection = (col: CollectionType) => {
    setSelectedCollection(col);
    setFormName(col.name);
    setFormDescription(col.description);
    setFormColor(col.color);
    setIsEditModalOpen(true);
  };

  // ---------- PART 4H: RENDER ----------

  // Detail view
  if (viewingCollection) {
    return (
      <CollectionDetailView
        collection={viewingCollection}
        items={collectionItems}
        loadingItems={loadingItems}
        removingItemId={removingItemId}
        selectedItems={selectedItems}
        isBulkRemoving={isBulkRemoving}
        isBulkDeleting={isBulkDeleting}
        showAddModal={showAddModal}
        availableItems={availableItems}
        selectedAvailableItems={selectedAvailableItems}
        searchQuery={searchQuery}
        onBack={() => {
          setViewingCollection(null);
          setSelectedItems(new Set());
        }}
        onOpenAddModal={openAddModal}
        onToggleItemSelection={toggleItemSelection}
        onRemoveItem={handleRemoveItem}
        onSelectAll={selectAllItems}
        onDeselectAll={deselectAllItems}
        onBulkRemove={handleBulkRemove}
        onBulkDelete={handleBulkDelete}
        onCloseAddModal={() => setShowAddModal(false)}
        onSearchChange={setSearchQuery}
        onToggleAvailableItem={toggleAvailableItemSelection}
        onAddSelectedItems={handleAddSelectedItems}
      />
    );
  }

  // Main list view
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Collections
          </h1>
          <p className="text-gray-500 mt-1">Organize your research projects</p>
        </div>
        <Button
          onClick={() => {
            setFormName("");
            setFormDescription("");
            setFormColor(DEFAULT_COLOR);
            setIsCreateModalOpen(true);
          }}
        >
          <FolderPlus className="w-4 h-4 mr-2" /> New Collection
        </Button>
      </div>

      {loading ? (
        <SkeletonCollection count={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((col) => (
            <CollectionCard
              key={col.id}
              collection={col}
              onView={handleViewCollection}
              onEdit={handleEditCollection}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CollectionFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        mode="create"
        formName={formName}
        formDescription={formDescription}
        formColor={formColor}
        onNameChange={setFormName}
        onDescriptionChange={setFormDescription}
        onColorChange={setFormColor}
        onSubmit={handleCreate}
      />

      {/* Edit Modal */}
      <CollectionFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        mode="edit"
        formName={formName}
        formDescription={formDescription}
        formColor={formColor}
        onNameChange={setFormName}
        onDescriptionChange={setFormDescription}
        onColorChange={setFormColor}
        onSubmit={handleUpdate}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() =>
          setConfirmDialog({ isOpen: false, collection: null, isDeleting: false })
        }
        onConfirm={confirmDeleteCollection}
        title="Delete Collection"
        message={`Are you sure you want to delete "${confirmDialog.collection?.name}"? This will not delete the items inside, but they will no longer be organized in this collection.`}
        confirmText="Delete Collection"
        cancelText="Cancel"
        variant="danger"
        isLoading={confirmDialog.isDeleting}
      />
    </div>
  );
};

// ============================================
// PART 5: EXPORTS
// ============================================

export default CollectionsPage;
