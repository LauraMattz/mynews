import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string | null;
  sourceName: string;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function parseRSS(xml: string, sourceName: string): FeedItem[] {
  const items: FeedItem[] = [];
  
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    
    const title = decodeHtmlEntities(itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() || '');
    const link = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() || '';
    const rawDesc = itemXml.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '').trim() || '';
    const description = decodeHtmlEntities(rawDesc);
    const pubDate = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || null;
    
    if (title && link) {
      items.push({ title, link, description: description.slice(0, 500), pubDate, sourceName });
    }
  }
  
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  while ((match = entryRegex.exec(xml)) !== null) {
    const entryXml = match[1];
    
    const title = decodeHtmlEntities(entryXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() || '');
    const link = entryXml.match(/<link[^>]*href="([^"]*)"[^>]*\/?>/i)?.[1]?.trim() ||
                 entryXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim() || '';
    const rawSummary = entryXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '').trim() || '';
    const summary = decodeHtmlEntities(rawSummary);
    const updated = entryXml.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1]?.trim() ||
                    entryXml.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1]?.trim() || null;
    
    if (title && link) {
      items.push({ title, link, description: summary.slice(0, 500), pubDate: updated, sourceName });
    }
  }
  
  return items;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { feeds } = await req.json();
    
    if (!feeds || !Array.isArray(feeds) || feeds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "feeds array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allItems: FeedItem[] = [];
    const errors: string[] = [];

    // Fetch all feeds in parallel
    const results = await Promise.allSettled(
      feeds.map(async (feed: { url: string; name: string }) => {
        try {
          const response = await fetch(feed.url, {
            headers: { "User-Agent": "NewsAggregator/1.0" },
          });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          // Handle encoding: try to detect charset from content-type header
          const contentType = response.headers.get("content-type") || "";
          let xml: string;
          if (contentType.includes("iso-8859-1") || contentType.includes("latin1") || contentType.includes("windows-1252")) {
            const buffer = await response.arrayBuffer();
            xml = new TextDecoder("iso-8859-1").decode(buffer);
          } else {
            xml = await response.text();
          }
          return parseRSS(xml, feed.name);
        } catch (e) {
          errors.push(`${feed.name}: ${e instanceof Error ? e.message : 'Unknown error'}`);
          return [];
        }
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        allItems.push(...result.value);
      }
    }

    console.log(`Fetched ${allItems.length} items from ${feeds.length} feeds. Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({ success: true, items: allItems, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("fetch-news error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
