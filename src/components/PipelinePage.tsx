import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useArticles } from "@/hooks/useArticles";
import { useFeeds } from "@/hooks/useFeeds";
import { useTopics } from "@/hooks/useTopics";
import {
  Rss,
  FileText,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  Database,
  ArrowRight,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";

export function PipelinePage() {
  const { statsQuery } = useArticles();
  const { feedsQuery } = useFeeds();
  const { topicsQuery } = useTopics();

  const stats = statsQuery.data;
  const feeds = feedsQuery.data || [];
  const topics = topicsQuery.data || [];

  const steps = [
    {
      icon: Rss,
      title: "1. Coleta de Feeds",
      description: "Busca automática de notícias de múltiplos feeds RSS cadastrados.",
      detail: `${feeds.length} feeds cadastrados, ${feeds.filter(f => f.is_active).length} ativos`,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: FileText,
      title: "2. Parsing e Filtragem",
      description: "Extração de título, link, descrição e data de publicação. Filtro por tópicos de interesse.",
      detail: `${topics.length} tópicos configurados com palavras-chave`,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      icon: Database,
      title: "3. Armazenamento",
      description: "Artigos salvos no banco com deduplicação automática por link. Histórico completo preservado.",
      detail: `${stats?.totalArticles || 0} artigos no banco`,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Sparkles,
      title: "4. Resumo com IA",
      description: "Geração de resumos concisos usando Lovable AI (Gemini). Sob demanda por artigo ou em lote.",
      detail: `${stats?.summarizedArticles || 0} resumos gerados`,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      icon: ThumbsUp,
      title: "5. Votação de Relevância",
      description: "Sistema de upvote/downvote para classificar artigos. Score atualizado automaticamente.",
      detail: `${stats?.votedArticles || 0} artigos votados`,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: TrendingUp,
      title: "6. Recomendação",
      description: "Artigos ordenados por score de relevância. Fontes e tópicos com mais votos positivos ganham destaque.",
      detail: `Score médio: ${stats?.avgRelevanceScore || 0}`,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Como funciona o NewsFlow</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Pipeline completo de curadoria de notícias: da coleta à recomendação inteligente.
        </p>
      </div>

      {/* Pipeline steps */}
      <div className="space-y-4 max-w-2xl mx-auto">
        {steps.map((step, i) => (
          <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="flex items-start gap-4 p-5">
                <div className={`h-12 w-12 rounded-xl ${step.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <step.icon className={`h-6 w-6 ${step.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
                  <Badge variant="secondary" className="mt-2 text-xs">
                    {step.detail}
                  </Badge>
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-muted-foreground/30 flex-shrink-0 mt-3" />
                )}
                {i === steps.length - 1 && (
                  <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-3" />
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Performance metrics */}
      <Card className="max-w-2xl mx-auto border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-accent" />
            Otimizações do Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { icon: Rss, label: "Fetch paralelo", desc: "Todos os feeds são buscados simultaneamente" },
            { icon: Database, label: "Batch insert", desc: "Artigos inseridos em lotes de 50 para máxima performance" },
            { icon: Sparkles, label: "Resumos em lote", desc: "IA processa até 5 artigos por vez com throttling anti-rate-limit" },
            { icon: Clock, label: "Deduplicação", desc: "Links únicos evitam artigos duplicados automaticamente" },
            { icon: TrendingUp, label: "Score automático", desc: "Trigger no banco recalcula relevância a cada voto" },
          ].map((opt, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <opt.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
