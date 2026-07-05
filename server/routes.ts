import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { api } from "@shared/routes";
import { z } from "zod";
import {
  insertAppointmentSchema,
  insertPrescriptionSchema,
  users, patients, doctors,
  type InsertPrescription,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { sendAppointmentBookedEmails, sendAppointmentStatusEmail, sendVideoCallLinkEmail } from "./email";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
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

      const appointment = await storage.createAppointment(input);

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

  // Seed Data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingHospitals = await storage.getHospitals();
  if (existingHospitals.length > 0) return;

  console.log("Seeding database...");
  const hashedPassword = await hashPassword("password123");

  // Create Hospitals
  const h1 = await storage.createHospital({
    name: "City General Hospital",
    location: "Downtown",
    contact: "555-0123",
    specializations: ["Cardiology", "Neurology", "General Surgery"],
    imageUrl: "https://images.unsplash.com/photo-1587351021759-3e566b9af9ef?auto=format&fit=crop&q=80&w=2000"
  });

  const h2 = await storage.createHospital({
    name: "Sunrise Pediatrics",
    location: "Westside",
    contact: "555-0199",
    specializations: ["Pediatrics", "Vaccination"],
    imageUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=2000"
  });

  // Create Admin
  await storage.createUser({
    username: "admin",
    password: hashedPassword,
    role: "admin",
    name: "Admin User",
    email: "admin@health.com"
  });

  // Create Doctors
  const d1User = await storage.createUser({
    username: "doctor1",
    password: hashedPassword,
    role: "doctor",
    name: "Dr. Sarah Smith",
    email: "sarah@citygeneral.com"
  });
  await storage.createDoctor({
    userId: d1User.id,
    specialization: "Cardiology",
    hospitalId: h1.id,
    experience: 10,
    consultationFee: 150,
    availability: ["Mon 09:00-17:00", "Wed 09:00-17:00", "Fri 09:00-13:00"]
  });

  const d2User = await storage.createUser({
    username: "doctor2",
    password: hashedPassword,
    role: "doctor",
    name: "Dr. John Doe",
    email: "john@sunrise.com"
  });
  await storage.createDoctor({
    userId: d2User.id,
    specialization: "Pediatrics",
    hospitalId: h2.id,
    experience: 5,
    consultationFee: 100,
    availability: ["Tue 09:00-17:00", "Thu 09:00-17:00"]
  });

  // Create Patients
  const p1User = await storage.createUser({
    username: "patient1",
    password: hashedPassword,
    role: "patient",
    name: "Alice Johnson",
    email: "alice@example.com"
  });
  await storage.createPatient({
    userId: p1User.id,
    age: 30,
    gender: "Female",
    contact: "555-1001",
    medicalHistory: "None"
  });

  console.log("Database seeded successfully!");
}
