import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowLeft, BarChart3, TrendingUp, Sparkles, Clock,
  FileText, ThumbsUp, Send, Loader2, Tag,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";
import { format, subDays, startOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = [
  "hsl(250, 65%, 55%)", "hsl(170, 60%, 45%)", "hsl(45, 80%, 50%)",
  "hsl(0, 72%, 55%)", "hsl(200, 70%, 50%)", "hsl(300, 50%, 55%)",
];

const PILLAR_LABELS: Record<string, string> = {
  tecnologia: "Tecnologia",
  educação: "Educação",
  liderança: "Liderança",
  equidade_racial: "Equidade Racial",
};

export default function Insights() {
  const navigate = useNavigate();

  const { data: articles, isLoading } = useQuery({
    queryKey: ["insights-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, link, summary, source_name, published_at, sent_to_newsletter, ai_relevance_tags, ai_relevance_score, relevance_score, feeds(name, topics(name))")
        .eq("is_deleted", false)
        .not("summary", "is", null)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: votes } = useQuery({
    queryKey: ["insights-votes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("votes").select("article_id, vote");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allArticlesForStatus } = useQuery({
    queryKey: ["insights-all-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, ai_review_status")
        .eq("is_deleted", false);
      if (error) throw error;
      return data || [];
    },
  });

  const stats = useMemo(() => {
    if (!articles) return null;

    const voteMap = new Map<string, number>();
    for (const v of (votes || [])) {
      voteMap.set(v.article_id, (voteMap.get(v.article_id) || 0) + v.vote);
    }

    const total = articles.length;
    const sentNewsletter = articles.filter(a => a.sent_to_newsletter).length;
    const liked = articles.filter(a => (voteMap.get(a.id) || 0) > 0).length;

    // Declined count from all articles
    const declined = (allArticlesForStatus || []).filter(a => a.ai_review_status === "rejected").length;

    // Pillar distribution
    const pillarCounts: Record<string, number> = {};
    for (const a of articles) {
      for (const tag of (a.ai_relevance_tags || [])) {
        pillarCounts[tag] = (pillarCounts[tag] || 0) + 1;
      }
    }
    const pillarData = Object.entries(pillarCounts)
      .map(([name, value]) => ({ name: PILLAR_LABELS[name] || name, value }))
      .sort((a, b) => b.value - a.value);

    // Topic distribution (from feeds -> topics)
    const topicCounts: Record<string, number> = {};
    for (const a of articles) {
      const feed = a.feeds as any;
      const topicName = feed?.topics?.name;
      if (topicName) {
        topicCounts[topicName] = (topicCounts[topicName] || 0) + 1;
      }
    }
    const topicData = Object.entries(topicCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Source distribution (top 8)
    const sourceCounts: Record<string, number> = {};
    for (const a of articles) {
      const src = a.source_name || "Desconhecido";
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    }
    const sourceData = Object.entries(sourceCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Volume over last 14 days
    const now = new Date();
    const volumeData = [];
    for (let i = 13; i >= 0; i--) {
      const day = startOfDay(subDays(now, i));
      const dayStr = format(day, "yyyy-MM-dd");
      const label = format(day, "dd/MM");
      const count = articles.filter(a => {
        if (!a.published_at) return false;
        return format(startOfDay(parseISO(a.published_at)), "yyyy-MM-dd") === dayStr;
      }).length;
      volumeData.push({ label, count });
    }

    // Top liked articles
    const topLiked = articles
      .map(a => ({ ...a, voteScore: voteMap.get(a.id) || 0 }))
      .filter(a => a.voteScore > 0)
      .sort((a, b) => b.voteScore - a.voteScore)
      .slice(0, 5);

    // Longest summaries
    const topLongest = articles
      .map(a => ({ ...a, wordCount: a.summary?.split(/\s+/).filter(w => w.length > 0).length || 0 }))
      .sort((a, b) => b.wordCount - a.wordCount)
      .slice(0, 5);

    const totalWords = articles.reduce((sum, a) => {
      return sum + (a.summary?.split(/\s+/).filter(w => w.length > 0).length || 0);
    }, 0);
    const avgWords = total > 0 ? Math.round(totalWords / total) : 0;

    return {
      total, sentNewsletter, liked, declined, avgWords,
      pillarData, topicData, sourceData, volumeData, topLiked, topLongest,
    };
  }, [articles, votes, allArticlesForStatus]);

  if (isLoading || !stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    { label: "Resumos", value: stats.total, icon: FileText, color: "text-primary" },
    { label: "Curtidos", value: stats.liked, icon: ThumbsUp, color: "text-accent" },
    { label: "Newsletter", value: stats.sentNewsletter, icon: Send, color: "text-primary" },
    { label: "Palavras/resumo", value: stats.avgWords, icon: Clock, color: "text-accent" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Insights
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Análise dos {stats.total} resumos gerados
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center gap-1">
                <div className={`h-8 w-8 rounded-lg bg-muted flex items-center justify-center ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-xl sm:text-2xl font-bold leading-none">{value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Volume over time */}
          <Card>
            <CardHeader className="p-3 sm:p-4 pb-0">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Volume (últimos 14 dias)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <div className="h-48 sm:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.volumeData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "hsl(var(--primary))" }}
                      name="Resumos"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Pillar distribution */}
          <Card>
            <CardHeader className="p-3 sm:p-4 pb-0">
              <CardTitle className="text-sm flex items-center gap-2">
                <Tag className="h-4 w-4 text-accent" />
                Distribuição por pilar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              {stats.pillarData.length > 0 ? (
                <div className="h-48 sm:h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.pillarData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {stats.pillarData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-10">Sem dados de pilares</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sources chart */}
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Top fontes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.sourceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Artigos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top lists */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Top curtidos */}
          <Card>
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-accent" />
                Mais curtidos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0 space-y-2">
              {stats.topLiked.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum artigo curtido ainda.</p>
              ) : (
                stats.topLiked.map((a, i) => (
                  <a
                    key={a.id}
                    href={a.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 group"
                  >
                    <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">
                        {a.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[9px] py-0 px-1">+{a.voteScore}</Badge>
                        {a.source_name && (
                          <span className="text-[9px] text-muted-foreground">{a.source_name}</span>
                        )}
                      </div>
                    </div>
                  </a>
                ))
              )}
            </CardContent>
          </Card>

          {/* Longest summaries */}
          <Card>
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Resumos mais completos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0 space-y-2">
              {stats.topLongest.map((a, i) => (
                <a
                  key={a.id}
                  href={a.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 group"
                >
                  <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">
                      {a.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[9px] py-0 px-1">{a.wordCount} palavras</Badge>
                      {a.source_name && (
                        <span className="text-[9px] text-muted-foreground">{a.source_name}</span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
