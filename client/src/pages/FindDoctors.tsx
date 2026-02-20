import { useState } from "react";
import { useDoctors } from "@/hooks/use-doctors";
import { useHospitals } from "@/hooks/use-hospitals";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Building2, Stethoscope, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useCreateAppointment } from "@/hooks/use-appointments";
import { useAuth } from "@/hooks/use-auth";

// Appointment Booking Form inside Dialog
function BookAppointmentDialog({ doctor }: { doctor: any }) {
  const { user } = useAuth();
  const { mutate: createAppointment, isPending } = useCreateAppointment();
  const [open, setOpen] = useState(false);

  // Simplified form - in production use a nice Calendar component
  const formSchema = z.object({
    date: z.string().min(1, "Date is required"),
    time: z.string().min(1, "Time is required"),
    reason: z.string().min(5, "Reason is required"),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { date: "", time: "", reason: "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    
    // Combine date and time into timestamp
    const dateTime = new Date(`${values.date}T${values.time}`);

    createAppointment({
      doctorId: doctor.id,
      date: dateTime,
      reason: values.reason,
    }, {
      onSuccess: () => setOpen(false),
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">Book Appointment</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Book with Dr. {doctor.user.name}</DialogTitle>
          <DialogDescription>
            {doctor.specialization} • Consultation Fee: ${doctor.consultationFee}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Visit</FormLabel>
                  <FormControl>
                    <Input placeholder="General checkup, headache, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Booking..." : "Confirm Booking"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function FindDoctors() {
  const [search, setSearch] = useState("");
  const [specialization, setSpecialization] = useState<string>("all");
  
  const { data: doctors, isLoading } = useDoctors({ 
    search: search || undefined,
    specialization: specialization === "all" ? undefined : specialization 
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold tracking-tight">Find a Doctor</h2>
        <p className="text-muted-foreground mt-1">
          Search for specialists and book your appointment.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-card rounded-xl border border-border/60 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name..." 
            className="pl-9 bg-background" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full md:w-[250px]">
          <Select value={specialization} onValueChange={setSpecialization}>
            <SelectTrigger>
              <SelectValue placeholder="Specialization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specializations</SelectItem>
              <SelectItem value="Cardiology">Cardiology</SelectItem>
              <SelectItem value="Dermatology">Dermatology</SelectItem>
              <SelectItem value="Neurology">Neurology</SelectItem>
              <SelectItem value="Pediatrics">Pediatrics</SelectItem>
              <SelectItem value="General Medicine">General Medicine</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-[300px] rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors?.map((doctor: any) => (
            <Card key={doctor.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 group border-border/60">
              <div className="h-24 bg-gradient-to-r from-primary/10 to-blue-400/10 group-hover:from-primary/20 group-hover:to-blue-400/20 transition-all"></div>
              <CardContent className="-mt-12 pt-0 relative">
                <div className="flex justify-between items-end mb-4">
                  <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-md">
                     <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center text-2xl font-bold text-slate-400">
                       {doctor.user.name.charAt(0)}
                     </div>
                  </div>
                  <Badge variant="secondary" className="mb-2">
                    {doctor.experience} Years Exp.
                  </Badge>
                </div>
                
                <h3 className="text-xl font-bold mb-1">Dr. {doctor.user.name}</h3>
                <p className="text-primary font-medium flex items-center gap-1 mb-4">
                  <Stethoscope className="w-4 h-4" /> {doctor.specialization}
                </p>

                <div className="space-y-2 text-sm text-muted-foreground">
                  {doctor.hospital && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {doctor.hospital.name}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                     <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                     4.8 Rating
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 p-4">
                 <BookAppointmentDialog doctor={doctor} />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
