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
import Appointments from "@/pages/Appointments";
import Prescriptions from "@/pages/Prescriptions";
import Analytics from "@/pages/Analytics";
import Notifications from "@/pages/Notifications";
import Profile from "@/pages/Profile";
import AIAssistant from "@/pages/AIAssistant";
import NearbyHospitals from "@/pages/NearbyHospitals";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { MedicineReminderScheduler } from "@/components/MedicineReminderScheduler";
import { FCMInitializer } from "@/components/FCMInitializer";
import { SessionExpiryWatcher } from "@/components/SessionExpiryWatcher";
import { RealtimeWatcher } from "@/components/RealtimeWatcher";

import { AIAssistantProvider } from "@/context/AIAssistantContext";

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
      <AIAssistantProvider>
        <TooltipProvider>
          <RealtimeWatcher />
          <FCMInitializer />
          <MedicineReminderScheduler />
          <Router />
          <Toaster />
        </TooltipProvider>
      </AIAssistantProvider>
    </QueryClientProvider>
  );
}

export default App;
