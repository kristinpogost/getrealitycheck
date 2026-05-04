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
}: {
  label: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
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

export function ResultCards({ result }: { result: AnalysisResult }) {
  const l = result.ui_labels;
  return (
    <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Card label={l.summary_title} accent>
        <p className="leading-relaxed font-display text-[1.05rem]">{result.summary}</p>
      </Card>

      <Card label={l.flag}>
        <FlagBadge label={result.flag} kind={result.flag_color} size="lg" />
      </Card>

      <Card label={l.pattern}>
        <div className="text-lg font-display">{result.pattern}</div>
      </Card>

      <Card label={l.meaning}>
        <p className="leading-relaxed">{result.meaning}</p>
      </Card>

      <Card label={l.reality_check} accent>
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="leading-relaxed font-medium">{result.reality_check}</p>
        </div>
      </Card>

      <Card label={l.reflection}>
        <p className="leading-relaxed italic font-display text-[1.05rem]">
          “{result.reflection}”
        </p>
      </Card>

      <Card label={l.action}>
        <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          {result.action}
        </span>
      </Card>
    </div>
  );
}
