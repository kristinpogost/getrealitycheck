import type { AnalysisResult, Trend } from "@/components/ResultCards";

export type Mode = "situation" | "message";

export type ThreadEntry = {
  id: string;
  createdAt: number;
  mode: Mode;
  userInput: string;
  images?: string[]; // data URLs (kept light — first 2 only for storage)
  result: AnalysisResult;
};

export type PersonThread = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  entries: ThreadEntry[];
};

const KEY = "reality-check-threads-v2";

export function loadThreads(): PersonThread[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as PersonThread[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveThreads(threads: PersonThread[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(threads));
  } catch (e) {
    // Likely quota — drop oldest images to make room
    try {
      const trimmed = threads.map((t) => ({
        ...t,
        entries: t.entries.map((e, idx, arr) =>
          idx < arr.length - 2 ? { ...e, images: undefined } : e,
        ),
      }));
      localStorage.setItem(KEY, JSON.stringify(trimmed));
    } catch {}
  }
}

export function createThread(name: string): PersonThread {
  return {
    id: crypto.randomUUID(),
    name: name.trim() || "Untitled",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    entries: [],
  };
}

export function addEntry(
  threads: PersonThread[],
  threadId: string,
  entry: ThreadEntry,
): PersonThread[] {
  return threads.map((t) =>
    t.id === threadId
      ? { ...t, updatedAt: entry.createdAt, entries: [...t.entries, entry] }
      : t,
  );
}

export function latestEntry(t: PersonThread): ThreadEntry | undefined {
  return t.entries[t.entries.length - 1];
}

export function threadTrend(t: PersonThread): Trend | null {
  const last = latestEntry(t);
  return last?.result.trend ?? null;
}
