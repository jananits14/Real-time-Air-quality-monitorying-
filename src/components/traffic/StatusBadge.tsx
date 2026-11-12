import { cn } from "@/lib/utils";
import { LEVEL_LABEL, type CongestionLevel } from "@/lib/traffic";

export const LEVEL_BG: Record<CongestionLevel, string> = {
  flowing: "bg-flow",
  moderate: "bg-moderate",
  congested: "bg-congested",
};
export const LEVEL_TEXT: Record<CongestionLevel, string> = {
  flowing: "text-flow",
  moderate: "text-moderate",
  congested: "text-congested",
};

export function StatusBadge({ level, className }: { level: CongestionLevel; className?: string }) {
  return (
    <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold text-primary-foreground", LEVEL_BG[level], className)}>
      {LEVEL_LABEL[level]}
    </span>
  );
}
