import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Bike, Bus, Car, Crosshair, Footprints, Globe, LocateFixed, MapPin, Navigation, Pin, Radio, RotateCcw,
  Route as RouteIcon, Search, Trash2, X, Clock, Ruler, TrafficCone, Loader2, Maximize2, Thermometer, Gauge, AlertTriangle, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  formatDuration, haversineKm, MODE_LABELS, MODE_SPEEDS, travelMinutes,
  type Incident, type TrafficLocation, type TravelMode,
} from "@/lib/traffic";
import type { MapFocus, Place } from "./types";

const LeafletMap = lazy(() => import("./LeafletMap"));
const MADURAI: [number, number] = [9.9252, 78.1198];

interface SearchResult {
  place_id: number;
  display_name: string;
  type: string;
  lat: string;
  lon: string;
}

interface RouteInfo {
  coords: [number, number][];
  distanceKm: number;
  durationMin: number;
  steps: { text: string; distanceKm: number }[];
}

const MODE_ICONS: Record<TravelMode, typeof Car> = { car: Car, bike: Bike, transit: Bus, walking: Footprints };

function stepText(step: { maneuver: { type: string; modifier?: string }; name?: string }): string {
  const { type, modifier } = step.maneuver;
  const road = step.name ? ` onto ${step.name}` : "";
  const dir = modifier ? ` ${modifier}` : "";
  switch (type) {
    case "depart": return `Head${dir}${step.name ? ` on ${step.name}` : ""}`;
    case "arrive": return "Arrive at your destination";
    case "turn": return `Turn${dir}${road}`;
    case "new name": return `Continue${road}`;
    case "merge": return `Merge${dir}${road}`;
    case "on ramp": return `Take the ramp${dir}${road}`;
    case "off ramp": return `Take the exit${dir}${road}`;
    case "fork": return `Keep${dir} at the fork${road}`;
    case "roundabout":
    case "rotary": return `Enter the roundabout and exit${road}`;
    case "end of road": return `At the end of the road turn${dir}${road}`;
    default: return `Continue${dir}${road}`;
  }
}

function placeFrom(r: SearchResult): Place {
  const parts = r.display_name.split(",");
  return { name: parts.slice(0, 2).join(",").trim(), detail: r.type, lat: Number(r.lat), lng: Number(r.lon) };
}

function MapFallback() {
  return (
    <div className="grid h-[520px] w-full place-items-center rounded-2xl border border-border bg-muted text-muted-foreground">
      <Loader2 className="size-6 animate-spin" />
    </div>
  );
}

