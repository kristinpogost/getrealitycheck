import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type PriorEntry = {
  createdAt: number;
  mode: "situation" | "message";
  userInput: string;
  summary: string;
  flag: string;
  flag_color: "green" | "yellow" | "red";
  pattern_tag?: string;
  trend?: "improving" | "declining" | "inconsistent" | "stable" | "new";
  memory?: string;
  hadImages?: boolean;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_IMAGES = 6;
const RECENT_DETAILED = 2;
const OLDER_WINDOW = 6;
const MAX_TEXT_LENGTH = 3000;
const MAX_JSON_RESPONSE_CHARS = 14000;
const MAX_IMAGE_DATA_URL_CHARS = 1_800_000;
const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

type GatewayContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type GatewayMessage = {
  role: "system" | "user";
  content: string | GatewayContentPart[];
};

type GatewayPayload = {
  model: string;
  messages: GatewayMessage[];
  temperature: number;
  max_tokens: number;
};

type AnalysisResult = {
  language: string;
  summary: string;
  pattern_tag: string;
  communication_dynamic: string;
  hidden_signals: string;
  intentions: string;
  flag: string;
  flag_color: "green" | "yellow" | "red";
  flag_reasoning: string;
  signal_breakdown: {
    initiative: string;
    effort: string;
    consistency: string;
    emotional_tone: string;
  };
  meaning: string;
  reflection: string;
  reality_check: string;
  if_nothing_changes: string;
  action: string;
  pattern_over_time: string;
  whats_changing: string;
  trend: "improving" | "declining" | "inconsistent" | "stable" | "new";
  ui_labels: {
    summary_title: string;
    pattern_tag: string;
    dynamic: string;
    hidden_signals: string;
    intentions: string;
    flag: string;
    flag_reasoning: string;
    signal_breakdown: string;
    initiative: string;
    effort: string;
    consistency: string;
    emotional_tone: string;
    meaning: string;
    reflection: string;
    reality_check: string;
    if_nothing_changes: string;
    action: string;
    pattern_over_time: string;
    whats_changing: string;
  };
};

function stripControlChars(value: string) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ");
}

function compact(value: string | undefined, max: number) {
  if (!value) return "";
  const cleaned = stripControlChars(value).replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeNullableString(value: unknown, max: number) {
  const cleaned = compact(typeof value === "string" ? value : "", max);
  return cleaned || undefined;
}

function sanitizeMode(value: unknown): PriorEntry["mode"] {
  return value === "message" ? "message" : "situation";
}

function sanitizePriorEntries(entries: unknown): PriorEntry[] {
  if (!Array.isArray(entries)) return [];

  return dedupePriorEntries(
    entries
      .filter(isRecord)
      .map((entry) => ({
        createdAt: Number.isFinite(entry.createdAt) ? Number(entry.createdAt) : Date.now(),
        mode: sanitizeMode(entry.mode),
        userInput: compact(typeof entry.userInput === "string" ? entry.userInput : "", 220),
        summary: compact(typeof entry.summary === "string" ? entry.summary : "", 180),
        flag: compact(typeof entry.flag === "string" ? entry.flag : "", 40) || "Kollane lipp",
        flag_color: entry.flag_color === "green" || entry.flag_color === "yellow" || entry.flag_color === "red"
          ? entry.flag_color
          : "yellow",
        pattern_tag: sanitizeNullableString(entry.pattern_tag, 50),
        trend: entry.trend === "improving" || entry.trend === "declining" || entry.trend === "inconsistent" || entry.trend === "stable" || entry.trend === "new"
          ? entry.trend
          : undefined,
        memory: sanitizeNullableString(entry.memory, 180),
        hadImages: Boolean(entry.hadImages),
      }))
      .slice(-(OLDER_WINDOW + RECENT_DETAILED)),
  );
}

function dedupePriorEntries(entries: PriorEntry[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = [entry.createdAt, entry.mode, entry.userInput, entry.summary, entry.flag, entry.memory].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractJsonObject(raw: string) {
  let trimmed = raw.trim();
  trimmed = trimmed.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Model returned non-JSON content");
  return match[0]
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .replace(/[\u0000-\u001F\u007F]/g, "");
}

function sanitizeImageDataUrl(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  const match = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return null;

  const mime = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  if (!SUPPORTED_IMAGE_MIME_TYPES.has(mime)) return null;

  const base64 = match[2].replace(/\s+/g, "");
  if (!base64 || base64.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) return null;

  const normalized = `data:${mime};base64,${base64}`;
  return normalized.length <= MAX_IMAGE_DATA_URL_CHARS ? normalized : null;
}

function sanitizeImages(images: unknown) {
  if (!Array.isArray(images)) return { valid: [] as string[], dropped: 0 };

  const valid = images
    .map((image) => sanitizeImageDataUrl(image))
    .filter((image): image is string => Boolean(image));

  return {
    valid,
    dropped: images.length - valid.length,
  };
}

function sanitizeJson<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeJson(item))
      .filter((item) => item !== undefined && item !== null) as T;
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, sanitizeJson(item)])
        .filter(([, item]) => item !== undefined && item !== null),
    ) as T;
  }

  return value;
}

