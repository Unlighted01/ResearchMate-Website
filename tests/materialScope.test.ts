import { describe, it, expect } from "vitest";
import { StorageItem } from "../src/services/storageService";
import { MaterialScopeSelection } from "../src/components/App/ReviewCompanion/MaterialScopeSelector";

// Helper function implementing the same resolution logic as MaterialScopeSelector
function resolveSelectedItems(items: StorageItem[], selection: MaterialScopeSelection): StorageItem[] {
  const validIds = new Set(items.map((i) => i.id));
  const activeIds = selection.selectedIds.filter((id) => validIds.has(id));

  if (selection.mode === "all") return items;
  if (selection.mode === "single") {
    const singleId = activeIds[0];
    return items.filter((i) => i.id === singleId);
  }
  return items.filter((i) => activeIds.includes(i.id));
}

describe("Phase 3: Material Scope Selector Logic", () => {
  const mockItems: StorageItem[] = [
    {
      id: "doc-1",
      text: "Thermodynamics Chapter 1",
      tags: ["pdf"],
      note: "",
      sourceUrl: "",
      sourceTitle: "Thermodynamics.pdf",
      createdAt: "2026-01-01",
      deviceSource: "manual_upload",
    },
    {
      id: "doc-2",
      text: "Calculus Integrals Notes",
      tags: ["pdf"],
      note: "",
      sourceUrl: "",
      sourceTitle: "Calculus.pdf",
      createdAt: "2026-01-02",
      deviceSource: "manual_upload",
    },
    {
      id: "doc-3",
      text: "Philippine Constitution 1987",
      tags: ["pdf"],
      note: "",
      sourceUrl: "",
      sourceTitle: "Constitution.pdf",
      createdAt: "2026-01-03",
      deviceSource: "manual_upload",
    },
  ];

  it("resolves all items when mode is 'all'", () => {
    const res = resolveSelectedItems(mockItems, { mode: "all", selectedIds: [] });
    expect(res.length).toBe(3);
  });

  it("resolves only the single selected document when mode is 'single'", () => {
    const res = resolveSelectedItems(mockItems, { mode: "single", selectedIds: ["doc-2"] });
    expect(res.length).toBe(1);
    expect(res[0].sourceTitle).toBe("Calculus.pdf");
  });

  it("resolves multiple curated documents when mode is 'multi'", () => {
    const res = resolveSelectedItems(mockItems, { mode: "multi", selectedIds: ["doc-1", "doc-3"] });
    expect(res.length).toBe(2);
    expect(res.map((i) => i.id)).toEqual(["doc-1", "doc-3"]);
  });

  it("handles deleted / orphaned document IDs gracefully without crashing", () => {
    // "doc-deleted" no longer exists in mockItems
    const res = resolveSelectedItems(mockItems, {
      mode: "multi",
      selectedIds: ["doc-1", "doc-deleted", "doc-nonexistent"],
    });
    expect(res.length).toBe(1);
    expect(res[0].id).toBe("doc-1");
  });
});
