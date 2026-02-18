import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["patient", "doctor", "admin"] }).notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  contact: text("contact").notNull(),
  medicalHistory: text("medical_history"),
});

export const hospitals = pgTable("hospitals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  contact: text("contact").notNull(),
  specializations: text("specializations").array(), // Array of strings
  imageUrl: text("image_url"),
});

export const doctors = pgTable("doctors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  specialization: text("specialization").notNull(),
  hospitalId: integer("hospital_id").references(() => hospitals.id), // Can be null if independent? Let's assume linked for now or make optional
  experience: integer("experience").notNull(), // Years
  availability: jsonb("availability").$type<string[]>(), // e.g. ["Mon 09:00-17:00", "Tue 09:00-12:00"]
  consultationFee: integer("consultation_fee").notNull(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  doctorId: integer("doctor_id").notNull().references(() => doctors.id),
  date: timestamp("date").notNull(),
  status: text("status", { enum: ["pending", "confirmed", "rejected", "completed", "cancelled"] }).default("pending").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const prescriptions = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull().references(() => appointments.id),
  medicines: jsonb("medicines").$type<{ name: string; dosage: string; frequency: string }[]>(),
  instructions: text("instructions"),
  date: timestamp("date").defaultNow(),
});

// === RELATIONS ===

export const usersRelations = relations(users, ({ one }) => ({
  patient: one(patients, {
    fields: [users.id],
    references: [patients.userId],
  }),
  doctor: one(doctors, {
    fields: [users.id],
    references: [doctors.userId],
  }),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, {
    fields: [patients.userId],
    references: [users.id],
  }),
  appointments: many(appointments),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  user: one(users, {
    fields: [doctors.userId],
    references: [users.id],
  }),
  hospital: one(hospitals, {
    fields: [doctors.hospitalId],
    references: [hospitals.id],
  }),
  appointments: many(appointments),
}));

export const hospitalsRelations = relations(hospitals, ({ many }) => ({
  doctors: many(doctors),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  doctor: one(doctors, {
    fields: [appointments.doctorId],
    references: [doctors.id],
  }),
  prescription: one(prescriptions, {
    fields: [appointments.id],
    references: [prescriptions.appointmentId],
  }),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one }) => ({
  appointment: one(appointments, {
    fields: [prescriptions.appointmentId],
    references: [appointments.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertPatientSchema = createInsertSchema(patients).omit({ id: true });
export const insertDoctorSchema = createInsertSchema(doctors).omit({ id: true });
export const insertHospitalSchema = createInsertSchema(hospitals).omit({ id: true });
export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true, createdAt: true, status: true }); // Status defaults to pending
export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({ id: true, date: true });

// === EXPLICIT API TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Patient = typeof patients.$inferSelect;
export type Doctor = typeof doctors.$inferSelect;
export type Hospital = typeof hospitals.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type Prescription = typeof prescriptions.$inferSelect;

// Registration Request (Complex)
export const registerUserSchema = insertUserSchema.extend({
  patientDetails: insertPatientSchema.omit({ userId: true }).optional(),
  doctorDetails: insertDoctorSchema.omit({ userId: true }).optional(),
});
export type RegisterUserRequest = z.infer<typeof registerUserSchema>;

// Extended types for responses
export type DoctorWithUser = Doctor & { user: User; hospital: Hospital | null };
export type PatientWithUser = Patient & { user: User };
export type AppointmentWithDetails = Appointment & { 
  patient: PatientWithUser; 
  doctor: DoctorWithUser; 
};

export type UpdateAppointmentStatus = { status: "pending" | "confirmed" | "rejected" | "completed" | "cancelled" };
