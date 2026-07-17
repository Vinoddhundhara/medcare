import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { registerUserSchema } from "@shared/schema";
import { useLanguage } from "@/context/LanguageContext";

export default function Register() {
  const { register, isRegistering, user } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const au = t.auth;

  // Create a client-side friendly schema that allows empty strings for numbers initially (for UX)
  // then transforms them, or just use the schema directly but handle coerce carefully.
  // For simplicity here, we'll use the raw schema but add refinement if needed.
  // Actually, let's just use the form to gather strings and transform before submit.

  const form = useForm<z.infer<typeof registerUserSchema>>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "patient",
      name: "",
      email: "",
      // Initialize optional nested objects to avoid undefined errors in render
      patientDetails: { age: 0, gender: "other", contact: "", medicalHistory: "" },
      doctorDetails: { specialization: "", experience: 0, consultationFee: 0, availability: [] },
    },
  });

  const selectedRole = form.watch("role");

  if (user) {
    setLocation("/dashboard");
    return null;
  }

  function onSubmit(values: z.infer<typeof registerUserSchema>) {
    // Clean up data based on role
    const payload = { ...values };
    if (payload.role === "patient") delete payload.doctorDetails;
    if (payload.role === "doctor") delete payload.patientDetails;
    if (payload.role === "admin") {
       delete payload.doctorDetails;
       delete payload.patientDetails;
    }
    
    // Ensure numbers are numbers (handled by z.coerce in schema usually, or explicit coercion here)
    // The shared schema doesn't use z.coerce by default unless specified. 
    // Assuming backend handles it or we coerce here.
    // Let's coerce manualy for safety if inputs are text
    if (payload.patientDetails) {
       payload.patientDetails.age = Number(payload.patientDetails.age);
    }
    if (payload.doctorDetails) {
       payload.doctorDetails.experience = Number(payload.doctorDetails.experience);
       payload.doctorDetails.consultationFee = Number(payload.doctorDetails.consultationFee);
    }

    register(payload, {
      onSuccess: () => setLocation("/login"),
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 py-12">
      <Card className="w-full max-w-2xl shadow-2xl border-primary/10">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-display font-bold text-primary">{au.registerTitle}</CardTitle>
          <CardDescription>{au.registerSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{au.fullName}</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{au.email}</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.profile.fullName}</FormLabel>
                      <FormControl>
                        <Input placeholder="johndoe123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{au.password}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{au.roleSelect}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="patient">{au.patient}</SelectItem>
                        <SelectItem value="doctor">{au.doctor}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Conditional Fields: PATIENT */}
              {selectedRole === "patient" && (
                <div className="space-y-4 border-l-4 border-primary/20 pl-4 animate-in slide-in-from-left-4 fade-in duration-300">
                  <h3 className="font-semibold text-lg">{t.profile.personalInfo}</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="patientDetails.age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.profile.age}</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="patientDetails.gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.profile.gender}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="patientDetails.contact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.profile.contact}</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 234 567 890" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="patientDetails.medicalHistory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.profile.medicalHistory}</FormLabel>
                        <FormControl>
                          <Input placeholder={t.profile.medHistPlaceholder} {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Conditional Fields: DOCTOR */}
              {selectedRole === "doctor" && (
                <div className="space-y-4 border-l-4 border-primary/20 pl-4 animate-in slide-in-from-left-4 fade-in duration-300">
                  <h3 className="font-semibold text-lg">{t.profile.professionalDetails}</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="doctorDetails.specialization"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.profile.specialization}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Specialization" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Cardiology">Cardiology</SelectItem>
                              <SelectItem value="Dermatology">Dermatology</SelectItem>
                              <SelectItem value="Neurology">Neurology</SelectItem>
                              <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                              <SelectItem value="General Medicine">General Medicine</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="doctorDetails.experience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.profile.experience}</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="doctorDetails.consultationFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{au.consultationFee}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isRegistering}>
                {isRegistering ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isRegistering ? au.registering : au.register}
              </Button>
            </form>
          </Form>
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
