import type { Express } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { setupHospitalAuth } from "./hospitalAuth";
import { registerHospitalRoutes } from "./hospitalRoutes";
import { askAI, analyzeSymptoms, answerMedicalQuestion } from "./ai";
import { api } from "@shared/routes";
import { z } from "zod";
import {
  insertAppointmentSchema,
  insertPrescriptionSchema,
  insertMedicineReminderSchema,
  users, patients, doctors, medicineReminders,
  type InsertPrescription,
  type InsertMedicineReminder,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { sendAppointmentBookedEmails, sendAppointmentStatusEmail, sendVideoCallLinkEmail } from "./email";

// WebSocket clients set — used by broadcastUpdate
let wssClients: Set<WebSocket> = new Set();

export function broadcastUpdate(payload: object) {
  const msg = JSON.stringify(payload);
  wssClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Authentication (Passport + Session)
  setupAuth(app);

  // Setup Hospital Authentication & Routes
  setupHospitalAuth(app);
  registerHospitalRoutes(app);

  // === Booked Slots (public — used by booking UI to show red slots) ===
  app.get("/api/doctors/:id/booked-slots", async (req, res) => {
    try {
      const doctorId = parseInt(req.params.id);
      const appts = await storage.getAppointmentsByDoctor(doctorId);
      // Only pending/confirmed appointments block a slot
      // When appointment completes or cancels, the slot becomes available again
      const bookedSlots = appts
        .filter(a => ["pending", "confirmed"].includes(a.status))
        .map(a => new Date(a.date).toISOString());

      // Also return structured availability so booking UI can generate correct slots
      const structuredAvail = await storage.getDoctorAvailability(doctorId);

      return res.json({ bookedSlots, structuredAvailability: structuredAvail });
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch booked slots" });
    }
  });

  // === Doctor's own availability (doctor manages their own schedule) ===
  app.get("/api/doctor/availability", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== "doctor") return res.sendStatus(401);
    try {
      const doctor = await storage.getDoctorByUserId(req.user!.id);
      if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });
      const avail = await storage.getDoctorAvailability(doctor.id);
      return res.json(avail);
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  app.post("/api/doctor/availability", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== "doctor") return res.sendStatus(401);
    try {
      const doctor = await storage.getDoctorByUserId(req.user!.id);
      if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });
      const doctorId = doctor.id;

      const slots: any[] = Array.isArray(req.body) ? req.body : [req.body];
      const saved = [];
      for (const slot of slots) {
        const { insertDoctorAvailabilitySchema } = await import("@shared/schema");
        const parsed = insertDoctorAvailabilitySchema.parse({ ...slot, doctorId });
        const result = await storage.upsertDoctorAvailability({
          ...parsed,
          leaveDates: Array.isArray(parsed.leaveDates) ? parsed.leaveDates as string[] : [],
        });
        saved.push(result);
      }
      broadcastUpdate({ type: "AVAILABILITY_UPDATED", payload: { doctorId, hospitalId: doctor.hospitalId } });
      return res.json(saved);
    } catch (err: any) {
      console.error("[Doctor Availability]", err);
      return res.status(500).json({ message: "Failed to save availability" });
    }
  });

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

      // Auto-attach hospitalId from the doctor's hospital so it appears in hospital panel
      const doctor = await storage.getDoctorWithUser(input.doctorId);
      const hospitalId = doctor?.hospitalId ?? input.hospitalId ?? null;

      const appointment = await storage.createAppointment({
        ...input,
        hospitalId,
      });

      // Broadcast to all clients for realtime updates (booked-slots, hospital panel, doctor dashboard)
      broadcastUpdate({
        type: "APPOINTMENT_CREATED",
        payload: {
          appointmentId: appointment.id,
          doctorId: appointment.doctorId,
          hospitalId: hospitalId,
        },
      });

      // Send emails in background (don't block the response)
      setImmediate(async () => {
        try {
          const doctorForEmail = await storage.getDoctorWithUser(appointment.doctorId);
          const patientWithUser = await storage.getPatientWithUser(appointment.patientId);
          if (doctorForEmail && patientWithUser) {
            await sendAppointmentBookedEmails({
              patientName: patientWithUser.user.name,
              patientEmail: patientWithUser.user.email,
              patientAge: patientWithUser.age,
              patientGender: patientWithUser.gender,
              doctorName: doctorForEmail.user.name,
              doctorEmail: doctorForEmail.user.email,
              specialization: doctorForEmail.specialization,
              hospital: doctorForEmail.hospital?.name || "",
              date: appointment.date,
              reason: appointment.reason,
            });
          }
        } catch (emailErr) {
          console.error("[Email] Failed to send appointment booked emails:", emailErr);
        }
      });

      res.status(201).json(appointment);
    } catch (err) {
      if (err instanceof z.ZodError) {
         res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
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

    // Broadcast so booked-slots & hospital panel update everywhere in realtime
    broadcastUpdate({
      type: "APPOINTMENT_UPDATED",
      payload: {
        appointmentId,
        doctorId: updated.doctorId,
        hospitalId: updated.hospitalId,
        status,
      },
    });

    res.json(updated);

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

  // === AI Chat ===
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message } = req.body;

      const reply = await askAI(message);

      res.json({ reply });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "AI request failed" });
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
          const { specialization, experience, consultationFee, availability } = profileFields;
          await db.update(doctors)
            .set({
              ...(specialization && { specialization }),
              ...(experience !== undefined && { experience: parseInt(experience) }),
              ...(consultationFee !== undefined && { consultationFee: parseInt(consultationFee) }),
              ...(availability && { availability }),
            })
            .where(eq(doctors.userId, user.id));
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

  // Setup WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  wss.on("connection", (ws) => {
    wssClients.add(ws);
    ws.on("close", () => wssClients.delete(ws));
    ws.on("error", () => wssClients.delete(ws));
  });

  return httpServer;
}

