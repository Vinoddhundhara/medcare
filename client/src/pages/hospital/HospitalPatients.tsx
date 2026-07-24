import { useState } from "react";
import { useHospitalPatients } from "@/hooks/use-hospital-data";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Search, LayoutGrid, List, Phone, User, Calendar } from "lucide-react";

export default function HospitalPatients() {
  const { data: patients, isLoading } = useHospitalPatients();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filtered = (patients || []).filter((p: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = p.user?.name?.toLowerCase() || "";
    const contact = p.contact?.toLowerCase() || "";
    return name.includes(q) || contact.includes(q);
  });

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Registered Patients</h1>
          <p className="text-muted-foreground text-sm">Total {filtered.length} patients registered</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or mobile..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Grid / List View Toggle */}
          <div className="flex items-center border rounded-lg p-1 bg-muted/20">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setViewMode("grid")}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setViewMode("list")}
              title="List View"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : !filtered.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <Users className="w-12 h-12 text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg">No registered patients found</h3>
            <p className="text-muted-foreground text-sm">When new patients register, they will appear here.</p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((patient: any) => (
            <Card key={patient.id} className="hover:shadow-md transition-shadow border-border/60">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-lg shrink-0">
                    {patient.user?.name?.[0]?.toUpperCase() || "P"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base truncate">{patient.user?.name || "Patient"}</h3>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>Age: <strong className="text-foreground font-semibold">{patient.age} yrs</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Mobile: <strong className="text-foreground font-semibold">{patient.contact || "N/A"}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <Card className="overflow-hidden border-border/60">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="py-3 px-4 font-semibold text-muted-foreground">#</th>
                    <th className="py-3 px-4 font-semibold text-muted-foreground">Patient Name</th>
                    <th className="py-3 px-4 font-semibold text-muted-foreground">Age</th>
                    <th className="py-3 px-4 font-semibold text-muted-foreground">Mobile No.</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((patient: any, index: number) => (
                    <tr key={patient.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground font-medium">{index + 1}</td>
                      <td className="py-3 px-4 font-bold text-foreground">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xs shrink-0">
                            {patient.user?.name?.[0]?.toUpperCase() || "P"}
                          </div>
                          <span>{patient.user?.name || "Patient"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium">{patient.age} yrs</td>
                      <td className="py-3 px-4 font-medium text-emerald-600 dark:text-emerald-400">
                        {patient.contact || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
