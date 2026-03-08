import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export function useArticles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFetching, setIsFetching] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const articlesQuery = useQuery({
    queryKey: ["articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*, feeds(name, topic_id, topics(name)), votes(vote)")
        .eq("is_deleted", false)
        .order("relevance_score", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const fetchNews = async () => {
    setIsFetching(true);
    try {
      // Get active feeds
      const { data: feeds, error: feedsError } = await supabase
        .from("feeds")
        .select("id, url, name")
        .eq("is_active", true);
      
      if (feedsError) throw feedsError;
      if (!feeds || feeds.length === 0) {
        toast({ title: "Nenhum feed ativo", description: "Adicione e ative feeds primeiro.", variant: "destructive" });
        return;
      }

      // Call edge function
      const { data, error } = await supabase.functions.invoke("fetch-news", {
        body: { feeds: feeds.map(f => ({ url: f.url, name: f.name })) },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Insert articles (skip duplicates via unique link constraint)
      let inserted = 0;
      for (const item of data.items) {
        const feed = feeds.find(f => f.name === item.sourceName);
        const { error: insertError } = await supabase.from("articles").insert({
          feed_id: feed?.id || null,
          title: item.title,
          link: item.link,
          description: item.description,
          source_name: item.sourceName,
          published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
        });
        if (!insertError) inserted++;
      }

      queryClient.invalidateQueries({ queryKey: ["articles"] });
      toast({
        title: "Notícias atualizadas!",
        description: `${inserted} novos artigos de ${feeds.length} feeds. ${data.errors?.length || 0} erros.`,
      });
    } catch (e) {
      toast({ title: "Erro ao buscar notícias", description: e instanceof Error ? e.message : "Erro desconhecido", variant: "destructive" });
    } finally {
      setIsFetching(false);
    }
  };

  const summarizeArticles = async (articleIds: string[]) => {
    setIsSummarizing(true);
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

      const { data, error } = await supabase.functions.invoke("summarize-news", {
        body: { articles },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Update articles with summaries
      for (const s of data.summaries) {
        await supabase.from("articles").update({ summary: s.summary }).eq("id", s.id);
      }

      queryClient.invalidateQueries({ queryKey: ["articles"] });
      toast({ title: `${data.summaries.length} resumos gerados!` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast({ title: "Erro ao gerar resumos", description: msg, variant: "destructive" });
    } finally {
      setIsSummarizing(false);
    }
  };

  const vote = useMutation({
    mutationFn: async ({ article_id, voteValue }: { article_id: string; voteValue: 1 | -1 }) => {
      const { error } = await supabase
        .from("votes")
        .upsert({ article_id, vote: voteValue }, { onConflict: "article_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    },
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("articles").update({ is_deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    },
  });

  return { articlesQuery, fetchNews, isFetching, summarizeArticles, isSummarizing, vote, softDelete };
}
