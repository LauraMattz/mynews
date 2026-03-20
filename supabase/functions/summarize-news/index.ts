import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchPageContent(url: string): Promise<{ title: string; description: string }> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)" },
      redirect: "follow",
    });
    if (!resp.ok) return { title: "", description: "" };
    const html = await resp.text();
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([\s\S]*?)["']/i);
    const title = (ogTitleMatch?.[1] || titleMatch?.[1] || "").trim().replace(/\s+/g, " ");
    
    // Extract description
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([\s\S]*?)["']/i);
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i);
    const description = (ogDescMatch?.[1] || metaDescMatch?.[1] || "").trim().replace(/\s+/g, " ");
    
    // Extract some body text for context
    const bodyText = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 2000);
    
    return { title, description: description || bodyText.slice(0, 500) };
  } catch (e) {
    console.error("Failed to fetch page:", url, e);
    return { title: "", description: "" };
  }
}

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

    const summaries: { id: string; summary: string; title?: string }[] = [];
    const batchSize = 5;

    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (article: { id: string; title: string; description: string; url?: string }) => {
          let title = article.title;
          let description = article.description || "";
          let fetchedTitle = "";

          // If title is placeholder and we have a URL, fetch real content
          if (article.url && (!title || title === "Carregando..." || title === "Link manual")) {
            const page = await fetchPageContent(article.url);
            if (page.title) fetchedTitle = page.title;
            if (page.description) description = page.description;
            title = fetchedTitle || title;
          }

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
                  content: `Você é um assistente especializado em resumir notícias para um boletim informativo profissional. 
Para cada artigo, gere um resumo estruturado no seguinte formato EXATO (use markdown):

**Resumo**
[Resumo do artigo em 3-4 frases. Seja direto, informativo e objetivo.]

**Por que importa?**
[Explique em 2-3 frases por que essa notícia é relevante, qual o impacto e as implicações mais amplas.]

Não inclua título, link ou metadados. Apenas as seções "Resumo" e "Por que importa?".`
                },
                {
                  role: "user",
                  content: `Título: ${title}\n\nDescrição: ${description || 'Sem descrição disponível'}`
                }
              ],
            }),
          });

          if (!response.ok) {
            if (response.status === 429) throw new Error("Rate limit exceeded");
            if (response.status === 402) throw new Error("Payment required - add credits to your workspace");
            throw new Error(`AI gateway error: ${response.status}`);
          }

          const data = await response.json();
          const summary = data.choices?.[0]?.message?.content || "Resumo não disponível";
          return { id: article.id, summary, ...(fetchedTitle ? { title: fetchedTitle } : {}) };
        })
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          summaries.push(result.value);
        } else {
          console.error("Summary error:", result.reason);
        }
      }

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
