import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, MapPin } from "lucide-react";
import type { Incident } from "@/lib/traffic";
import { cn } from "@/lib/utils";

const SEV: Record<Incident["severity"], string> = {
  low: "bg-flow text-primary-foreground",
  medium: "bg-moderate text-primary-foreground",
  high: "bg-congested text-primary-foreground",
};

export function Incidents({ incidents }: { incidents: Incident[] }) {
  const [tab, setTab] = useState<"active" | "all">("active");
  const list = incidents.filter((i) => tab === "all" || i.status === "active");
  return (
    <section id="incidents" className="scroll-mt-20 border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Incident Reports</h2>
            <p className="mt-1 text-muted-foreground">Accidents, roadworks and breakdowns affecting traffic right now</p>
          </div>
          <div className="flex rounded-lg bg-muted p-1 text-sm font-medium">
            {(["active", "all"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={cn("rounded-md px-3 py-1 capitalize text-muted-foreground", tab === t && "bg-card text-foreground shadow-card")}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-4">
          {list.map((i) => (
            <article key={i.id} className="flex gap-4 rounded-2xl border border-border bg-background p-5">
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", i.status === "active" ? "bg-moderate-soft text-moderate" : "bg-flow-soft text-flow")}>
                {i.status === "active" ? <AlertTriangle className="size-5" /> : <CheckCircle2 className="size-5" />}
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className={cn("rounded px-2 py-0.5 uppercase", SEV[i.severity])}>{i.severity}</span>
                  <span className="text-muted-foreground">{i.type}</span>
                  <span className={i.status === "active" ? "text-congested" : "text-flow"}>● {i.status === "active" ? "Active" : "Resolved"}</span>
                </div>
                <h3 className="mt-1.5 flex items-center gap-1.5 font-semibold"><MapPin className="size-4 text-muted-foreground" /> {i.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{i.description}</p>
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" /> {i.minutesAgo} min ago</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
