// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import { supabase, isAuthenticated } from "./supabaseClient";
import { ResearchItem, DeviceSource } from "../types";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

export interface StorageItem {
  id: string;
  text: string;
  tags: string[];
  note: string;
  sourceUrl: string;
  sourceTitle: string;
  createdAt: string;
  updatedAt?: string;
  aiSummary?: string;
  citation?: string;
  citationFormat?: string;
  preferredView?: "original" | "summary";
  deviceSource: DeviceSource;
  collectionId?: string;
  imageUrl?: string;
  ocrText?: string;
}

export interface AddItemInput {
  text: string;
  tags?: string[];
  note?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  aiSummary?: string;
  citation?: string;
  citationFormat?: string;
  preferredView?: "original" | "summary";
  deviceSource?: DeviceSource;
  collectionId?: string;
}

export interface UpdateItemInput {
  tags?: string[];
  note?: string;
  aiSummary?: string;
  collectionId?: string;
  citation?: string;
  citationFormat?: string;
  preferredView?: "original" | "summary";
}

export interface MigrationResult {
  success: number;
  failed: number;
}

// ============================================
// PART 3: LOCAL STORAGE HELPERS
// ============================================

const LOCAL_STORAGE_KEY = "researchMateItems";

/**
 * Get items from localStorage (guest mode)
 */
function getLocalItems(): StorageItem[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("❌ Error reading local storage:", error);
    return [];
  }
}

/**
 * Save items to localStorage (guest mode)
 */
function setLocalItems(items: StorageItem[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("❌ Error writing to local storage:", error);
  }
}

// ============================================
// PART 4: DATA TRANSFORMATION
// ============================================

/**
 * Transform database row to StorageItem
 * Handles snake_case to camelCase conversion
 */
function transformDatabaseItem(item: any): StorageItem {
  return {
    id: item.id,
    text: item.text || "",
    tags: Array.isArray(item.tags) ? item.tags : [],
    note: item.note || item.notes || "",
    sourceUrl: item.source_url || "",
    sourceTitle: item.source_title || "",
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    aiSummary: item.ai_summary || "",
    citation: item.citation,
    citationFormat: item.citation_format,
    preferredView: item.preferred_view,
    deviceSource: item.device_source || "web",
    collectionId: item.collection_id,
    imageUrl: item.image_url,
    ocrText: item.ocr_text,
  };
}

/**
 * Transform StorageItem to database format
 * Handles camelCase to snake_case conversion
 */
function transformToDatabase(
  item: AddItemInput,
  userId: string,
): Record<string, any> {
  return {
    user_id: userId,
    text: item.text,
    tags: item.tags || [],
    note: item.note || "",
    source_url: item.sourceUrl || "",
    source_title: item.sourceTitle || "",
    ai_summary: item.aiSummary || "",
    citation: item.citation,
    citation_format: item.citationFormat,
    preferred_view: item.preferredView || null,
    device_source: item.deviceSource || "web",
    collection_id: item.collectionId || null,
  };
}

// ============================================
// PART 5: MAIN CRUD FUNCTIONS
// ============================================

/**
 * Get all research items for current user
 * Falls back to local storage if not authenticated
 * @param limit - Maximum number of items to fetch (default: 100)
 * @param offset - Number of items to skip (default: 0)
 */
export async function getAllItems(
  limit: number = 100,
  offset: number = 0,
): Promise<StorageItem[]> {
  const authenticated = await isAuthenticated();

  // If logged in, get from cloud
  if (authenticated) {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return (data || []).map(transformDatabaseItem);
    } catch (error) {
      console.error("☁️ Cloud fetch failed, using local:", error);
      return getLocalItems();
    }
  }

  // Guest mode: use local storage (apply pagination manually)
  const localItems = getLocalItems();
  return localItems.slice(offset, offset + limit);
}

/**
 * Add a new research item
 * Saves to cloud if authenticated, otherwise to local storage
 */
