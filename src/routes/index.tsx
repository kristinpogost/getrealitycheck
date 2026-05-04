import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Loader2, Sparkles, Trash2, ImagePlus, X, MessageSquare, FileText } from "lucide-react";
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
  mode: Mode;
};

const STORAGE_KEY = "reality-check-saved";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB each

const UI = {
  tagline: "A quiet space to reflect on what's happening — and what it might mean.",
  modeSituation: "Analyze a situation",
  modeMessage: "Analyze a message",
  placeholderSituation: "Describe what happened...",
  placeholderMessage: "Paste conversation text or upload screenshots",
  uploadHint: "Paste screenshots (Ctrl+V), drag & drop, or upload images",
  uploadSubhint: "PNG, JPG — as many as you need",
  textareaLabelMessage: "If needed, paste the conversation text here for analysis",
  imagesNote: "Interpretation is based on what's visible in your screenshots.",
  analyze: "Analyze",
  analyzing: "Reflecting...",
  savedTitle: "Saved situations",
  noSaved: "Your saved reflections will appear here.",
  delete: "Remove",
  empty: "Please share a little more to reflect on.",
  error: "Something went off course. Please try again.",
  disclaimer: "This tool offers reflection, not absolute truth.",
  imageTooLarge: "Image is too large (max 8MB).",
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function Index() {
  const [mode, setMode] = useState<Mode>("situation");
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [resultMode, setResultMode] = useState<Mode>("situation");
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (next: SavedItem[]) => {
    setSaved(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const next: string[] = [];
    for (const f of arr) {
      if (f.size > MAX_IMAGE_BYTES) {
        toast.error(`${f.name}: ${UI.imageTooLarge}`);
        continue;
      }
      try { next.push(await fileToDataUrl(f)); } catch {}
    }
    if (next.length) setImages((prev) => [...prev, ...next]);
  };

  // Global paste handler in message mode
  useEffect(() => {
    if (mode !== "message") return;
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const it of Array.from(items)) {
        if (it.kind === "file") {
          const f = it.getAsFile();
          if (f && f.type.startsWith("image/")) files.push(f);
        }
      }
      if (files.length) {
        e.preventDefault();
        handleFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [mode]);

  const removeImage = (i: number) =>
    setImages((prev) => prev.filter((_, idx) => idx !== i));

  const switchMode = (m: Mode) => {
    setMode(m);
    if (m === "situation") setImages([]);
  };

  const analyze = async () => {
    const trimmed = text.trim();
    const hasImages = mode === "message" && images.length > 0;
    if (trimmed.length < 3 && !hasImages) {
      toast.error(UI.empty);
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("analyze", {
        body: { text: trimmed, mode, images: hasImages ? images : undefined },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const res = data as AnalysisResult;
      setResult(res);
      setResultMode(mode);
      setText("");
      setImages([]);

      const item: SavedItem = {
        id: crypto.randomUUID(),
        summary: res.summary,
        flag: res.flag,
        flag_color: res.flag_color,
        result: res,
        createdAt: Date.now(),
        mode,
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
        <header className="mb-14 text-center">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3.5 py-1 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-muted-foreground backdrop-blur-sm">
            <Sparkles className="h-3 w-3 text-primary" />
            Reality Check
          </div>
          <h1 className="text-5xl sm:text-6xl font-display font-light text-foreground tracking-tight leading-[1.05]">
            A softer kind <span className="italic font-normal text-primary/90">of clarity</span>
          </h1>
          <p className="mt-5 text-muted-foreground max-w-md mx-auto leading-relaxed font-light">
            {UI.tagline}
          </p>
        </header>

        {/* Mode toggle */}
        <div className="mb-5 flex justify-center">
          <div className="inline-flex rounded-full border border-border/60 bg-background/60 p-1 text-sm shadow-sm">
            {(["situation", "message"] as Mode[]).map((m) => {
              const Icon = m === "situation" ? FileText : MessageSquare;
              return (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-medium transition-all ${
                    mode === m
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {m === "situation" ? UI.modeSituation : UI.modeMessage}
                </button>
              );
            })}
          </div>
        </div>

        {/* Input section — visually distinct per mode */}
        {mode === "situation" ? (
          <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-card/90 via-card/80 to-accent/20 p-5 sm:p-7 backdrop-blur-sm shadow-[0_10px_40px_-12px_rgba(180,140,150,0.25)]">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={UI.placeholderSituation}
              rows={8}
              maxLength={4000}
              className="w-full resize-none rounded-2xl border border-border/60 bg-background/70 p-4 text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-ring/40 transition shadow-inner"
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{text.length}/4000</span>
              <button
                onClick={analyze}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary/80 px-7 py-3 font-medium text-primary-foreground shadow-md transition hover:shadow-lg hover:brightness-105 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? UI.analyzing : UI.analyze}
              </button>
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-secondary/40 via-card/85 to-card/80 p-5 sm:p-7 backdrop-blur-sm shadow-[0_10px_40px_-12px_rgba(180,140,150,0.25)]">
            {/* Drag & drop image area */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border/70 bg-background/50 hover:border-primary/50 hover:bg-background/70"
              }`}
            >
              <ImagePlus className="h-7 w-7 text-primary/70 transition group-hover:text-primary" />
              <div className="text-sm font-medium text-foreground">{UI.uploadHint}</div>
              <div className="text-xs text-muted-foreground">{UI.uploadSubhint}</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Image previews */}
            {images.length > 0 && (
              <>
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {images.map((src, i) => (
                    <div
                      key={i}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-muted shadow-sm"
                    >
                      <img src={src} alt={`upload-${i}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                        className="absolute right-1 top-1 rounded-full bg-background/85 p-1 text-foreground shadow-sm transition hover:bg-destructive hover:text-destructive-foreground"
                        aria-label="Remove image"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs italic text-muted-foreground">{UI.imagesNote}</p>
              </>
            )}

            {/* Text area below */}
            <div className="mt-5">
              <label className="mb-2 block text-xs font-medium text-muted-foreground">
                {UI.textareaLabelMessage}
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={UI.placeholderMessage}
                rows={4}
                maxLength={4000}
                className="w-full resize-none rounded-2xl border border-border/60 bg-background/70 p-4 text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-ring/40 transition shadow-inner"
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {text.length}/4000{images.length > 0 ? ` · ${images.length} image${images.length > 1 ? "s" : ""}` : ""}
              </span>
              <button
                onClick={analyze}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary/80 px-7 py-3 font-medium text-primary-foreground shadow-md transition hover:shadow-lg hover:brightness-105 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? UI.analyzing : UI.analyze}
              </button>
            </div>
          </section>
        )}

        {/* Result */}
        {result && (
          <section className="mt-16">
            <ResultCards result={result} variant={resultMode} />
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
                        {s.mode === "message" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">
                            <MessageSquare className="h-2.5 w-2.5" /> message
                          </span>
                        )}
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

        <footer className="mt-14 text-center text-xs text-muted-foreground italic">
          {UI.disclaimer}
        </footer>
      </div>
    </div>
  );
}
