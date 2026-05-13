import { useEffect, useState } from "react";

export type UiLang = "en" | "et";

const STORAGE_KEY = "ui_lang";

export const UI_STRINGS = {
  en: {
    // Index page
    appBadge: "Reality Check",
    appHeadline1: "A softer kind",
    appHeadline2: "of clarity",
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
    signOut: "Sign out",
    noEntriesShort: "No entries yet — open to add the first reflection.",

    // Thread page
    modeSituation: "Situation",
    modeMessage: "Conversation",
    placeholderSituation: "Describe what happened or add screenshots (any language)",
    placeholderMessage: "Paste the conversation or add screenshots (any language)",
    placeholderContinue: "Add what happened next, or drop in new screenshots...",
    uploadHint: "Paste screenshots (Ctrl+V), drag & drop, or upload images",
    uploadSubhint: "PNG, JPG — 4–6 screenshots work best, up to 10 max.",
    imageLimitReached: "Maximum 10 screenshots per entry.",
    imageLimitTrimmed: "Only added up to the 10-screenshot limit.",
    addMoreScreenshots: "Add more screenshots",
    addScreenshots: "Add screenshots",
    pasteDragClick: "Paste, drag, or click",
    analyze: "Reflect",
    analyzing: "Reflecting...",
    empty: "Please share a little more to reflect on.",
    error: "Something went off course. Please try again.",
    imageTooLarge: "Image is too large (max 8MB).",
    deleteThread: "Delete thread",
    confirmDelete: "Delete this entire thread? This cannot be undone.",
    yourEntry: "You",
    reflection: "Reflection",
    threadStart: "Thread started",
    edit: "Edit",
    save: "Save & regenerate",
    regenerate: "Regenerate",
    overallTrend: "overall trend",
    continuingThread: "continuing thread",
    firstEntry: "first entry",
    noEntriesYet: "No entries yet. Share the first situation or message above.",
    tapToUnfold: "Tap to unfold full reflection",
    tapToEnlarge: "Tap to enlarge",
    threadNotFound: "Thread not found.",
    goBack: "Go back",
    keepFewWords: "Please keep at least a few words or one screenshot.",
    reflectionUpdated: "Reflection updated.",
    regenerated: "Regenerated.",
    rename: "Rename",
    saveName: "Save name",
    removeImage: "Remove image",
    image: "image",
    images: "images",
    showMore: "Show more",
    showLess: "Show less",
    deleteEntry: "Delete entry",
    confirmDeleteEntry: "Delete this entry and its reflection? This cannot be undone.",
    entryDeleted: "Entry deleted.",
  },
  et: {
    // Index page
    appBadge: "Reaalsuskontroll",
    appHeadline1: "Pehmem viis",
    appHeadline2: "selguseks",
    appTagline: "Rahulik koht, kus märgata mustreid ja mõista dünaamikat.",
    people: "Inimesed",
    newPerson: "Uus inimene",
    noPeople: "Veel pole ühtegi teemat. Alusta sellest, et lisad kellegi, kelle üle mõelda.",
    newThreadTitle: "Kelle kohta see on?",
    newThreadHint: "Kasuta nime, hüüdnime või silti, seda näed ainult sina.",
    namePlaceholder: "nt Alex, M., uus kolleeg",
    cancel: "Tühista",
    start: "Alusta teemat",
    lastInteraction: "Viimane peegeldus",
    entries: "sissekannet",
    entry: "sissekanne",
    disclaimer: "See tööriist pakub mõtisklust, mitte absoluutset tõde.",
    signOut: "Logi välja",
    noEntriesShort: "Veel pole sissekandeid, ava, et lisada esimene peegeldus.",

    // Thread page
    modeSituation: "Olukord",
    modeMessage: "Vestlus",
    placeholderSituation: "Kirjelda, mis juhtus, või lisa ekraanipilte (mistahes keeles)",
    placeholderMessage: "Kleebi vestlus või lisa ekraanipilte (mistahes keeles)",
    placeholderContinue: "Lisa, mis edasi juhtus, või lisa uusi ekraanipilte...",
    uploadHint: "Kleebi ekraanipildid (Ctrl+V), lohista või lae üles",
    uploadSubhint: "PNG, JPG — 4–6 ekraanipilti annab parima tulemuse, max 10.",
    imageLimitReached: "Maksimaalselt 10 ekraanipilti ühe sissekande kohta.",
    imageLimitTrimmed: "Lisasin ainult kuni 10 ekraanipildi piirini.",
    addMoreScreenshots: "Lisa veel ekraanipilte",
    addScreenshots: "Lisa ekraanipilte",
    pasteDragClick: "Kleebi, lohista või vajuta",
    analyze: "Peegelda",
    analyzing: "Mõtlen...",
    empty: "Jaga veidi rohkem, et oleks mille üle mõtiskleda.",
    error: "Midagi läks valesti. Palun proovi uuesti.",
    imageTooLarge: "Pilt on liiga suur (max 8MB).",
    deleteThread: "Kustuta teema",
    confirmDelete: "Kustutada kogu see teema? Seda ei saa tagasi võtta.",
    yourEntry: "Sina",
    reflection: "Peegeldus",
    threadStart: "Teema alustatud",
    edit: "Muuda",
    save: "Salvesta ja loo uuesti",
    regenerate: "Loo uuesti",
    overallTrend: "üldine suund",
    continuingThread: "teema jätkub",
    firstEntry: "esimene sissekanne",
    noEntriesYet: "Veel pole sissekandeid. Jaga ülal esimest olukorda või sõnumit.",
    tapToUnfold: "Vajuta peegelduse avamiseks",
    tapToEnlarge: "Vajuta suurendamiseks",
    threadNotFound: "Teemat ei leitud.",
    goBack: "Mine tagasi",
    keepFewWords: "Palun jäta vähemalt mõni sõna või üks ekraanipilt.",
    reflectionUpdated: "Peegeldus uuendatud.",
    regenerated: "Uuendatud.",
    rename: "Nimeta ümber",
    saveName: "Salvesta nimi",
    removeImage: "Eemalda pilt",
    image: "pilt",
    images: "pilti",
    showMore: "Näita rohkem",
    showLess: "Näita vähem",
    deleteEntry: "Kustuta sissekanne",
    confirmDeleteEntry: "Kustutada see sissekanne ja peegeldus? Seda ei saa tagasi võtta.",
    entryDeleted: "Sissekanne kustutatud.",
  },
} as const;

