/**
 * Hospital Admin Authentication
 * Separate from user auth — hospitals log in with email + password.
 * Hospital session is stored under req.session.hospitalId.
 */
import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { hashPassword } from "./auth";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { registerHospitalSchema } from "@shared/schema";
import { z } from "zod";

const scryptAsync = promisify(scrypt);

async function comparePasswords(supplied: string, stored: string) {
  // stored may be a placeholder from seeded data
  if (!stored || stored === "$default$") return false;
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Middleware: protect hospital routes
export function requireHospitalAuth(req: Request, res: Response, next: NextFunction) {
  const hospitalId = (req.session as any).hospitalId;
  if (!hospitalId) return res.status(401).json({ message: "Hospital authentication required" });
  next();
}

// Get current hospital from session
export async function getCurrentHospital(req: Request) {
  const hospitalId = (req.session as any).hospitalId as number | undefined;
  if (!hospitalId) return null;
  return storage.getHospital(hospitalId);
}

// Register routes on the Express app
export function setupHospitalAuth(app: any) {
  // ── Register ────────────────────────────────────────────────────────────
  app.post("/api/hospital/register", async (req: Request, res: Response) => {
    try {
      const input = registerHospitalSchema.parse(req.body);

      // Unique email check
      const existing = await storage.getHospitalByEmail(input.email);
      if (existing) return res.status(400).json({ message: "A hospital with this email already exists" });

      const hashedPw = await hashPassword(input.password);

      const hospital = await storage.createHospital({
        ...input,
        password: hashedPw,
        location: `${input.address}, ${input.city}`,
        contact: input.phone,
        status: "pending",  // admin must approve
      });

      // Auto-login after registration
      (req.session as any).hospitalId = hospital.id;

      // Return without password
      const { password: _pw, ...safe } = hospital;
      return res.status(201).json(safe);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error("[Hospital Register]", err);
      return res.status(500).json({ message: "Registration failed" });
    }
  });

  // ── Login ────────────────────────────────────────────────────────────────
  app.post("/api/hospital/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });

      const hospital = await storage.getHospitalByEmail(email);
      if (!hospital) {
        // Check if a user account exists with this email/username to give a helpful role-isolation error
        const existingUser = await storage.getUserByUsername(email);
        if (existingUser && ["patient", "doctor"].includes(existingUser.role)) {
          return res.status(403).json({ message: "Patient/Doctor accounts cannot log in through the Hospital Portal. Please use the Patient / Doctor tab." });
        }
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const valid = await comparePasswords(password, hospital.password || "");
      if (!valid) return res.status(401).json({ message: "Invalid credentials" });

      const sessionExpiresAt = Date.now() + 12 * 60 * 60 * 1000; // 12 hours
      (req.session as any).hospitalId = hospital.id;
      (req.session as any).sessionExpiresAt = sessionExpiresAt;

      const { password: _pw, ...safe } = hospital;
      return res.json({ hospital: safe, sessionExpiresAt });
    } catch (err) {
      console.error("[Hospital Login]", err);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  // ── Logout ───────────────────────────────────────────────────────────────
  app.post("/api/hospital/logout", (req: Request, res: Response) => {
    (req.session as any).hospitalId = undefined;
    (req.session as any).sessionExpiresAt = undefined;
    res.json({ message: "Logged out" });
  });

  // ── Current hospital ──────────────────────────────────────────────────────
  app.get("/api/hospital/me", async (req: Request, res: Response) => {
    const hospital = await getCurrentHospital(req);
    if (!hospital) return res.status(401).json({ message: "Not authenticated" });
    const { password: _pw, ...safe } = hospital;
    const sessionExpiresAt = (req.session as any).sessionExpiresAt || Date.now() + 12 * 60 * 60 * 1000;
    return res.json({ ...safe, sessionExpiresAt });
  });

  // ── Update profile ────────────────────────────────────────────────────────
  app.patch("/api/hospital/profile", requireHospitalAuth, async (req: Request, res: Response) => {
    try {
      const hospitalId = (req.session as any).hospitalId as number;
      const { password: _pw, id: _id, createdAt: _ca, ...updates } = req.body;
      const updated = await storage.updateHospital(hospitalId, updates);
      const { password: __pw, ...safe } = updated;
      return res.json(safe);
    } catch (err) {
      console.error("[Hospital Profile Update]", err);
      return res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // ── Change password ───────────────────────────────────────────────────────
  app.post("/api/hospital/change-password", requireHospitalAuth, async (req: Request, res: Response) => {
    try {
      const hospitalId = (req.session as any).hospitalId as number;
      const { currentPassword, newPassword } = req.body;
      const hospital = await storage.getHospital(hospitalId);
      if (!hospital) return res.status(404).json({ message: "Not found" });

      const valid = await comparePasswords(currentPassword, hospital.password || "");
      if (!valid) return res.status(401).json({ message: "Current password is incorrect" });

      const hashed = await hashPassword(newPassword);
      await storage.updateHospital(hospitalId, { password: hashed });
      return res.json({ message: "Password updated" });
    } catch (err) {
      return res.status(500).json({ message: "Failed to change password" });
    }
  });
}
