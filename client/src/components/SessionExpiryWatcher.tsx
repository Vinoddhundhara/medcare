import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useHospitalAuth } from "@/hooks/use-hospital-auth";
import { useToast } from "@/hooks/use-toast";

const SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 hours
const WARN_BEFORE = 5 * 60 * 1000;             // warn 5 minutes before expiry

/**
 * Silently watches session age.
 * - Warns the user 5 minutes before expiry
 * - Auto-logs out when 12 hours have passed since login
 */
export function SessionExpiryWatcher() {
  const { user, logout: userLogout } = useAuth();
  const { hospital, logout: hospitalLogout } = useHospitalAuth();
  const { toast } = useToast();
  const userWarnedRef = useRef(false);
  const hospitalWarnedRef = useRef(false);

  // Watch User Session
  useEffect(() => {
    if (!user) {
      userWarnedRef.current = false;
      return;
    }

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
        toast({
          title: "Session Expired",
          description: "You have been logged out after 12 hours. Please log in again.",
          variant: "destructive",
          duration: 6000,
        });
        localStorage.removeItem(`session_expires_${user.id}`);
        setTimeout(() => userLogout(), 1000);
        return;
      }

      if (remaining <= WARN_BEFORE && !userWarnedRef.current) {
        userWarnedRef.current = true;
        toast({
          title: "⚠️ Session Expiring Soon",
          description: "Your session will expire in 5 minutes. Save your work.",
          duration: 10000,
        });
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 60 * 1000);
    return () => clearInterval(interval);
  }, [user, userLogout, toast]);

  // Watch Hospital Session
  useEffect(() => {
    if (!hospital) {
      hospitalWarnedRef.current = false;
      return;
    }

    const expiresAt: number = (() => {
      const fromHosp = (hospital as any).sessionExpiresAt;
      if (fromHosp) {
        localStorage.setItem(`hosp_session_expires_${hospital.id}`, String(fromHosp));
        return fromHosp;
      }
      const stored = localStorage.getItem(`hosp_session_expires_${hospital.id}`);
      return stored ? parseInt(stored) : Date.now() + SESSION_DURATION;
    })();

    const checkExpiry = () => {
      const now = Date.now();
      const remaining = expiresAt - now;

      if (remaining <= 0) {
        toast({
          title: "Hospital Session Expired",
          description: "Hospital session has ended after 12 hours. Please log in again.",
          variant: "destructive",
          duration: 6000,
        });
        localStorage.removeItem(`hosp_session_expires_${hospital.id}`);
        setTimeout(() => hospitalLogout(), 1000);
        return;
      }

      if (remaining <= WARN_BEFORE && !hospitalWarnedRef.current) {
        hospitalWarnedRef.current = true;
        toast({
          title: "⚠️ Session Expiring Soon",
          description: "Hospital session will expire in 5 minutes.",
          duration: 10000,
        });
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 60 * 1000);
    return () => clearInterval(interval);
  }, [hospital, hospitalLogout, toast]);

  return null;
}

