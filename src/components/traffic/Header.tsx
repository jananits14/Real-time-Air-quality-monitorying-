import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV = [
  { id: "home", label: "Home" },
  { id: "dashboard", label: "Dashboard" },
  { id: "map", label: "Map" },
  { id: "analytics", label: "Analytics" },
  { id: "incidents", label: "Incidents" },
] as const;

export function Header() {
  const [active, setActive] = useState<string>("home");

  useEffect(() => {
    const onScroll = () => {
      let current: string = NAV[0].id;
      for (const n of NAV) {
        const el = document.getElementById(n.id);
        if (el && el.getBoundingClientRect().top <= 140) current = n.id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = "incidents";
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-[1000] border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <a href="#home" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary">
            <Activity className="size-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">TrafficMonitor</span>
        </a>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                active === n.id && "bg-secondary text-secondary-foreground",
              )}
            >
              {n.label}
            </a>
          ))}
        </nav>
        <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          <span className="size-2 rounded-full bg-primary-foreground animate-pulse-dot" />
          System Online
        </span>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
        {NAV.map((n) => (
          <a
            key={n.id}
            href={`#${n.id}`}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1 text-sm font-medium text-muted-foreground",
              active === n.id && "bg-secondary text-secondary-foreground",
            )}
          >
            {n.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
