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
    uploadSubhint: "PNG, JPG — add as many as you need. Screenshots are the main input.",
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
  },
  et: {
    // Index page
    appBadge: "Reaalsuskontroll",
    appHeadline1: "Pehmem viis",
    appHeadline2: "selguseks",
    appTagline: "Vaikne ruum mõtisklemiseks — mis toimub ja mida see võiks tähendada.",
    people: "Inimesed",
    newPerson: "Uus inimene",
    noPeople: "Veel pole ühtegi lõnga. Alusta sellest, et lisad kellegi, kelle üle mõelda.",
    newThreadTitle: "Kelle kohta see on?",
    newThreadHint: "Kasuta nime, hüüdnime või silti — seda näed ainult sina.",
    namePlaceholder: "nt Alex, M., uus kolleeg",
    cancel: "Tühista",
    start: "Alusta lõnga",
    lastInteraction: "Viimane peegeldus",
    entries: "sissekannet",
    entry: "sissekanne",
    disclaimer: "See tööriist pakub mõtisklust, mitte absoluutset tõde.",
    signOut: "Logi välja",
    noEntriesShort: "Veel pole sissekandeid — ava, et lisada esimene peegeldus.",

    // Thread page
    modeSituation: "Olukord",
    modeMessage: "Vestlus",
    placeholderSituation: "Kirjelda, mis juhtus, või lisa ekraanipilte (mistahes keeles)",
    placeholderMessage: "Kleebi vestlus või lisa ekraanipilte (mistahes keeles)",
    placeholderContinue: "Lisa, mis edasi juhtus, või lisa uusi ekraanipilte...",
    uploadHint: "Kleebi ekraanipildid (Ctrl+V), lohista või lae üles",
    uploadSubhint: "PNG, JPG — lisa nii palju kui vaja. Ekraanipildid on peamine sisend.",
    addMoreScreenshots: "Lisa veel ekraanipilte",
    addScreenshots: "Lisa ekraanipilte",
    pasteDragClick: "Kleebi, lohista või vajuta",
    analyze: "Peegelda",
    analyzing: "Mõtlen...",
    empty: "Jaga veidi rohkem, et oleks mille üle mõtiskleda.",
    error: "Midagi läks valesti. Palun proovi uuesti.",
    imageTooLarge: "Pilt on liiga suur (max 8MB).",
    deleteThread: "Kustuta lõng",
    confirmDelete: "Kustutada kogu see lõng? Seda ei saa tagasi võtta.",
    yourEntry: "Sina",
    reflection: "Peegeldus",
    threadStart: "Lõng alustatud",
    edit: "Muuda",
    save: "Salvesta ja uuenda",
    regenerate: "Uuenda",
    overallTrend: "üldine suund",
    continuingThread: "lõng jätkub",
    firstEntry: "esimene sissekanne",
    noEntriesYet: "Veel pole sissekandeid. Jaga ülal esimest olukorda või sõnumit.",
    tapToUnfold: "Vajuta täispeegelduse avamiseks",
    tapToEnlarge: "Vajuta suurendamiseks",
    threadNotFound: "Lõnga ei leitud.",
    goBack: "Mine tagasi",
    keepFewWords: "Palun jäta vähemalt mõni sõna või üks ekraanipilt.",
    reflectionUpdated: "Peegeldus uuendatud.",
    regenerated: "Uuendatud.",
    rename: "Nimeta ümber",
    saveName: "Salvesta nimi",
    removeImage: "Eemalda pilt",
    image: "pilt",
    images: "pilti",
  },
} as const;

export type UiStrings = typeof UI_STRINGS["en"];

function normalize(code: string | null | undefined): UiLang {
  if (!code) return "en";
  const lower = code.toLowerCase();
  if (lower.startsWith("et") || lower.includes("estonian")) return "et";
  return "en";
}

export function setStoredLang(code: string) {
  const lang = normalize(code);
  try {
    const prev = localStorage.getItem(STORAGE_KEY);
    if (prev !== lang) {
      localStorage.setItem(STORAGE_KEY, lang);
      window.dispatchEvent(new Event("ui-lang-change"));
    }
  } catch {}
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
