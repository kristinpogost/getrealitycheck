import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, mode, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (!text || typeof text !== "string" || text.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Please provide more detail." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isEt = language === "et";
    const flagEnum = isEt
      ? ["Roheline lipp", "Segased signaalid", "Punane lipp"]
      : ["Green flag", "Mixed signals", "Red flag"];
    const actionEnum = isEt
      ? ["Vaatle veel", "Suhtle selgelt", "Kaalu eemaldumist"]
      : ["Observe more", "Communicate clearly", "Consider stepping back"];

    const systemPrompt = isEt
      ? `Sa oled läbimõeldud, neutraalne refleksiooniabi suhtemustrite osas. Sa EI anna lõplikke hinnanguid ega diagnoose inimesi. Sa pakud võimalusi, mitte tõdesid. Toon: soe, sisukas, austav. Vasta ALATI eesti keeles. Kasuta antud tööriista oma vastuse struktureerimiseks.`
      : `You are a thoughtful, neutral reflection assistant for relationship patterns. You do NOT give definitive judgments or diagnose people. You offer possibilities, not facts. Tone: warm, insightful, respectful. Always respond in English. Use the provided tool to structure your response.`;

    const userPrompt = isEt
      ? `Analüüsi seda ${mode === "message" ? "sõnumit/vestlust" : "olukorda"} peegelduse vaimus:\n\n${text}`
      : `Reflect on this ${mode === "message" ? "message/conversation" : "situation"}:\n\n${text}`;

    const tool = {
      type: "function",
      function: {
        name: "reflect",
        description: "Provide a reflective analysis",
        parameters: {
          type: "object",
          properties: {
            flag: { type: "string", enum: flagEnum },
            pattern: {
              type: "string",
              description: isEt
                ? "Lühike silt mustrist (nt ebajärjekindlus, vältimine, tähelepanu otsimine)"
                : "Short label of the pattern (e.g. inconsistency, avoidance, attention-seeking)",
            },
            meaning: {
              type: "string",
              description: isEt
                ? "2-3 lauset, neutraalne toon, esita võimalusena"
                : "2-3 sentences, neutral tone, framed as possibility",
            },
            reflection: {
              type: "string",
              description: isEt
                ? "Üks läbimõeldud küsimus kasutajale"
                : "One thoughtful question for the user",
            },
            action: { type: "string", enum: actionEnum },
          },
          required: ["flag", "pattern", "meaning", "reflection", "action"],
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
          JSON.stringify({ error: isEt ? "Liiga palju päringuid. Proovi hiljem uuesti." : "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: isEt ? "Krediit otsas. Lisa Lovable AI tööruumi krediiti." : "Credits exhausted. Please add funds to your Lovable AI workspace." }),
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
