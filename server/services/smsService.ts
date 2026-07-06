import twilio from "twilio";
import { db } from "../db";
import { patients, users } from "@shared/schema";
import { eq } from "drizzle-orm";

let twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient(): ReturnType<typeof twilio> | null {
  if (twilioClient) return twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.warn("[SMS] Twilio credentials not set — SMS notifications disabled.");
    return null;
  }

  twilioClient = twilio(accountSid, authToken);
  return twilioClient;
}

export function isSmsReady(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}

/**
 * Send a raw SMS to any phone number.
 */
export async function sendSms(to: string, body: string): Promise<boolean> {
  const client = getTwilioClient();
  if (!client) return false;

  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    console.warn("[SMS] TWILIO_PHONE_NUMBER not set");
    return false;
  }

  // Normalize number — add + prefix if missing
  const normalized = to.startsWith("+") ? to : `+${to.replace(/\D/g, "")}`;

  try {
    const message = await client.messages.create({ from, to: normalized, body });
    console.log(`[SMS] Sent to ${normalized} — SID: ${message.sid}`);
    return true;
  } catch (err: any) {
    console.error("[SMS] Failed to send:", err?.message ?? err);
    return false;
  }
}

/**
 * Lookup the patient's contact number from the DB and send an SMS reminder.
 */
export async function sendSmsReminder(
  userId: number,
  medicineName: string,
  dosage: string
): Promise<void> {
  if (!isSmsReady()) return;

  try {
    // Get patient profile (has contact/phone number)
    const result = await db
      .select({ contact: patients.contact, name: users.name })
      .from(patients)
      .innerJoin(users, eq(patients.userId, users.id))
      .where(eq(patients.userId, userId))
      .limit(1);

    if (!result.length) {
      console.warn(`[SMS] No patient profile for userId=${userId}`);
      return;
    }

    const { contact, name } = result[0];

    if (!contact || contact.trim() === "") {
      console.warn(`[SMS] No phone number for userId=${userId}`);
      return;
    }

    const body =
      `💊 MedCare Medicine Reminder\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Hello ${name},\n\n` +
      `This is your scheduled medicine reminder from MedCare.\n\n` +
      `📋 Medicine Details:\n` +
      `   • Medicine : ${medicineName}\n` +
      `   • Dosage   : ${dosage}\n` +
      `   • Time     : Take it RIGHT NOW\n\n` +
      `📌 Instructions:\n` +
      `   • Take the exact prescribed dose\n` +
      `   • Do not skip or double the dose\n` +
      `   • Take with water unless told otherwise\n` +
      `   • If you already took it, ignore this message\n\n` +
      `⚠️ Important:\n` +
      `   Never change your dose without consulting\n` +
      `   your doctor first.\n\n` +
      `Stay healthy & take care! 🌿\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `— MedCare Health System`;

    await sendSms(contact, body);
  } catch (err) {
    console.error("[SMS] sendSmsReminder error:", err);
  }
}
