import { useAuth } from "@/hooks/use-auth";
import { useAppointments } from "@/hooks/use-appointments";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Activity, Clock, Plus, CheckCircle, XCircle, Brain, DollarSign } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/context/LanguageContext";

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

export default function Dashboard() {
  const { user } = useAuth();
  const { data: appointments, isLoading } = useAppointments();
  const { t } = useLanguage();

  if (!user) return null;

  const role = user.role;
  const isDoctor = role === "doctor";
  const isPatient = role === "patient";

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

  // Appointment list sub-component (needs t)
  const AppointmentListInner = ({ appointments: apts, role: r }: { appointments: any[], role: string }) => {
    if (apts.length === 0) {
      return (
        <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium">{t.dashboard.noAppointments}</h3>
          <p className="text-muted-foreground mb-4">{t.dashboard.noUpcoming}</p>
          {r === "patient" && (
            <Link href="/doctors">
              <Button>{t.dashboard.bookNow}</Button>
            </Link>
          )}
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {apts.slice(0, 5).map((apt: any) => (
          <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card rounded-xl border border-border/60 hover:border-primary/30 transition-all gap-3">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${apt.status === 'confirmed' ? 'bg-green-100 text-green-700' : apt.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                {format(new Date(apt.date), "d")}
              </div>
              <div>
                <h4 className="font-semibold">
                  {r === "patient" ? `Dr. ${apt.doctor.user.name}` : apt.patient.user.name}
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
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">{t.dashboard.title}</h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {t.dashboard.welcomeBack}, {user.name}. {t.dashboard.happeningToday}
          </p>
        </div>
        {isPatient && (
          <Link href="/doctors">
            <Button className="shadow-lg shadow-primary/20 w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> {t.dashboard.bookAppointment}
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {isDoctor ? (
          <>
            <StatsCard title={t.dashboard.todaysEarnings}   value={`₹${todaysEarnings}`}   description={t.dashboard.fromTodayAppts}   icon={DollarSign} color="text-green-500" />
            <StatsCard title={t.dashboard.pendingPayments}  value={`₹${pendingEarnings}`}  description={t.dashboard.awaitingConf}     icon={Clock}      color="text-amber-500" />
            <StatsCard title={t.dashboard.totalEarnings}    value={`₹${totalEarnings}`}    description={t.dashboard.allTimeCompleted} icon={Activity}   color="text-blue-500" />
            <StatsCard title={t.dashboard.totalPatients}    value={appointments?.length ? new Set(appointments.map((a: any) => a.patientId)).size : 0} description={t.dashboard.uniqueInteractions} icon={Users} color="text-purple-500" />
          </>
        ) : (
          <>
            <StatsCard title={t.dashboard.totalAppointments} value={totalAppointments}      description={t.dashboard.allTime}          icon={Calendar}   color="text-blue-500" />
            <StatsCard title={t.dashboard.pendingRequests}   value={pendingAppointments}    description={t.dashboard.awaitingConfirm}  icon={Clock}      color="text-amber-500" />
            <StatsCard title={t.dashboard.confirmed}         value={confirmedAppointments}  description={t.dashboard.upcomingVisits}   icon={CheckCircle} color="text-green-500" />
            <StatsCard title={t.dashboard.doctorsVisited}    value={appointments?.length ? new Set(appointments.map((a: any) => a.doctorId)).size : 0} description={t.dashboard.uniqueInteractions} icon={Users} color="text-purple-500" />
          </>
        )}
      </div>

      {/* Main Content Split */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-7">
        <Card className="md:col-span-4 border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>{t.dashboard.upcomingAppointments}</CardTitle>
            <CardDescription>
              {t.dashboard.youHave} {pendingAppointments} {t.dashboard.pendingAnd} {confirmedAppointments} {t.dashboard.confirmedAppointments}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : (
              <AppointmentListInner appointments={upcomingAppointments} role={role} />
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>{t.dashboard.quickActions}</CardTitle>
          </CardHeader>
          <CardContent>
            {isDoctor ? (
              <div className="space-y-4">
                <Button variant="outline" className="w-full justify-start h-12" asChild>
                  <Link href="/appointments">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> {t.dashboard.confirmPending}
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start h-12" asChild>
                  <Link href="/prescriptions">
                    <Activity className="w-4 h-4 mr-2 text-blue-500" /> {t.dashboard.writePrescription}
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start h-12" asChild>
                  <Link href="/analytics">
                    <XCircle className="w-4 h-4 mr-2 text-purple-500" /> {t.dashboard.viewAnalytics}
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Button variant="outline" className="w-full justify-start h-12" asChild>
                  <Link href="/doctors">
                    <Activity className="w-4 h-4 mr-2 text-primary" /> {t.dashboard.findADoctor}
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start h-12" asChild>
                  <Link href="/ai-assistant">
                    <Brain className="w-4 h-4 mr-2 text-purple-500" /> {t.dashboard.aiHealthAssist}
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start h-12" asChild>
                  <Link href="/appointments">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> {t.dashboard.viewAppointments}
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start h-12" asChild>
                  <Link href="/prescriptions">
                    <XCircle className="w-4 h-4 mr-2 text-blue-500" /> {t.dashboard.myPrescriptions}
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

