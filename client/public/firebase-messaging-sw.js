// Firebase Messaging Service Worker
// Handles background push notifications when the tab is closed or hidden

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Firebase client config is safe to include here (these are public values)
const firebaseConfig = {
  apiKey:            "AIzaSyBOM34p5RtzHjhH0xG9cfx_jHd9efsYgEA",
  authDomain:        "medcare-d079b.firebaseapp.com",
  projectId:         "medcare-d079b",
  storageBucket:     "medcare-d079b.firebasestorage.app",
  messagingSenderId: "613521969010",
  appId:             "1:613521969010:web:14efb0415397f0e46d17eb",
};

// Initialize Firebase immediately — no waiting for postMessage
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages (tab closed or hidden)
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background message received:", payload);

  const title = payload.notification?.title || "💊 MedCare Reminder";
  const body  = payload.notification?.body  || "Time to take your medicine";

  self.registration.showNotification(title, {
    body,
    icon:  "/favicon.png",
    badge: "/favicon.png",
    tag:   "medcare-reminder",
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data:  payload.data || {},
    actions: [
      { action: "view",    title: "Open MedCare" },
      { action: "dismiss", title: "Dismiss" },
    ],
  });
});

// Notification click — open or focus the app
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.action);
  event.notification.close();

  if (event.action === "dismiss") return;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // If app is already open, focus it
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new tab
        return clients.openWindow("/ai-assistant");
      })
  );
});
