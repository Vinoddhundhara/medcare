import { useEffect } from "react";
import { useFirebaseNotifications } from "@/hooks/use-firebase-notifications";

/**
 * Mounts once in App.tsx.
 * 1. Registers the Firebase service worker (for background notifications).
 * 2. Requests notification permission and saves FCM token to backend.
 */
export function FCMInitializer() {
  // Register the service worker on mount
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/firebase-messaging-sw.js", { scope: "/" })
      .then((reg) => {
        console.log("[SW] firebase-messaging-sw.js registered ✓ scope:", reg.scope);
      })
      .catch((err) => {
        console.error("[SW] Registration failed:", err);
      });
  }, []);

  // Request notification permission + register FCM token with backend
  useFirebaseNotifications();

  return null;
}
