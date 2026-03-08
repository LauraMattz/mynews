import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articles } = await req.json();
    
    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "articles array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Summarize articles in batches of 5 to avoid rate limits
    const summaries: { id: string; summary: string }[] = [];
    const batchSize = 5;

    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (article: { id: string; title: string; description: string }) => {
          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                {
                  role: "system",
                  content: "Você é um assistente especializado em resumir notícias. Gere um resumo conciso em português (2-3 frases) do artigo fornecido. Seja direto e informativo."
                },
                {
                  role: "user",
                  content: `Título: ${article.title}\n\nDescrição: ${article.description || 'Sem descrição disponível'}`
                }
              ],
            }),
          });

          if (!response.ok) {
            if (response.status === 429) {
              throw new Error("Rate limit exceeded");
            }
            if (response.status === 402) {
              throw new Error("Payment required - add credits to your workspace");
            }
            throw new Error(`AI gateway error: ${response.status}`);
          }

          const data = await response.json();
          const summary = data.choices?.[0]?.message?.content || "Resumo não disponível";
          return { id: article.id, summary };
        })
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          summaries.push(result.value);
        } else {
          console.error("Summary error:", result.reason);
        }
      }

      // Small delay between batches
      if (i + batchSize < articles.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`Generated ${summaries.length} summaries for ${articles.length} articles`);

    return new Response(
      JSON.stringify({ success: true, summaries }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("summarize-news error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    const status = errorMessage.includes("Rate limit") ? 429 : 
                   errorMessage.includes("Payment") ? 402 : 500;
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
