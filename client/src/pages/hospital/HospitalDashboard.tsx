import { useHospitalDashboard } from "@/hooks/use-hospital-data";
import { useHospitalAuth } from "@/hooks/use-hospital-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Calendar, Users, Stethoscope, DollarSign, TrendingUp,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

const statusColors: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

function StatCard({ title, value, icon: Icon, color, sub }: any) {
  return (
    <Card className="hover:shadow-lg transition-shadow border-border/60">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value ?? "—"}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HospitalDashboard() {
  const { hospital } = useHospitalAuth();
  const { data, isLoading } = useHospitalDashboard();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const stats = [
    { title: "Today's Appointments", value: data?.today ?? 0,         icon: Calendar,    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/40", sub: "Scheduled for today" },
    { title: "Total Revenue",       value: `₹${(data?.revenue ?? 0).toLocaleString()}`, icon: DollarSign, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40", sub: "Paid appointments" },
    { title: "Active Doctors",      value: data?.doctorCount ?? 0,    icon: Stethoscope, color: "bg-violet-100 text-violet-600 dark:bg-violet-900/40", sub: "Hospital doctors" },
    { title: "Registered Patients", value: data?.patientCount ?? 0,   icon: Users,       color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40", sub: "Total patients" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Welcome back, <span className="font-medium text-foreground">{hospital?.name}</span>
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => <StatCard key={s.title} {...s} />)}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Appointments (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data?.appointmentChart || []}>
                <defs>
                  <linearGradient id="apptGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => [v, "Appointments"]} labelFormatter={l => `Date: ${l}`} />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#apptGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Revenue (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.revenueChart || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [`₹${v.toLocaleString()}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent appointments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Appointments</CardTitle>
          <CardDescription>Latest 10 appointments across all doctors</CardDescription>
        </CardHeader>
        <CardContent>
          {!data?.recentAppointments?.length ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No appointments yet</div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 px-2 font-medium text-muted-foreground">Patient</th>
                    <th className="pb-2 px-2 font-medium text-muted-foreground">Doctor</th>
                    <th className="pb-2 px-2 font-medium text-muted-foreground">Date</th>
                    <th className="pb-2 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="pb-2 px-2 font-medium text-muted-foreground">Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentAppointments.map((a: any) => (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-2 font-medium">{a.patient?.user?.name || "—"}</td>
                      <td className="py-2.5 px-2 text-muted-foreground">{a.doctor?.user?.name || "—"}</td>
                      <td className="py-2.5 px-2 text-muted-foreground">{format(new Date(a.date), "MMM d, yyyy h:mm a")}</td>
                      <td className="py-2.5 px-2">
                        <Badge className={`capitalize text-xs ${statusColors[a.status]}`}>{a.status}</Badge>
                      </td>
                      <td className="py-2.5 px-2">₹{a.consultationFee || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
