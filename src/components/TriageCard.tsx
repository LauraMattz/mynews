import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ThumbsUp, ThumbsDown, ExternalLink, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";

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

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

interface TriageCardProps {
  article: {
    id: string;
    title: string;
    link: string;
    description: string | null;
    source_name: string | null;
    published_at: string | null;
    ai_relevance_score: number | null;
    ai_relevance_tags: string[] | null;
    ai_review_status: string | null;
    feeds: any;
  };
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onGenerateSummary: (id: string) => void;
  isSummarizing: boolean;
}

export function TriageCard({ article, selected, onToggleSelect, onApprove, onReject, onGenerateSummary, isSummarizing }: TriageCardProps) {
  const cleanTitle = useMemo(() => stripHtml(article.title), [article.title]);
  const cleanDescription = useMemo(() => article.description ? stripHtml(article.description) : null, [article.description]);
  const tags = article.ai_relevance_tags || [];
  const topicName = article.feeds?.topics?.name;

  return (
    <Card className={`transition-all hover:shadow-sm ${selected ? "ring-2 ring-primary/50 bg-primary/5" : ""}`}>
      <CardContent className="p-4 space-y-2">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(article.id)}
            className="mt-1"
          />
          <div className="flex-1 min-w-0 space-y-1">
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sm text-foreground hover:text-primary transition-colors line-clamp-2 block"
            >
              {cleanTitle}
              <ExternalLink className="inline-block ml-1 h-3 w-3 opacity-40" />
            </a>
            {cleanDescription && (
              <p className="text-xs text-muted-foreground line-clamp-2">{cleanDescription}</p>
            )}
          </div>
        </div>

        {/* Tags & metadata */}
        <div className="flex items-center gap-1.5 flex-wrap pl-7">
          {tags.map(tag => (
            <Badge key={tag} variant="outline" className={`text-[10px] py-0 px-1.5 ${PILLAR_COLORS[tag] || ""}`}>
              {PILLAR_LABELS[tag] || tag}
            </Badge>
          ))}
          {article.source_name && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5">{article.source_name}</Badge>
          )}
          {topicName && (
            <Badge className="text-[10px] py-0 px-1.5 bg-primary/10 text-primary border-0">{topicName}</Badge>
          )}
          {article.published_at && (
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(article.published_at), { addSuffix: true, locale: ptBR })}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 pl-7">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            onClick={() => {
              onApprove(article.id);
              onGenerateSummary(article.id);
            }}
            disabled={isSummarizing}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            Aprovar e Resumir
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-destructive hover:bg-destructive/5 border-destructive/30"
            onClick={() => onReject(article.id)}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            Descartar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs ml-auto"
            onClick={() => onGenerateSummary(article.id)}
            disabled={isSummarizing}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Só Resumir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
