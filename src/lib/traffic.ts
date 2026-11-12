export type CongestionLevel = "flowing" | "moderate" | "congested";

export interface TrafficLocation {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  congestion: number; // 0-100
  speed: number; // km/h
  vehicles: number;
  temperature: number; // °C
  humidity: number; // %
  aqi: number;
  updatedAt: number;
}

export interface Incident {
  id: string;
  title: string;
  locationId: string;
  severity: "low" | "medium" | "high";
  status: "active" | "resolved";
  type: string;
  description: string;
  minutesAgo: number;
}

export type TravelMode = "car" | "bike" | "transit" | "walking";

/** Average speed per travel mode, in km/h. */
export const MODE_SPEEDS: Record<TravelMode, number> = {
  car: 50,
  bike: 20,
  transit: 25,
  walking: 5,
};

export const MODE_LABELS: Record<TravelMode, string> = {
  car: "Car",
  bike: "Bike",
  transit: "Transit",
  walking: "Walking",
};

export function congestionLevel(value: number): CongestionLevel {
  if (value >= 70) return "congested";
  if (value >= 40) return "moderate";
  return "flowing";
}

export const LEVEL_LABEL: Record<CongestionLevel, string> = {
  flowing: "Flowing",
  moderate: "Moderate",
  congested: "Congested",
};

export function aqiLabel(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy (SG)";
  return "Unhealthy";
}

/** Travel time in minutes for a distance at the given mode's average speed. */
export function travelMinutes(distanceKm: number, mode: TravelMode): number {
  return Math.round((distanceKm / MODE_SPEEDS[mode]) * 60);
}

