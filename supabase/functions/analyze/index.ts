import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_IMAGES = 10;
const RECENT_DETAILED = 3; // last N entries get richer context
const OLDER_WINDOW = 12;   // total older entries summarized as compact memory

type PriorEntry = {
  createdAt: number;
  mode: "situation" | "message";
  userInput: string;
  summary: string;
  flag: string;
  flag_color: "green" | "yellow" | "red";
  pattern_tag?: string;
  communication_dynamic?: string;
  pattern_over_time?: string;
  reality_check?: string;
  hadImages?: boolean;
};

function compact(s: string | undefined, n: number): string {
  if (!s) return "";
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, mode, images, personName, priorEntries } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const hasText = typeof text === "string" && text.trim().length >= 3;
    const allImages = Array.isArray(images) ? images.filter((i: unknown) => typeof i === "string" && (i as string).startsWith("data:")) : [];
    const cappedImages = allImages.slice(0, MAX_IMAGES);
    const hasImages = cappedImages.length > 0;

    const allPriors: PriorEntry[] = Array.isArray(priorEntries) ? priorEntries : [];
    // Keep only the most recent OLDER_WINDOW + RECENT_DETAILED entries total
    const window = allPriors.slice(-(OLDER_WINDOW + RECENT_DETAILED));
    const recent = window.slice(-RECENT_DETAILED);
    const older = window.slice(0, Math.max(0, window.length - RECENT_DETAILED));
    const hasPriors = window.length > 0;

    if (!hasText && !hasImages) {
      return new Response(JSON.stringify({ error: "Please share a little more to reflect on." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are Reality Check — a calm, grounded, emotionally intelligent companion who reads relationship dynamics like a wise friend. You help people SEE patterns, not panic about them.

DOMAIN
- Only the actual interaction dynamic between two people: flow, mutual curiosity, reciprocity, openness, comfort, depth, humor, consistency over time.
- Not general life advice, productivity, or therapy diagnoses.

EMOTIONAL CALIBRATION
- Default stance: GROUNDED, not anxious. You are the steady voice.
- A short silence (hours / a day or two) after a warm exchange is NORMAL — not withdrawal unless a clear repeating pattern.
- Weight POSITIVE signals (warmth, vulnerability, reciprocal questions, depth, comfortable closings) at least as strongly as ambiguous gaps.
- If the user sounds anxious but the interaction looks healthy, gently ground them — don't validate the worry.
- "Could mean X, could mean Y, both are normal" beats "this signals withdrawal" unless real repeated pattern.
- One quiet day NEVER overrides days of genuine connection.

THREAD ISOLATION
- Reflect on ONE thread only. Allowed sources: prior entries below, current entry text, names visible in current screenshots.
- Never invent or carry over names from outside this thread. If unsure, use neutral phrasing ("see inimene", "tema", "the other person").
- Thread label "${personName ?? "—"}" is the user's private label for THIS thread.

NAMES & OCR
- Use a name only if unambiguously visible. Preserve EXACT spelling/diacritics. Never autocorrect ("Siim" stays "Siim").
- If OCR is blurry or partial, use neutral phrasing instead of guessing.
- Don't repeat names every sentence — once or twice, then pronouns.
- Prioritize content, tone, timing, patterns over names.

ESTONIAN (when responding in Estonian) — STRICT
- Fluent, natural, modern conversational Estonian. Never translated-from-English.
- Understand input even with slang, missing diacritics, typos, mixed English. Never mirror broken spelling back. Forbidden: "quietsele", "lyhike", "see oli nice". Always rewrite cleanly.
- Never invent words by attaching Estonian endings to English roots.
- Avoid stiff calques. Prefer lived phrasing: "tundub", "jääb mulje", "vestlus lõppes soojalt".
- NEVER use English-style apostrophe declension. Forbidden: "Jakob'i", "Raido'ga". ALWAYS attach the case ending directly: "Jakobi", "Jakobile", "Raidoga", "Siimile", "Mariga".
- ADDRESS FORM (ABSOLUTE): always second-person SINGULAR ("sina"-vorm). Use "sa/sina/sind/sulle/sinuga/sinu" and singular verbs ("tundsid", "märkad", "võid"). NEVER formal "teie"-vorm as address. The ONLY allowed "teie" is the relational possessive ("teie suhtlus", "teie side") — never as singular address.
- Soft, warm, observant. No therapy-speak, no corporate softness.

USER IDENTITY
- The user is the reader. ALWAYS address in second person. Never assign the user a name. Thread label is the OTHER person's label, not the user's.
- Forbidden: third-person narration about the user ("Olga jätkab...", "Mari tunneb..."). Always rewrite as "Sa jätkad...", "Sa tunned...".

EMOTIONAL WORDING
- Behavior over character. Possibilities over verdicts. Avoid harsh trait-labels — reframe as behavior or possibility.

REFERENCING THREAD MEMORY
- Use prior entries softly, framed as memory: "varasema põhjal tundub", "seni on tundunud", "one read across what you've shared".
- Never claim a clear trajectory ("on muutunud", "has shifted") from a single prior entry — need 2–3 consistent points before naming a direction.

VOICE
- Speak DIRECTLY to the reader, second person. Match the language ("sa/sina" Estonian, "tú" Spanish, "tu" French/Italian, "du" German/Nordic).
- Calm, perceptive, slightly intimate. Natural sentences. No clichés. Frame as possibilities ("one read is...").

THE FLAG
- GREEN by default when interaction shows warmth, mutual engagement, reciprocal curiosity, comfortable closings.
- YELLOW only for genuinely mixed signals visible across multiple entries.
- RED only for clear repeated patterns of disrespect, dishonesty, boundary violations, sustained unavailability. Never red for one quiet day.
- flag_reasoning must reflect the FULL picture (warmth + ambiguity together).

SIGNAL BREAKDOWN — 4 short lines, under 12 words each.
- initiative: who tends to start contact
- effort: depth/care of replies
- consistency: stable vs hot/cold (across entries)
- emotional_tone: warm, neutral, distant, ambivalent...
If something can't be assessed yet, say so briefly.

THREAD CONTEXT: ${hasPriors ? `CONTINUING thread${personName ? ` about "${personName}"` : ""}. ${window.length} prior entries below (older are compact memory, recent are detailed). Compare actively, but only call something a pattern if it actually repeats.` : `FIRST entry${personName ? ` about "${personName}"` : ""}. No prior history yet.`}

WHOLE-THREAD SYNTHESIS (your primary lens)
- You are a relationship pattern interpreter and emotional timeline analyzer — NOT a screenshot caption generator.
- The new entry is ONE moment in a longer story. Read it inside the full arc.
- Trace EVOLUTION: formal → casual → emotionally open; one-sided → reciprocal; small-talk → vulnerability; platform shifts (work chat → Instagram → DMs → meeting in person).
- Connect events into ONE evolving story. Recognize repeated emotional patterns only when they actually recur.
- Screenshots are EVIDENCE supporting the long-arc reading. They do not replace it. If the newest screenshot is neutral but the thread shows growing closeness, the closeness is the real signal.
- Default to continuity unless something genuinely breaks the pattern.

WHAT'S CHANGING
${hasPriors ? `2 short sentences naming any real shift. If nothing has clearly shifted, say so plainly. Don't invent decline from one quieter moment.` : `One short, gentle line — patterns will emerge as more is added.`}

PATTERN OVER TIME
${hasPriors ? `2–3 sentences on the longer arc — what keeps surfacing, what's stable, what's drifting. Weight repeated warmth as much as repeated friction.` : `One short, gentle line acknowledging this is the start.`}

IF NOTHING CHANGES — 1–2 realistic, non-dramatic sentences. If healthy, say it stays healthy.

REALITY CHECK — ONE sharp, memorable, emotionally mature sentence. Grounded. Never alarmist.

KEEP OUTPUT TIGHT. Avoid repeating the same insight in multiple sections — each field has a distinct purpose.

If images are provided, read the visible conversation. If pasted text is also there, treat the pasted text as primary and use images for context. Ignore filler UI/timestamps unless meaningful.

Language: DETECT the language of the current input and respond ENTIRELY in it — every field AND every ui_labels value. Default to English if unclear.

Use the provided tool to structure the response.`;

    const userIntro = mode === "message"
      ? "Reflect on this message or conversation as a whole — focus on what their behavior suggests. Speak directly to me in second person. Detect language and respond in it."
      : "Reflect on this situation — focus on what the other person's behavior might indicate. Speak directly to me in second person. Detect language and respond in it.";

    const userContent: any[] = [];

    let priorBlock = "";
    if (hasPriors) {
      const first = window[0];
      const last = window[window.length - 1];
      const spanDays = Math.max(0, Math.round((last.createdAt - first.createdAt) / 86400000));

      const olderDigest = older.length
        ? `\n\n--- COMPACT MEMORY (older entries, summarized) ---\n` +
          older.map((p, i) => {
            const d = new Date(p.createdAt).toISOString().slice(0, 10);
            const tag = p.pattern_tag ? ` ${p.pattern_tag}` : "";
            return `[${i + 1}] ${d} · ${p.flag}${tag}${p.hadImages ? " · img" : ""} — ${compact(p.summary, 140)}`;
          }).join("\n")
        : "";

      const recentBlock = `\n\n--- RECENT ENTRIES (detailed, newest last) ---\n` +
        recent.map((p, idx) => {
          const i = older.length + idx + 1;
          const d = new Date(p.createdAt).toISOString().slice(0, 10);
          const parts = [
            `[${i}] ${d} · ${p.mode}${p.hadImages ? " · had screenshots" : ""} · flag: ${p.flag}${p.pattern_tag ? ` · tag: ${p.pattern_tag}` : ""}`,
            `  user: ${compact(p.userInput, 400)}`,
            `  summary: ${compact(p.summary, 200)}`,
          ];
          if (p.communication_dynamic) parts.push(`  dynamic: ${compact(p.communication_dynamic, 180)}`);
          if (p.pattern_over_time) parts.push(`  pattern: ${compact(p.pattern_over_time, 180)}`);
          if (p.reality_check) parts.push(`  reality check: ${compact(p.reality_check, 140)}`);
          return parts.join("\n");
        }).join("\n\n");

      priorBlock = `\n\n=== THREAD HISTORY${personName ? ` (about ${personName})` : ""} — ${window.length} prior entries spanning ~${spanDays} day(s) ===` +
        olderDigest + recentBlock +
        `\n=== END HISTORY ===\n\nThe new entry below is the latest moment. Read it through the lens of everything above. Newest entries weigh most; older memory is context.\n`;
    }

    if (hasText) {
      userContent.push({ type: "text", text: `${userIntro}${priorBlock}\n\n--- NEW ENTRY ---\n${text}\n---` });
    } else {
      userContent.push({ type: "text", text: `${userIntro}${priorBlock}\n\n--- NEW ENTRY ---\nThe user uploaded chat screenshot(s) — read them as the next chapter of the thread above.` });
    }
    if (hasImages) {
      for (const img of cappedImages) {
        userContent.push({ type: "image_url", image_url: { url: img } });
      }
    }

    const tool = {
      type: "function",
      function: {
        name: "reflect",
        description: "Provide a relationally-focused reflection in second person.",
        parameters: {
          type: "object",
          properties: {
            language: { type: "string", description: "ISO 639-1 code." },
            summary: { type: "string", description: "1–2 sentence summary written TO you." },
            pattern_tag: { type: "string", description: "1–2 word label of the pattern." },
            communication_dynamic: { type: "string", description: "1–2 sentences on the interaction style." },
            hidden_signals: { type: "string", description: "2–3 sentences on what's implied — tone, timing, effort, availability." },
            intentions: { type: "string", description: "1–2 possible interpretations of their behavior." },
            flag: { type: "string", description: "FLAG label (never 'signal'/'sign'). English: 'Green flag'/'Yellow flag'/'Red flag'. Estonian: exactly 'Roheline lipp'/'Kollane lipp'/'Punane lipp'. Other languages: local equivalent of 'flag'." },
            flag_color: { type: "string", enum: ["green", "yellow", "red"] },
            flag_reasoning: { type: "string", description: "1–2 sentences. Specific to what was shared." },
            signal_breakdown: {
              type: "object",
              properties: {
                initiative: { type: "string" },
                effort: { type: "string" },
                consistency: { type: "string" },
                emotional_tone: { type: "string" },
              },
              required: ["initiative", "effort", "consistency", "emotional_tone"],
              additionalProperties: false,
            },
            meaning: { type: "string", description: "2–4 conversational sentences on what this might mean about them." },
            reflection: { type: "string", description: "One thoughtful question to sit with." },
            reality_check: { type: "string", description: "ONE sharp memorable sentence." },
            if_nothing_changes: { type: "string", description: "1–2 realistic non-dramatic sentences." },
            action: { type: "string", description: "Short suggested next step." },
            pattern_over_time: { type: "string", description: "Pattern across prior entries, or first-entry note." },
            whats_changing: { type: "string", description: "Short read on shift vs. priors, or first-entry note." },
            trend: { type: "string", enum: ["improving", "declining", "inconsistent", "stable", "new"] },
            ui_labels: {
              type: "object",
              properties: {
                summary_title: { type: "string" },
                pattern_tag: { type: "string" },
                dynamic: { type: "string" },
                hidden_signals: { type: "string" },
                intentions: { type: "string" },
                flag: { type: "string" },
                flag_reasoning: { type: "string" },
                signal_breakdown: { type: "string" },
                initiative: { type: "string" },
                effort: { type: "string" },
                consistency: { type: "string" },
                emotional_tone: { type: "string" },
                meaning: { type: "string" },
                reflection: { type: "string" },
                reality_check: { type: "string" },
                if_nothing_changes: { type: "string" },
                action: { type: "string" },
                pattern_over_time: { type: "string" },
                whats_changing: { type: "string" },
              },
              required: ["summary_title", "pattern_tag", "dynamic", "hidden_signals", "intentions", "flag", "flag_reasoning", "signal_breakdown", "initiative", "effort", "consistency", "emotional_tone", "meaning", "reflection", "reality_check", "if_nothing_changes", "action", "pattern_over_time", "whats_changing"],
              additionalProperties: false,
            },
          },
          required: ["language", "summary", "pattern_tag", "communication_dynamic", "hidden_signals", "intentions", "flag", "flag_color", "flag_reasoning", "signal_breakdown", "meaning", "reflection", "reality_check", "if_nothing_changes", "action", "pattern_over_time", "whats_changing", "trend", "ui_labels"],
          additionalProperties: false,
        },
      },
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "reflect" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("Gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "Invalid AI response" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
