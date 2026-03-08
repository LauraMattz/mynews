import { useState } from "react";
import { useArticles } from "@/hooks/useArticles";
import { TopicManager } from "@/components/TopicManager";
import { FeedManager } from "@/components/FeedManager";
import { ArticleCard } from "@/components/ArticleCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Sparkles, Search, Newspaper, Settings2 } from "lucide-react";

const Index = () => {
  const { articlesQuery, fetchNews, isFetching, summarizeArticles, isSummarizing, vote, softDelete } = useArticles();
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());

  const articles = articlesQuery.data || [];

  // Filter articles
  const filtered = articles.filter(a => {
    const matchesSearch = !search || 
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.description?.toLowerCase().includes(search.toLowerCase()) ||
      a.source_name?.toLowerCase().includes(search.toLowerCase());
    const matchesTopic = !topicFilter || (a.feeds?.topics as any)?.name === topicFilter;
    return matchesSearch && matchesTopic;
  });

  // Get unique topics from articles
  const topics = [...new Set(articles.map(a => (a.feeds?.topics as any)?.name).filter(Boolean))];

  const handleSummarizeAll = () => {
    const ids = selectedArticles.size > 0
      ? Array.from(selectedArticles)
      : filtered.filter(a => !a.summary).map(a => a.id);
    if (ids.length > 0) summarizeArticles(ids);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b">
        <div className="container max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                <Newspaper className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">NewsFlow</h1>
                <p className="text-xs text-muted-foreground">Curadoria inteligente de notícias</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="gap-1.5"
              >
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Configurar</span>
              </Button>
              <Button
                onClick={fetchNews}
                disabled={isFetching}
                size="sm"
                className="gap-1.5"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                Buscar Notícias
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Settings panel */}
        {showSettings && (
          <div className="space-y-4 animate-fade-in">
            <TopicManager />
            <FeedManager />
          </div>
        )}

        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar artigos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={!topicFilter ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setTopicFilter(null)}
            >
              Todos
            </Badge>
            {topics.map(t => (
              <Badge
                key={t}
                variant={topicFilter === t ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setTopicFilter(topicFilter === t ? null : t)}
              >
                {t}
              </Badge>
            ))}
          </div>
        </div>

        {/* Bulk actions */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filtered.length} artigos {topicFilter && `em "${topicFilter}"`}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSummarizeAll}
              disabled={isSummarizing}
              className="gap-1.5"
            >
              <Sparkles className={`h-4 w-4 ${isSummarizing ? "animate-pulse" : ""}`} />
              {isSummarizing ? "Gerando resumos..." : `Resumir ${selectedArticles.size > 0 ? "selecionados" : "todos"}`}
            </Button>
          </div>
        )}

        {/* Articles */}
        <div className="space-y-3">
          {filtered.map(article => (
            <ArticleCard
              key={article.id}
              article={article}
              onVote={(id, v) => vote.mutate({ article_id: id, voteValue: v })}
              onDelete={id => softDelete.mutate(id)}
              onSummarize={id => summarizeArticles([id])}
              isSummarizing={isSummarizing}
            />
          ))}
        </div>

        {filtered.length === 0 && !articlesQuery.isLoading && (
          <div className="text-center py-16 space-y-3">
            <Newspaper className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <h2 className="text-lg font-medium text-muted-foreground">Nenhum artigo encontrado</h2>
            <p className="text-sm text-muted-foreground/70">
              Configure seus feeds e clique em "Buscar Notícias" para começar.
            </p>
            <Button variant="outline" onClick={() => setShowSettings(true)}>
              <Settings2 className="h-4 w-4 mr-2" />
              Configurar Feeds
            </Button>
          </div>
        )}

        {articlesQuery.isLoading && (
          <div className="text-center py-16">
            <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">Carregando artigos...</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
