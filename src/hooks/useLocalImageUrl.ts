import { useEffect, useState } from "react";
import { getLocalImage } from "../services/localOcrStore";

/** Object URLs are view-only and are never persisted or sent to cloud storage. */
export function useLocalImageUrl(hash?: string) {
  const [state, setState] = useState<{ hash?: string; url?: string; error?: string }>({});
  useEffect(() => {
    let cancelled = false;
    let url: string | undefined;
    if (hash) getLocalImage(hash).then((asset) => {
      if (cancelled) return;
      if (!asset) throw new Error("This image is missing from device storage.");
      url = URL.createObjectURL(asset.blob);
      setState({ hash, url });
    }).catch((error) => {
      if (!cancelled) setState({ hash, error: error instanceof Error ? error.message : "Unable to open local image." });
    });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [hash]);
  return state.hash === hash ? state : {};
}
