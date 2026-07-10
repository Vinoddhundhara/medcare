import { useAuth } from "@/hooks/use-auth";
import { useAppointments } from "@/hooks/use-appointments";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Activity, Clock, Plus, CheckCircle, XCircle, Brain, DollarSign } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

function StatsCard({ title, value, icon: Icon, description, color }: any) {
  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-border/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function AppointmentList({ appointments, role }: { appointments: any[], role: string }) {
  if (appointments.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
        <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="text-lg font-medium">No appointments scheduled</h3>
        <p className="text-muted-foreground mb-4">You have no upcoming appointments.</p>
        {role === "patient" && (
          <Link href="/doctors">
            <Button>Book Now</Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.slice(0, 5).map((apt) => (
        <div key={apt.id} className="flex items-center justify-between p-4 bg-card rounded-xl border border-border/60 hover:border-primary/30 transition-all">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${apt.status === 'confirmed' ? 'bg-green-100 text-green-700' : apt.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
              {format(new Date(apt.date), "d")}
            </div>
            <div>
              <h4 className="font-semibold">
                {role === "patient" ? `Dr. ${apt.doctor.user.name}` : apt.patient.user.name}
              </h4>
              <p className="text-sm text-muted-foreground">
                {format(new Date(apt.date), "MMMM yyyy • h:mm a")}
              </p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium capitalize 
            ${apt.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
              apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
              'bg-gray-100 text-gray-800'}`}>
            {apt.status}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: appointments, isLoading } = useAppointments();

  if (!user) return null;

  const role = user.role;
  const isDoctor = role === "doctor";
  const isPatient = role === "patient";

  // Calculate stats
  const totalAppointments = appointments?.length || 0;
  const pendingAppointments = appointments?.filter((a: any) => a.status === "pending").length || 0;
  const confirmedAppointments = appointments?.filter((a: any) => a.status === "confirmed").length || 0;
  const upcomingAppointments = appointments?.filter((a: any) =>
    ["pending", "confirmed"].includes(a.status)
  ) || [];

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const todaysEarnings = isDoctor ? (appointments || []).filter((a: any) => 
    new Date(a.date) >= todayStart && new Date(a.date) < todayEnd &&
    ["completed", "confirmed"].includes(a.status)
  ).reduce((sum: number, a: any) => sum + (a.consultationFee || 0), 0) : 0;

  const pendingEarnings = isDoctor ? (appointments || []).filter((a: any) => 
    a.status === "pending"
  ).reduce((sum: number, a: any) => sum + (a.consultationFee || 0), 0) : 0;

  const totalEarnings = isDoctor ? (appointments || []).filter((a: any) => 
    a.status === "completed"
  ).reduce((sum: number, a: any) => sum + (a.consultationFee || 0), 0) : 0;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user.name}. Here's what's happening today.
          </p>
        </div>
        {isPatient && (
          <Link href="/doctors">
            <Button className="shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" /> Book Appointment
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isDoctor ? (
          <>
            <StatsCard
              title="Today's Earnings"
              value={`₹${todaysEarnings}`}
              description="From today's appointments"
              icon={DollarSign}
              color="text-green-500"
            />
            <StatsCard
              title="Pending Payments"
              value={`₹${pendingEarnings}`}
              description="Awaiting confirmation"
              icon={Clock}
              color="text-amber-500"
            />
            <StatsCard
              title="Total Earnings"
              value={`₹${totalEarnings}`}
              description="All time completed"
              icon={Activity}
              color="text-blue-500"
            />
            <StatsCard
              title="Total Patients"
              value={appointments?.length ? new Set(appointments.map((a: any) => a.patientId)).size : 0}
              description="Unique interactions"
              icon={Users}
              color="text-purple-500"
            />
          </>
        ) : (
          <>
            <StatsCard
              title="Total Appointments"
              value={totalAppointments}
              description="All time"
              icon={Calendar}
              color="text-blue-500"
            />
            <StatsCard
              title="Pending Requests"
              value={pendingAppointments}
              description="Awaiting confirmation"
              icon={Clock}
              color="text-amber-500"
            />
            <StatsCard
              title="Confirmed"
              value={confirmedAppointments}
              description="Upcoming visits"
              icon={CheckCircle}
              color="text-green-500"
            />
            <StatsCard
              title="Doctors Visited"
              value={appointments?.length ? new Set(appointments.map((a: any) => a.doctorId)).size : 0}
              description="Unique interactions"
              icon={Users}
              color="text-purple-500"
            />
          </>
        )}
      </div>

      {/* Main Content Split */}
      <div className="grid gap-8 md:grid-cols-7">
        <Card className="md:col-span-4 border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
            <CardDescription>
              You have {pendingAppointments} pending and {confirmedAppointments} confirmed appointments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : (
              <AppointmentList appointments={upcomingAppointments} role={role} />
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>{isDoctor ? "Quick Actions" : "Quick Actions"}</CardTitle>
          </CardHeader>
          <CardContent>
            {isDoctor ? (
              <div className="space-y-4">
                <Button variant="outline" className="w-full justify-start h-12" asChild>
                  <Link href="/appointments">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Confirm Pending Requests
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start h-12" asChild>
                  <Link href="/prescriptions">
                    <Activity className="w-4 h-4 mr-2 text-blue-500" /> Write Prescription
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start h-12" asChild>
                  <Link href="/analytics">
                    <XCircle className="w-4 h-4 mr-2 text-purple-500" /> View Analytics
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Button variant="outline" className="w-full justify-start h-12" asChild>
                  <Link href="/doctors">
                    <Activity className="w-4 h-4 mr-2 text-primary" /> Find a Doctor
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start h-12" asChild>
                  <Link href="/ai-assistant">
                    <Brain className="w-4 h-4 mr-2 text-purple-500" /> AI Health Assistant
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start h-12" asChild>
                  <Link href="/appointments">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> View Appointments
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start h-12" asChild>
                  <Link href="/prescriptions">
                    <XCircle className="w-4 h-4 mr-2 text-blue-500" /> My Prescriptions
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
