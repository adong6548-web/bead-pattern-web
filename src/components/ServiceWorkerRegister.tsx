"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          void registration.unregister();
        });
      });

      if ("caches" in window) {
        void caches.keys().then((cacheNames) => {
          cacheNames
            .filter((cacheName) => cacheName.startsWith("bead-pattern-"))
            .forEach((cacheName) => {
              void caches.delete(cacheName);
            });
        });
      }

      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is best-effort; registration failures must not affect the app.
    });
  }, []);

  return null;
}
