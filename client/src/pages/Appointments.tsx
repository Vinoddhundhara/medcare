import { useAppointments, useUpdateAppointmentStatus } from "@/hooks/use-appointments";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Calendar, Check, X, Clock, User, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Appointments() {
  const { user } = useAuth();
  const { data: appointments, isLoading } = useAppointments();
  const { mutate: updateStatus } = useUpdateAppointmentStatus();

  if (isLoading) return <div>Loading...</div>;

  const isDoctor = user?.role === "doctor";

  const renderActionButtons = (apt: any) => {
    if (!isDoctor || apt.status !== "pending") return null;
    return (
      <div className="flex gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => updateStatus({ id: apt.id, status: "rejected" })}
        >
          <X className="w-4 h-4 mr-1" /> Reject
        </Button>
        <Button 
          size="sm" 
          className="bg-green-600 hover:bg-green-700"
          onClick={() => updateStatus({ id: apt.id, status: "confirmed" })}
        >
          <Check className="w-4 h-4 mr-1" /> Confirm
        </Button>
      </div>
    );
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    completed: "bg-blue-100 text-blue-800",
    cancelled: "bg-gray-100 text-gray-800",
  };

  const filterAppointments = (status: string) => {
    if (status === "all") return appointments;
    return appointments?.filter((a: any) => status === "scheduled" ? ["pending", "confirmed"].includes(a.status) : a.status === status);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold tracking-tight">Appointments</h2>
        <p className="text-muted-foreground mt-1">
          Manage your schedule and view appointment history.
        </p>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="mt-6 space-y-4">
          {filterAppointments("scheduled")?.length === 0 ? (
            <div className="text-center py-12 bg-muted/20 rounded-xl">
              <p className="text-muted-foreground">No upcoming appointments found.</p>
            </div>
          ) : (
            filterAppointments("scheduled")?.map((apt: any) => (
              <Card key={apt.id} className="overflow-hidden border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center justify-center w-16 h-16 bg-primary/10 rounded-xl text-primary font-bold">
                        <span className="text-sm uppercase">{format(new Date(apt.date), "MMM")}</span>
                        <span className="text-2xl">{format(new Date(apt.date), "d")}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          {isDoctor ? apt.patient.user.name : `Dr. ${apt.doctor.user.name}`}
                          <Badge variant="secondary" className={statusColors[apt.status]}>
                            {apt.status}
                          </Badge>
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:gap-4 text-sm text-muted-foreground mt-1">
                           <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {format(new Date(apt.date), "h:mm a")}</span>
                           <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> {apt.reason}</span>
                        </div>
                      </div>
                    </div>
                    {renderActionButtons(apt)}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6 space-y-4">
          {/* Similar list but for completed/cancelled/rejected */}
          {filterAppointments("history")?.length === 0 && (
             <div className="text-center py-12 bg-muted/20 rounded-xl">
              <p className="text-muted-foreground">No history found.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
