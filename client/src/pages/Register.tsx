import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useHospitalAuth } from "@/hooks/use-hospital-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useLocation, useSearch } from "wouter";
import { Loader2, User, Building2 } from "lucide-react";
import { registerUserSchema } from "@shared/schema";
import { useLanguage } from "@/context/LanguageContext";

// ── User Register ─────────────────────────────────────────────────────────────
function UserRegisterForm() {
  const { register, isRegistering, user } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const au = t.auth;

  const form = useForm<z.infer<typeof registerUserSchema>>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      username: "", password: "", role: "patient", name: "", email: "",
      patientDetails: { age: 0, gender: "other", contact: "", medicalHistory: "" },
      doctorDetails: { specialization: "", experience: 0, consultationFee: 0, availability: [] },
    },
  });

  const selectedRole = form.watch("role");

  function onSubmit(values: z.infer<typeof registerUserSchema>) {
    const payload = { ...values };
    if (payload.role === "patient") delete payload.doctorDetails;
    if (payload.role === "doctor") delete payload.patientDetails;
    if (payload.patientDetails) payload.patientDetails.age = Number(payload.patientDetails.age);
    if (payload.doctorDetails) {
      payload.doctorDetails.experience = Number(payload.doctorDetails.experience);
      payload.doctorDetails.consultationFee = Number(payload.doctorDetails.consultationFee);
    }
    register(payload, { onSuccess: () => setLocation("/login") });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>{au.fullName}</FormLabel><FormControl>
              <Input placeholder="John Doe" {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem><FormLabel>{au.email}</FormLabel><FormControl>
              <Input placeholder="john@example.com" {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <FormField control={form.control} name="username" render={({ field }) => (
            <FormItem><FormLabel>Username</FormLabel><FormControl>
              <Input placeholder="johndoe123" {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem><FormLabel>{au.password}</FormLabel><FormControl>
              <Input type="password" placeholder="••••••••" {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="role" render={({ field }) => (
          <FormItem><FormLabel>{au.roleSelect}</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="patient">{au.patient}</SelectItem>
                <SelectItem value="doctor">{au.doctor}</SelectItem>
              </SelectContent>
            </Select><FormMessage />
          </FormItem>
        )} />

        {/* Patient fields */}
        {selectedRole === "patient" && (
          <div className="space-y-4 border-l-4 border-primary/20 pl-4">
            <h3 className="font-semibold">{t.profile.personalInfo}</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <FormField control={form.control} name="patientDetails.age" render={({ field }) => (
                <FormItem><FormLabel>{t.profile.age}</FormLabel><FormControl>
                  <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                </FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="patientDetails.gender" render={({ field }) => (
                <FormItem><FormLabel>{t.profile.gender}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="patientDetails.contact" render={({ field }) => (
                <FormItem><FormLabel>{t.profile.contact}</FormLabel><FormControl>
                  <Input placeholder="+91 9999999999" {...field} />
                </FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </div>
        )}

        {/* Doctor fields */}
        {selectedRole === "doctor" && (
          <div className="space-y-4 border-l-4 border-primary/20 pl-4">
            <h3 className="font-semibold">{t.profile.professionalDetails}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <FormField control={form.control} name="doctorDetails.specialization" render={({ field }) => (
                <FormItem><FormLabel>{t.profile.specialization}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {["Cardiology","Dermatology","Neurology","Pediatrics","General Medicine","Orthopedics","Gastroenterology","Pulmonology"].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="doctorDetails.experience" render={({ field }) => (
                <FormItem><FormLabel>{t.profile.experience}</FormLabel><FormControl>
                  <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                </FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="doctorDetails.consultationFee" render={({ field }) => (
              <FormItem><FormLabel>{au.consultationFee}</FormLabel><FormControl>
                <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
              </FormControl><FormMessage /></FormItem>
            )} />
          </div>
        )}

        <Button type="submit" className="w-full h-11 font-semibold" disabled={isRegistering}>
          {isRegistering && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {isRegistering ? au.registering : au.register}
        </Button>
      </form>
    </Form>
  );
}

// ── Hospital Register Form ────────────────────────────────────────────────────
function HospitalRegisterForm() {
  const { register, registerPending, registerError } = useHospitalAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const STEPS = ["Basic Info", "Location", "Facilities", "Account"];

  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
    address: "", city: "", state: "", country: "India", zipcode: "",
    description: "", website: "", emergencyNumber: "",
    licenseNumber: "", gstNumber: "",
    ambulanceAvailable: false, parkingAvailable: false, icuAvailable: false,
    bedCount: 0, openingTime: "09:00", closingTime: "21:00",
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < STEPS.length - 1) { setStep(s => s + 1); return; }
    if (form.password !== form.confirmPassword) return;
    try {
      await register(form);
      setLocation("/hospital/dashboard");
    } catch {}
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Step indicator */}
      <div className="flex gap-1 mb-4">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1 flex flex-col items-center gap-1">
            <div className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold transition-colors ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
            <span className={`text-xs ${i === step ? "text-primary font-medium" : "text-muted-foreground"}`}>{s}</span>
          </div>
        ))}
      </div>

      {/* Step 0 */}
      {step === 0 && <>
        <Field label="Hospital Name *" value={form.name} onChange={v => set("name", v)} required />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone *" value={form.phone} onChange={v => set("phone", v)} required placeholder="040-23607777" />
          <Field label="Emergency Number" value={form.emergencyNumber} onChange={v => set("emergencyNumber", v)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="License Number" value={form.licenseNumber} onChange={v => set("licenseNumber", v)} />
          <Field label="GST Number" value={form.gstNumber} onChange={v => set("gstNumber", v)} />
        </div>
        <Field label="Website" value={form.website} onChange={v => set("website", v)} placeholder="https://hospital.com" />
        <div>
          <label className="text-sm font-medium">Description</label>
          <Textarea value={form.description} onChange={e => set("description", e.target.value)} className="mt-1.5 min-h-20" />
        </div>
      </>}

      {/* Step 1 */}
      {step === 1 && <>
        <Field label="Street Address *" value={form.address} onChange={v => set("address", v)} required />
        <div className="grid grid-cols-2 gap-3">
          <Field label="City *" value={form.city} onChange={v => set("city", v)} required />
          <Field label="State *" value={form.state} onChange={v => set("state", v)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Country" value={form.country} onChange={v => set("country", v)} />
          <Field label="Zipcode" value={form.zipcode} onChange={v => set("zipcode", v)} />
        </div>
      </>}

      {/* Step 2 */}
      {step === 2 && <>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Total Beds" type="number" value={String(form.bedCount)} onChange={v => set("bedCount", parseInt(v)||0)} />
          <Field label="Opening Time" type="time" value={form.openingTime} onChange={v => set("openingTime", v)} />
        </div>
        <Field label="Closing Time" type="time" value={form.closingTime} onChange={v => set("closingTime", v)} />
        <div className="flex gap-5 pt-1">
          {[["ambulanceAvailable","Ambulance"],["parkingAvailable","Parking"],["icuAvailable","ICU"]].map(([k,l]) => (
            <label key={k} className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={(form as any)[k]} onChange={e => set(k, e.target.checked)} className="w-4 h-4 accent-primary" />
              {l}
            </label>
          ))}
        </div>
      </>}

      {/* Step 3 */}
      {step === 3 && <>
        <Field label="Admin Email *" type="email" value={form.email} onChange={v => set("email", v)} required />
        <Field label="Password *" type="password" value={form.password} onChange={v => set("password", v)} required />
        <Field label="Confirm Password *" type="password" value={form.confirmPassword} onChange={v => set("confirmPassword", v)} required />
        {form.password && form.confirmPassword && form.password !== form.confirmPassword && (
          <p className="text-sm text-destructive">Passwords do not match</p>
        )}
      </>}

      {registerError && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {registerError.message}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        {step > 0 && (
          <Button type="button" variant="outline" onClick={() => setStep(s => s-1)} className="flex-1">Back</Button>
        )}
        <Button type="submit" disabled={registerPending} className="flex-1">
          {registerPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {step < STEPS.length - 1 ? "Next →" : "Register Hospital"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, value, onChange, type="text", required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} placeholder={placeholder} className="h-10" />
    </div>
  );
}

// ── Main Register page ────────────────────────────────────────────────────────
export default function Register() {
  const { user } = useAuth();
  const { hospital } = useHospitalAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const defaultTab = search.includes("role=hospital") ? "hospital" : "user";
  const { t } = useLanguage();
  const au = t.auth;

  if (user)     { setLocation("/dashboard");          return null; }
  if (hospital) { setLocation("/hospital/dashboard"); return null; }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 py-10">
      <Card className="w-full max-w-2xl shadow-2xl border-primary/10">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-bold text-primary">{au.registerTitle}</CardTitle>
          <CardDescription>Create your account</CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          <Tabs defaultValue={defaultTab}>
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="user" className="gap-2">
                <User className="w-4 h-4" /> Patient / Doctor
              </TabsTrigger>
              <TabsTrigger value="hospital" className="gap-2">
                <Building2 className="w-4 h-4" /> Hospital
              </TabsTrigger>
            </TabsList>

            <TabsContent value="user">
              <UserRegisterForm />
            </TabsContent>

            <TabsContent value="hospital">
              <HospitalRegisterForm />
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="justify-center border-t p-6 bg-muted/10">
          <p className="text-sm text-muted-foreground">
            {au.hasAccount}{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              {au.signIn}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

