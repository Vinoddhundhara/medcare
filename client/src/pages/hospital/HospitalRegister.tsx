import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useHospitalAuth } from "@/hooks/use-hospital-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Loader2, ChevronRight, ChevronLeft } from "lucide-react";

const STEPS = ["Basic Info", "Location", "Facilities", "Account"];

export default function HospitalRegister() {
  const { register, registerPending, registerError, isAuthenticated } = useHospitalAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
    address: "", city: "", state: "", country: "India", zipcode: "",
    description: "", website: "", emergencyNumber: "",
    licenseNumber: "", gstNumber: "",
    ambulanceAvailable: false, parkingAvailable: false, icuAvailable: false,
    bedCount: 0, openingTime: "09:00", closingTime: "21:00",
  });

  if (isAuthenticated) {
    setLocation("/hospital/dashboard");
    return null;
  }

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < STEPS.length - 1) { setStep(s => s + 1); return; }
    try { await register(form); } catch {}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-4 shadow-xl">
            <Building2 className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Register Hospital</h1>
          <p className="text-slate-400 mt-1">Join our multi-hospital management platform</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i <= step ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-400"
              }`}>{i + 1}</div>
              <span className={`text-xs hidden sm:block ${i === step ? "text-white" : "text-slate-500"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? "bg-blue-600" : "bg-slate-700"}`} />}
            </div>
          ))}
        </div>

        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">{STEPS[step]}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Step 0: Basic Info */}
              {step === 0 && (
                <>
                  <Field label="Hospital Name" value={form.name} onChange={(v: string) => set("name", v)} required placeholder="Apollo Hospital" />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Phone Number" value={form.phone} onChange={(v: string) => set("phone", v)} required placeholder="040-23607777" />
                    <Field label="Emergency Number" value={form.emergencyNumber} onChange={(v: string) => set("emergencyNumber", v)} placeholder="040-23607999" />
                  </div>
                  <Field label="License Number" value={form.licenseNumber} onChange={(v: string) => set("licenseNumber", v)} placeholder="MH-12345" />
                  <Field label="GST Number" value={form.gstNumber} onChange={(v: string) => set("gstNumber", v)} placeholder="27AAPFU0939F1ZV" />
                  <Field label="Website" value={form.website} onChange={(v: string) => set("website", v)} placeholder="https://www.hospital.com" />
                  <div>
                    <Label className="text-slate-300">Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={e => set("description", e.target.value)}
                      placeholder="Brief description about your hospital..."
                      className="mt-1.5 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                      rows={3}
                    />
                  </div>
                </>
              )}

              {/* Step 1: Location */}
              {step === 1 && (
                <>
                  <Field label="Street Address" value={form.address} onChange={(v: string) => set("address", v)} required placeholder="Jubilee Hills, Road No. 36" />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="City" value={form.city} onChange={(v: string) => set("city", v)} required placeholder="Hyderabad" />
                    <Field label="State" value={form.state} onChange={(v: string) => set("state", v)} required placeholder="Telangana" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Country" value={form.country} onChange={(v: string) => set("country", v)} required placeholder="India" />
                    <Field label="Zipcode" value={form.zipcode} onChange={(v: string) => set("zipcode", v)} placeholder="500033" />
                  </div>
                </>
              )}

              {/* Step 2: Facilities */}
              {step === 2 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Bed Count" type="number" value={String(form.bedCount)} onChange={(v: string) => set("bedCount", parseInt(v) || 0)} placeholder="500" />
                    <Field label="Opening Time" type="time" value={form.openingTime} onChange={(v: string) => set("openingTime", v)} />
                  </div>
                  <Field label="Closing Time" type="time" value={form.closingTime} onChange={(v: string) => set("closingTime", v)} />
                  <div className="flex gap-6 mt-2">
                    {[
                      { key: "ambulanceAvailable", label: "Ambulance" },
                      { key: "parkingAvailable",   label: "Parking"   },
                      { key: "icuAvailable",       label: "ICU"        },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(form as any)[key]}
                          onChange={e => set(key, e.target.checked)}
                          className="w-4 h-4 accent-blue-600"
                        />
                        <span className="text-sm text-slate-300">{label}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}

              {/* Step 3: Account */}
              {step === 3 && (
                <>
                  <Field label="Admin Email" type="email" value={form.email} onChange={(v: string) => set("email", v)} required placeholder="admin@hospital.com" />
                  <Field label="Password" type="password" value={form.password} onChange={(v: string) => set("password", v)} required placeholder="••••••••" />
                  <Field label="Confirm Password" type="password" value={form.confirmPassword} onChange={(v: string) => set("confirmPassword", v)} required placeholder="••••••••" />
                  {form.password && form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-sm text-red-400">Passwords do not match</p>
                  )}
                </>
              )}

              {registerError && (
                <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                  {registerError.message}
                </p>
              )}

              <div className="flex justify-between pt-2">
                {step > 0 ? (
                  <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                ) : (
                  <Link href="/hospital/login">
                    <a className="text-sm text-slate-400 hover:text-slate-300 flex items-center">Already registered?</a>
                  </Link>
                )}
                <Button type="submit" disabled={registerPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white">
                  {registerPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {step < STEPS.length - 1 ? <>Next <ChevronRight className="w-4 h-4 ml-1" /></> : "Register Hospital"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-300">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
      />
    </div>
  );
}
