import { useMemo, useState } from "react";
import { Car, Clock, Gauge, RefreshCw, Search, Filter, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { congestionLevel, type CongestionLevel, type TrafficLocation } from "@/lib/traffic";
import { cn } from "@/lib/utils";
import { LEVEL_BG, LEVEL_TEXT, StatusBadge } from "./StatusBadge";
import { REFRESH_SECONDS } from "./use-traffic";

function timeText(ts: number) {
  if (!ts) return "--:--";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function LocationCard({ loc }: { loc: TrafficLocation }) {
  const level = congestionLevel(loc.congestion);
  const Trend = level === "congested" ? TrendingDown : level === "flowing" ? TrendingUp : Minus;
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug">
          {loc.name} - {loc.area}
        </h3>
        <StatusBadge level={level} />
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>Congestion Level</span>
        <span className="font-mono font-semibold text-foreground">{loc.congestion}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all duration-700", LEVEL_BG[level])} style={{ width: `${loc.congestion}%` }} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Gauge className="size-4" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Speed</p>
            <p className="flex items-center gap-1 font-mono text-sm font-semibold">
              {loc.speed} km/h <Trend className={cn("size-3.5", LEVEL_TEXT[level])} />
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Car className="size-4" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Vehicles</p>
            <p className="font-mono text-sm font-semibold">{loc.vehicles}</p>
          </div>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" /> Updated {timeText(loc.updatedAt)}
        </span>
        <span className="size-2 rounded-full bg-primary animate-pulse-dot" />
      </div>
    </article>
  );
}

export function Dashboard({ locations }: { locations: TrafficLocation[] }) {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<"all" | CongestionLevel>("all");
  const filtered = useMemo(
    () =>
      locations.filter(
        (l) =>
          (level === "all" || congestionLevel(l.congestion) === level) &&
          `${l.name} ${l.area}`.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [locations, q, level],
  );

  return (
    <section id="dashboard" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Live Dashboard</h2>
          <p className="mt-1 text-muted-foreground">Real-time traffic data across monitored locations</p>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="size-4 animate-spin [animation-duration:3s]" /> Auto-refreshing every {REFRESH_SECONDS} seconds
        </p>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search locations or areas..." className="h-11 bg-card pl-9" />
        </div>
        <Select value={level} onValueChange={(v) => setLevel(v as typeof level)}>
          <SelectTrigger className="h-11 bg-card sm:w-48">
            <Filter className="size-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="flowing">Flowing</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="congested">Congested</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <span className="mt-4 inline-block rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
        {filtered.length} of {locations.length} locations
      </span>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((l) => (
          <LocationCard key={l.id} loc={l} />
        ))}
      </div>
      {filtered.length === 0 && <p className="mt-10 text-center text-muted-foreground">No locations match your search.</p>}
    </section>
  );
}
