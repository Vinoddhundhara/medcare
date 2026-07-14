import { useMemo, useState } from "react";
import { useHospitals } from "@/hooks/use-hospitals";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Building2, Phone, Stethoscope } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Hospitals() {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [specialization, setSpecialization] = useState<string>("all");

  const { data: hospitals, isLoading } = useHospitals();

  const specializationOptions = useMemo(() => {
    const set = new Set<string>();
    hospitals?.forEach((h) => h.specializations?.forEach((s) => s && set.add(s)));
    return Array.from(set).sort();
  }, [hospitals]);

  const filtered = useMemo(() => {
    if (!hospitals) return [];
    const nameQuery = search.trim().toLowerCase();
    const locationQuery = location.trim().toLowerCase();

    return hospitals.filter((h) => {
      const matchesName = !nameQuery || h.name.toLowerCase().includes(nameQuery);
      const matchesLocation = !locationQuery || h.location.toLowerCase().includes(locationQuery);
      const matchesSpecialization =
        specialization === "all" ||
        (h.specializations?.some((s) => s === specialization) ?? false);
      return matchesName && matchesLocation && matchesSpecialization;
    });
  }, [hospitals, search, location, specialization]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold tracking-tight">Hospitals</h2>
        <p className="text-muted-foreground mt-1">
          Browse hospitals and search by name, location, or specialization.
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
        <div className="flex-1 relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by location..."
            className="pl-9 bg-background"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div className="w-full md:w-[250px]">
          <Select value={specialization} onValueChange={setSpecialization}>
            <SelectTrigger>
              <SelectValue placeholder="Specialization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specializations</SelectItem>
              {specializationOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-[320px] rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p>No hospitals match your search.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((hospital) => (
            <Card
              key={hospital.id}
              className="overflow-hidden hover:shadow-xl transition-all duration-300 group border-border/60"
            >
              <div className="h-40 bg-muted overflow-hidden">
                {hospital.imageUrl ? (
                  <img
                    src={hospital.imageUrl}
                    alt={hospital.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary/10 to-blue-400/10">
                    <Building2 className="w-10 h-10 text-primary/40" />
                  </div>
                )}
              </div>
              <CardContent className="pt-5">
                <h3 className="text-xl font-bold mb-2">{hospital.name}</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {hospital.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {hospital.contact}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 p-4 flex flex-wrap gap-2">
                {hospital.specializations && hospital.specializations.length > 0 ? (
                  hospital.specializations.map((s) => (
                    <Badge key={s} variant="secondary" className="flex items-center gap-1">
                      <Stethoscope className="w-3 h-3" />
                      {s}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">
                    No specializations listed
                  </span>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
