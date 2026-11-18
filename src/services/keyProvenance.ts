export type KeyProvenance = "text_layer" | "ocr_confirmed" | "human_entered" | "none";

export interface SourceCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface KeyConfirmation {
  value: string;
  sourceHash: string;
  page: number;
  crop: SourceCrop;
  time: string;
}

export interface ProvenanceBoundKey {
  origin?: string;
  correctIndex: number;
  options: string[];
  keyProvenance?: KeyProvenance;
  keyConfirmation?: KeyConfirmation;
  sourceHash?: string;
  sourcePage?: number;
  sourceCrop?: SourceCrop;
}

function validCrop(crop: SourceCrop | undefined): crop is SourceCrop {
  return Boolean(crop && [crop.x, crop.y, crop.width, crop.height].every(Number.isFinite) &&
    crop.x >= 0 && crop.y >= 0 && crop.width > 0 && crop.height > 0 &&
    crop.x + crop.width <= 1 && crop.y + crop.height <= 1);
}

export function keyLetter(question: ProvenanceBoundKey): string {
  return Number.isInteger(question.correctIndex) && question.correctIndex >= 0 &&
    question.correctIndex < question.options.length
    ? String.fromCharCode(65 + question.correctIndex)
    : "";
}

export function hasValidKeyConfirmation(question: ProvenanceBoundKey): boolean {
  const confirmation = question.keyConfirmation;
  const crop = question.sourceCrop;
  if (!confirmation || !validCrop(crop) || !validCrop(confirmation.crop)) return false;
  if (!/^[a-f0-9]{64}$/i.test(question.sourceHash || "") || confirmation.sourceHash !== question.sourceHash) return false;
  if (!Number.isInteger(question.sourcePage) || question.sourcePage! < 1 || confirmation.page !== question.sourcePage) return false;
  if (!Number.isFinite(Date.parse(confirmation.time))) return false;
  if (typeof confirmation.value !== "string" || !keyLetter(question) || confirmation.value.trim().toUpperCase() !== keyLetter(question)) return false;
  return crop.x === confirmation.crop.x && crop.y === confirmation.crop.y &&
    crop.width === confirmation.crop.width && crop.height === confirmation.crop.height;
}

/** Legacy questions predate this field; any source-hashed question needs explicit provenance. */
export function hasTrustedKey(question: ProvenanceBoundKey): boolean {
  if (question.keyProvenance === undefined) return !question.sourceHash && !question.sourceCrop && !question.keyConfirmation && question.origin !== "ocr_import";
  if (question.keyProvenance === "text_layer") return question.origin !== "ocr_import";
  if (question.keyProvenance === "none") return false;
  return (question.keyProvenance === "ocr_confirmed" || question.keyProvenance === "human_entered") && hasValidKeyConfirmation(question);
}

export function isSkewedKeyPage(questions: ProvenanceBoundKey[]): boolean {
  const letters = questions.map(keyLetter).filter(Boolean);
  if (letters.length < 10) return false;
  const counts = new Map<string, number>();
  letters.forEach((letter) => counts.set(letter, (counts.get(letter) || 0) + 1));
  return Math.max(...counts.values()) / letters.length > 0.6;
}

export function confirmOcrKey<T extends ProvenanceBoundKey>(question: T, record: KeyConfirmation): T {
  const confirmed = { ...question, sourceCrop: question.sourceCrop && { ...question.sourceCrop },
    keyProvenance: "ocr_confirmed" as const, keyConfirmation: { ...record, crop: { ...record.crop } } };
  if (!hasValidKeyConfirmation(confirmed)) throw new Error("Confirmation must match the key and source crop.");
  return confirmed;
}

export function confirmOcrPage<T extends ProvenanceBoundKey>(questions: T[], records: KeyConfirmation[]): T[] {
  if (isSkewedKeyPage(questions)) throw new Error("Skewed key distribution blocks bulk page confirmation.");
  if (questions.length !== records.length) throw new Error("Every page key needs a confirmation record.");
  if (questions.some((question) => question.sourceHash !== questions[0]?.sourceHash ||
      question.sourcePage !== questions[0]?.sourcePage)) {
    throw new Error("Bulk confirmation requires one source page.");
  }
  return questions.map((question, index) => confirmOcrKey(question, records[index]));
}
