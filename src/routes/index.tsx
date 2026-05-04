import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { ResultCards, type AnalysisResult } from "@/components/ResultCards";
import { FlagBadge } from "@/components/FlagBadge";

export const Route = createFileRoute("/")({
  component: Index,
});

type Mode = "situation" | "message";
type SavedItem = {
  id: string;
  summary: string;
  flag: string;
  flag_color: "green" | "yellow" | "red";
  result: AnalysisResult;
  createdAt: number;
};

const STORAGE_KEY = "reality-check-saved";

// Static UI strings stay in English (per spec — auto-detect handles dynamic labels).
const UI = {
  tagline: "A quiet space to reflect on what's happening — and what it might mean.",
  modeSituation: "Analyze a situation",
  modeMessage: "Analyze a message",
  placeholder:
    "Describe the situation or paste the conversation here... (any language)",
  analyze: "Analyze",
  analyzing: "Reflecting...",
  savedTitle: "Saved situations",
  noSaved: "Your saved reflections will appear here.",
  delete: "Remove",
  empty: "Please share a little more to reflect on.",
  error: "Something went off course. Please try again.",
  disclaimer: "This tool offers reflection, not absolute truth.",
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Index() {
  const [mode, setMode] = useState<Mode>("situation");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [saved, setSaved] = useState<SavedItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (next: SavedItem[]) => {
    setSaved(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const analyze = async () => {
    if (text.trim().length < 3) {
      toast.error(UI.empty);
      return;
    }
    setLoading(true);
    setResult(null);
    const submitted = text;
    try {
      const { data, error } = await supabase.functions.invoke("analyze", {
        body: { text: submitted, mode },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const res = data as AnalysisResult;
      setResult(res);
      setText(""); // clear input

      // Auto-save
      const item: SavedItem = {
        id: crypto.randomUUID(),
        summary: res.summary,
        flag: res.flag,
        flag_color: res.flag_color,
        result: res,
        createdAt: Date.now(),
      };
      persist([item, ...saved].slice(0, 50));
    } catch (e: any) {
      toast.error(e?.message || UI.error);
    } finally {
      setLoading(false);
    }
  };

  const remove = (id: string) => persist(saved.filter((s) => s.id !== id));

  return (
    <div className="min-h-screen px-4 py-10 sm:py-16">
      <Toaster position="top-center" />
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <header className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground backdrop-blur-sm">
            <Sparkles className="h-3 w-3 text-primary" />
            Reality Check
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-semibold text-foreground">
            A softer kind of clarity
          </h1>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto leading-relaxed">
            {UI.tagline}
          </p>
        </header>

        {/* Input */}
        <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-card/90 via-card/80 to-accent/20 p-5 sm:p-7 backdrop-blur-sm shadow-[0_10px_40px_-12px_rgba(180,140,150,0.25)]">
          <div className="mb-5 inline-flex rounded-full border border-border/60 bg-background/60 p-1 text-sm">
            {(["situation", "message"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-full px-4 py-1.5 font-medium transition-all ${
                  mode === m
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "situation" ? UI.modeSituation : UI.modeMessage}
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={UI.placeholder}
            rows={6}
            maxLength={4000}
            className="w-full resize-none rounded-2xl border border-border/60 bg-background/70 p-4 text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-ring/40 transition shadow-inner"
          />
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {text.length}/4000
            </span>
            <button
              onClick={analyze}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary/80 px-7 py-3 font-medium text-primary-foreground shadow-md transition hover:shadow-lg hover:brightness-105 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {loading ? UI.analyzing : UI.analyze}
            </button>
          </div>
        </section>

        {/* Result */}
        {result && (
          <section className="mt-8">
            <ResultCards result={result} />
          </section>
        )}

        {/* Saved */}
        <section className="mt-14">
          <h2 className="mb-4 text-lg font-display font-semibold text-foreground">
            {UI.savedTitle}
          </h2>
          {saved.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">{UI.noSaved}</p>
          ) : (
            <ul className="grid gap-3">
              {saved.map((s) => (
                <li
                  key={s.id}
                  className="rounded-2xl border border-border/60 bg-card/80 p-4 sm:p-5 backdrop-blur-sm shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <FlagBadge label={s.flag} kind={s.flag_color} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {formatTime(s.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/85 leading-relaxed line-clamp-3">
                        {s.summary}
                      </p>
                    </div>
                    <button
                      onClick={() => remove(s.id)}
                      aria-label={UI.delete}
                      className="rounded-full p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Disclaimer */}
        <footer className="mt-14 text-center text-xs text-muted-foreground italic">
          {UI.disclaimer}
        </footer>
      </div>
    </div>
  );
}
