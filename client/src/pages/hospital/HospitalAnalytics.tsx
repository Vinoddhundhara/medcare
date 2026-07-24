import { useHospitalAnalytics } from "@/hooks/use-hospital-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, DollarSign, Stethoscope } from "lucide-react";

export default function HospitalAnalytics() {
  const { data, isLoading } = useHospitalAnalytics();

  if (isLoading) {
    return (
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm">Insights into your hospital performance</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Cancellation Rate", value: `${data?.cancellationRate ?? 0}%`, icon: TrendingUp, color: "text-red-500" },
          { label: "Top Doctor", value: data?.topDoctors?.[0]?.name ?? "—", icon: Stethoscope, color: "text-violet-500" },
          { label: "Most Booked", value: `${data?.topDoctors?.[0]?.appointmentCount ?? 0} appts`, icon: TrendingUp, color: "text-emerald-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                {label}
              </div>
              <p className="font-bold text-lg truncate">{String(value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments per day */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" /> Appointments Per Day (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data?.appointmentsPerDay || []}>
                <defs>
                  <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#aGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue per month */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" /> Revenue Per Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.revenuePerMonth || []}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [`₹${v.toLocaleString()}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Doctors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Top Doctors by Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(data?.topDoctors || []).map((doc: any, i: number) => (
              <div key={doc.id} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{doc.name}</span>
                    <span className="text-muted-foreground">{doc.appointmentCount} appts</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (doc.appointmentCount / (data?.topDoctors?.[0]?.appointmentCount || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {!data?.topDoctors?.length && (
              <p className="text-center text-muted-foreground text-sm py-4">No data yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
