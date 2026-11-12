import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/traffic/Header";
import { Hero } from "@/components/traffic/Hero";
import { Dashboard } from "@/components/traffic/Dashboard";
import { MapSection } from "@/components/traffic/MapSection";
import { RealTimeAnalytics, TrafficOverview } from "@/components/traffic/Analytics";
import { Incidents } from "@/components/traffic/Incidents";
import { Footer } from "@/components/traffic/Footer";
import { useTraffic } from "@/components/traffic/use-traffic";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TrafficMonitor — Live Madurai Traffic, Maps & Routes" },
      { name: "description", content: "Real-time traffic monitoring for Madurai: live congestion, worldwide route planning, air quality analytics and incident reports." },
      { property: "og:title", content: "TrafficMonitor — Live Madurai Traffic, Maps & Routes" },
      { property: "og:description", content: "Live congestion, smart routing, air quality analytics and incident reports for Madurai." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { locations, incidents } = useTraffic();
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero locations={locations} incidents={incidents} />
        <Dashboard locations={locations} />
        <MapSection locations={locations} incidents={incidents} />
        <RealTimeAnalytics locations={locations} incidents={incidents} />
        <TrafficOverview locations={locations} incidents={incidents} />
        <Incidents incidents={incidents} />
      </main>
      <Footer />
    </div>
  );
}
