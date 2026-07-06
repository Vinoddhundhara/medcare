import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  requestNotificationPermission,
  onForegroundMessage,
} from "@/lib/firebase";

export function useFirebaseNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const registeredUserRef = useRef<number | null>(null);

  // Register FCM token when user logs in (once per user session)
  useEffect(() => {
    if (!user) {
      registeredUserRef.current = null;
      return;
    }

    // Already registered for this user
    if (registeredUserRef.current === user.id) return;

    if (!("Notification" in window)) {
      console.warn("[FCM] Notifications not supported");
      return;
    }

    const register = async () => {
      try {
        // Get permission + FCM token
        const token = await requestNotificationPermission();

        if (!token) {
          const perm = Notification.permission;
          if (perm === "denied") {
            console.warn("[FCM] Notification permission denied by user");
          } else {
            console.warn("[FCM] Could not get FCM token — Firebase may not be configured");
          }
          return;
        }

        // Save token to backend
        const res = await fetch("/api/notifications/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          registeredUserRef.current = user.id;
          console.log("[FCM] Token registered for user", user.id);
        }
      } catch (err) {
        console.error("[FCM] Registration error:", err);
      }
    };

    register();
  }, [user]);

  // Show toast for foreground messages (tab is open)
  useEffect(() => {
    if (!user) return;

    const unsub = onForegroundMessage(({ title, body }) => {
      toast({
        title,
        description: body,
        duration: 8000,
      });
    });

    return () => { unsub?.(); };
  }, [user, toast]);
}
