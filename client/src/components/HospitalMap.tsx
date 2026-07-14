/**
 * HospitalMap — pure Leaflet JS (no react-leaflet).
 * Uses useEffect + useRef to manage the map imperatively.
 * 100% compatible with React 18, no Context issues.
 */
import { useEffect, useRef } from "react";
import L from "leaflet";
import type { NearbyHospital } from "@/lib/overpass";

// Fix broken default icon paths in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface HospitalMapProps {
  userLat: number;
  userLng: number;
  hospitals: NearbyHospital[];
  selectedId: string | null;
  onSelectHospital: (id: string) => void;
}

export function HospitalMap({
  userLat,
  userLng,
  hospitals,
  selectedId,
  onSelectHospital,
}: HospitalMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const markersRef   = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);

  // ── Initialize map once ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [userLat, userLng],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // User location marker
    const userIcon = L.divIcon({
      html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.3);"></div>`,
      className: "",
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon })
      .addTo(map)
      .bindPopup("<strong style='color:#3b82f6'>📍 Your Location</strong>");

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      userMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only once

  // ── Sync hospital markers when hospitals list changes ──────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    // Add new markers — skip any with invalid coordinates
    hospitals.forEach((h) => {
      // Guard against NaN/invalid coords that would crash Leaflet
      if (
        !isFinite(h.latitude) || !isFinite(h.longitude) ||
        isNaN(h.latitude) || isNaN(h.longitude)
      ) return;

      const isSelected = h.id === selectedId;
      const marker = L.marker([h.latitude, h.longitude], {
        icon: makeIcon(isSelected),
      }).addTo(map);

      marker.bindPopup(makePopupHtml(h));
      marker.on("click", () => onSelectHospital(h.id));

      markersRef.current.set(h.id, marker);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitals]);

  // ── Update selected marker icon + fly to it ────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker, id) => {
      marker.setIcon(makeIcon(id === selectedId));
    });

    if (selectedId) {
      const target = hospitals.find((h) => h.id === selectedId);
      if (target && isFinite(target.latitude) && isFinite(target.longitude)) {
        map.flyTo([target.latitude, target.longitude], 16, { animate: true, duration: 0.8 });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      style={{ height: "100%", width: "100%", minHeight: "400px", borderRadius: "0.75rem" }}
    />
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeIcon(selected: boolean): L.DivIcon {
  const bg   = selected ? "#ef4444" : "#0ea5e9";
  const size = selected ? 36 : 28;
  const half = size / 2;
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;background:${bg};border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:${selected ? 13 : 10}px;">🏥</span></div>`,
    className:   "",
    iconSize:    [size, size],
    iconAnchor:  [half, size],
    popupAnchor: [0, -(size + 2)],
  });
}

function makePopupHtml(h: NearbyHospital): string {
  const dir = `https://www.openstreetmap.org/directions?to=${h.latitude},${h.longitude}`;
  const emergency = h.emergency === true
    ? `<span style="display:inline-block;background:#fee2e2;color:#dc2626;font-size:11px;font-weight:600;padding:2px 8px;border-radius:9999px;margin-bottom:6px;">🚨 Emergency</span><br/>`
    : "";
  return `
    <div style="min-width:190px;font-family:sans-serif;">
      <p style="font-weight:700;font-size:13px;margin:0 0 4px">${h.name}</p>
      <p style="color:#6b7280;font-size:12px;margin:0 0 6px">📍 ${h.distance} km away</p>
      ${h.address ? `<p style="color:#374151;font-size:11px;margin:0 0 6px">${h.address}</p>` : ""}
      ${emergency}
      <a href="${dir}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;font-size:12px;">Get Directions →</a>
    </div>
  `;
}
