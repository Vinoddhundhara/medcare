import { useHospitalAppointments } from "@/hooks/use-hospital-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { DollarSign, TrendingUp, CheckCircle, Clock } from "lucide-react";

const PAYMENT_STATUS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30",
  paid:    "bg-green-100 text-green-800 dark:bg-green-900/30",
  refunded:"bg-red-100 text-red-800 dark:bg-red-900/30",
};

export default function HospitalPayments() {
  const { data: appointments, isLoading } = useHospitalAppointments();

  const paid     = (appointments || []).filter((a: any) => a.paymentStatus === "paid");
  const pending  = (appointments || []).filter((a: any) => a.paymentStatus === "pending");
  const refunded = (appointments || []).filter((a: any) => a.paymentStatus === "refunded");
  const totalRevenue   = paid.reduce((s: number, a: any)    => s + (a.consultationFee || 0), 0);
  const pendingRevenue = pending.reduce((s: number, a: any) => s + (a.consultationFee || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-muted-foreground text-sm">Financial overview and transaction history</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue",  value: `₹${totalRevenue.toLocaleString()}`,   icon: DollarSign,  color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30" },
          { label: "Paid",           value: paid.length,                            icon: CheckCircle, color: "bg-green-100 text-green-600 dark:bg-green-900/30"    },
          { label: "Pending",        value: pending.length,                         icon: Clock,       color: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30"  },
          { label: "Refunded",       value: refunded.length,                        icon: TrendingUp,  color: "bg-red-100 text-red-600 dark:bg-red-900/30"          },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold mt-1">{String(value)}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${color}`}><Icon className="w-4 h-4" /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending amount banner */}
      {pendingRevenue > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900">
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              ⚠️ <span className="font-semibold">₹{pendingRevenue.toLocaleString()}</span> in pending payments from {pending.length} appointments
            </p>
          </CardContent>
        </Card>
      )}

      {/* Transaction table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Patient</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Doctor</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Method</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(appointments || []).map((a: any) => (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="py-3 px-4">{a.patient?.user?.name || "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{a.doctor?.user?.name || "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{format(new Date(a.date), "MMM d, yyyy")}</td>
                      <td className="py-3 px-4 font-medium">₹{a.consultationFee || 0}</td>
                      <td className="py-3 px-4 text-muted-foreground capitalize">{a.paymentMethod || "—"}</td>
                      <td className="py-3 px-4">
                        <Badge className={`text-xs capitalize ${PAYMENT_STATUS[a.paymentStatus] || ""}`}>
                          {a.paymentStatus}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!appointments?.length && (
                <div className="py-12 text-center text-muted-foreground text-sm">No transactions yet</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
