import { ArrowRight, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/madurai-traffic-hero.jpg";
import type { TrafficLocation, Incident } from "@/lib/traffic";

export function Hero({ locations, incidents }: { locations: TrafficLocation[]; incidents: Incident[] }) {
  const avgSpeed = Math.round(locations.reduce((s, l) => s + l.speed, 0) / locations.length);
  const active = incidents.filter((i) => i.status === "active").length;
  return (
    <section id="home" className="relative isolate overflow-hidden">
      <img src={heroImg} alt="Madurai city traffic at dusk" width={1600} height={912} className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-hero-overlay" />
      <div className="mx-auto flex min-h-[560px] max-w-6xl flex-col justify-end px-4 pb-16 pt-32 text-hero-foreground">
        <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-hero-foreground/30 bg-hero-foreground/10 px-3 py-1 text-xs font-semibold backdrop-blur">
          <span className="size-2 rounded-full bg-primary animate-pulse-dot" /> Live across Madurai
        </span>
        <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          Smart traffic monitoring for every street in the city
        </h1>
        <p className="mt-4 max-w-xl text-base text-hero-foreground/80 md:text-lg">
          Live congestion, air quality and incident reports, plus worldwide route planning with turn-by-turn directions.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="hero" size="lg">
            <a href="#dashboard">
              View Live Dashboard <ArrowRight />
            </a>
          </Button>
          <Button asChild variant="heroGhost" size="lg">
            <a href="#map">
              <MapPinned /> Open Traffic Map
            </a>
          </Button>
        </div>
        <dl className="mt-12 grid max-w-xl grid-cols-3 gap-6 border-t border-hero-foreground/20 pt-6">
          <div>
            <dt className="text-xs text-hero-foreground/70">Locations</dt>
            <dd className="font-mono text-2xl font-bold">{locations.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-hero-foreground/70">Avg speed</dt>
            <dd className="font-mono text-2xl font-bold">{avgSpeed} km/h</dd>
          </div>
          <div>
            <dt className="text-xs text-hero-foreground/70">Active incidents</dt>
            <dd className="font-mono text-2xl font-bold">{active}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
