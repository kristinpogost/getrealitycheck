import { FlagBadge, type FlagKind } from "./FlagBadge";
import { Sparkles, Tag } from "lucide-react";

export type UiLabels = {
  summary_title: string;
  pattern_tag: string;
  dynamic: string;
  hidden_signals: string;
  intentions: string;
  flag: string;
  meaning: string;
  reflection: string;
  reality_check: string;
  action: string;
  pattern_over_time?: string;
};

export type Trend = "improving" | "declining" | "inconsistent" | "stable" | "new";

export type AnalysisResult = {
  language: string;
  summary: string;
  pattern_tag: string;
  communication_dynamic: string;
  hidden_signals: string;
  intentions: string;
  flag: string;
  flag_color: FlagKind;
  meaning: string;
  reflection: string;
  reality_check: string;
  action: string;
  pattern_over_time?: string;
  trend?: Trend;
  ui_labels: UiLabels;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-[0.68rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
      {children}
    </div>
  );
}

function SoftCard({
  label,
  children,
  tint,
  bubble = false,
}: {
  label: string;
  children: React.ReactNode;
  tint?: "blush" | "sage" | "cream" | "none";
  bubble?: boolean;
}) {
  const tintClass =
    tint === "blush"
      ? "bg-gradient-to-br from-accent/45 via-card/85 to-card/70 border-accent/30"
      : tint === "sage"
        ? "bg-gradient-to-br from-flag-green-soft/40 via-card/85 to-card/70 border-flag-green/15"
        : tint === "cream"
          ? "bg-gradient-to-br from-secondary/55 via-card/85 to-card/75 border-border/40"
          : "bg-card/55 border-border/40";
  if (bubble) {
    return (
      <div className="flex flex-col gap-2">
        <SectionLabel>{label}</SectionLabel>
        <div className={`relative max-w-[94%] rounded-3xl rounded-tl-md border px-6 py-5 shadow-[0_6px_24px_-14px_rgba(180,140,150,0.3)] backdrop-blur-sm ${tintClass}`}>
          <div className="text-foreground">{children}</div>
        </div>
      </div>
    );
  }
  return (
    <div className={`rounded-3xl border p-6 sm:p-7 shadow-[0_6px_28px_-16px_rgba(180,140,150,0.25)] backdrop-blur-sm ${tintClass}`}>
      <SectionLabel>{label}</SectionLabel>
      <div className="text-foreground">{children}</div>
    </div>
  );
}

function MinimalSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-1 sm:px-2">
      <SectionLabel>{label}</SectionLabel>
      <div className="text-foreground">{children}</div>
    </div>
  );
}

export function ResultCards({
  result,
  variant = "situation",
}: {
  result: AnalysisResult;
  variant?: "situation" | "message";
}) {
  const l = result.ui_labels;
  const bubble = variant === "message";

  return (
    <div className="grid gap-7 sm:gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Pattern tag — small floating chip */}
      <div className="flex items-center justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1 text-[0.72rem] font-medium uppercase tracking-[0.15em] text-primary">
          <Tag className="h-3 w-3" />
          {result.pattern_tag}
        </span>
      </div>

      {/* Summary — soft blush card */}
      <SoftCard label={l.summary_title} tint="blush" bubble={bubble}>
        <p className="leading-relaxed font-display text-[1.1rem] text-foreground/90">
          {result.summary}
        </p>
      </SoftCard>

      {/* FLAG — focal point with glow */}
      <div className="relative flex flex-col items-center gap-3 py-4">
        <div className={`absolute inset-x-1/4 top-1/2 -z-10 h-32 -translate-y-1/2 rounded-full blur-3xl opacity-60 ${
          result.flag_color === "green" ? "bg-flag-green-soft" :
          result.flag_color === "red" ? "bg-flag-red-soft" : "bg-flag-yellow-soft"
        }`} />
        <SectionLabel>{l.flag}</SectionLabel>
        <FlagBadge label={result.flag} kind={result.flag_color} size="lg" />
      </div>

      {/* Communication dynamic — minimal */}
      <MinimalSection label={l.dynamic}>
        <p className="leading-relaxed text-[1.02rem] text-foreground/85 font-light">
          {result.communication_dynamic}
        </p>
      </MinimalSection>

      {/* Hidden signals — sage tinted */}
      <SoftCard label={l.hidden_signals} tint="sage" bubble={bubble}>
        <p className="leading-relaxed text-foreground/85">{result.hidden_signals}</p>
      </SoftCard>

      {/* Pattern over time — only when present */}
      {result.pattern_over_time && (
        <SoftCard label={l.pattern_over_time || "Pattern over time"} tint="cream" bubble={bubble}>
          <p className="leading-relaxed text-foreground/85">{result.pattern_over_time}</p>
        </SoftCard>
      )}

      {/* Intentions — minimal */}
      <MinimalSection label={l.intentions}>
        <p className="leading-relaxed text-foreground/85 font-light">{result.intentions}</p>
      </MinimalSection>

      {/* Meaning — cream tinted */}
      <SoftCard label={l.meaning} tint="cream" bubble={bubble}>
        <p className="leading-relaxed text-foreground/85">{result.meaning}</p>
      </SoftCard>

      {/* REALITY CHECK — visually distinct, key takeaway */}
      <div className="relative">
        <div className="absolute -inset-2 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/15 via-accent/20 to-flag-green-soft/20 blur-2xl opacity-70" />
        <div className="rounded-[1.75rem] border-2 border-primary/25 bg-gradient-to-br from-card via-card/95 to-accent/30 p-7 sm:p-8 shadow-[0_12px_40px_-16px_rgba(180,140,150,0.4)] backdrop-blur-sm">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-primary">
              {l.reality_check}
            </span>
          </div>
          <p className="font-display text-xl sm:text-2xl leading-snug text-foreground tracking-tight">
            {result.reality_check}
          </p>
        </div>
      </div>

      {/* Reflection — minimal italic */}
      <MinimalSection label={l.reflection}>
        <p className="leading-relaxed italic font-display text-[1.15rem] text-foreground/80">
          “{result.reflection}”
        </p>
      </MinimalSection>

      {/* Action — soft pill */}
      <div className="flex flex-col items-start gap-3 px-1 sm:px-2">
        <SectionLabel>{l.action}</SectionLabel>
        <span className="inline-block rounded-full bg-primary/10 px-5 py-2 text-sm font-medium text-primary border border-primary/20">
          {result.action}
        </span>
      </div>
    </div>
  );
}
