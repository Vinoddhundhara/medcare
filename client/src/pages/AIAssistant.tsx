import { useState, useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Brain, Stethoscope, MessageCircle, Pill, FlaskConical,
  Send, Bot, User, AlertTriangle, CheckCircle, Clock,
  Plus, Bell, Calendar, Trash2, Edit, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { format } from "date-fns";
import type { MedicineReminder } from "@shared/schema";
import { AIAssistantProvider, useAIAssistant } from "@/context/AIAssistantContext";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function RiskBadge({ text }: { text: string }) {
  const u = text.toUpperCase();
  if (u.includes("EMERGENCY"))
    return <Badge variant="destructive" className="bg-red-600 gap-1"><AlertTriangle className="w-3 h-3" />EMERGENCY</Badge>;
  if (u.includes("HIGH"))
    return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />HIGH</Badge>;
  if (u.includes("MEDIUM"))
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1"><Clock className="w-3 h-3" />MEDIUM</Badge>;
  return <Badge variant="outline" className="gap-1"><CheckCircle className="w-3 h-3" />LOW</Badge>;
}

function getRiskLevel(analysis: string) {
  const m = analysis.match(/⚠️\s*Risk Level\s*\n([A-Z]+)/i);
  return m ? m[1].trim() : "";
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

// ─── Tab 1: Symptom Checker ───────────────────────────────────────────────────

function SymptomCheckerTab() {
  const { symptoms, setSymptoms, symptomAnalysis, setSymptomAnalysis, symptomLoading, setSymptomLoading } = useAIAssistant();
  const { toast } = useToast();
  // Keep a ref so the in-flight request can still update state even when navigated away
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const analyze = async () => {
    if (!symptoms.trim() || symptomLoading) return;
    setSymptomLoading(true);
    setSymptomAnalysis("");
    try {
      const res = await fetch("/api/ai/symptoms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      // Update state even if user navigated away — result will be there when they return
      setSymptomAnalysis(data.analysis);
      toast({ title: "✅ Symptom analysis complete", description: "Your results are ready." });
    } catch {
      toast({ title: "Analysis failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setSymptomLoading(false);
    }
  };

  const riskLevel = symptomAnalysis ? getRiskLevel(symptomAnalysis) : "";

  return (
    <div className="space-y-6">
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
            placeholder="e.g. I have excessive thirst, frequent urination, and fatigue. Blood sugar was 280 mg/dL this morning. Symptoms started 2 days ago…"
            value={symptoms}
            onChange={e => setSymptoms(e.target.value)}
            rows={4}
            className="min-h-[110px] resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{symptoms.length} characters</span>
            <Button onClick={analyze} disabled={symptomLoading || !symptoms.trim()}>
              {symptomLoading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing…</>
                : <><Brain className="w-4 h-4 mr-2" />Analyze Symptoms</>}
            </Button>
          </div>
          {symptomLoading && (
            <p className="text-xs text-muted-foreground text-center py-1">
              ⏳ Analysis running in the background — you can freely navigate away and come back.
            </p>
          )}
        </CardContent>
      </Card>

      {symptomAnalysis && (
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Analysis Result
              </CardTitle>
              {riskLevel && <RiskBadge text={riskLevel} />}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <AIResultBox content={symptomAnalysis} />
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
              <Stethoscope className="w-4 h-4 flex-shrink-0" />
              <span>Want to book an appointment with the recommended specialist?</span>
              <Button size="sm" variant="outline" className="ml-auto border-blue-300 text-blue-700 hover:bg-blue-100" asChild>
                <Link href="/doctors">Find Doctors</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab 2: Medical Chatbot ───────────────────────────────────────────────────

function MedicalChatbotTab() {
  const { messages, setMessages, chatInput, setChatInput, chatLoading, setChatLoading } = useAIAssistant();
  const { toast } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  const send = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { id: Date.now().toString(), text: chatInput.trim(), sender: "user" as const, time: new Date() };
    const updatedWithUser = [...messages, userMsg];
    setMessages(updatedWithUser);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.text }),
      });
      const data = await res.json();
      const aiMsg = { id: (Date.now() + 1).toString(), text: data.reply, sender: "ai" as const, time: new Date() };
      setMessages([...updatedWithUser, aiMsg]);
      toast({ title: "💬 AI replied to your question" });
    } catch {
      setMessages([...updatedWithUser, {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble right now. Please try again.",
        sender: "ai" as const,
        time: new Date(),
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <Card className="border-border/60 flex flex-col" style={{ height: "520px" }}>
      <CardHeader className="pb-3 border-b flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="w-5 h-5 text-primary" />
          AI Medical Chatbot
        </CardTitle>
        <CardDescription>Ask any health question. Your conversation is saved while you're on this page.</CardDescription>
      </CardHeader>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={cn("flex gap-3", msg.sender === "user" ? "justify-end" : "justify-start")}>
            {msg.sender === "ai" && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className={cn(
              "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
              msg.sender === "user"
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-muted text-foreground rounded-bl-sm"
            )}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
              <p className={cn("text-[10px] mt-1 opacity-60", msg.sender === "user" ? "text-right" : "")}>
                {msg.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            {msg.sender === "user" && (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {chatLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-sm">
              <LoadingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t flex-shrink-0">
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Can diabetics eat mangoes?"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            disabled={chatLoading}
          />
          <Button onClick={send} disabled={!chatInput.trim() || chatLoading} size="icon">
            {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          General information only — not a substitute for professional medical advice.
        </p>
      </div>
    </Card>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

const tabs = [
  { id: "symptom",   label: "Symptom Checker",        icon: Stethoscope,   shortLabel: "Symptoms" },
  { id: "chat",      label: "Medical Chatbot",         icon: MessageCircle, shortLabel: "Chat"     },
  { id: "reminder",  label: "Medicine Reminders",      icon: Bell,          shortLabel: "Reminders"},
  { id: "recommend", label: "Medicine Recommendation", icon: FlaskConical,  shortLabel: "Medicines"},
];

function AIAssistantInner() {
  const { symptomLoading, chatLoading, medicineLoading } = useAIAssistant();
  const anyLoading = symptomLoading || chatLoading || medicineLoading;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
            Four AI-powered tools — all in one place. Results are saved when you switch tabs.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="symptom">
        <TabsList className="grid grid-cols-4 w-full h-auto p-1">
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
          <TabsContent value="chat"      className="mt-0"><MedicalChatbotTab /></TabsContent>
          <TabsContent value="reminder"  className="mt-0"><MedicineRemindersTab /></TabsContent>
          <TabsContent value="recommend" className="mt-0"><MedicineRecommendationTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default function AIAssistant() {
  return (
    <AIAssistantProvider>
      <AIAssistantInner />
    </AIAssistantProvider>
  );
}
