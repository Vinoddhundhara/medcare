# Dashboard & Revenue Fixes

## Issues Fixed

### 1. Revenue Shows ₹0 Even With Completed Appointments
**Root Cause**: Revenue calculation only counted appointments with `paymentStatus = "paid"`, but appointments are created with `paymentStatus = "pending"` by default and were never being updated to "paid" when completed.

**Solution**:
- Updated `server/storage.ts` - `updateAppointmentStatus()` now auto-sets `paymentStatus = "paid"` when appointment is marked as "completed"
- Updated revenue calculations in `server/hospitalRoutes.ts` to count both completed appointments AND explicitly paid ones: `a.status === "completed" || a.paymentStatus === "paid"`
- Created migration `db/migrations/fix_payment_status_for_completed.sql` to fix existing data

### 2. Today's Appointments Shows 0
**Not Actually a Bug**: The 3 completed appointments are scheduled for Aug 8 and Aug 10, 2026. Since today is Aug 5, 2026, "Today's Appointments" correctly shows 0. The appointments will appear on their scheduled dates.

**Improvement Made**: Updated hospital dashboard to show a new stat "Total Appointments" with "X completed" subtitle to give better visibility of all activity.

### 3. Charts Only Show Past Data
**Root Cause**: Daily appointment chart only looked backward (last 30 days), so future appointments weren't visible.

**Solution**: Updated `buildDailyChart()` in `server/hospitalRoutes.ts` to show past 15 days + next 15 days (centered around today), so upcoming appointments are now visible in the chart.

### 4. Doctor Dashboard Shows Low Revenue
**Root Cause**: Same as issue #1 - revenue only counted `paymentStatus = "paid"` appointments.

**Solution**: 
- Stats now count all completed appointments
- Swapped stat card display: Now shows "Total Revenue" prominently with "₹X today" as subtitle (more meaningful than showing today's revenue as primary)

## Files Changed

### Backend
1. **server/storage.ts**
   - `updateAppointmentStatus()` - Auto-set paymentStatus to "paid" when completing appointments

2. **server/hospitalRoutes.ts**
   - Dashboard revenue calculation - Count completed OR paid appointments
   - `buildDailyChart()` - Show past + future appointments (±15 days from today)
   - `buildMonthlyRevenueChart()` - Count completed OR paid appointments
   - Added `totalAppointments` field to dashboard response

### Frontend
3. **client/src/pages/hospital/HospitalDashboard.tsx**
   - Added "Total Appointments" stat card showing completed count
   - Changed grid from 4 to 5 columns to accommodate new stat

4. **client/src/pages/DoctorDashboard.tsx**
   - Swapped revenue display: "Total Revenue" primary, "₹X today" secondary

### Database Migrations
5. **db/migrations/fix_payment_status_for_completed.sql**
   - Updates all existing completed appointments to have paymentStatus = 'paid'

6. **db/migrations/update_slot_duration_to_60.sql**
   - Updates all doctor availability slots to 60-minute duration

## How to Apply

1. **Run SQL migrations**:
```sql
-- Fix payment status for completed appointments
UPDATE appointments
SET payment_status = 'paid'
WHERE status = 'completed' AND payment_status != 'paid';

-- Fix slot durations (separate issue)
UPDATE doctor_availability SET slot_duration = 60;
```

2. **Restart the server** to apply code changes

3. **Refresh dashboards** - Revenue and stats will now show correctly

## Expected Results

### Hospital Dashboard (PGI)
- ✅ **Total Revenue**: ₹2100 (3 completed × ₹700 each)
- ✅ **Total Appointments**: 3 (with "3 completed" subtitle)
- ✅ **Charts**: Show both past and upcoming appointments
- ⚠️ **Today's Appointments**: Still 0 (correct - appointments are Aug 8 & 10, not today Aug 5)

### Doctor Dashboard (Dr. aditya)
- ✅ **Total Revenue**: ₹1400 (2 completed appointments)
- ✅ **Total Patients**: 1 unique patient (subham)
- ✅ **Completed tab**: Shows 2 completed appointments
- ⚠️ **Today's Appointments**: 0 (correct - his appointments are Aug 8 & 10)

### Doctor Dashboard (Dr. deep)
- ✅ **Total Revenue**: ₹700 (1 completed appointment)
- ⚠️ **Today's Appointments**: 0 (correct - appointment is Aug 8)

## Future Enhancements

Consider adding:
- "This Week's Appointments" stat
- "Upcoming Appointments (Next 7 Days)" section
- Payment tracking page showing pending vs paid breakdown
- Auto-confirm appointments for certain doctors/clinics
