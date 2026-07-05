import { useAppointments } from "@/hooks/use-appointments";
import { useAuth } from "@/hooks/use-auth";
import { isAfter, differenceInHours, differenceInDays, format } from "date-fns";
import { useEffect, useCallback } from "react";
import {
  Bell, CheckCircle, XCircle, Clock, Stethoscope,
} from "lucide-react";

export interface AppNotification {
  id: string;
  type: "upcoming" | "confirmed" | "rejected" | "completed" | "pending" | "cancelled";
  title: string;
  message: string;
  time: string;
  icon: any;
  color: string;
  bg: string;
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

  const storageKey = user ? `seen-notifications-${user.id}` : null;

  const getSeenIds = useCallback((): Set<string> => {
    if (!storageKey) return new Set();
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }, [storageKey]);

  const markAllSeen = useCallback(() => {
    if (!storageKey || !appointments || !user) return;
    const all = buildNotifications(appointments, user.role).map(n => n.id);
    localStorage.setItem(storageKey, JSON.stringify(all));
  }, [storageKey, appointments, user]);

  const markOneSeen = useCallback((id: string) => {
    if (!storageKey) return;
    const seen = getSeenIds();
    seen.add(id);
    localStorage.setItem(storageKey, JSON.stringify([...seen]));
  }, [storageKey, getSeenIds]);

  if (!user || !appointments) return { notifications: [], count: 0, markAllSeen, markOneSeen, getSeenIds };

  const notifications = buildNotifications(appointments, user.role);
  const seenIds = getSeenIds();
  const count = notifications.filter(n => !seenIds.has(n.id)).length;

  return { notifications, count, markAllSeen, markOneSeen, getSeenIds };
}
