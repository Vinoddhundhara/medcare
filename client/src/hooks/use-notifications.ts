import { useAppointments } from "@/hooks/use-appointments";
import { useAuth } from "@/hooks/use-auth";
import { isAfter, differenceInHours, differenceInDays, format, isBefore } from "date-fns";
import { useEffect, useCallback, useState } from "react";
import {
  Bell, CheckCircle, XCircle, Clock, Stethoscope, Pill,
} from "lucide-react";

export interface AppNotification {
  id: string;
  type: "upcoming" | "confirmed" | "rejected" | "completed" | "pending" | "cancelled" | "medicine";
  title: string;
  message: string;
  time: string;
  icon: any;
  color: string;
  bg: string;
}

export function buildMedicineNotifications(reminders: any[]): AppNotification[] {
  const now = new Date();
  const notifications: AppNotification[] = [];

  reminders?.forEach((r: any) => {
    if (!r.isActive) return;

    const today = format(now, "yyyy-MM-dd");
    const startDate = new Date(r.startDate);
    const endDate = r.endDate ? new Date(r.endDate) : null;

    // Skip if not within date range
    if (isBefore(now, startDate)) return;
    if (endDate && isAfter(now, endDate)) return;

    const [hours, minutes] = r.time.split(":").map(Number);
    const scheduledToday = new Date();
    scheduledToday.setHours(hours, minutes, 0, 0);

    const diffMins = (scheduledToday.getTime() - now.getTime()) / 60000;

    // Due NOW (within ±5 min window)
    if (Math.abs(diffMins) <= 5) {
      notifications.push({
        id: `medicine-due-${r.id}-${today}`,
        type: "medicine",
        title: "💊 Time to take your medicine!",
        message: `Take ${r.medicineName} ${r.dosage} — ${r.frequency}.`,
        time: r.time,
        icon: Pill,
        color: "text-green-600",
        bg: "bg-green-50 border-green-100",
      });
    }

    // Upcoming in next 30 minutes
    if (diffMins > 5 && diffMins <= 30) {
      notifications.push({
        id: `medicine-soon-${r.id}-${today}`,
        type: "medicine",
        title: "⏰ Medicine reminder coming up",
        message: `${r.medicineName} ${r.dosage} is due in ${Math.round(diffMins)} minutes.`,
        time: r.time,
        icon: Pill,
        color: "text-blue-600",
        bg: "bg-blue-50 border-blue-100",
      });
    }
  });

  return notifications;
}

export function buildNotifications(appointments: any[], role: string): AppNotification[] {
  const now = new Date();
  const notifications: AppNotification[] = [];
  appointments?.forEach((apt: any) => {
    const aptDate = new Date(apt.date);
    const otherName =
      role === "patient" ? `Dr. ${apt.doctor?.user?.name}` : apt.patient?.user?.name;
    const hoursUntil = differenceInHours(aptDate, now);
    const daysUntil = differenceInDays(aptDate, now);

    // Upcoming reminder (confirmed, within 48 hours)
    if (isAfter(aptDate, now) && hoursUntil <= 48 && apt.status === "confirmed") {
      notifications.push({
        id: `upcoming-${apt.id}`,
        type: "upcoming",
        title: "Upcoming Appointment",
        message:
          hoursUntil < 24
            ? `Your appointment with ${otherName} is in ${hoursUntil} hour${hoursUntil !== 1 ? "s" : ""}.`
            : `Your appointment with ${otherName} is tomorrow at ${format(aptDate, "h:mm a")}.`,
        time: format(aptDate, "MMM d, h:mm a"),
        icon: Bell,
        color: "text-blue-600",
        bg: "bg-blue-50 border-blue-100",
      });
    }

    // Pending reminder (still pending after 24h)
    if (
      apt.status === "pending" &&
      daysUntil >= 0 &&
      apt.createdAt &&
      differenceInHours(now, new Date(apt.createdAt)) > 24
    ) {
      notifications.push({
        id: `pending-${apt.id}`,
        type: "pending",
        title: "Awaiting Confirmation",
        message: `Your appointment request with ${otherName} on ${format(aptDate, "MMM d")} is still pending.`,
        time: format(new Date(apt.createdAt), "MMM d, h:mm a"),
        icon: Clock,
        color: "text-amber-600",
        bg: "bg-amber-50 border-amber-100",
      });
    }

    // Confirmed
    if (apt.status === "confirmed" && isAfter(aptDate, now)) {
      notifications.push({
        id: `confirmed-${apt.id}`,
        type: "confirmed",
        title: "Appointment Confirmed",
        message: `Your appointment with ${otherName} on ${format(aptDate, "MMM d 'at' h:mm a")} has been confirmed.`,
        time: format(aptDate, "MMM d, h:mm a"),
        icon: CheckCircle,
        color: "text-green-600",
        bg: "bg-green-50 border-green-100",
      });
    }

    // Rejected
    if (apt.status === "rejected") {
      notifications.push({
        id: `rejected-${apt.id}`,
        type: "rejected",
        title: "Appointment Rejected",
        message: `Your appointment request with ${otherName} on ${format(aptDate, "MMM d")} was not accepted.`,
        time: format(aptDate, "MMM d, h:mm a"),
        icon: XCircle,
        color: "text-red-600",
        bg: "bg-red-50 border-red-100",
      });
    }

    // Completed
    if (apt.status === "completed") {
      notifications.push({
        id: `completed-${apt.id}`,
        type: "completed",
        title: "Appointment Completed",
        message: `Your visit with ${otherName} on ${format(aptDate, "MMM d")} is marked as completed.`,
        time: format(aptDate, "MMM d, h:mm a"),
        icon: CheckCircle,
        color: "text-blue-600",
        bg: "bg-blue-50 border-blue-100",
      });
    }

    // Doctor: new booking request
    if (role === "doctor" && apt.status === "pending" && isAfter(aptDate, now)) {
      notifications.push({
        id: `new-booking-${apt.id}`,
        type: "pending",
        title: "New Appointment Request",
        message: `${otherName} has requested an appointment on ${format(aptDate, "MMM d 'at' h:mm a")}.`,
        time: apt.createdAt ? format(new Date(apt.createdAt), "MMM d, h:mm a") : "",
        icon: Stethoscope,
        color: "text-purple-600",
        bg: "bg-purple-50 border-purple-100",
      });
    }
  });

  // Deduplicate and sort newest first
  const seen = new Set<string>();
  return notifications
    .filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    })
    .sort((a, b) => b.id.localeCompare(a.id));
}

