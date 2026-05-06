import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Loader2, Sparkles, Plus, User, LogOut } from "lucide-react";
import { FlagBadge } from "@/components/FlagBadge";
import { TrendBadge } from "@/components/TrendBadge";
import { latestEntry, type PersonThread } from "@/lib/threads";
import { fetchThreads, createPersonDb, migrateLocalIfNeeded } from "@/lib/db";

export const Route = createFileRoute("/")({
  component: Index,
});

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
  lastInteraction: "Last reflection",
  entries: "entries",
  entry: "entry",
  disclaimer: "This tool offers reflection, not absolute truth.",
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function Index() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [threads, setThreads] = useState<PersonThread[]>([]);
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

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const migrated = await migrateLocalIfNeeded(userId);
      if (migrated) toast.success("Local threads moved to your account.");
      try {
        setThreads(await fetchThreads());
      } catch (e: any) {
        toast.error(e?.message || "Failed to load");
      }
    })();
  }, [userId]);

  const handleCreatePerson = async (name: string) => {
    if (!userId) return;
    try {
      const t = await createPersonDb(userId, name);
      setThreads((prev) => [t, ...prev]);
      setShowNewPerson(false);
      navigate({ to: "/threads/$threadId", params: { threadId: t.id } });
    } catch (e: any) {
      toast.error(e?.message || "Failed to create");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const sorted = useMemo(
    () => [...threads].sort((a, b) => b.updatedAt - a.updatedAt),
    [threads],
  );

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

        <header className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3.5 py-1 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-muted-foreground backdrop-blur-sm">
            <Sparkles className="h-3 w-3 text-primary" /> Reality Check
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-light text-foreground tracking-tight leading-[1.05]">
            A softer kind <span className="italic font-normal text-primary/90">of clarity</span>
          </h1>
          <p className="mt-4 text-muted-foreground max-w-md mx-auto leading-relaxed font-light text-sm sm:text-base">
            {UI.appTagline}
          </p>
        </header>

        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-2xl font-light text-foreground">{UI.people}</h2>
            <button
              onClick={() => setShowNewPerson(true)}
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
                onClick={() => setShowNewPerson(true)}
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
                    <Link
                      to="/threads/$threadId"
                      params={{ threadId: t.id }}
                      className="group block w-full rounded-3xl border border-border/60 bg-gradient-to-br from-card/90 via-card/85 to-accent/15 p-5 text-left backdrop-blur-sm shadow-sm transition hover:shadow-md hover:border-primary/30"
                    >
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
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

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
