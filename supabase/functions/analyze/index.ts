import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (!text || typeof text !== "string" || text.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Please provide more detail." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an emotionally intelligent reflection companion for relationship and communication patterns.

Your voice: warm but slightly direct, grounded, intuitive, never clinical. Like a thoughtful friend who has read a lot of psychology — not a therapist diagnosing.

Core rules:
- NEVER give absolute judgments or diagnose people.
- Frame insights as possibilities ("this could suggest…", "one read is…").
- Occasionally acknowledge uncertainty when the situation is genuinely ambiguous ("hard to say from just this", "could go either way").
- Notice subtle psychological patterns: avoidance, validation seeking, inconsistency, intermittent reinforcement, projection, breadcrumbing, defensiveness, emotional withdrawal, mirroring, boundary testing, etc. — name them gently when relevant.
- The "reality_check" field is one slightly direct sentence that gives a clearer perspective. Grounded, not harsh. The kind of thing a wise friend would say after listening.
- Be specific to what the user wrote — avoid generic relationship advice.

Language: DETECT the language of the user's input and respond ENTIRELY in that language, including all field values AND the ui_labels object. If the language is unclear or mixed, default to English.

Use the provided tool to structure your response.`;

    const userPrompt = `Reflect on this ${mode === "message" ? "message or conversation" : "situation"}. Detect its language and respond in that same language.

---
${text}
---`;

    const tool = {
      type: "function",
      function: {
        name: "reflect",
        description: "Provide a reflective analysis with language detection",
        parameters: {
          type: "object",
          properties: {
            language: {
              type: "string",
              description: "ISO 639-1 code of the detected language (e.g. 'en', 'et', 'es', 'fr', 'de', 'ru', 'fi'). Default 'en' if unclear.",
            },
            summary: {
              type: "string",
              description: "1–2 sentence neutral summary of what the user described, in the detected language.",
            },
            flag: {
              type: "string",
              description: "One of three values translated into the detected language: equivalent of 'Green flag', 'Mixed signals', or 'Red flag'. Must clearly map to one of green/yellow/red.",
            },
            flag_color: {
              type: "string",
              enum: ["green", "yellow", "red"],
              description: "The underlying color category — green, yellow, or red.",
            },
            pattern: {
              type: "string",
              description: "Short label of a possible psychological/relational pattern (e.g. avoidance, validation seeking, inconsistency, breadcrumbing, mirroring). In detected language.",
            },
            meaning: {
              type: "string",
              description: "2–4 sentences offering a nuanced interpretation as possibility, not fact. Acknowledge uncertainty when warranted. In detected language.",
            },
            reflection: {
              type: "string",
              description: "One thoughtful, specific question the user can sit with. In detected language.",
            },
            reality_check: {
              type: "string",
              description: "One concise, slightly direct sentence offering clearer perspective. Grounded, not harsh. In detected language.",
            },
            action: {
              type: "string",
              description: "A short suggested next step (a few words), in the detected language.",
            },
            ui_labels: {
              type: "object",
              description: "Translations of the UI section labels into the detected language.",
              properties: {
                summary_title: { type: "string", description: "Translation of 'Summary of your situation'" },
                flag: { type: "string", description: "Translation of 'Flag'" },
                pattern: { type: "string", description: "Translation of 'Possible pattern'" },
                meaning: { type: "string", description: "Translation of 'What it might mean'" },
                reflection: { type: "string", description: "Translation of 'A question to sit with'" },
                reality_check: { type: "string", description: "Translation of 'Reality check'" },
                action: { type: "string", description: "Translation of 'A gentle next step'" },
              },
              required: ["summary_title", "flag", "pattern", "meaning", "reflection", "reality_check", "action"],
              additionalProperties: false,
            },
          },
          required: ["language", "summary", "flag", "flag_color", "pattern", "meaning", "reflection", "reality_check", "action", "ui_labels"],
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
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "reflect" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted. Please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("Gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "Invalid AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