export function useNotifications() {
  const { user } = useAuth();
  const { data: appointments } = useAppointments();
  const [reminders, setReminders] = useState<any[]>([]);

  // Fetch medicine reminders
  useEffect(() => {
    if (!user || user.role !== "patient") return;
    const fetchReminders = async () => {
      try {
        const res = await fetch("/api/medicine-reminders", { credentials: "include" });
        if (res.ok) setReminders(await res.json());
      } catch {
        // silently fail
      }
    };
    fetchReminders();
    // Refresh every 2 minutes to pick up newly added reminders
    const interval = setInterval(fetchReminders, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const storageKey = user ? `seen-notifications-${user.id}` : null;
  const clearedKey = user ? `cleared-notifications-${user.id}` : null;
  const [clearVersion, setClearVersion] = useState(0);

  const getSeenIds = useCallback((): Set<string> => {
    if (!storageKey) return new Set();
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }, [storageKey]);

  const getClearedIds = useCallback((): Set<string> => {
    if (!clearedKey) return new Set();
    try {
      const raw = localStorage.getItem(clearedKey);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }, [clearedKey]);

  const markAllSeen = useCallback(() => {
    if (!storageKey || !appointments || !user) return;
    const apptNotifs = buildNotifications(appointments, user.role).map(n => n.id);
    const medNotifs = buildMedicineNotifications(reminders).map(n => n.id);
    localStorage.setItem(storageKey, JSON.stringify([...apptNotifs, ...medNotifs]));
  }, [storageKey, appointments, user, reminders]);

  const markOneSeen = useCallback((id: string) => {
    if (!storageKey) return;
    const seen = getSeenIds();
    seen.add(id);
    localStorage.setItem(storageKey, JSON.stringify([...seen]));
  }, [storageKey, getSeenIds]);

  const clearAll = useCallback(() => {
    if (!clearedKey || !user || !appointments) return;
    const apptNotifs = buildNotifications(appointments, user.role).map(n => n.id);
    const medNotifs = buildMedicineNotifications(reminders).map(n => n.id);
    const existing = getClearedIds();
    [...apptNotifs, ...medNotifs].forEach(id => existing.add(id));
    localStorage.setItem(clearedKey, JSON.stringify([...existing]));
    // Also mark them all as seen so sidebar badge goes to 0
    if (storageKey) {
      const seen = getSeenIds();
      [...apptNotifs, ...medNotifs].forEach(id => seen.add(id));
      localStorage.setItem(storageKey, JSON.stringify([...seen]));
    }
    setClearVersion(v => v + 1);
  }, [clearedKey, storageKey, appointments, user, reminders, getClearedIds, getSeenIds]);

  if (!user || !appointments) return { notifications: [], count: 0, markAllSeen, markOneSeen, getSeenIds, clearAll };

  const apptNotifs = buildNotifications(appointments, user.role);
  const medNotifs = user.role === "patient" ? buildMedicineNotifications(reminders) : [];
  const clearedIds = getClearedIds();
  const allNotifications = [...medNotifs, ...apptNotifs].filter(n => !clearedIds.has(n.id));
  const seenIds = getSeenIds();
  const count = allNotifications.filter(n => !seenIds.has(n.id)).length;

  return { notifications: allNotifications, count, markAllSeen, markOneSeen, getSeenIds, clearAll };
}
