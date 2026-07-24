import { useState } from "react";
import {
  useHospitalDepartments, useCreateDepartment,
  useUpdateDepartment, useDeleteDepartment,
} from "@/hooks/use-hospital-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Layers, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

function DeptDialog({
  open, onClose, initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: { id?: number; name: string; description?: string };
}) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const createMut = useCreateDepartment();
  const updateMut = useUpdateDepartment();

  const saving = createMut.isPending || updateMut.isPending;
  const isEdit = !!initial?.id;

  const handleSave = async () => {
    if (!name.trim()) return;
    if (isEdit) {
      await updateMut.mutateAsync({ id: initial!.id, name, description });
    } else {
      await createMut.mutateAsync({ name, description });
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Department" : "Add Department"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Department Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cardiology" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this department..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {isEdit ? "Save Changes" : "Create Department"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function HospitalDepartments() {
  const { data: departments, isLoading } = useHospitalDepartments();
  const deleteMut = useDeleteDepartment();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const openAdd  = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (d: any) => { setEditing(d); setDialogOpen(true); };
  const closeDialog = () => { setEditing(null); setDialogOpen(false); };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Departments</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage hospital departments</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" /> Add Department
        </Button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : !departments?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <Layers className="w-12 h-12 text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg">No departments yet</h3>
            <p className="text-muted-foreground text-sm mb-4">Create your first department to organize doctors.</p>
            <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Department</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept: any) => (
            <Card key={dept.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Layers className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{dept.name}</h3>
                      {dept.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{dept.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(dept)} className="h-8 w-8 p-0">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => deleteMut.mutate(dept.id)}
                      disabled={deleteMut.isPending}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DeptDialog open={dialogOpen} onClose={closeDialog} initial={editing} />
    </div>
  );
}
