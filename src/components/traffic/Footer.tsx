import { useEffect, useState } from "react";
import { Activity, Clock, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NAV } from "./Header";

export function Footer() {
  const [email, setEmail] = useState("");
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.4fr_1fr_1.2fr]">
        <div>
          <p className="flex items-center gap-2.5 text-lg font-bold">
            <span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary"><Activity className="size-5" /></span>
            TrafficMonitor
          </p>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            Real-time traffic monitoring for Madurai — live congestion, air quality, smart routing and incident reports across the city.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-flow"><span className="size-2 rounded-full bg-flow animate-pulse-dot" /> System Online</span>
            <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="size-3" /> Last sync: {time || "--"}</span>
          </div>
        </div>
        <div>
          <p className="font-semibold">Quick Links</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {NAV.map((n) => (
              <li key={n.id}><a href={`#${n.id}`} className="hover:text-foreground">{n.label}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold">Traffic Alerts</p>
          <p className="mt-3 text-sm text-muted-foreground">Get notified about heavy congestion and incidents on your daily routes.</p>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!/^\S+@\S+\.\S+$/.test(email)) { toast.error("Please enter a valid email"); return; }
              toast.success("Subscribed to traffic alerts", { description: email });
              setEmail("");
            }}
          >
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="bg-card pl-9" />
            </div>
            <Button type="submit" size="icon" aria-label="Subscribe"><Send /></Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">We only send important traffic alerts.</p>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground">
          <span>© 2026 TrafficMonitor. All rights reserved.</span>
          <span className="flex gap-4"><span>Privacy Policy</span><span>Terms of Service</span><span>Contact</span></span>
        </div>
      </div>
    </footer>
  );
}
