import { FlagBadge } from "./FlagBadge";
import { t, type Lang } from "@/lib/i18n";

export type AnalysisResult = {
  flag: string;
  pattern: string;
  meaning: string;
  reflection: string;
  action: string;
};

function Card({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-5 backdrop-blur-sm shadow-sm">
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-foreground">{children}</div>
    </div>
  );
}

export function ResultCards({ result, lang }: { result: AnalysisResult; lang: Lang }) {
  const tr = t[lang];
  return (
    <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Card label={tr.flag}>
        <FlagBadge label={result.flag} />
      </Card>
      <Card label={tr.pattern}>
        <div className="text-lg font-display">{result.pattern}</div>
      </Card>
      <Card label={tr.meaning}>
        <p className="leading-relaxed">{result.meaning}</p>
      </Card>
      <Card label={tr.reflection}>
        <p className="leading-relaxed italic font-display text-[1.05rem]">
          “{result.reflection}”
        </p>
      </Card>
      <Card label={tr.action}>
        <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          {result.action}
        </span>
      </Card>
    </div>
  );
}
