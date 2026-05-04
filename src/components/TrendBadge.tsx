import { TrendingUp, TrendingDown, Activity, Minus, Sparkles } from "lucide-react";
import type { Trend } from "./ResultCards";

const config: Record<Trend, { label: string; cls: string; Icon: typeof TrendingUp }> = {
  improving: { label: "Improving", cls: "bg-flag-green-soft text-flag-green border-flag-green/40", Icon: TrendingUp },
  declining: { label: "Declining", cls: "bg-flag-red-soft text-flag-red border-flag-red/40", Icon: TrendingDown },
  inconsistent: { label: "Inconsistent", cls: "bg-flag-yellow-soft text-flag-yellow border-flag-yellow/40", Icon: Activity },
  stable: { label: "Stable", cls: "bg-secondary/70 text-foreground/70 border-border", Icon: Minus },
  new: { label: "New thread", cls: "bg-primary/10 text-primary border-primary/30", Icon: Sparkles },
};

export function TrendBadge({ trend, label }: { trend: Trend; label?: string }) {
  const c = config[trend] ?? config.stable;
  const I = c.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-medium ${c.cls}`}>
      <I className="h-3.5 w-3.5" strokeWidth={2.5} />
      {label || c.label}
    </span>
  );
}
