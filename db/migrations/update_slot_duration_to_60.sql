-- Update all slot durations to 60 minutes (1-hour slots)
UPDATE doctor_availability
SET slot_duration = 60;
