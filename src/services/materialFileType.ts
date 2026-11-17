export type MaterialKind = "pdf" | "docx" | "image" | "text" | "json" | "unsupported";

export function imageMimeFromSignature(bytes: Uint8Array): string | null {
  const ascii = String.fromCharCode(...bytes);
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && ascii.slice(1, 4) === "PNG") return "image/png";
  if (ascii.startsWith("GIF87a") || ascii.startsWith("GIF89a")) return "image/gif";
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Prefer file signatures: corpus images may have a numbered extension and no MIME type. */
export async function detectMaterialKind(file: File): Promise<MaterialKind> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = String.fromCharCode(...bytes);
  if (ascii.startsWith("%PDF-")) return "pdf";
  if (imageMimeFromSignature(bytes)) return "image";

  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
  if (name.endsWith(".docx")) return "docx";
  if (/\.(png|jpe?g|webp|gif|avif)$/.test(name) || file.type.startsWith("image/")) return "image";
  if (/\.(txt|md)$/.test(name) || file.type === "text/plain") return "text";
  if (name.endsWith(".json")) return "json";
  return "unsupported";
}
