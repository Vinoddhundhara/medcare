import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";

// All values come from VITE_ environment variables (safe to expose in client)
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
  );
}

export function initFirebase(): FirebaseApp | null {
  if (!isFirebaseConfigured()) {
    console.warn("[FCM] Firebase env vars not set — push notifications disabled");
    return null;
  }
  if (getApps().length > 0) return getApps()[0];
  app = initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseMessaging(): Messaging | null {
  if (!isFirebaseConfigured()) return null;
  if (messaging) return messaging;
  const a = initFirebase();
  if (!a) return null;
  try {
    messaging = getMessaging(a);
    return messaging;
  } catch (err) {
    console.error("[FCM] getMessaging failed:", err);
    return null;
  }
}

/**
 * Request notification permission and return FCM token.
 * Returns null if permission denied or Firebase not configured.
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (!("Notification" in window)) {
    console.warn("[FCM] Notifications not supported in this browser");
    return null;
  }

  const m = getFirebaseMessaging();
  if (!m) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("[FCM] Notification permission denied");
      return null;
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    const token = await getToken(m, { vapidKey });
    console.log("[FCM] Token obtained:", token?.slice(0, 20) + "…");
    return token;
  } catch (err: any) {
    console.error("[FCM] Token error:", err?.message ?? err);
    return null;
  }
}

/**
 * Listen for foreground messages (tab is open and active).
 */
export function onForegroundMessage(
  callback: (payload: { title: string; body: string }) => void
): (() => void) | null {
  const m = getFirebaseMessaging();
  if (!m) return null;

  const unsub = onMessage(m, (payload) => {
    const title = payload.notification?.title ?? "MedCare";
    const body  = payload.notification?.body  ?? "";
    callback({ title, body });
  });

  return unsub;
}
