import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3, TrendingUp, Sparkles,
  FileText, ThumbsUp, Send, XCircle, Newspaper, ExternalLink,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, LabelList,
} from "recharts";
import { format, subDays, startOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { InsightSkeletons } from "@/components/SkeletonCards";

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

const PERIOD_OPTIONS = [
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
];

function StatCard({ label, value, icon: Icon, accent, subtitle }: {
  label: string; value: number | string; icon: any; accent: string; subtitle?: string;
}) {
  return (
    <Card className="border-0 shadow-sm overflow-hidden relative group hover:shadow-md transition-all duration-200">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight">{value}</p>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">{label}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{subtitle}</p>}
          </div>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${accent} shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RankingItem({ index, title, link, sourceName, badge }: {
  index: number; title: string; link: string; sourceName?: string | null;
  badge: string;
}) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2.5 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      <span className="text-sm w-6 shrink-0 text-center mt-0.5">
        {index < 3 ? medals[index] : <span className="text-xs text-muted-foreground font-medium">{index + 1}.</span>}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs sm:text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors leading-snug">
          {title}
          <ExternalLink className="inline-block ml-1 h-2.5 w-2.5 opacity-0 group-hover:opacity-40 transition-opacity" />
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <Badge variant="outline" className="text-[9px] sm:text-[10px] py-0 px-1.5 font-medium">
            {badge}
          </Badge>
          {sourceName && (
            <span className="text-[9px] sm:text-[10px] text-muted-foreground">{sourceName}</span>
          )}
        </div>
      </div>
    </a>
  );
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  boxShadow: "0 4px 12px -2px rgba(0,0,0,0.1)",
};

