import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, MapPin, Phone, Clock, Ambulance, Car, Activity, Bed, Star } from "lucide-react";

function HospitalCard({ hospital }: { hospital: any }) {
  const isOpen = () => {
    if (!hospital.openingTime || !hospital.closingTime) return true;
    const now = new Date();
    const [oh, om] = hospital.openingTime.split(":").map(Number);
    const [ch, cm] = hospital.closingTime.split(":").map(Number);
    const nowMins  = now.getHours() * 60 + now.getMinutes();
    const openMins = oh * 60 + om;
    const closeMins= ch * 60 + cm;
    if (closeMins === 0) return true; // 24/7
    return nowMins >= openMins && nowMins <= closeMins;
  };

  const open = isOpen();

  return (
    <Card className="hover:shadow-lg transition-all duration-200 overflow-hidden group">
      {/* Image */}
      <div className="relative h-44 overflow-hidden">
        {hospital.hospitalImage || hospital.imageUrl ? (
          <img
            src={hospital.hospitalImage || hospital.imageUrl}
            alt={hospital.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-950 dark:to-blue-900 flex items-center justify-center">
            <Activity className="w-12 h-12 text-blue-400" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <Badge className={`${open ? "bg-green-500" : "bg-red-500"} text-white border-0 text-xs`}>
            {open ? "Open" : "Closed"}
          </Badge>
        </div>
        {hospital.emergencyNumber && (
          <div className="absolute bottom-3 left-3">
            <Badge className="bg-red-600 text-white border-0 text-xs">🚨 Emergency</Badge>
          </div>
        )}
      </div>

      <CardContent className="pt-4 pb-5">
        <h3 className="font-bold text-base truncate">{hospital.name}</h3>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{hospital.city}, {hospital.state}</span>
        </div>

        {/* Facilities */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {hospital.ambulanceAvailable && (
            <Badge variant="outline" className="text-xs gap-1"><Ambulance className="w-3 h-3" />Ambulance</Badge>
          )}
          {hospital.parkingAvailable && (
            <Badge variant="outline" className="text-xs gap-1"><Car className="w-3 h-3" />Parking</Badge>
          )}
          {hospital.icuAvailable && (
            <Badge variant="outline" className="text-xs gap-1 text-red-600 border-red-200">ICU</Badge>
          )}
          {hospital.bedCount > 0 && (
            <Badge variant="outline" className="text-xs gap-1">
              <Bed className="w-3 h-3" />{hospital.bedCount} Beds
            </Badge>
          )}
        </div>

        {/* Departments */}
        {hospital.specializations?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {hospital.specializations.slice(0, 3).map((s: string) => (
              <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
            ))}
            {hospital.specializations.length > 3 && (
              <Badge variant="secondary" className="text-xs">+{hospital.specializations.length - 3}</Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {hospital.openingTime} – {hospital.closingTime === "23:59" || hospital.closingTime === "00:00" ? "24/7" : hospital.closingTime}
          </div>
          <Link href={`/hospitals/${hospital.id}`}>
            <Button size="sm" className="h-8 text-xs">View Details</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FindHospitals() {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("all");

  const { data: hospitals, isLoading } = useQuery({
    queryKey: ["/api/hospitals", { search, city }],
    queryFn: async () => {
      const params = new URLSearchParams({ status: "active" });
      if (search) params.set("search", search);
      if (city && city !== "all") params.set("city", city);
      const res = await fetch(`/api/hospitals?${params}`, { credentials: "include" });
      return res.json();
    },
  });

  const cities = Array.from(new Set((hospitals || []).map((h: any) => h.city).filter(Boolean)));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Hospitals</h1>
        <p className="text-muted-foreground text-sm">Registered hospitals and medical centers</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search hospitals..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {cities.map((c: any) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      ) : !hospitals?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-3" />
          <p>No hospitals found</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {hospitals.map((h: any) => <HospitalCard key={h.id} hospital={h} />)}
        </div>
      )}
    </div>
  );
}
