import nodemailer from "nodemailer";
import { format } from "date-fns";

// ─── Transporter ─────────────────────────────────────────────────────────────

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// ─── Base HTML wrapper ────────────────────────────────────────────────────────

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>MedCare</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">
                🏥 MedCare
              </h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                Your trusted healthcare companion
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                © ${new Date().getFullYear()} MedCare. All rights reserved.
              </p>
              <p style="margin:6px 0 0;color:#94a3b8;font-size:12px;">
                This is an automated email. Please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Shared detail row ────────────────────────────────────────────────────────

function detailRow(icon: string, label: string, value: string): string {
  return `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="32" style="vertical-align:middle;font-size:18px;">${icon}</td>
          <td style="vertical-align:middle;">
            <span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">${label}</span><br/>
            <span style="color:#1e293b;font-size:15px;font-weight:600;">${value}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function statusBadge(status: string): string {
  const colors: Record<string, { bg: string; text: string }> = {
    pending:   { bg: "#fef3c7", text: "#92400e" },
    confirmed: { bg: "#d1fae5", text: "#065f46" },
    rejected:  { bg: "#fee2e2", text: "#991b1b" },
    completed: { bg: "#dbeafe", text: "#1e40af" },
    cancelled: { bg: "#f1f5f9", text: "#475569" },
  };
  const c = colors[status] || colors.pending;
  return `<span style="display:inline-block;padding:4px 14px;border-radius:999px;background:${c.bg};color:${c.text};font-size:13px;font-weight:600;text-transform:capitalize;">${status}</span>`;
}

// ─── Template: Appointment Booked (Patient) ───────────────────────────────────

function appointmentBookedPatientHtml(data: {
  patientName: string;
  doctorName: string;
  specialization: string;
  hospital: string;
  date: Date;
  reason: string;
}): string {
  const content = `
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px;font-weight:700;">
      Appointment Booked! 🎉
    </h2>
    <p style="margin:0 0 28px;color:#64748b;font-size:15px;line-height:1.6;">
      Hi <strong>${data.patientName}</strong>, your appointment has been successfully booked.
      You'll receive a confirmation once the doctor accepts your request.
    </p>

    <!-- Card -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:28px;">
      <p style="margin:0 0 16px;color:#6366f1;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
        Appointment Details
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${detailRow("👨‍⚕️", "Doctor", `Dr. ${data.doctorName}`)}
        ${detailRow("🏥", "Specialization", data.specialization)}
        ${detailRow("🏨", "Hospital", data.hospital || "Independent Practice")}
        ${detailRow("📅", "Date & Time", format(data.date, "EEEE, MMMM d yyyy 'at' h:mm a"))}
        ${detailRow("📝", "Reason", data.reason)}
        <tr><td style="padding:12px 0 0;">Status: ${statusBadge("pending")}</td></tr>
      </table>
    </div>

    <!-- Info box -->
    <div style="background:#eff6ff;border-left:4px solid #6366f1;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0;color:#1e40af;font-size:14px;line-height:1.6;">
        <strong>What's next?</strong><br/>
        The doctor will review your request and confirm or suggest a new time.
        You'll receive another email once the status changes.
      </p>
    </div>

    <p style="margin:0;color:#64748b;font-size:14px;">
      Thank you for choosing <strong style="color:#6366f1;">MedCare</strong>. We wish you good health! 💙
    </p>
  `;
  return baseTemplate(content);
}

// ─── Template: Appointment Booked (Doctor) ───────────────────────────────────

function appointmentBookedDoctorHtml(data: {
  doctorName: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  date: Date;
  reason: string;
}): string {
  const content = `
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px;font-weight:700;">
      New Appointment Request 📋
    </h2>
    <p style="margin:0 0 28px;color:#64748b;font-size:15px;line-height:1.6;">
      Hi <strong>Dr. ${data.doctorName}</strong>, you have a new appointment request waiting for your review.
    </p>

    <!-- Card -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:28px;">
      <p style="margin:0 0 16px;color:#6366f1;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
        Patient Details
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${detailRow("👤", "Patient", data.patientName)}
        ${data.patientAge ? detailRow("🎂", "Age", `${data.patientAge} years`) : ""}
        ${data.patientGender ? detailRow("⚧", "Gender", data.patientGender) : ""}
        ${detailRow("📅", "Requested Date & Time", format(data.date, "EEEE, MMMM d yyyy 'at' h:mm a"))}
        ${detailRow("📝", "Reason for Visit", data.reason)}
        <tr><td style="padding:12px 0 0;">Status: ${statusBadge("pending")}</td></tr>
      </table>
    </div>

    <!-- Action prompt -->
    <div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0;color:#166534;font-size:14px;line-height:1.6;">
        <strong>Action Required</strong><br/>
        Please log in to your MedCare dashboard to <strong>confirm</strong> or <strong>reject</strong> this appointment request.
      </p>
    </div>

    <p style="margin:0;color:#64748b;font-size:14px;">
      Thank you for being part of <strong style="color:#6366f1;">MedCare</strong>. Your patients count on you! 💙
    </p>
  `;
  return baseTemplate(content);
}

// ─── Template: Appointment Status Changed ────────────────────────────────────

function appointmentStatusHtml(data: {
  recipientName: string;
  otherPartyName: string;
  role: "patient" | "doctor";
  status: "confirmed" | "rejected" | "completed" | "cancelled";
  date: Date;
  reason: string;
}): string {
  const statusMessages = {
    confirmed: {
      emoji: "✅",
      title: "Appointment Confirmed!",
      body: `Great news! Your appointment has been <strong>confirmed</strong> by Dr. ${data.otherPartyName}.`,
      tip: "Please arrive 10 minutes early and bring any relevant medical documents.",
      tipColor: "#d1fae5",
      tipBorder: "#22c55e",
      tipText: "#065f46",
    },
    rejected: {
      emoji: "❌",
      title: "Appointment Not Accepted",
      body: `Unfortunately, Dr. ${data.otherPartyName} was unable to accept your appointment request.`,
      tip: "You can book a new appointment with another available doctor on MedCare.",
      tipColor: "#fee2e2",
      tipBorder: "#ef4444",
      tipText: "#991b1b",
    },
    completed: {
      emoji: "🎯",
      title: "Appointment Completed",
      body: `Your appointment with Dr. ${data.otherPartyName} has been marked as <strong>completed</strong>.`,
      tip: "Check your Prescriptions section for any medicines prescribed during this visit.",
      tipColor: "#dbeafe",
      tipBorder: "#6366f1",
      tipText: "#1e40af",
    },
    cancelled: {
      emoji: "🚫",
      title: "Appointment Cancelled",
      body: `The appointment scheduled for ${format(data.date, "MMMM d")} has been <strong>cancelled</strong>.`,
      tip: "You can book a new appointment anytime through MedCare.",
      tipColor: "#f1f5f9",
      tipBorder: "#94a3b8",
      tipText: "#475569",
    },
  };

  const msg = statusMessages[data.status];

  const content = `
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px;font-weight:700;">
      ${msg.emoji} ${msg.title}
    </h2>
    <p style="margin:0 0 28px;color:#64748b;font-size:15px;line-height:1.6;">
      Hi <strong>${data.recipientName}</strong>, ${msg.body}
    </p>

    <!-- Card -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:28px;">
      <p style="margin:0 0 16px;color:#6366f1;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
        Appointment Summary
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${detailRow("📅", "Date & Time", format(data.date, "EEEE, MMMM d yyyy 'at' h:mm a"))}
        ${detailRow("📝", "Reason", data.reason)}
        <tr><td style="padding:12px 0 0;">Status: ${statusBadge(data.status)}</td></tr>
      </table>
    </div>

    <div style="background:${msg.tipColor};border-left:4px solid ${msg.tipBorder};border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0;color:${msg.tipText};font-size:14px;line-height:1.6;">
        ${msg.tip}
      </p>
    </div>

    <p style="margin:0;color:#64748b;font-size:14px;">
      Thank you for using <strong style="color:#6366f1;">MedCare</strong>. 💙
    </p>
  `;
  return baseTemplate(content);
}

// ─── Public send functions ────────────────────────────────────────────────────

export interface AppointmentEmailData {
  patientName: string;
  patientEmail: string;
  patientAge?: number;
  patientGender?: string;
  doctorName: string;
  doctorEmail: string;
  specialization: string;
  hospital: string;
  date: Date;
  reason: string;
}

export async function sendAppointmentBookedEmails(data: AppointmentEmailData) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("[Email] EMAIL_USER or EMAIL_PASS not set — skipping email.");
    return;
  }

  const transporter = createTransporter();

  // Send to patient
  const patientMail = {
    from: process.env.EMAIL_FROM || `MedCare <${process.env.EMAIL_USER}>`,
    to: data.patientEmail,
    subject: `✅ Appointment Booked with Dr. ${data.doctorName} — MedCare`,
    html: appointmentBookedPatientHtml({
      patientName: data.patientName,
      doctorName: data.doctorName,
      specialization: data.specialization,
      hospital: data.hospital,
      date: data.date,
      reason: data.reason,
    }),
  };

  // Send to doctor
  const doctorMail = {
    from: process.env.EMAIL_FROM || `MedCare <${process.env.EMAIL_USER}>`,
    to: data.doctorEmail,
    subject: `📋 New Appointment Request from ${data.patientName} — MedCare`,
    html: appointmentBookedDoctorHtml({
      doctorName: data.doctorName,
      patientName: data.patientName,
      patientAge: data.patientAge,
      patientGender: data.patientGender,
      date: data.date,
      reason: data.reason,
    }),
  };

  // Send both in parallel
  await Promise.all([
    transporter.sendMail(patientMail),
    transporter.sendMail(doctorMail),
  ]);

  console.log(`[Email] Sent appointment booked emails to ${data.patientEmail} and ${data.doctorEmail}`);
}

export async function sendAppointmentStatusEmail(data: {
  recipientName: string;
  recipientEmail: string;
  otherPartyName: string;
  role: "patient" | "doctor";
  status: "confirmed" | "rejected" | "completed" | "cancelled";
  date: Date;
  reason: string;
}) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("[Email] EMAIL_USER or EMAIL_PASS not set — skipping email.");
    return;
  }

  const transporter = createTransporter();

  const subjectMap = {
    confirmed: `✅ Appointment Confirmed — MedCare`,
    rejected:  `❌ Appointment Not Accepted — MedCare`,
    completed: `🎯 Appointment Completed — MedCare`,
    cancelled: `🚫 Appointment Cancelled — MedCare`,
  };

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `MedCare <${process.env.EMAIL_USER}>`,
    to: data.recipientEmail,
    subject: subjectMap[data.status],
    html: appointmentStatusHtml(data),
  });

  console.log(`[Email] Sent status '${data.status}' email to ${data.recipientEmail}`);
}

// ─── Template: Video Call Link ────────────────────────────────────────────────

function videoCallLinkHtml(data: {
  patientName: string;
  doctorName: string;
  date: Date;
  reason: string;
  videoCallLink: string;
}): string {
  const content = `
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px;font-weight:700;">
      🎥 Video Call Link Ready!
    </h2>
    <p style="margin:0 0 28px;color:#64748b;font-size:15px;line-height:1.6;">
      Hi <strong>${data.patientName}</strong>, Dr. <strong>${data.doctorName}</strong> has added a
      video call link for your upcoming appointment. Click the button below to join at the scheduled time.
    </p>

    <!-- Card -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:28px;">
      <p style="margin:0 0 16px;color:#6366f1;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
        Appointment Details
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${detailRow("👨‍⚕️", "Doctor", `Dr. ${data.doctorName}`)}
        ${detailRow("📅", "Date & Time", format(data.date, "EEEE, MMMM d yyyy 'at' h:mm a"))}
        ${detailRow("📝", "Reason", data.reason)}
      </table>
    </div>

    <!-- Join button -->
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${data.videoCallLink}"
         style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:10px;letter-spacing:0.3px;">
        🎥 Join Video Call
      </a>
      <p style="margin:12px 0 0;color:#94a3b8;font-size:12px;">
        Or copy this link: <a href="${data.videoCallLink}" style="color:#6366f1;">${data.videoCallLink}</a>
      </p>
    </div>

    <!-- Tip -->
    <div style="background:#eff6ff;border-left:4px solid #6366f1;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0;color:#1e40af;font-size:14px;line-height:1.6;">
        <strong>Tips for a smooth call:</strong><br/>
        • Join 2–3 minutes before the scheduled time<br/>
        • Ensure your camera and microphone are working<br/>
        • Find a quiet, well-lit place
      </p>
    </div>

    <p style="margin:0;color:#64748b;font-size:14px;">
      Thank you for choosing <strong style="color:#6366f1;">MedCare</strong>. We wish you good health! 💙
    </p>
  `;
  return baseTemplate(content);
}

export async function sendVideoCallLinkEmail(data: {
  patientName: string;
  patientEmail: string;
  doctorName: string;
  date: Date;
  reason: string;
  videoCallLink: string;
}) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("[Email] EMAIL_USER or EMAIL_PASS not set — skipping email.");
    return;
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `MedCare <${process.env.EMAIL_USER}>`,
    to: data.patientEmail,
    subject: `🎥 Video Call Link for Your Appointment with Dr. ${data.doctorName} — MedCare`,
    html: videoCallLinkHtml(data),
  });

  console.log(`[Email] Sent video call link email to ${data.patientEmail}`);
}
