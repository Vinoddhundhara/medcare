/**
 * Hospital Admin API Routes
 * All routes require hospital session (via requireHospitalAuth middleware)
 * Hospital admins can ONLY access their own hospital's data.
 */
import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { requireHospitalAuth, getCurrentHospital } from "./hospitalAuth";
import { broadcastUpdate } from "./routes";
import {
  insertDepartmentSchema, insertDoctorAvailabilitySchema,
  insertReviewSchema, users, doctors, patients, appointments,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc, gte, lte, between } from "drizzle-orm";
import { z } from "zod";

// Helper: safely get a string param from Express 5 (params can be string | string[])
function param(req: Request, key: string): string {
  const v = req.params[key];
  return Array.isArray(v) ? v[0] : (v ?? "");
}

// ─────────────────────────────────────────────────────────────────
//  Helper: assert the appointmentId belongs to this hospital
// ─────────────────────────────────────────────────────────────────
async function ownAppointment(hospitalId: number, appointmentId: number) {
  const appt = await storage.getAppointment(appointmentId);
  return appt?.hospitalId === hospitalId ? appt : null;
}

// ─────────────────────────────────────────────────────────────────
//  Helper: assert the doctorId belongs to this hospital
// ─────────────────────────────────────────────────────────────────
async function ownDoctor(hospitalId: number, doctorId: number) {
  const doc = await storage.getDoctor(doctorId);
  return doc?.hospitalId === hospitalId ? doc : null;
}

