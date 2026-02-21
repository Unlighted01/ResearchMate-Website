// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import { supabase, isAuthenticated } from "./supabaseClient";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  itemCount?: number; // Computed field
}

export interface CreateCollectionInput {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateCollectionInput {
  name?: string;
  description?: string;
  color?: string;
}

// Available colors for collections
export const COLLECTION_COLORS = [
  { name: "Indigo", value: "#4F46E5" },
  { name: "Blue", value: "#2563EB" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Green", value: "#10B981" },
  { name: "Yellow", value: "#F59E0B" },
  { name: "Orange", value: "#F97316" },
  { name: "Red", value: "#EF4444" },
  { name: "Pink", value: "#EC4899" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Gray", value: "#6B7280" },
];

// ============================================
// PART 3: DATA TRANSFORMATION
// ============================================

/**
 * Transform database row to Collection object
 */
function transformCollection(row: any): Collection {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description || "",
    color: row.color || "#4F46E5",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    itemCount: row.item_count,
  };
}

// ============================================
// PART 4: CRUD OPERATIONS
// ============================================

/**
 * Get all collections for the current user
 */
export async function getAllCollections(): Promise<Collection[]> {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    console.log("Not authenticated, returning empty collections");
    return [];
  }

  try {
    // Fetch collections without relying on foreign keys
    const { data: cols, error: colError } = await supabase
      .from("collections")
      .select("*")
      .order("created_at", { ascending: false });

    if (colError) throw colError;

    if (!cols || cols.length === 0) return [];

    // Manually fetch item counts to avoid relationship errors
    const { data: items } = await supabase
      .from("items")
      .select("collection_id")
      .not("collection_id", "is", null);

    const counts: Record<string, number> = {};
    if (items) {
      items.forEach((i) => {
        if (i.collection_id) {
          counts[i.collection_id] = (counts[i.collection_id] || 0) + 1;
        }
      });
    }

    return cols.map((row) => ({
      ...transformCollection(row),
      itemCount: counts[row.id] || 0,
    }));
  } catch (error) {
    console.error("❌ Failed to fetch collections:", error);
    return [];
  }
}

/**
 * Get a single collection by ID
 */
export async function getCollectionById(
  id: string,
): Promise<Collection | null> {
  try {
    const { data, error } = await supabase
      .from("collections")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    return transformCollection(data);
  } catch (error) {
    console.error("❌ Failed to fetch collection:", error);
    return null;
  }
}

/**
 * Create a new collection
 */
export async function createCollection(
  input: CreateCollectionInput,
): Promise<Collection> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Must be logged in to create collections");
  }

  const { data, error } = await supabase
    .from("collections")
    .insert([
      {
        user_id: user.id,
        name: input.name,
        description: input.description || "",
        color: input.color || "#4F46E5",
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return transformCollection(data);
}

/**
 * Update an existing collection
 */
export async function updateCollection(
  id: string,
  input: UpdateCollectionInput,
): Promise<Collection> {
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.color !== undefined) updateData.color = input.color;

  const { data, error } = await supabase
    .from("collections")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return transformCollection(data);
}

/**
 * Delete a collection
 * Note: Items in the collection will have their collection_id set to null
 */
export async function deleteCollection(id: string): Promise<void> {
  // First, remove collection_id from all items in this collection
  await supabase
    .from("items")
    .update({ collection_id: null })
    .eq("collection_id", id);

  // Then delete the collection
  const { error } = await supabase.from("collections").delete().eq("id", id);

  if (error) throw error;
}

// ============================================
// PART 5: ITEM-COLLECTION OPERATIONS
// ============================================

/**
 * Add an item to a collection
 */
export async function addItemToCollection(
  itemId: string,
  collectionId: string,
): Promise<void> {
  const { error } = await supabase
    .from("items")
    .update({ collection_id: collectionId })
    .eq("id", itemId);

  if (error) throw error;
}

/**
 * Remove an item from its collection
 */
export async function removeItemFromCollection(itemId: string): Promise<void> {
  const { error } = await supabase
    .from("items")
    .update({ collection_id: null })
    .eq("id", itemId);

  if (error) throw error;
}

/**
 * Get all items in a specific collection
 */
export async function getItemsInCollection(
  collectionId: string,
): Promise<any[]> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("collection_id", collectionId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

/**
 * Move multiple items to a collection
 */
export async function moveItemsToCollection(
  itemIds: string[],
  collectionId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("items")
    .update({ collection_id: collectionId })
    .in("id", itemIds);

  if (error) throw error;
}

// ============================================
// PART 6: REAL-TIME SUBSCRIPTION
// ============================================

/**
 * Subscribe to collection changes
 */
export function subscribeToCollections(
  userId: string,
  callback: (payload: {
    eventType: string;
    new: Collection | null;
    old: Collection | null;
  }) => void,
) {
  const channel = supabase
    .channel("collections_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "collections",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback({
          eventType: payload.eventType,
          new: payload.new ? transformCollection(payload.new) : null,
          old: payload.old ? transformCollection(payload.old) : null,
        });
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================
// PART 7: EXPORTS
// ============================================

export default {
  getAllCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  deleteCollection,
  addItemToCollection,
  removeItemFromCollection,
  getItemsInCollection,
  moveItemsToCollection,
  subscribeToCollections,
  COLLECTION_COLORS,
};
