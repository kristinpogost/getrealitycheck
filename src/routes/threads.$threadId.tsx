import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Loader2, Sparkles, Trash2, ImagePlus, X, MessageSquare, FileText,
  ArrowLeft, Pencil, Check, RefreshCw, ChevronDown, Clock,
} from "lucide-react";
import { ResultCards, type AnalysisResult } from "@/components/ResultCards";
import { FlagBadge } from "@/components/FlagBadge";
import { TrendBadge } from "@/components/TrendBadge";
import { ScreenshotGallery } from "@/components/ScreenshotGallery";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { latestEntry, type PersonThread, type ThreadEntry, type Mode } from "@/lib/threads";
import {
  fetchThreads, addEntryDb, deletePersonDb, renamePersonDb, updateEntryDb, deleteEntryDb,
} from "@/lib/db";
import { useUi, setStoredLang } from "@/lib/ui-i18n";

export const Route = createFileRoute("/threads/$threadId")({
  component: ThreadPage,
});

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const COLLAPSE_CHAR_THRESHOLD = 320;

// strings come from useUi()

function CollapsibleText({ text, UI }: { text: string; UI: ReturnType<typeof useUi> }) {
  const [open, setOpen] = useState(false);
  const long = text.length > COLLAPSE_CHAR_THRESHOLD;
  if (!long) {
    return (
      <p className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">{text}</p>
    );
  }
  return (
    <div className="relative">
      <div
        className={`relative overflow-hidden transition-[max-height] duration-500 ease-out ${
          open ? "max-h-[4000px]" : "max-h-32"
        }`}
        style={
          open
            ? undefined
            : {
                WebkitMaskImage:
                  "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
                maskImage:
                  "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
              }
        }
      >
        <p className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">{text}</p>
      </div>
      <div className="mt-1 flex justify-end">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="group inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          {open ? UI.showLess : UI.showMore}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>
    </div>
  );
}

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

function ThreadPage() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();
  const UI = useUi();
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [thread, setThread] = useState<PersonThread | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [threadId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const all = await fetchThreads();
        if (cancelled) return;
        const found = all.find((t) => t.id === threadId) ?? null;
        setThread(found);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, threadId]);

  const goBack = () => navigate({ to: "/" });

  const onDelete = async () => {
    if (!thread) return;
    if (!confirm(UI.confirmDelete)) return;
    try {
      await deletePersonDb(thread.id);
      goBack();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    }
  };

  const onRename = async (name: string) => {
    if (!thread) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === thread.name) return;
    const prev = thread;
    setThread({ ...thread, name: trimmed });
    try {
      await renamePersonDb(thread.id, trimmed);
    } catch (e: any) {
      setThread(prev);
      toast.error(e?.message || "Failed to rename");
    }
  };

  const onEntryAdded = (entry: ThreadEntry) => {
    setThread((t) => t ? { ...t, updatedAt: entry.createdAt, entries: [...t.entries, entry] } : t);
  };

  const onEntryUpdated = (entry: ThreadEntry) => {
    setThread((t) => t ? { ...t, entries: t.entries.map((e) => e.id === entry.id ? entry : e) } : t);
  };

  const onEntryDeleted = async (entryId: string) => {
    if (!thread) return;
    if (!confirm(UI.confirmDeleteEntry)) return false;
    const prev = thread;
    setThread({ ...thread, entries: thread.entries.filter((e) => e.id !== entryId) });
    try {
      await deleteEntryDb(entryId);
      toast.success(UI.entryDeleted);
      return true;
    } catch (e: any) {
      setThread(prev);
      toast.error(e?.message || "Failed to delete");
      return false;
    }
  };

  if (!authChecked || !userId || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen px-4 py-14">
        <div className="mx-auto w-full max-w-2xl rounded-2xl border border-border/60 bg-card/70 p-6 text-center text-muted-foreground">
          {UI.threadNotFound} <Link to="/" className="text-primary underline">{UI.goBack}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 sm:py-14">
      <Toaster position="top-center" />
      <div className="mx-auto w-full max-w-2xl">
        <ThreadView
          thread={thread}
          userId={userId}
          onEntryAdded={onEntryAdded}
          onEntryUpdated={onEntryUpdated}
          onEntryDeleted={onEntryDeleted}
          onBack={goBack}
          onDelete={onDelete}
          onRename={onRename}
        />
      </div>
    </div>
  );
}

