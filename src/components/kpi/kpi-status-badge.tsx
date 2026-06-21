"use client";

import { cn } from "@/lib/utils";

export type KpiStatus = "green" | "yellow" | "red" | null | undefined;

interface KpiStatusBadgeProps {
  status: KpiStatus;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

const config: Record<NonNullable<KpiStatus>, { dot: string; bg: string; text: string; label: string }> = {
  green: {
    dot: "bg-green-500",
    bg: "bg-green-50 border-green-200 text-green-700",
    text: "text-green-700",
    label: "On Track",
  },
  yellow: {
    dot: "bg-yellow-400",
    bg: "bg-yellow-50 border-yellow-200 text-yellow-700",
    text: "text-yellow-700",
    label: "At Risk",
  },
  red: {
    dot: "bg-red-500",
    bg: "bg-red-50 border-red-200 text-red-700",
    text: "text-red-700",
    label: "Off Track",
  },
};

export function KpiStatusBadge({ status, size = "md", showLabel = true, className }: KpiStatusBadgeProps) {
  if (!status) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 text-gray-500 font-medium",
          size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
          className
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
        {showLabel && "No Data"}
      </span>
    );
  }

  const c = config[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        c.bg,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {showLabel && c.label}
    </span>
  );
}

/** Compact dot-only variant — useful inside dense table cells */
export function KpiStatusDot({ status, className }: { status: KpiStatus; className?: string }) {
  return <KpiStatusBadge status={status} showLabel={false} size="sm" className={className} />;
}
