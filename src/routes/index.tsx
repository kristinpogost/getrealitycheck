import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Loader2, Sparkles, Trash2, ImagePlus, X, MessageSquare, FileText,
  Plus, ArrowLeft, User, LogOut,
} from "lucide-react";
import { ResultCards, type AnalysisResult } from "@/components/ResultCards";
import { FlagBadge } from "@/components/FlagBadge";
import { TrendBadge } from "@/components/TrendBadge";
import { ScreenshotGallery } from "@/components/ScreenshotGallery";
import { latestEntry, type PersonThread, type ThreadEntry, type Mode } from "@/lib/threads";
import {
  fetchThreads, createPersonDb, addEntryDb, deletePersonDb, migrateLocalIfNeeded,
} from "@/lib/db";

export const Route = createFileRoute("/")({
  component: Index,
});

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const UI = {
  appTagline: "A quiet space to reflect on what's happening — and what it might mean.",
  people: "People",
  newPerson: "New person",
  noPeople: "No threads yet. Start by adding someone you want to reflect on.",
  newThreadTitle: "Who is this about?",
  newThreadHint: "Use a name, nickname, or label — only you see this.",
  namePlaceholder: "e.g. Alex, M., the new coworker",
  cancel: "Cancel",
  start: "Start thread",
  modeSituation: "Situation",
  modeMessage: "Message",
  placeholderSituation: "Describe what happened...",
  placeholderMessage: "Paste conversation text or upload screenshots",
  placeholderContinue: "Continue this situation...",
  uploadHint: "Paste screenshots (Ctrl+V), drag & drop, or upload images",
  uploadSubhint: "PNG, JPG — as many as you need",
  textareaLabelMessage: "If needed, paste the conversation text here for analysis",
  imagesNote: "Interpretation is based on what's visible in your screenshots.",
  analyze: "Reflect",
  analyzing: "Reflecting...",
  empty: "Please share a little more to reflect on.",
  error: "Something went off course. Please try again.",
  disclaimer: "This tool offers reflection, not absolute truth.",
  imageTooLarge: "Image is too large (max 8MB).",
  lastInteraction: "Last reflection",
  entries: "entries",
  entry: "entry",
  deleteThread: "Delete thread",
  confirmDelete: "Delete this entire thread? This cannot be undone.",
  yourEntry: "You",
  reflection: "Reflection",
  threadStart: "Thread started",
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
function formatDay(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
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

type View = { kind: "people" } | { kind: "thread"; id: string };

function Index() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [threads, setThreads] = useState<PersonThread[]>([]);
  const [view, setView] = useState<View>({ kind: "people" });
  const [showNewPerson, setShowNewPerson] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
      setAuthChecked(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
      setAuthChecked(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authChecked && !userId) navigate({ to: "/auth" });
  }, [authChecked, userId, navigate]);

  const reload = async () => {
    try {
      const t = await fetchThreads();
      setThreads(t);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load");
    }
  };

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const migrated = await migrateLocalIfNeeded(userId);
      if (migrated) toast.success("Local threads moved to your account.");
      await reload();
    })();
  }, [userId]);

  const openThread = (id: string) => setView({ kind: "thread", id });
  const goHome = () => { setView({ kind: "people" }); reload(); };

  const handleCreatePerson = async (name: string) => {
    if (!userId) return;
    try {
      const t = await createPersonDb(userId, name);
      setThreads((prev) => [t, ...prev]);
      setShowNewPerson(false);
      openThread(t.id);
    } catch (e: any) {
      toast.error(e?.message || "Failed to create");
    }
  };

  const removeThread = async (id: string) => {
    if (!confirm(UI.confirmDelete)) return;
    try {
      await deletePersonDb(id);
      setThreads((prev) => prev.filter((t) => t.id !== id));
      goHome();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const currentThread = view.kind === "thread" ? threads.find((t) => t.id === view.id) : undefined;

  if (!authChecked || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 sm:py-14">
      <Toaster position="top-center" />
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-2 flex justify-end">
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-card/60 transition"
          >
            <LogOut className="h-3 w-3" /> Sign out
          </button>
        </div>
        <Header onHome={goHome} canGoHome={view.kind !== "people"} />

        {view.kind === "people" && (
          <PeopleView
            threads={threads}
            onOpen={openThread}
            onNew={() => setShowNewPerson(true)}
          />
        )}

        {view.kind === "thread" && currentThread && (
          <ThreadView
            thread={currentThread}
            userId={userId}
            onEntryAdded={(entry) => {
              setThreads((prev) =>
                prev.map((t) =>
                  t.id === currentThread.id
                    ? { ...t, updatedAt: entry.createdAt, entries: [...t.entries, entry] }
                    : t,
                ),
              );
            }}
            onBack={goHome}
            onDelete={() => removeThread(currentThread.id)}
          />
        )}

        {view.kind === "thread" && !currentThread && (
          <div className="rounded-2xl border border-border/60 bg-card/70 p-6 text-center text-muted-foreground">
            Thread not found. <button className="text-primary underline" onClick={goHome}>Go back</button>
          </div>
        )}

        <footer className="mt-14 text-center text-xs text-muted-foreground italic">
          {UI.disclaimer}
        </footer>
      </div>

      {showNewPerson && (
        <NewPersonModal
          onCancel={() => setShowNewPerson(false)}
          onCreate={handleCreatePerson}
        />
      )}
    </div>
  );
}

/* ---------- Header ---------- */
function Header({ onHome, canGoHome }: { onHome: () => void; canGoHome: boolean }) {
  return (
    <header className="mb-10 text-center">
      <button
        onClick={canGoHome ? onHome : undefined}
        className={`mb-4 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3.5 py-1 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-muted-foreground backdrop-blur-sm ${canGoHome ? "hover:text-foreground transition" : "cursor-default"}`}
      >
        <Sparkles className="h-3 w-3 text-primary" />
        Reality Check
      </button>
      <h1 className="text-4xl sm:text-5xl font-display font-light text-foreground tracking-tight leading-[1.05]">
        A softer kind <span className="italic font-normal text-primary/90">of clarity</span>
      </h1>
      <p className="mt-4 text-muted-foreground max-w-md mx-auto leading-relaxed font-light text-sm sm:text-base">
        {UI.appTagline}
      </p>
    </header>
  );
}

/* ---------- People list ---------- */
function PeopleView({
  threads, onOpen, onNew,
}: {
  threads: PersonThread[];
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  const sorted = useMemo(
    () => [...threads].sort((a, b) => b.updatedAt - a.updatedAt),
    [threads],
  );

  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-2xl font-light text-foreground">{UI.people}</h2>
        <button
          onClick={onNew}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary/85 px-4 py-2 text-sm font-medium text-primary-foreground shadow-md transition hover:shadow-lg hover:brightness-105"
        >
          <Plus className="h-4 w-4" />
          {UI.newPerson}
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/70 bg-card/40 p-10 text-center">
          <User className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{UI.noPeople}</p>
          <button
            onClick={onNew}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:shadow-md transition"
          >
            <Plus className="h-4 w-4" /> {UI.newPerson}
          </button>
        </div>
      ) : (
        <ul className="grid gap-3">
          {sorted.map((t) => {
            const last = latestEntry(t);
            const trend = last?.result.trend;
            return (
              <li key={t.id}>
                <button
                  onClick={() => onOpen(t.id)}
                  className="group w-full rounded-3xl border border-border/60 bg-gradient-to-br from-card/90 via-card/85 to-accent/15 p-5 text-left backdrop-blur-sm shadow-sm transition hover:shadow-md hover:border-primary/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="font-display text-lg text-foreground truncate">{t.name}</h3>
                        <span className="text-xs text-muted-foreground">
                          · {t.entries.length} {t.entries.length === 1 ? UI.entry : UI.entries}
                        </span>
                      </div>
                      {last ? (
                        <>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <FlagBadge label={last.result.flag} kind={last.result.flag_color} size="sm" />
                            {trend && <TrendBadge trend={trend} />}
                          </div>
                          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2">
                            {last.result.summary}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {UI.lastInteraction}: {formatTime(last.createdAt)}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm italic text-muted-foreground">No entries yet — open to add the first reflection.</p>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ---------- New person modal ---------- */
function NewPersonModal({
  onCancel, onCreate,
}: { onCancel: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = () => {
    if (name.trim().length < 1) return;
    onCreate(name.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-6 shadow-2xl">
        <h3 className="font-display text-xl text-foreground mb-1">{UI.newThreadTitle}</h3>
        <p className="text-sm text-muted-foreground mb-4">{UI.newThreadHint}</p>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={UI.namePlaceholder}
          className="w-full rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-ring/40"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
          >{UI.cancel}</button>
          <button
            onClick={submit}
            disabled={name.trim().length < 1}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:shadow-md transition disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> {UI.start}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Thread view ---------- */
function ThreadView({
  thread, userId, onEntryAdded, onBack, onDelete,
}: {
  thread: PersonThread;
  userId: string;
  onEntryAdded: (entry: ThreadEntry) => void;
  onBack: () => void;
  onDelete: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread.entries.length]);

  const last = latestEntry(thread);
  const trend = last?.result.trend;

  return (
    <section>
      {/* Thread header */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-card/60 transition"
        >
          <ArrowLeft className="h-4 w-4" /> {UI.people}
        </button>
        <button
          onClick={onDelete}
          className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
          aria-label={UI.deleteThread}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-6 rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card/90 to-accent/20 p-6 backdrop-blur-sm shadow-sm">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">{UI.threadStart}</div>
            <h2 className="mt-1 font-display text-3xl text-foreground">{thread.name}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDay(thread.createdAt)} · {thread.entries.length} {thread.entries.length === 1 ? UI.entry : UI.entries}
            </p>
          </div>
          {trend && (
            <div className="flex flex-col items-end gap-1">
              <TrendBadge trend={trend} />
              <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">overall trend</span>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-10">
        {thread.entries.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border/60 bg-card/40 p-8 text-center text-sm text-muted-foreground">
            No entries yet. Share the first situation or message below.
          </div>
        )}
        {thread.entries.map((e, i) => (
          <TimelineEntry key={e.id} entry={e} index={i} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="mt-10">
        <Composer
          thread={thread}
          userId={userId}
          onSubmitted={onEntryAdded}
          continueMode={thread.entries.length > 0}
        />
      </div>
    </section>
  );
}

/* ---------- Timeline entry (chat-style) ---------- */
function TimelineEntry({ entry, index }: { entry: ThreadEntry; index: number }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border/50" />
        <span className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
          #{index + 1} · {formatTime(entry.createdAt)}
        </span>
        <div className="h-px flex-1 bg-border/50" />
      </div>

      {/* User message bubble — right aligned */}
      <div className="flex justify-end">
        <div className="max-w-[88%]">
          <div className="mb-1.5 text-right text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {UI.yourEntry} · {entry.mode === "message" ? UI.modeMessage : UI.modeSituation}
          </div>
          <div className="rounded-3xl rounded-tr-md border border-primary/20 bg-gradient-to-br from-primary/12 via-primary/8 to-accent/15 px-5 py-4 shadow-sm">
            {entry.userInput && (
              <p className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">
                {entry.userInput}
              </p>
            )}
            {entry.images && entry.images.length > 0 && (
              <div className={entry.userInput ? "mt-3" : ""}>
                <ScreenshotGallery images={entry.images} thumbHeight={160} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI reflection — left aligned */}
      <div className="flex justify-start">
        <div className="w-full max-w-[96%]">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/70 px-2.5 py-0.5 text-[0.62rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> {UI.reflection}
          </div>
          <div className="rounded-3xl rounded-tl-md border border-border/50 bg-card/70 p-5 sm:p-6 shadow-sm backdrop-blur-sm">
            <ResultCards result={entry.result} variant={entry.mode} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Composer (input area, supports both modes) ---------- */
function Composer({
  thread, userId, onSubmitted, continueMode,
}: {
  thread: PersonThread;
  userId: string;
  onSubmitted: (entry: ThreadEntry) => void;
  continueMode: boolean;
}) {
  const [mode, setMode] = useState<Mode>("situation");
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    try {
      const priorEntries = thread.entries.map((e) => ({
        createdAt: e.createdAt,
        mode: e.mode,
        userInput: e.userInput,
        summary: e.result.summary,
        flag: e.result.flag,
        flag_color: e.result.flag_color,
        pattern_tag: e.result.pattern_tag,
      }));

      const { data, error } = await supabase.functions.invoke("analyze", {
        body: {
          text: trimmed,
          mode,
          images: hasImages ? images : undefined,
          personName: thread.name,
          priorEntries,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const res = data as AnalysisResult;

      const imagesToSave = hasImages ? images : undefined;
      const entry = await addEntryDb(userId, thread.id, {
        mode,
        userInput: trimmed,
        images: imagesToSave,
        result: res,
      });
      onSubmitted(entry);
      setText("");
      setImages([]);
    } catch (e: any) {
      toast.error(e?.message || UI.error);
    } finally {
      setLoading(false);
    }
  };

  const placeholder = continueMode
    ? UI.placeholderContinue
    : mode === "situation" ? UI.placeholderSituation : UI.placeholderMessage;

  return (
    <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-card/90 via-card/85 to-accent/15 p-4 sm:p-5 backdrop-blur-sm shadow-[0_10px_40px_-16px_rgba(180,140,150,0.3)]">
      {/* Mode toggle */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="inline-flex rounded-full border border-border/60 bg-background/60 p-0.5 text-xs">
          {(["situation", "message"] as Mode[]).map((m) => {
            const Icon = m === "situation" ? FileText : MessageSquare;
            return (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition ${
                  mode === m
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3 w-3" />
                {m === "situation" ? UI.modeSituation : UI.modeMessage}
              </button>
            );
          })}
        </div>
        <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          {continueMode ? "continuing thread" : "first entry"}
        </span>
      </div>

      {mode === "message" && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`group relative mb-3 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed p-4 text-center transition ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border/70 bg-background/50 hover:border-primary/50 hover:bg-background/70"
            }`}
          >
            <ImagePlus className="h-5 w-5 text-primary/70" />
            <div className="text-xs font-medium text-foreground">{UI.uploadHint}</div>
            <div className="text-[0.65rem] text-muted-foreground">{UI.uploadSubhint}</div>
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

          {images.length > 0 && (
            <div className="mb-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {images.map((src, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-border/60 bg-muted">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                    className="absolute right-1 top-1 rounded-full bg-background/85 p-0.5 text-foreground hover:bg-destructive hover:text-destructive-foreground"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={mode === "situation" ? 5 : 3}
        maxLength={4000}
        className="w-full resize-none rounded-2xl border border-border/60 bg-background/70 p-3.5 text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-ring/40 transition"
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {text.length}/4000{images.length > 0 ? ` · ${images.length} image${images.length > 1 ? "s" : ""}` : ""}
        </span>
        <button
          onClick={analyze}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary/85 px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-md transition hover:shadow-lg hover:brightness-105 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? UI.analyzing : UI.analyze}
        </button>
      </div>
    </div>
  );
}
