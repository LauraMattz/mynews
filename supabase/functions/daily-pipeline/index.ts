import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Same blocklist/relevance as frontend
const BLOCKLIST_TERMS = [
  "horóscopo", "horoscopo", "tarot", "signo", "signos", "astrologia",
  "previsão para os signos", "previsão para os 12 signos", "fase da lua",
  "lua hoje", "mapa astral",
  "patrocinado", "publipost", "publieditorial", "branded content",
  "oferta", "cupom", "desconto exclusivo", "black friday",
  "compre agora", "link de afiliado", "sorteio", "em oferta",
  "bbb 26", "bbb 25", "big brother", "reality show",
  "fofoca", "celebridade", "ex-namorada de", "ex-namorado de",
  "ivete sangalo", "larissa manoela", "ticiane pinheiro",
  "solange couto", "leo lins", "andré frambach",
  "fórmula 1", "formula 1", "gp da austr", "arnold classic",
  "fisiculturismo", "campeonato paulista", "palmeiras",
  "futebol ao vivo", "jogos de hoje", "onde assistir",
  "men's physique", "bikini", "bodybuilding",
  "receita de", "dieta de", "emagreça",
  "ar-condicionado", "leite de vaca para gato",
  "água quente pode congelar", "motor turbo",
  "mouse attack shark",
  "arrastado por enxurrada", "enxurrada em",
  "temporal em", "temporais devem",
  "morte de apresentador", "anuncia morte",
  "iate de luxo", "vorcaro gastou",
  "academia pioneira", "gaviões 24h",
  "grande sertão, 70", "guimarães rosa",
  "assembleia de especialistas do irã",
  "líder supremo do irã", "khamenei",
  "colonos israelenses", "cisjordânia",
  "bombardeios", "beirute",
  "guerra no oriente médio",
];

const RELEVANCE_TERMS = [
  "tecnologia", "tech", "digital", "inteligência artificial", "ia ", " ia,", " ia.",
  "software", "hardware", "dados", "algoritmo", "startup", "inovação",
  "cibersegurança", "internet", "plataforma", "automação", "robô",
  "machine learning", "deep learning", "computação", "nuvem", "cloud",
  "5g", "semicondutor", "chip", "blockchain", "metaverso",
  "acessibilidade digital", "inclusão digital", "transformação digital",
  "apagão de internet", "tecnoabsolutismo",
  "educação", "ensino", "escola", "universidade", "professor", "aluno",
  "aprendizagem", "pedagog", "currículo", "enem", "vestibular",
  "pesquisa", "pesquisador", "ciência", "científic", "acadêmic",
  "doutorado", "mestrado", "bolsa de estudo", "capes", "cnpq",
  "analfabet", "letramento", "formação", "capacitação",
  "liderança", "líder", "gestão", "governança", "política pública",
  "governo", "congresso", "senado", "câmara", "ministro", "presidente",
  "reforma", "regulação", "legislação", "lei ", "projeto de lei",
  "democracia", "direitos", "constituição", "supremo", "stf",
  "eleição", "eleições", "voto", "mandate",
  "equidade racial", "racismo", "racial", "negro", "negra", "preto", "preta",
  "quilombo", "afro", "antirracis", "discriminação",
  "diversidade", "inclusão", "igualdade", "gênero",
  "feminismo", "feminicídio", "violência contra a mulher", "violência doméstica",
  "mulher", "mulheres", "desigualdade", "vulnerável", "vulnerabilidade",
  "favela", "periferia", "comunidade", "direitos humanos",
  "trabalho", "emprego", "salário", "renda", "pobreza",
  "saúde pública", "sus", "acesso", "política social",
  "bpc", "deficiência",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const log: string[] = [];

    // Step 1: Fetch feeds
    const { data: feeds } = await supabase.from("feeds").select("id, url, name").eq("is_active", true);
    if (!feeds || feeds.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No active feeds" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    log.push(`Found ${feeds.length} active feeds`);

    // Step 2: Call fetch-news function
    const fetchResp = await fetch(`${SUPABASE_URL}/functions/v1/fetch-news`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ feeds: feeds.map(f => ({ url: f.url, name: f.name })) }),
    });
    const fetchData = await fetchResp.json();
    if (!fetchData.success) throw new Error(fetchData.error);
    log.push(`Fetched ${fetchData.items.length} raw items`);

    // Step 3: Filter with blocklist + relevance
    const filtered = fetchData.items.filter((item: any) => {
      const text = `${item.title} ${item.description || ""}`.toLowerCase();
      if (BLOCKLIST_TERMS.some(term => text.includes(term))) return false;
      return RELEVANCE_TERMS.some(term => text.includes(term));
    });
    log.push(`After filtering: ${filtered.length} relevant articles`);

    // Step 4: Batch upsert
    const articlesToInsert = filtered.map((item: any) => {
      const feed = feeds.find(f => f.name === item.sourceName);
      return {
        feed_id: feed?.id || null,
        title: item.title,
        link: item.link,
        description: item.description,
        source_name: item.sourceName,
        published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
      };
    });

    let inserted = 0;
    for (let i = 0; i < articlesToInsert.length; i += 50) {
      const batch = articlesToInsert.slice(i, i + 50);
      const { data: insertedData } = await supabase
        .from("articles")
        .upsert(batch, { onConflict: "link", ignoreDuplicates: true })
        .select("id");
      if (insertedData) inserted += insertedData.length;
    }
    log.push(`Inserted/updated ${inserted} articles`);

    // Step 5: Classify pending articles via AI
    const classifyResp = await fetch(`${SUPABASE_URL}/functions/v1/classify-articles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({}),
    });
    const classifyData = await classifyResp.json();
    log.push(`Classified: ${classifyData.classified || 0} articles, ${classifyData.softDeleted || 0} auto-removed`);

    // Step 6: Generate summaries for approved articles without summary
    const { data: unsummarized } = await supabase
      .from("articles")
      .select("id, title, description")
      .eq("is_deleted", false)
      .eq("ai_review_status", "approved")
      .is("summary", null)
      .limit(20);

    if (unsummarized && unsummarized.length > 0) {
      const sumResp = await fetch(`${SUPABASE_URL}/functions/v1/summarize-news`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ articles: unsummarized }),
      });
      const sumData = await sumResp.json();
      if (sumData.success && sumData.summaries) {
        for (const s of sumData.summaries) {
          await supabase.from("articles").update({ summary: s.summary }).eq("id", s.id);
        }
        log.push(`Generated ${sumData.summaries.length} summaries`);
      }
    } else {
      log.push("No unsummarized approved articles");
    }

    // Step 7: Soft-delete articles older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { count } = await supabase
      .from("articles")
      .update({ is_deleted: true })
      .eq("is_deleted", false)
      .lt("published_at", sevenDaysAgo.toISOString())
      .select("id", { count: "exact", head: true });
    log.push(`Archived ${count || 0} articles older than 7 days`);

    console.log("Daily pipeline:", log.join(" | "));

    return new Response(
      JSON.stringify({ success: true, log }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("daily-pipeline error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
