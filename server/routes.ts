import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertAppointmentSchema, insertPrescriptionSchema } from "@shared/schema";

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
      // Force patientId to match logged in user
      const patient = await storage.getPatientByUserId(req.user!.id);
      if (!patient) return res.status(400).json({ message: "Patient profile required" });

      const input = insertAppointmentSchema.parse({
        ...req.body,
        patientId: patient.id
      });

      const appointment = await storage.createAppointment(input);
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
    if (!req.isAuthenticated() || req.user!.role !== "doctor") return res.sendStatus(401);

    const appointmentId = parseInt(req.params.id);
    const status = req.body.status;

    // Verify doctor owns this appointment
    const doctor = await storage.getDoctorByUserId(req.user!.id);
    if (!doctor) return res.sendStatus(403);

    const appointment = await storage.getAppointment(appointmentId);
    if (!appointment) return res.sendStatus(404);
    
    if (appointment.doctorId !== doctor.id) return res.sendStatus(403);

    const updated = await storage.updateAppointmentStatus(appointmentId, status);
    res.json(updated);
  });

  // === Prescriptions ===
  app.get(api.prescriptions.list.path, async (req, res) => {
    // TODO: Implement list if needed, or fetch via appointment
    res.json([]);
  });

  app.post(api.prescriptions.create.path, async (req, res) => {
     if (!req.isAuthenticated() || req.user!.role !== "doctor") return res.sendStatus(401);

     try {
       const input = insertPrescriptionSchema.parse(req.body);
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
