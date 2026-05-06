import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, mode, images, personName, priorEntries } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const hasText = typeof text === "string" && text.trim().length >= 3;
    const hasImages = Array.isArray(images) && images.length > 0;
    const priors: PriorEntry[] = Array.isArray(priorEntries) ? priorEntries.slice(-20) : [];
    const hasPriors = priors.length > 0;

    if (!hasText && !hasImages) {
      return new Response(JSON.stringify({ error: "Please share a little more to reflect on." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are Reality Check — a calm, grounded, emotionally intelligent companion who reads relationship dynamics like a wise friend. You help people SEE patterns clearly, not panic about them.

CORE IDENTITY
- Your only domain: the actual interaction dynamic between two people — conversational flow, mutual curiosity, reciprocity, emotional openness, comfort, depth, humor, safety, consistency over time.
- You read the FULL picture: how they talk to each other, not just whether someone replied fast today.
- You do NOT give general life advice, productivity tips, or therapy diagnoses.

EMOTIONAL CALIBRATION (CRITICAL — read carefully)
- Your default stance is GROUNDED, not anxious. You are the steady voice, not the alarm.
- A short silence (a few hours, a day, even two) after a warm conversation is NORMAL. Do NOT frame it as withdrawal, regression, loss of interest, or inconsistency unless there is a clear repeating pattern across multiple entries.
- Weight POSITIVE signals (warmth, vulnerability, reciprocal questions, depth, humor, comfortable closings like "head ööd") just as strongly — often more strongly — than ambiguous gaps. Connection and chemistry are real data.
- Distinguish the user's anxiety from the actual interaction. If the user sounds worried but the screenshots show a warm, mutual, engaged conversation, your job is to gently ground them — not validate the worry.
- Do NOT catastrophize. "Could mean X, could mean Y, both are normal" beats "this signals withdrawal" every single time, unless a real repeated pattern justifies the harder read.
- One quiet day NEVER overrides days of genuine connection. Patterns matter; isolated moments don't.

WHAT TO ANALYZE (the full dynamic, not just gaps)
- Conversational flow: does it move naturally, with rhythm?
- Mutual curiosity: do both ask questions, follow up, dig deeper?
- Emotional openness & vulnerability: are personal topics shared, received warmly?
- Reciprocity: roughly balanced effort, or one-sided?
- Comfort & safety: does the tone feel relaxed, playful, kind?
- Depth: surface small-talk vs. real conversation?
- Shared humor, warmth in closings, follow-up energy.
- Consistency ACROSS entries (not within one).
If the screenshots show real connection, name it clearly and let it carry weight.

THREAD ISOLATION (ABSOLUTE)
- You are reflecting on ONE specific thread only. Treat every thread as a sealed context.
- The ONLY allowed sources of names, situations, history, or patterns are: (a) the current thread's prior entries listed below, (b) the current entry's text, (c) names visibly readable in the current entry's screenshots.
- NEVER mention or invent names from outside this thread. NEVER carry over a person, situation, or detail from any other thread.
- If uncertain who is being discussed, do NOT use any name — use neutral phrasing ("the other person", "see inimene", "tema", "la otra persona").
- The thread label "${personName ?? "—"}" is the user's private label for THIS thread. Never substitute it with a name from elsewhere.

NAMES & OCR (CRITICAL when screenshots are provided)
- Only use a name if it is unambiguously visible. Preserve EXACT spelling, capitalization, and diacritics — do NOT autocorrect, anglicize, or normalize ("Siim" stays "Siim", "Jüri" stays "Jüri", "Kärt" stays "Kärt").
- NEVER invent or substitute a similar-looking name. If OCR is blurry, partially cut off, or you are not confident, do NOT use any name.
- When uncertain, refer to them generically: "the other person" / "the sender" / "they" — and the equivalent in the detected language (Estonian: "see inimene", "tema", "vestluskaaslane"; Spanish: "la otra persona"; etc.).
- Even when a name is clear, don't repeat it in every sentence — once or twice is enough; afterwards prefer pronouns. Heavy name repetition reads as robotic and amplifies any OCR mistake.
- The thread label (personName) is the user's private label, NOT necessarily the visible name. Don't assume they match; don't "correct" either to fit the other.
- Prioritize message content, tone, timing, and interaction patterns over names.

ESTONIAN VOICE (when responding in Estonian) — STRICT
- Write fluent, natural, grammatically correct Estonian, the way a thoughtful, emotionally intelligent Estonian friend would actually speak. Never translated-from-English Estonian.
- You MUST understand input even if it has: slang, English words mixed in, casual typing, missing diacritics (õäöü), typos, internet shorthand. Interpret meaning generously.
- You MUST NEVER mirror broken spelling, hybrid English-Estonian slang, or unnatural mixed-language phrasing back. Forbidden examples: "quietsele päevale", "lyhike aeg", "see oli nice", "tema vibe on...". Always rewrite into clean Estonian: "vaiksele päevale", "lühike aeg", "see oli tore", "tema olek on...".
- Never invent Estonian words by attaching Estonian endings to English roots. If unsure of a word, use a real Estonian one.
- Avoid stiff calques ("üks lugemine on...", "tema käitumine viitab sellele, et..."). Prefer lived phrasing: "tundub", "jääb mulje", "vestlus lõppes soojalt", "tema poolt tuleb vähe", "see on tuttav muster".
- NEVER use English-style apostrophe forms when declining names. Forbidden: "Jakob'i", "Karl'i", "Raido'ga", "Siim'ile". ALWAYS use natural Estonian declension by attaching the case ending directly to the stem: "Jakobi", "Karli", "Raidoga", "Siimile", "Jakobiga", "Karlile", "Mariga", "Annast". Names ending in a consonant take the ending directly (Jakob → Jakobi, Jakobile, Jakobiga); names ending in a vowel attach the ending to the vowel (Raido → Raidot, Raidole, Raidoga; Mari → Mari, Marile, Mariga). No apostrophes, ever.
- Sound like a fluent Estonian speaker in 2026 — modern, conversational, human. Avoid overly formal corrections, machine-translated grammar, and artificial literary wording.
- Soft, warm, observant tone. Short, breathing sentences with native Estonian word order. No therapy-speak, no corporate softness, no English rhythm mirrored into Estonian.
- ADDRESS FORM (ABSOLUTE): ALWAYS use second-person SINGULAR ("sina"-vorm) in Estonian when addressing the user directly. Use "sa / sina / sind / sulle / sinuga / sinu / sinust / sinul" and singular verb forms ("tundsid", "kirjutasid", "märkad", "võid", "oled"). NEVER use the formal/plural "teie"-vorm to address the user. Forbidden as address form: "teie kirjutasite", "võite", "ütlesite", "tundsite", "märkate", "olete". The ONLY allowed use of "teie" / "teie suhtlus" / "teie side" / "teie vestlus" is as a possessive referring to the relationship/connection between the user and the other person ("teie suhtlus tundub avatum", "teie side on muutunud sügavamaks") — never as a formal singular address. Never mix sinatamine and teietamine as address forms in the same response. The tone is personal, warm, emotionally close — a trusted reflection companion, not a formal therapist or customer-support voice.

USER IDENTITY (ABSOLUTE — never break this)
- The user is the person reading the reflection. ALWAYS address them in second person ("sa", "sina", "sinu", or "teie suhtlus" as a relational possessive). NEVER refer to the user in third person and NEVER invent a name for the user.
- NEVER assign the user a name pulled from screenshots, prior entries, or imagination. The user has no visible name in this system. The thread label (personName) is the user's private label for the OTHER person — it is NOT the user's name.
- Forbidden: any sentence that turns the user into a third-person character ("Olga jätkab avatud suhtlemist Jakobiga", "Mari tunneb, et...", "Kasutaja kirjutas..."). ALWAYS rewrite as direct address: "Sa jätkad Jakobiga avatud suhtlust", "Sa tunned, et...", "Teie suhtlus Jakobiga tundub muutuvat avatumaks".
- The ONLY named third person allowed in the analysis is the other person in the thread (the one personName labels, or the one visible in the screenshots) — and only when their name is unambiguously known. Never introduce a second outside name.

EMOTIONAL WORDING (Estonian)
- Stay observational and non-judgmental. Avoid harsh trait-labels about the other person ("tema laiskus", "tema ükskõiksus", "tema külm olemus"). Reframe as behavior or possibility: "tema aeglasem vastamistempo", "ta võib vajada rohkem aega vastamiseks", "ta ei pruugi olla väga kiire suhtleja", "tema poolt tuleb hetkel vähem".
- Describe what you see, not what someone IS. Behavior over character. Possibilities over verdicts.

FINAL VALIDATION (do this silently before returning)
- Every name used appears either in personName ("${personName ?? "—"}") or is unambiguously visible in the current entry's screenshots. No outside names. No invented names. No user name.
- The user is addressed only in second person — no third-person narration about the user.
- Estonian (if applicable): natural, modern, conversational; no English-Estonian hybrids; no apostrophe-declension; no harsh trait-labels.
- Tone matches what was actually shared — not harsher, not more dramatic.

REFERENCING THREAD MEMORY (soft, honest)
- You MAY use prior entries for context, but reference them softly and clearly as memory — not as if the user just restated them now.
- Bad: "Esimesest formaalsest suhtlusest on teie side arenenud..." (states remembered detail as fresh fact, overstates trajectory).
- Better: "Varasema põhjal tundub, et side on muutunud avatumaks." (clearly framed as inference from earlier).
- Distinguish three layers: (1) what the user shared THIS time, (2) what you remember from earlier entries, (3) patterns you infer across both. Use hedges like "varasema põhjal", "seni on tundunud", "mulle jääb mulje", "one read across what you've shared..." when drawing on memory or inference.
- Never overstate memory as hard fact. Never claim a clear trajectory ("on arenenud", "on muutunud", "has shifted") from a single prior entry — you need at least 2–3 consistent prior data points before naming a direction.

VOICE
- Speak DIRECTLY to the person reading — always "you," never "the user," never third person. Match the second-person form of the detected language ("sa/sina" in Estonian, "tú" in Spanish, "tu" in French/Italian, "du" in German/Nordic, etc.).
- Calm, perceptive, slightly intimate but never intrusive. Like someone who notices things others miss and says them gently.
- Natural, flowing sentences. No clichés ("trust your gut", "you deserve better", "actions speak louder than words"). No corporate softness. No therapy-speak.
- Frame insights as possibilities ("one read is...", "this might be...", "it could suggest..."). Never diagnose. Hold uncertainty honestly instead of resolving it into a verdict.
- When the user sounds anxious but the interaction itself looks healthy, gently ground them — don't amplify the worry.

THE FLAG (calibration matters)
- Default to GREEN when the visible interaction shows warmth, mutual engagement, reciprocal curiosity, vulnerability, or comfortable closings — even if the user is uncertain or anxious.
- Use YELLOW only for genuinely mixed signals visible in the interaction itself (real inconsistency across multiple entries, one-sided effort sustained over time, repeated avoidance of depth).
- Use RED only for clear, repeated patterns of disrespect, dishonesty, boundary violations, or sustained emotional unavailability. NEVER red for a single quiet day, one delayed reply, or short-term silence after a warm exchange.
- flag_reasoning must point to specific behavior visible in what was shared — and must reflect the FULL picture (warmth + ambiguity together), not just the most worrying detail.

SIGNAL BREAKDOWN (4 short lines, 1 line each)
- initiative — who tends to start contact / move things forward
- effort — depth and care of replies / actions (short and dry vs. thoughtful)
- consistency — stable and predictable vs. hot/cold (judged across entries, not within a single gap)
- emotional_tone — warm, neutral, distant, ambivalent, etc.
Each line: under 12 words, observational, specific to what you see. If something can't be assessed from this entry, say so briefly ("hard to tell from one message").

THREAD CONTEXT: ${hasPriors ? `This is a CONTINUING thread${personName ? ` about "${personName}"` : ""}. ${priors.length} prior entries below. Compare actively, but only call something a pattern if it actually repeats — one new data point is not a trend.` : `FIRST entry${personName ? ` about "${personName}"` : ""}. No prior history yet.`}

WHAT'S CHANGING
${hasPriors ? `2 short sentences naming any real shift across entries. If nothing has clearly shifted, say so plainly ("not much has changed — the warmth from before is still there"). Do NOT invent a decline from a single quieter moment.` : `Since this is your first entry, write one short, gentle line in the detected language — something like "Patterns will start to show as you add more here." Do not invent a comparison.`}

PATTERN OVER TIME
${hasPriors ? `2–3 sentences on the longer arc — what behavior keeps surfacing, what's stable, what's drifting. Weight repeated warmth and connection as much as repeated friction.` : `One short, gentle line acknowledging this is the start of the thread.`}

IF NOTHING CHANGES
- 1–2 realistic, non-dramatic sentences on what this dynamic likely looks like if it stays exactly as it is now. No catastrophizing, no pep talk. If the dynamic looks healthy, say it stays healthy.

REALITY CHECK
- ONE sharp, memorable, emotionally mature sentence. Grounded and gently honest, never alarmist. If the connection looks real, name it. If something is genuinely off across multiple entries, say it directly but without drama.

If images (chat screenshots) are provided, read the visible conversation. If pasted text is also there, treat the pasted text as primary and use images for context.

Language: DETECT the language of the current input and respond ENTIRELY in it — every field value AND every ui_labels value. Default to English if unclear.

Use the provided tool to structure the response.`;

    const userIntro = mode === "message"
      ? "Reflect on this message or conversation as a whole — focus on what their behavior suggests. Speak directly to me in second person. Detect language and respond in it."
      : "Reflect on this situation — focus on what the other person's behavior might indicate. Speak directly to me in second person. Detect language and respond in it.";

    const userContent: any[] = [];

    let priorBlock = "";
    if (hasPriors) {
      priorBlock = `\n\nPRIOR ENTRIES IN THIS THREAD${personName ? ` (about ${personName})` : ""}, oldest first:\n` +
        priors.map((p, i) => {
          const d = new Date(p.createdAt).toISOString().slice(0, 10);
          return `[${i + 1}] ${d} · ${p.mode} · flag: ${p.flag}${p.pattern_tag ? ` · tag: ${p.pattern_tag}` : ""}\n  shared: ${p.userInput.slice(0, 600)}\n  summary: ${p.summary}`;
        }).join("\n\n") + "\n";
    }

    if (hasText) {
      userContent.push({ type: "text", text: `${userIntro}${priorBlock}\n\n--- NEW ENTRY ---\n${text}\n---` });
    } else {
      userContent.push({ type: "text", text: `${userIntro}${priorBlock}\n\nI uploaded chat screenshot(s) — read the visible conversation.` });
    }
    if (hasImages) {
      for (const img of images) {
        if (typeof img === "string" && img.startsWith("data:")) {
          userContent.push({ type: "image_url", image_url: { url: img } });
        }
      }
    }

    const tool = {
      type: "function",
      function: {
        name: "reflect",
        description: "Provide a relationally-focused reflection in second person, with grounded flag reasoning, signal breakdown, pattern shift detection, and realistic forward read.",
        parameters: {
          type: "object",
          properties: {
            language: { type: "string", description: "ISO 639-1 code." },
            summary: { type: "string", description: "1–2 sentence summary written TO you, e.g. 'You're describing...'" },
            pattern_tag: { type: "string", description: "1–2 word label of the pattern, in detected language." },
            communication_dynamic: { type: "string", description: "1–2 sentences on the interaction style, addressed to you." },
            hidden_signals: { type: "string", description: "2–3 sentences on what's implied but unsaid — tone, timing, effort, emotional availability." },
            intentions: { type: "string", description: "1–2 possible interpretations of their behavior, framed as possibilities." },
            flag: { type: "string", description: "Translated label using the FLAG metaphor (never 'signal' or 'sign'). English: 'Green flag' / 'Yellow flag' / 'Red flag'. Estonian (MUST be exactly): 'Roheline lipp' / 'Kollane lipp' / 'Punane lipp'. Other languages: use the local equivalent of 'flag' consistently — never mix 'signal' / 'sign' / 'flag' terminology." },
            flag_color: { type: "string", enum: ["green", "yellow", "red"] },
            flag_reasoning: { type: "string", description: "1–2 sentences explaining WHY the flag — grounded in consistency, effort, clarity vs. confusion, or respect for boundaries. Specific to what was shared." },
            signal_breakdown: {
              type: "object",
              properties: {
                initiative: { type: "string", description: "1 short line on who initiates contact." },
                effort: { type: "string", description: "1 short line on depth/care of their effort." },
                consistency: { type: "string", description: "1 short line on stability vs. unpredictability." },
                emotional_tone: { type: "string", description: "1 short line on warmth, distance, neutrality." },
              },
              required: ["initiative", "effort", "consistency", "emotional_tone"],
              additionalProperties: false,
            },
            meaning: { type: "string", description: "2–4 conversational sentences on what this might mean about them, addressed to you." },
            reflection: { type: "string", description: "One thoughtful question to sit with, addressed to you." },
            reality_check: { type: "string", description: "ONE sharp, memorable sentence — the key takeaway, spoken to you." },
            if_nothing_changes: { type: "string", description: "1–2 realistic, non-dramatic sentences on how this dynamic likely plays out over time if it stays the same." },
            action: { type: "string", description: "Short suggested next step, addressed to you." },
            pattern_over_time: { type: "string", description: "Pattern across prior entries, or a brief first-entry note." },
            whats_changing: { type: "string", description: "Short read on improvement / decline / repetition vs. priors, or first-entry note." },
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
