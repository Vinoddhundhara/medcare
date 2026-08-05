import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, registerUserSchema, type InsertDoctor } from "@shared/schema";
import { z } from "zod";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const SESSION_MAX_AGE = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "healthcare_secret_key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: SESSION_MAX_AGE,   // cookie expires after 12 hours
      httpOnly: true,            // not accessible via JS
      secure: app.get("env") === "production", // HTTPS only in production
    },
    rolling: false,              // do NOT reset timer on activity — hard 12h limit
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      // Try username first, then fall back to email lookup (for doctors logging in with email)
      let user = await storage.getUserByUsername(username);
      if (!user) {
        user = await storage.getUserByEmail(username);
      }
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate schema
      const input = registerUserSchema.parse(req.body);

      const existingUser = await storage.getUserByUsername(input.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const hashedPassword = await hashPassword(input.password);
      const user = await storage.createUser({
        ...input,
        password: hashedPassword,
      });

      // Create role specific profile
      if (input.role === "patient" && input.patientDetails) {
        await storage.createPatient({
          ...input.patientDetails,
          userId: user.id
        });
      } else if (input.role === "doctor" && input.doctorDetails) {
        const doctorDetails = input.doctorDetails as Omit<InsertDoctor, "userId">;
        await storage.createDoctor({
          ...doctorDetails,
          userId: user.id
        });
      }

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
         return res.status(400).json({ message: err.errors[0].message });
      }
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid username or password" });

      if (user.role === "hospital_admin") {
        return res.status(403).json({ message: "Hospital accounts cannot log in through the Patient/Doctor login portal. Please use the Hospital tab." });
      }

      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        (req.session as any).loginTime = Date.now();
        return res.status(200).json({
          ...user,
          sessionExpiresAt: Date.now() + 12 * 60 * 60 * 1000, // 12h from now
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (user.role === "hospital_admin") return res.sendStatus(401);

    const loginTime = (req.session as any).loginTime || Date.now();
    res.json({
      ...user,
      sessionExpiresAt: loginTime + 12 * 60 * 60 * 1000,
    });
  });
}
