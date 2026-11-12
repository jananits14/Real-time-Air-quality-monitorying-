import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { congestionLevel, LEVEL_LABEL, type Incident, type TrafficLocation } from "@/lib/traffic";
import type { MapFocus, Place } from "./types";

export const MADURAI: [number, number] = [9.9252, 78.1198];

interface Props {
  locations: TrafficLocation[];
  incidents: Incident[];
  start: Place | null;
  end: Place | null;
  route: [number, number][] | null;
  pins: Place[];
  userPos: [number, number] | null;
  focus: MapFocus | null;
  dropMode: boolean;
  onMapClick: (lat: number, lng: number) => void;
}

export default function LeafletMap(props: Props) {
  const el = useRef<HTMLDivElement>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const groups = useRef<Partial<Record<"traffic" | "incidents" | "route" | "pins" | "user", Leaflet.LayerGroup>>>({});
  const clickRef = useRef(props.onMapClick);
  clickRef.current = props.onMapClick;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      if (cancelled || !el.current || map.current) return;
      const lib = (mod as unknown as { default?: typeof Leaflet }).default ?? (mod as unknown as typeof Leaflet);
      L.current = lib;
      const m = lib.map(el.current, { zoomControl: true, worldCopyJump: true }).setView(MADURAI, 14);
      lib
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors | TrafficMonitor",
        })
        .addTo(m);
      lib.control.scale().addTo(m);
      for (const k of ["traffic", "incidents", "route", "pins", "user"] as const) groups.current[k] = lib.layerGroup().addTo(m);
      m.on("click", (e: Leaflet.LeafletMouseEvent) => clickRef.current(e.latlng.lat, e.latlng.lng));
      map.current = m;
      setReady(true);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Traffic locations
  useEffect(() => {
    const lib = L.current;
    const g = groups.current.traffic;
    if (!ready || !lib || !g) return;
    g.clearLayers();
    for (const loc of props.locations) {
      const level = congestionLevel(loc.congestion);
      const icon = lib.divIcon({ className: "", html: `<div class="tm-marker tm-${level}" style="width:18px;height:18px"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] });
      lib
        .marker([loc.lat, loc.lng], { icon })
        .bindPopup(
          `<strong>${loc.name} - ${loc.area}</strong><br/>${LEVEL_LABEL[level]} · ${loc.congestion}% congestion<br/>${loc.speed} km/h · ${loc.vehicles} vehicles<br/>AQI ${loc.aqi} · ${loc.temperature}°C`,
        )
        .addTo(g);
    }
  }, [ready, props.locations]);

  // Incidents
  useEffect(() => {
    const lib = L.current;
    const g = groups.current.incidents;
    if (!ready || !lib || !g) return;
    g.clearLayers();
    for (const inc of props.incidents) {
      if (inc.status !== "active") continue;
      const loc = props.locations.find((l) => l.id === inc.locationId);
      if (!loc) continue;
      const icon = lib.divIcon({ className: "", html: `<div class="tm-incident">!</div>`, iconSize: [26, 26], iconAnchor: [13, 13] });
      lib
        .marker([loc.lat + 0.0012, loc.lng + 0.0012], { icon })
        .bindPopup(`<strong>${inc.type}</strong><br/>${inc.title}<br/>${inc.description}`)
        .addTo(g);
    }
  }, [ready, props.incidents, props.locations]);

  // Route + start/end
  useEffect(() => {
    const lib = L.current;
    const g = groups.current.route;
    if (!ready || !lib || !g) return;
    g.clearLayers();
    if (props.route && props.route.length > 1) {
      lib.polyline(props.route, { weight: 9, className: "tm-route-casing", opacity: 0.9 }).addTo(g);
      lib.polyline(props.route, { weight: 5, className: "tm-route" }).addTo(g);
    }
    const flag = (p: Place, cls: string, label: string) =>
      lib
        .marker([p.lat, p.lng], {
          icon: lib.divIcon({ className: "", html: `<div class="tm-flag ${cls}">${label}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] }),
        })
        .bindPopup(`<strong>${label === "A" ? "Start" : "End"}</strong><br/>${p.name}`)
        .addTo(g);
    if (props.start) flag(props.start, "tm-start", "A");
    if (props.end) flag(props.end, "tm-end", "B");
  }, [ready, props.route, props.start, props.end]);

  // Pins
  useEffect(() => {
    const lib = L.current;
    const g = groups.current.pins;
    if (!ready || !lib || !g) return;
    g.clearLayers();
    props.pins.forEach((p, i) => {
      lib
        .marker([p.lat, p.lng], {
          icon: lib.divIcon({ className: "", html: `<div class="tm-flag tm-pinbg">${i + 1}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] }),
        })
        .bindPopup(`<strong>Pin ${i + 1}</strong><br/>${p.name}`)
        .addTo(g);
    });
  }, [ready, props.pins]);

  // Live position
  useEffect(() => {
    const lib = L.current;
    const g = groups.current.user;
    if (!ready || !lib || !g) return;
    g.clearLayers();
    if (props.userPos) {
      lib
        .marker(props.userPos, {
          icon: lib.divIcon({ className: "", html: `<div class="tm-marker tm-user" style="width:20px;height:20px"></div>`, iconSize: [20, 20], iconAnchor: [10, 10] }),
        })
        .bindPopup("You are here")
        .addTo(g);
    }
  }, [ready, props.userPos]);

  // Camera
  useEffect(() => {
    const m = map.current;
    const f = props.focus;
    if (!ready || !m || !f) return;
    if (f.bounds && f.bounds.length > 1) m.fitBounds(f.bounds, { padding: [40, 40] });
    else if (f.lat !== undefined && f.lng !== undefined) m.flyTo([f.lat, f.lng], f.zoom ?? 13, { duration: 1.2 });
  }, [ready, props.focus]);

  useEffect(() => {
    if (el.current) el.current.style.cursor = props.dropMode ? "crosshair" : "";
  }, [props.dropMode]);

  return <div ref={el} className="h-[520px] w-full overflow-hidden rounded-2xl border border-border bg-muted" aria-label="Interactive traffic map" />;
}
