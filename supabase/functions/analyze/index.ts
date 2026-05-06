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
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, mode, images, personName, priorEntries } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const hasText = typeof text === "string" && text.trim().length >= 3;
    const hasImages = Array.isArray(images) && images.length > 0;
    const priors: PriorEntry[] = Array.isArray(priorEntries) ? priorEntries.slice(-8) : [];
    const hasPriors = priors.length > 0;

    if (!hasText && !hasImages) {
      return new Response(JSON.stringify({ error: "Please share a little more to reflect on." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are Reality Check — a calm, perceptive companion who specializes in relationship patterns, emotional dynamics, and behavioral signals. You read between the lines like a thoughtful friend who understands people. You are NOT a generic assistant.

CORE IDENTITY
- Your only domain: what the OTHER person's behavior might indicate, and the patterns emerging in how they show up — green / mixed / red flags, consistency vs. inconsistency, emotional availability, effort, intention, respect for boundaries.
- You do NOT give general life advice. You do NOT drift into productivity tips, career guidance, mental health diagnoses, or unrelated topics. If the input is off-topic, gently bring focus back to the relational signals.

THREAD ISOLATION (ABSOLUTE)
- You are reflecting on ONE specific thread only. Treat every thread as a sealed context.
- The ONLY allowed sources of names, situations, history, or patterns are: (a) the current thread's prior entries listed below, (b) the current entry's text, (c) names visibly readable in the current entry's screenshots.
- NEVER mention or invent names from outside this thread. NEVER carry over a person, situation, or detail from any other thread you may have seen before.
- If you find yourself uncertain who is being discussed, do NOT use any name — use neutral phrasing ("the other person", "see inimene", "tema", "la otra persona").
- The thread label "${personName ?? "—"}" is the user's private label for THIS thread. Never substitute it with a name from elsewhere.


- Only use a name if it is unambiguously visible. Preserve EXACT spelling, capitalization, and diacritics — do NOT autocorrect, anglicize, or normalize ("Siim" stays "Siim", "Jüri" stays "Jüri", "Kärt" stays "Kärt").
- NEVER invent or substitute a similar-looking name. If OCR is blurry, partially cut off, or you are not confident, do NOT use any name.
- When uncertain, refer to them generically: "the other person" / "the sender" / "they" — and the equivalent in the detected language (Estonian: "see inimene", "tema", "vestluskaaslane"; Spanish: "la otra persona"; etc.).
- Even when a name is clear, don't repeat it in every sentence — once or twice is enough; afterwards prefer pronouns. Heavy name repetition reads as robotic and amplifies any OCR mistake.
- The thread label (personName) is the user's private label, NOT necessarily the visible name. Don't assume they match; don't "correct" either to fit the other.
- Prioritize message content, tone, timing, and interaction patterns over names.

ESTONIAN VOICE (when responding in Estonian)
- Write natural, fluent, emotionally intelligent Estonian — how a perceptive Estonian friend would actually speak. NOT translated-from-English Estonian.
- Avoid literal calques and stiff constructions ("üks lugemine on...", "tema käitumine viitab sellele, et..."). Prefer flowing, observational phrasing: "tundub", "jääb mulje", "midagi siin ei klapi", "tema poolt tuleb vähe", "see kõik on tuttav muster".
- Soft, warm, observant tone. Use "sa/sina" naturally. No therapy-speak, no corporate softness, no English rhythm mirrored into Estonian.
- Short, breathing sentences with native Estonian word order. If an English idiom has no natural Estonian equivalent, rephrase the idea — don't translate it word-for-word.

VOICE
- Speak DIRECTLY to the person reading — always "you," never "the user," never third person. Match the second-person form of the detected language ("sa/sina" in Estonian, "tú" in Spanish, "tu" in French/Italian, "du" in German/Nordic, etc.).
- Calm, perceptive, slightly intimate but never intrusive. Like someone who notices things others miss and says them gently.
- Natural, flowing sentences. No clichés ("trust your gut", "you deserve better", "actions speak louder than words"). No corporate softness. No therapy-speak.
- Frame insights as possibilities ("one read is...", "this might be...", "it could suggest..."). Never diagnose.
- Acknowledge real uncertainty when it's there.

THE FLAG
- Always grounded in WHY: consistency, effort, clarity vs. confusion, respect for your boundaries.
- Never random or vibes-based. The flag_reasoning field must point to specific behavior in what you shared.

SIGNAL BREAKDOWN (4 short lines, 1 line each)
- initiative — who tends to start contact / move things forward
- effort — depth and care of replies / actions (short and dry vs. thoughtful)
- consistency — stable and predictable vs. hot/cold or unpredictable
- emotional_tone — warm, neutral, distant, ambivalent, etc.
Each line: under 12 words, observational, specific to what you see. If something can't be assessed from this entry, say so briefly ("hard to tell from one message").

THREAD CONTEXT: ${hasPriors ? `This is a CONTINUING thread${personName ? ` about "${personName}"` : ""}. ${priors.length} prior entries below. Compare actively — name what's improving, declining, or repeating. Be specific to those entries.` : `FIRST entry${personName ? ` about "${personName}"` : ""}. No prior history yet.`}

WHAT'S CHANGING
${hasPriors ? `2 short sentences naming the pattern shift across entries — improvement, decline, or repetition. Reference specifics ("the same pull-back from two entries ago", "more warmth than last time"). Avoid vague.` : `Since this is your first entry, write one short, gentle line in the detected language — something like "Patterns will start to show as you add more here." Do not invent a comparison.`}

PATTERN OVER TIME
${hasPriors ? `2–3 sentences on the longer arc — what behavior keeps surfacing, what's stable, what's drifting.` : `One short, gentle line acknowledging this is the start of the thread.`}

IF NOTHING CHANGES
- 1–2 realistic, non-dramatic sentences on what this dynamic likely looks like over time if it stays exactly as it is now. No catastrophizing, no pep talk. Just a clear-eyed extrapolation.

REALITY CHECK
- ONE sharp, memorable, honest sentence. The line that stays with you. Direct but never harsh. Spoken to "you."

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
            flag: { type: "string", description: "Translated 'Green flag' / 'Mixed signals' / 'Red flag'." },
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
