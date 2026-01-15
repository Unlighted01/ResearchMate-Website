// ============================================
// PART 2: COLLECTIONS PAGE
// ============================================

import React, { useState, useEffect, useCallback } from "react";
import {
  getAllCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  getItemsInCollection,
  removeItemFromCollection,
  Collection as CollectionType,
  COLLECTION_COLORS,
} from "../../services/collectionsService";
import { StorageItem } from "../../services/storageService";
import { Button, Card, Input, Badge, Modal } from "../shared/UIComponents";
import ConfirmDialog from "../shared/ConfirmDialog";
import {
  SkeletonCollection,
  SkeletonDashboardGrid,
} from "../shared/SkeletonLoader";
import {
  FolderPlus,
  FolderOpen,
  Edit2,
  ChevronLeft,
  Laptop,
  Smartphone,
  PenTool,
  Globe,
  Layout,
  X,
} from "lucide-react";
import { TrashIcon } from "../icons";

interface CollectionsPageProps {
  useToast: () => {
    showToast: (msg: string, type: "success" | "error" | "info") => void;
  };
}

const CollectionsPage: React.FC<CollectionsPageProps> = ({ useToast }) => {
  const [collections, setCollections] = useState<CollectionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] =
    useState<CollectionType | null>(null);
  const [viewingCollection, setViewingCollection] =
    useState<CollectionType | null>(null);
  const [collectionItems, setCollectionItems] = useState<StorageItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    collection: CollectionType | null;
    isDeleting: boolean;
  }>({ isOpen: false, collection: null, isDeleting: false });

  // Form State
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState("#4F46E5");

  const { showToast } = useToast();

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllCollections();
      setCollections(data);
    } catch (error) {
      console.error(error);
      showToast("Failed to load collections", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // Handlers (Create, Update, Delete)
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
    } catch (e) {
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
          c.id === updated.id ? { ...updated, itemCount: c.itemCount } : c
        )
      );
      setIsEditModalOpen(false);
      showToast("Updated!", "success");
    } catch (e) {
      showToast("Update failed", "error");
    }
  };

  const handleDelete = async (col: CollectionType) => {
    setConfirmDialog({ isOpen: true, collection: col, isDeleting: false });
  };

  const confirmDeleteCollection = async () => {
    if (!confirmDialog.collection) return;

    setConfirmDialog((prev) => ({ ...prev, isDeleting: true }));

    try {
      await deleteCollection(confirmDialog.collection.id);
      setCollections((prev) =>
        prev.filter((c) => c.id !== confirmDialog.collection?.id)
      );
      showToast("Collection deleted successfully", "success");
      setConfirmDialog({ isOpen: false, collection: null, isDeleting: false });
    } catch (e) {
      showToast("Failed to delete collection", "error");
      setConfirmDialog((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const handleViewCollection = async (col: CollectionType) => {
    setViewingCollection(col);
    setLoadingItems(true);
    try {
      const items = await getItemsInCollection(col.id);
      // Transform DB items to StorageItem interface if needed
      const transformed: StorageItem[] = items.map((i: any) => ({
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
      setCollectionItems(transformed);
    } catch (e) {
      showToast("Failed to load items", "error");
    } finally {
      setLoadingItems(false);
    }
  };

  // Render Collection Detail View
  if (viewingCollection) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setViewingCollection(null)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Go back to collections"
            title="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: viewingCollection.color }}
          />
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {viewingCollection.name}
            </h1>
            <p className="text-xs text-gray-500">
              {viewingCollection.description || "No description"}
            </p>
          </div>
        </div>

        {loadingItems ? (
          <SkeletonDashboardGrid count={6} />
        ) : collectionItems.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>This collection is empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collectionItems.map((item) => (
              <Card
                key={item.id}
                className="p-4 hover:shadow-md transition-shadow relative group"
              >
                <button
                  onClick={async () => {
                    // Prevent multiple rapid clicks
                    if (removingItemId) return;

                    setRemovingItemId(item.id);
                    try {
                      await removeItemFromCollection(item.id);
                      setCollectionItems((prev) =>
                        prev.filter((i) => i.id !== item.id)
                      );
                      showToast("Removed from collection", "success");
                    } catch (error) {
                      showToast("Failed to remove item", "error");
                    } finally {
                      // Prevent rapid clicking with a short cooldown
                      setTimeout(() => setRemovingItemId(null), 500);
                    }
                  }}
                  disabled={removingItemId === item.id}
                  className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove item from collection"
                  title="Remove from collection"
                >
                  <X className="w-4 h-4" />
                </button>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
                  {item.sourceTitle || "Untitled"}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-3">
                  {item.aiSummary || item.text}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Render Main List
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
            setFormColor("#4F46E5");
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
            <div
              key={col.id}
              onClick={() => handleViewCollection(col)}
              className="group relative bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
            >
              {/* Color accent bar */}
              <div
                className="absolute top-0 left-0 w-full h-1"
                style={{ backgroundColor: col.color }}
              />

              <div className="flex justify-between items-start mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: `${col.color}20`,
                    color: col.color,
                  }}
                >
                  <FolderOpen className="w-6 h-6" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCollection(col);
                      setFormName(col.name);
                      setFormDescription(col.description);
                      setFormColor(col.color);
                      setIsEditModalOpen(true);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    aria-label="Edit collection"
                    title="Edit collection"
                  >
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(col);
                    }}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    aria-label="Delete collection"
                    title="Delete collection"
                  >
                    <TrashIcon size={16} color="#EF4444" dangerHover />
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {col.name}
              </h3>
              <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">
                {col.description}
              </p>

              <div className="flex items-center text-xs text-gray-400 font-medium">
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
                  {col.itemCount || 0} items
                </span>
                <span className="mx-2">•</span>
                <span>
                  Created {new Date(col.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modals would go here (using the UIComponents Modal) - Omitted for brevity but use same logic as original */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="New Collection"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
          <Input
            label="Description"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
          />
          <div>
            <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLLECTION_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setFormColor(c.value)}
                  style={{ backgroundColor: c.value }}
                  aria-label={`Select ${c.name} color`}
                  title={c.name}
                  className={`w-8 h-8 rounded-full ${
                    formColor === c.value
                      ? "ring-2 ring-offset-2 ring-gray-400"
                      : ""
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button className="w-full" onClick={handleCreate}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Duplicate the Modal for Edit logic or make one reusable form component */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Collection"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
          <Input
            label="Description"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
          />
          <div>
            <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLLECTION_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setFormColor(c.value)}
                  style={{ backgroundColor: c.value }}
                  aria-label={`Select ${c.name} color`}
                  title={c.name}
                  className={`w-8 h-8 rounded-full ${
                    formColor === c.value
                      ? "ring-2 ring-offset-2 ring-gray-400"
                      : ""
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button className="w-full" onClick={handleUpdate}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete Collection Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() =>
          setConfirmDialog({
            isOpen: false,
            collection: null,
            isDeleting: false,
          })
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

export default CollectionsPage;
