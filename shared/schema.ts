import {
  pgTable, text, serial, integer, boolean,
  timestamp, jsonb, decimal, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─────────────────────────────────────────────
//  USERS  (admin | hospital_admin | doctor | patient)
// ─────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["patient", "doctor", "admin", "hospital_admin"] }).notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─────────────────────────────────────────────
//  HOSPITALS  (full-featured)
// ─────────────────────────────────────────────
export const hospitals = pgTable("hospitals", {
  id: serial("id").primaryKey(),
  // Auth fields for hospital_admin login
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  password: text("password").notNull(),            // hashed, hospital admin credential
  // Basic info
  name: text("name").notNull(),
  logo: text("logo"),
  hospitalImage: text("hospital_image"),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  country: text("country").notNull().default("India"),
  zipcode: text("zipcode"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  // Reg / compliance
  licenseNumber: text("license_number"),
  gstNumber: text("gst_number"),
  // Info
  description: text("description"),
  website: text("website"),
  emergencyNumber: text("emergency_number"),
  ambulanceAvailable: boolean("ambulance_available").default(false).notNull(),
  parkingAvailable: boolean("parking_available").default(false).notNull(),
  icuAvailable: boolean("icu_available").default(false).notNull(),
  bedCount: integer("bed_count").default(0).notNull(),
  openingTime: text("opening_time").default("09:00").notNull(),
  closingTime: text("closing_time").default("21:00").notNull(),
  status: text("status", { enum: ["active", "inactive", "pending"] }).default("active").notNull(),
  // Legacy / compat fields kept
  location: text("location"),
  contact: text("contact"),
  specializations: text("specializations").array(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─────────────────────────────────────────────
//  DEPARTMENTS
// ─────────────────────────────────────────────
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").notNull().references(() => hospitals.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─────────────────────────────────────────────
//  PATIENTS
// ─────────────────────────────────────────────
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  contact: text("contact").notNull(),
  medicalHistory: text("medical_history"),
});

// ─────────────────────────────────────────────
//  DOCTORS  (extended)
// ─────────────────────────────────────────────
export const doctors = pgTable("doctors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  hospitalId: integer("hospital_id").references(() => hospitals.id),
  departmentId: integer("department_id").references(() => departments.id),
  specialization: text("specialization").notNull(),
  experience: integer("experience").notNull(),
  availability: jsonb("availability").$type<string[]>(),
  consultationFee: integer("consultation_fee").notNull(),
  qualification: text("qualification").default("MBBS, MD").notNull(),
  education: text("education"),
  languages: text("languages").array(),
  profileImage: text("profile_image"),
  bio: text("bio"),
  status: text("status", { enum: ["active", "inactive"] }).default("active").notNull(),
  // Consultation modes
  onlineFee: integer("online_fee").default(500).notNull(),
  offlineFee: integer("offline_fee").default(700).notNull(),
  videoFee: integer("video_fee").default(600).notNull(),
  onlineEnabled: boolean("online_enabled").default(true).notNull(),
  offlineEnabled: boolean("offline_enabled").default(true).notNull(),
  videoEnabled: boolean("video_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─────────────────────────────────────────────
//  DOCTOR AVAILABILITY  (structured per day)
// ─────────────────────────────────────────────
export const doctorAvailability = pgTable("doctor_availability", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  dayOfWeek: text("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  breakStart: text("break_start"),
  breakEnd: text("break_end"),
  slotDuration: integer("slot_duration").default(60).notNull(), // minutes
  isAvailable: boolean("is_available").default(true).notNull(),
  emergencyAvailable: boolean("emergency_available").default(false).notNull(),
  leaveDates: jsonb("leave_dates").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─────────────────────────────────────────────
//  APPOINTMENTS  (extended)
// ─────────────────────────────────────────────
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  doctorId: integer("doctor_id").notNull().references(() => doctors.id),
  hospitalId: integer("hospital_id").references(() => hospitals.id),
  date: timestamp("date").notNull(),
  status: text("status", { enum: ["pending", "confirmed", "rejected", "completed", "cancelled"] }).default("pending").notNull(),
  appointmentStatus: text("appointment_status", { enum: ["scheduled", "in_progress", "completed", "no_show"] }).default("scheduled").notNull(),
  reason: text("reason").notNull(),
  videoCallLink: text("video_call_link"),
  consultationFee: integer("consultation_fee").default(700).notNull(),
  paymentStatus: text("payment_status", { enum: ["pending", "paid", "refunded"] }).default("pending").notNull(),
  paymentMethod: text("payment_method", { enum: ["cash", "card", "upi", "insurance", "online"] }),
  paymentId: text("payment_id"),
  razorpayOrderId: text("razorpay_order_id"),
  refundStatus: text("refund_status", { enum: ["none", "requested", "processed"] }).default("none").notNull(),
  bookingSource: text("booking_source", { enum: ["web", "app", "walk_in", "phone"] }).default("web").notNull(),
  consultationType: text("consultation_type", { enum: ["online", "offline", "video"] }).default("online").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─────────────────────────────────────────────
//  PRESCRIPTIONS
// ─────────────────────────────────────────────
export const prescriptions = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull().references(() => appointments.id),
  medicines: jsonb("medicines").$type<{ name: string; dosage: string; frequency: string }[]>(),
  instructions: text("instructions"),
  date: timestamp("date").defaultNow(),
});

// ─────────────────────────────────────────────
//  MEDICINE REMINDERS
// ─────────────────────────────────────────────
export const medicineReminders = pgTable("medicine_reminders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  medicineName: text("medicine_name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  time: text("time").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─────────────────────────────────────────────
//  NOTIFICATION TOKENS  (FCM)
// ─────────────────────────────────────────────
export const notificationTokens = pgTable("notification_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─────────────────────────────────────────────
//  HOSPITAL NOTIFICATIONS
// ─────────────────────────────────────────────
export const hospitalNotifications = pgTable("hospital_notifications", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").notNull().references(() => hospitals.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["new_appointment", "cancelled_appointment", "payment_success", "doctor_leave", "general"] }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  relatedId: integer("related_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─────────────────────────────────────────────
//  REVIEWS
// ─────────────────────────────────────────────
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  hospitalId: integer("hospital_id").references(() => hospitals.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  rating: integer("rating").notNull(), // 1–5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─────────────────────────────────────────────
//  SESSION  (express-session + connect-pg-simple)
// ─────────────────────────────────────────────
export const session = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

// ═══════════════════════════════════════════════
//  RELATIONS
// ═══════════════════════════════════════════════

export const usersRelations = relations(users, ({ one }) => ({
  patient: one(patients, { fields: [users.id], references: [patients.userId] }),
  doctor:  one(doctors,  { fields: [users.id], references: [doctors.userId]  }),
}));

export const hospitalsRelations = relations(hospitals, ({ many }) => ({
  doctors:       many(doctors),
  departments:   many(departments),
  appointments:  many(appointments),
  reviews:       many(reviews),
  notifications: many(hospitalNotifications),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  hospital: one(hospitals, { fields: [departments.hospitalId], references: [hospitals.id] }),
  doctors:  many(doctors),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user:         one(users,  { fields: [patients.userId], references: [users.id] }),
  appointments: many(appointments),
  reviews:      many(reviews),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  user:         one(users,      { fields: [doctors.userId],       references: [users.id]        }),
  hospital:     one(hospitals,  { fields: [doctors.hospitalId],   references: [hospitals.id]    }),
  department:   one(departments,{ fields: [doctors.departmentId], references: [departments.id]  }),
  appointments: many(appointments),
  availability: many(doctorAvailability),
  reviews:      many(reviews),
}));

export const doctorAvailabilityRelations = relations(doctorAvailability, ({ one }) => ({
  doctor: one(doctors, { fields: [doctorAvailability.doctorId], references: [doctors.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  patient:  one(patients,  { fields: [appointments.patientId],  references: [patients.id]  }),
  doctor:   one(doctors,   { fields: [appointments.doctorId],   references: [doctors.id]   }),
  hospital: one(hospitals, { fields: [appointments.hospitalId], references: [hospitals.id] }),
  prescription: one(prescriptions, { fields: [appointments.id], references: [prescriptions.appointmentId] }),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one }) => ({
  appointment: one(appointments, { fields: [prescriptions.appointmentId], references: [appointments.id] }),
}));

export const medicineRemindersRelations = relations(medicineReminders, ({ one }) => ({
  user: one(users, { fields: [medicineReminders.userId], references: [users.id] }),
}));

export const notificationTokensRelations = relations(notificationTokens, ({ one }) => ({
  user: one(users, { fields: [notificationTokens.userId], references: [users.id] }),
}));

export const hospitalNotificationsRelations = relations(hospitalNotifications, ({ one }) => ({
  hospital: one(hospitals, { fields: [hospitalNotifications.hospitalId], references: [hospitals.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  patient:  one(patients,  { fields: [reviews.patientId],  references: [patients.id]  }),
  doctor:   one(doctors,   { fields: [reviews.doctorId],   references: [doctors.id]   }),
  hospital: one(hospitals, { fields: [reviews.hospitalId], references: [hospitals.id] }),
  appointment: one(appointments, { fields: [reviews.appointmentId], references: [appointments.id] }),
}));

// ═══════════════════════════════════════════════
//  INSERT SCHEMAS  (Zod)
// ═══════════════════════════════════════════════

export const insertUserSchema          = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertPatientSchema       = createInsertSchema(patients).omit({ id: true });
export const insertDoctorSchema        = createInsertSchema(doctors).omit({ id: true });
export const insertHospitalSchema      = createInsertSchema(hospitals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDepartmentSchema    = createInsertSchema(departments).omit({ id: true, createdAt: true });
export const insertReviewSchema        = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertDoctorAvailabilitySchema = createInsertSchema(doctorAvailability).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  dayOfWeek: z.enum(["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]),
});

export const insertAppointmentSchema = createInsertSchema(appointments)
  .omit({ id: true, createdAt: true, updatedAt: true, status: true, appointmentStatus: true })
  .extend({ date: z.coerce.date() });

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({ id: true, date: true });

export const insertMedicineReminderSchema = createInsertSchema(medicineReminders)
  .omit({ id: true, createdAt: true })
  .extend({ startDate: z.coerce.date(), endDate: z.coerce.date().optional() });

// ═══════════════════════════════════════════════
//  TS TYPES
// ═══════════════════════════════════════════════

export type User                = typeof users.$inferSelect;
export type InsertUser          = typeof users.$inferInsert;
export type Patient             = typeof patients.$inferSelect;
export type InsertPatient       = typeof patients.$inferInsert;
export type Doctor              = typeof doctors.$inferSelect;
export type InsertDoctor        = typeof doctors.$inferInsert;
export type Hospital            = typeof hospitals.$inferSelect;
export type InsertHospital      = typeof hospitals.$inferInsert;
export type Department          = typeof departments.$inferSelect;
export type InsertDepartment    = typeof departments.$inferInsert;
export type DoctorAvailability  = typeof doctorAvailability.$inferSelect;
export type InsertDoctorAvailability = typeof doctorAvailability.$inferInsert;
export type Appointment         = typeof appointments.$inferSelect;
export type InsertAppointment   = typeof appointments.$inferInsert;
export type Prescription        = typeof prescriptions.$inferSelect;
export type InsertPrescription  = typeof prescriptions.$inferInsert;
export type MedicineReminder    = typeof medicineReminders.$inferSelect;
export type InsertMedicineReminder = typeof medicineReminders.$inferInsert;
export type NotificationToken   = typeof notificationTokens.$inferSelect;
export type InsertNotificationToken = typeof notificationTokens.$inferInsert;
export type HospitalNotification = typeof hospitalNotifications.$inferSelect;
export type Review              = typeof reviews.$inferSelect;
export type InsertReview        = typeof reviews.$inferInsert;

// Complex registration schema
export const registerUserSchema = insertUserSchema.extend({
  patientDetails: insertPatientSchema.omit({ userId: true }).optional(),
  doctorDetails:  insertDoctorSchema.omit({ userId: true }).optional(),
});
export type RegisterUserRequest = z.infer<typeof registerUserSchema>;

// Hospital registration schema (separate from user auth)
export const registerHospitalSchema = insertHospitalSchema.pick({
  name: true, email: true, phone: true, password: true,
  address: true, city: true, state: true, country: true, zipcode: true,
  description: true, website: true, emergencyNumber: true,
  ambulanceAvailable: true, parkingAvailable: true, icuAvailable: true,
  bedCount: true, openingTime: true, closingTime: true,
  licenseNumber: true, gstNumber: true,
}).extend({
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// ═══════════════════════════════════════════════
//  EXTENDED RESPONSE TYPES
// ═══════════════════════════════════════════════

export type DoctorWithUser = Doctor & {
  user: User;
  hospital: Hospital | null;
  department?: Department | null;
  availabilitySchedule?: DoctorAvailability[];
};

export type PatientWithUser = Patient & { user: User };

export type AppointmentWithDetails = Appointment & {
  patient: PatientWithUser;
  doctor: DoctorWithUser;
  hospital?: Hospital | null;
};

export type HospitalWithStats = Hospital & {
  doctorCount: number;
  departmentCount: number;
  appointmentCount: number;
  averageRating: number;
  departments?: Department[];
};

export type UpdateAppointmentStatus = {
  status: "pending" | "confirmed" | "rejected" | "completed" | "cancelled";
};
