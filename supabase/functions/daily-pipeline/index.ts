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

    // Step 3: Load filter terms from DB
    const { data: filterTerms } = await supabase.from("filter_terms").select("term, type");
    const BLOCKLIST_TERMS = (filterTerms || []).filter(t => t.type === "blocklist").map(t => t.term.toLowerCase());
    const RELEVANCE_TERMS = (filterTerms || []).filter(t => t.type === "relevance").map(t => t.term.toLowerCase());
    log.push(`Loaded ${BLOCKLIST_TERMS.length} blocklist + ${RELEVANCE_TERMS.length} relevance terms from DB`);

    // Step 4: Filter with blocklist + relevance
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