export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest} min`;
  return `${h}h ${rest}m`;
}

export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const SEED: Array<Omit<TrafficLocation, "updatedAt">> = [
  { id: "avani", name: "Avani Moola Street", area: "Central", lat: 9.9196, lng: 78.1194, congestion: 89, speed: 14, vehicles: 561, temperature: 35, humidity: 58, aqi: 168 },
  { id: "westmasi", name: "West Masi Street", area: "Market", lat: 9.9178, lng: 78.1138, congestion: 86, speed: 16, vehicles: 489, temperature: 35, humidity: 60, aqi: 92 },
  { id: "chithirai", name: "Chithirai Street", area: "Downtown", lat: 9.9203, lng: 78.1178, congestion: 60, speed: 28, vehicles: 372, temperature: 34, humidity: 61, aqi: 74 },
  { id: "townhall", name: "Town Hall Road", area: "Business", lat: 9.9168, lng: 78.1223, congestion: 59, speed: 30, vehicles: 342, temperature: 34, humidity: 63, aqi: 70 },
  { id: "netaji", name: "Netaji Road", area: "Central", lat: 9.9207, lng: 78.1247, congestion: 62, speed: 27, vehicles: 287, temperature: 34, humidity: 62, aqi: 96 },
  { id: "kknagar", name: "K.K. Nagar Main Road", area: "Retail", lat: 9.9331, lng: 78.1402, congestion: 58, speed: 31, vehicles: 318, temperature: 33, humidity: 64, aqi: 61 },
  { id: "simmakkal", name: "Simmakkal Street", area: "Residential", lat: 9.9264, lng: 78.1206, congestion: 32, speed: 46, vehicles: 174, temperature: 33, humidity: 66, aqi: 52 },
  { id: "southveli", name: "South Veli Street", area: "Industrial", lat: 9.9128, lng: 78.1183, congestion: 54, speed: 33, vehicles: 268, temperature: 35, humidity: 59, aqi: 88 },
  { id: "palace", name: "Thirumalai Nayak Palace Rd", area: "Heritage", lat: 9.9149, lng: 78.1238, congestion: 66, speed: 25, vehicles: 307, temperature: 34, humidity: 61, aqi: 58 },
  { id: "annanagar", name: "Anna Nagar Colony Road", area: "Suburban", lat: 9.9302, lng: 78.1455, congestion: 25, speed: 52, vehicles: 151, temperature: 32, humidity: 67, aqi: 45 },
  { id: "bypass", name: "Bypass Road", area: "Outer", lat: 9.9248, lng: 78.0952, congestion: 30, speed: 61, vehicles: 233, temperature: 33, humidity: 63, aqi: 49 },
  { id: "railway", name: "Railway Station Road", area: "Terminal", lat: 9.9196, lng: 78.1106, congestion: 63, speed: 26, vehicles: 338, temperature: 34, humidity: 62, aqi: 76 },
];

export function initialLocations(now = Date.now()): TrafficLocation[] {
  return SEED.map((l) => ({ ...l, updatedAt: now }));
}

/** Small random drift, keeping values in realistic bounds. */
export function driftLocation(l: TrafficLocation, rand = Math.random, now = Date.now()): TrafficLocation {
  const congestion = clamp(Math.round(l.congestion + (rand() - 0.5) * 12), 5, 98);
  const speed = clamp(Math.round(70 - congestion * 0.62 + (rand() - 0.5) * 6), 5, 80);
  return {
    ...l,
    congestion,
    speed,
    vehicles: clamp(Math.round(l.vehicles + (rand() - 0.5) * 40), 40, 800),
    temperature: clamp(Math.round((l.temperature + (rand() - 0.5)) * 10) / 10, 26, 40),
    humidity: clamp(Math.round(l.humidity + (rand() - 0.5) * 3), 35, 90),
    aqi: clamp(Math.round(l.aqi + (rand() - 0.5) * 8), 20, 220),
    updatedAt: now,
  };
}

export const INITIAL_INCIDENTS: Incident[] = [
  {
    id: "inc-1",
    title: "Town Hall Road - Business",
    locationId: "townhall",
    severity: "medium",
    status: "active",
    type: "Roadworks",
    description: "Heavy vehicle activity in effect. Expect lane closures near the junction.",
    minutesAgo: 34,
  },
  {
    id: "inc-2",
    title: "Avani Moola Street - Central",
    locationId: "avani",
    severity: "high",
    status: "active",
    type: "Accident",
    description: "Two-wheeler collision blocking the left lane. Traffic police on site.",
    minutesAgo: 12,
  },
  {
    id: "inc-3",
    title: "Bypass Road - Outer",
    locationId: "bypass",
    severity: "low",
    status: "resolved",
    type: "Breakdown",
    description: "Stalled lorry cleared from the shoulder. Traffic back to normal.",
    minutesAgo: 95,
  },
];

export interface HourPoint {
  hour: string;
  congestion: number;
  speed: number;
  vehicles: number;
  temperature: number;
  humidity: number;
}

/** Deterministic 24h profile with morning and evening peaks. */
export function dailyProfile(): HourPoint[] {
  return Array.from({ length: 24 }, (_, h) => {
    const morning = Math.exp(-((h - 8) ** 2) / 4);
    const evening = Math.exp(-((h - 18) ** 2) / 5);
    const base = 15 + 70 * Math.max(morning, evening * 0.92);
    const congestion = Math.round(base + ((h * 37) % 9) - 4);
    const temp = 27 + 8 * Math.sin(((h - 8) / 24) * Math.PI * 2 - Math.PI / 6 + Math.PI / 2) * 0.5 + 4;
    return {
      hour: `${String(h).padStart(2, "0")}:00`,
      congestion,
      speed: Math.round(72 - congestion * 0.6),
      vehicles: Math.round(300 + congestion * 18 + ((h * 53) % 120)),
      temperature: Math.round(temp * 10) / 10,
      humidity: Math.round(78 - (temp - 27) * 2.2),
    };
  });
}

export function peakHour(points: HourPoint[]): string {
  const top = points.reduce((a, b) => (b.congestion > a.congestion ? b : a));
  const h = Number(top.hour.slice(0, 2));
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:00 ${suffix}`;
}
