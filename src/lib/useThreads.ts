import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchThreads, migrateLocalIfNeeded } from "@/lib/db";
import type { PersonThread, ThreadEntry } from "@/lib/threads";

export function useAuthUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
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
  return { userId, authChecked };
}

export function useThreads(userId: string | null) {
  const [threads, setThreads] = useState<PersonThread[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = async () => {
    try {
      const t = await fetchThreads();
      setThreads(t);
    } catch {}
    setLoaded(true);
  };

  useEffect(() => {
    if (!userId) return;
    (async () => {
      await migrateLocalIfNeeded(userId);
      await reload();
    })();
  }, [userId]);

  const upsertThread = (next: PersonThread) =>
    setThreads((prev) => {
      const exists = prev.some((t) => t.id === next.id);
      return exists ? prev.map((t) => (t.id === next.id ? next : t)) : [next, ...prev];
    });

  const removeThread = (id: string) =>
    setThreads((prev) => prev.filter((t) => t.id !== id));

  const renameThreadLocal = (id: string, name: string) =>
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));

  const addEntryLocal = (threadId: string, entry: ThreadEntry) =>
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? { ...t, updatedAt: entry.createdAt, entries: [...t.entries, entry] }
          : t,
      ),
    );

  const updateEntryLocal = (threadId: string, entry: ThreadEntry) =>
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? { ...t, entries: t.entries.map((e) => (e.id === entry.id ? entry : e)) }
          : t,
      ),
    );

  return {
    threads,
    loaded,
    reload,
    upsertThread,
    removeThread,
    renameThreadLocal,
    addEntryLocal,
    updateEntryLocal,
    setThreads,
  };
}
