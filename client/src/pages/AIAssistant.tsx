import { useState, useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";

import {
  Brain, Stethoscope, Pill, FlaskConical,
  AlertTriangle, CheckCircle, Clock,
  Plus, Bell, Calendar, Trash2, Edit, Loader2, Salad,
  Apple, Utensils, Heart, Building2, Star, IndianRupee,
  Shield, Activity, UserCheck, CalendarClock, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { format } from "date-fns";
import type { MedicineReminder } from "@shared/schema";
import { AIAssistantProvider, useAIAssistant, type AIDoctorResult } from "@/context/AIAssistantContext";
import { useCreateAppointment } from "@/hooks/use-appointments";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function RiskBadge({ text, size = "default" }: { text: string; size?: "default" | "lg" }) {
  const u = text.toUpperCase();
  const base = size === "lg" ? "text-sm px-4 py-1.5" : "";
  if (u.includes("EMERGENCY"))
    return <Badge variant="destructive" className={cn("bg-red-600 gap-1 animate-pulse", base)}><AlertTriangle className="w-3 h-3" />EMERGENCY</Badge>;
  if (u.includes("HIGH"))
    return <Badge variant="destructive" className={cn("gap-1", base)}><AlertTriangle className="w-3 h-3" />HIGH</Badge>;
  if (u.includes("MEDIUM"))
    return <Badge className={cn("bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1", base)}><Clock className="w-3 h-3" />MEDIUM</Badge>;
  return <Badge variant="outline" className={cn("gap-1", base)}><CheckCircle className="w-3 h-3" />LOW</Badge>;
}

function getRiskColor(risk: string) {
  const u = risk.toUpperCase();
  if (u.includes("EMERGENCY")) return { bg: "bg-red-50 border-red-200", text: "text-red-800", icon: "text-red-600", glow: "shadow-red-100" };
  if (u.includes("HIGH")) return { bg: "bg-red-50 border-red-200", text: "text-red-700", icon: "text-red-500", glow: "shadow-red-100" };
  if (u.includes("MEDIUM")) return { bg: "bg-amber-50 border-amber-200", text: "text-amber-800", icon: "text-amber-500", glow: "shadow-amber-100" };
  return { bg: "bg-green-50 border-green-200", text: "text-green-800", icon: "text-green-500", glow: "shadow-green-100" };
}

function AIResultBox({ content }: { content: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-5 text-sm leading-7 whitespace-pre-wrap font-sans">
      {content}
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex gap-1 items-center px-4 py-3">
      {[0, 0.15, 0.3].map((d, i) => (
        <span key={i} className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"
          style={{ animationDelay: `${d}s` }} />
      ))}
    </div>
  );
}

/** Parse the AI analysis text to extract possible conditions */
function extractConditions(analysis: string): string[] {
  const conditions: string[] = [];
  const causeSection = analysis.match(/Possible Causes\s*\n([\s\S]*?)(?=\n\n|\nRecommended|\n✔|\n🚨)/i);
  if (causeSection) {
    const lines = causeSection[1].split("\n").filter(l => l.trim());
    for (const line of lines) {
      const m = line.match(/^\d+\.\s*(.+)/);
      if (m) conditions.push(m[1].trim());
    }
  }
  return conditions.slice(0, 4);
}

/** Parse next available slot from doctor availability */
function getNextAvailableSlot(availability: string[]): { day: string; time: string; isToday: boolean } {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  const todayDay = dayNames[today.getDay()];

  for (const slot of availability) {
    const parts = slot.split(" ");
    if (parts.length >= 2) {
      const day = parts[0];
      const timeRange = parts[1];
      const startTime = timeRange.split("-")[0];
      if (day === todayDay) {
        return { day: "Today", time: startTime, isToday: true };
      }
    }
  }

  // Find next available day
  const todayIdx = today.getDay();
  for (let offset = 1; offset <= 7; offset++) {
    const checkIdx = (todayIdx + offset) % 7;
    const checkDay = dayNames[checkIdx];
    const match = availability.find(a => a.startsWith(checkDay));
    if (match) {
      const timeRange = match.split(" ")[1];
      const startTime = timeRange?.split("-")[0] || "09:00";
      const dayLabel = offset === 1 ? "Tomorrow" : checkDay;
      return { day: dayLabel, time: startTime, isToday: false };
    }
  }

  return { day: "Mon", time: "09:00", isToday: false };
}

// ─── Book Appointment Dialog (inline in AI flow) ─────────────────────────────

function AIBookAppointmentDialog({
  doctor,
  symptoms,
  risk,
  specialist,
}: {
  doctor: AIDoctorResult;
  symptoms: string;
  risk: string;
  specialist: string;
}) {
  const { user } = useAuth();
  const { mutate: createAppointment, isPending } = useCreateAppointment();
  const [open, setOpen] = useState(false);
  const slot = getNextAvailableSlot(doctor.availability);

  const formSchema = z.object({
    date: z.string().min(1, "Date is required").refine(
      (d) => new Date(d) >= new Date(new Date().toDateString()),
      "Date cannot be in the past"
    ),
    time: z.string().min(1, "Time is required"),
    reason: z.string().min(5, "Please describe your reason (min 5 characters)"),
    consultationType: z.enum(["online", "offline", "video"]),
  });

  const today = new Date();
  const defaultDate = slot.isToday
    ? format(today, "yyyy-MM-dd")
    : format(new Date(today.getTime() + (slot.day === "Tomorrow" ? 86400000 : 86400000 * 2)), "yyyy-MM-dd");

  const reasonSummary = `AI Analysis: ${risk} risk. Symptoms: ${symptoms.substring(0, 150)}. Recommended: ${specialist}.`;

  const availableModes: { value: string; label: string; fee?: number | null }[] = [];
  if (doctor.onlineEnabled) availableModes.push({ value: "online", label: "Online", fee: doctor.onlineFee });
  if (doctor.offlineEnabled) availableModes.push({ value: "offline", label: "Offline (In-Clinic)", fee: doctor.offlineFee });
  if (doctor.videoEnabled) availableModes.push({ value: "video", label: "Video Call", fee: doctor.videoFee });

  const defaultType = availableModes.length > 0 ? availableModes[0].value : "offline";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: defaultDate,
      time: slot.time,
      reason: reasonSummary,
      consultationType: defaultType as "online" | "offline" | "video",
    },
  });

  const selectedModeValue = form.watch("consultationType");
  const selectedMode = availableModes.find(m => m.value === selectedModeValue);
  const displayFee = selectedMode?.fee || doctor.consultationFee;

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    const dateTime = new Date(`${values.date}T${values.time}`);
    createAppointment(
      { 
        doctorId: doctor.id, 
        date: dateTime, 
        reason: values.reason,
        consultationType: values.consultationType,
        consultationFee: displayFee
      },
      { onSuccess: () => setOpen(false) }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full gap-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-md hover:shadow-lg transition-all duration-300">
          <CalendarClock className="w-4 h-4" />
          Book Appointment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            Book with {doctor.name}
          </DialogTitle>
          <DialogDescription>
            {doctor.specialization} • {doctor.hospital}
          </DialogDescription>
        </DialogHeader>

        {/* AI Summary Banner */}
        <div className={cn("rounded-lg p-3 border text-sm", getRiskColor(risk).bg)}>
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-4 h-4" />
            <span className="font-semibold">AI Analysis Summary</span>
            <RiskBadge text={risk} />
          </div>
          <p className="text-xs opacity-80 mt-1">
            Recommended: {specialist} • Symptoms: {symptoms.substring(0, 80)}…
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="consultationType" render={({ field }) => (
              <FormItem>
                <FormLabel>Consultation Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableModes.map(mode => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label} - ₹{mode.fee || doctor.consultationFee}
                      </SelectItem>
                    ))}
                    {availableModes.length === 0 && (
                      <SelectItem value="offline">Offline - ₹{doctor.consultationFee}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="time" render={({ field }) => (
                <FormItem>
                  <FormLabel>Time</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>Reason for Visit</FormLabel>
                <FormControl>
                  <Textarea rows={3} className="resize-none text-xs" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter className="flex items-center justify-between mt-2">
              <div className="text-sm font-semibold">
                Total Fee: <span className="text-primary">₹{displayFee}</span>
              </div>
              <Button type="submit" disabled={isPending} className="gap-2">
                {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Booking…</> : <><CheckCircle className="w-4 h-4" />Confirm Booking</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Doctor Card ──────────────────────────────────────────────────────────────

function DoctorCard({
  doctor,
  symptoms,
  risk,
  specialist,
  index,
}: {
  doctor: AIDoctorResult;
  symptoms: string;
  risk: string;
  specialist: string;
  index: number;
}) {
  const slot = getNextAvailableSlot(doctor.availability);
  const rating = (4.5 + Math.random() * 0.5).toFixed(1);
  const fullStars = Math.floor(parseFloat(rating));

  return (
    <Card
      className="overflow-hidden border-border/60 hover:shadow-xl hover:border-primary/30 transition-all duration-500 group"
      style={{ animationDelay: `${index * 100}ms`, animation: "fadeInUp 0.5s ease-out forwards", opacity: 0 }}
    >
      {/* Gradient header */}
      <div className="h-2 bg-gradient-to-r from-primary via-blue-500 to-cyan-400" />

      <CardContent className="p-5 space-y-4">
        {/* Doctor info */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-400/20 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
            {doctor.name.split(" ").map(n => n[0]).join("").substring(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-base truncate">{doctor.name}</h4>
            <p className="text-sm text-primary font-medium">{doctor.specialization}</p>
            <div className="flex items-center gap-1 mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn("w-3.5 h-3.5", i < fullStars ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200")} />
              ))}
              <span className="text-xs text-muted-foreground ml-1">{rating}</span>
            </div>
          </div>
        </div>

        <hr className="border-border/60" />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="w-4 h-4 flex-shrink-0 text-blue-500" />
            <span className="truncate">{doctor.hospital}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="w-4 h-4 flex-shrink-0 text-green-500" />
            <span>{doctor.experience} Yrs Exp</span>
          </div>
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <IndianRupee className="w-4 h-4 flex-shrink-0 text-emerald-500" />
            <span>₹{doctor.consultationFee}</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarClock className={cn("w-4 h-4 flex-shrink-0", slot.isToday ? "text-green-500" : "text-amber-500")} />
            <span className={cn("text-sm", slot.isToday ? "text-green-700 font-medium" : "text-muted-foreground")}>
              {slot.day} {slot.time}
            </span>
          </div>
        </div>

        {/* Availability pill */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium",
          slot.isToday ? "bg-green-50 text-green-700 border border-green-200" : "bg-blue-50 text-blue-700 border border-blue-200"
        )}>
          <span className={cn("w-2 h-2 rounded-full", slot.isToday ? "bg-green-500 animate-pulse" : "bg-blue-500")} />
          {slot.isToday ? "Available Today" : `Next: ${slot.day}`} at {slot.time}
        </div>

        {/* Book button */}
        <AIBookAppointmentDialog
          doctor={doctor}
          symptoms={symptoms}
          risk={risk}
          specialist={specialist}
        />
      </CardContent>
    </Card>
  );
}

// ─── Tab 1: Symptom Checker → Doctor Flow ─────────────────────────────────────

function SymptomCheckerTab() {
  const {
    symptoms, setSymptoms,
    symptomAnalysis, setSymptomAnalysis,
    symptomLoading, setSymptomLoading,
    recommendedSpecialist, setRecommendedSpecialist,
    riskLevel, setRiskLevel,
    urgency, setUrgency,
    recommendedDoctors, setRecommendedDoctors,
  } = useAIAssistant();
  const { toast } = useToast();
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const quickSymptoms = [
    "Chest pain, left arm pain, sweating",
    "Severe headache, blurred vision, nausea",
    "Fever, cough, difficulty breathing",
    "Joint pain, swelling, stiffness",
    "Skin rash, itching, redness",
    "Stomach pain, bloating, nausea",
  ];

  const analyze = async () => {
    if (!symptoms.trim() || symptomLoading) return;
    setSymptomLoading(true);
    setSymptomAnalysis("");
    setRecommendedSpecialist("");
    setRiskLevel("");
    setUrgency("");
    setRecommendedDoctors([]);
    setShowFullAnalysis(false);

    try {
      const res = await fetch("/api/ai/analyze-symptoms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      setSymptomAnalysis(data.analysis);
      setRecommendedSpecialist(data.recommendedSpecialist);
      setRiskLevel(data.risk);
      setUrgency(data.urgency);
      setRecommendedDoctors(data.doctors || []);

      toast({ title: "✅ Analysis complete", description: `Recommended: ${data.recommendedSpecialist}` });
    } catch {
      toast({ title: "Analysis failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setSymptomLoading(false);
    }
  };

  const conditions = symptomAnalysis ? extractConditions(symptomAnalysis) : [];
  const riskColors = riskLevel ? getRiskColor(riskLevel) : null;

  return (
    <div className="space-y-6">
      {/* ── Step 1: Symptom Input ───────────────────────────────────────── */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="w-5 h-5 text-primary" />
            Describe Your Symptoms
          </CardTitle>
          <CardDescription>
            Include what you feel, how long it's been, and any relevant numbers (e.g. blood sugar, temperature).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="e.g. I have chest pain radiating to my left arm, excessive sweating, and dizziness for the past 2 hours…"
            value={symptoms}
            onChange={e => setSymptoms(e.target.value)}
            rows={4}
            className="min-h-[110px] resize-none"
          />

          {/* Quick symptom chips */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Quick pick:</p>
            <div className="flex flex-wrap gap-2">
              {quickSymptoms.map(s => (
                <button
                  key={s}
                  onClick={() => setSymptoms(s)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-full border transition-all duration-200",
                    symptoms === s
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "border-border hover:bg-muted hover:border-primary/40 hover:shadow-sm"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{symptoms.length} characters</span>
            <Button onClick={analyze} disabled={symptomLoading || !symptoms.trim()} className="gap-2 shadow-md">
              {symptomLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing…</>
                : <><Brain className="w-4 h-4" />Analyze Symptoms</>}
            </Button>
          </div>
          {symptomLoading && (
            <div className="text-center space-y-2 py-4">
              <div className="flex justify-center gap-1">
                {[0, 0.15, 0.3].map((d, i) => (
                  <span key={i} className="w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce"
                    style={{ animationDelay: `${d}s` }} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                🧠 AI is analyzing your symptoms and finding matching doctors…
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Step 2: AI Analysis Result ─────────────────────────────────── */}
      {symptomAnalysis && riskColors && (
        <div className="space-y-4" style={{ animation: "fadeInUp 0.4s ease-out" }}>
          {/* Risk + Specialist + Urgency Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Risk Level */}
            <Card className={cn("border-2 shadow-lg", riskColors.bg, riskColors.glow)}>
              <CardContent className="p-5 text-center space-y-2">
                <Activity className={cn("w-8 h-8 mx-auto", riskColors.icon)} />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk Level</p>
                <RiskBadge text={riskLevel} size="lg" />
              </CardContent>
            </Card>

            {/* Recommended Specialist */}
            <Card className="border-2 border-primary/20 bg-primary/5 shadow-lg shadow-primary/5">
              <CardContent className="p-5 text-center space-y-2">
                <Heart className="w-8 h-8 mx-auto text-primary" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recommended Specialist</p>
                <p className="text-lg font-bold text-primary">{recommendedSpecialist}</p>
              </CardContent>
            </Card>

            {/* Urgency */}
            <Card className="border-2 border-amber-200 bg-amber-50/50 shadow-lg shadow-amber-100">
              <CardContent className="p-5 text-center space-y-2">
                <Zap className="w-8 h-8 mx-auto text-amber-500" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Urgency</p>
                <p className="text-sm font-semibold text-amber-800">{urgency}</p>
              </CardContent>
            </Card>
          </div>

          {/* Possible Conditions */}
          {conditions.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Possible Conditions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {conditions.map((c, i) => (
                    <Badge key={i} variant="secondary" className="py-1.5 px-3 text-sm">
                      {c}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Full AI Analysis (collapsible) */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  Detailed AI Analysis
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullAnalysis(!showFullAnalysis)}
                  className="text-xs"
                >
                  {showFullAnalysis ? "Hide Details" : "Show Details"}
                </Button>
              </div>
            </CardHeader>
            {showFullAnalysis && (
              <CardContent>
                <AIResultBox content={symptomAnalysis} />
              </CardContent>
            )}
          </Card>

          {/* ── Step 3: Doctor Cards ───────────────────────────────────── */}
          <div className="space-y-4" style={{ animation: "fadeInUp 0.5s ease-out 0.2s forwards", opacity: 0 }}>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/20">
                <UserCheck className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Available {recommendedSpecialist}s</span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-border via-border to-transparent" />
            </div>

            {recommendedDoctors.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {recommendedDoctors.map((doc, i) => (
                  <DoctorCard
                    key={doc.id}
                    doctor={doc}
                    symptoms={symptoms}
                    risk={riskLevel}
                    specialist={recommendedSpecialist}
                    index={i}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-2">
                <CardContent className="py-10 text-center">
                  <Stethoscope className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium mb-1">No {recommendedSpecialist}s found</p>
                  <p className="text-sm text-muted-foreground">
                    Try browsing all doctors on the{" "}
                    <Link href="/doctors" className="text-primary underline">Find Doctors</Link> page.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Doctor receives AI summary note */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="py-4 px-5 flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">📋 Patient Summary for Doctor</p>
                <p className="text-xs opacity-80">
                  When you book an appointment, the doctor will automatically receive your AI analysis including: 
                  symptoms, risk level ({riskLevel}), recommended specialist ({recommendedSpecialist}), 
                  and the analysis date. This helps the doctor prepare before your consultation.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Medicine Reminders ────────────────────────────────────────────────

const emptyForm = { medicineName: "", dosage: "", frequency: "", time: "", startDate: "", endDate: "" };

function MedicineRemindersTab() {
  const [reminders, setReminders] = useState<MedicineReminder[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MedicineReminder | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();

  useEffect(() => { fetchAll(); }, []);

  const sendTestNotification = async () => {
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "✅ Test notification sent!",
          description: "Check your phone/browser for the push notification.",
        });
      } else {
        toast({
          title: "Failed",
          description: data.error || "No device token found. Open the app in Chrome and allow notifications first.",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Failed to send test", variant: "destructive" });
    }
  };

  const fetchAll = async () => {
    try {
      const res = await fetch("/api/medicine-reminders", { credentials: "include" });
      if (res.ok) setReminders(await res.json());
    } catch {
      toast({ title: "Could not load reminders", variant: "destructive" });
    } finally {
      setPageLoading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medicineName || !form.dosage || !form.frequency || !form.time || !form.startDate) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(editing ? `/api/medicine-reminders/${editing.id}` : "/api/medicine-reminders", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      await fetchAll();
      setDialogOpen(false);
      reset();
      toast({
        title: editing ? "Reminder updated ✅" : "Reminder created ✅",
        description: `You'll be notified to take ${form.medicineName} at ${form.time}.`,
      });
    } catch {
      toast({ title: "Failed to save reminder", variant: "destructive" });
    }
  };

  const remove = async (id: number) => {
    try {
      await fetch(`/api/medicine-reminders/${id}`, { method: "DELETE", credentials: "include" });
      await fetchAll();
      toast({ title: "Reminder deleted" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const toggle = async (r: MedicineReminder) => {
    try {
      await fetch(`/api/medicine-reminders/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !r.isActive }),
      });
      await fetchAll();
      toast({
        title: r.isActive ? "Reminder paused" : "Reminder resumed",
      });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const startEdit = (r: MedicineReminder) => {
    setEditing(r);
    setForm({
      medicineName: r.medicineName,
      dosage: r.dosage,
      frequency: r.frequency,
      time: r.time,
      startDate: format(new Date(r.startDate), "yyyy-MM-dd"),
      endDate: r.endDate ? format(new Date(r.endDate), "yyyy-MM-dd") : "",
    });
    setDialogOpen(true);
  };

  const reset = () => { setForm(emptyForm); setEditing(null); };

  if (pageLoading) return (
    <div className="py-16 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
      <Loader2 className="w-6 h-6 animate-spin" />Loading reminders…
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {reminders.length === 0
            ? "No reminders set yet."
            : `${reminders.filter(r => r.isActive).length} active · ${reminders.length} total`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={sendTestNotification}
            className="text-xs gap-1.5"
          >
            <Bell className="w-3.5 h-3.5" />
            Test Notification
          </Button>
          <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) reset(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1.5" />Add Reminder</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Reminder" : "New Medicine Reminder"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Medicine Name *</Label>
                  <Input placeholder="e.g. Metformin" value={form.medicineName}
                    onChange={e => setForm({ ...form, medicineName: e.target.value })} required />
                </div>
                <div>
                  <Label>Dosage *</Label>
                  <Input placeholder="e.g. 500mg" value={form.dosage}
                    onChange={e => setForm({ ...form, dosage: e.target.value })} required />
                </div>
                <div>
                  <Label>Time *</Label>
                  <Input type="time" value={form.time}
                    onChange={e => setForm({ ...form, time: e.target.value })} required />
                </div>
                <div className="col-span-2">
                  <Label>Frequency *</Label>
                  <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                    <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                    <SelectContent>
                      {["once daily", "twice daily", "three times daily", "weekly", "as needed"].map(f => (
                        <SelectItem key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Start Date *</Label>
                  <Input type="date" value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })} required />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={form.endDate}
                    onChange={e => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">{editing ? "Update" : "Create Reminder"}</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {reminders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center">
            <Bell className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium mb-1">No reminders yet</p>
            <p className="text-sm text-muted-foreground">Add your first medicine reminder — you'll get a notification at the set time.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reminders.map(r => (
            <Card key={r.id} className={cn("border-border/60 transition-opacity", !r.isActive && "opacity-55")}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Pill className="w-4 h-4 text-primary flex-shrink-0" />
                    {r.medicineName}
                  </CardTitle>
                  <Badge variant={r.isActive ? "default" : "secondary"} className="text-[10px] flex-shrink-0">
                    {r.isActive ? "Active" : "Paused"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{r.dosage}</p>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Bell className="w-3.5 h-3.5" /><span className="capitalize">{r.frequency}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" /><span>{r.time}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {format(new Date(r.startDate), "MMM d")}
                    {r.endDate && ` – ${format(new Date(r.endDate), "MMM d")}`}
                  </span>
                </div>
                <div className="flex gap-2 pt-3">
                  <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => toggle(r)}>
                    {r.isActive ? "Pause" : "Resume"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => remove(r.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab 4: Medicine Recommendation ──────────────────────────────────────────
function MedicineRecommendationTab() {
  const { condition, setCondition, medicineResult, setMedicineResult, medicineLoading, setMedicineLoading } = useAIAssistant();
  const { toast } = useToast();

  const recommend = async () => {
    if (!condition.trim() || medicineLoading) return;
    setMedicineLoading(true);
    setMedicineResult("");
    try {
      const res = await fetch("/api/ai/recommend-medicines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition: condition.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Request failed");
      }
      const data = await res.json();
      setMedicineResult(data.recommendation);
      toast({ title: "💊 Medicine info ready", description: `Results for "${condition}" are ready.` });
    } catch (e: any) {
      toast({ title: "Request failed", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setMedicineLoading(false);
    }
  };

  const quickOptions = [
    "Type 2 Diabetes", "High Blood Pressure", "Common Cold", "Migraine",
    "Acid Reflux", "Anxiety", "Asthma", "UTI",
  ];

  return (
    <div className="space-y-6">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="w-5 h-5 text-primary" />
            Medicine Recommendation
          </CardTitle>
          <CardDescription>
            Enter a condition or disease to see commonly used medicines, typical dosages, and precautions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Type 2 Diabetes, Migraine, High Blood Pressure…"
              value={condition}
              onChange={e => setCondition(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") recommend(); }}
              disabled={medicineLoading}
            />
            <Button onClick={recommend} disabled={medicineLoading || !condition.trim()}>
              {medicineLoading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading…</>
                : <><FlaskConical className="w-4 h-4 mr-2" />Get Info</>}
            </Button>
          </div>

          {medicineLoading && (
            <p className="text-xs text-muted-foreground text-center py-1">
              ⏳ Loading in the background — you can navigate away and come back for results.
            </p>
          )}

          <div>
            <p className="text-xs text-muted-foreground mb-2">Quick search:</p>
            <div className="flex flex-wrap gap-2">
              {quickOptions.map(opt => (
                <button
                  key={opt}
                  onClick={() => setCondition(opt)}
                  className="px-3 py-1 text-xs rounded-full border border-border hover:bg-muted hover:border-primary/40 transition-colors"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {medicineResult && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Pill className="w-5 h-5 text-primary" />
              Results for "{condition}"
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AIResultBox content={medicineResult} />
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Do not self-medicate.</strong> This information is for educational purposes only.
                Always consult a licensed doctor or pharmacist before starting any medication.
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab 5: Diet & Nutrition Plan ────────────────────────────────────────────

function DietPlanTab() {
  const {
    dietCondition, setDietCondition,
    dietAge, setDietAge,
    dietWeight, setDietWeight,
    dietActivity, setDietActivity,
    dietFoodPref, setDietFoodPref,
    dietPlan, setDietPlan,
    dietLoading, setDietLoading,
  } = useAIAssistant();
  const { toast } = useToast();

  const generate = async () => {
    if (!dietCondition.trim() || dietLoading) return;
    setDietLoading(true);
    setDietPlan("");
    try {
      const res = await fetch("/api/ai/diet-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          condition:      dietCondition,
          age:            dietAge,
          weight:         dietWeight,
          activityLevel:  dietActivity,
          foodPreference: dietFoodPref,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      if (!data.plan) throw new Error("No plan returned from server");
      setDietPlan(data.plan);
      toast({ title: "🥗 Diet plan ready!", description: "Your personalised 7-day plan is below." });
    } catch (e: any) {
      console.error("[Diet] Error:", e);
      toast({ title: "Generation failed", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setDietLoading(false);
    }
  };

  const quickConditions = [
    "Type 2 Diabetes", "High Blood Pressure", "Weight Loss",
    "Heart Disease", "PCOS", "Thyroid", "High Cholesterol", "General Health",
  ];

  return (
    <div className="space-y-6">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Utensils className="w-5 h-5 text-primary" />
            AI Diet & Nutrition Plan
          </CardTitle>
          <CardDescription>
            Fill in your details and get a personalised 7-day meal plan tailored to your health condition.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Quick picks */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Select your condition (or type below)
            </Label>
            <div className="flex flex-wrap gap-2">
              {quickConditions.map(c => (
                <button
                  key={c}
                  onClick={() => setDietCondition(c)}
                  className={cn(
                    "px-3 py-1 text-xs rounded-full border transition-colors",
                    dietCondition === c
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-muted hover:border-primary/40"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Health Condition *</Label>
              <Input
                placeholder="e.g. Type 2 Diabetes, PCOS…"
                value={dietCondition}
                onChange={e => setDietCondition(e.target.value)}
                disabled={dietLoading}
              />
            </div>
            <div>
              <Label>Age</Label>
              <Input
                placeholder="e.g. 35"
                value={dietAge}
                onChange={e => setDietAge(e.target.value)}
                disabled={dietLoading}
              />
            </div>
            <div>
              <Label>Weight</Label>
              <Input
                placeholder="e.g. 75 kg"
                value={dietWeight}
                onChange={e => setDietWeight(e.target.value)}
                disabled={dietLoading}
              />
            </div>
            <div>
              <Label>Activity Level</Label>
              <Select value={dietActivity} onValueChange={setDietActivity} disabled={dietLoading}>
                <SelectTrigger><SelectValue placeholder="Select activity level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sedentary (little/no exercise)">Sedentary (little/no exercise)</SelectItem>
                  <SelectItem value="Light (1-3 days/week)">Light (1–3 days/week)</SelectItem>
                  <SelectItem value="Moderate (3-5 days/week)">Moderate (3–5 days/week)</SelectItem>
                  <SelectItem value="Active (6-7 days/week)">Active (6–7 days/week)</SelectItem>
                  <SelectItem value="Very Active (athlete)">Very Active (athlete)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Food Preference</Label>
              <Select value={dietFoodPref} onValueChange={setDietFoodPref} disabled={dietLoading}>
                <SelectTrigger><SelectValue placeholder="Select food preference" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vegetarian">Vegetarian</SelectItem>
                  <SelectItem value="Vegan">Vegan</SelectItem>
                  <SelectItem value="Non-Vegetarian">Non-Vegetarian</SelectItem>
                  <SelectItem value="Eggetarian">Eggetarian</SelectItem>
                  <SelectItem value="No preference">No preference</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={generate}
              disabled={dietLoading || !dietCondition.trim()}
              className="gap-2"
            >
              {dietLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Generating Plan…</>
                : <><Salad className="w-4 h-4" />Generate 7-Day Diet Plan</>
              }
            </Button>
          </div>

          {dietLoading && (
            <p className="text-xs text-muted-foreground text-center">
              ⏳ Generating your personalised plan — you can navigate away and come back.
            </p>
          )}
        </CardContent>
      </Card>

      {dietPlan && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Apple className="w-5 h-5 text-green-500" />
              Your 7-Day Diet Plan — {dietCondition}
            </CardTitle>
            <CardDescription>
              AI-generated personalised nutrition plan. Review with your doctor before starting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AIResultBox content={dietPlan} />
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-xs text-green-800 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600" />
              <span>
                <strong>Tip:</strong> For best results, follow this plan consistently for at least 2 weeks.
                Drink plenty of water and consult your doctor before making major dietary changes.
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const tabs = [
  { id: "symptom",   label: "Symptom Checker",        icon: Stethoscope,   shortLabel: "Symptoms"  },
  { id: "diet",      label: "Diet & Nutrition",        icon: Salad,         shortLabel: "Diet"      },
];

function AIAssistantInner() {
  const { symptomLoading, dietLoading } = useAIAssistant();
  const anyLoading = symptomLoading || dietLoading;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Global CSS for animations */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
          <Brain className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-display font-bold tracking-tight">AI Health Assistant</h2>
            {anyLoading && (
              <Badge variant="secondary" className="gap-1.5 text-xs">
                <Loader2 className="w-3 h-3 animate-spin" />
                Processing…
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            AI-powered symptom analysis with instant doctor recommendations. Results are saved when you switch tabs.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="symptom">
        <TabsList className="grid grid-cols-2 w-full h-auto p-1">
          {tabs.map(t => (
            <TabsTrigger key={t.id} value={t.id}
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2.5 text-xs sm:text-sm">
              <t.icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.shortLabel}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="symptom"   className="mt-0"><SymptomCheckerTab /></TabsContent>
          <TabsContent value="diet"      className="mt-0"><DietPlanTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default function AIAssistant() {
  return (
    <AIAssistantInner />
  );
}
