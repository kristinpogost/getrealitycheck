import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Loader2, Sparkles, Bookmark, Trash2 } from "lucide-react";
import { ResultCards, type AnalysisResult } from "@/components/ResultCards";
import { FlagBadge, flagKind } from "@/components/FlagBadge";
import { t, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: Index,
});

type Mode = "situation" | "message";
type SavedItem = {
  id: string;
  text: string;
  mode: Mode;
  lang: Lang;
  result: AnalysisResult;
  createdAt: number;
};

const STORAGE_KEY = "reality-check-saved";
const LANG_KEY = "reality-check-lang";

function Index() {
  const [lang, setLang] = useState<Lang>("en");
  const [mode, setMode] = useState<Mode>("situation");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [justSaved, setJustSaved] = useState(false);

  const tr = t[lang];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSaved(JSON.parse(raw));
      const l = localStorage.getItem(LANG_KEY);
      if (l === "en" || l === "et") setLang(l);
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(LANG_KEY, lang); } catch {}
  }, [lang]);

  const persist = (next: SavedItem[]) => {
    setSaved(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const analyze = async () => {
    if (text.trim().length < 3) {
      toast.error(tr.empty);
      return;
    }
    setLoading(true);
    setResult(null);
    setJustSaved(false);
    try {
      const { data, error } = await supabase.functions.invoke("analyze", {
        body: { text, mode, language: lang },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as AnalysisResult);
    } catch (e: any) {
      toast.error(e?.message || tr.error);
    } finally {
      setLoading(false);
    }
  };

  const saveCurrent = () => {
    if (!result) return;
    const item: SavedItem = {
      id: crypto.randomUUID(),
      text,
      mode,
      lang,
      result,
      createdAt: Date.now(),
    };
    persist([item, ...saved]);
    setJustSaved(true);
    toast.success(tr.saved);
  };

  const remove = (id: string) => persist(saved.filter((s) => s.id !== id));

  return (
    <div className="min-h-screen px-4 py-10 sm:py-16">
      <Toaster position="top-center" />
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <header className="mb-10 text-center">
          <div className="mb-4 flex justify-center">
            <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card/60 p-1 text-xs backdrop-blur-sm">
              {(["en", "et"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`rounded-full px-3 py-1 font-medium transition-colors ${
                    lang === l
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label={`${tr.langLabel}: ${l.toUpperCase()}`}
                >
                  {l === "en" ? "EN" : "ET"}
                </button>
              ))}
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-semibold text-foreground">
            {tr.title}
          </h1>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto">
            {tr.tagline}
          </p>
        </header>

        {/* Input */}
        <section className="rounded-3xl border border-border bg-card/70 p-5 sm:p-6 backdrop-blur-sm shadow-sm">
          <div className="mb-4 inline-flex rounded-full border border-border bg-background/50 p-1 text-sm">
            {(["situation", "message"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
                  mode === m
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "situation" ? tr.modeSituation : tr.modeMessage}
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={tr.placeholder}
            rows={6}
            maxLength={4000}
            className="w-full resize-none rounded-2xl border border-border bg-background/60 p-4 text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-ring/40 transition"
          />
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {text.length}/4000
            </span>
            <button
              onClick={analyze}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {loading ? tr.analyzing : tr.analyze}
            </button>
          </div>
        </section>

        {/* Result */}
        {result && (
          <section className="mt-8">
            <ResultCards result={result} lang={lang} />
            <div className="mt-5 flex justify-end">
              <button
                onClick={saveCurrent}
                disabled={justSaved}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-5 py-2 text-sm font-medium text-foreground transition hover:bg-accent disabled:opacity-60"
              >
                <Bookmark className="h-4 w-4" />
                {justSaved ? tr.saved : tr.save}
              </button>
            </div>
          </section>
        )}

        {/* Saved */}
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-display font-semibold text-foreground">
            {tr.savedTitle}
          </h2>
          {saved.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tr.noSaved}</p>
          ) : (
            <ul className="grid gap-3">
              {saved.map((s) => (
                <li
                  key={s.id}
                  className="rounded-2xl border border-border bg-card/70 p-4 backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <FlagBadge label={s.result.flag} />
                        <span className="text-xs text-muted-foreground">
                          · {s.result.pattern}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {s.text}
                      </p>
                    </div>
                    <button
                      onClick={() => remove(s.id)}
                      aria-label={t[s.lang].delete}
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
        <footer className="mt-12 text-center text-xs text-muted-foreground">
          {tr.disclaimer}
        </footer>
      </div>
    </div>
  );
}

// keep for type check
void flagKind;