function ThreadView({
  thread, userId, onEntryAdded, onEntryUpdated, onEntryDeleted, onBack, onDelete, onRename,
}: {
  thread: PersonThread;
  userId: string;
  onEntryAdded: (entry: ThreadEntry) => void;
  onEntryUpdated: (entry: ThreadEntry) => void;
  onEntryDeleted: (entryId: string) => Promise<boolean | void>;
  onBack: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const UI = useUi();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(thread.name);
  useEffect(() => { setDraftName(thread.name); }, [thread.name, thread.id]);

  const commitRename = () => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== thread.name) onRename(trimmed);
    else setDraftName(thread.name);
    setEditing(false);
  };

  // Intentionally no auto-scroll on entry changes. Opening a thread starts at
  // the top (input + upload area visible). After submitting, the composer stays
  // in view and the new entry renders just below — no jumping to the AI output.
  const latestReflectionRef = useRef<HTMLDivElement>(null);

  const last = latestEntry(thread);
  const trend = last?.result.trend;

  const reversed = useMemo(() => [...thread.entries].reverse(), [thread.entries]);

  return (
    <section>
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
            {editing ? (
              <div className="mt-1 flex items-center gap-2">
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    else if (e.key === "Escape") { setDraftName(thread.name); setEditing(false); }
                  }}
                  onBlur={commitRename}
                  maxLength={120}
                  className="font-display text-3xl text-foreground bg-background/70 border border-border/60 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-ring/40 min-w-0 w-full max-w-xs"
                />
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={commitRename}
                  className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-card/60"
                  aria-label={UI.saveName}
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-1.5 group">
                <h2 className="font-display text-3xl text-foreground">{thread.name}</h2>
                <button
                  onClick={() => setEditing(true)}
                  className="rounded-full p-1.5 text-muted-foreground/60 hover:text-foreground hover:bg-card/60 opacity-60 group-hover:opacity-100 transition"
                  aria-label={UI.rename}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDay(thread.createdAt)} · {thread.entries.length} {thread.entries.length === 1 ? UI.entry : UI.entries}
            </p>
          </div>
          {trend && (
            <div className="flex flex-col items-end gap-1">
              <TrendBadge trend={trend} />
              <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">{UI.overallTrend}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <Composer
          thread={thread}
          userId={userId}
          onSubmitted={onEntryAdded}
          continueMode={thread.entries.length > 0}
        />
      </div>

      <div className="space-y-6">
        {thread.entries.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border/60 bg-card/40 p-8 text-center text-sm text-muted-foreground">
            {UI.noEntriesYet}
          </div>
        )}
        {reversed.map((e, i) => {
          const originalIndex = thread.entries.length - 1 - i;
          if (i === 0) {
            return (
              <TimelineEntry
                key={e.id}
                entry={e}
                index={originalIndex}
                thread={thread}
                onUpdated={onEntryUpdated}
                reflectionRef={latestReflectionRef}
              />
            );
          }
          return (
            <MemoryCard
              key={e.id}
              entry={e}
              index={originalIndex}
              thread={thread}
              onUpdated={onEntryUpdated}
            />
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Timeline entry ---------- */
function TimelineEntry({
  entry, index, thread, onUpdated, reflectionRef, forceReflectionOpen,
}: {
  entry: ThreadEntry;
  index: number;
  thread: PersonThread;
  onUpdated: (entry: ThreadEntry) => void;
  reflectionRef?: React.Ref<HTMLDivElement>;
  forceReflectionOpen?: boolean;
}) {
  const UI = useUi();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(entry.userInput);
  const [draftImages, setDraftImages] = useState<string[]>(entry.images ?? []);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(entry.userInput); }, [entry.userInput, entry.id]);
  useEffect(() => { setDraftImages(entry.images ?? []); }, [entry.images, entry.id]);

  const addEditFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const next: string[] = [];
    for (const f of arr) {
      if (f.size > MAX_IMAGE_BYTES) {
        toast.error(`${f.name}: ${UI.imageTooLarge}`);
        continue;
      }
      try { next.push(await fileToDataUrl(f)); } catch {}
    }
    if (next.length) setDraftImages((prev) => [...prev, ...next]);
  };

  // Paste support while editing
  useEffect(() => {
    if (!isEditing) return;
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
        addEditFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [isEditing]);

  const removeDraftImage = (i: number) =>
    setDraftImages((prev) => prev.filter((_, idx) => idx !== i));

  const cancelEdit = () => {
    setDraft(entry.userInput);
    setDraftImages(entry.images ?? []);
    setIsEditing(false);
  };

  const saveAndRegenerate = async () => {
    const trimmed = draft.trim();
    if (trimmed.length < 3 && draftImages.length === 0) {
      toast.error(UI.keepFewWords);
      return;
    }
    setBusy(true);
    try {
      const priorEntries = thread.entries
        .filter((e) => e.id !== entry.id && e.createdAt < entry.createdAt)
        .map((e) => ({
          createdAt: e.createdAt,
          mode: e.mode,
          userInput: e.userInput,
          summary: e.result.summary,
          flag: e.result.flag,
          flag_color: e.result.flag_color,
          pattern_tag: e.result.pattern_tag,
        }));

      const imagesForAi = draftImages.length > 0 ? draftImages : undefined;
      const { data, error } = await supabase.functions.invoke("analyze", {
        body: {
          text: trimmed,
          mode: entry.mode,
          images: imagesForAi,
          personName: thread.name,
          priorEntries,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const result = data as AnalysisResult;
      if (result?.language) setStoredLang(result.language);

      const imagesForDb = draftImages.length > 0 ? draftImages : null;
      await updateEntryDb(entry.id, { userInput: trimmed, images: imagesForDb, result });
      onUpdated({ ...entry, userInput: trimmed, images: imagesForAi, result });
      setIsEditing(false);
      toast.success(UI.reflectionUpdated);
    } catch (e: any) {
      toast.error(e?.message || UI.error);
    } finally {
      setBusy(false);
    }
  };

  const regenerateOnly = async () => {
    setBusy(true);
    try {
      const priorEntries = thread.entries
        .filter((e) => e.id !== entry.id && e.createdAt < entry.createdAt)
        .map((e) => ({
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
          text: entry.userInput,
          mode: entry.mode,
          images: entry.images,
          personName: thread.name,
          priorEntries,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const result = data as AnalysisResult;
      if (result?.language) setStoredLang(result.language);
      await updateEntryDb(entry.id, { result });
      onUpdated({ ...entry, result });
      toast.success(UI.regenerated);
    } catch (e: any) {
      toast.error(e?.message || UI.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border/50" />
        <span className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
          #{index + 1} · {formatTime(entry.createdAt)}
        </span>
        <div className="h-px flex-1 bg-border/50" />
      </div>

      {/* User entry */}
      <div className="flex justify-end">
        <div className="max-w-[88%] w-full">
          <div className="mb-1.5 flex items-center justify-end gap-2 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <span>{UI.yourEntry} · {entry.mode === "message" ? UI.modeMessage : UI.modeSituation}</span>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 normal-case tracking-normal text-xs text-muted-foreground/70 hover:text-foreground hover:bg-card/60"
                aria-label={UI.edit}
              >
                <Pencil className="h-3 w-3" /> {UI.edit}
              </button>
            )}
          </div>
          <div className="rounded-3xl rounded-tr-md border border-primary/20 bg-gradient-to-br from-primary/12 via-primary/8 to-accent/15 px-5 py-4 shadow-sm">
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={Math.min(10, Math.max(3, draft.split("\n").length + 1))}
                  maxLength={4000}
                  className="w-full resize-none rounded-xl border border-border/60 bg-background/70 p-3 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-ring/40"
                />

                {draftImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {draftImages.map((src, i) => (
                      <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-border/60 bg-muted">
                        <img src={src} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeDraftImage(i); }}
                          className="absolute right-1 top-1 rounded-full bg-background/85 p-0.5 text-foreground hover:bg-destructive hover:text-destructive-foreground"
                          aria-label="Remove image"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    if (e.dataTransfer.files?.length) addEditFiles(e.dataTransfer.files);
                  }}
                  onClick={() => editFileInputRef.current?.click()}
                  className={`group relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-3 text-center transition ${
                    dragOver
                      ? "border-primary bg-primary/5"
                      : "border-border/70 bg-background/40 hover:border-primary/50 hover:bg-background/70"
                  }`}
                >
                  <ImagePlus className="h-4 w-4 text-primary/70" />
                  <div className="text-[0.7rem] font-medium text-foreground">
                    {draftImages.length > 0 ? UI.addMoreScreenshots : UI.addScreenshots}
                  </div>
                  <div className="text-[0.6rem] text-muted-foreground">{UI.pasteDragClick}</div>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) addEditFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[0.65rem] text-muted-foreground">
                    {draft.length}/4000{draftImages.length > 0 ? ` · ${draftImages.length} ${draftImages.length === 1 ? UI.image : UI.images}` : ""}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={cancelEdit}
                      disabled={busy}
                      className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >{UI.cancel}</button>
                    <button
                      onClick={saveAndRegenerate}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:brightness-105 disabled:opacity-60"
                    >
                      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      {UI.save}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {entry.userInput && (
                  <CollapsibleText text={entry.userInput} UI={UI} />
                )}
                {entry.images && entry.images.length > 0 && (
                  <div className={entry.userInput ? "mt-3" : ""}>
                    <ScreenshotGallery images={entry.images} thumbHeight={160} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* AI reflection */}
      {forceReflectionOpen ? (
        <ExpandedReflection entry={entry} busy={busy} onRegenerate={regenerateOnly} />
      ) : (
        <ReflectionCard
          entry={entry}
          busy={busy}
          onRegenerate={regenerateOnly}
          reflectionRef={reflectionRef}
          defaultOpen={index === thread.entries.length - 1}
        />
      )}
    </div>
  );
}

/* ---------- Reflection card (compact → expanded) ---------- */
function ReflectionCard({
  entry, busy, onRegenerate, reflectionRef, defaultOpen,
}: {
  entry: ThreadEntry;
  busy: boolean;
  onRegenerate: () => void;
  reflectionRef?: React.Ref<HTMLDivElement>;
  defaultOpen?: boolean;
}) {
  const UI = useUi();
  const [open, setOpen] = useState(!!defaultOpen);
  const r = entry.result;
  const flagColor = r.flag_color;

  const tintWrap =
    flagColor === "green"
      ? "from-flag-green-soft/45 via-card/85 to-card/70 border-flag-green/25"
      : flagColor === "red"
        ? "from-flag-red-soft/45 via-card/85 to-card/70 border-flag-red/25"
        : "from-flag-yellow-soft/40 via-card/85 to-card/70 border-flag-yellow/25";

  const glow =
    flagColor === "green"
      ? "bg-flag-green-soft/40"
      : flagColor === "red"
        ? "bg-flag-red-soft/40"
        : "bg-flag-yellow-soft/35";

  return (
    <div ref={reflectionRef} className="flex justify-start scroll-mt-6">
      <div className="w-full max-w-[96%]">
        <div className="mb-2 flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/70 px-2.5 py-0.5 text-[0.62rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> {UI.reflection}
          </div>
          <button
            onClick={onRegenerate}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-muted-foreground/70 hover:text-foreground hover:bg-card/60 disabled:opacity-60"
            title={UI.regenerate}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {UI.regenerate}
          </button>
        </div>

        <div className={`relative overflow-hidden rounded-3xl rounded-tl-md border bg-gradient-to-br ${tintWrap} backdrop-blur-sm shadow-[0_6px_28px_-18px_rgba(180,140,150,0.35)]`}>
          <div className={`pointer-events-none absolute -top-16 -right-10 h-44 w-44 rounded-full blur-3xl opacity-70 ${glow}`} />

          {/* Compact header — always visible */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="relative w-full text-left p-5 sm:p-6 group"
            aria-expanded={open}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <FlagBadge label={r.flag} kind={r.flag_color} size="sm" />
                  <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/8 px-2.5 py-0.5 text-[0.62rem] font-medium uppercase tracking-[0.15em] text-primary">
                    {r.pattern_tag}
                  </span>
                </div>
                <p className="font-display text-[1.05rem] leading-snug text-foreground/90">
                  {r.summary}
                </p>
                {r.reality_check && !open && (
                  <p className="text-xs text-muted-foreground line-clamp-2 italic">
                    “{r.reality_check}”
                  </p>
                )}
              </div>
              <div className={`mt-1 shrink-0 rounded-full border border-border/50 bg-background/60 p-1.5 text-muted-foreground transition group-hover:text-foreground ${open ? "rotate-180" : ""}`}>
                <ChevronDown className="h-3.5 w-3.5" />
              </div>
            </div>
            {!open && (
              <div className="mt-3 text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground/80">
                {UI.tapToUnfold}
              </div>
            )}
          </button>

          {/* Expanded full analysis */}
          {open && (
            <div className="relative border-t border-border/40 bg-card/40 p-5 sm:p-6 animate-in fade-in slide-in-from-top-1 duration-300">
              <ResultCards result={entry.result} variant={entry.mode} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Expanded reflection (no collapse) ---------- */
function ExpandedReflection({
  entry, busy, onRegenerate,
}: {
  entry: ThreadEntry;
  busy: boolean;
  onRegenerate: () => void;
}) {
  const UI = useUi();
  const r = entry.result;
  const flagColor = r.flag_color;
  const tintWrap =
    flagColor === "green"
      ? "from-flag-green-soft/45 via-card/85 to-card/70 border-flag-green/25"
      : flagColor === "red"
        ? "from-flag-red-soft/45 via-card/85 to-card/70 border-flag-red/25"
        : "from-flag-yellow-soft/40 via-card/85 to-card/70 border-flag-yellow/25";
  const glow =
    flagColor === "green"
      ? "bg-flag-green-soft/40"
      : flagColor === "red"
        ? "bg-flag-red-soft/40"
        : "bg-flag-yellow-soft/35";

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[96%]">
        <div className="mb-2 flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/70 px-2.5 py-0.5 text-[0.62rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> {UI.reflection}
          </div>
          <button
            onClick={onRegenerate}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-muted-foreground/70 hover:text-foreground hover:bg-card/60 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {UI.regenerate}
          </button>
        </div>
        <div className={`relative overflow-hidden rounded-3xl rounded-tl-md border bg-gradient-to-br ${tintWrap} backdrop-blur-sm shadow-[0_6px_28px_-18px_rgba(180,140,150,0.35)] p-5 sm:p-6`}>
          <div className={`pointer-events-none absolute -top-16 -right-10 h-44 w-44 rounded-full blur-3xl opacity-70 ${glow}`} />
          <div className="relative">
            <ResultCards result={entry.result} variant={entry.mode} />
          </div>
        </div>
      </div>
    </div>
  );
}
function Composer({
  thread, userId, onSubmitted, continueMode,
}: {
  thread: PersonThread;
  userId: string;
  onSubmitted: (entry: ThreadEntry) => void;
  continueMode: boolean;
}) {
  const UI = useUi();
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
      if (res?.language) setStoredLang(res.language);

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
          {continueMode ? UI.continuingThread : UI.firstEntry}
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
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (!loading) analyze();
          }
        }}
        placeholder={placeholder}
        rows={mode === "situation" ? 5 : 3}
        maxLength={4000}
        className="w-full resize-none rounded-2xl border border-border/60 bg-background/70 p-3.5 text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-ring/40 transition"
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {text.length}/4000{images.length > 0 ? ` · ${images.length} ${images.length === 1 ? UI.image : UI.images}` : ""}
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

/* ---------- Memory card (compact preview → modal) ---------- */
function MemoryCard({
  entry, index, thread, onUpdated,
}: {
  entry: ThreadEntry;
  index: number;
  thread: PersonThread;
  onUpdated: (entry: ThreadEntry) => void;
}) {
  const UI = useUi();
  const [open, setOpen] = useState(false);
  const r = entry.result;
  const flagColor = r.flag_color;

  const tintWrap =
    flagColor === "green"
      ? "from-flag-green-soft/35 via-card/85 to-card/70 border-flag-green/20"
      : flagColor === "red"
        ? "from-flag-red-soft/35 via-card/85 to-card/70 border-flag-red/20"
        : "from-flag-yellow-soft/30 via-card/85 to-card/70 border-flag-yellow/20";

  const glow =
    flagColor === "green"
      ? "bg-flag-green-soft/40"
      : flagColor === "red"
        ? "bg-flag-red-soft/40"
        : "bg-flag-yellow-soft/35";

  const teaser = entry.userInput?.trim().slice(0, 110);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative block w-full cursor-pointer overflow-hidden rounded-3xl border bg-gradient-to-br ${tintWrap} text-left p-5 backdrop-blur-sm shadow-[0_4px_20px_-14px_rgba(180,140,150,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_32px_-16px_rgba(180,140,150,0.4)]`}
      >
        <div className={`pointer-events-none absolute -top-12 -right-8 h-32 w-32 rounded-full blur-3xl opacity-60 ${glow}`} />
        <div className="relative flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <FlagBadge label={r.flag} kind={r.flag_color} size="sm" />
              <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/8 px-2.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-[0.15em] text-primary">
                {r.pattern_tag}
              </span>
              {entry.images && entry.images.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/60 px-2 py-0.5 text-[0.6rem] text-muted-foreground">
                  <ImagePlus className="h-2.5 w-2.5" /> {entry.images.length}
                </span>
              )}
            </div>
            <p className="font-display text-[1rem] leading-snug text-foreground/90 line-clamp-2">
              {r.summary}
            </p>
            {teaser && (
              <p className="text-xs text-muted-foreground/90 line-clamp-1">
                <span className="text-muted-foreground/60">{UI.yourEntry}: </span>
                {teaser}{entry.userInput && entry.userInput.length > 110 ? "…" : ""}
              </p>
            )}
            <div className="flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground/80">
              <Clock className="h-2.5 w-2.5" />
              <span>#{index + 1} · {formatTime(entry.createdAt)}</span>
            </div>
          </div>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-border/60 bg-gradient-to-br from-card via-card/95 to-accent/10 backdrop-blur-xl">
          <div className="p-6 sm:p-8">
            <TimelineEntry
              entry={entry}
              index={index}
              thread={thread}
              onUpdated={(e) => { onUpdated(e); }}
              forceReflectionOpen
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

