import { FlagBadge, type FlagKind } from "./FlagBadge";
import { Sparkles } from "lucide-react";

export type UiLabels = {
  summary_title: string;
  flag: string;
  pattern: string;
  meaning: string;
  reflection: string;
  reality_check: string;
  action: string;
};

export type AnalysisResult = {
  language: string;
  summary: string;
  flag: string;
  flag_color: FlagKind;
  pattern: string;
  meaning: string;
  reflection: string;
  reality_check: string;
  action: string;
  ui_labels: UiLabels;
};

function Card({
  label,
  children,
  accent = false,
  bubble = false,
}: {
  label: string;
  children: React.ReactNode;
  accent?: boolean;
  bubble?: boolean;
}) {
  if (bubble) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="px-2 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
        <div
          className={`relative max-w-[92%] rounded-3xl rounded-tl-md border border-border/60 px-5 py-4 shadow-[0_4px_18px_-10px_rgba(180,140,150,0.25)] backdrop-blur-sm ${
            accent
              ? "bg-gradient-to-br from-accent/50 via-card/95 to-card/85"
              : "bg-card/90"
          }`}
        >
          <div className="text-foreground">{children}</div>
        </div>
      </div>
    );
  }
  return (
    <div
      className={`rounded-3xl border border-border/70 p-5 sm:p-6 shadow-[0_4px_20px_-8px_rgba(180,140,150,0.15)] backdrop-blur-sm ${
        accent
          ? "bg-gradient-to-br from-accent/40 via-card/90 to-card/80"
          : "bg-card/85"
      }`}
    >
      <div className="mb-2.5 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
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
    <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Card label={l.summary_title} accent bubble={bubble}>
        <p className="leading-relaxed font-display text-[1.05rem]">{result.summary}</p>
      </Card>

      <Card label={l.flag} bubble={bubble}>
        <FlagBadge label={result.flag} kind={result.flag_color} size="lg" />
      </Card>

      <Card label={l.pattern} bubble={bubble}>
        <div className="text-lg font-display">{result.pattern}</div>
      </Card>

      <Card label={l.meaning} bubble={bubble}>
        <p className="leading-relaxed">{result.meaning}</p>
      </Card>

      <Card label={l.reality_check} accent bubble={bubble}>
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="leading-relaxed font-medium">{result.reality_check}</p>
        </div>
      </Card>

      <Card label={l.reflection} bubble={bubble}>
        <p className="leading-relaxed italic font-display text-[1.05rem]">
          “{result.reflection}”
        </p>
      </Card>

      <Card label={l.action} bubble={bubble}>
        <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          {result.action}
        </span>
      </Card>
    </div>
  );
}
