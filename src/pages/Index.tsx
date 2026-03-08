import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useArticles } from "@/hooks/useArticles";
import { TopicManager } from "@/components/TopicManager";
import { FeedManager } from "@/components/FeedManager";
import { ArticleCard } from "@/components/ArticleCard";
import { StatsBar } from "@/components/StatsBar";
import { PipelineProgress } from "@/components/PipelineProgress";
import { PipelinePage } from "@/components/PipelinePage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Sparkles, Search, Newspaper, Settings2, GitBranch, LayoutDashboard, FileText, Trash2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const {
    articlesQuery, statsQuery, fetchNews, isFetching, fetchProgress,
    summarizeArticles, isSummarizing, summarizeProgress, vote, softDelete,
    cleanupIrrelevant,
  } = useArticles();
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  const articles = articlesQuery.data || [];
  const stats = statsQuery.data;

  // Debounced-style filtering with useMemo
  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return articles.filter(a => {
      const matchesSearch = !s ||
        a.title.toLowerCase().includes(s) ||
        a.description?.toLowerCase().includes(s) ||
        a.source_name?.toLowerCase().includes(s);
      const matchesTopic = !topicFilter || (a.feeds?.topics as any)?.name === topicFilter;
      return matchesSearch && matchesTopic;
    });
  }, [articles, search, topicFilter]);

  const topics = useMemo(
    () => [...new Set(articles.map(a => (a.feeds?.topics as any)?.name).filter(Boolean))],
    [articles]
  );

  const unsummarizedCount = filtered.filter(a => !a.summary).length;

  const handleSummarizeAll = () => {
    const ids = filtered.filter(a => !a.summary).map(a => a.id);
    if (ids.length > 0) summarizeArticles(ids);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b">
        <div className="container max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                <Newspaper className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">NewsFlow</h1>
                <p className="text-[11px] text-muted-foreground leading-tight">Curadoria inteligente de notícias</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => navigate("/resumos")}
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Resumos</span>
              </Button>
              <Button
                onClick={fetchNews}
                disabled={isFetching}
                size="sm"
                className="gap-1.5 shadow-sm"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Buscar Notícias</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-5 space-y-5">
        {/* Progress */}
        <PipelineProgress fetchProgress={fetchProgress} summarizeProgress={summarizeProgress} />

        {/* Stats */}
        {stats && (
          <StatsBar
            activeFeeds={stats.activeFeeds}
            totalArticles={stats.totalArticles}
            summarizedArticles={stats.summarizedArticles}
            avgRelevanceScore={stats.avgRelevanceScore}
          />
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="dashboard" className="gap-1.5">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-1.5">
              <GitBranch className="h-4 w-4" />
              <span className="hidden sm:inline">Pipeline</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Configurar</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard tab */}
          <TabsContent value="dashboard" className="space-y-4 mt-4">
            {/* Search and filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar artigos por título, descrição ou fonte..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={!topicFilter ? "default" : "outline"}
                  className="cursor-pointer transition-all"
                  onClick={() => setTopicFilter(null)}
                >
                  Todos ({articles.length})
                </Badge>
                {topics.map(t => {
                  const count = articles.filter(a => (a.feeds?.topics as any)?.name === t).length;
                  return (
                    <Badge
                      key={t}
                      variant={topicFilter === t ? "default" : "outline"}
                      className="cursor-pointer transition-all"
                      onClick={() => setTopicFilter(topicFilter === t ? null : t)}
                    >
                      {t} ({count})
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Bulk actions */}
            {filtered.length > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {filtered.length} artigos
                  {topicFilter && ` em "${topicFilter}"`}
                  {unsummarizedCount > 0 && ` · ${unsummarizedCount} sem resumo`}
                </p>
                {unsummarizedCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSummarizeAll}
                    disabled={isSummarizing}
                    className="gap-1.5"
                  >
                    <Sparkles className={`h-4 w-4 ${isSummarizing ? "animate-pulse" : ""}`} />
                    {isSummarizing ? "Gerando..." : `Resumir todos (${unsummarizedCount})`}
                  </Button>
                )}
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

            {/* Empty state */}
            {filtered.length === 0 && !articlesQuery.isLoading && (
              <div className="text-center py-20 space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                  <Newspaper className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-muted-foreground">Nenhum artigo encontrado</h2>
                  <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm mx-auto">
                    {articles.length === 0
                      ? "Clique em \"Buscar Notícias\" para começar a coletar artigos dos seus feeds."
                      : "Tente ajustar os filtros de busca ou tópico."}
                  </p>
                </div>
                {articles.length === 0 && (
                  <Button onClick={fetchNews} disabled={isFetching} className="gap-1.5">
                    <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                    Buscar Notícias
                  </Button>
                )}
              </div>
            )}

            {articlesQuery.isLoading && (
              <div className="text-center py-20">
                <RefreshCw className="h-8 w-8 text-muted-foreground/40 animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground mt-3">Carregando artigos...</p>
              </div>
            )}
          </TabsContent>

          {/* Pipeline tab */}
          <TabsContent value="pipeline" className="mt-4">
            <PipelinePage />
          </TabsContent>

          {/* Settings tab */}
          <TabsContent value="settings" className="space-y-4 mt-4">
            <TopicManager />
            <FeedManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