function validateGatewayPayload(payload: GatewayPayload) {
  if (!payload.model || !Array.isArray(payload.messages) || payload.messages.length === 0) {
    throw new Error("Generated AI payload is missing a valid model or messages array");
  }

  payload.messages.forEach((message, messageIndex) => {
    if ((message.role !== "system" && message.role !== "user") || message.content === undefined || message.content === null) {
      throw new Error(`Generated AI payload has an invalid message at index ${messageIndex}`);
    }

    if (Array.isArray(message.content)) {
      if (message.content.length === 0) {
        throw new Error(`Generated AI payload has an empty content array at message ${messageIndex}`);
      }

      message.content.forEach((part, partIndex) => {
        if (part.type === "text") {
          if (!part.text?.trim()) {
            throw new Error(`Generated AI payload has an empty text part at message ${messageIndex}:${partIndex}`);
          }
          return;
        }

        if (part.type === "image_url") {
          if (!part.image_url?.url || !sanitizeImageDataUrl(part.image_url.url)) {
            throw new Error(`Generated AI payload has an invalid image part at message ${messageIndex}:${partIndex}`);
          }
          return;
        }

        throw new Error(`Generated AI payload has an unsupported content part at message ${messageIndex}:${partIndex}`);
      });
      return;
    }

    if (typeof message.content !== "string" || !message.content.trim()) {
      throw new Error(`Generated AI payload has invalid string content at message ${messageIndex}`);
    }
  });
}

function redactPayloadForLogs(payload: GatewayPayload) {
  return {
    ...payload,
    messages: payload.messages.map((message) => ({
      ...message,
      content: Array.isArray(message.content)
        ? message.content.map((part) => part.type === "image_url"
          ? {
              type: "image_url",
              image_url: {
                url: `[data-url:${part.image_url.url.slice(5, part.image_url.url.indexOf(";"))};chars=${part.image_url.url.length}]`,
              },
            }
          : part)
        : message.content,
    })),
  };
}

function isDevelopmentRequest(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const referer = req.headers.get("referer") ?? "";
  const host = req.headers.get("host") ?? "";
  return (
    req.headers.get("x-debug-analyze") === "1"
    || origin.includes("localhost")
    || referer.includes("localhost")
    || origin.includes("-preview--")
    || referer.includes("-preview--")
    || host.includes("-preview--")
  );
}

