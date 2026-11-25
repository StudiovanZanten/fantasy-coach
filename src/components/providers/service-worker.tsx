"use client";
import { useEffect } from "react";

/** Registreert de service worker (PWA: installeerbaar en offline app-shell). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
