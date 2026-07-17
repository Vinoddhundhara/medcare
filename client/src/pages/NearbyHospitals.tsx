import { useState, useCallback, useMemo, useEffect } from "react";
import {
  MapPin, Phone, Globe, Navigation, RefreshCw,
  Hospital, AlertCircle, Loader2, Search, List, Map,
  Clock, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useNearbyHospitals, type NearbyHospital } from "@/hooks/use-nearby-hospitals";
import { useQueryClient } from "@tanstack/react-query";
import { HospitalMap } from "@/components/HospitalMap";
import { useLanguage } from "@/context/LanguageContext";

// ─── Geolocation hook ─────────────────────────────────────────────────────────

type LocState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; lat: number; lng: number }
  | { status: "error"; message: string };

function useGeolocation() {
  const [state, setState] = useState<LocState>({ status: "idle" });

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setState({ status: "error", message: "Your browser does not support geolocation." });
      return;
    }
    setState({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (p) => setState({ status: "success", lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => {
        const m: Record<number, string> = {
          1: "Location access was denied. Please allow location access in your browser settings and try again.",
          2: "Your location is currently unavailable. Please check your device's location settings.",
          3: "Location request timed out. Please try again.",
        };
        setState({ status: "error", message: m[e.code] ?? "Unable to retrieve your location." });
      },
      { timeout: 10_000, maximumAge: 60_000 }
    );
  }, []);

  return { state, request };
}

// ─── Filter / sort ────────────────────────────────────────────────────────────

type SortOption = "nearest" | "emergency" | "phone" | "website";

