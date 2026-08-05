import {
  users, patients, doctors, hospitals, departments, appointments, prescriptions,
  medicineReminders, notificationTokens, reviews, hospitalNotifications, doctorAvailability,
  type User, type InsertUser,
  type Patient, type InsertPatient,
  type Doctor, type InsertDoctor,
  type Hospital, type InsertHospital,
  type Department, type InsertDepartment,
  type DoctorAvailability, type InsertDoctorAvailability,
  type Appointment, type InsertAppointment,
  type Prescription, type InsertPrescription,
  type MedicineReminder, type InsertMedicineReminder,
  type HospitalNotification,
  type Review, type InsertReview,
  type DoctorWithUser, type PatientWithUser, type AppointmentWithDetails,
  type HospitalWithStats, type UpdateAppointmentStatus,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, like, desc, sql, inArray } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

// ─────────────────────────────────────────────
//  Interface
// ─────────────────────────────────────────────
export interface IStorage {
  // User
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;

  // Patient
  createPatient(patient: InsertPatient): Promise<Patient>;
  getPatient(id: number): Promise<Patient | undefined>;
  getPatientByUserId(userId: number): Promise<Patient | undefined>;
  getPatientWithUser(id: number): Promise<PatientWithUser | undefined>;
  getAllPatients(hospitalId?: number): Promise<PatientWithUser[]>;

  // Doctor
  createDoctor(doctor: InsertDoctor): Promise<Doctor>;
  getDoctor(id: number): Promise<Doctor | undefined>;
  getDoctorByUserId(userId: number): Promise<Doctor | undefined>;
  getDoctorWithUser(id: number): Promise<DoctorWithUser | undefined>;
  getDoctors(filters?: { specialization?: string; hospitalId?: number; departmentId?: number; search?: string; status?: string }): Promise<DoctorWithUser[]>;
  updateDoctor(id: number, updates: Partial<InsertDoctor>): Promise<Doctor>;
  deleteDoctor(id: number): Promise<void>;

  // Doctor Availability
  getDoctorAvailability(doctorId: number): Promise<DoctorAvailability[]>;
  upsertDoctorAvailability(data: InsertDoctorAvailability): Promise<DoctorAvailability>;
  deleteDoctorAvailabilityByDay(doctorId: number, dayOfWeek: string): Promise<void>;

  // Hospital
  createHospital(hospital: InsertHospital): Promise<Hospital>;
  getHospitals(filters?: { city?: string; search?: string; status?: string }): Promise<Hospital[]>;
  getHospital(id: number): Promise<Hospital | undefined>;
  getHospitalByEmail(email: string): Promise<Hospital | undefined>;
  updateHospital(id: number, updates: Partial<InsertHospital>): Promise<Hospital>;
  getHospitalWithStats(id: number): Promise<HospitalWithStats | undefined>;

  // Department
  createDepartment(department: InsertDepartment): Promise<Department>;
  getDepartments(hospitalId: number): Promise<Department[]>;
  getDepartment(id: number): Promise<Department | undefined>;
  updateDepartment(id: number, updates: Partial<InsertDepartment>): Promise<Department>;
  deleteDepartment(id: number): Promise<void>;

  // Appointment
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  getAppointmentsByPatient(patientId: number): Promise<AppointmentWithDetails[]>;
  getAppointmentsByDoctor(doctorId: number): Promise<AppointmentWithDetails[]>;
  getAppointmentsByHospital(hospitalId: number, filters?: { status?: string; date?: Date }): Promise<AppointmentWithDetails[]>;
  updateAppointmentStatus(id: number, status: UpdateAppointmentStatus["status"]): Promise<Appointment>;
  updateAppointment(id: number, updates: Partial<InsertAppointment>): Promise<Appointment>;
  updateVideoCallLink(id: number, link: string): Promise<Appointment>;

  // Prescription
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  getPrescriptionsByAppointment(appointmentId: number): Promise<Prescription[]>;

