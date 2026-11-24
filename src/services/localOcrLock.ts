let active = false;

/** Keep one OCR job active across features and, where supported, across tabs. */
export async function withLocalOcrLock<T>(run: () => Promise<T>): Promise<T> {
  const guarded = async () => {
    if (active) throw new Error("Another local OCR job is running. Pause it before starting this one.");
    active = true;
    try { return await run(); } finally { active = false; }
  };
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request("researchmate-local-ocr", { ifAvailable: true }, async (lock) => {
      if (!lock) throw new Error("Local OCR is running in another tab. Pause it there first.");
      return guarded();
    });
  }
  return guarded();
}
