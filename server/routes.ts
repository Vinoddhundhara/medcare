import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { askAI, analyzeSymptoms, analyzeSymptomsFull, answerMedicalQuestion, recommendMedicines, generateDietPlan } from "./ai";
import { api } from "@shared/routes";
import { z } from "zod";
import {
  insertAppointmentSchema,
  insertPrescriptionSchema,
  insertMedicineReminderSchema,
  users, patients, doctors, medicineReminders, notificationTokens, hospitals, appointments, prescriptions,
  type InsertPrescription,
  type InsertMedicineReminder,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, like } from "drizzle-orm";
import { sendAppointmentBookedEmails, sendAppointmentStatusEmail, sendVideoCallLinkEmail } from "./email";
import { saveDeviceToken, sendReminder } from "./services/notificationService";
import { sendSmsReminder, sendSms, isSmsReady } from "./services/smsService";
import { WebSocketServer, WebSocket } from "ws";

let wss: WebSocketServer | undefined;

export function broadcastUpdate(data: { type: string; payload?: any }) {
  if (!wss) return;
  const msg = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}


export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup WebSocket Server
  wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;
    if (pathname === "/ws") {
      wss!.handleUpgrade(request, socket, head, (ws) => {
        wss!.emit("connection", ws, request);
      });
    }
  });

  // Setup Authentication (Passport + Session)
  setupAuth(app);

  // === Doctors ===
  app.get(api.doctors.list.path, async (req, res) => {
    const filters = {
      specialization: req.query.specialization as string,
      hospitalId: req.query.hospitalId ? parseInt(req.query.hospitalId as string) : undefined,
      search: req.query.search as string,
    };
    const doctors = await storage.getDoctors(filters);
    res.json(doctors);
  });

  app.get(api.doctors.get.path, async (req, res) => {
    const doctor = await storage.getDoctorWithUser(parseInt(req.params.id));
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    res.json(doctor);
  });

  // === Hospitals ===
  app.get(api.hospitals.list.path, async (req, res) => {
    const hospitals = await storage.getHospitals();
    res.json(hospitals);
  });

  // === Appointments ===
  app.get(api.appointments.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;

    if (user.role === "patient") {
      const patient = await storage.getPatientByUserId(user.id);
      if (!patient) return res.status(404).json({ message: "Patient profile not found" });
      const appointments = await storage.getAppointmentsByPatient(patient.id);
      return res.json(appointments);
    } else if (user.role === "doctor") {
      const doctor = await storage.getDoctorByUserId(user.id);
      if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });
      const appointments = await storage.getAppointmentsByDoctor(doctor.id);
      return res.json(appointments);
    } else {
      // Admin: maybe see all? For now restrict.
      return res.sendStatus(403);
    }
  });

  app.post(api.appointments.create.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== "patient") return res.sendStatus(401);
    
    try {
      const patient = await storage.getPatientByUserId(req.user!.id);
      if (!patient) return res.status(400).json({ message: "Patient profile required" });

      const input = insertAppointmentSchema.parse({
        ...req.body,
        patientId: patient.id
      });

      // ── PRE-CHECK: block duplicate slot before insert ─────────────────────
      const { rows: conflictRows } = await pool.query(
        `SELECT id FROM appointments 
         WHERE doctor_id = $1 AND date = $2 
         AND status = 'confirmed' 
         LIMIT 1`,
        [input.doctorId, new Date(input.date)]
      );

      if (conflictRows.length > 0) {
        return res.status(409).json({ message: "This time slot is already booked. Please choose a different slot." });
      }
      // ─────────────────────────────────────────────────────────────────────

      const appointment = await storage.createAppointment(input);

      // Broadcast real-time update
      broadcastUpdate({ type: "APPOINTMENT_UPDATED", payload: { doctorId: appointment.doctorId } });

      // Send emails in background (don't block the response)
      setImmediate(async () => {
        try {
          const doctor = await storage.getDoctorWithUser(appointment.doctorId);
          const patientWithUser = await storage.getPatientWithUser(appointment.patientId);
          if (doctor && patientWithUser) {
            await sendAppointmentBookedEmails({
              patientName: patientWithUser.user.name,
              patientEmail: patientWithUser.user.email,
              patientAge: patientWithUser.age,
              patientGender: patientWithUser.gender,
              doctorName: doctor.user.name,
              doctorEmail: doctor.user.email,
              specialization: doctor.specialization,
              hospital: doctor.hospital?.name || "",
              date: appointment.date,
              reason: appointment.reason,
            });
          }
        } catch (emailErr) {
          console.error("[Email] Failed to send appointment booked emails:", emailErr);
        }
      });

      res.status(201).json(appointment);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      // PostgreSQL unique constraint — slot already booked (Drizzle wraps the original PG error)
      const pgCode = err?.code || err?.cause?.code || err?.original?.code;
      if (pgCode === "23505" || err?.message?.includes("appointments_doctor_date_unique")) {
        return res.status(409).json({ message: "This time slot is already booked. Please choose a different slot." });
      }
      console.error("[Appointments] Create error:", err?.message ?? err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.patch(api.appointments.updateStatus.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const appointmentId = parseInt(req.params.id);
    const { status } = req.body;
    const user = req.user!;

    const appointment = await storage.getAppointment(appointmentId);
    if (!appointment) return res.sendStatus(404);

    if (user.role === "doctor") {
      // Doctor can confirm, reject, complete their own appointments
      const doctor = await storage.getDoctorByUserId(user.id);
      if (!doctor || appointment.doctorId !== doctor.id) return res.sendStatus(403);
      if (!["confirmed", "rejected", "completed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status for doctor" });
      }
    } else if (user.role === "patient") {
      // Patient can only cancel their own appointments
      const patient = await storage.getPatientByUserId(user.id);
      if (!patient || appointment.patientId !== patient.id) return res.sendStatus(403);
      if (status !== "cancelled") {
        return res.status(400).json({ message: "Patients can only cancel appointments" });
      }
    } else {
      return res.sendStatus(403);
    }

    const updated = await storage.updateAppointmentStatus(appointmentId, status);

    // If doctor confirmed this appointment, automatically reject other pending requests for the same slot
    if (status === "confirmed") {
      try {
        await db
          .update(appointments)
          .set({ status: "rejected" })
          .where(
            and(
              eq(appointments.doctorId, updated.doctorId),
              eq(appointments.date, updated.date),
              eq(appointments.status, "pending")
            )
          );
      } catch (err) {
        console.error("[Appointments] Failed to reject competing appointments:", err);
      }
    }

    res.json(updated);

    // Broadcast real-time update
    broadcastUpdate({ type: "APPOINTMENT_UPDATED", payload: { doctorId: updated.doctorId } });

    // Send status change email in background
    setImmediate(async () => {
      try {
        const doctor = await storage.getDoctorWithUser(updated.doctorId);
        const patientWithUser = await storage.getPatientWithUser(updated.patientId);
        if (!doctor || !patientWithUser) return;

        const validStatuses = ["confirmed", "rejected", "completed", "cancelled"] as const;
        if (!validStatuses.includes(status)) return;

        // Email the patient about the status change
        await sendAppointmentStatusEmail({
          recipientName: patientWithUser.user.name,
          recipientEmail: patientWithUser.user.email,
          otherPartyName: doctor.user.name,
          role: "patient",
          status,
          date: updated.date,
          reason: updated.reason,
        });
      } catch (emailErr) {
        console.error("[Email] Failed to send status change email:", emailErr);
      }
    });
  });

  // === Video Call Link ===
  app.patch("/api/appointments/:id/video-link", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== "doctor") return res.sendStatus(401);

    const appointmentId = parseInt(req.params.id);
    const { link } = req.body;

    if (!link || typeof link !== "string") {
      return res.status(400).json({ message: "A valid link is required" });
    }

    // Validate it's a URL
    try { new URL(link); } catch {
      return res.status(400).json({ message: "Invalid URL format" });
    }

    const appointment = await storage.getAppointment(appointmentId);
    if (!appointment) return res.sendStatus(404);

    // Only the doctor who owns this appointment can add a link
    const doctor = await storage.getDoctorByUserId(req.user!.id);
    if (!doctor || appointment.doctorId !== doctor.id) return res.sendStatus(403);

    // Only confirmed appointments can have a video link
    if (appointment.status !== "confirmed") {
      return res.status(400).json({ message: "Video call link can only be added to confirmed appointments" });
    }

    const updated = await storage.updateVideoCallLink(appointmentId, link);
    res.json(updated);

    // Email the patient with the video call link
    setImmediate(async () => {
      try {
        const patientWithUser = await storage.getPatientWithUser(appointment.patientId);
        const doctorWithUser = await storage.getDoctorWithUser(appointment.doctorId);
        if (patientWithUser && doctorWithUser) {
          await sendVideoCallLinkEmail({
            patientName: patientWithUser.user.name,
            patientEmail: patientWithUser.user.email,
            doctorName: doctorWithUser.user.name,
            date: appointment.date,
            reason: appointment.reason,
            videoCallLink: link,
          });
        }
      } catch (err) {
        console.error("[Email] Failed to send video call link email:", err);
      }
    });
  });

  // === Prescriptions ===
  app.get(api.prescriptions.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;

    try {
      if (user.role === "patient") {
        const patient = await storage.getPatientByUserId(user.id);
        if (!patient) return res.json([]);
        const patientAppointments = await storage.getAppointmentsByPatient(patient.id);
        const allPrescriptions = await Promise.all(
          patientAppointments.map((a) => storage.getPrescriptionsByAppointment(a.id))
        );
        return res.json(allPrescriptions.flat());
      } else if (user.role === "doctor") {
        const doctor = await storage.getDoctorByUserId(user.id);
        if (!doctor) return res.json([]);
        const doctorAppointments = await storage.getAppointmentsByDoctor(doctor.id);
        const allPrescriptions = await Promise.all(
          doctorAppointments.map((a) => storage.getPrescriptionsByAppointment(a.id))
        );
        return res.json(allPrescriptions.flat());
      }
      return res.json([]);
    } catch {
      return res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post(api.prescriptions.create.path, async (req, res) => {
     if (!req.isAuthenticated() || req.user!.role !== "doctor") return res.sendStatus(401);

     try {
       const parsed = insertPrescriptionSchema.parse(req.body);
       const input = parsed as InsertPrescription;
       // Verify appointment belongs to doctor?
       const appointment = await storage.getAppointment(input.appointmentId);
       const doctor = await storage.getDoctorByUserId(req.user!.id);
       
       if (!appointment || !doctor || appointment.doctorId !== doctor.id) {
         return res.status(403).json({ message: "Unauthorized" });
       }

       const prescription = await storage.createPrescription(input);
       // Also mark appointment as completed?
       await storage.updateAppointmentStatus(input.appointmentId, "completed");
       
       res.status(201).json(prescription);
     } catch (err) {
       res.status(400).json({ message: "Invalid input" });
     }
  });

  // === AI Features ===
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message } = req.body;
      const reply = await answerMedicalQuestion(message);
      res.json({ reply });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "AI request failed" });
    }
  });

  // Legacy: plain symptom analysis (text only)
  app.post("/api/ai/symptoms", async (req, res) => {
    try {
      const { symptoms } = req.body;
      if (!symptoms || typeof symptoms !== 'string') {
        return res.status(400).json({ error: "Symptoms description is required" });
      }
      const analysis = await analyzeSymptoms(symptoms);
      res.json({ analysis });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Symptom analysis failed" });
    }
  });

  // NEW: Full AI → Doctor flow — returns analysis + specialist + matching doctors
