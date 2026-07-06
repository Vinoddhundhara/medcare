import cron from "node-cron";
import { db } from "../db";
import { medicineReminders } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sendReminder } from "../services/notificationService";
import { sendSmsReminder } from "../services/smsService";
import { format } from "date-fns";

/**
 * Runs every minute.
 * When reminder time matches current HH:MM:
 *   1. Sends FCM push notification (browser/app)
 *   2. Sends SMS to the patient's registered phone number
 */
export function startReminderCron(): void {
  cron.schedule("* * * * *", async () => {
    const now = new Date();
    const currentTime = format(now, "HH:mm");

    try {
      const reminders = await db
        .select()
        .from(medicineReminders)
        .where(eq(medicineReminders.isActive, true));

      for (const reminder of reminders) {
        // Date range check
        const startDate = new Date(reminder.startDate);
        if (now < startDate) continue;
        if (reminder.endDate && now > new Date(reminder.endDate)) continue;

        // Time match (HH:MM)
        const reminderTime = reminder.time.slice(0, 5);
        if (reminderTime !== currentTime) continue;

        // Weekly frequency: only fire on same weekday as start date
        if (reminder.frequency.toLowerCase() === "weekly") {
          const startDay = new Date(reminder.startDate).getDay();
          if (now.getDay() !== startDay) continue;
        }

        console.log(
          `[Cron] Reminder due — user ${reminder.userId}: ` +
          `${reminder.medicineName} ${reminder.dosage} at ${currentTime}`
        );

        // Fire both FCM push + SMS in parallel
        await Promise.allSettled([
          sendReminder(reminder.userId, reminder.medicineName, reminder.dosage),
          sendSmsReminder(reminder.userId, reminder.medicineName, reminder.dosage),
        ]);
      }
    } catch (err) {
      console.error("[Cron] Error processing reminders:", err);
    }
  });

  console.log("[Cron] Medicine reminder cron started ✓ (FCM + SMS)");
}
