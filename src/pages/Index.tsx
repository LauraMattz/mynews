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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  RefreshCw, Search, Newspaper, ThumbsDown,
  Inbox, SlidersHorizontal, Sparkles, Link2, Loader2 } from
"lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TriageSkeletons } from "@/components/SkeletonCards";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    triageQuery, statsQuery, fetchNews, isFetching, fetchProgress,
    summarizeArticles, isSummarizing, summarizeProgress,
    approveArticle, rejectArticle
  } = useArticles();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [linkInput, setLinkInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [fetchLimit, setFetchLimit] = useState<string>("");
  const [fetchPopoverOpen, setFetchPopoverOpen] = useState(false);

  const handlePasteLink = async () => {
    if (!linkInput.trim()) return;
    setIsGenerating(true);
    try {
      const { data: inserted, error: insertErr } = await supabase.
      from("articles").
      upsert(
        { link: linkInput.trim(), title: "Carregando...", source_name: "Link manual" },
        { onConflict: "link", ignoreDuplicates: false }
      ).
      select("id, title, description").
      single();
      if (insertErr) throw insertErr;

      const { data, error } = await supabase.functions.invoke("summarize-news", {
        body: {
          articles: [
          { id: inserted.id, title: inserted.title, description: inserted.description || linkInput }]

        }
      });
      if (error) throw error;
      if (data.summaries?.length > 0) {
        await supabase.from("articles").update({ summary: data.summaries[0].summary }).eq("id", inserted.id);
      }

      queryClient.invalidateQueries({ queryKey: ["summarized-articles"] });
      queryClient.invalidateQueries({ queryKey: ["article-stats"] });
      setLinkInput("");
      setLinkDialogOpen(false);
      toast({ title: "Resumo gerado com sucesso!" });
    } catch (e) {
      toast({
        title: "Erro ao gerar resumo",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const stats = statsQuery.data;
  const triageArticles = triageQuery.data || [];

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return triageArticles.filter((a) => {
      return !s ||
      a.title.toLowerCase().includes(s) ||
      a.description?.toLowerCase().includes(s) ||
      a.source_name?.toLowerCase().includes(s);
    });
  }, [triageArticles, search]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);else
      next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((a) => a.id)));
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
      description: "Feedback registrado para melhorar recomendações."
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - mobile-first compact */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-primary flex items-center justify-center shadow-sm shrink-0">
                <Newspaper className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">MyNews</h1>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight truncate">
                  Curadoria inteligente · <a href="https://www.linkedin.com/in/lauramattosc/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Criado por Laura Mattos</a>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <ThemeToggle />
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 h-8 px-2 sm:px-3">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span className="hidden sm:inline">Filtros</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-primary" />
                      Filtros, Tópicos e Feeds
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <FilterTermsEditor />
                    <TopicManager />
                    <FeedManager />
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 h-8 px-2 sm:px-3">
                    <Link2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Link</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-primary" />
                      Colar link e gerar resumo
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Cole o link aqui..."
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handlePasteLink()}
                      disabled={isGenerating}
                      className="h-9 text-sm" />
                    
                    <Button onClick={handlePasteLink} disabled={isGenerating || !linkInput.trim()} className="h-9 px-3 shrink-0">
                      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      <span className="ml-1">Gerar</span>
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Popover open={fetchPopoverOpen} onOpenChange={setFetchPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    disabled={isFetching}
                    size="sm"
                    className="gap-1 h-8 px-2 sm:px-3 shadow-sm">
                    
                    <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                    <span className="hidden sm:inline">Buscar</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="end">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Limite de artigos</label>
                      <Input
                        type="number"
                        placeholder="Todos"
                        min={1}
                        max={500}
                        value={fetchLimit}
                        onChange={(e) => setFetchLimit(e.target.value)}
                        className="h-8 text-sm" />
                      
                      <p className="text-[10px] text-muted-foreground">Deixe vazio para trazer todos.</p>
                    </div>
                    <Button
                      onClick={() => {
                        const limit = fetchLimit ? parseInt(fetchLimit) : undefined;
                        fetchNews(limit);
                        setFetchPopoverOpen(false);
                      }}
                      disabled={isFetching}
                      size="sm"
                      className="w-full gap-1.5">
                      
                      <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
                      Buscar Notícias
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-5 space-y-4 sm:space-y-5">
        {/* Progress */}
        <PipelineProgress fetchProgress={fetchProgress} summarizeProgress={summarizeProgress} />

        {/* Stats */}
        {stats &&
        <StatsBar
          activeFeeds={stats.activeFeeds}
          totalArticles={stats.totalArticles}
          sentToNewsletter={stats.sentToNewsletter}
          pendingTriage={stats.pendingTriage} />

        }

        {/* Tabs */}
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar artigos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 sm:h-10 text-sm" />
          
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={filtered.length > 0 && selected.size === filtered.length}
              onCheckedChange={toggleSelectAll} />
            
            <span className="text-xs sm:text-sm text-muted-foreground">
              {selected.size > 0 ? `${selected.size} sel.` : `${filtered.length} artigos`}
            </span>
          </div>
          {selected.size > 0 &&
          <div className="flex items-center gap-2">
              <Button
              onClick={() => {
                const ids = Array.from(selected);
                summarizeArticles(ids);
                setSelected(new Set());
                toast({ title: `Gerando resumo de ${ids.length} artigos...` });
              }}
              size="sm"
              variant="outline"
              disabled={isSummarizing}
              className="gap-1 text-xs h-8 text-primary hover:text-primary border-primary/30">
              
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Resumir</span> {selected.size}
              </Button>
              <Button
              onClick={handleBulkDiscard}
              size="sm"
              variant="outline"
              className="gap-1 text-xs h-8 text-destructive hover:text-destructive border-destructive/30">
              
                <ThumbsDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Descartar</span> {selected.size}
              </Button>
            </div>
          }
        </div>

        {/* Articles */}
        <div className="space-y-2 sm:space-y-3">
          {filtered.map((article) =>
          <TriageCard
            key={article.id}
            article={article}
            selected={selected.has(article.id)}
            onToggleSelect={toggleSelect}
            onApprove={(id) => approveArticle.mutate(id)}
            onReject={(id) => rejectArticle.mutate(id)}
            onGenerateSummary={(id) => summarizeArticles([id])}
            isSummarizing={isSummarizing} />

          )}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && !triageQuery.isLoading &&
        <div className="text-center py-16 sm:py-20 space-y-3">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <Inbox className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground/40" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-muted-foreground">Nenhum artigo para triar</h2>
              <p className="text-xs sm:text-sm text-muted-foreground/70 mt-1 max-w-sm mx-auto">
                {triageArticles.length === 0 ?
              'Clique em "Buscar Notícias" para coletar artigos.' :
              "Tente ajustar os filtros."}
              </p>
            </div>
            {triageArticles.length === 0 &&
          <Button onClick={() => fetchNews()} disabled={isFetching} className="gap-1.5">
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                Buscar Notícias
              </Button>
          }
          </div>
        }

        {triageQuery.isLoading &&
        <TriageSkeletons count={5} />
        }
      </main>
    </div>);

};

export default Index;