export async function addItem(item: AddItemInput): Promise<StorageItem> {
  const authenticated = await isAuthenticated();

  // If logged in, save to cloud
  if (authenticated) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("items")
        .insert([transformToDatabase(item, user.id)])
        .select()
        .single();

      if (error) throw error;

      return transformDatabaseItem(data);
    } catch (error) {
      console.error("☁️ Cloud save failed, saving locally:", error);
      // Fall through to local save
    }
  }

  // Guest mode: save locally
  const items = getLocalItems();
  const newItem: StorageItem = {
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    text: item.text,
    tags: item.tags || [],
    note: item.note || "",
    sourceUrl: item.sourceUrl || "",
    sourceTitle: item.sourceTitle || "",
    createdAt: new Date().toISOString(),
    aiSummary: item.aiSummary || "",
    deviceSource: item.deviceSource || "web",
    collectionId: item.collectionId,
  };

  items.unshift(newItem);
  setLocalItems(items);
  return newItem;
}

/**
 * Update an existing research item
 */
export async function updateItem(
  id: string,
  updates: UpdateItemInput,
): Promise<void> {
  // Ensure id is a string
  const itemId = String(id);

  // If it's a local item (ID starts with "local_")
  if (itemId.startsWith("local_")) {
    const items = getLocalItems();
    const index = items.findIndex((item) => item.id === itemId);
    if (index === -1) throw new Error("Item not found");

    items[index] = {
      ...items[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    setLocalItems(items);
    return;
  }

  // Cloud item
  const authenticated = await isAuthenticated();
  if (authenticated) {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.note !== undefined) updateData.note = updates.note;
    if (updates.aiSummary !== undefined)
      updateData.ai_summary = updates.aiSummary;
    if (updates.collectionId !== undefined)
      updateData.collection_id = updates.collectionId;
    // New fields
    // @ts-ignore
    if (updates.citation !== undefined) updateData.citation = updates.citation;
    // @ts-ignore
    if (updates.citationFormat !== undefined)
      updateData.citation_format = updates.citationFormat;
    // @ts-ignore
    if (updates.preferredView !== undefined)
      updateData.preferred_view = updates.preferredView;

    const { error } = await supabase
      .from("items")
      .update(updateData)
      .eq("id", itemId);

    if (error) throw error;
  }
}

/**
 * Delete a research item
 */
export async function deleteItem(id: string): Promise<void> {
  // Ensure id is a string
  const itemId = String(id);

  // If it's a local item
  if (itemId.startsWith("local_")) {
    const items = getLocalItems();
    const filtered = items.filter((item) => item.id !== itemId);
    setLocalItems(filtered);
    return;
  }

  // Cloud item
  const { error } = await supabase.from("items").delete().eq("id", itemId);

  if (error) throw error;
}

/**
 * Get a single item by ID
 */
export async function getItemById(id: string): Promise<StorageItem | null> {
  // Ensure id is a string
  const itemId = String(id);

  // If it's a local item
  if (itemId.startsWith("local_")) {
    const items = getLocalItems();
    return items.find((item) => item.id === itemId) || null;
  }

  // Cloud item
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("id", itemId)
    .single();

  if (error) {
    console.error("❌ Error fetching item:", error);
    return null;
  }

  return transformDatabaseItem(data);
}

// ============================================
// PART 6: SEARCH AND FILTER
// ============================================

/**
 * Search items by text content
 */
export async function searchItems(query: string): Promise<StorageItem[]> {
  const authenticated = await isAuthenticated();
  const searchTerm = query.toLowerCase().trim();

  if (!searchTerm) {
    return getAllItems();
  }

  if (authenticated) {
    try {
      // Use Supabase text search
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .or(
          `text.ilike.%${searchTerm}%,source_title.ilike.%${searchTerm}%,note.ilike.%${searchTerm}%`,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(transformDatabaseItem);
    } catch (error) {
      console.error("☁️ Cloud search failed:", error);
    }
  }

  // Local search fallback
  const items = getLocalItems();
  return items.filter(
    (item) =>
      item.text.toLowerCase().includes(searchTerm) ||
      item.sourceTitle.toLowerCase().includes(searchTerm) ||
      item.note.toLowerCase().includes(searchTerm) ||
      item.tags.some((tag) => tag.toLowerCase().includes(searchTerm)),
  );
}

/**
 * Filter items by tags
 */
export async function filterByTags(tags: string[]): Promise<StorageItem[]> {
  if (!tags.length) {
    return getAllItems();
  }

  const authenticated = await isAuthenticated();

  if (authenticated) {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .contains("tags", tags)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(transformDatabaseItem);
    } catch (error) {
      console.error("☁️ Cloud filter failed:", error);
    }
  }

  // Local filter fallback
  const items = getLocalItems();
  return items.filter((item) => tags.every((tag) => item.tags.includes(tag)));
}

/**
 * Get items by collection
 */
export async function getItemsByCollection(
  collectionId: string,
): Promise<StorageItem[]> {
  const authenticated = await isAuthenticated();

  if (authenticated) {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("collection_id", collectionId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(transformDatabaseItem);
    } catch (error) {
      console.error("☁️ Cloud fetch by collection failed:", error);
    }
  }

  // Local filter fallback
  const items = getLocalItems();
  return items.filter((item) => item.collectionId === collectionId);
}

// ============================================
// PART 7: MIGRATION
// ============================================

/**
 * Migrate local items to cloud storage
 * Called when user signs in with existing local data
 */
export async function migrateLocalToCloud(): Promise<MigrationResult> {
  const localItems = getLocalItems();
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    throw new Error("Must be signed in to migrate");
  }

  if (localItems.length === 0) {
    return { success: 0, failed: 0 };
  }

  const results: MigrationResult = { success: 0, failed: 0 };

  for (const item of localItems) {
    try {
      await addItem({
        text: item.text,
        tags: item.tags,
        note: item.note,
        sourceUrl: item.sourceUrl,
        sourceTitle: item.sourceTitle,
        aiSummary: item.aiSummary,
        deviceSource: item.deviceSource,
      });
      results.success++;
    } catch (error) {
      console.error(`Failed to migrate item ${item.id}:`, error);
      results.failed++;
    }
  }

  // Clear local items if all succeeded
  if (results.failed === 0) {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }

  return results;
}

