-- ================================================================
-- Multi-Hospital Management System Migration
-- Extends existing schema without breaking existing tables
-- ================================================================

-- 1. Extend the hospitals table with new columns
ALTER TABLE hospitals
  ADD COLUMN IF NOT EXISTS email         TEXT,
  ADD COLUMN IF NOT EXISTS phone         TEXT,
  ADD COLUMN IF NOT EXISTS password      TEXT,
  ADD COLUMN IF NOT EXISTS logo          TEXT,
  ADD COLUMN IF NOT EXISTS hospital_image TEXT,
  ADD COLUMN IF NOT EXISTS address       TEXT,
  ADD COLUMN IF NOT EXISTS city          TEXT,
  ADD COLUMN IF NOT EXISTS state         TEXT,
  ADD COLUMN IF NOT EXISTS country       TEXT DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS zipcode       TEXT,
  ADD COLUMN IF NOT EXISTS latitude      DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS longitude     DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS gst_number    TEXT,
  ADD COLUMN IF NOT EXISTS description   TEXT,
  ADD COLUMN IF NOT EXISTS website       TEXT,
  ADD COLUMN IF NOT EXISTS emergency_number TEXT,
  ADD COLUMN IF NOT EXISTS ambulance_available BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parking_available   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS icu_available       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bed_count     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opening_time  TEXT NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS closing_time  TEXT NOT NULL DEFAULT '21:00',
  ADD COLUMN IF NOT EXISTS status        TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMP DEFAULT NOW();

-- Backfill address/city/state from location for existing rows
UPDATE hospitals
SET
  address = COALESCE(address, contact),
  city    = COALESCE(city,    'Unknown'),
  state   = COALESCE(state,   'Unknown'),
  phone   = COALESCE(phone,   contact),
  email   = COALESCE(email,   'info@' || LOWER(REPLACE(name, ' ', '')) || '.com'),
  password = COALESCE(password, '$default$')
WHERE address IS NULL OR city IS NULL OR state IS NULL OR phone IS NULL;

-- 2. Update users role enum to include hospital_admin
-- In PostgreSQL we need to alter the enum or use text constraints.
-- Since the existing schema uses text with enum constraint via Drizzle,
-- we just ensure the check allows the new value.
-- Drizzle handles this via db:push — no manual migration needed for text enum.

-- 3. Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id           SERIAL PRIMARY KEY,
  hospital_id  INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- 4. Extend doctors table
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS department_id  INTEGER REFERENCES departments(id),
  ADD COLUMN IF NOT EXISTS education      TEXT,
  ADD COLUMN IF NOT EXISTS languages      TEXT[],
  ADD COLUMN IF NOT EXISTS profile_image  TEXT,
  ADD COLUMN IF NOT EXISTS bio            TEXT,
  ADD COLUMN IF NOT EXISTS status         TEXT NOT NULL DEFAULT 'active';

-- 5. Extend appointments table
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS hospital_id        INTEGER REFERENCES hospitals(id),
  ADD COLUMN IF NOT EXISTS appointment_status TEXT NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS payment_method     TEXT,
  ADD COLUMN IF NOT EXISTS payment_id         TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_order_id  TEXT,
  ADD COLUMN IF NOT EXISTS refund_status      TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS booking_source     TEXT NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS notes              TEXT,
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMP DEFAULT NOW();

-- Backfill hospital_id from doctor's hospital
UPDATE appointments a
SET hospital_id = d.hospital_id
FROM doctors d
WHERE a.doctor_id = d.id
  AND a.hospital_id IS NULL
  AND d.hospital_id IS NOT NULL;

-- 6. Create doctor_availability table
CREATE TABLE IF NOT EXISTS doctor_availability (
  id                   SERIAL PRIMARY KEY,
  doctor_id            INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week          TEXT NOT NULL,
  start_time           TEXT NOT NULL,
  end_time             TEXT NOT NULL,
  break_start          TEXT,
  break_end            TEXT,
  slot_duration        INTEGER NOT NULL DEFAULT 30,
  is_available         BOOLEAN NOT NULL DEFAULT true,
  emergency_available  BOOLEAN NOT NULL DEFAULT false,
  leave_dates          JSONB DEFAULT '[]',
  created_at           TIMESTAMP DEFAULT NOW(),
  updated_at           TIMESTAMP DEFAULT NOW()
);

-- 7. Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id             SERIAL PRIMARY KEY,
  patient_id     INTEGER NOT NULL REFERENCES patients(id),
  doctor_id      INTEGER REFERENCES doctors(id),
  hospital_id    INTEGER REFERENCES hospitals(id),
  appointment_id INTEGER REFERENCES appointments(id),
  rating         INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        TEXT,
  created_at     TIMESTAMP DEFAULT NOW()
);

-- 8. Create hospital_notifications table
CREATE TABLE IF NOT EXISTS hospital_notifications (
  id          SERIAL PRIMARY KEY,
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  related_id  INTEGER,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 9. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_departments_hospital   ON departments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctors_hospital       ON doctors(hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctors_department     ON doctors(department_id);
CREATE INDEX IF NOT EXISTS idx_appointments_hospital  ON appointments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status    ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date      ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_reviews_hospital       ON reviews(hospital_id);
CREATE INDEX IF NOT EXISTS idx_reviews_doctor         ON reviews(doctor_id);
CREATE INDEX IF NOT EXISTS idx_hosp_notifs_hospital   ON hospital_notifications(hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctor_avail_doctor    ON doctor_availability(doctor_id);
