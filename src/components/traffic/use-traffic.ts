import { useEffect, useState } from "react";
import { INITIAL_INCIDENTS, driftLocation, initialLocations, type Incident, type TrafficLocation } from "@/lib/traffic";

export const REFRESH_SECONDS = 5;

export function useTraffic() {
  // updatedAt 0 on the server so SSR and first client render match.
  const [locations, setLocations] = useState<TrafficLocation[]>(() => initialLocations(0));
  const [incidents] = useState<Incident[]>(INITIAL_INCIDENTS);

  useEffect(() => {
    setLocations((prev) => prev.map((l) => ({ ...l, updatedAt: Date.now() })));
    const id = window.setInterval(() => {
      setLocations((prev) => prev.map((l) => driftLocation(l)));
    }, REFRESH_SECONDS * 1000);
    return () => window.clearInterval(id);
  }, []);

  return { locations, incidents };
}
