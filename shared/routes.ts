import { z } from 'zod';
import { 
  insertUserSchema, 
  insertPatientSchema, 
  insertDoctorSchema, 
  insertAppointmentSchema, 
  insertPrescriptionSchema,
  registerUserSchema,
  users, patients, doctors, hospitals, appointments, prescriptions 
} from './schema';
import type { RegisterUserRequest, User } from "./schema";

export type { RegisterUserRequest, User };

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/register' as const,
      input: registerUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/login' as const,
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout' as const,
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  doctors: {
    list: {
      method: 'GET' as const,
      path: '/api/doctors' as const,
      input: z.object({
        specialization: z.string().optional(),
        hospitalId: z.string().optional(),
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<any>()), // DoctorWithUser
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/doctors/:id' as const,
      responses: {
        200: z.custom<any>(), // DoctorWithUser
        404: errorSchemas.notFound,
      },
    },
  },
  hospitals: {
    list: {
      method: 'GET' as const,
      path: '/api/hospitals' as const,
      responses: {
        200: z.array(z.custom<typeof hospitals.$inferSelect>()),
      },
    },
  },
  appointments: {
    list: {
      method: 'GET' as const,
      path: '/api/appointments' as const,
      responses: {
        200: z.array(z.custom<any>()), // AppointmentWithDetails
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/appointments' as const,
      input: insertAppointmentSchema.omit({ patientId: true }),
      responses: {
        201: z.custom<typeof appointments.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/appointments/:id/status' as const,
      input: z.object({ status: z.enum(["pending", "confirmed", "rejected", "completed", "cancelled"]) }),
      responses: {
        200: z.custom<typeof appointments.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  prescriptions: {
    list: {
      method: 'GET' as const,
      path: '/api/prescriptions' as const,
      responses: {
        200: z.array(z.custom<typeof prescriptions.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/prescriptions' as const,
      input: insertPrescriptionSchema,
      responses: {
        201: z.custom<typeof prescriptions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