export function MapSection({ locations, incidents }: { locations: TrafficLocation[]; incidents: Incident[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<Place | null>(null);
  const [end, setEnd] = useState<Place | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [routing, setRouting] = useState(false);
  const [mode, setMode] = useState<TravelMode>("car");
  const [pins, setPins] = useState<Place[]>([]);
  const [dropMode, setDropMode] = useState(false);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const focusKey = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const flyTo = useCallback((f: Omit<MapFocus, "key">) => {
    focusKey.current += 1;
    setFocus({ ...f, key: focusKey.current });
    document.getElementById("traffic-map")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // Debounced worldwide search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) { setResults([]); return; }
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=6&q=${encodeURIComponent(q)}`, { signal: ctrl.signal, headers: { Accept: "application/json" } });
        const data = (await res.json()) as SearchResult[];
        setResults(data);
        setOpen(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") toast.error("Location search is unavailable right now");
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => { ctrl.abort(); window.clearTimeout(t); };
  }, [query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); }, [watchId]);

  const pick = (r: SearchResult, action: "start" | "end" | "pin" | "go") => {
    const p = placeFrom(r);
    if (action === "start") { setStart(p); setRoute(null); toast.success("Start point set", { description: p.name }); }
    if (action === "end") { setEnd(p); setRoute(null); toast.success("End point set", { description: p.name }); }
    if (action === "pin") { setPins((ps) => [...ps, p]); toast.success("Pin added", { description: p.name }); }
    flyTo({ lat: p.lat, lng: p.lng, zoom: 13 });
    setOpen(false);
  };

  const calculateRoute = async () => {
    if (!start || !end) return;
    setRouting(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      const data = await res.json();
      const r = data.routes?.[0];
      if (!r) throw new Error("no route");
      const coords = (r.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng] as [number, number]);
      const steps = (r.legs?.[0]?.steps ?? []).map((s: { distance: number; maneuver: { type: string; modifier?: string }; name?: string }) => ({ text: stepText(s), distanceKm: s.distance / 1000 }));
      setRoute({ coords, distanceKm: r.distance / 1000, durationMin: r.duration / 60, steps });
      flyTo({ bounds: coords });
      toast.success("Route calculated", { description: `${(r.distance / 1000).toFixed(1)} km` });
    } catch {
      const d = haversineKm([start.lat, start.lng], [end.lat, end.lng]) * 1.25;
      const coords: [number, number][] = [[start.lat, start.lng], [end.lat, end.lng]];
      setRoute({ coords, distanceKm: d, durationMin: travelMinutes(d, "car"), steps: [{ text: "Head towards your destination", distanceKm: d }, { text: "Arrive at your destination", distanceKm: 0 }] });
      flyTo({ bounds: coords });
      toast.warning("Road routing unavailable — showing an estimated straight-line route");
    } finally {
      setRouting(false);
    }
  };

  const clearRoute = () => { setStart(null); setEnd(null); setRoute(null); };

  const toggleTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setUserPos(null);
      toast("Live tracking stopped");
      return;
    }
    if (!("geolocation" in navigator)) { toast.error("Your browser does not support location tracking"); return; }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPos((prev) => { if (!prev) flyTo({ lat: p[0], lng: p[1], zoom: 15 }); return p; });
      },
      () => { toast.error("Location permission denied"); navigator.geolocation.clearWatch(id); setWatchId(null); },
      { enableHighAccuracy: true },
    );
    setWatchId(id);
    toast.success("Live tracking started");
  };

  const setMyLocationAsStart = () => {
    if (!userPos) { toast("Start live tracking first to use your location"); return; }
    setStart({ name: "My location", lat: userPos[0], lng: userPos[1] });
    setRoute(null);
  };

  const onMapClick = useCallback((lat: number, lng: number) => {
    if (!dropMode) return;
    setPins((ps) => [...ps, { name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng }]);
    toast.success("Pin dropped");
  }, [dropMode]);

  const avgCongestion = locations.reduce((s, l) => s + l.congestion, 0) / locations.length;
  const trafficDelay = route ? Math.round((route.durationMin * avgCongestion) / 100 / 8) + 1 : 0;
  const activeIncidents = incidents.filter((i) => i.status === "active").length;
  const avgTemp = Math.round(locations.reduce((s, l) => s + l.temperature, 0) / locations.length);
  const avgSpeed = Math.round(locations.reduce((s, l) => s + l.speed, 0) / locations.length);
  const modeTime = useMemo(() => (route ? travelMinutes(route.distanceKm, mode) : 0), [route, mode]);

  return (
    <section id="map" className="scroll-mt-20 border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
              <Globe className="size-7 text-route" /> Global Interactive Traffic Map
            </h2>
            <p className="mt-1 text-route">Real-time worldwide traffic, routes, and incident monitoring with live data</p>
          </div>
          <div className="flex gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1 rounded-md bg-route-soft px-2 py-1 text-route"><Radio className="size-3" /> Live</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-flow-soft px-2 py-1 text-flow">✓ Global</span>
          </div>
        </div>

        {/* Search */}
        <div ref={boxRef} className="relative z-[1100] mt-6 rounded-2xl border border-border bg-card p-3 shadow-card">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (results[0]) pick(results[0], "go"); }}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-route" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => results.length && setOpen(true)} placeholder="Search any location worldwide..." className="h-11 border-2 border-primary/60 pl-9 focus-visible:ring-primary" />
              {searching && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
            </div>
            <Button type="submit" className="h-11 px-5">Go</Button>
          </form>
          {open && results.length > 0 && (
            <ul className="absolute inset-x-3 top-full mt-1 max-h-80 overflow-y-auto rounded-xl border border-border bg-popover p-2 shadow-lift">
              {results.map((r) => {
                const [title, ...rest] = r.display_name.split(",");
                return (
                  <li key={r.place_id} className="rounded-lg p-2 hover:bg-muted">
                    <p className="flex items-start gap-2 text-sm font-semibold"><MapPin className="mt-0.5 size-4 shrink-0 text-route" /> <span>{title}<span className="block text-xs font-normal text-muted-foreground">{rest.join(",").trim() || r.type}</span></span></p>
                    <div className="mt-2 grid grid-cols-4 gap-1.5 text-xs font-semibold">
                      <button type="button" onClick={() => pick(r, "start")} className="rounded-md bg-flow-soft py-1 text-flow hover:bg-flow hover:text-primary-foreground">▶ Start</button>
                      <button type="button" onClick={() => pick(r, "end")} className="rounded-md bg-congested-soft py-1 text-congested hover:bg-congested hover:text-primary-foreground">■ End</button>
                      <button type="button" onClick={() => pick(r, "pin")} className="rounded-md bg-route-soft py-1 text-route hover:bg-route hover:text-primary-foreground">📍 Pin</button>
                      <button type="button" onClick={() => pick(r, "go")} className="rounded-md bg-pin-soft py-1 text-pin hover:bg-pin hover:text-primary-foreground">➜ Go</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Route navigation */}
        <div className="mt-5 rounded-2xl border border-border bg-navi-soft p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold"><Navigation className="size-4 text-navi" /> Route Navigation</h3>
            {(start || end) && <Button variant="outline" size="sm" onClick={clearRoute}><X /> Clear Route</Button>}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[{ label: "Start Point", p: start, dot: "bg-flow", txt: "text-flow" }, { label: "End Point", p: end, dot: "bg-congested", txt: "text-congested" }].map(({ label, p, dot, txt }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-3">
                <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><span className={cn("size-2 rounded-full", dot)} /> {label}</p>
                {p ? (
                  <>
                    <p className={cn("mt-1 text-sm font-semibold", txt)}>{p.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{p.lat.toFixed(4)}, {p.lng.toFixed(4)}</p>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">Search a location above and click {label === "Start Point" ? "Start" : "End"}</p>
                )}
              </div>
            ))}
          </div>

          {route && (
            <>
              <div className="mt-3 grid grid-cols-3 rounded-xl border border-border bg-card p-3 text-center">
                <div><p className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Ruler className="size-3" /> Distance</p><p className="font-mono font-bold text-route">{route.distanceKm.toFixed(1)} km</p></div>
                <div><p className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" /> Time</p><p className="font-mono font-bold text-route">{formatDuration(modeTime)}</p></div>
                <div><p className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><TrafficCone className="size-3" /> Traffic</p><p className="font-mono font-bold text-congested">+{trafficDelay} min (traffic)</p></div>
              </div>
              <div className="mt-3 rounded-xl border border-route/30 bg-route-soft p-3">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-route"><Clock className="size-3.5" /> Estimated Arrival Times</p>
                <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                  {(Object.keys(MODE_SPEEDS) as TravelMode[]).map((m) => {
                    const Icon = MODE_ICONS[m];
                    const selected = m === mode;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => { setMode(m); toast.success(`${MODE_LABELS[m]} Mode Selected`, { description: `Route is optimized for ${MODE_LABELS[m].toLowerCase()} travel` }); }}
                        className={cn("rounded-lg border bg-card p-3 text-center transition-all hover:shadow-card", selected ? "border-route bg-route-soft ring-2 ring-route/40" : "border-border")}
                      >
                        <Icon className="mx-auto size-5 text-route" />
                        <p className="mt-1 text-xs font-medium">{MODE_LABELS[m]}</p>
                        <p className="font-mono text-sm font-bold text-route">{formatDuration(travelMinutes(route.distanceKm, m))}</p>
                        <p className="text-xs text-muted-foreground">{MODE_SPEEDS[m]} km/h</p>
                        {selected && <p className="mt-1 text-xs font-semibold text-route">✓ SELECTED</p>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div className="mt-4 grid gap-2">
            {start && end && (
              <Button variant="navi" className="h-11" onClick={calculateRoute} disabled={routing}>
                {routing ? <Loader2 className="animate-spin" /> : <RouteIcon />} {route ? "Recalculate Route" : "Calculate Route"}
              </Button>
            )}
            <Button variant={watchId !== null ? "route" : "default"} className={cn("h-11", watchId === null && "bg-foreground text-background hover:bg-foreground/90")} onClick={toggleTracking}>
              <span className={cn("size-2.5 rounded-full", watchId !== null ? "bg-congested animate-pulse-dot" : "bg-congested")} />
              {watchId !== null ? "Stop Live Tracking" : "Start Live Tracking"}
            </Button>
          </div>
        </div>

        {/* Pins toolbar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-pin-soft p-4">
          <h3 className="flex items-center gap-2 font-semibold"><Pin className="size-4 text-pin" /> Location Pins ({pins.length})</h3>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={dropMode ? "pin" : "outline"} onClick={() => { setDropMode((d) => !d); toast(dropMode ? "Pin drop off" : "Click anywhere on the map to drop a pin"); }}><Crosshair /> {dropMode ? "Dropping…" : "Drop Pin"}</Button>
            <Button size="sm" variant="outline" disabled={pins.length === 0} onClick={() => { const first = pins[0]; if (first) flyTo({ bounds: pins.map((p) => [p.lat, p.lng] as [number, number]), lat: first.lat, lng: first.lng, zoom: 13 }); }}><Maximize2 /> Pins View</Button>
            <Button size="sm" variant="outline" onClick={setMyLocationAsStart}><LocateFixed /> My Location</Button>
            <Button size="sm" variant="outline" disabled={pins.length === 0} onClick={() => setPins([])}><Trash2 /> Clear</Button>
          </div>
        </div>

        {/* Directions */}
        {route && route.steps.length > 0 && (
          <div className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="flex items-center gap-2 font-semibold"><Navigation className="size-4 text-flow" /> Turn-by-Turn Directions ({route.steps.length} steps)</h3>
            <ol className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-2">
              {route.steps.map((s, i) => (
                <li key={i} className="flex items-center gap-3 border-l-4 border-flow bg-muted/50 px-3 py-2 text-sm">
                  <span className="font-mono text-xs font-bold text-muted-foreground">{i + 1}</span>
                  <span className="flex-1">{s.text}</span>
                  {s.distanceKm > 0 && <span className="font-mono text-xs text-muted-foreground">{s.distanceKm < 1 ? `${Math.round(s.distanceKm * 1000)} m` : `${s.distanceKm.toFixed(1)} km`}</span>}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Legend + controls */}
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-2xl border border-border bg-surface p-4 text-sm">
            <span className="flex items-center gap-2"><span className="size-3 rounded-full bg-flow" /> Flowing</span>
            <span className="flex items-center gap-2"><span className="size-3 rounded-full bg-moderate" /> Moderate</span>
            <span className="flex items-center gap-2"><span className="size-3 rounded-full bg-congested" /> Congested</span>
            <span className="flex items-center gap-2"><AlertTriangle className="size-4 text-congested" /> Incident</span>
            {userPos && <span className="flex items-center gap-2"><span className="size-3 rounded-full bg-route" /> You</span>}
          </div>
          <div className="grid gap-2">
            <Button onClick={() => flyTo({ lat: 20, lng: 0, zoom: 2 })}><Globe /> World View</Button>
            <Button variant="outline" onClick={() => flyTo({ lat: MADURAI[0], lng: MADURAI[1], zoom: 14 })}><RotateCcw /> Reset to Madurai</Button>
            {route && <Button variant="route" onClick={() => flyTo({ bounds: route.coords })}><RouteIcon /> Fit Route</Button>}
          </div>
        </div>

        <div id="traffic-map" className="relative z-0 mt-4">
          <ClientOnly fallback={<MapFallback />}>
            <Suspense fallback={<MapFallback />}>
              <LeafletMap locations={locations} incidents={incidents} start={start} end={end} route={route?.coords ?? null} pins={pins} userPos={userPos} focus={focus} dropMode={dropMode} onMapClick={onMapClick} />
            </Suspense>
          </ClientOnly>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { icon: BarChart3, label: "Locations Tracked", value: locations.length, cls: "text-flow" },
            { icon: AlertTriangle, label: "Active Incidents", value: activeIncidents, cls: "text-moderate" },
            { icon: Thermometer, label: "Avg Temp", value: `${avgTemp}°C`, cls: "text-congested" },
            { icon: Gauge, label: "Avg Speed", value: `${avgSpeed} km/h`, cls: "text-route" },
          ].map(({ icon: Icon, label, value, cls }) => (
            <div key={label} className="rounded-xl border border-border bg-surface p-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className={cn("size-3.5", cls)} /> {label}</p>
              <p className="mt-1 font-mono text-lg font-bold">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
