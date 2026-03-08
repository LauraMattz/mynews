import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sparkles, ExternalLink, Link2, Loader2, Send,
  Calendar, Search, Copy, Check, Trash2,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

function estimateReadingTime(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  return Math.max(1, Math.ceil(words / 200));
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button
      variant="ghost"
      size="sm"
      className="absolute top-2 right-2 h-7 gap-1 text-xs opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
      onClick={handleCopy}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copiado!" : "Copiar"}
    </Button>
  );
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [linkInput, setLinkInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterNewsletter, setFilterNewsletter] = useState<"all" | "sent" | "unsent">("all");
  const [filterPillar, setFilterPillar] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: articles, isLoading } = useQuery({
    queryKey: ["summarized-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, link, summary, source_name, published_at, created_at, sent_to_newsletter, ai_relevance_tags, ai_relevance_score, feeds(name, topics(name))")
        .eq("is_deleted", false)
        .not("summary", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
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
      queryClient.invalidateQueries({ queryKey: ["article-stats"] });
    },
  });

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
  const sentCount = allArticles.filter(a => a.sent_to_newsletter).length;

  const filtered = useMemo(() => {
    let list = allArticles;

    if (filterNewsletter === "sent") list = list.filter(a => a.sent_to_newsletter);
    if (filterNewsletter === "unsent") list = list.filter(a => !a.sent_to_newsletter);

    if (filterPillar) {
      list = list.filter(a => (a.ai_relevance_tags || []).includes(filterPillar));
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
  }, [allArticles, filterNewsletter, filterPillar, search]);

  const pillarStats = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const a of allArticles) {
      for (const tag of (a.ai_relevance_tags || [])) {
        stats[tag] = (stats[tag] || 0) + 1;
      }
    }
    return stats;
  }, [allArticles]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-foreground">Resumos</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              {allArticles.length} resumos · {sentCount} na newsletter
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-5">
        {/* Pillar distribution */}
        {Object.keys(pillarStats).length > 0 && (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Pilares:</span>
            {Object.entries(pillarStats).map(([tag, count]) => (
              <Badge
                key={tag}
                variant="outline"
                className={`cursor-pointer transition-all text-[10px] sm:text-xs ${filterPillar === tag ? PILLAR_COLORS[tag] + " border" : ""}`}
                onClick={() => setFilterPillar(filterPillar === tag ? null : tag)}
              >
                {PILLAR_LABELS[tag] || tag} ({count})
              </Badge>
            ))}
            {filterPillar && (
              <Button variant="ghost" size="sm" className="text-[10px] sm:text-xs h-6" onClick={() => setFilterPillar(null)}>
                Limpar
              </Button>
            )}
          </div>
        )}

        {/* Paste link */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs sm:text-sm font-medium">Colar link e gerar resumo</span>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Cole o link aqui..."
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasteLink()}
                disabled={isGenerating}
                className="h-9 text-sm"
              />
              <Button onClick={handlePasteLink} disabled={isGenerating || !linkInput.trim()} className="h-9 px-3 shrink-0">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span className="ml-1 hidden sm:inline">Gerar</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="space-y-2 sm:space-y-0 sm:flex sm:flex-row sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-1">
            {(["all", "unsent", "sent"] as const).map((f) => (
              <Button
                key={f}
                variant={filterNewsletter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterNewsletter(f)}
                className="text-[11px] sm:text-xs h-8 px-2 sm:px-3 flex-1 sm:flex-none"
              >
                {f === "all" ? "Todos" : f === "sent" ? "✓ Enviados" : "Pendentes"}
              </Button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 sm:py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 sm:py-20 text-muted-foreground">
            <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum resumo encontrado.</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {filtered.map((article) => {
              const cleanTitle = stripHtml(article.title);
              const topicName = (article as any).feeds?.topics?.name;
              const readTime = article.summary ? estimateReadingTime(article.summary) : 0;
              const tags: string[] = article.ai_relevance_tags || [];
              const aiScore: number = article.ai_relevance_score || 0;

              const copyText = `${cleanTitle}\n(Português, ${readTime} min, texto)\n${article.link}\n\n${(article.summary || '').replace(/\*\*/g, '')}`;

              return (
                <Card key={article.id} className="transition-all hover:shadow-sm">
                  <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                    {/* Summary block with copy */}
                    <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-foreground/90 leading-relaxed relative group">
                      <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3 pb-2 border-b border-primary/10">
                        <div className="flex-1 min-w-0">
                          <a href={article.link} target="_blank" rel="noopener noreferrer" className="font-bold text-foreground hover:text-primary transition-colors hover:underline text-xs sm:text-sm">
                            {cleanTitle}
                            <ExternalLink className="inline-block ml-1 h-3 w-3 opacity-40" />
                          </a>
                          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap mt-1">
                            {tags.map(tag => (
                              <Badge key={tag} variant="outline" className={`text-[9px] sm:text-[10px] py-0 px-1 sm:px-1.5 ${PILLAR_COLORS[tag] || ""}`}>
                                {PILLAR_LABELS[tag] || tag}
                              </Badge>
                            ))}
                            {article.source_name && (
                              <Badge variant="outline" className="text-[9px] sm:text-[10px] py-0 px-1 sm:px-1.5">{article.source_name}</Badge>
                            )}
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground">{readTime} min</span>
                            {article.published_at && (
                              <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                                · {format(new Date(article.published_at), "dd MMM", { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex flex-col items-center gap-0.5">
                            <Checkbox
                              checked={article.sent_to_newsletter}
                              onCheckedChange={(checked) =>
                                toggleNewsletter.mutate({ id: article.id, value: !!checked })
                              }
                            />
                            <Send className={`h-2.5 w-2.5 ${article.sent_to_newsletter ? "text-primary" : "text-muted-foreground/30"}`} />
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
                      <div className="whitespace-pre-line">
                        {article.summary!.split(/\*\*(.*?)\*\*/).map((part, i) =>
                          i % 2 === 1 ? (
                            <strong key={i} className="block text-foreground font-semibold mt-2 first:mt-0">
                              {part}
                            </strong>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        )}
                      </div>
                      <CopyButton text={copyText} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
