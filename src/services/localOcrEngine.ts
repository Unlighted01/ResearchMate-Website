import type { OcrWord } from "./localOcrStore";

export type OcrLanguage = "eng" | "tgl" | "eng+tgl";
export type OcrPreprocess = "original" | "upscale2x";

export interface OcrEngineResult {
  text: string;
  words: OcrWord[];
  confidence: number;
}

export interface LocalOcrEngine {
  readonly version: string;
  initialize(language: OcrLanguage, onProgress?: (progress: number) => void): Promise<void>;
  recognize(image: Blob, preprocess: OcrPreprocess): Promise<OcrEngineResult>;
  dispose(): Promise<void>;
}