export default function Insights() {
  const [periodDays, setPeriodDays] = useState(14);

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
        .select("id, ai_review_status, is_deleted");
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
    // Count approved articles (approved status OR has summary = user chose to keep it)
    const liked = total; // All summarized articles were effectively approved/liked
    const allItems = allArticlesForStatus || [];
    const totalAll = allItems.length;
    const declined = allItems.filter(a => a.is_deleted).length;
    const approvalRate = totalAll > 0 ? Math.round(((totalAll - declined) / totalAll) * 100) : 0;

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

    // Topic distribution
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

    // Volume over selected period
    const now = new Date();
    const rawVolumeData = [];
    for (let i = periodDays - 1; i >= 0; i--) {
      const day = startOfDay(subDays(now, i));
      const dayStr = format(day, "yyyy-MM-dd");
      const label = format(day, "dd MMM", { locale: ptBR });
      const count = articles.filter(a => {
        if (!a.published_at) return false;
        return format(startOfDay(parseISO(a.published_at)), "yyyy-MM-dd") === dayStr;
      }).length;
      rawVolumeData.push({ label, count });
    }
    const firstNonZero = rawVolumeData.findIndex(d => d.count > 0);
    const volumeData = firstNonZero >= 0 ? rawVolumeData.slice(firstNonZero) : rawVolumeData;

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

    // Source with most newsletter sends
    const sourceNewsletter: Record<string, number> = {};
    for (const a of articles.filter(x => x.sent_to_newsletter)) {
      const src = a.source_name || "Desconhecido";
      sourceNewsletter[src] = (sourceNewsletter[src] || 0) + 1;
    }
    const topNewsletterSource = Object.entries(sourceNewsletter).sort((a, b) => b[1] - a[1])[0];

    return {
      total, sentNewsletter, liked, declined, approvalRate,
      pillarData, topicData, sourceData, volumeData, topLiked, topLongest,
      totalAll, topNewsletterSource,
    };
  }, [articles, votes, allArticlesForStatus, periodDays]);

  if (isLoading || !stats) {
    return (
      <div className="min-h-screen bg-background pb-16 sm:pb-0">
        <div className="bg-gradient-to-br from-primary/8 via-background to-accent/5 border-b border-border">
          <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 sm:py-8">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h1 className="text-lg sm:text-2xl font-bold">Insights</h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">Carregando dados...</p>
          </div>
        </div>
        <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <InsightSkeletons />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 sm:pb-0">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-primary/8 via-background to-accent/5 border-b border-border">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 sm:py-8">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="text-lg sm:text-2xl font-bold">Insights</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Análise de {stats.total} resumos a partir de {stats.totalAll} artigos processados
          </p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="animate-fade-in" style={{ animationDelay: "0ms" }}>
            <StatCard label="Processados" value={stats.totalAll} icon={Newspaper} accent="bg-muted text-muted-foreground" subtitle={`${stats.total} resumidos`} />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: "50ms" }}>
            <StatCard label="Descartados" value={stats.declined} icon={XCircle} accent="bg-destructive/10 text-destructive" subtitle={`${stats.approvalRate}% aprovação`} />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
            <StatCard label="Curtidos" value={stats.liked} icon={ThumbsUp} accent="bg-accent/10 text-accent" />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: "150ms" }}>
            <StatCard label="Newsletter" value={stats.sentNewsletter} icon={Send} accent="bg-primary/10 text-primary" subtitle={stats.topNewsletterSource ? `Top: ${stats.topNewsletterSource[0]}` : undefined} />
          </div>
        </div>

        {/* Volume + Pillar row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 animate-fade-in" style={{ animationDelay: "200ms" }}>
          {/* Volume over time — takes 2 cols */}
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader className="p-3 sm:p-4 pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Volume de resumos
                </CardTitle>
                <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                  {PERIOD_OPTIONS.map(opt => (
                    <Button
                      key={opt.days}
                      variant={periodDays === opt.days ? "default" : "ghost"}
                      size="sm"
                      className={`h-6 px-2.5 text-[10px] font-semibold rounded-md ${
                        periodDays === opt.days ? "shadow-sm" : "hover:bg-transparent"
                      }`}
                      onClick={() => setPeriodDays(opt.days)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <div className="h-52 sm:h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.volumeData}>
                    <defs>
                      <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      fill="url(#volumeGradient)"
                      dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                      name="Resumos"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Pillar Pie */}
          {stats.pillarData.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="p-3 sm:p-4 pb-0">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  Pilares
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <div className="h-40 sm:h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.pillarData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        strokeWidth={0}
                      >
                        {stats.pillarData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                  {stats.pillarData.map((p, i) => (
                    <Badge key={p.name} variant="outline" className="text-[10px] py-0 px-1.5 gap-1">
                      <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      {p.name} ({p.value})
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sources + Topics row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 animate-fade-in" style={{ animationDelay: "300ms" }}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="p-3 sm:p-4 pb-0">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Top fontes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <div className="h-52 sm:h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.sourceData} layout="vertical" barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} name="Artigos" maxBarSize={28}>
                      <LabelList dataKey="count" position="right" style={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {stats.topicData.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="p-3 sm:p-4 pb-0">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  Temáticas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <div className="h-52 sm:h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.topicData} barCategoryGap="25%">
                      <CartesianGrid strokeDasharray="3 3" className="opacity-20" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Artigos" maxBarSize={40}>
                        {stats.topicData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                        <LabelList dataKey="count" position="top" style={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 600 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Rankings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 animate-fade-in" style={{ animationDelay: "400ms" }}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="p-3 sm:p-4 pb-1">
              <CardTitle className="text-sm flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-accent" />
                Mais curtidos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-1 space-y-0.5">
              {stats.topLiked.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Nenhum artigo curtido ainda.</p>
              ) : (
                stats.topLiked.map((a, i) => (
                  <RankingItem
                    key={a.id}
                    index={i}
                    title={a.title}
                    link={a.link}
                    sourceName={a.source_name}
                    badge={`+${a.voteScore}`}
                  />
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="p-3 sm:p-4 pb-1">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Resumos mais completos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-1 space-y-0.5">
              {stats.topLongest.map((a, i) => (
                <RankingItem
                  key={a.id}
                  index={i}
                  title={a.title}
                  link={a.link}
                  sourceName={a.source_name}
                  badge={`${a.wordCount} palavras`}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
