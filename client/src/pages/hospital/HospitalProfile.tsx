import { useState, useEffect } from "react";
import { useHospitalAuth } from "@/hooks/use-hospital-auth";
import { useUpdateHospitalProfile } from "@/hooks/use-hospital-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Building2, MapPin, Phone, Globe, Clock, Upload, Image as ImageIcon, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function HospitalProfile() {
  const { hospital } = useHospitalAuth();
  const updateMut = useUpdateHospitalProfile();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name:               hospital?.name || "",
    phone:              hospital?.phone || "",
    address:            hospital?.address || "",
    city:               hospital?.city || "",
    state:              hospital?.state || "",
    country:            hospital?.country || "India",
    zipcode:            hospital?.zipcode || "",
    description:        hospital?.description || "",
    website:            hospital?.website || "",
    emergencyNumber:    hospital?.emergencyNumber || "",
    openingTime:        hospital?.openingTime || "09:00",
    closingTime:        hospital?.closingTime || "21:00",
    bedCount:           hospital?.bedCount || 0,
    ambulanceAvailable: hospital?.ambulanceAvailable ?? false,
    parkingAvailable:   hospital?.parkingAvailable ?? false,
    icuAvailable:       hospital?.icuAvailable ?? false,
    hospitalImage:      hospital?.hospitalImage || hospital?.imageUrl || "",
  });

  useEffect(() => {
    if (hospital) {
      setForm({
        name:               hospital.name || "",
        phone:              hospital.phone || "",
        address:            hospital.address || "",
        city:               hospital.city || "",
        state:              hospital.state || "",
        country:            hospital.country || "India",
        zipcode:            hospital.zipcode || "",
        description:        hospital.description || "",
        website:            hospital.website || "",
        emergencyNumber:    hospital.emergencyNumber || "",
        openingTime:        hospital.openingTime || "09:00",
        closingTime:        hospital.closingTime || "21:00",
        bedCount:           hospital.bedCount || 0,
        ambulanceAvailable: hospital.ambulanceAvailable ?? false,
        parkingAvailable:   hospital.parkingAvailable ?? false,
        icuAvailable:       hospital.icuAvailable ?? false,
        hospitalImage:      hospital.hospitalImage || hospital.imageUrl || "",
      });
    }
  }, [hospital]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Image size must be less than 5MB.", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        set("hospitalImage", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMut.mutateAsync({
        ...form,
        imageUrl: form.hospitalImage, // sync legacy field as well
      });
      toast({ title: "Profile Updated", description: "Your hospital information has been saved successfully." });
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message || "Could not save profile.", variant: "destructive" });
    }
  };

  if (!hospital) return null;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Hospital Profile</h1>
        <p className="text-muted-foreground text-sm">Update and manage complete hospital details and banner image</p>
      </div>

      {/* Header card with Live Image Banner Preview */}
      <Card className="overflow-hidden border-border/60">
        <div className="relative h-48 bg-gradient-to-r from-blue-600 to-indigo-700">
          {form.hospitalImage ? (
            <img
              src={form.hospitalImage}
              alt="Hospital banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/80">
              <Building2 className="w-12 h-12 mb-2" />
              <p className="text-sm font-medium">No banner image uploaded</p>
            </div>
          )}
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between text-white">
            <div>
              <h2 className="text-2xl font-bold drop-shadow-md">{form.name || "Hospital Name"}</h2>
              <p className="text-sm text-white/90 drop-shadow-md flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                {form.city ? `${form.city}, ${form.state}` : "City, State"}
              </p>
            </div>

            <Label htmlFor="banner-upload" className="cursor-pointer bg-white/20 hover:bg-white/30 text-white backdrop-blur-md px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all">
              <Upload className="w-4 h-4" /> Change Photo
            </Label>
            <input
              id="banner-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageFile}
            />
          </div>
        </div>

        <CardContent className="pt-4 pb-4 bg-card">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Phone, label: "Phone", val: form.phone || "—" },
              { icon: Globe, label: "Website", val: form.website || "—" },
              { icon: Phone, label: "Emergency", val: form.emergencyNumber || "—" },
              { icon: Clock, label: "Hours", val: `${form.openingTime} – ${form.closingTime}` },
            ].map(({ icon: Icon, label, val }) => (
              <div key={label} className="flex items-start gap-2">
                <Icon className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium truncate">{val}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Information */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Basic & Contact Details</CardTitle>
            <CardDescription>Primary hospital details visible to patients</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Hospital Name</Label>
                <Input value={form.name} onChange={e => set("name", e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label>Contact Phone</Label>
                <Input value={form.phone} onChange={e => set("phone", e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label>Website URL</Label>
                <Input value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://..." />
              </div>

              <div className="space-y-1.5">
                <Label>Emergency Helpline</Label>
                <Input value={form.emergencyNumber} onChange={e => set("emergencyNumber", e.target.value)} placeholder="102 or direct line" />
              </div>
            </div>

            {/* Photo URL / Upload input */}
            <div className="space-y-1.5">
              <Label className="flex items-center justify-between">
                <span>Image / Banner URL or Upload</span>
                <span className="text-xs text-muted-foreground">Upload file above or paste image URL here</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  value={form.hospitalImage}
                  onChange={e => set("hospitalImage", e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Hospital Description</Label>
              <Textarea
                value={form.description}
                onChange={e => set("description", e.target.value)}
                rows={3}
                placeholder="Brief summary of hospital facilities, specialties, and history..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Address & Timings */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Location & Operations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Street address" required />
            </div>

            <div className="grid sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={form.city} onChange={e => set("city", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input value={form.state} onChange={e => set("state", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input value={form.country} onChange={e => set("country", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Zip Code</Label>
                <Input value={form.zipcode} onChange={e => set("zipcode", e.target.value)} />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label>Opening Time</Label>
                <Input type="time" value={form.openingTime} onChange={e => set("openingTime", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Closing Time</Label>
                <Input type="time" value={form.closingTime} onChange={e => set("closingTime", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Total Bed Count</Label>
                <Input type="number" value={form.bedCount} onChange={e => set("bedCount", parseInt(e.target.value) || 0)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Facilities & Services Toggles */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Available Facilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { key: "ambulanceAvailable", label: "24/7 Ambulance Service", desc: "Ambulance fleet available for emergencies" },
                { key: "parkingAvailable",   label: "Visitor Parking",        desc: "On-site parking area available" },
                { key: "icuAvailable",       label: "ICU Unit",               desc: "Intensive care unit available" },
              ].map(({ key, label, desc }) => {
                const active = (form as any)[key];
                return (
                  <div
                    key={key}
                    onClick={() => set(key, !active)}
                    className={`cursor-pointer p-4 rounded-xl border transition-all flex items-start justify-between ${
                      active ? "bg-blue-50/60 border-blue-500 dark:bg-blue-950/30" : "bg-card border-border/60 hover:border-border"
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                      active ? "bg-blue-600 border-blue-600 text-white" : "border-muted-foreground"
                    }`}>
                      {active && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-2">
          <Button type="submit" size="lg" disabled={updateMut.isPending} className="px-8 font-semibold">
            {updateMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save Profile Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
