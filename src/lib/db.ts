import { supabase } from "@/integrations/supabase/client";
import type { AnalysisResult } from "@/components/ResultCards";
import type { PersonThread, ThreadEntry, Mode } from "./threads";
import { loadThreads as loadLocalThreads } from "./threads";

const MIGRATION_KEY = "reality-check-migrated-v1";

export async function fetchThreads(): Promise<PersonThread[]> {
  const { data: people, error } = await supabase
    .from("people")
    .select("id, name, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  if (!people || people.length === 0) return [];

  const ids = people.map((p) => p.id);
  const { data: entries, error: e2 } = await supabase
    .from("entries")
    .select("id, person_id, mode, user_input, images, result, created_at")
    .in("person_id", ids)
    .order("created_at", { ascending: true });
  if (e2) throw e2;

  const byPerson = new Map<string, ThreadEntry[]>();
  (entries ?? []).forEach((e: any) => {
    const arr = byPerson.get(e.person_id) ?? [];
    arr.push({
      id: e.id,
      createdAt: new Date(e.created_at).getTime(),
      mode: (e.mode ?? "situation") as Mode,
      userInput: e.user_input ?? "",
      images: (e.images as string[] | null) ?? undefined,
      result: e.result as AnalysisResult,
    });
    byPerson.set(e.person_id, arr);
  });

  return people.map((p) => ({
    id: p.id,
    name: p.name,
    createdAt: new Date(p.created_at).getTime(),
    updatedAt: new Date(p.updated_at).getTime(),
    entries: byPerson.get(p.id) ?? [],
  }));
}

export async function createPersonDb(userId: string, name: string): Promise<PersonThread> {
  const { data, error } = await supabase
    .from("people")
    .insert({ user_id: userId, name: name.trim() || "Untitled" })
    .select("id, name, created_at, updated_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    createdAt: new Date(data.created_at).getTime(),
    updatedAt: new Date(data.updated_at).getTime(),
    entries: [],
  };
}

export async function addEntryDb(
  userId: string,
  personId: string,
  input: { mode: Mode; userInput: string; images?: string[]; result: AnalysisResult },
): Promise<ThreadEntry> {
  const { data, error } = await supabase
    .from("entries")
    .insert({
      user_id: userId,
      person_id: personId,
      mode: input.mode,
      user_input: input.userInput,
      images: input.images ?? null,
      result: input.result as any,
      flag: input.result.flag ?? null,
      summary: input.result.summary ?? null,
    })
    .select("id, created_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    createdAt: new Date(data.created_at).getTime(),
    mode: input.mode,
    userInput: input.userInput,
    images: input.images,
    result: input.result,
  };
}

export async function deletePersonDb(personId: string): Promise<void> {
  const { error } = await supabase.from("people").delete().eq("id", personId);
  if (error) throw error;
}

export async function migrateLocalIfNeeded(userId: string): Promise<boolean> {
  try {
    if (localStorage.getItem(MIGRATION_KEY)) return false;
    const local = loadLocalThreads();
    if (local.length === 0) {
      localStorage.setItem(MIGRATION_KEY, "1");
      return false;
    }
    for (const t of local) {
      const { data: p, error } = await supabase
        .from("people")
        .insert({ user_id: userId, name: t.name })
        .select("id")
        .single();
      if (error || !p) continue;
      for (const e of t.entries) {
        await supabase.from("entries").insert({
          user_id: userId,
          person_id: p.id,
          mode: e.mode,
          user_input: e.userInput,
          images: e.images ?? null,
          result: e.result as any,
          flag: e.result.flag ?? null,
          summary: e.result.summary ?? null,
        });
      }
    }
    localStorage.setItem(MIGRATION_KEY, "1");
    return true;
  } catch {
    return false;
  }
}