  // Medicine Reminder
  createMedicineReminder(reminder: InsertMedicineReminder): Promise<MedicineReminder>;
  getMedicineRemindersByUser(userId: number): Promise<MedicineReminder[]>;
  updateMedicineReminder(id: number, updates: Partial<InsertMedicineReminder>): Promise<MedicineReminder>;
  deleteMedicineReminder(id: number): Promise<void>;

  // Reviews
  createReview(review: InsertReview): Promise<Review>;
  getReviewsByHospital(hospitalId: number): Promise<(Review & { patient: PatientWithUser })[]>;
  getReviewsByDoctor(doctorId: number): Promise<(Review & { patient: PatientWithUser })[]>;
  getAverageRating(type: "hospital" | "doctor", id: number): Promise<number>;

  // Hospital Notifications
  createHospitalNotification(data: Omit<HospitalNotification, "id" | "createdAt">): Promise<HospitalNotification>;
  getHospitalNotifications(hospitalId: number): Promise<HospitalNotification[]>;
  markHospitalNotificationRead(id: number): Promise<void>;
  markAllHospitalNotificationsRead(hospitalId: number): Promise<void>;

  sessionStore: session.Store;
}

// ─────────────────────────────────────────────
//  Implementation
// ─────────────────────────────────────────────
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ pool, createTableIfMissing: true });
  }

  // ── Users ──────────────────────────────────
  async getUser(id: number) {
    const [u] = await db.select().from(users).where(eq(users.id, id));
    return u;
  }
  async getUserByUsername(username: string) {
    const [u] = await db.select().from(users).where(eq(users.username, username));
    return u;
  }
  async getUserByEmail(email: string) {
    const [u] = await db.select().from(users).where(eq(users.email, email));
    return u;
  }
  async createUser(insertUser: InsertUser) {
    const [u] = await db.insert(users).values(insertUser).returning();
    return u;
  }
  async updateUser(id: number, updates: Partial<InsertUser>) {
    const [u] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return u;
  }

  // ── Patients ───────────────────────────────
  async createPatient(patient: InsertPatient) {
    const [p] = await db.insert(patients).values(patient).returning();
    return p;
  }
  async getPatient(id: number) {
    const [p] = await db.select().from(patients).where(eq(patients.id, id));
    return p;
  }
  async getPatientByUserId(userId: number) {
    const [p] = await db.select().from(patients).where(eq(patients.userId, userId));
    return p;
  }
  async getPatientWithUser(id: number): Promise<PatientWithUser | undefined> {
    const result = await db.select({ patient: patients, user: users })
      .from(patients).innerJoin(users, eq(patients.userId, users.id)).where(eq(patients.id, id));
    if (!result.length) return undefined;
    return { ...result[0].patient, user: result[0].user };
  }
  async getAllPatients(hospitalId?: number): Promise<PatientWithUser[]> {
    if (hospitalId) {
      // patients who have had appointments at this hospital
      const rows = await db
        .selectDistinct({ patient: patients, user: users })
        .from(patients)
        .innerJoin(users, eq(patients.userId, users.id))
        .innerJoin(appointments, and(
          eq(appointments.patientId, patients.id),
          eq(appointments.hospitalId, hospitalId)
        ));
      return rows.map(r => ({ ...r.patient, user: r.user }));
    }
    const rows = await db.select({ patient: patients, user: users })
      .from(patients).innerJoin(users, eq(patients.userId, users.id));
    return rows.map(r => ({ ...r.patient, user: r.user }));
  }

  // ── Doctors ────────────────────────────────
  async createDoctor(doctor: InsertDoctor) {
    const [d] = await db.insert(doctors).values(doctor).returning();
    return d;
  }
  async getDoctor(id: number) {
    const [d] = await db.select().from(doctors).where(eq(doctors.id, id));
    return d;
  }
  async getDoctorByUserId(userId: number) {
    const [d] = await db.select().from(doctors).where(eq(doctors.userId, userId));
    return d;
  }
  async getDoctorWithUser(id: number): Promise<DoctorWithUser | undefined> {
    const result = await db
      .select({ doctor: doctors, user: users, hospital: hospitals, department: departments })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .leftJoin(hospitals, eq(doctors.hospitalId, hospitals.id))
      .leftJoin(departments, eq(doctors.departmentId, departments.id))
      .where(eq(doctors.id, id));
    if (!result.length) return undefined;
    return { ...result[0].doctor, user: result[0].user, hospital: result[0].hospital, department: result[0].department };
  }
  async getDoctors(filters?: {
    specialization?: string; hospitalId?: number; departmentId?: number;
    search?: string; status?: string;
  }): Promise<DoctorWithUser[]> {
    const conditions: any[] = [];
    if (filters?.specialization) conditions.push(eq(doctors.specialization, filters.specialization));
    if (filters?.hospitalId)     conditions.push(eq(doctors.hospitalId, filters.hospitalId));
    if (filters?.departmentId)   conditions.push(eq(doctors.departmentId, filters.departmentId));
    if (filters?.status)         conditions.push(eq(doctors.status, filters.status as "active" | "inactive"));
    if (filters?.search)         conditions.push(like(users.name, `%${filters.search}%`));

    const where = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    const results = await db
      .select({ doctor: doctors, user: users, hospital: hospitals, department: departments })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .leftJoin(hospitals, eq(doctors.hospitalId, hospitals.id))
      .leftJoin(departments, eq(doctors.departmentId, departments.id))
      .where(where);

    return results.map(r => ({ ...r.doctor, user: r.user, hospital: r.hospital, department: r.department }));
  }
  async updateDoctor(id: number, updates: Partial<InsertDoctor>) {
    const [d] = await db.update(doctors).set(updates).where(eq(doctors.id, id)).returning();
    return d;
  }
  async deleteDoctor(id: number) {
    await db.delete(doctors).where(eq(doctors.id, id));
  }

  // ── Doctor Availability ────────────────────
  async getDoctorAvailability(doctorId: number) {
    return db.select().from(doctorAvailability).where(eq(doctorAvailability.doctorId, doctorId));
  }
  async upsertDoctorAvailability(data: InsertDoctorAvailability): Promise<DoctorAvailability> {
    const existing = await db.select()
      .from(doctorAvailability)
      .where(and(
        eq(doctorAvailability.doctorId, data.doctorId),
        eq(doctorAvailability.dayOfWeek, data.dayOfWeek)
      ));
    if (existing.length) {
      const [u] = await db.update(doctorAvailability).set({ ...data, updatedAt: new Date() }).where(eq(doctorAvailability.id, existing[0].id)).returning();
      return u;
    }
    const [inserted] = await db.insert(doctorAvailability).values(data).returning();
    return inserted;
  }
  async deleteDoctorAvailabilityByDay(doctorId: number, dayOfWeek: string) {
    await db.delete(doctorAvailability).where(
      and(eq(doctorAvailability.doctorId, doctorId), eq(doctorAvailability.dayOfWeek, dayOfWeek))
    );
  }

  // ── Hospitals ──────────────────────────────
  async createHospital(hospital: InsertHospital) {
    const [h] = await db.insert(hospitals).values(hospital).returning();
    return h;
  }
  async getHospitals(filters?: { city?: string; search?: string; status?: string }) {
    const conditions: any[] = [];
    if (filters?.city)   conditions.push(like(hospitals.city, `%${filters.city}%`));
    if (filters?.status) conditions.push(eq(hospitals.status, filters.status as "active" | "inactive" | "pending"));
    if (filters?.search) conditions.push(like(hospitals.name, `%${filters.search}%`));
    const where = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);
    return db.select().from(hospitals).where(where).orderBy(hospitals.name);
  }
  async getHospital(id: number) {
    const [h] = await db.select().from(hospitals).where(eq(hospitals.id, id));
    return h;
  }
  async getHospitalByEmail(email: string) {
    const [h] = await db.select().from(hospitals).where(eq(hospitals.email, email));
    return h;
  }
  async updateHospital(id: number, updates: Partial<InsertHospital>) {
    const [h] = await db.update(hospitals).set({ ...updates, updatedAt: new Date() }).where(eq(hospitals.id, id)).returning();
    return h;
  }
  async getHospitalWithStats(id: number): Promise<HospitalWithStats | undefined> {
    const hospital = await this.getHospital(id);
    if (!hospital) return undefined;

    const [dcRow] = await db.select({ count: sql<number>`count(*)::int` }).from(doctors).where(eq(doctors.hospitalId, id));
    const [deptRow] = await db.select({ count: sql<number>`count(*)::int` }).from(departments).where(eq(departments.hospitalId, id));
    const [apptRow] = await db.select({ count: sql<number>`count(*)::int` }).from(appointments).where(eq(appointments.hospitalId, id));
    const [ratingRow] = await db.select({ avg: sql<number>`COALESCE(AVG(rating)::numeric(3,1), 0)` })
      .from(reviews).where(eq(reviews.hospitalId, id));
    const depts = await this.getDepartments(id);

    return {
      ...hospital,
      doctorCount: dcRow?.count ?? 0,
      departmentCount: deptRow?.count ?? 0,
      appointmentCount: apptRow?.count ?? 0,
      averageRating: Number(ratingRow?.avg ?? 0),
      departments: depts,
    };
  }

  // ── Departments ────────────────────────────
  async createDepartment(department: InsertDepartment) {
    const [d] = await db.insert(departments).values(department).returning();
    return d;
  }
  async getDepartments(hospitalId: number) {
    return db.select().from(departments).where(eq(departments.hospitalId, hospitalId)).orderBy(departments.name);
  }
  async getDepartment(id: number) {
    const [d] = await db.select().from(departments).where(eq(departments.id, id));
    return d;
  }
  async updateDepartment(id: number, updates: Partial<InsertDepartment>) {
    const [d] = await db.update(departments).set(updates).where(eq(departments.id, id)).returning();
    return d;
  }
  async deleteDepartment(id: number) {
    await db.delete(departments).where(eq(departments.id, id));
  }

  // ── Appointments ───────────────────────────
  async createAppointment(appointment: InsertAppointment) {
    const [a] = await db.insert(appointments).values(appointment).returning();
    return a;
  }
  async getAppointment(id: number) {
    const [a] = await db.select().from(appointments).where(eq(appointments.id, id));
    return a;
  }
  async getAppointmentsByPatient(patientId: number): Promise<AppointmentWithDetails[]> {
    const data = await db.query.appointments.findMany({
      where: eq(appointments.patientId, patientId),
      with: { patient: { with: { user: true } }, doctor: { with: { user: true, hospital: true } }, hospital: true },
      orderBy: desc(appointments.date),
    });
    return data as AppointmentWithDetails[];
  }
  async getAppointmentsByDoctor(doctorId: number): Promise<AppointmentWithDetails[]> {
    const data = await db.query.appointments.findMany({
      where: eq(appointments.doctorId, doctorId),
      with: { patient: { with: { user: true } }, doctor: { with: { user: true, hospital: true } }, hospital: true },
      orderBy: desc(appointments.date),
    });
    return data as AppointmentWithDetails[];
  }
  async getAppointmentsByHospital(hospitalId: number, filters?: { status?: string; date?: Date }): Promise<AppointmentWithDetails[]> {
    const conditions: any[] = [eq(appointments.hospitalId, hospitalId)];
    if (filters?.status) conditions.push(eq(appointments.status, filters.status as any));
    const data = await db.query.appointments.findMany({
      where: and(...conditions),
      with: { patient: { with: { user: true } }, doctor: { with: { user: true, hospital: true } }, hospital: true },
      orderBy: desc(appointments.date),
    });
    return data as AppointmentWithDetails[];
  }
  async updateAppointmentStatus(id: number, status: UpdateAppointmentStatus["status"]) {
    // Auto-set paymentStatus to "paid" when appointment is marked as completed
    const extraFields = status === "completed" ? { paymentStatus: "paid" as const } : {};
    const [a] = await db.update(appointments).set({ status, ...extraFields, updatedAt: new Date() }).where(eq(appointments.id, id)).returning();
    return a;
  }
  async updateAppointment(id: number, updates: Partial<InsertAppointment>) {
    const [a] = await db.update(appointments).set({ ...updates, updatedAt: new Date() }).where(eq(appointments.id, id)).returning();
    return a;
  }
  async updateVideoCallLink(id: number, link: string) {
    const [a] = await db.update(appointments).set({ videoCallLink: link, updatedAt: new Date() }).where(eq(appointments.id, id)).returning();
    return a;
  }

  // ── Prescriptions ──────────────────────────
  async createPrescription(prescription: InsertPrescription) {
    const [p] = await db.insert(prescriptions).values(prescription).returning();
    return p;
  }
  async getPrescriptionsByAppointment(appointmentId: number) {
    return db.select().from(prescriptions).where(eq(prescriptions.appointmentId, appointmentId));
  }

  // ── Medicine Reminders ─────────────────────
  async createMedicineReminder(reminder: InsertMedicineReminder) {
    const [r] = await db.insert(medicineReminders).values(reminder).returning();
    return r;
  }
  async getMedicineRemindersByUser(userId: number) {
    return db.select().from(medicineReminders).where(eq(medicineReminders.userId, userId));
  }
  async updateMedicineReminder(id: number, updates: Partial<InsertMedicineReminder>) {
    const [r] = await db.update(medicineReminders).set(updates).where(eq(medicineReminders.id, id)).returning();
    return r;
  }
  async deleteMedicineReminder(id: number) {
    await db.delete(medicineReminders).where(eq(medicineReminders.id, id));
  }

  // ── Reviews ────────────────────────────────
  async createReview(review: InsertReview) {
    const [r] = await db.insert(reviews).values(review).returning();
    return r;
  }
  async getReviewsByHospital(hospitalId: number) {
    const data = await db.query.reviews.findMany({
      where: eq(reviews.hospitalId, hospitalId),
      with: { patient: { with: { user: true } } },
      orderBy: desc(reviews.createdAt),
    });
    return data as (Review & { patient: PatientWithUser })[];
  }
  async getReviewsByDoctor(doctorId: number) {
    const data = await db.query.reviews.findMany({
      where: eq(reviews.doctorId, doctorId),
      with: { patient: { with: { user: true } } },
      orderBy: desc(reviews.createdAt),
    });
    return data as (Review & { patient: PatientWithUser })[];
  }
  async getAverageRating(type: "hospital" | "doctor", id: number) {
    const cond = type === "hospital" ? eq(reviews.hospitalId, id) : eq(reviews.doctorId, id);
    const [row] = await db.select({ avg: sql<number>`COALESCE(AVG(rating)::numeric(3,1), 0)` }).from(reviews).where(cond);
    return Number(row?.avg ?? 0);
  }

  // ── Hospital Notifications ─────────────────
  async createHospitalNotification(data: Omit<HospitalNotification, "id" | "createdAt">) {
    const [n] = await db.insert(hospitalNotifications).values(data).returning();
    return n;
  }
  async getHospitalNotifications(hospitalId: number) {
    return db.select().from(hospitalNotifications)
      .where(eq(hospitalNotifications.hospitalId, hospitalId))
      .orderBy(desc(hospitalNotifications.createdAt))
      .limit(50);
  }
  async markHospitalNotificationRead(id: number) {
    await db.update(hospitalNotifications).set({ isRead: true }).where(eq(hospitalNotifications.id, id));
  }
  async markAllHospitalNotificationsRead(hospitalId: number) {
    await db.update(hospitalNotifications).set({ isRead: true }).where(eq(hospitalNotifications.hospitalId, hospitalId));
  }
}

export const storage = new DatabaseStorage();