export type UiStrings = { [K in keyof typeof UI_STRINGS["en"]]: string };

function normalize(code: string | null | undefined): UiLang {
  if (!code) return "en";
  const lower = code.toLowerCase();
  if (lower.startsWith("et") || lower.includes("estonian")) return "et";
  return "en";
}

const HISTORY_KEY = "ui_lang_history";
const MANUAL_KEY = "ui_lang_manual";
const HISTORY_MAX = 5;
// A single Estonian/English signal is enough — UI must follow the analysis
// language immediately so labels never lag behind content.
const SWITCH_THRESHOLD = 1;

/**
 * Static result-card labels.
 * Used by ResultCards instead of trusting AI-generated `ui_labels`,
 * so old entries and new entries always render with the correct locale,
 * and internal schema keys are never leaked to the UI.
 */
export const RESULT_LABELS = {
  en: {
    summary_title: "Summary",
    pattern_tag: "Pattern",
    dynamic: "Dynamic",
    hidden_signals: "Hidden signals",
    intentions: "Intentions",
    flag: "Flag",
    flag_reasoning: "Why this flag",
    signal_breakdown: "Signal breakdown",
    initiative: "Initiative",
    effort: "Effort",
    consistency: "Consistency",
    emotional_tone: "Emotional tone",
    meaning: "What it might mean",
    reflection: "Something to sit with",
    reality_check: "Reality check",
    if_nothing_changes: "Worth noticing",
    action: "Next step",
    pattern_over_time: "Pattern over time",
  },
  et: {
    summary_title: "Lühikokkuvõte",
    pattern_tag: "Mustri nimi",
    dynamic: "Dünaamika",
    hidden_signals: "Varjatud vihjed",
    intentions: "Kavatsused",
    flag: "Lipp",
    flag_reasoning: "Miks see lipp",
    signal_breakdown: "Signaalide jaotus",
    initiative: "Algatus",
    effort: "Panus",
    consistency: "Järjepidevus",
    emotional_tone: "Emotsionaalne toon",
    meaning: "Mida see võib tähendada",
    reflection: "Mõttekoht",
    reality_check: "Reaalsuskontroll",
    if_nothing_changes: "Oluline tähelepanek",
    action: "Järgmine samm",
    pattern_over_time: "Muster ajas",
  },
} as const;

export type ResultLabels = typeof RESULT_LABELS["en"];

function readHistory(): UiLang[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is UiLang => x === "en" || x === "et") : [];
  } catch {
    return [];
  }
}

function writeHistory(history: UiLang[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-HISTORY_MAX)));
  } catch {}
}

function emitChange() {
  window.dispatchEvent(new Event("ui-lang-change"));
}

/** Called after each AI analysis. Adapts UI language if user has not manually overridden,
 *  and only flips when recent signals are consistently the new language. */
export function setStoredLang(code: string) {
  const detected = normalize(code);
  try {
    const history = [...readHistory(), detected];
    writeHistory(history);

    // Respect manual override
    if (localStorage.getItem(MANUAL_KEY) === "1") return;

    const prev = localStorage.getItem(STORAGE_KEY) as UiLang | null;
    if (prev === detected) return;

    const recent = history.slice(-SWITCH_THRESHOLD);
    if (recent.length >= SWITCH_THRESHOLD && recent.every((l) => l === detected)) {
      localStorage.setItem(STORAGE_KEY, detected);
      emitChange();
    } else if (!prev) {
      // first ever: adopt immediately
      localStorage.setItem(STORAGE_KEY, detected);
      emitChange();
    }
  } catch {}
}

/** Manual user override (e.g. settings toggle). Locks the choice. */
export function setManualLang(code: UiLang) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
    localStorage.setItem(MANUAL_KEY, "1");
    emitChange();
  } catch {}
}

/** Clear manual lock, allow auto-detection again. */
export function clearManualLang() {
  try {
    localStorage.removeItem(MANUAL_KEY);
    emitChange();
  } catch {}
}

export function isManualLang(): boolean {
  try {
    return localStorage.getItem(MANUAL_KEY) === "1";
  } catch {
    return false;
  }
}

function readStored(): UiLang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return normalize(stored);
    const nav = typeof navigator !== "undefined" ? navigator.language : "en";
    return normalize(nav);
  } catch {
    return "en";
  }
}

export function useUiLang(): UiLang {
  const [lang, setLang] = useState<UiLang>("en");
  useEffect(() => {
    setLang(readStored());
    const onChange = () => setLang(readStored());
    window.addEventListener("ui-lang-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("ui-lang-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return lang;
}

export function useUi(): UiStrings {
  const lang = useUiLang();
  return UI_STRINGS[lang];
}