export function registerHospitalRoutes(app: Express) {
  // ════════════════════════════════════════════════════════════
  //  DASHBOARD STATS
  // ════════════════════════════════════════════════════════════
  app.get("/api/hospital/dashboard", requireHospitalAuth, async (req: Request, res: Response) => {
    try {
      const hospital = (await getCurrentHospital(req))!;
      const hId = hospital.id;

      const allAppts = await storage.getAppointmentsByHospital(hId);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

      const todayAppts    = allAppts.filter(a => { const d = new Date(a.date); return d >= today && d < tomorrow; });
      const upcomingAppts = allAppts.filter(a => ["pending", "confirmed"].includes(a.status));
      const completedAppts = allAppts.filter(a => a.status === "completed");
      const cancelledAppts = allAppts.filter(a => a.status === "cancelled");

      const revenue = allAppts
        .filter(a => a.status === "completed" || a.paymentStatus === "paid")
        .reduce((sum, a) => sum + (a.consultationFee || 0), 0);

      const [dcRow]   = await db.select({ count: sql<number>`count(*)::int` }).from(doctors).where(eq(doctors.hospitalId, hId));
      const deptCount = (await storage.getDepartments(hId)).length;
      const patients  = await storage.getAllPatients(hId);

      // Chart: last 30 days appointments per day
      const chartData = buildDailyChart(allAppts, 30);
      // Revenue chart: last 6 months
      const revenueChart = buildMonthlyRevenueChart(allAppts, 6);

      return res.json({
        today:       todayAppts.length,
        upcoming:    upcomingAppts.length,
        completed:   completedAppts.length,
        cancelled:   cancelledAppts.length,
        totalAppointments: allAppts.length,
        revenue,
        doctorCount: dcRow?.count ?? 0,
        patientCount: patients.length,
        departmentCount: deptCount,
        recentAppointments: allAppts.slice(0, 10),
        appointmentChart: chartData,
        revenueChart,
      });
    } catch (err) {
      console.error("[Hospital Dashboard]", err);
      return res.status(500).json({ message: "Failed to load dashboard" });
    }
  });

  // ════════════════════════════════════════════════════════════
  //  DEPARTMENTS
  // ════════════════════════════════════════════════════════════
  app.get("/api/hospital/departments", requireHospitalAuth, async (req: Request, res: Response) => {
    const h = (await getCurrentHospital(req))!;
    const depts = await storage.getDepartments(h.id);
    return res.json(depts);
  });

  app.post("/api/hospital/departments", requireHospitalAuth, async (req: Request, res: Response) => {
    try {
      const h = (await getCurrentHospital(req))!;
      const input = insertDepartmentSchema.parse({ ...req.body, hospitalId: h.id });
      const dept = await storage.createDepartment(input);
      return res.status(201).json(dept);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      return res.status(500).json({ message: "Failed to create department" });
    }
  });

  app.patch("/api/hospital/departments/:id", requireHospitalAuth, async (req: Request, res: Response) => {
    try {
      const h = (await getCurrentHospital(req))!;
      const id = parseInt(param(req, "id"));
      const dept = await storage.getDepartment(id);
      if (!dept || dept.hospitalId !== h.id) return res.status(404).json({ message: "Not found" });
      const updated = await storage.updateDepartment(id, req.body);
      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ message: "Failed to update department" });
    }
  });

  app.delete("/api/hospital/departments/:id", requireHospitalAuth, async (req: Request, res: Response) => {
    try {
      const h = (await getCurrentHospital(req))!;
      const id = parseInt(param(req, "id"));
      const dept = await storage.getDepartment(id);
      if (!dept || dept.hospitalId !== h.id) return res.status(404).json({ message: "Not found" });
      await storage.deleteDepartment(id);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ message: "Failed to delete department" });
    }
  });

  // ════════════════════════════════════════════════════════════
  //  DOCTORS
  // ════════════════════════════════════════════════════════════
  app.get("/api/hospital/doctors", requireHospitalAuth, async (req: Request, res: Response) => {
    const h = (await getCurrentHospital(req))!;
    const docs = await storage.getDoctors({
      hospitalId: h.id,
      search: req.query.search as string,
      departmentId: req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined,
      status: req.query.status as string,
    });
    return res.json(docs);
  });

  app.post("/api/hospital/doctors", requireHospitalAuth, async (req: Request, res: Response) => {
    try {
      const h = (await getCurrentHospital(req))!;
      const {
        name, email,
        specialization, experience, consultationFee, education,
        languages, bio, profileImage, departmentId, availability,
        status,
      } = req.body;

      if (!email) return res.status(400).json({ message: "Doctor email is required" });

      // Check if a user with this email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) return res.status(400).json({ message: "A user with this email already exists" });

      // Doctor logs in with their email — username = email
      // Doctor's password = hospital's own password (already hashed in DB)
      const newUser = await storage.createUser({
        username: email,          // email is the login username
        password: h.password,     // same hashed password as the hospital
        role: "doctor",
        name: name,
        email: email,
      });

      const doctor = await storage.createDoctor({
        userId: newUser.id,
        hospitalId: h.id,
        departmentId: departmentId ? parseInt(departmentId) : null,
        specialization: specialization || "General Medicine",
        experience: parseInt(experience) || 0,
        consultationFee: parseInt(consultationFee) || 500,
        education: education,
        languages: languages || [],
        bio: bio,
        profileImage: profileImage,
        availability: availability || [],
        status: status || "active",
        qualification: education || "MBBS",
      });

      const doctorWithUser = await storage.getDoctorWithUser(doctor.id);
      broadcastUpdate({ type: "DOCTOR_ADDED", payload: { hospitalId: h.id } });
      return res.status(201).json(doctorWithUser);
    } catch (err: any) {
      console.error("[Hospital Add Doctor]", err);
      return res.status(500).json({ message: err.message || "Failed to add doctor" });
    }
  });

  app.patch("/api/hospital/doctors/:id", requireHospitalAuth, async (req: Request, res: Response) => {
    try {
      const h = (await getCurrentHospital(req))!;
      const id = parseInt(param(req, "id"));
      const doc = await ownDoctor(h.id, id);
      if (!doc) return res.status(404).json({ message: "Doctor not found or not in your hospital" });

      const { name, email, ...doctorFields } = req.body;

      // Update user fields if provided
      if (name || email) {
        await storage.updateUser(doc.userId, { ...(name && { name }), ...(email && { email }) });
      }

      // Update doctor fields
      const updates: any = {};
      const allowed = [
        "specialization", "experience", "consultationFee", "education",
        "languages", "bio", "profileImage", "departmentId", "availability",
        "status", "qualification", "onlineFee", "offlineFee", "videoFee",
        "onlineEnabled", "offlineEnabled", "videoEnabled",
      ];
      for (const key of allowed) {
        if (doctorFields[key] !== undefined) updates[key] = doctorFields[key];
      }

      const updated = await storage.updateDoctor(id, updates);
      broadcastUpdate({ type: "AVAILABILITY_UPDATED", payload: { doctorId: id } });
      return res.json(updated);
    } catch (err) {
      console.error("[Hospital Update Doctor]", err);
      return res.status(500).json({ message: "Failed to update doctor" });
    }
  });

  app.delete("/api/hospital/doctors/:id", requireHospitalAuth, async (req: Request, res: Response) => {
    try {
      const h = (await getCurrentHospital(req))!;
      const id = parseInt(param(req, "id"));
      const doc = await ownDoctor(h.id, id);
      if (!doc) return res.status(404).json({ message: "Not found" });

      // Deactivate rather than hard delete to preserve appointment history
      await storage.updateDoctor(id, { status: "inactive" });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ message: "Failed to delete doctor" });
    }
  });

  app.patch("/api/hospital/doctors/:id/status", requireHospitalAuth, async (req: Request, res: Response) => {
    try {
      const h = (await getCurrentHospital(req))!;
      const id = parseInt(param(req, "id"));
      const { status } = req.body;
      if (!["active", "inactive"].includes(status)) return res.status(400).json({ message: "Invalid status" });
      const doc = await ownDoctor(h.id, id);
      if (!doc) return res.status(404).json({ message: "Not found" });
      const updated = await storage.updateDoctor(id, { status });
      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ message: "Failed to update status" });
    }
  });

  // ════════════════════════════════════════════════════════════
  //  DOCTOR AVAILABILITY
  // ════════════════════════════════════════════════════════════
  app.get("/api/hospital/doctors/:id/availability", requireHospitalAuth, async (req: Request, res: Response) => {
    try {
      const h = (await getCurrentHospital(req))!;
      const id = parseInt(param(req, "id"));
      const doc = await ownDoctor(h.id, id);
      if (!doc) return res.status(404).json({ message: "Not found" });
      const avail = await storage.getDoctorAvailability(id);
      return res.json(avail);
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  app.post("/api/hospital/doctors/:id/availability", requireHospitalAuth, async (req: Request, res: Response) => {
    try {
      const h = (await getCurrentHospital(req))!;
      const doctorId = parseInt(param(req, "id"));
      const doc = await ownDoctor(h.id, doctorId);
      if (!doc) return res.status(404).json({ message: "Not found" });

      const slots: any[] = Array.isArray(req.body) ? req.body : [req.body];
      const saved = [];
      for (const slot of slots) {
        const parsed = insertDoctorAvailabilitySchema.parse({ ...slot, doctorId });
        const result = await storage.upsertDoctorAvailability({
          ...parsed,
          leaveDates: Array.isArray(parsed.leaveDates) ? parsed.leaveDates as string[] : [],
        });
        saved.push(result);
      }
      broadcastUpdate({ type: "AVAILABILITY_UPDATED", payload: { doctorId } });
      return res.json(saved);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      return res.status(500).json({ message: "Failed to save availability" });
    }
  });

  // ════════════════════════════════════════════════════════════
  //  APPOINTMENTS
  // ════════════════════════════════════════════════════════════
  app.get("/api/hospital/appointments", requireHospitalAuth, async (req: Request, res: Response) => {
    try {
      const h = (await getCurrentHospital(req))!;
      const filters: any = {};
      if (req.query.status) filters.status = req.query.status;
      const appts = await storage.getAppointmentsByHospital(h.id, filters);
      return res.json(appts);
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.get("/api/hospital/appointments/:id", requireHospitalAuth, async (req: Request, res: Response) => {
    const h = (await getCurrentHospital(req))!;
    const appt = await ownAppointment(h.id, parseInt(param(req, "id")));
    if (!appt) return res.status(404).json({ message: "Not found" });
    return res.json(appt);
  });

  app.patch("/api/hospital/appointments/:id/status", requireHospitalAuth, async (req: Request, res: Response) => {
    try {
      const h = (await getCurrentHospital(req))!;
      const id = parseInt(param(req, "id"));
      const { status } = req.body;
      const validStatuses = ["pending", "confirmed", "rejected", "completed", "cancelled"];
      if (!validStatuses.includes(status)) return res.status(400).json({ message: "Invalid status" });

      const appt = await ownAppointment(h.id, id);
      if (!appt) return res.status(404).json({ message: "Not found" });

      const updated = await storage.updateAppointmentStatus(id, status);
      broadcastUpdate({ type: "APPOINTMENT_UPDATED", payload: { hospitalId: h.id, appointmentId: id } });

      // Create notification
      await storage.createHospitalNotification({
        hospitalId: h.id,
        type: status === "cancelled" ? "cancelled_appointment" : "new_appointment",
        title: `Appointment ${status}`,
        message: `Appointment #${id} has been ${status}`,
        isRead: false,
        relatedId: id,
      });

      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ message: "Failed to update appointment" });
    }
  });

  app.patch("/api/hospital/appointments/:id/assign-doctor", requireHospitalAuth, async (req: Request, res: Response) => {
    try {
      const h = (await getCurrentHospital(req))!;
      const id = parseInt(param(req, "id"));
      const { doctorId } = req.body;

      const appt = await ownAppointment(h.id, id);
      if (!appt) return res.status(404).json({ message: "Not found" });

      const doc = await ownDoctor(h.id, parseInt(doctorId));
      if (!doc) return res.status(400).json({ message: "Doctor not found in your hospital" });

      const updated = await storage.updateAppointment(id, { doctorId: parseInt(doctorId) });
      broadcastUpdate({ type: "APPOINTMENT_UPDATED", payload: { hospitalId: h.id } });
      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ message: "Failed to assign doctor" });
    }
  });

  app.patch("/api/hospital/appointments/:id/reschedule", requireHospitalAuth, async (req: Request, res: Response) => {
    try {
      const h = (await getCurrentHospital(req))!;
      const id = parseInt(param(req, "id"));
      const { date } = req.body;
      const appt = await ownAppointment(h.id, id);
      if (!appt) return res.status(404).json({ message: "Not found" });
      const updated = await storage.updateAppointment(id, { date: new Date(date) });
      broadcastUpdate({ type: "APPOINTMENT_UPDATED", payload: { hospitalId: h.id } });
      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ message: "Failed to reschedule" });
    }
  });

  // ════════════════════════════════════════════════════════════
  //  PATIENTS
  // ════════════════════════════════════════════════════════════
  app.get("/api/hospital/patients", requireHospitalAuth, async (req: Request, res: Response) => {
    try {
      const pats = await storage.getAllPatients();
      return res.json(pats);
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  app.get("/api/hospital/patients/:id/appointments", requireHospitalAuth, async (req: Request, res: Response) => {
    try {
      const h = (await getCurrentHospital(req))!;
      const patientId = parseInt(param(req, "id"));
      const appts = await storage.getAppointmentsByPatient(patientId);
      // Filter to this hospital only
      const filtered = appts.filter(a => a.hospitalId === h.id);
      return res.json(filtered);
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch patient appointments" });
    }
  });

  // ════════════════════════════════════════════════════════════
  //  REVIEWS
  // ════════════════════════════════════════════════════════════
  app.get("/api/hospital/reviews", requireHospitalAuth, async (req: Request, res: Response) => {
    try {
      const h = (await getCurrentHospital(req))!;
      const revs = await storage.getReviewsByHospital(h.id);
      const avg = await storage.getAverageRating("hospital", h.id);
      return res.json({ reviews: revs, averageRating: avg });
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // ════════════════════════════════════════════════════════════
  //  ANALYTICS
  // ════════════════════════════════════════════════════════════
  app.get("/api/hospital/analytics", requireHospitalAuth, async (req: Request, res: Response) => {
    try {
      const h = (await getCurrentHospital(req))!;
      const allAppts = await storage.getAppointmentsByHospital(h.id);

      const departmentStats = await getDepartmentStats(h.id, allAppts);
      const topDoctors = await getTopDoctors(h.id, allAppts);
      const cancellationRate = allAppts.length
        ? Math.round((allAppts.filter(a => a.status === "cancelled").length / allAppts.length) * 100)
        : 0;

      return res.json({
        appointmentsPerDay: buildDailyChart(allAppts, 30),
        revenuePerMonth:    buildMonthlyRevenueChart(allAppts, 6),
        departmentStats,
        topDoctors,
        cancellationRate,
        statusBreakdown: {
          pending:   allAppts.filter(a => a.status === "pending").length,
          confirmed: allAppts.filter(a => a.status === "confirmed").length,
          completed: allAppts.filter(a => a.status === "completed").length,
          cancelled: allAppts.filter(a => a.status === "cancelled").length,
          rejected:  allAppts.filter(a => a.status === "rejected").length,
        },
      });
    } catch (err) {
      console.error("[Hospital Analytics]", err);
      return res.status(500).json({ message: "Failed to load analytics" });
    }
  });

  // ════════════════════════════════════════════════════════════
  //  NOTIFICATIONS
  // ════════════════════════════════════════════════════════════
  app.get("/api/hospital/notifications", requireHospitalAuth, async (req: Request, res: Response) => {
    const h = (await getCurrentHospital(req))!;
    const notifs = await storage.getHospitalNotifications(h.id);
    return res.json(notifs);
  });

  app.patch("/api/hospital/notifications/:id/read", requireHospitalAuth, async (req: Request, res: Response) => {
    await storage.markHospitalNotificationRead(parseInt(param(req, "id")));
    return res.json({ success: true });
  });

  app.post("/api/hospital/notifications/read-all", requireHospitalAuth, async (req: Request, res: Response) => {
    const h = (await getCurrentHospital(req))!;
    await storage.markAllHospitalNotificationsRead(h.id);
    return res.json({ success: true });
  });

  // ════════════════════════════════════════════════════════════
  //  HOSPITAL PROFILE (public-facing details)
  // ════════════════════════════════════════════════════════════
  // Public: hospital details with stats for patient-facing pages
  app.get("/api/hospitals/:id/details", async (req: Request, res: Response) => {
    try {
      const id = parseInt(param(req, "id"));
      const hospital = await storage.getHospitalWithStats(id);
      if (!hospital) return res.status(404).json({ message: "Hospital not found" });
      const { password: _pw, ...safe } = hospital;
      return res.json(safe);
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch hospital details" });
    }
  });

  // Public: doctors for a hospital (patient-facing)
  app.get("/api/hospitals/:id/doctors", async (req: Request, res: Response) => {
    try {
      const hospitalId = parseInt(param(req, "id"));
      const docs = await storage.getDoctors({
        hospitalId,
        departmentId: req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined,
        specialization: req.query.specialization as string,
        status: "active",
      });
      return res.json(docs);
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch doctors" });
    }
  });

  // Public: departments for a hospital
  app.get("/api/hospitals/:id/departments", async (req: Request, res: Response) => {
    try {
      const hospitalId = parseInt(param(req, "id"));
      const depts = await storage.getDepartments(hospitalId);
      return res.json(depts);
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  // Public: reviews for a hospital
  app.get("/api/hospitals/:id/reviews", async (req: Request, res: Response) => {
    try {
      const hospitalId = parseInt(param(req, "id"));
      const revs = await storage.getReviewsByHospital(hospitalId);
      const avg = await storage.getAverageRating("hospital", hospitalId);
      return res.json({ reviews: revs, averageRating: avg });
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Patient: submit a review
  app.post("/api/reviews", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== "patient") return res.sendStatus(401);
    try {
      const patient = await storage.getPatientByUserId(req.user!.id);
      if (!patient) return res.status(400).json({ message: "Patient profile required" });
      const input = insertReviewSchema.parse({ ...req.body, patientId: patient.id });
      const review = await storage.createReview(input);
      return res.status(201).json(review);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      return res.status(500).json({ message: "Failed to submit review" });
    }
  });

  // Doctor availability (public, for booking)
  app.get("/api/doctors/:id/availability", async (req: Request, res: Response) => {
    try {
      const avail = await storage.getDoctorAvailability(parseInt(param(req, "id")));
      return res.json(avail);
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch availability" });
    }
  });
}

// ─────────────────────────────────────────────────────────────────
//  Analytics helpers
// ─────────────────────────────────────────────────────────────────
function buildDailyChart(appts: any[], days: number) {
  const result: { date: string; count: number }[] = [];
  const now = new Date();
  // Show past 14 days + next 14 days (centered around today)
  const half = Math.floor(days / 2);
  for (let i = -half; i < days - half; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    const count = appts.filter(a => { const ad = new Date(a.date); return ad >= d && ad < next; }).length;
    result.push({ date: d.toISOString().split("T")[0], count });
  }
  return result;
}

function buildMonthlyRevenueChart(appts: any[], months: number) {
  const result: { month: string; revenue: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const label = d.toLocaleString("default", { month: "short", year: "numeric" });
    const revenue = appts
      .filter(a => {
        const ad = new Date(a.date);
        // Count completed appointments OR explicitly paid ones
        return ad >= d && ad < next && (a.status === "completed" || a.paymentStatus === "paid");
      })
      .reduce((s: number, a: any) => s + (a.consultationFee || 0), 0);
    result.push({ month: label, revenue });
  }
  return result;
}

async function getDepartmentStats(hospitalId: number, appts: any[]) {
  const depts = await storage.getDepartments(hospitalId);
  return depts.map(dept => {
    const deptDoctors = appts.filter(a => a.doctor?.departmentId === dept.id);
    return { name: dept.name, patients: deptDoctors.length };
  });
}

async function getTopDoctors(hospitalId: number, appts: any[]) {
  const docs = await storage.getDoctors({ hospitalId, status: "active" });
  const withCount = docs.map(d => ({
    id: d.id,
    name: d.user.name,
    specialization: d.specialization,
    appointmentCount: appts.filter(a => a.doctorId === d.id).length,
  }));
  return withCount.sort((a, b) => b.appointmentCount - a.appointmentCount).slice(0, 5);
}
