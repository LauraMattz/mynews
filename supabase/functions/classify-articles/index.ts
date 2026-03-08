import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articleIds } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch articles to classify
    let query = supabase
      .from("articles")
      .select("id, title, description, summary")
      .eq("is_deleted", false);

    if (articleIds && articleIds.length > 0) {
      query = query.in("id", articleIds);
    } else {
      // Only classify pending articles
      query = query.eq("ai_review_status", "pending").limit(30);
    }

    const { data: articles, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;
    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, classified: 0, message: "Nenhum artigo pendente" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { id: string; tags: string[]; score: number; status: string }[] = [];
    const batchSize = 5;

    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(async (article) => {
          const text = `${article.title}\n${article.description || ""}\n${article.summary || ""}`;

          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                {
                  role: "system",
                  content: `Você é um classificador de notícias. Analise cada artigo e determine se ele é relevante para os seguintes pilares temáticos:

1. **Tecnologia** - IA, software, hardware, inovação digital, cibersegurança, transformação digital, startups tech
2. **Educação** - Ensino, pesquisa, universidades, ciência, formação, letramento, ENEM, bolsas
3. **Liderança** - Governança, políticas públicas, governo, legislação, democracia, gestão pública
4. **Equidade Racial** - Racismo, diversidade, inclusão, gênero, direitos humanos, desigualdade, feminismo, violência contra mulher, periferia, favela, trabalho, saúde pública

REJEITE artigos sobre: entretenimento (BBB, celebridades, fofocas), esportes (futebol, F1), astrologia/horóscopo, ofertas comerciais, fait divers (acidentes, crimes comuns sem conexão social), lifestyle genérico (receitas, dicas domésticas), cultura pop.

ACEITE artigos que tenham conexão clara com pelo menos um dos 4 pilares, mesmo que tangencial (ex: violência doméstica = equidade, ciência = educação).`
                },
                {
                  role: "user",
                  content: text
                }
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "classify_article",
                    description: "Classifica o artigo quanto à relevância para os 4 pilares temáticos",
                    parameters: {
                      type: "object",
                      properties: {
                        tags: {
                          type: "array",
                          items: {
                            type: "string",
                            enum: ["tecnologia", "educação", "liderança", "equidade_racial"]
                          },
                          description: "Pilares temáticos que o artigo toca. Array vazio se nenhum."
                        },
                        score: {
                          type: "number",
                          minimum: 0,
                          maximum: 10,
                          description: "Score de relevância de 0 (irrelevante) a 10 (altamente relevante)"
                        },
                        relevant: {
                          type: "boolean",
                          description: "true se o artigo é relevante para pelo menos 1 pilar, false se deve ser descartado"
                        }
                      },
                      required: ["tags", "score", "relevant"],
                      additionalProperties: false
                    }
                  }
                }
              ],
              tool_choice: { type: "function", function: { name: "classify_article" } },
            }),
          });

          if (!response.ok) {
            if (response.status === 429) throw new Error("Rate limit exceeded");
            if (response.status === 402) throw new Error("Payment required");
            throw new Error(`AI gateway error: ${response.status}`);
          }

          const data = await response.json();
          const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
          
          if (!toolCall) {
            return { id: article.id, tags: [], score: 0, status: "rejected" };
          }

          const args = JSON.parse(toolCall.function.arguments);
          return {
            id: article.id,
            tags: args.tags || [],
            score: args.score || 0,
            status: args.relevant ? "approved" : "rejected",
          };
        })
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          console.error("Classification error:", result.reason);
        }
      }

      if (i + batchSize < articles.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // Update articles in DB — no auto-deletion, user decides in triage
    for (const r of results) {
      await supabase.from("articles").update({
        ai_relevance_tags: r.tags,
        ai_relevance_score: r.score,
        ai_review_status: r.status,
      }).eq("id", r.id);
    }

    console.log(`Classified ${results.length} articles`);

    return new Response(
      JSON.stringify({
        success: true,
        classified: results.length,
        approved: results.filter(r => r.status === "approved").length,
        rejected: results.filter(r => r.status === "rejected").length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("classify-articles error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
