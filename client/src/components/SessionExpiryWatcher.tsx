import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const WARN_BEFORE = 5 * 60 * 1000;             // warn 5 minutes before expiry

/**
 * Silently watches session age.
 * - Warns the user 5 minutes before expiry
 * - Auto-logs out when 24 hours have passed since login
 */
export function SessionExpiryWatcher() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const warnedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      warnedRef.current = false;
      return;
    }

    // Get session expiry from server-returned field, fallback to localStorage
    const expiresAt: number = (() => {
      const fromUser = (user as any).sessionExpiresAt;
      if (fromUser) {
        localStorage.setItem(`session_expires_${user.id}`, String(fromUser));
        return fromUser;
      }
      const stored = localStorage.getItem(`session_expires_${user.id}`);
      return stored ? parseInt(stored) : Date.now() + SESSION_DURATION;
    })();

    const checkExpiry = () => {
      const now = Date.now();
      const remaining = expiresAt - now;

      if (remaining <= 0) {
        // Session expired — force logout
        toast({
          title: "Session Expired",
          description: "You have been logged out after 24 hours. Please log in again.",
          variant: "destructive",
          duration: 6000,
        });
        localStorage.removeItem(`session_expires_${user.id}`);
        setTimeout(() => logout(), 1500);
        return;
      }

      // Warn 5 minutes before expiry (only once)
      if (remaining <= WARN_BEFORE && !warnedRef.current) {
        warnedRef.current = true;
        toast({
          title: "⚠️ Session Expiring Soon",
          description: "Your session will expire in 5 minutes. Save your work.",
          duration: 10000,
        });
      }
    };

    // Check immediately
    checkExpiry();

    // Then check every minute
    const interval = setInterval(checkExpiry, 60 * 1000);
    return () => clearInterval(interval);
  }, [user, logout, toast]);

  return null;
}