function mapSpecialistToDbSpecialization(specialist: string): string {
  const spec = specialist.toLowerCase().trim();
  if (spec.includes("cardio")) return "Cardiology";
  if (spec.includes("neuro")) return "Neurology";
  if (spec.includes("ortho")) return "Orthopedics";
  if (spec.includes("general") || spec.includes("physician") || spec.includes("internal") || spec.includes("medicine")) return "General Medicine";
  if (spec.includes("pulmono")) return "Pulmonology";
  if (spec.includes("gastro")) return "Gastroenterology";
  if (spec.includes("dermato") || spec.includes("skin")) return "Dermatology";
  if (spec.includes("pediatr") || spec.includes("child")) return "Pediatrics";
  return "General Medicine"; // default fallback
}

  app.post("/api/ai/analyze-symptoms", async (req, res) => {
    try {
      const { symptoms } = req.body;
      if (!symptoms || typeof symptoms !== "string") {
        return res.status(400).json({ error: "Symptoms description is required" });
      }

      // Step 1: AI analysis
      const { analysis, recommendedSpecialist, risk, urgency } = await analyzeSymptomsFull(symptoms);

      // Step 2: Find matching doctors from DB by specialization
      const dbSpecialization = mapSpecialistToDbSpecialization(recommendedSpecialist);
      const matchedDoctors = await storage.getDoctors({ specialization: dbSpecialization });

      // Step 3: Format doctor list with hospital info
      const doctorList = matchedDoctors.map(d => ({
        id: d.id,
        name: d.user.name,
        specialization: d.specialization,
        experience: d.experience,
        consultationFee: d.consultationFee,
        hospital: d.hospital?.name || "Independent",
        hospitalId: d.hospitalId,
        availability: d.availability || [],
        onlineEnabled: d.onlineEnabled,
        offlineEnabled: d.offlineEnabled,
        videoEnabled: d.videoEnabled,
        onlineFee: d.onlineFee,
        offlineFee: d.offlineFee,
        videoFee: d.videoFee,
      }));

      res.json({
        analysis,
        recommendedSpecialist,
        risk,
        urgency,
        doctors: doctorList,
      });
    } catch (err: any) {
      console.error("[AI Symptoms] Error:", err?.message ?? err);
      res.status(500).json({ error: "Symptom analysis failed" });
    }
  });

  app.post("/api/ai/recommend-medicines", async (req, res) => {
    try {
      const { condition } = req.body;
      if (!condition || typeof condition !== 'string') {
        return res.status(400).json({ error: "Condition is required" });
      }
      const recommendation = await recommendMedicines(condition);
      res.json({ recommendation });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Medicine recommendation failed" });
    }
  });

  app.post("/api/ai/diet-plan", async (req, res) => {
    try {
      const { condition, age, weight, activityLevel, foodPreference } = req.body;
      if (!condition || typeof condition !== "string") {
        return res.status(400).json({ error: "Condition is required" });
      }
      const plan = await generateDietPlan({
        condition:      condition,
        age:            age || "Not specified",
        weight:         weight || "Not specified",
        activityLevel:  activityLevel || "Moderate",
        foodPreference: foodPreference || "No preference",
      });
      if (!plan) {
        return res.status(500).json({ error: "AI returned empty plan" });
      }
      res.json({ plan });
    } catch (err: any) {
      console.error("[Diet] Route error:", err?.message ?? err);
      res.status(500).json({ error: err?.message || "Diet plan generation failed" });
    }
  });

  // === Medicine Reminders ===
  app.get("/api/medicine-reminders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const reminders = await db.select()
        .from(medicineReminders)
        .where(eq(medicineReminders.userId, req.user!.id));
      res.json(reminders);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch reminders" });
    }
  });

  app.post("/api/medicine-reminders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = insertMedicineReminderSchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      const [reminder] = await db.insert(medicineReminders).values(input).returning();

      // Send immediate SMS confirmation to patient's registered phone number
      setImmediate(async () => {
        try {
          const result = await db
            .select({ contact: patients.contact, name: users.name })
            .from(patients)
            .innerJoin(users, eq(patients.userId, users.id))
            .where(eq(patients.userId, req.user!.id))
            .limit(1);

          if (result.length && result[0].contact?.trim()) {
            const { contact, name } = result[0];
            await sendSms(
              contact,
              `✅ MedCare Reminder Confirmed!\n` +
              `━━━━━━━━━━━━━━━━━━━━━━\n` +
              `Hello ${name},\n\n` +
              `Your medicine reminder has been successfully set on MedCare.\n\n` +
              `📋 Reminder Details:\n` +
              `   • Medicine  : ${reminder.medicineName}\n` +
              `   • Dosage    : ${reminder.dosage}\n` +
              `   • Time      : ${reminder.time} every day\n` +
              `   • Frequency : ${reminder.frequency}\n` +
              `   • Start Date: ${new Date(reminder.startDate).toDateString()}\n` +
              (reminder.endDate ? `   • End Date  : ${new Date(reminder.endDate).toDateString()}\n` : `   • End Date  : No end date (ongoing)\n`) +
              `\n📌 What to expect:\n` +
              `   You will receive an SMS reminder at ${reminder.time}\n` +
              `   every day as a prompt to take your medicine.\n\n` +
              `⚠️ Important Reminders:\n` +
              `   • Always take the exact prescribed dose\n` +
              `   • Do not skip doses without doctor advice\n` +
              `   • Store medicine as instructed on the label\n` +
              `   • Contact your doctor for any side effects\n\n` +
              `Stay consistent & healthy! 💪\n` +
              `━━━━━━━━━━━━━━━━━━━━━━\n` +
              `— MedCare Health System`
            );
            console.log(`[SMS] Reminder confirmation sent to ${contact}`);
          }
        } catch (smsErr) {
          console.error("[SMS] Failed to send reminder confirmation:", smsErr);
        }
      });

      res.status(201).json(reminder);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.errors[0].message });
      } else {
        console.error(err);
        res.status(500).json({ error: "Failed to create reminder" });
      }
    }
  });

  app.patch("/api/medicine-reminders/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      // Ensure user owns this reminder
      const existing = await db.select()
        .from(medicineReminders)
        .where(eq(medicineReminders.id, id))
        .limit(1);
      
      if (!existing.length || existing[0].userId !== req.user!.id) {
        return res.sendStatus(404);
      }

      const [updated] = await db.update(medicineReminders)
        .set(updates)
        .where(eq(medicineReminders.id, id))
        .returning();
      
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update reminder" });
    }
  });

  app.delete("/api/medicine-reminders/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const existing = await db.select()
        .from(medicineReminders)
        .where(eq(medicineReminders.id, id))
        .limit(1);
      if (!existing.length || existing[0].userId !== req.user!.id) return res.sendStatus(404);
      await db.delete(medicineReminders).where(eq(medicineReminders.id, id));
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete reminder" });
    }
  });

  // === Doctor Booked Slots (public — no auth needed) ===
  app.get("/api/doctors/:id/booked-slots", async (req, res) => {
    try {
      const doctorId = parseInt(req.params.id);
      if (isNaN(doctorId)) return res.status(400).json({ error: "Invalid doctor id" });

      // Direct DB query — fast, no joins needed
      const rows = await db
        .select({ date: appointments.date })
        .from(appointments)
        .where(
          and(
            eq(appointments.doctorId, doctorId),
            eq(appointments.status, "confirmed")
          )
        );

      const bookedSlots = rows
        .filter(r => r.date)
        .map(r => new Date(r.date).toISOString());

      res.json({ bookedSlots });
    } catch (err) {
      console.error("[Booked Slots] Error:", err);
      res.status(500).json({ error: "Failed to fetch booked slots" });
    }
  });
  app.post("/api/notifications/token", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { token } = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "FCM token is required" });
      }
      await saveDeviceToken(req.user!.id, token);
      res.json({ success: true });
    } catch (err) {
      console.error("[FCM] Token save error:", err);
      res.status(500).json({ error: "Failed to save token" });
    }
  });

  // === FCM Test Notification ===
  app.post("/api/notifications/test", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      await Promise.allSettled([
        sendReminder(req.user!.id, "Metformin (Test)", "500mg"),
        sendSmsReminder(req.user!.id, "Metformin (Test)", "500mg"),
      ]);
      res.json({
        success: true,
        message: "Test notification sent via FCM push + SMS!",
        smsEnabled: isSmsReady(),
      });
    } catch (err) {
      console.error("[FCM] Test notification error:", err);
      res.status(500).json({ error: "Failed to send test notification" });
    }
  });

  // === Profile ===
  app.get("/api/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;
    try {
      if (user.role === "patient") {
        const patient = await storage.getPatientByUserId(user.id);
        return res.json({ user, profile: patient });
      } else if (user.role === "doctor") {
        const doctor = await storage.getDoctorByUserId(user.id);
        if (!doctor) return res.json({ user, profile: null });
        const hospital = doctor.hospitalId ? await storage.getHospital(doctor.hospitalId) : null;
        return res.json({ user, profile: { ...doctor, hospital } });
      }
      return res.json({ user, profile: null });
    } catch {
      return res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.patch("/api/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;
    try {
      const { name, email, ...profileFields } = req.body;

      // Update user fields
      if (name || email) {
        await db.update(users)
          .set({ ...(name && { name }), ...(email && { email }) })
          .where(eq(users.id, user.id));
      }

      // Update role-specific profile
      if (user.role === "patient") {
        const patient = await storage.getPatientByUserId(user.id);
        if (patient) {
          const { age, gender, contact, medicalHistory } = profileFields;
          await db.update(patients)
            .set({
              ...(age !== undefined && { age: parseInt(age) }),
              ...(gender && { gender }),
              ...(contact && { contact }),
              ...(medicalHistory !== undefined && { medicalHistory }),
            })
            .where(eq(patients.userId, user.id));
        }
      } else if (user.role === "doctor") {
        const doctor = await storage.getDoctorByUserId(user.id);
        if (doctor) {
          const { 
            specialization, 
            experience, 
            consultationFee, 
            availability,
            qualification,
            onlineFee,
            offlineFee,
            videoFee,
            onlineEnabled,
            offlineEnabled,
            videoEnabled
          } = profileFields;
          await db.update(doctors)
            .set({
              ...(specialization && { specialization }),
              ...(experience !== undefined && { experience: parseInt(experience) }),
              ...(consultationFee !== undefined && { consultationFee: parseInt(consultationFee) }),
              ...(qualification && { qualification }),
              ...(onlineFee !== undefined && { onlineFee: parseInt(onlineFee) }),
              ...(offlineFee !== undefined && { offlineFee: parseInt(offlineFee) }),
              ...(videoFee !== undefined && { videoFee: parseInt(videoFee) }),
              ...(onlineEnabled !== undefined && { onlineEnabled: onlineEnabled === true || onlineEnabled === 'true' }),
              ...(offlineEnabled !== undefined && { offlineEnabled: offlineEnabled === true || offlineEnabled === 'true' }),
              ...(videoEnabled !== undefined && { videoEnabled: videoEnabled === true || videoEnabled === 'true' }),
              ...(availability && { availability }),
            })
            .where(eq(doctors.userId, user.id));

          broadcastUpdate({ type: "AVAILABILITY_UPDATED", payload: { doctorId: doctor.id } });
        }
      }

      // Return updated profile
      const updatedUser = await storage.getUser(user.id);
      if (user.role === "patient") {
        const patient = await storage.getPatientByUserId(user.id);
        return res.json({ user: updatedUser, profile: patient });
      } else if (user.role === "doctor") {
        const doctor = await storage.getDoctorByUserId(user.id);
        const hospital = doctor?.hospitalId ? await storage.getHospital(doctor.hospitalId) : null;
        return res.json({ user: updatedUser, profile: doctor ? { ...doctor, hospital } : null });
      }
      return res.json({ user: updatedUser, profile: null });
    } catch (err) {
      return res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.put("/api/doctors/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;
    if (user.role !== "doctor") return res.status(403).json({ error: "Only doctors can update this profile" });

    try {
      const {
        specialization,
        experience,
        consultationFee,
        availability,
        qualification,
        onlineFee,
        offlineFee,
        videoFee,
        onlineEnabled,
        offlineEnabled,
        videoEnabled
      } = req.body;

      await db.update(doctors)
        .set({
          ...(specialization && { specialization }),
          ...(experience !== undefined && { experience: parseInt(experience) }),
          ...(consultationFee !== undefined && { consultationFee: parseInt(consultationFee) }),
          ...(qualification && { qualification }),
          ...(onlineFee !== undefined && { onlineFee: parseInt(onlineFee) }),
          ...(offlineFee !== undefined && { offlineFee: parseInt(offlineFee) }),
          ...(videoFee !== undefined && { videoFee: parseInt(videoFee) }),
          ...(onlineEnabled !== undefined && { onlineEnabled: onlineEnabled === true || onlineEnabled === 'true' }),
          ...(offlineEnabled !== undefined && { offlineEnabled: offlineEnabled === true || offlineEnabled === 'true' }),
          ...(videoEnabled !== undefined && { videoEnabled: videoEnabled === true || videoEnabled === 'true' }),
          ...(availability && { availability }),
        })
        .where(eq(doctors.userId, user.id));

      const doctor = await storage.getDoctorByUserId(user.id);
      if (doctor) {
        broadcastUpdate({ type: "AVAILABILITY_UPDATED", payload: { doctorId: doctor.id } });
      }
      const hospital = doctor?.hospitalId ? await storage.getHospital(doctor.hospitalId) : null;
      return res.json({ user, profile: doctor ? { ...doctor, hospital } : null });
    } catch (err) {
      return res.status(500).json({ message: "Failed to update doctor profile" });
    }
  });

  // Seed Data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  console.log("Checking database seeding status...");
  const existingHospitals = await storage.getHospitals();
  const hashedPassword = await hashPassword("password123");

  if (existingHospitals.length === 0) {
    console.log("Seeding hospitals...");
    // ─── Hospitals ──────────────────────────────────────────────────────
    const hApollo = await storage.createHospital({
      name: "Apollo Hospital",
      location: "Jubilee Hills, Hyderabad",
      contact: "040-23607777",
      specializations: ["Cardiology", "Neurology", "Orthopedics", "General Medicine", "Pulmonology"],
      imageUrl: "https://images.unsplash.com/photo-1587351021759-3e566b9af9ef?auto=format&fit=crop&q=80&w=2000"
    });

    const hFortis = await storage.createHospital({
      name: "Fortis Hospital",
      location: "Bannerghatta Road, Bangalore",
      contact: "080-66214444",
      specializations: ["Cardiology", "Gastroenterology", "Dermatology", "Pediatrics"],
      imageUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=2000"
    });

    const hMax = await storage.createHospital({
      name: "Max Super Speciality Hospital",
      location: "Saket, New Delhi",
      contact: "011-26515050",
      specializations: ["Neurology", "Orthopedics", "General Medicine", "Pulmonology"],
      imageUrl: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&q=80&w=2000"
    });

    const hAIIMS = await storage.createHospital({
      name: "AIIMS Hospital",
      location: "Ansari Nagar, New Delhi",
      contact: "011-26588500",
      specializations: ["Cardiology", "Neurology", "General Medicine", "Dermatology", "Pediatrics"],
      imageUrl: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&q=80&w=2000"
    });

    const hMedanta = await storage.createHospital({
      name: "Medanta Hospital",
      location: "Sector 38, Gurugram",
      contact: "0124-4141414",
      specializations: ["Cardiology", "Gastroenterology", "Orthopedics", "Pulmonology"],
      imageUrl: "https://images.unsplash.com/photo-1551190822-a9ce113ac100?auto=format&fit=crop&q=80&w=2000"
    });
  }

  // Seed Admin if not exists
  const adminUser = await storage.getUserByUsername("admin");
  if (!adminUser) {
    console.log("Seeding admin user...");
    await storage.createUser({
      username: "admin",
      password: hashedPassword,
      role: "admin",
      name: "Admin User",
      email: "admin@health.com"
    });
  }

  // Clean up pre-seeded mock doctors (usernames starting with "doctor")
  try {
    const doctorsToDelete = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "doctor"), like(users.username, "doctor%")));

    if (doctorsToDelete.length > 0) {
      console.log(`Cleaning up ${doctorsToDelete.length} pre-seeded mock doctors...`);
      for (const dUser of doctorsToDelete) {
        const docProfile = await storage.getDoctorByUserId(dUser.id);
        if (docProfile) {
          // Delete prescriptions linked to this doctor's appointments
          const apts = await db.select({ id: appointments.id }).from(appointments).where(eq(appointments.doctorId, docProfile.id));
          for (const apt of apts) {
            await db.delete(prescriptions).where(eq(prescriptions.appointmentId, apt.id));
          }
          // Delete appointments
          await db.delete(appointments).where(eq(appointments.doctorId, docProfile.id));
          // Delete doctor profile
          await db.delete(doctors).where(eq(doctors.id, docProfile.id));
        }
        // Delete user
        await db.delete(users).where(eq(users.id, dUser.id));
      }
    }
  } catch (err) {
    console.error("Failed to clean up pre-seeded mock doctors:", err);
  }

  // Clean up pre-seeded mock patient ("patient1")
  try {
    const patientToDelete = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, "patient1"));

    if (patientToDelete.length > 0) {
      console.log("Cleaning up pre-seeded mock patient...");
      for (const pUser of patientToDelete) {
        const patProfile = await storage.getPatientByUserId(pUser.id);
        if (patProfile) {
          // Delete prescriptions linked to this patient's appointments
          const apts = await db.select({ id: appointments.id }).from(appointments).where(eq(appointments.patientId, patProfile.id));
          for (const apt of apts) {
            await db.delete(prescriptions).where(eq(prescriptions.appointmentId, apt.id));
          }
          // Delete appointments
          await db.delete(appointments).where(eq(appointments.patientId, patProfile.id));
          // Delete patient profile
          await db.delete(patients).where(eq(patients.id, patProfile.id));
        }
        // Delete user
        await db.delete(users).where(eq(users.id, pUser.id));
      }
    }
  } catch (err) {
    console.error("Failed to clean up pre-seeded mock patient:", err);
  }

  console.log("Database seeding check complete.");
}
