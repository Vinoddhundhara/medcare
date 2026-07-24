import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import FindDoctors from "@/pages/FindDoctors";
import FindHospitals from "@/pages/FindHospitals";
import HospitalDetails from "@/pages/HospitalDetails";
import Appointments from "@/pages/Appointments";
import Prescriptions from "@/pages/Prescriptions";
import Analytics from "@/pages/Analytics";
import Notifications from "@/pages/Notifications";
import Profile from "@/pages/Profile";
import AIAssistant from "@/pages/AIAssistant";
import NearbyHospitals from "@/pages/NearbyHospitals";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { HospitalLayout } from "@/components/HospitalLayout";
import { HospitalProtectedRoute } from "@/components/HospitalProtectedRoute";
import { MedicineReminderScheduler } from "@/components/MedicineReminderScheduler";
import { FCMInitializer } from "@/components/FCMInitializer";
import { SessionExpiryWatcher } from "@/components/SessionExpiryWatcher";
import { RealtimeWatcher } from "@/components/RealtimeWatcher";

// Hospital pages
import HospitalLogin      from "@/pages/hospital/HospitalLogin";
import HospitalRegister   from "@/pages/hospital/HospitalRegister";
import HospitalDashboard  from "@/pages/hospital/HospitalDashboard";
import HospitalDoctors    from "@/pages/hospital/HospitalDoctors";
import HospitalPatients   from "@/pages/hospital/HospitalPatients";
import HospitalAppointments from "@/pages/hospital/HospitalAppointments";
import HospitalPayments   from "@/pages/hospital/HospitalPayments";
import HospitalAnalytics  from "@/pages/hospital/HospitalAnalytics";
import HospitalProfile    from "@/pages/hospital/HospitalProfile";
import HospitalSettings   from "@/pages/hospital/HospitalSettings";
import HospitalNotifications from "@/pages/hospital/HospitalNotifications";

import { AIAssistantProvider } from "@/context/AIAssistantContext";
import { LanguageProvider } from "@/context/LanguageContext";

// ── Hospital admin sub-app ─────────────────────────────────────────────────
function HospitalRouter() {
  return (
    <Switch>
      {/* Redirect old hospital auth URLs to unified login/register */}
      <Route path="/hospital/login">
        <Redirect to="/login" />
      </Route>
      <Route path="/hospital/register">
        <Redirect to="/register?role=hospital" />
      </Route>

      {/* Protected hospital dashboard routes wrapped in HospitalLayout */}
      <Route path="/hospital/dashboard">
        <HospitalLayout>
          <HospitalProtectedRoute component={HospitalDashboard} />
        </HospitalLayout>
      </Route>
      <Route path="/hospital/doctors">
        <HospitalLayout>
          <HospitalProtectedRoute component={HospitalDoctors} />
        </HospitalLayout>
      </Route>
      <Route path="/hospital/patients">
        <HospitalLayout>
          <HospitalProtectedRoute component={HospitalPatients} />
        </HospitalLayout>
      </Route>
      <Route path="/hospital/appointments">
        <HospitalLayout>
          <HospitalProtectedRoute component={HospitalAppointments} />
        </HospitalLayout>
      </Route>
      <Route path="/hospital/payments">
        <HospitalLayout>
          <HospitalProtectedRoute component={HospitalPayments} />
        </HospitalLayout>
      </Route>
      <Route path="/hospital/analytics">
        <HospitalLayout>
          <HospitalProtectedRoute component={HospitalAnalytics} />
        </HospitalLayout>
      </Route>
      <Route path="/hospital/profile">
        <HospitalLayout>
          <HospitalProtectedRoute component={HospitalProfile} />
        </HospitalLayout>
      </Route>
      <Route path="/hospital/settings">
        <HospitalLayout>
          <HospitalProtectedRoute component={HospitalSettings} />
        </HospitalLayout>
      </Route>
      <Route path="/hospital/notifications">
        <HospitalLayout>
          <HospitalProtectedRoute component={HospitalNotifications} />
        </HospitalLayout>
      </Route>
    </Switch>
  );
}

// ── Patient / Doctor / Admin app ───────────────────────────────────────────
function Router() {
  return (
    <Layout>
      <Switch>
        {/* Public Routes */}
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />

        {/* Protected Routes */}
        <Route path="/dashboard">
          <ProtectedRoute component={Dashboard} />
        </Route>
        <Route path="/doctors">
          <ProtectedRoute component={FindDoctors} allowedRoles={["patient"]} />
        </Route>
        <Route path="/hospitals">
          <ProtectedRoute component={FindHospitals} allowedRoles={["patient"]} />
        </Route>
        <Route path="/hospitals/:id">
          <ProtectedRoute component={HospitalDetails} allowedRoles={["patient"]} />
        </Route>
        <Route path="/ai-assistant">
          <ProtectedRoute component={AIAssistant} allowedRoles={["patient"]} />
        </Route>
        <Route path="/appointments">
          <ProtectedRoute component={Appointments} />
        </Route>
        <Route path="/prescriptions">
          <ProtectedRoute component={Prescriptions} allowedRoles={["patient", "doctor"]} />
        </Route>
        <Route path="/analytics">
          <ProtectedRoute component={Analytics} allowedRoles={["doctor", "admin"]} />
        </Route>
        <Route path="/notifications">
          <ProtectedRoute component={Notifications} allowedRoles={["patient", "doctor"]} />
        </Route>
        <Route path="/profile">
          <ProtectedRoute component={Profile} />
        </Route>
        <Route path="/nearby-hospitals">
          <ProtectedRoute component={NearbyHospitals} allowedRoles={["patient"]} />
        </Route>

        {/* Fallback */}
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AIAssistantProvider>
          <TooltipProvider>
            <RealtimeWatcher />
            <FCMInitializer />
            <MedicineReminderScheduler />
            <SessionExpiryWatcher />
            <Switch>
              {/* All /hospital/* routes go to the hospital sub-app */}
              <Route path="/hospital/:rest*">
                <HospitalRouter />
              </Route>
              {/* Everything else goes to the main app */}
              <Route>
                <Router />
              </Route>
            </Switch>
            <Toaster />
          </TooltipProvider>
        </AIAssistantProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
