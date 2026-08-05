-- Update all completed appointments to have paymentStatus = 'paid'
-- This fixes historical data where appointments were completed but payment status wasn't updated
UPDATE appointments
SET payment_status = 'paid'
WHERE status = 'completed' AND payment_status != 'paid';
