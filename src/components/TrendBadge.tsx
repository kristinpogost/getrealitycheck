import { TrendingUp, TrendingDown, Activity, Minus, Sparkles } from "lucide-react";
import type { Trend } from "./ResultCards";
import { useUiLang } from "@/lib/ui-i18n";

const LABELS: Record<"en" | "et", Record<Trend, string>> = {
  en: {
    improving: "Improving",
    declining: "Declining",
    inconsistent: "Inconsistent",
    stable: "Stable",
    new: "New thread",
  },
  et: {
    improving: "Tõusev",
    declining: "Langev",
    inconsistent: "Ebaühtlane",
    stable: "Stabiilne",
    new: "Uus teema",
  },
};

const styles: Record<Trend, { cls: string; Icon: typeof TrendingUp }> = {
  improving: { cls: "bg-flag-green-soft text-flag-green border-flag-green/40", Icon: TrendingUp },
  declining: { cls: "bg-flag-red-soft text-flag-red border-flag-red/40", Icon: TrendingDown },
  inconsistent: { cls: "bg-flag-yellow-soft text-flag-yellow border-flag-yellow/40", Icon: Activity },
  stable: { cls: "bg-secondary/70 text-foreground/70 border-border", Icon: Minus },
  new: { cls: "bg-primary/10 text-primary border-primary/30", Icon: Sparkles },
};

export function TrendBadge({ trend, label }: { trend: Trend; label?: string }) {
  const lang = useUiLang();
  const c = styles[trend] ?? styles.stable;
  const I = c.Icon;
  const text = label || LABELS[lang][trend] || LABELS.en[trend];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-medium ${c.cls}`}>
      <I className="h-3.5 w-3.5" strokeWidth={2.5} />
      {text}
    </span>
  );
}
