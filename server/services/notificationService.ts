import admin from "firebase-admin";
import { db } from "../db";
import { notificationTokens } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getFirebaseAdmin, isFirebaseReady } from "../firebase/firebaseAdmin";

/**
 * Save or upsert an FCM device token for a user.
 * Ignores duplicate tokens (same user + token).
 */
export async function saveDeviceToken(userId: number, token: string): Promise<void> {
  try {
    // Check if already exists
    const existing = await db
      .select()
      .from(notificationTokens)
      .where(eq(notificationTokens.userId, userId))
      .limit(100);

    const alreadySaved = existing.some((t) => t.token === token);
    if (alreadySaved) return;

    await db.insert(notificationTokens).values({ userId, token });
    console.log(`[FCM] Token saved for user ${userId}`);
  } catch (err) {
    console.error("[FCM] Failed to save token:", err);
    throw err;
  }
}

/**
 * Send a raw FCM push notification to a single token.
 * Returns true on success, false if token is invalid/expired.
 */
export async function sendNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  if (!isFirebaseReady()) {
    console.warn("[FCM] Firebase not ready — skipping notification");
    return false;
  }

  try {
    const app = getFirebaseAdmin();
    await admin.messaging(app).send({
      token,
      notification: { title, body },
      data: data ?? {},
      webpush: {
        notification: {
          title,
          body,
          icon: "/favicon.png",
          badge: "/favicon.png",
          requireInteraction: true,
        },
        fcmOptions: { link: "/" },
      },
    });
    return true;
  } catch (err: any) {
    const code = err?.errorInfo?.code ?? "";
    // Expired or invalid tokens — caller should clean them up
    if (
      code === "messaging/invalid-registration-token" ||
      code === "messaging/registration-token-not-registered"
    ) {
      console.warn("[FCM] Invalid/expired token, should be removed:", token.slice(0, 20));
      return false;
    }
    console.error("[FCM] Send error:", err?.message ?? err);
    return false;
  }
}

/**
 * Send a medicine reminder notification to ALL tokens for a user.
 * Cleans up invalid tokens automatically.
 */
export async function sendReminder(
  userId: number,
  medicineName: string,
  dosage: string
): Promise<void> {
  const tokens = await db
    .select()
    .from(notificationTokens)
    .where(eq(notificationTokens.userId, userId));

  if (tokens.length === 0) {
    console.log(`[FCM] No tokens for user ${userId}, skipping`);
    return;
  }

  const title = "💊 MedCare Reminder";
  const body = `Time to take ${medicineName} (${dosage})`;

  for (const { id, token } of tokens) {
    const success = await sendNotification(token, title, body, {
      type: "medicine_reminder",
      medicineName,
      dosage,
    });

    // Remove invalid tokens from DB
    if (!success) {
      await db.delete(notificationTokens).where(eq(notificationTokens.id, id));
      console.log(`[FCM] Removed invalid token id=${id}`);
    }
  }
}
