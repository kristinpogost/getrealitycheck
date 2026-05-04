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
      return new Response(JSON.stringify({ error: "Please provide more detail or upload an image." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an emotionally intelligent reflection companion for relationship and communication patterns. You write like a thoughtful, perceptive friend — warm but honest, never clinical or formulaic.

Voice rules:
- Conversational and human, not a structured report. Each section should flow naturally, like something a wise friend would actually say.
- Avoid repeating back the obvious facts the user already shared. Skip past the surface; go to what's underneath.
- Be specific to what's actually in front of you. No generic relationship advice.
- Frame insights as possibilities ("one read is...", "this could suggest...", "it might be that..."). Never diagnose.
- Acknowledge real uncertainty when it's there ("hard to tell from just this", "could honestly go either way").
- The reality_check is THE key takeaway — one sentence that lands. Sharp, memorable, slightly direct, but never harsh. The kind of line that stays with someone.
- Notice subtle dynamics: avoidance, breadcrumbing, intermittent reinforcement, mirroring, validation seeking, emotional withdrawal, defensiveness, boundary testing, projection. Name them gently when they fit.

For "message" mode (analyzing a conversation), prioritize:
- communication_dynamic: 1–2 sentences naming the interaction style.
- hidden_signals: 2–3 sentences on what's implied — tone, timing, effort, emotional availability.
- intentions: 1–2 short possible interpretations, each acknowledging it's just one read.

For "situation" mode, the same fields apply but framed around the situation itself.

pattern_tag: 1–2 word label that captures the pattern.

If images (chat screenshots) are provided, read the visible conversation. If pasted text is also provided, treat the pasted text as primary and use images for context.

THREAD CONTEXT: ${hasPriors ? `This is a CONTINUING thread${personName ? ` about "${personName}"` : ""}. The user has shared ${priors.length} prior entries below. Use them to detect PATTERNS OVER TIME — repeated behaviors, escalation, de-escalation, consistency, contradictions, improvement, decline. Reference specific shifts when relevant.` : `This is the FIRST entry${personName ? ` about "${personName}"` : ""}. There is no prior history yet.`}

pattern_over_time field: ${hasPriors ? `2–3 sentences naming what's recurring or shifting across entries (e.g. "the same pull-back you described two weeks ago is showing up again", "effort has noticeably dropped since the first entry", "this is more consistent than past entries suggested"). Be specific to the prior entries.` : `Since this is the first entry, write a brief gentle note like "First entry — patterns will emerge as you add more." in the detected language.`}

trend field: one of "improving" | "declining" | "inconsistent" | "stable" | "new" — your read on the overall direction across entries (use "new" only when there are no priors).

Language: DETECT the language of the user's CURRENT input and respond ENTIRELY in that language — every field value AND every ui_labels value. Default to English if unclear.

Use the provided tool to structure your response.`;

    const userIntro = mode === "message"
      ? "Reflect on this message or conversation as a whole — focus on the interaction. Detect language and respond in it."
      : "Reflect on this situation. Detect language and respond in it.";

    const userContent: any[] = [];

    let priorBlock = "";
    if (hasPriors) {
      priorBlock = `\n\nPRIOR ENTRIES IN THIS THREAD${personName ? ` (about ${personName})` : ""}, oldest first:\n` +
        priors.map((p, i) => {
          const d = new Date(p.createdAt).toISOString().slice(0, 10);
          return `[${i + 1}] ${d} · ${p.mode} · flag: ${p.flag}${p.pattern_tag ? ` · tag: ${p.pattern_tag}` : ""}\n  user: ${p.userInput.slice(0, 600)}\n  summary: ${p.summary}`;
        }).join("\n\n") + "\n";
    }

    if (hasText) {
      userContent.push({ type: "text", text: `${userIntro}${priorBlock}\n\n--- NEW ENTRY ---\n${text}\n---` });
    } else {
      userContent.push({ type: "text", text: `${userIntro}${priorBlock}\n\nThe user uploaded chat screenshot(s) — read the visible conversation.` });
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
        description: "Provide a reflective analysis with language detection and pattern-over-time awareness",
        parameters: {
          type: "object",
          properties: {
            language: { type: "string", description: "ISO 639-1 code." },
            summary: { type: "string", description: "1–2 sentence neutral summary of what's happening overall." },
            pattern_tag: { type: "string", description: "1–2 word label of the pattern, in detected language." },
            communication_dynamic: { type: "string", description: "1–2 sentences on interaction style." },
            hidden_signals: { type: "string", description: "2–3 sentences on what's implied — tone, timing, effort, emotional availability." },
            intentions: { type: "string", description: "1–2 possible interpretations, framed as possibilities." },
            flag: { type: "string", description: "Translated 'Green flag' / 'Mixed signals' / 'Red flag'." },
            flag_color: { type: "string", enum: ["green", "yellow", "red"] },
            meaning: { type: "string", description: "2–4 conversational sentences on what this might mean, as possibility." },
            reflection: { type: "string", description: "One thoughtful question to sit with." },
            reality_check: { type: "string", description: "ONE sharp, memorable, honest sentence — the key takeaway." },
            action: { type: "string", description: "Short suggested next step." },
            pattern_over_time: { type: "string", description: "Pattern across prior entries, or a gentle first-entry note." },
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
                meaning: { type: "string" },
                reflection: { type: "string" },
                reality_check: { type: "string" },
                action: { type: "string" },
                pattern_over_time: { type: "string" },
              },
              required: ["summary_title", "pattern_tag", "dynamic", "hidden_signals", "intentions", "flag", "meaning", "reflection", "reality_check", "action", "pattern_over_time"],
              additionalProperties: false,
            },
          },
          required: ["language", "summary", "pattern_tag", "communication_dynamic", "hidden_signals", "intentions", "flag", "flag_color", "meaning", "reflection", "reality_check", "action", "pattern_over_time", "trend", "ui_labels"],
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
