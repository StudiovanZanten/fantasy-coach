import type { LineupStatus } from "@/engine/types";
import { LINEUP_STATUS_LABEL, OFFICIAL_STATUSES } from "@/engine/types";
import type { RiskLevel } from "@/engine/recommend/topcoach";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<LineupStatus, string> = {
  BASIS: "bg-emerald-500 text-slate-950",
  BANK: "bg-orange-500 text-slate-950",
  AFWEZIG: "bg-red-600 text-white",
  VERWACHTE_BASIS: "border border-emerald-400 text-emerald-300",
  MOGELIJKE_BASIS: "border border-yellow-400 text-yellow-300",
  VERWACHTE_RESERVE: "border border-orange-400 text-orange-300",
  ONZEKER: "border border-slate-400 text-slate-300",
};

/** Grote statusbadge. Officiële statussen zijn gevuld, voorspellingen alleen omlijnd. */
export function StatusBadge({ status, size = "md" }: { status: LineupStatus; size?: "sm" | "md" }) {
  const official = OFFICIAL_STATUSES.includes(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md font-bold uppercase tracking-wide whitespace-nowrap",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
        STATUS_STYLE[status],
      )}
      title={official ? "Officieel bevestigd" : "Voorspelling – nog niet officieel"}
    >
      {LINEUP_STATUS_LABEL[status]}
      {!official && <span className="sr-only">(voorspelling)</span>}
    </span>
  );
}

const RISK_STYLE: Record<RiskLevel, string> = {
  green: "bg-[var(--color-ok)]",
  yellow: "bg-[var(--color-warn)]",
  orange: "bg-[var(--color-risk)]",
  red: "bg-[var(--color-bad)]",
  grey: "bg-[var(--color-unknown)]",
};
const RISK_LABEL: Record<RiskLevel, string> = {
  green: "Gunstig",
  yellow: "Beperkte onzekerheid",
  orange: "Aanzienlijk risico",
  red: "Afwezig of sterk negatief",
  grey: "Onvoldoende informatie",
};

export function RiskDot({ level, className }: { level: RiskLevel; className?: string }) {
  return <span className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", RISK_STYLE[level], className)} role="img" aria-label={RISK_LABEL[level]} title={RISK_LABEL[level]} />;
}

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-xs text-[var(--color-muted)]", className)}>{children}</span>;
}

export function MockBadge({ label = "Demodata" }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-fuchsia-400/60 bg-fuchsia-500/10 px-2 py-0.5 text-[11px] font-semibold text-fuchsia-300" title="Gegenereerde voorbeelddata, niet live">
      {label}
    </span>
  );
}
