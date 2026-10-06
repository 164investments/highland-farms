"use client";

import { useEffect } from "react";
import { setSolidHeader } from "./header-mode";

/** Render on a page with no hero photo so the header is solid from load. */
export function SolidHeaderMarker() {
  useEffect(() => {
    setSolidHeader(true);
    return () => setSolidHeader(false);
  }, []);
  return null;
}