/**
 * Get count of local items (for migration prompt)
 */
export function getLocalItemsCount(): number {
  return getLocalItems().length;
}

// ============================================
// PART 8: STATISTICS
// ============================================

/**
 * Get statistics about user's research items
 */
export async function getItemStats(): Promise<{
  total: number;
  bySource: Record<DeviceSource, number>;
  byMonth: Record<string, number>;
  withSummary: number;
  totalTags: number;
}> {
  const items = await getAllItems();

  const bySource: Record<DeviceSource, number> = {
    extension: 0,
    mobile: 0,
    smart_pen: 0,
    web: 0,
  };

  const byMonth: Record<string, number> = {};
  let withSummary = 0;
  const allTags = new Set<string>();

  items.forEach((item) => {
    // Count by source
    if (item.deviceSource) {
      bySource[item.deviceSource] = (bySource[item.deviceSource] || 0) + 1;
    }

    // Count by month
    const month = new Date(item.createdAt).toISOString().slice(0, 7); // YYYY-MM
    byMonth[month] = (byMonth[month] || 0) + 1;

    // Count summaries
    if (item.aiSummary) {
      withSummary++;
    }

    // Collect tags
    item.tags.forEach((tag) => allTags.add(tag));
  });

  return {
    total: items.length,
    bySource,
    byMonth,
    withSummary,
    totalTags: allTags.size,
  };
}

// ============================================
// PART 9: REAL-TIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to real-time changes in items
 * Website-specific feature for live updates
 */
export function subscribeToItems(
  userId: string,
  callback: (payload: {
    eventType: string;
    new: StorageItem | null;
    old: StorageItem | null;
  }) => void,
) {
  const channel = supabase
    .channel("items_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "items",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback({
          eventType: payload.eventType,
          new: payload.new ? transformDatabaseItem(payload.new) : null,
          old: payload.old ? transformDatabaseItem(payload.old) : null,
        });
      },
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================
// PART 10: EXPORTS
// ============================================

export default {
  getAllItems,
  addItem,
  updateItem,
  deleteItem,
  getItemById,
  searchItems,
  filterByTags,
  getItemsByCollection,
  migrateLocalToCloud,
  getLocalItemsCount,
  getItemStats,
  subscribeToItems,
};
