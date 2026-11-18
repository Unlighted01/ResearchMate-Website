// @vitest-environment jsdom
import React from "react";
import { act, renderHook, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { IngestionProvider, useIngestion } from "../src/context/IngestionContext";
import { importImageFile, runOcr } from "../src/services/importService";

vi.mock("../src/context/NotificationContext", () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock("../src/services/materialFileType", () => ({ detectMaterialKind: async () => "image" }));
vi.mock("../src/services/storageService", () => ({ addItem: vi.fn() }));
vi.mock("../src/services/importService", () => ({
  importPdfFile: vi.fn(),
  importImageFile: vi.fn(async () => ({ id: "local_image", storageScope: "local", tags: ["image", "needs-review"] })),
  readFileAsDataUrl: vi.fn(async () => "data:image/png;base64,TEST"),
  runOcr: vi.fn(async () => { throw new Error("AI OCR must not run"); }),
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("dashboard image ingestion uses local intake and makes no AI OCR call", async () => {
  const { result } = renderHook(() => useIngestion(), { wrapper: IngestionProvider });
  const success = vi.fn();
  await act(async () => {
    const outcome = await result.current.ingestFiles([new File(["image"], "scan.png", { type: "image/png" })], { onItemSuccess: success });
    expect(outcome.successCount).toBe(1);
  });
  expect(importImageFile).toHaveBeenCalledTimes(1);
  expect(runOcr).not.toHaveBeenCalled();
  expect(success).toHaveBeenCalledWith(expect.objectContaining({ storageScope: "local" }));
});
