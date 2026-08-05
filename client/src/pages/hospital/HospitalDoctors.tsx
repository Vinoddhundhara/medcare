import { useState } from "react";
import {
  useHospitalDoctors, useAddHospitalDoctor, useUpdateHospitalDoctor,
  useToggleDoctorStatus, useDeleteHospitalDoctor, useHospitalDepartments,
} from "@/hooks/use-hospital-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Stethoscope, Plus, Pencil, Trash2, Loader2, Search,
  UserCheck, UserX,
} from "lucide-react";

const SPECIALIZATIONS = [
  "Cardiology", "Neurology", "Orthopedics", "General Medicine", "Pulmonology",
  "Gastroenterology", "Dermatology", "Pediatrics", "Radiology", "Oncology",
  "Psychiatry", "Ophthalmology", "ENT", "Urology", "Gynecology",
];



// ── Doctor Form Dialog ─────────────────────────────────────────
function DoctorFormDialog({ initial, departments, onClose }: any) {
  const addMut    = useAddHospitalDoctor();
  const updateMut = useUpdateHospitalDoctor();
  const isEdit = !!initial?.id;

  const [form, setForm] = useState({
    name:            initial?.user?.name || "",
    email:           initial?.user?.email || "",
    specialization:  initial?.specialization || "General Medicine",
    departmentId:    initial?.departmentId ? String(initial.departmentId) : "",
    experience:      String(initial?.experience || 0),
    consultationFee: String(initial?.consultationFee || 500),
    education:       initial?.education || "",
    languages:       (initial?.languages || []).join(", "),
    bio:             initial?.bio || "",
    status:          initial?.status || "active",
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const saving = addMut.isPending || updateMut.isPending;

  const handleSave = async () => {
    const payload = {
      ...form,
      languages: form.languages.split(",").map((l: string) => l.trim()).filter(Boolean),
      departmentId: form.departmentId || undefined,
    };
    if (isEdit) {
      await updateMut.mutateAsync({ id: initial.id, ...payload });
    } else {
      await addMut.mutateAsync(payload);
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Doctor" : "Add New Doctor"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <F label="Full Name" value={form.name} onChange={v => set("name", v)} required />
          <F label="Doctor's Email" type="email" value={form.email} onChange={v => set("email", v)} required />

          {!isEdit && (
            <div className="sm:col-span-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
              ℹ️ The doctor will log in using their email and the <strong>hospital's password</strong>. They can set their own schedule from their dashboard.
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Specialization</Label>
            <Select value={form.specialization} onValueChange={v => set("specialization", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SPECIALIZATIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select value={form.departmentId} onValueChange={v => set("departmentId", v)}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {departments?.map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <F label="Experience (years)" type="number" value={form.experience} onChange={v => set("experience", v)} />
          <F label="Consultation Fee (₹)" type="number" value={form.consultationFee} onChange={v => set("consultationFee", v)} />
          <F label="Education" value={form.education} onChange={v => set("education", v)} placeholder="MBBS, MD Cardiology" />
          <F label="Languages (comma separated)" value={form.languages} onChange={v => set("languages", v)} placeholder="English, Hindi, Telugu" />

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Bio</Label>
            <Textarea value={form.bio} onChange={e => set("bio", e.target.value)} placeholder="Brief professional bio..." rows={3} />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {isEdit ? "Save Changes" : "Add Doctor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, value, onChange, type = "text", required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && " *"}</Label>
      <Input type={type} value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} required={required} placeholder={placeholder} />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function HospitalDoctors() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDept, setFilterDept] = useState<number | undefined>();
  const [addOpen, setAddOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<any>(null);

  const { data: doctors, isLoading } = useHospitalDoctors({
    search,
    status:     filterStatus === "all" ? undefined : filterStatus,
    departmentId: filterDept,
  });
  const { data: departments } = useHospitalDepartments();
  const toggleStatus = useToggleDoctorStatus();
  const deleteDoc    = useDeleteHospitalDoctor();
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Doctors</h1>
          <p className="text-muted-foreground text-sm">{doctors?.length ?? 0} doctors registered</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Add Doctor
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search doctors..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterDept ? String(filterDept) : "all"} onValueChange={v => setFilterDept(v === "all" ? undefined : parseInt(v))}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments?.map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Doctor cards */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : !doctors?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <Stethoscope className="w-12 h-12 text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg">No doctors found</h3>
            <p className="text-muted-foreground text-sm mb-4">Add your first doctor to get started.</p>
            <Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Doctor</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {doctors.map((doc: any) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-lg shrink-0">
                    {doc.user?.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{doc.user?.name}</h3>
                      <Badge variant={doc.status === "active" ? "default" : "secondary"} className="text-xs shrink-0">
                        {doc.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-blue-600 font-medium">{doc.specialization}</p>
                    {doc.department && (
                      <p className="text-xs text-muted-foreground">{doc.department.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{doc.experience} yrs exp • ₹{doc.consultationFee}</p>
                    {doc.languages?.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">🗣 {doc.languages.join(", ")}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 mt-4 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => setEditDoc(doc)} className="h-7 text-xs">
                    <Pencil className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => toggleStatus.mutate({ id: doc.id, status: doc.status === "active" ? "inactive" : "active" })}
                    disabled={toggleStatus.isPending}
                    className={`h-7 text-xs ${doc.status === "active" ? "text-yellow-600 hover:bg-yellow-50" : "text-green-600 hover:bg-green-50"}`}
                  >
                    {doc.status === "active" ? <><UserX className="w-3 h-3 mr-1" />Deactivate</> : <><UserCheck className="w-3 h-3 mr-1" />Activate</>}
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => deleteDoc.mutate(doc.id)}
                    disabled={deleteDoc.isPending}
                    className="h-7 text-xs text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      {addOpen && (
        <DoctorFormDialog departments={departments} onClose={() => setAddOpen(false)} />
      )}
      {editDoc && (
        <DoctorFormDialog initial={editDoc} departments={departments} onClose={() => setEditDoc(null)} />
      )}
    </div>
  );
}
