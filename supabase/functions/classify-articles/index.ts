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
    let articleIds: string[] | undefined;
    try {
      const body = await req.json();
      articleIds = body?.articleIds;
    } catch {
      // No body or invalid JSON provided — will classify all pending articles
    }

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

    // Recalculate source reputation before classifying
    await supabase.rpc("recalculate_source_reputation");

    // Gather feedback context: which sources/topics perform well
    const { data: feedStats } = await supabase
      .from("feeds")
      .select("name, approval_rate, total_articles")
      .gt("total_articles", 0)
      .order("approval_rate", { ascending: false });

    const { data: topVoted } = await supabase
      .from("articles")
      .select("title, ai_relevance_tags, relevance_score")
      .eq("is_deleted", false)
      .gt("relevance_score", 0)
      .order("relevance_score", { ascending: false })
      .limit(10);

    const { data: worstVoted } = await supabase
      .from("articles")
      .select("title, ai_relevance_tags, relevance_score")
      .eq("is_deleted", false)
      .lt("relevance_score", 0)
      .order("relevance_score", { ascending: true })
      .limit(10);

    const feedbackContext = [
      feedStats && feedStats.length > 0 
        ? `Fontes mais aceitas: ${feedStats.slice(0, 5).map(f => `${f.name} (${Math.round(f.approval_rate * 100)}%)`).join(", ")}.`
        : "",
      feedStats && feedStats.length > 0
        ? `Fontes mais rejeitadas: ${feedStats.filter(f => f.approval_rate < 0.5).slice(0, 5).map(f => `${f.name} (${Math.round(f.approval_rate * 100)}%)`).join(", ")}.`
        : "",
      topVoted && topVoted.length > 0
        ? `Artigos que o usuário mais gostou: ${topVoted.map(a => `"${a.title.slice(0, 60)}" [${(a.ai_relevance_tags || []).join(",")}]`).join("; ")}.`
        : "",
      worstVoted && worstVoted.length > 0
        ? `Artigos rejeitados pelo usuário: ${worstVoted.map(a => `"${a.title.slice(0, 60)}"`).join("; ")}.`
        : "",
    ].filter(Boolean).join("\n");

    // Fetch articles to classify
    let query = supabase
      .from("articles")
      .select("id, title, description, summary, source_name")
      .eq("is_deleted", false);

    if (articleIds && articleIds.length > 0) {
      query = query.in("id", articleIds);
    } else {
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
          const text = `Fonte: ${article.source_name || "desconhecida"}\n${article.title}\n${article.description || ""}\n${article.summary || ""}`;

          const systemPrompt = `Você é um classificador de notícias RIGOROSO. Seu papel é filtrar agressivamente artigos irrelevantes. Na DÚVIDA, REJEITE.

Só ACEITE artigos com conexão DIRETA e SUBSTANCIAL com pelo menos um destes 4 pilares:

1. **Tecnologia** - IA, software, cibersegurança, transformação digital, startups tech, regulação de plataformas digitais, dados pessoais, privacidade digital
2. **Educação** - Ensino público/privado, pesquisa acadêmica, universidades, formação de professores, ENEM, bolsas de estudo, alfabetização, currículo escolar
3. **Liderança** - Governança, políticas públicas ESTRUTURAIS (não fait divers político), legislação com impacto social amplo, democracia, gestão pública, reforma administrativa
4. **Equidade Racial** - Racismo estrutural, diversidade, inclusão, direitos humanos, desigualdade social SISTÊMICA, feminismo, violência de gênero como DADO ESTRUTURAL, periferia, favela

REJEITE SEMPRE (score 0):
- Entretenimento: cinema, Oscar, séries, TV, celebridades, fofocas, cultura pop, livros/romances
- Esportes: futebol, F1, MMA, olimpíadas
- Fait divers: crimes individuais, acidentes, mortes de personalidades, transferências de presídio
- Política do dia-a-dia: candidaturas, pesquisas eleitorais, bastidores políticos, disputas partidárias SEM impacto em políticas públicas
- Economia genérica: mercado financeiro, investimentos, imposto de renda, portfólios, dicas financeiras
- Internacional genérico: eleições em outros países, conflitos militares, a menos que impactem diretamente o Brasil nos 4 pilares
- Saúde/farmácia: medicamentos, hospitais, gestão hospitalar (exceto se conectado a política pública de saúde)
- Lifestyle: receitas, chás, bem-estar, pets, jardinagem, decoração
- Tecnologia de consumo: lançamento de gadgets, reviews de produtos, ofertas

ACEITE APENAS se o artigo contribui para ENTENDER ou TRANSFORMAR um dos 4 pilares. Artigos genéricos que apenas MENCIONAM um tema não são suficientes.

${feedbackContext ? `\n## CONTEXTO DE FEEDBACK DO USUÁRIO (use para calibrar sua classificação):\n${feedbackContext}` : ""}`;

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
                  content: systemPrompt,
                },
                {
                  role: "user",
                  content: text,
                },
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