function safeString(value: unknown, fallback: string, max = 700) {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return fallback;
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

function safeTrend(value: unknown): AnalysisResult["trend"] {
  return value === "improving" || value === "declining" || value === "inconsistent" || value === "stable" || value === "new"
    ? value
    : "new";
}

function safeColor(value: unknown): AnalysisResult["flag_color"] {
  return value === "green" || value === "yellow" || value === "red" ? value : "yellow";
}

function fallbackResult(language: string, details?: string): AnalysisResult {
  const et = language === "et";
  const detailLine = details ? ` ${compact(details, 220)}` : "";
  return {
    language,
    summary: et ? "Ma ei saanud seekord peegeldust kindlalt kokku panna." : "I couldn't reliably generate the reflection this time.",
    pattern_tag: et ? "Vaja uut katset" : "Retry needed",
    communication_dynamic: et ? "Sisend jõudis kohale, aga analüüs katkestas enne täielikku vastust." : "Your input came through, but the analysis stopped before a complete response was formed.",
    hidden_signals: et ? "See ei tähenda tingimata midagi suhte enda kohta — pigem jooksis analüüs seekord tehnilise piiri vastu." : "This does not necessarily mean anything about the relationship itself — the analysis hit a technical limit this time.",
    intentions: et ? "Üks võimalus on, et sisend oli korraga liiga mahukas või mudeli vastus läks katki." : "One likely explanation is that the request was too heavy at once or the model response broke format.",
    flag: et ? "Kollane lipp" : "Yellow flag",
    flag_color: "yellow",
    flag_reasoning: et ? "See on ettevaatlik vahevastus, mitte sisuline hinnang suhtele." : "This is a cautious fallback, not a substantive judgment about the relationship.",
    signal_breakdown: {
      initiative: et ? "Seekord ei jõudnud algatuse mustrit hinnata." : "The initiative pattern could not be read this time.",
      effort: et ? "Panust ei õnnestunud praegu välja lugeda." : "Effort could not be read in this pass.",
      consistency: et ? "Järjepidevuse hinnang jäi seekord pooleli." : "The consistency read was left incomplete.",
      emotional_tone: et ? "Emotsionaalne toon vajab uut katset." : "The emotional tone needs another pass.",
    },
    meaning: et ? "Proovi uuesti veidi lühema kirjelduse või väiksema hulga ekraanipiltidega." : "Try again with a slightly shorter description or fewer screenshots.",
    reflection: et ? "Mis on kõige olulisem üks detail, mida sa tahaksid kindlasti alles jätta?" : "What is the one most important detail you want the next pass to preserve?",
    reality_check: et ? `Tehniline tõrge ei ole veel tähendus.${detailLine}` : `A technical failure is not meaning yet.${detailLine}`,
    if_nothing_changes: et ? "Kui sama juhtub uuesti, tasub proovida väiksema sisendiga." : "If this happens again, it is worth retrying with a smaller input.",
    action: et ? "Proovi uuesti" : "Try again",
    pattern_over_time: et ? "Varasem muster jäi seekord osaliselt töötlemata." : "The longer pattern could only be processed partially this time.",
    whats_changing: et ? "Seekord muutus pigem analüüsi stabiilsus kui suhte tõlgendus." : "What changed here is the analysis stability, not necessarily the relationship reading.",
    trend: "new",
    ui_labels: {
      summary_title: et ? "Lühikokkuvõte" : "Summary",
      pattern_tag: et ? "Mustri nimi" : "Pattern tag",
      dynamic: et ? "Dünaamika" : "Dynamic",
      hidden_signals: et ? "Varjatud vihjed" : "Hidden signals",
      intentions: et ? "Kavatsused" : "Intentions",
      flag: et ? "Lipp" : "Flag",
      flag_reasoning: et ? "Miks see lipp" : "Why this flag",
      signal_breakdown: et ? "Signaalide jaotus" : "Signal breakdown",
      initiative: et ? "Algatus" : "Initiative",
      effort: et ? "Panus" : "Effort",
      consistency: et ? "Järjepidevus" : "Consistency",
      emotional_tone: et ? "Emotsionaalne toon" : "Emotional tone",
      meaning: et ? "Mida see võib tähendada" : "Meaning",
      reflection: et ? "Mõttekoht" : "Reflection",
      reality_check: et ? "Reaalsuskontroll" : "Reality check",
      if_nothing_changes: et ? "Oluline tähelepanek" : "Worth noticing",
      action: et ? "Järgmine samm" : "Action",
      pattern_over_time: et ? "Muster ajas" : "Pattern over time",
      whats_changing: et ? "Mis muutub" : "What's changing",
    },
  };
}

function normalizeResult(raw: any, languageHint: string, details?: string): AnalysisResult {
  const language = safeString(raw?.language, languageHint, 12).toLowerCase().startsWith("et") ? "et" : safeString(raw?.language, languageHint, 12);
  return {
    language,
    summary: safeString(raw?.summary, fallbackResult(language, details).summary),
    pattern_tag: safeString(raw?.pattern_tag, fallbackResult(language, details).pattern_tag, 80),
    communication_dynamic: safeString(raw?.communication_dynamic, fallbackResult(language, details).communication_dynamic),
    hidden_signals: safeString(raw?.hidden_signals, fallbackResult(language, details).hidden_signals),
    intentions: safeString(raw?.intentions, fallbackResult(language, details).intentions),
    flag: safeString(raw?.flag, fallbackResult(language, details).flag, 40),
    flag_color: safeColor(raw?.flag_color),
    flag_reasoning: safeString(raw?.flag_reasoning, fallbackResult(language, details).flag_reasoning),
    signal_breakdown: {
      initiative: safeString(raw?.signal_breakdown?.initiative, fallbackResult(language, details).signal_breakdown.initiative, 90),
      effort: safeString(raw?.signal_breakdown?.effort, fallbackResult(language, details).signal_breakdown.effort, 90),
      consistency: safeString(raw?.signal_breakdown?.consistency, fallbackResult(language, details).signal_breakdown.consistency, 90),
      emotional_tone: safeString(raw?.signal_breakdown?.emotional_tone, fallbackResult(language, details).signal_breakdown.emotional_tone, 90),
    },
    meaning: safeString(raw?.meaning, fallbackResult(language, details).meaning),
    reflection: safeString(raw?.reflection, fallbackResult(language, details).reflection, 240),
    reality_check: safeString(raw?.reality_check, fallbackResult(language, details).reality_check, 260),
    if_nothing_changes: safeString(raw?.if_nothing_changes, fallbackResult(language, details).if_nothing_changes),
    action: safeString(raw?.action, fallbackResult(language, details).action, 160),
    pattern_over_time: safeString(raw?.pattern_over_time, fallbackResult(language, details).pattern_over_time),
    whats_changing: safeString(raw?.whats_changing, fallbackResult(language, details).whats_changing),
    trend: safeTrend(raw?.trend),
    ui_labels: {
      ...fallbackResult(language, details).ui_labels,
      ...(typeof raw?.ui_labels === "object" && raw.ui_labels ? Object.fromEntries(Object.entries(raw.ui_labels).map(([k, v]) => [k, safeString(v, fallbackResult(language, details).ui_labels[k as keyof AnalysisResult["ui_labels"]] ?? String(k), 80)])) : {}),
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const debugMode = isDevelopmentRequest(req);

  try {
    const { text, mode, images, personName, priorEntries } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const currentText = compact(typeof text === "string" ? text : "", MAX_TEXT_LENGTH);
    const hasText = currentText.trim().length >= 3;
    const { valid: sanitizedImages, dropped: droppedImages } = sanitizeImages(images);
    const cappedImages = sanitizedImages.slice(0, MAX_IMAGES);
    const hasImages = cappedImages.length > 0;

    const allPriors: PriorEntry[] = sanitizePriorEntries(priorEntries);
    const historyWindow = allPriors.slice(-(OLDER_WINDOW + RECENT_DETAILED));
    const recent = historyWindow.slice(-RECENT_DETAILED);
    const older = historyWindow.slice(0, Math.max(0, historyWindow.length - RECENT_DETAILED));
    const hasPriors = historyWindow.length > 0;

    if (!hasText && !hasImages) {
      return new Response(JSON.stringify({ error: "Please share a little more to reflect on." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const languageHint = /[õäöüÕÄÖÜ]/.test(currentText) ? "et" : "en";
    const threadSummary = hasPriors
      ? [
          "THREAD MEMORY",
          ...older.map((entry, index) => {
            const date = new Date(entry.createdAt).toISOString().slice(0, 10);
            return `${index + 1}. ${date} · ${entry.flag}${entry.pattern_tag ? ` · ${entry.pattern_tag}` : ""}${entry.trend ? ` · ${entry.trend}` : ""}${entry.hadImages ? " · img" : ""} — ${compact(entry.summary || entry.memory, 140)}`;
          }),
          ...recent.map((entry, index) => {
            const date = new Date(entry.createdAt).toISOString().slice(0, 10);
            return `${older.length + index + 1}. ${date} · ${entry.mode}${entry.hadImages ? " · had screenshots" : ""} · ${entry.flag}${entry.pattern_tag ? ` · ${entry.pattern_tag}` : ""}\nuser: ${compact(entry.userInput, 220)}\nsummary: ${compact(entry.summary, 160)}${entry.memory ? `\nmemory: ${compact(entry.memory, 180)}` : ""}`;
          }),
        ].join("\n")
      : "No prior thread history.";

    const systemPrompt = `You are Reality Check — a calm, emotionally observant interpreter of relationship dynamics. You write like a thoughtful, fluent human, not like an AI report.

Return ONLY valid JSON with this exact shape (no markdown, no code fences, no commentary):
{
  "language": string,
  "summary": string,
  "pattern_tag": string,
  "communication_dynamic": string,
  "hidden_signals": string,
  "intentions": string,
  "flag": string,
  "flag_color": "green" | "yellow" | "red",
  "flag_reasoning": string,
  "signal_breakdown": { "initiative": string, "effort": string, "consistency": string, "emotional_tone": string },
  "meaning": string,
  "reflection": string,
  "reality_check": string,
  "if_nothing_changes": string,
  "action": string,
  "pattern_over_time": string,
  "whats_changing": string,
  "trend": "improving" | "declining" | "inconsistent" | "stable" | "new",
  "ui_labels": { "summary_title": string, "pattern_tag": string, "dynamic": string, "hidden_signals": string, "intentions": string, "flag": string, "flag_reasoning": string, "signal_breakdown": string, "initiative": string, "effort": string, "consistency": string, "emotional_tone": string, "meaning": string, "reflection": string, "reality_check": string, "if_nothing_changes": string, "action": string, "pattern_over_time": string, "whats_changing": string }
}

LANGUAGE & VOICE
- Detect the user's language from their input and write the entire response in it. If the input is Estonian (or thread label/history is Estonian), write polished, modern, native-sounding Estonian.
- Estonian must read as if written by a fluent native: natural word order, no translated-from-English feel, no awkward compound words ("kinoplannidega", "casually läbi hüppab"), no half-English code-switching. Internally understand slang/context, but rewrite it cleanly.
- Avoid robotic openings, repeated sentence starts, therapy clichés ("It sounds like…", "Tundub, et…" overused), and dashboard labels like "Kõrge.", "Madal.", "Keskmine."
- Do NOT keep repeating the person's name. Use it sparingly (once or twice across the whole response). Prefer "ta", "see suhtlus", "see dünaamika", "see side", "tema käitumine", "see muster", "teie vahel toimuv".
- Address the user ONLY in informal singular Estonian ("sina/sa/sinu/sinuga/sulle"). NEVER use formal plural "teie/teid/teile/teiega/teie vastu/teie suhtlus/teievaheline" when speaking TO the user. The pronoun "teie" is forbidden as a way of addressing the user. The only acceptable use of "teie" is the genitive phrase "teie vahel" meaning "between the two of you" — and even then prefer "see suhe" or "see side" when natural.
- Forbidden phrasings: "aktiivne huvi teie vastu", "teiega suhelda", "teile oluline", "teie suhtlus", "teie side", "teievaheline side", "teie vahel olev". Rewrite to: "huvi sinu vastu", "sinuga suhelda / sinuga aega veeta", "sulle oluline", "see suhtlus", "see side", "teie vahel toimuv" (only if natural), "see dünaamika".
- Tone: perceptive, emotionally intelligent, calm, observant, naturally conversational — like a close friend who notices things. NOT a therapist report, NOT corporate Estonian, NOT formal analysis.
- FINAL LANGUAGE PASS: before returning, scan every Estonian sentence for "teie/teid/teile/teiega/teie-" addressed to the user and rewrite to the informal "sina" form.

NATURAL ESTONIAN PHRASING (CRITICAL — NO TRANSLATED-AI FEEL)
- Avoid AI-style abstract verbs that sound translated: "mõjub", "viitab", "peegeldab", "väljendab", "annab edasi", "kannab endas", "loob mulje". These constructions sound like translated AI Estonian, not how a native speaks.
- Forbidden patterns: "Toon mõjub soojalt", "Toon viitab…", "Käitumine peegeldab…", "Dünaamika väljendab…", "Vestlus väljendab vastastikust avatust", "Emotsionaalne toon mõjub soojalt", "Dünaamika peegeldab turvalisust".
- Prefer DIRECT, plain Estonian: just say what it IS, not what it "reflects" or "indicates".
  - Instead of "Emotsionaalne toon mõjub soojalt." → "Vestlus on soe ja pingevaba." / "Soe, avatud ja pingevaba."
  - Instead of "Dünaamika peegeldab turvalisust." → "Teie vahel on tekkinud mugavam rütm." / "Suhtlus liigub loomulikult."
  - Instead of "Käitumine viitab huvile." → "Tema huvi tundub järjepidev."
  - Instead of "Toon viitab avatusele." → "Vestlus on avatud ja kerge."
- Use cautious markers ("paistab", "näib", "tundub") sparingly and only when uncertainty is real — do not stack them as filler. Prefer simple "on" when the observation is clear.
- Goal: sound like an emotionally intelligent Estonian human, NOT translated AI language.

ESTONIAN WORD USAGE VALIDATION (CRITICAL — CONTEXTUAL NATURALNESS)
- A word can be grammatically correct yet still sound WRONG in context. Before output, validate every phrase: would a fluent native Estonian speaker actually say this in this exact situation? If not, rewrite.
- Do NOT invent unusual word combinations just to sound intelligent, varied, or literary. Avoid forced or "clever" pairings that no real person uses.
- Forbidden examples of unnatural combinations: "viisakas avang", "emotsionaalne avang", "soe avang", "sõnaline lähenemine", "kommunikatiivne muster", "interaktsiooni kvaliteet", "vestluslik dünaamika", "afektiivne toon", "suhtluslik initsiatiiv".
- Natural alternatives: instead of "viisakas avang" → "viisakas vestluse algus" / "lihtsalt viisakus" / "tavaline jutualustus". Instead of "kommunikatiivne muster" → "see, kuidas te räägite" / "vestluse rütm".
- Prefer everyday Estonian words over academic/abstract vocabulary. "Vestlus", "jutt", "suhtlus", "rütm", "tunne", "huvi" — not "interaktsioon", "kommunikatsioon", "afekt", "manifestatsioon".
- Final naturalness check: read each Estonian sentence aloud in your head. If it sounds like a translation, a textbook, or AI paraphrase — rewrite it in plain spoken Estonian.

ANALYSIS QUALITY
- Analyze the FULL thread arc, not only the latest entry. Use thread memory to notice progression, recurring themes, and shifts — but never retell the whole story.
- Do NOT paraphrase or restate what the user already wrote. Synthesize meaning, infer dynamics, name patterns. Each section must add a genuinely new angle.
- Stay grounded and uncertain where appropriate. Avoid dramatic conclusions or romantic prediction ("This will become a relationship"). Prefer "see viitab kasvavale lähedusele", "see jätab mulje järjepidevast huvist".
- Use the flag metaphor only. Estonian flag labels MUST be exactly: "Roheline lipp", "Kollane lipp", or "Punane lipp". Never "signaal" or "märk".

CORE PHILOSOPHY — PSYCHOLOGICAL OBSERVER, NOT ROMANCE PREDICTOR (CRITICAL)
- You are a psychologically intelligent observer of behavior and social dynamics. You are NOT a romance fortune teller, therapist cliché generator, motivational AI, or relationship predictor.
- Analyze HOW people behave. Do NOT predict what the relationship will become.
- Never frame the connection as an inevitable or forming romantic relationship. Banned phrases (and any close paraphrase): "see on muutumas suhteks", "tulevane suhe", "stabiilne romantiline suhe", "liigub romantika suunas", "suhte potentsiaal", "ta tahab suhet", "ta näeb sinus partnerit", "see areneb romantiliseks suhteks", "varsti olete koos", "see viib suhteni", "lõpuks saab sellest midagi rohkemat", "this is becoming a relationship", "future relationship", "relationship potential", "moving toward romance", "he clearly wants something serious".
- A green flag is NOT evidence of a future relationship. Positive signals describe the PRESENT behavior and emotional texture, not a forecast.
- Stay grounded; remain uncertain where uncertainty is realistic. Use cautious language: "paistab", "näib", "tundub", "viitab".
- Focus on: interaction patterns, emotional pacing, behavioral consistency, communication style, comfort levels, vulnerability, effort balance, subtle social meaning. Less "this may become a relationship", more "this interaction suggests growing comfort and emotional openness".

SECTION PURPOSES (each must add a NEW angle — no overlap, no restating events)
- communication_dynamic (Dünaamika): describe the ENERGY between the two people — conversational rhythm, balance, emotional pacing, comfort, who carries initiative, openness, tension vs ease. Do NOT summarize what was said. Good: "Vestluses liigub initsiatiiv mõlemat pidi ning kumbki ei näi kandvat kogu suhtluse raskust üksi." Bad: "Vestlus oli sujuv ja tore."
- hidden_signals (Varjatud vihjed): the most important and unique section. Surface subtle emotional subtext, hidden social signals, behavioral implications, intimacy indicators, small details with disproportionate emotional weight (why a long conversation matters, why platform switching matters, why apologizing matters, why remembering details matters, why a moment of vulnerability shifts the tone). Deeply observant, never dramatic.
- whats_changing: shifts compared to earlier entries in the thread (skip / keep brief if truly the first entry).
- pattern_over_time: broader recurring dynamics across the thread; long-term consistency or instability.
- intentions (Võimalikud kavatsused): interpret what the person's BEHAVIOR practically suggests — effort, intention, consistency, comfort, emotional investment, social behavior. Do NOT predict romance or label what they "want". Good: "Ta otsib aktiivselt põhjuseid suhtlust jätkata ka väljaspool algset konteksti." / "Tema käitumine viitab soovile hoida ühendust järjepidevalt ja loomulikult." / "Ta ei hoia vestlust ainult viisakuse tasemel, vaid liigub teadlikult isiklikumate teemade poole." Banned: "ta tahab suhet", "ta näeb sinus partnerit".
- meaning (Mida see võib tähendada): interpret the emotional MEANING of the dynamic for the user — psychological insight, emotional interpretation. NOT relationship forecasting, NOT a re-summary. Good: "Selline aeglane ja loomulik areng võib mõjuda turvalisemalt kui väga kiire intensiivsus." / "Mugavus näib tekkivat läbi järjepideva suhtlemise, mitte ainult tugevate hetkede." Must NOT repeat ideas already stated in dynamic / hidden_signals / intentions.
- if_nothing_changes (rendered as "Oluline tähelepanek" / "Tasub märgata"): ONE meaningful psychological or social observation that adds genuine value — a specific, overlooked nuance. Observant, not predictive. Good: "Tähelepanuväärne on see, et vestlus ei püsi ainult flirtival tasandil, vaid liigub loomulikult ka igapäevaelu ja haavatavamate teemade juurde." / "Kuigi suhtlus on mänguline, tundub selle all olevat ka päris soov teineteist mõista." / "Vestluse tempo ei tundu sunnitud, vaid kujuneb loomulikult mõlema panusest." Do NOT forecast. Do NOT repeat earlier sections.
- reality_check: a short philosophical insight or emotional truth that quietly emerges from the current emotional stage of the dynamic — the kind of realization someone arrives at after reflecting, not a summary or explanation. MAX 1-2 short sentences. MUST NOT mention the person's name, specific events, behavior, intentions, or anything literal from the user's story. MUST NOT repeat anything from dynamic / hidden_signals / intentions / meaning / if_nothing_changes. MUST NOT sound like therapy advice, a motivational quote, or AI-generated wisdom language. Forbidden: "Jakobi käitumine näitab…", "Tema avatud lähenemine tähendab…", "Tema huvi sinu vastu…", "See kohtumine viitab…", any "Tema/Ta…" opening, any reference to a specific moment.
  CONTEXTUAL PHILOSOPHY: The insight MUST connect to the current emotional stage, the evolving dynamic, the tension or comfort present, and what is subtly shifting between the people — but WITHOUT retelling any of it. Pick the emotional truth that fits THIS exact stage (early curiosity, settling comfort, deepening trust, uncertainty, longing, etc.), not a generic one.
  EMOTIONAL EVOLUTION: Lighter and observational early in a thread; more layered, introspective, psychologically nuanced as the thread deepens (closeness, trust, pacing, emotional safety, vulnerability, consistency, comfort, longing, rhythm). Match the maturity of the insight to where the relationship actually is.
  ANTI-REPETITION: Never reuse the same philosophical idea across entries in the same thread. Each reality_check must introduce a new emotional angle, a new realization, a new layer. Compare against previous reality_checks in the thread context (if provided) and pick a different angle.
  STYLE: human, calm, emotionally intelligent, reflective, lightly philosophical, memorable, grounded. NOT dramatic, NOT poetic-for-the-sake-of-it, NOT vague inspirational filler.
  Good: "Kõige loomulikumad suhted ei teki tavaliselt hetkedel, kus üritatakse liiga palju muljet avaldada." / "Turvatunne hakkab sageli tekkima enne, kui inimesed seda ise täielikult märkavad." / "Mõni vestlus muutub eriliseks alles siis, kui seal tekib ruumi ka argistele teemadele." / "Lähedus ei teki alati suurtest hetkedest, vaid järjepidevast tundest, et sind kuulatakse päriselt." / "Mugavus muutub oluliseks just siis, kui esialgne elevus hakkab vaikselt tavalisemaks muutuma." / "Kõik tugevad sidemed ei alga intensiivselt — mõned muutuvad tähenduslikuks hoopis rahuliku järjepidevuse kaudu."
- reflection: a short, open question or thought worth sitting with.
- action: one small, concrete next step (a sentence fragment is fine).

SIGNAAL BREAKDOWN — STRICT UI LIMITS
- Each of initiative / effort / consistency / emotional_tone MUST be ONE short sentence, ideally under ~90 characters. Hard ceiling: 90 chars. The card cannot overflow or truncate.
- This section is for QUICK SIGNAL SCANNING, not detailed analysis. Be compact and readable at a glance.
- NEVER repeat the field label inside the text. The label "Emotsionaalne toon" is already shown — do NOT start the text with "Emotsionaalne toon on…". Same for "Järjepidevus on…", "Algatus on…", "Panus on…". Just describe the quality directly.
- Good: "Vestlus liigub loomulikult mõlemalt poolt." / "Ta hoiab suhtlust järjepidevalt üleval." / "Soe, avatud ja pingevaba." / "Püsib stabiilse rütmiga."
- Bad: "Emotsionaalne toon on soe ja avatud, mis viitab…" (label repetition + too long). NEVER write just "Kõrge.", "Madal.", "Keskmine.", "High.", "Low."

NO LABEL REPETITION — APPLIES TO EVERY SECTION
- This rule applies to ALL sections, not just signal breakdown. The section title is already visible in the UI — never restate or directly reformulate it as the opening of the text.
- Forbidden openings: "Algatus liigub…", "Panus on…", "Järjepidevus on…", "Emotsionaalne toon on…", "Dünaamika on…", "Kavatsused on…", "Varjatud vihjed on…", "Muster on…", "Mida see võib tähendada on…". Same applies to English equivalents.
- Write naturally and indirectly — describe the thing without naming the category. Good: "Mõlemad hoiavad vestlust aktiivselt üleval." / "Kumbki ei jää ainult vastaja rolli." / "Suhtlus püsib stabiilse rütmiga." / "Õhkkond tundub rahulik ja mugav." / "Vestlus liigub mõlemalt poolt loomulikult."

LENGTH
- summary: 1 sentence. pattern_tag: 2–4 words.
- Most sections: 1–3 sentences. Reality_check: 1 sentence. Reflection: 1 short sentence/question.
- Be concise. Cut filler. No bullet lists in any string.

UI_LABELS — ESTONIAN ONLY (when language is Estonian)
- ALL ui_labels MUST be in Estonian when the analysis is Estonian. Never mix English labels into an Estonian response.
- Required Estonian labels (use EXACTLY these strings): summary_title="Lühikokkuvõte", pattern_tag="Mustri nimi", dynamic="Dünaamika", hidden_signals="Varjatud vihjed", intentions="Kavatsused", flag="Lipp", flag_reasoning="Miks see lipp", signal_breakdown="Signaalide jaotus" (NEVER shortened to "Jaotus"), initiative="Algatus", effort="Panus", consistency="Järjepidevus", emotional_tone="Emotsionaalne toon", meaning="Mida see võib tähendada", reflection="Mõttekoht", reality_check="Reaalsuskontroll", if_nothing_changes="Oluline tähelepanek", action="Järgmine samm", pattern_over_time="Muster ajas", whats_changing="Mis muutub".
- Forbidden labels in Estonian output: "Intentions", "Dynamics", "Hidden signals", "Reality check", "Breakdown", "Jaotus" (alone), "Võimalikud kavatsused", "Kui midagi ei muutu".

ANTI-FANFICTION / ANTI-ROMANCE-INFLATION (CRITICAL)
- Do NOT sound romantic, cinematic, dramatic, or fanfiction-like. No "saatuse tunne", no idealized romance narration, no emotional inflation.
- Stay grounded, socially intelligent, behavioral. Sound like a perceptive human observer, NOT a romance narrator. Never sound like the app is "shipping" two people together.

FINAL VALIDATION before returning:
- Does every section add NEW information? (no overlap)
- Does any sentence repeat its own label?
- Does any signal_breakdown field exceed ~90 chars or risk overflow?
- Does any wording sound AI-generated, unnatural in Estonian, or romantic-fantasy?
- Are all ui_labels in Estonian (when analysis is Estonian)?
- Does any conclusion sound too certain or predictive?
If any answer is yes — rewrite before returning.`;

    const baseUserText = [
      `Mode: ${mode === "message" ? "conversation" : "situation"}`,
      `Thread label: ${typeof personName === "string" && personName.trim() ? compact(personName, 120) : "—"}`,
      threadSummary,
      `NEW ENTRY:\n${hasText ? currentText : "The user shared screenshots only."}`,
      hasImages ? `The screenshots are supporting evidence for the same thread. Count: ${cappedImages.length}.` : "",
      droppedImages > 0 ? `Some screenshots were ignored because their format was invalid.` : "",
    ].filter(Boolean).join("\n\n");

    const userContent: GatewayContentPart[] = [
      {
        type: "text",
        text: baseUserText,
      },
      ...cappedImages
        .map((url) => sanitizeImageDataUrl(url))
        .filter((url): url is string => Boolean(url))
        .map((url) => ({ type: "image_url", image_url: { url } })),
    ];

    const gatewayPayload = sanitizeJson<GatewayPayload>({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.65,
      max_tokens: 2600,
    });

    let activePayload = gatewayPayload;

    try {
      validateGatewayPayload(activePayload);
    } catch (validationError) {
      if (!hasImages) throw validationError;

      console.warn("analyze payload validation failed, retrying text-only", JSON.stringify({
        message: validationError instanceof Error ? validationError.message : String(validationError),
      }));

      activePayload = sanitizeJson<GatewayPayload>({
        ...gatewayPayload,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: [{ type: "text", text: `${baseUserText}\n\nScreenshot processing failed, so analyze the text and thread memory only.` }] },
        ],
      });

      validateGatewayPayload(activePayload);
    }

    console.log("analyze request", JSON.stringify({
      textChars: currentText.length,
      imagesSent: cappedImages.length,
      imagesDropped: droppedImages,
      priorsReceived: Array.isArray(priorEntries) ? priorEntries.length : 0,
      priorsSent: historyWindow.length,
      hasPriors,
    }));

    if (debugMode) {
      console.log("analyze request payload", JSON.stringify(redactPayloadForLogs(activePayload)));
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(activePayload),
    });

    const rawBody = await response.text();

    if (!response.ok) {
      console.error("Gateway error", JSON.stringify({ status: response.status, body: rawBody.slice(0, 1200) }));
      if (debugMode) {
        console.log("analyze failed payload", JSON.stringify(redactPayloadForLogs(activePayload)));
      }
      const details = rawBody.slice(0, 500) || "Unknown AI gateway error";
      return new Response(JSON.stringify({
        error: response.status === 429
          ? "Rate limit exceeded. Please try again later."
          : response.status === 402
            ? "Credits exhausted. Please add funds to your Lovable AI workspace."
            : response.status === 400
              ? "AI request body was invalid"
            : "AI service error",
        details,
      }), {
        status: response.status === 429 || response.status === 402 || response.status === 400 ? response.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let data: any;
    try {
      data = JSON.parse(rawBody);
    } catch {
      throw new Error("AI gateway returned malformed JSON");
    }

    const content = data?.choices?.[0]?.message?.content;
    const rawText = Array.isArray(content)
      ? content.map((part: any) => part?.text || "").join("\n")
      : typeof content === "string"
        ? content
        : "";

    if (!rawText) throw new Error("AI gateway returned an empty response");
    if (rawText.length > MAX_JSON_RESPONSE_CHARS) {
      console.warn("AI output too large", rawText.length);
      return new Response(JSON.stringify(fallbackResult(languageHint, "Response was too large to safely use.")), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(extractJsonObject(rawText));
    const result = normalizeResult(parsed, languageHint);

    console.log("analyze success", JSON.stringify({ durationMs: Date.now() - startedAt, responseChars: rawText.length }));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("analyze error", JSON.stringify({ message, durationMs: Date.now() - startedAt, debugMode }));
    const languageHint = "en";
    return new Response(JSON.stringify({
      ...fallbackResult(languageHint, message),
      error: message,
      details: message,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
