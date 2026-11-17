import { describe, expect, it } from "vitest";
import { detectMaterialKind, imageMimeFromSignature } from "../src/services/materialFileType";

describe("material file routing", () => {
  it("recognizes JPEG bytes even when corpus files have numbered extensions", async () => {
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0, 0])], "FAQ_s.1");
    expect(await detectMaterialKind(file)).toBe("image");
    expect(imageMimeFromSignature(new Uint8Array(await file.slice(0, 12).arrayBuffer()))).toBe("image/jpeg");
  });

  it("does not read unknown binary files as notes", async () => {
    const file = new File([new Uint8Array([0, 1, 2, 3])], "data.bin");
    expect(await detectMaterialKind(file)).toBe("unsupported");
  });

  it("routes known documents and text files", async () => {
    expect(await detectMaterialKind(new File(["%PDF-1.7"], "source.odd"))).toBe("pdf");
    expect(await detectMaterialKind(new File(["notes"], "source.md"))).toBe("text");
    expect(await detectMaterialKind(new File([""], "source.docx"))).toBe("docx");
  });
});
