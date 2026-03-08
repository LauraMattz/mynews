import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Sparkles,
  ExternalLink,
  Link2,
  Loader2,
  Send,
  Calendar,
  Filter,
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

export default function Summaries() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [linkInput, setLinkInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterNewsletter, setFilterNewsletter] = useState<"all" | "sent" | "unsent">("all");

  const { data: articles, isLoading } = useQuery({
    queryKey: ["summarized-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, link, summary, source_name, published_at, sent_to_newsletter, created_at, feeds(name, topics(name))")
        .eq("is_deleted", false)
        .not("summary", "is", null)
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

  const handlePasteLink = async () => {
    if (!linkInput.trim()) return;
    setIsGenerating(true);
    try {
      // 1. Insert the article with the link
      const { data: inserted, error: insertErr } = await supabase
        .from("articles")
        .upsert(
          { link: linkInput.trim(), title: "Carregando...", source_name: "Link manual" },
          { onConflict: "link", ignoreDuplicates: false }
        )
        .select("id, title, description")
        .single();

      if (insertErr) throw insertErr;

      // 2. Generate summary
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

  const filtered = useMemo(() => {
    if (!articles) return [];
    if (filterNewsletter === "sent") return articles.filter((a) => a.sent_to_newsletter);
    if (filterNewsletter === "unsent") return articles.filter((a) => !a.sent_to_newsletter);
    return articles;
  }, [articles, filterNewsletter]);

  const sentCount = articles?.filter((a) => a.sent_to_newsletter).length || 0;
  const totalCount = articles?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Resumos</h1>
              <p className="text-xs text-muted-foreground">
                {totalCount} resumos · {sentCount} enviados para newsletter
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Paste link to summarize */}
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
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span className="ml-1.5">Gerar</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filter bar */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(["all", "unsent", "sent"] as const).map((f) => (
            <Button
              key={f}
              variant={filterNewsletter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterNewsletter(f)}
              className="text-xs"
            >
              {f === "all" ? "Todos" : f === "sent" ? "Enviados" : "Não enviados"}
            </Button>
          ))}
        </div>

        {/* Articles list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum resumo encontrado.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((article) => {
              const cleanTitle = stripHtml(article.title);
              const topicName = (article as any).feeds?.topics?.name;
              const readTime = estimateReadingTime(article.summary || "");

              return (
                <Card key={article.id} className="transition-all hover:shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    {/* Header with title + metadata */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <a
                          href={article.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-foreground hover:text-primary transition-colors"
                        >
                          {cleanTitle}
                          <ExternalLink className="inline-block ml-1 h-3 w-3 opacity-50" />
                        </a>
                        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                          <span>(Português, {readTime} min, texto)</span>
                          {article.source_name && (
                            <Badge variant="outline" className="text-xs py-0">
                              {article.source_name}
                            </Badge>
                          )}
                          {topicName && (
                            <Badge className="text-xs py-0 bg-primary/10 text-primary border-0">
                              {topicName}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Newsletter checkbox */}
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <Checkbox
                          checked={article.sent_to_newsletter}
                          onCheckedChange={(checked) =>
                            toggleNewsletter.mutate({ id: article.id, value: !!checked })
                          }
                        />
                        <Send className={`h-3 w-3 ${article.sent_to_newsletter ? "text-primary" : "text-muted-foreground/40"}`} />
                      </div>
                    </div>

                    {/* Date */}
                    {article.published_at && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(article.published_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                      </div>
                    )}

                    {/* Summary content */}
                    <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                      {article.summary!.split(/\*\*(.*?)\*\*/).map((part, i) =>
                        i % 2 === 1 ? (
                          <strong key={i} className="block text-foreground font-semibold mt-3 first:mt-0">
                            {part}
                          </strong>
                        ) : (
                          <span key={i}>{part}</span>
                        )
                      )}
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
