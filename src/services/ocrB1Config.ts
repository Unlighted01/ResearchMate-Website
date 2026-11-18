export const OCR_B1_ENABLED = import.meta.env.VITE_LOCAL_OCR_B1 === "true";

export const OCR_UPSCALE_CANDIDATE = {
  belowMegapixels: 1.0,
  status: "unvalidated" as const,
};

export const OCR_ROUTE_THRESHOLDS_ENABLED = false;
export const OCR_UNCALIBRATED_ROUTE = "FAIR" as const;

export function isUpscaleTrialCandidate(width: number, height: number): boolean {
  return width > 0 && height > 0 && width * height < OCR_UPSCALE_CANDIDATE.belowMegapixels * 1_000_000;
}
