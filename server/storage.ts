import { 
  users, patients, doctors, hospitals, appointments, prescriptions,
  type User, type InsertUser, type Patient, type Doctor, type Hospital, type Appointment, type Prescription,
  type InsertPatient, type InsertDoctor, type InsertHospital, type InsertAppointment, type InsertPrescription,
  type DoctorWithUser, type PatientWithUser, type AppointmentWithDetails,
  type UpdateAppointmentStatus
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, like, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Patient
  createPatient(patient: InsertPatient): Promise<Patient>;
  getPatient(id: number): Promise<Patient | undefined>;
  getPatientByUserId(userId: number): Promise<Patient | undefined>;
  getPatientWithUser(id: number): Promise<PatientWithUser | undefined>;

  // Doctor
  createDoctor(doctor: InsertDoctor): Promise<Doctor>;
  getDoctor(id: number): Promise<Doctor | undefined>;
  getDoctorByUserId(userId: number): Promise<Doctor | undefined>;
  getDoctorWithUser(id: number): Promise<DoctorWithUser | undefined>;
  getDoctors(filters?: { specialization?: string; hospitalId?: number; search?: string }): Promise<DoctorWithUser[]>;

  // Hospital
  createHospital(hospital: InsertHospital): Promise<Hospital>;
  getHospitals(): Promise<Hospital[]>;
  getHospital(id: number): Promise<Hospital | undefined>;

  // Appointment
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  getAppointmentsByPatient(patientId: number): Promise<AppointmentWithDetails[]>;
  getAppointmentsByDoctor(doctorId: number): Promise<AppointmentWithDetails[]>;
  updateAppointmentStatus(id: number, status: UpdateAppointmentStatus["status"]): Promise<Appointment>;

  // Prescription
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  getPrescriptionsByAppointment(appointmentId: number): Promise<Prescription[]>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const [newPatient] = await db.insert(patients).values(patient).returning();
    return newPatient;
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async getPatientByUserId(userId: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.userId, userId));
    return patient;
  }

  async getPatientWithUser(id: number): Promise<PatientWithUser | undefined> {
    const result = await db
      .select({
        patient: patients,
        user: users,
      })
      .from(patients)
      .innerJoin(users, eq(patients.userId, users.id))
      .where(eq(patients.id, id));
    
    if (result.length === 0) return undefined;
    return { ...result[0].patient, user: result[0].user };
  }

  async createDoctor(doctor: InsertDoctor): Promise<Doctor> {
    const [newDoctor] = await db.insert(doctors).values(doctor).returning();
    return newDoctor;
  }

  async getDoctor(id: number): Promise<Doctor | undefined> {
    const [doctor] = await db.select().from(doctors).where(eq(doctors.id, id));
    return doctor;
  }

  async getDoctorByUserId(userId: number): Promise<Doctor | undefined> {
    const [doctor] = await db.select().from(doctors).where(eq(doctors.userId, userId));
    return doctor;
  }

  async getDoctorWithUser(id: number): Promise<DoctorWithUser | undefined> {
    const result = await db
      .select({
        doctor: doctors,
        user: users,
        hospital: hospitals
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .leftJoin(hospitals, eq(doctors.hospitalId, hospitals.id))
      .where(eq(doctors.id, id));

    if (result.length === 0) return undefined;
    return { ...result[0].doctor, user: result[0].user, hospital: result[0].hospital };
  }

  async getDoctors(filters?: { specialization?: string; hospitalId?: number; search?: string }): Promise<DoctorWithUser[]> {
    let query = db
      .select({
        doctor: doctors,
        user: users,
        hospital: hospitals
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .leftJoin(hospitals, eq(doctors.hospitalId, hospitals.id));

    if (filters) {
      if (filters.specialization) {
        query.where(eq(doctors.specialization, filters.specialization));
      }
      if (filters.hospitalId) {
        query.where(eq(doctors.hospitalId, filters.hospitalId));
      }
      if (filters.search) {
        query.where(
          like(users.name, `%${filters.search}%`)
        );
      }
    }

    const results = await query;
    return results.map(r => ({ ...r.doctor, user: r.user, hospital: r.hospital }));
  }

  async createHospital(hospital: InsertHospital): Promise<Hospital> {
    const [newHospital] = await db.insert(hospitals).values(hospital).returning();
    return newHospital;
  }

  async getHospitals(): Promise<Hospital[]> {
    return await db.select().from(hospitals);
  }

  async getHospital(id: number): Promise<Hospital | undefined> {
    const [hospital] = await db.select().from(hospitals).where(eq(hospitals.id, id));
    return hospital;
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db.insert(appointments).values(appointment).returning();
    return newAppointment;
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment;
  }

  async getAppointmentsByPatient(patientId: number): Promise<AppointmentWithDetails[]> {
     const appointmentsData = await db.query.appointments.findMany({
      where: eq(appointments.patientId, patientId),
      with: {
        patient: {
          with: { user: true }
        },
        doctor: {
          with: { 
            user: true,
            hospital: true
          }
        }
      },
      orderBy: desc(appointments.date)
    });

    return appointmentsData as AppointmentWithDetails[];
  }

  async getAppointmentsByDoctor(doctorId: number): Promise<AppointmentWithDetails[]> {
     const appointmentsData = await db.query.appointments.findMany({
      where: eq(appointments.doctorId, doctorId),
      with: {
        patient: {
          with: { user: true }
        },
        doctor: {
          with: { 
            user: true,
            hospital: true
          }
        }
      },
      orderBy: desc(appointments.date)
    });
    return appointmentsData as AppointmentWithDetails[];
  }

  async updateAppointmentStatus(id: number, status: UpdateAppointmentStatus["status"]): Promise<Appointment> {
    const [updated] = await db
      .update(appointments)
      .set({ status })
      .where(eq(appointments.id, id))
      .returning();
    return updated;
  }

  async createPrescription(prescription: InsertPrescription): Promise<Prescription> {
    const [newPrescription] = await db.insert(prescriptions).values(prescription).returning();
    return newPrescription;
  }

  async getPrescriptionsByAppointment(appointmentId: number): Promise<Prescription[]> {
    return await db.select().from(prescriptions).where(eq(prescriptions.appointmentId, appointmentId));
  }
}

export const storage = new DatabaseStorage();