function applyFilter(hospitals: NearbyHospital[], sort: SortOption): NearbyHospital[] {
  let list = [...hospitals];
  if (sort === "emergency") list = list.filter((h) => h.emergency === true);
  else if (sort === "phone")   list = list.filter((h) => !!h.phone);
  else if (sort === "website") list = list.filter((h) => !!h.website);
  return list.sort((a, b) => a.distance - b.distance);
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function CardSkel() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex gap-3">
          <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-24 rounded-md" />
          <Skeleton className="h-7 w-24 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Hospital Card ────────────────────────────────────────────────────────────

function HospitalCard({
  hospital, isSelected, onSelect, onViewOnMap,
}: {
  hospital: NearbyHospital;
  isSelected: boolean;
  onSelect: () => void;
  onViewOnMap: () => void;
}) {
  const { t } = useLanguage();
  const nh = t.nearbyHospitals;
  const dirUrl = `https://www.openstreetmap.org/directions?to=${hospital.latitude},${hospital.longitude}`;

  return (
    <Card
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      onClick={onSelect}
      className={cn(
        "cursor-pointer transition-all duration-150 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isSelected ? "ring-2 ring-primary border-primary bg-primary/5 shadow-md" : "hover:border-primary/40"
      )}
    >
      <CardContent className="p-4">
        {/* ── Header ── */}
        <div className="flex items-start gap-3 mb-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
            isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
          )}>
            <Hospital className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-snug line-clamp-2" title={hospital.name}>
              {hospital.name}
            </h3>
            <div className="flex flex-wrap items-center gap-1 mt-1">
              <Badge variant="secondary" className="text-xs h-5 px-2 gap-1">
                <MapPin className="w-2.5 h-2.5" />
                {hospital.distance} km
              </Badge>
              {hospital.emergency === true && (
                <Badge className="text-xs h-5 px-2 bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
                  🚨 {nh.emergencyBadge}
                </Badge>
              )}
              {hospital.wheelchair === "yes" && (
                <Badge className="text-xs h-5 px-2 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
                  ♿ {nh.accessibleBadge}
                </Badge>
              )}
            </div>
          </div>

          {isSelected && (
            <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-1" />
          )}
        </div>

        {/* ── Info rows ── */}
        <div className="space-y-1.5 mb-3 text-xs text-muted-foreground">
          <div className="flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-60" />
            <span className="line-clamp-2">
              {hospital.address ?? nh.addressNotAvail}
            </span>
          </div>

          {hospital.openingHours && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0 opacity-60" />
              <span className="truncate">{hospital.openingHours}</span>
            </div>
          )}

          {hospital.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 shrink-0 opacity-60" />
              <span className="truncate">{hospital.phone}</span>
            </div>
          )}

          {hospital.website && (
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 shrink-0 opacity-60" />
              <span className="truncate text-primary/80">{hospital.website.replace(/^https?:\/\//, "")}</span>
            </div>
          )}
        </div>

        {/* ── Action buttons ── */}
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm" variant="outline"
            className="h-7 text-xs px-2.5 gap-1"
            onClick={(e) => { e.stopPropagation(); onViewOnMap(); }}
          >
            <Map className="w-3 h-3" />
            <span className="hidden sm:inline">{nh.listTab} on </span>{nh.mapTab}
          </Button>

          <Button
            size="sm" variant="outline"
            className="h-7 text-xs px-2.5 gap-1"
            onClick={(e) => { e.stopPropagation(); window.open(dirUrl, "_blank", "noopener,noreferrer"); }}
          >
            <Navigation className="w-3 h-3" />
            <span className="hidden sm:inline">Get </span>{nh.getDirections}
          </Button>

          {hospital.phone && (
            <Button
              size="sm" variant="outline"
              className="h-7 text-xs px-2.5 gap-1"
              onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${hospital.phone}`; }}
            >
              <Phone className="w-3 h-3" />
              {nh.call}
            </Button>
          )}

          {hospital.website && (
            <Button
              size="sm" variant="outline"
              className="h-7 text-xs px-2.5 gap-1"
              onClick={(e) => {
                e.stopPropagation();
                let url = hospital.website!;
                if (!url.startsWith("http")) url = "https://" + url;
                window.open(url, "_blank", "noopener,noreferrer");
              }}
            >
              <Globe className="w-3 h-3" />
              {nh.website}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NearbyHospitals() {
  const { state: loc, request: requestLocation } = useGeolocation();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const nh = t.nearbyHospitals;

  const [radius, setRadius]         = useState<number>(5);
  const [sort, setSort]             = useState<SortOption>("nearest");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Mobile: toggle between list and map views
  const [mobileTab, setMobileTab]   = useState<"list" | "map">("list");

  const lat = loc.status === "success" ? loc.lat : null;
  const lng = loc.status === "success" ? loc.lng : null;

  const { data, isLoading, isError, error, isFetching } = useNearbyHospitals({
    lat, lng, radius,
    enabled: loc.status === "success",
  });

  const displayed = useMemo(() => {
    if (!data) return [];
    return applyFilter(data, sort);
  }, [data, sort]);

  // Auto-select first hospital when results arrive
  useEffect(() => {
    if (displayed.length > 0 && !selectedId) {
      setSelectedId(displayed[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayed.length]);

  const handleRefresh = useCallback(() => {
    if (lat !== null && lng !== null) {
      queryClient.invalidateQueries({ queryKey: ["nearby-hospitals", lat, lng, radius] });
    }
  }, [lat, lng, radius, queryClient]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleViewOnMap = useCallback((id: string) => {
    setSelectedId(id);
    setMobileTab("map");
    // On desktop scroll to map
    document.getElementById("map-col")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  // ── Controls bar (shared) ────────────────────────────────────────────────────
  const controlsBar = loc.status === "success" && (
    <div className="flex flex-wrap items-center gap-2">
      {/* Location pill */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-full px-3 py-1.5 shrink-0">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
        <span className="truncate max-w-[160px]">{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</span>
      </div>

      {/* Radius */}
      <Select value={String(radius)} onValueChange={(v) => { setSelectedId(null); setRadius(Number(v)); }}>
        <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="2">{nh.withinKm.replace("{dist}", "2")}</SelectItem>
          <SelectItem value="5">{nh.withinKm.replace("{dist}", "5")}</SelectItem>
          <SelectItem value="10">{nh.withinKm.replace("{dist}", "10")}</SelectItem>
          <SelectItem value="20">{nh.withinKm.replace("{dist}", "20")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Sort/filter */}
      <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
        <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="nearest">{nh.nearestFirst}</SelectItem>
          <SelectItem value="emergency">{nh.emergencyOnly}</SelectItem>
          <SelectItem value="phone">{nh.hasPhone}</SelectItem>
          <SelectItem value="website">{nh.hasWebsite}</SelectItem>
        </SelectContent>
      </Select>

      {/* Refresh */}
      <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={handleRefresh} disabled={isFetching}>
        <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
      </Button>

      {/* Count */}
      {!isLoading && data && (
        <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
          {displayed.length} {displayed.length !== 1 ? nh.hospitalsCount : nh.hospitalCountSingle}
        </span>
      )}
    </div>
  );

  return (
    <div className="space-y-4 pt-2">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{nh.title}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {nh.subtitle}
          </p>
        </div>
        {loc.status !== "success" && (
          <Button
            onClick={requestLocation}
            disabled={loc.status === "loading"}
            className="shrink-0 self-start sm:self-auto"
            size="sm"
          >
            {loc.status === "loading"
              ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              : <MapPin className="w-4 h-4 mr-2" />}
            {nh.useMyLocation}
          </Button>
        )}
      </div>

      {/* ── Idle ── */}
      {loc.status === "idle" && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center gap-4 px-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base">{nh.enableLocation}</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                {nh.locationRequired}
              </p>
            </div>
            <Button onClick={requestLocation}>
              <MapPin className="w-4 h-4 mr-2" />{nh.useMyLocation}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Detecting ── */}
      {loc.status === "loading" && (
        <Card>
          <CardContent className="flex items-center justify-center py-10 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Detecting your location…</p>
          </CardContent>
        </Card>
      )}

      {/* ── Location error ── */}
      {loc.status === "error" && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center gap-3 px-6">
            <AlertCircle className="w-9 h-9 text-destructive" />
            <div>
              <h3 className="font-semibold text-sm">Location Error</h3>
              <p className="text-muted-foreground text-xs mt-1 max-w-xs">{loc.message}</p>
            </div>
            <Button variant="outline" size="sm" onClick={requestLocation}>Try Again</Button>
          </CardContent>
        </Card>
      )}

      {/* ── Main content (location granted) ── */}
      {loc.status === "success" && (
        <div className="space-y-3">
          {/* Controls */}
          {controlsBar}

          {/* Mobile view toggle */}
          <div className="flex lg:hidden border rounded-xl overflow-hidden w-full">
            <button
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
                mobileTab === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
              onClick={() => setMobileTab("list")}
            >
              <List className="w-4 h-4" />{nh.listTab}
            </button>
            <button
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
                mobileTab === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
              onClick={() => setMobileTab("map")}
            >
              <Map className="w-4 h-4" />{nh.mapTab}
            </button>
          </div>

          {/* Two-column layout desktop / stacked mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

            {/* ── LEFT: Hospital list ── */}
            <div className={cn(
              "space-y-3",
              mobileTab === "map" ? "hidden lg:block" : "block"
            )}>
              {/* Loading skeletons */}
              {isLoading && [1, 2, 3, 4].map((i) => <CardSkel key={i} />)}

              {/* Fetch error */}
              {isError && !isLoading && (
                <Card className="border-destructive/40 bg-destructive/5">
                  <CardContent className="flex flex-col items-center py-8 text-center gap-3 px-6">
                    <AlertCircle className="w-7 h-7 text-destructive" />
                    <div>
                      <h3 className="font-semibold text-sm">{nh.couldNotLoad}</h3>
                      <p className="text-muted-foreground text-xs mt-1 max-w-xs">
                        {(error as Error)?.message ?? nh.checkConnection}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRefresh}>{nh.tryAgain}</Button>
                  </CardContent>
                </Card>
              )}

              {/* Empty state */}
              {!isLoading && !isError && displayed.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center py-10 text-center gap-4 px-6">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Search className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">
                        {nh.noHospitals.replace("{dist}", String(radius))}
                        {sort !== "nearest" ? nh.noHospitalsMatching : ""}
                      </h3>
                      <p className="text-muted-foreground text-xs mt-1">
                        {sort !== "nearest" ? nh.tryDifferentFilter : nh.tryWider}
                      </p>
                    </div>
                    {sort !== "nearest" ? (
                      <Button variant="outline" size="sm" onClick={() => setSort("nearest")}>{nh.clearFilter}</Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => { setRadius(10); }}>
                        {nh.searchWithin10}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Hospital cards */}
              {!isLoading && displayed.map((h) => (
                <HospitalCard
                  key={h.id}
                  hospital={h}
                  isSelected={selectedId === h.id}
                  onSelect={() => handleSelect(h.id)}
                  onViewOnMap={() => handleViewOnMap(h.id)}
                />
              ))}
            </div>

            {/* ── RIGHT: Map ── */}
            <div
              id="map-col"
              className={cn(
                "lg:sticky lg:top-4",
                mobileTab === "list" ? "hidden lg:block" : "block"
              )}
              style={{ height: "clamp(320px, 55vw, 580px)" }}
            >
              {isLoading ? (
                <div className="w-full h-full rounded-xl bg-muted flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-7 h-7 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">{nh.findingHospitals}</p>
                </div>
              ) : loc.status === "success" ? (
                <HospitalMap
                  userLat={loc.lat}
                  userLng={loc.lng}
                  hospitals={displayed}
                  selectedId={selectedId}
                  onSelectHospital={(id) => {
                    handleSelect(id);
                    setMobileTab("list");
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
