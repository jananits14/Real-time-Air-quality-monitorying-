import { describe, expect, it } from "vitest";
import { congestionLevel, formatDuration, travelMinutes } from "./traffic";

describe("traffic rules", () => {
  it("classifies congestion: <40 flowing, 40-69 moderate, 70+ congested", () => {
    expect(congestionLevel(39)).toBe("flowing");
    expect(congestionLevel(40)).toBe("moderate");
    expect(congestionLevel(69)).toBe("moderate");
    expect(congestionLevel(70)).toBe("congested");
  });

  it("estimates travel time per mode (car 50, bike 20, transit 25, walk 5 km/h)", () => {
    expect(travelMinutes(100, "car")).toBe(120);
    expect(travelMinutes(100, "bike")).toBe(300);
    expect(travelMinutes(100, "transit")).toBe(240);
    expect(travelMinutes(10, "walking")).toBe(120);
  });

  it("formats durations as hours and minutes", () => {
    expect(formatDuration(538)).toBe("8h 58m");
    expect(formatDuration(45)).toBe("45 min");
  });
});
