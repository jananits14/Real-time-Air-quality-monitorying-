import { useMemo } from "react";
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Activity, AlertTriangle, Car, Clock, Droplets, Gauge, MapPin, Thermometer, TrendingUp, Wind } from "lucide-react";
import { aqiLabel, congestionLevel, dailyProfile, peakHour, type Incident, type TrafficLocation } from "@/lib/traffic";
import { cn } from "@/lib/utils";

const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 };
const axis = { stroke: "var(--muted-foreground)", fontSize: 11 };

function ChartCard({ title, icon: Icon, iconCls, children, className }: { title: string; icon: typeof Activity; iconCls: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5 shadow-card", className)}>
      <h3 className="flex items-center gap-2 text-sm font-semibold"><Icon className={cn("size-4", iconCls)} /> {title}</h3>
      <div className="mt-4 h-64">{children}</div>
    </div>
  );
}

const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length));

export function RealTimeAnalytics({ locations, incidents }: { locations: TrafficLocation[]; incidents: Incident[] }) {
  const profile = useMemo(() => dailyProfile(), []);
  const avgSpeed = avg(locations.map((l) => l.speed));
  const avgTemp = avg(locations.map((l) => l.temperature));
  const avgAqi = avg(locations.map((l) => l.aqi));
  const avgHum = avg(locations.map((l) => l.humidity));
  const high = locations.filter((l) => l.congestion >= 85).length;
  const poorAir = locations.filter((l) => l.aqi > 100).length;
  const active = incidents.filter((i) => i.status === "active").length;

  const dist = [
    { name: "Flowing", value: locations.filter((l) => congestionLevel(l.congestion) === "flowing").length, color: "var(--flow)" },
    { name: "Moderate", value: locations.filter((l) => congestionLevel(l.congestion) === "moderate").length, color: "var(--moderate)" },
    { name: "Congested", value: locations.filter((l) => congestionLevel(l.congestion) === "congested").length, color: "var(--congested)" },
  ].filter((d) => d.value > 0);

  const pollution = ["Good", "Moderate", "Unhealthy (SG)", "Unhealthy"].map((name, i) => ({
    name,
    value: locations.filter((l) => aqiLabel(l.aqi) === name).length,
    color: ["var(--flow)", "var(--moderate)", "var(--chart-4)", "var(--congested)"][i],
  }));

  const stats = [
    { label: "Avg Speed", value: avgSpeed, unit: "km/h", icon: Gauge, border: "border-l-route", cls: "text-route" },
    { label: "Avg Temp", value: avgTemp, unit: "°C", icon: Thermometer, border: "border-l-chart-4", cls: "text-chart-4" },
    { label: "Avg AQI", value: avgAqi, unit: aqiLabel(avgAqi), icon: Wind, border: "border-l-congested", cls: "text-congested" },
    { label: "Humidity", value: avgHum, unit: "%", icon: Droplets, border: "border-l-pin", cls: "text-pin" },
  ];

  return (
    <section className="border-t border-border bg-analytics">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="flex items-center gap-2 text-3xl font-bold tracking-tight"><Activity className="size-7 text-primary" /> Real-Time Traffic Analytics</h2>
        <p className="mt-1 text-muted-foreground">Comprehensive traffic, environment, and incident analysis for Madurai</p>

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map(({ label, value, unit, icon: Icon, border, cls }) => (
            <div key={label} className={cn("rounded-xl border border-border border-l-4 bg-card p-4 shadow-card", border)}>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className={cn("size-3.5", cls)} /> {label}</p>
              <p className="mt-1 font-mono text-3xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{unit}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            { label: "High Congestion", value: high, bg: "bg-congested-soft", cls: "text-congested", icon: TrendingUp },
            { label: "Poor Air Quality", value: poorAir, bg: "bg-congested-soft", cls: "text-chart-4", icon: AlertTriangle },
            { label: "Active Incidents", value: active, bg: "bg-moderate-soft", cls: "text-moderate", icon: AlertTriangle },
          ].map(({ label, value, bg, cls, icon: Icon }) => (
            <div key={label} className={cn("flex items-center justify-between rounded-xl border border-border p-4", bg)}>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={cn("font-mono text-2xl font-bold", cls)}>{value}</p>
              </div>
              <Icon className={cn("size-6 opacity-60", cls)} />
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <ChartCard title="Speed & Congestion Trend (24h)" icon={TrendingUp} iconCls="text-route">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={profile}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="hour" {...axis} interval={3} />
                <YAxis {...axis} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="speed" name="Avg Speed (km/h)" stroke="var(--route)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="congestion" name="Congestion (%)" stroke="var(--congested)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Congestion Distribution" icon={Car} iconCls="text-congested">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3} label={({ name, value }) => `${name} (${value})`}>
                  {dist.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Air Quality (AQI) by Location" icon={Wind} iconCls="text-chart-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locations.map((l) => ({ name: l.name.split(" ")[0], aqi: l.aqi }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" {...axis} angle={-35} textAnchor="end" height={55} interval={0} />
                <YAxis {...axis} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="aqi" name="AQI" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Temperature & Humidity" icon={Thermometer} iconCls="text-congested">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={profile}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="hour" {...axis} interval={3} />
                <YAxis yAxisId="t" {...axis} />
                <YAxis yAxisId="h" orientation="right" {...axis} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="t" type="monotone" dataKey="temperature" name="Temp (°C)" stroke="var(--chart-4)" strokeWidth={2} dot={false} />
                <Line yAxisId="h" type="monotone" dataKey="humidity" name="Humidity (%)" stroke="var(--pin)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Pollution Level Distribution" icon={Wind} iconCls="text-pin" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pollution} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" allowDecimals={false} {...axis} />
                <YAxis type="category" dataKey="name" {...axis} width={110} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Locations" radius={[0, 6, 6, 0]}>
                  {pollution.map((p) => <Cell key={p.name} fill={p.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </section>
  );
}

export function TrafficOverview({ locations, incidents }: { locations: TrafficLocation[]; incidents: Incident[] }) {
  const profile = useMemo(() => dailyProfile(), []);
  const stats = [
    { icon: MapPin, value: locations.length, label: "Monitored locations", cls: "bg-flow-soft text-flow" },
    { icon: TrendingUp, value: `${avg(locations.map((l) => l.speed))} km/h`, label: "Average speed", cls: "bg-flow-soft text-flow" },
    { icon: AlertTriangle, value: incidents.filter((i) => i.status === "active").length, label: "Active incidents", cls: "bg-congested-soft text-congested" },
    { icon: Clock, value: peakHour(profile), label: "Peak congestion", cls: "bg-moderate-soft text-moderate" },
  ];
  return (
    <section id="analytics" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
      <h2 className="text-3xl font-bold tracking-tight">Traffic Analytics</h2>
      <p className="mt-1 text-muted-foreground">Congestion trends, peak hours, and average speeds across the city</p>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ icon: Icon, value, label, cls }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <span className={cn("grid size-9 place-items-center rounded-lg", cls)}><Icon className="size-4" /></span>
            <p className="mt-4 font-mono text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <ChartCard title="Congestion Trend (24h)" icon={Activity} iconCls="text-congested">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={profile}>
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--congested)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--congested)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="hour" {...axis} interval={3} />
              <YAxis {...axis} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="congestion" name="Congestion %" stroke="var(--congested)" fill="url(#cg)" strokeWidth={2} />
              <Line type="monotone" dataKey="speed" name="Avg Speed (km/h)" stroke="var(--flow)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Vehicle Count by Hour" icon={Car} iconCls="text-flow">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={profile}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="hour" {...axis} interval={3} />
              <YAxis {...axis} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="vehicles" name="Vehicle Count" fill="var(--flow)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </section>
  );
}
