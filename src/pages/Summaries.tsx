import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Sparkles, ExternalLink, Link2, Loader2, Send,
  Calendar, Filter, Bot, CheckCircle2, XCircle, Clock,
  Trash2, Search, ShieldCheck, AlertTriangle, Copy, Check,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

function estimateReadingTime(text: string): number {
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

const PILLAR_COLORS: Record<string, string> = {
  tecnologia: "bg-blue-500/10 text-blue-700 border-blue-200",
  educação: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  liderança: "bg-amber-500/10 text-amber-700 border-amber-200",
  equidade_racial: "bg-purple-500/10 text-purple-700 border-purple-200",
};

const PILLAR_LABELS: Record<string, string> = {
  tecnologia: "Tecnologia",
  educação: "Educação",
  liderança: "Liderança",
  equidade_racial: "Equidade Racial",
};

export default function Summaries() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [linkInput, setLinkInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [filterNewsletter, setFilterNewsletter] = useState<"all" | "sent" | "unsent">("all");
  const [filterPillar, setFilterPillar] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "approved" | "pending" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("resumos");

  const { data: articles, isLoading } = useQuery({
    queryKey: ["summarized-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, link, summary, source_name, published_at, sent_to_newsletter, created_at, ai_relevance_tags, ai_relevance_score, ai_review_status, feeds(name, topics(name))")
        .eq("is_deleted", false)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggleNewsletter = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase.from("articles").update({ sent_to_newsletter: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["summarized-articles"] }),
  });

  const softDeleteArticle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("articles").update({ is_deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summarized-articles"] });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["article-stats"] });
    },
  });

  const handleClassifyAll = async () => {
    setIsClassifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("classify-articles", {
        body: {},
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      queryClient.invalidateQueries({ queryKey: ["summarized-articles"] });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      toast({
        title: `Classificação concluída!`,
        description: `${data.approved} aprovados, ${data.rejected} rejeitados, ${data.softDeleted} removidos automaticamente.`,
      });
    } catch (e) {
      toast({
        title: "Erro na classificação",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsClassifying(false);
    }
  };

  const handlePasteLink = async () => {
    if (!linkInput.trim()) return;
    setIsGenerating(true);
    try {
      const { data: inserted, error: insertErr } = await supabase
        .from("articles")
        .upsert(
          { link: linkInput.trim(), title: "Carregando...", source_name: "Link manual" },
          { onConflict: "link", ignoreDuplicates: false }
        )
        .select("id, title, description")
        .single();

      if (insertErr) throw insertErr;

      const { data, error } = await supabase.functions.invoke("summarize-news", {
        body: {
          articles: [
            { id: inserted.id, title: inserted.title, description: inserted.description || linkInput },
          ],
        },
      });

      if (error) throw error;
      if (data.summaries?.length > 0) {
        await supabase
          .from("articles")
          .update({ summary: data.summaries[0].summary })
          .eq("id", inserted.id);
      }

      queryClient.invalidateQueries({ queryKey: ["summarized-articles"] });
      setLinkInput("");
      toast({ title: "Resumo gerado com sucesso!" });
    } catch (e) {
      toast({
        title: "Erro ao gerar resumo",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const allArticles = articles || [];
  const summarized = allArticles.filter(a => a.summary);
  const pendingReview = allArticles.filter(a => (a as any).ai_review_status === "pending");
  const approvedCount = allArticles.filter(a => (a as any).ai_review_status === "approved").length;
  const rejectedCount = allArticles.filter(a => (a as any).ai_review_status === "rejected").length;
  const sentCount = allArticles.filter(a => a.sent_to_newsletter).length;

  const filtered = useMemo(() => {
    let list = activeTab === "resumos"
      ? summarized
      : activeTab === "pendentes"
        ? pendingReview
        : allArticles;

    if (filterNewsletter === "sent") list = list.filter(a => a.sent_to_newsletter);
    if (filterNewsletter === "unsent") list = list.filter(a => !a.sent_to_newsletter);

    if (filterStatus !== "all") {
      list = list.filter(a => (a as any).ai_review_status === filterStatus);
    }

    if (filterPillar) {
      list = list.filter(a => ((a as any).ai_relevance_tags || []).includes(filterPillar));
    }

    if (search) {
      const s = search.toLowerCase();
      list = list.filter(a => 
        a.title.toLowerCase().includes(s) ||
        a.summary?.toLowerCase().includes(s) ||
        a.source_name?.toLowerCase().includes(s)
      );
    }

    return list;
  }, [allArticles, summarized, pendingReview, activeTab, filterNewsletter, filterStatus, filterPillar, search]);

  const pillarStats = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const a of allArticles) {
      for (const tag of ((a as any).ai_relevance_tags || [])) {
        stats[tag] = (stats[tag] || 0) + 1;
      }
    }
    return stats;
  }, [allArticles]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Administração de Resumos</h1>
              <p className="text-xs text-muted-foreground">
                {allArticles.length} artigos · {summarized.length} resumidos · {sentCount} newsletter
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleClassifyAll}
              disabled={isClassifying}
              size="sm"
              variant="outline"
              className="gap-1.5"
            >
              {isClassifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {isClassifying ? "Classificando..." : `Classificar IA (${pendingReview.length})`}
              </span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedCount}</p>
                <p className="text-xs text-muted-foreground">Aprovados IA</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingReview.length}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rejectedCount}</p>
                <p className="text-xs text-muted-foreground">Rejeitados</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Send className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sentCount}</p>
                <p className="text-xs text-muted-foreground">Newsletter</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pillar distribution */}
        {Object.keys(pillarStats).length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">Pilares:</span>
            {Object.entries(pillarStats).map(([tag, count]) => (
              <Badge
                key={tag}
                variant="outline"
                className={`cursor-pointer transition-all ${filterPillar === tag ? PILLAR_COLORS[tag] + " border" : ""}`}
                onClick={() => setFilterPillar(filterPillar === tag ? null : tag)}
              >
                {PILLAR_LABELS[tag] || tag} ({count})
              </Badge>
            ))}
            {filterPillar && (
              <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setFilterPillar(null)}>
                Limpar
              </Button>
            )}
          </div>
        )}

        {/* Paste link */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Colar link e gerar resumo</span>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Cole o link do artigo aqui..."
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasteLink()}
                disabled={isGenerating}
              />
              <Button onClick={handlePasteLink} disabled={isGenerating || !linkInput.trim()}>
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span className="ml-1.5">Gerar</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="resumos" className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              Resumidos ({summarized.length})
            </TabsTrigger>
            <TabsTrigger value="pendentes" className="gap-1.5">
              <Clock className="h-4 w-4" />
              Pendentes ({pendingReview.length})
            </TabsTrigger>
            <TabsTrigger value="todos" className="gap-1.5">
              <Filter className="h-4 w-4" />
              Todos ({allArticles.length})
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, resumo ou fonte..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-1.5">
              {(["all", "approved", "pending", "rejected"] as const).map((s) => (
                <Button
                  key={s}
                  variant={filterStatus === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus(s)}
                  className="text-xs"
                >
                  {s === "all" ? "Todos" : s === "approved" ? "✓ IA" : s === "pending" ? "⏳" : "✗"}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              {(["all", "unsent", "sent"] as const).map((f) => (
                <Button
                  key={f}
                  variant={filterNewsletter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterNewsletter(f)}
                  className="text-xs"
                >
                  {f === "all" ? "📨 Todos" : f === "sent" ? "✓ Enviado" : "Não enviado"}
                </Button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Nenhum artigo encontrado com esses filtros.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((article) => {
                  const cleanTitle = stripHtml(article.title);
                  const topicName = (article as any).feeds?.topics?.name;
                  const readTime = article.summary ? estimateReadingTime(article.summary) : 0;
                  const tags: string[] = (article as any).ai_relevance_tags || [];
                  const aiScore: number = (article as any).ai_relevance_score || 0;
                  const aiStatus: string = (article as any).ai_review_status || "pending";

                  return (
                    <Card
                      key={article.id}
                      className={`transition-all hover:shadow-sm ${
                        aiStatus === "rejected" ? "opacity-60 border-destructive/30" : ""
                      }`}
                    >
                      <CardContent className="p-4 space-y-3">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2">
                              {aiStatus === "approved" && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                              {aiStatus === "rejected" && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                              {aiStatus === "pending" && <Clock className="h-4 w-4 text-amber-500 shrink-0" />}
                              <a
                                href={article.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-sm text-foreground hover:text-primary transition-colors line-clamp-2"
                              >
                                {cleanTitle}
                                <ExternalLink className="inline-block ml-1 h-3 w-3 opacity-50" />
                              </a>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {tags.map(tag => (
                                <Badge key={tag} variant="outline" className={`text-[10px] py-0 px-1.5 ${PILLAR_COLORS[tag] || ""}`}>
                                  {PILLAR_LABELS[tag] || tag}
                                </Badge>
                              ))}
                              {aiScore > 0 && (
                                <span className={`text-[10px] font-mono font-bold ${
                                  aiScore >= 7 ? "text-emerald-600" : aiScore >= 4 ? "text-amber-600" : "text-destructive"
                                }`}>
                                  IA: {aiScore}/10
                                </span>
                              )}
                              {article.source_name && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                  {article.source_name}
                                </Badge>
                              )}
                              {topicName && (
                                <Badge className="text-[10px] py-0 px-1.5 bg-primary/10 text-primary border-0">
                                  {topicName}
                                </Badge>
                              )}
                              {article.summary && (
                                <span className="text-[10px] text-muted-foreground">
                                  {readTime} min leitura
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-center gap-1">
                              <Checkbox
                                checked={article.sent_to_newsletter}
                                onCheckedChange={(checked) =>
                                  toggleNewsletter.mutate({ id: article.id, value: !!checked })
                                }
                              />
                              <Send className={`h-3 w-3 ${article.sent_to_newsletter ? "text-primary" : "text-muted-foreground/30"}`} />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => softDeleteArticle.mutate(article.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Date */}
                        {article.published_at && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(article.published_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                          </div>
                        )}

                        {/* Summary block with copy */}
                        {article.summary && (() => {
                          const copyText = `${cleanTitle}\n(Português, ${readTime} min, texto)\n${article.link}\n\n${article.summary.replace(/\*\*/g, '')}`;
                          return (
                            <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 text-sm text-foreground/90 leading-relaxed relative group">
                              {/* Header inside summary */}
                              <div className="mb-3 pb-2 border-b border-primary/10">
                                <p className="font-bold text-foreground">{cleanTitle}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  (Português, {readTime} min, texto)
                                </p>
                              </div>
                              {/* Summary content */}
                              <div className="whitespace-pre-line">
                                {article.summary.split(/\*\*(.*?)\*\*/).map((part, i) =>
                                  i % 2 === 1 ? (
                                    <strong key={i} className="block text-foreground font-semibold mt-2 first:mt-0">
                                      {part}
                                    </strong>
                                  ) : (
                                    <span key={i}>{part}</span>
                                  )
                                )}
                              </div>
                              {/* Copy button */}
                              <CopyButton text={copyText} />
                            </div>
                          );
                        })()}

                        {!article.summary && (
                          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground italic">
                            Sem resumo gerado ainda.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </Tabs>
      </main>
    </div>
  );
}
