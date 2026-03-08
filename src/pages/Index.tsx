import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useArticles } from "@/hooks/useArticles";
import { TopicManager } from "@/components/TopicManager";
import { FeedManager } from "@/components/FeedManager";
import { FilterTermsEditor } from "@/components/FilterTermsEditor";
import { TriageCard } from "@/components/TriageCard";
import { StatsBar } from "@/components/StatsBar";
import { PipelineProgress } from "@/components/PipelineProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw, Search, Newspaper, FileText, ThumbsDown,
  Inbox, SlidersHorizontal,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    triageQuery, statsQuery, fetchNews, isFetching, fetchProgress,
    summarizeArticles, isSummarizing, summarizeProgress,
    approveArticle, rejectArticle,
  } = useArticles();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("triagem");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const stats = statsQuery.data;
  const triageArticles = triageQuery.data || [];

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return triageArticles.filter(a => {
      return !s ||
        a.title.toLowerCase().includes(s) ||
        a.description?.toLowerCase().includes(s) ||
        a.source_name?.toLowerCase().includes(s);
    });
  }, [triageArticles, search]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(a => a.id)));
    }
  };

  const handleBulkDiscard = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    for (const id of ids) {
      rejectArticle.mutate(id);
    }
    setSelected(new Set());
    toast({
      title: `${ids.length} artigos descartados`,
      description: "Feedback registrado para melhorar recomendações.",
    });
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
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Curadoria inteligente de notícias · Feito por{" "}
                  <a href="https://www.linkedin.com/in/lauramattosc/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Vibe Code Laura Mattos
                  </a>
                </p>
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
            pendingTriage={stats.pendingTriage}
          />
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="triagem" className="gap-1.5">
              <Inbox className="h-4 w-4" />
              Triagem
              {triageArticles.length > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 text-[10px] px-1.5 ml-1">
                  {triageArticles.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="filtros" className="gap-1.5">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
            </TabsTrigger>
          </TabsList>

          {/* Triagem tab */}
          <TabsContent value="triagem" className="space-y-4 mt-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar artigos..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    {selected.size > 0 ? `${selected.size} selecionados` : `${filtered.length} artigos`}
                  </span>
                </div>
              </div>
              {selected.size > 0 && (
                <Button
                  onClick={handleBulkDiscard}
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-destructive hover:text-destructive border-destructive/30"
                >
                  <ThumbsDown className="h-4 w-4" />
                  Descartar {selected.size} selecionados
                </Button>
              )}
            </div>

            {/* Articles */}
            <div className="space-y-3">
              {filtered.map(article => (
                <TriageCard
                  key={article.id}
                  article={article}
                  selected={selected.has(article.id)}
                  onToggleSelect={toggleSelect}
                  onApprove={id => approveArticle.mutate(id)}
                  onReject={id => rejectArticle.mutate(id)}
                  onGenerateSummary={id => summarizeArticles([id])}
                  isSummarizing={isSummarizing}
                />
              ))}
            </div>

            {/* Empty state */}
            {filtered.length === 0 && !triageQuery.isLoading && (
              <div className="text-center py-20 space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                  <Inbox className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-muted-foreground">Nenhum artigo para triar</h2>
                  <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm mx-auto">
                    {triageArticles.length === 0
                      ? 'Clique em "Buscar Notícias" para coletar artigos.'
                      : "Tente ajustar os filtros."}
                  </p>
                </div>
                {triageArticles.length === 0 && (
                  <Button onClick={fetchNews} disabled={isFetching} className="gap-1.5">
                    <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                    Buscar Notícias
                  </Button>
                )}
              </div>
            )}

            {triageQuery.isLoading && (
              <div className="text-center py-20">
                <RefreshCw className="h-8 w-8 text-muted-foreground/40 animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground mt-3">Carregando artigos...</p>
              </div>
            )}
          </TabsContent>

          {/* Filtros tab */}
          <TabsContent value="filtros" className="space-y-4 mt-4">
            <FilterTermsEditor />
            <TopicManager />
            <FeedManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
