import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useCallback } from "react";

// Blocklist: terms that indicate off-topic/commercial content
const BLOCKLIST_TERMS = [
  "horóscopo", "horoscopo", "tarot", "signo", "signos", "astrologia",
  "previsão para os signos", "previsão para os 12 signos",
  "patrocinado", "publipost", "publieditorial", "branded content",
  "oferta", "cupom", "desconto exclusivo", "black friday",
  "compre agora", "link de afiliado", "sorteio",
  "receita de", "dieta de", "emagreça",
];

export interface FetchProgress {
  stage: "idle" | "fetching_feeds" | "parsing" | "saving" | "done";
  message: string;
  percent: number;
}

export interface SummarizeProgress {
  stage: "idle" | "loading" | "summarizing" | "saving" | "done";
  message: string;
  current: number;
  total: number;
}

export function useArticles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFetching, setIsFetching] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [fetchProgress, setFetchProgress] = useState<FetchProgress>({ stage: "idle", message: "", percent: 0 });
  const [summarizeProgress, setSummarizeProgress] = useState<SummarizeProgress>({ stage: "idle", message: "", current: 0, total: 0 });

  const articlesQuery = useQuery({
    queryKey: ["articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*, feeds(name, topic_id, topics(name)), votes(vote)")
        .eq("is_deleted", false)
        .order("relevance_score", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const statsQuery = useQuery({
    queryKey: ["article-stats"],
    queryFn: async () => {
      const [
        { count: totalArticles },
        { count: summarizedArticles },
        { count: activeFeeds },
        { data: avgData },
      ] = await Promise.all([
        supabase.from("articles").select("*", { count: "exact", head: true }).eq("is_deleted", false),
        supabase.from("articles").select("*", { count: "exact", head: true }).eq("is_deleted", false).not("summary", "is", null),
        supabase.from("feeds").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("articles").select("relevance_score").eq("is_deleted", false).not("relevance_score", "eq", 0),
      ]);
      const avgScore = avgData && avgData.length > 0
        ? avgData.reduce((sum, a) => sum + a.relevance_score, 0) / avgData.length
        : 0;
      return {
        totalArticles: totalArticles || 0,
        summarizedArticles: summarizedArticles || 0,
        activeFeeds: activeFeeds || 0,
        avgRelevanceScore: Math.round(avgScore * 10) / 10,
        votedArticles: avgData?.length || 0,
      };
    },
  });

  const fetchNews = useCallback(async () => {
    setIsFetching(true);
    setFetchProgress({ stage: "fetching_feeds", message: "Buscando lista de feeds ativos...", percent: 10 });
    try {
      const { data: feeds, error: feedsError } = await supabase
        .from("feeds")
        .select("id, url, name")
        .eq("is_active", true);
      
      if (feedsError) throw feedsError;
      if (!feeds || feeds.length === 0) {
        toast({ title: "Nenhum feed ativo", description: "Adicione e ative feeds primeiro.", variant: "destructive" });
        return;
      }

      setFetchProgress({ stage: "parsing", message: `Buscando notícias de ${feeds.length} feeds...`, percent: 30 });

      const { data, error } = await supabase.functions.invoke("fetch-news", {
        body: { feeds: feeds.map(f => ({ url: f.url, name: f.name })) },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setFetchProgress({ stage: "saving", message: `Salvando ${data.items.length} artigos...`, percent: 70 });

      // Batch insert - much faster than individual inserts
      const articlesToInsert = data.items.map((item: any) => {
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

      // Insert in batches of 50, ignoring duplicates
      let inserted = 0;
      const batchSize = 50;
      for (let i = 0; i < articlesToInsert.length; i += batchSize) {
        const batch = articlesToInsert.slice(i, i + batchSize);
        const { data: insertedData, error: insertError } = await supabase
          .from("articles")
          .upsert(batch, { onConflict: "link", ignoreDuplicates: true })
          .select("id");
        if (!insertError && insertedData) inserted += insertedData.length;
        setFetchProgress({
          stage: "saving",
          message: `Salvando artigos... (${Math.min(i + batchSize, articlesToInsert.length)}/${articlesToInsert.length})`,
          percent: 70 + ((i / articlesToInsert.length) * 25),
        });
      }

      setFetchProgress({ stage: "done", message: "Concluído!", percent: 100 });

      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["article-stats"] });
      toast({
        title: "Notícias atualizadas!",
        description: `${inserted} novos artigos de ${feeds.length} feeds. ${data.errors?.length || 0} erros.`,
      });
    } catch (e) {
      toast({ title: "Erro ao buscar notícias", description: e instanceof Error ? e.message : "Erro desconhecido", variant: "destructive" });
    } finally {
      setIsFetching(false);
      setTimeout(() => setFetchProgress({ stage: "idle", message: "", percent: 0 }), 2000);
    }
  }, [queryClient, toast]);

  const summarizeArticles = useCallback(async (articleIds: string[]) => {
    setIsSummarizing(true);
    setSummarizeProgress({ stage: "loading", message: "Carregando artigos...", current: 0, total: articleIds.length });
    try {
      const { data: articles } = await supabase
        .from("articles")
        .select("id, title, description")
        .in("id", articleIds)
        .is("summary", null);

      if (!articles || articles.length === 0) {
        toast({ title: "Todos os artigos já possuem resumo" });
        return;
      }

      setSummarizeProgress({ stage: "summarizing", message: `Gerando resumos com IA...`, current: 0, total: articles.length });

      const { data, error } = await supabase.functions.invoke("summarize-news", {
        body: { articles },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setSummarizeProgress({ stage: "saving", message: "Salvando resumos...", current: data.summaries.length, total: articles.length });

      // Batch update summaries
      for (const s of data.summaries) {
        await supabase.from("articles").update({ summary: s.summary }).eq("id", s.id);
      }

      setSummarizeProgress({ stage: "done", message: "Concluído!", current: data.summaries.length, total: articles.length });

      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["article-stats"] });
      toast({ title: `${data.summaries.length} resumos gerados!` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast({ title: "Erro ao gerar resumos", description: msg, variant: "destructive" });
    } finally {
      setIsSummarizing(false);
      setTimeout(() => setSummarizeProgress({ stage: "idle", message: "", current: 0, total: 0 }), 2000);
    }
  }, [queryClient, toast]);

  const vote = useMutation({
    mutationFn: async ({ article_id, voteValue }: { article_id: string; voteValue: 1 | -1 }) => {
      const { error } = await supabase
        .from("votes")
        .upsert({ article_id, vote: voteValue }, { onConflict: "article_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["article-stats"] });
    },
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("articles").update({ is_deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["article-stats"] });
    },
  });

  return {
    articlesQuery,
    statsQuery,
    fetchNews,
    isFetching,
    fetchProgress,
    summarizeArticles,
    isSummarizing,
    summarizeProgress,
    vote,
    softDelete,
  };
}
