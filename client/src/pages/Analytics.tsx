import { useAuth } from "@/hooks/use-auth";
import { useAppointments } from "@/hooks/use-appointments";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { format, subDays, isSameDay } from "date-fns";
import { TrendingUp, Users, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "#22c55e",
  pending: "#f59e0b",
  completed: "#3b82f6",
  rejected: "#ef4444",
  cancelled: "#6b7280",
};

function StatCard({ title, value, icon: Icon, color, sub }: any) {
  return (
    <Card className="border-border/60 hover:shadow-md transition-all">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const { user } = useAuth();
  const { data: appointments, isLoading } = useAppointments();

  if (!user) return null;

  // --- Compute stats ---
  const total = appointments?.length || 0;
  const confirmed = appointments?.filter((a: any) => a.status === "confirmed").length || 0;
  const completed = appointments?.filter((a: any) => a.status === "completed").length || 0;
  const pending = appointments?.filter((a: any) => a.status === "pending").length || 0;
  const rejected = appointments?.filter((a: any) => a.status === "rejected").length || 0;
  const cancelled = appointments?.filter((a: any) => a.status === "cancelled").length || 0;

  // Status breakdown for pie chart
  const statusData = [
    { name: "Confirmed", value: confirmed, color: STATUS_COLORS.confirmed },
    { name: "Completed", value: completed, color: STATUS_COLORS.completed },
    { name: "Pending", value: pending, color: STATUS_COLORS.pending },
    { name: "Rejected", value: rejected, color: STATUS_COLORS.rejected },
    { name: "Cancelled", value: cancelled, color: STATUS_COLORS.cancelled },
  ].filter((d) => d.value > 0);

  // Last 7 days trend
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const count = appointments?.filter((a: any) =>
      isSameDay(new Date(a.date), day)
    ).length || 0;
    return { day: format(day, "EEE"), date: format(day, "MMM d"), count };
  });

  // Top doctors (for patient view) or top patients (for doctor view)
  const topEntities: Record<string, number> = {};
  appointments?.forEach((a: any) => {
    const key =
      user.role === "patient"
        ? `Dr. ${a.doctor?.user?.name}`
        : a.patient?.user?.name;
    if (key) topEntities[key] = (topEntities[key] || 0) + 1;
  });
  const topList = Object.entries(topEntities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground mt-1">
          Overview of your appointment activity and trends.
        </p>
      </div>

      {/* Stat Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Appointments" value={total} icon={Calendar} color="bg-blue-500" sub="All time" />
          <StatCard title="Completed" value={completed} icon={CheckCircle} color="bg-green-500" sub="Successfully done" />
          <StatCard title="Pending" value={pending} icon={Clock} color="bg-amber-500" sub="Awaiting confirmation" />
          <StatCard title="Cancelled / Rejected" value={cancelled + rejected} icon={XCircle} color="bg-red-500" sub="Did not proceed" />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* 7-day trend */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Appointments — Last 7 Days
            </CardTitle>
            <CardDescription>Daily appointment count for the past week</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={last7Days} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(v: any) => [v, "Appointments"]}
                    labelFormatter={(l, p) => p[0]?.payload?.date || l}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status breakdown */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Status Breakdown
            </CardTitle>
            <CardDescription>Distribution of appointment statuses</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full rounded-lg" />
            ) : statusData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any, n: any) => [v, n]} />
                  <Legend iconType="circle" iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top doctors / patients */}
      {topList.length > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              {user.role === "patient" ? "Most Visited Doctors" : "Most Active Patients"}
            </CardTitle>
            <CardDescription>Ranked by number of appointments</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={topList}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: any) => [v, "Appointments"]} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
