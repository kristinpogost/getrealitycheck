import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, mode, images } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const hasText = typeof text === "string" && text.trim().length >= 3;
    const hasImages = Array.isArray(images) && images.length > 0;

    if (!hasText && !hasImages) {
      return new Response(JSON.stringify({ error: "Please provide more detail or upload an image." }), {
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
- If images (chat screenshots) are provided, read the visible conversation carefully. If pasted text is also provided, treat the pasted text as the primary source and use images for additional context. If only images are provided, base your reflection on what is visible and gently note that interpretation is limited to what's shown.

Language: DETECT the language of the user's input (text or visible chat content) and respond ENTIRELY in that language, including all field values AND the ui_labels object. If the language is unclear or mixed, default to English.

Use the provided tool to structure your response.`;

    const userIntro = mode === "message"
      ? "Reflect on this message or conversation. Detect its language and respond in that same language."
      : "Reflect on this situation. Detect its language and respond in that same language.";

    const userContent: any[] = [];
    if (hasText) {
      userContent.push({ type: "text", text: `${userIntro}\n\n---\n${text}\n---` });
    } else {
      userContent.push({ type: "text", text: `${userIntro}\n\nThe user uploaded chat screenshot(s) — read the visible conversation.` });
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
        description: "Provide a reflective analysis with language detection",
        parameters: {
          type: "object",
          properties: {
            language: { type: "string", description: "ISO 639-1 code (e.g. 'en', 'et')." },
            summary: { type: "string", description: "1–2 sentence neutral summary in detected language." },
            flag: { type: "string", description: "Translated 'Green flag' / 'Mixed signals' / 'Red flag'." },
            flag_color: { type: "string", enum: ["green", "yellow", "red"] },
            pattern: { type: "string", description: "Short label of a possible pattern." },
            meaning: { type: "string", description: "2–4 sentences interpretation as possibility, not fact." },
            reflection: { type: "string", description: "One thoughtful question to sit with." },
            reality_check: { type: "string", description: "One concise, slightly direct grounding sentence." },
            action: { type: "string", description: "Short suggested next step." },
            ui_labels: {
              type: "object",
              properties: {
                summary_title: { type: "string" },
                flag: { type: "string" },
                pattern: { type: "string" },
                meaning: { type: "string" },
                reflection: { type: "string" },
                reality_check: { type: "string" },
                action: { type: "string" },
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
