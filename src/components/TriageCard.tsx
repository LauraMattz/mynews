import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ThumbsUp, ThumbsDown, ExternalLink, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState } from "react";

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
  const [exiting, setExiting] = useState<"approve" | "reject" | null>(null);

  const handleApprove = () => {
    setExiting("approve");
    setTimeout(() => {
      onApprove(article.id);
      onGenerateSummary(article.id);
    }, 300);
  };

  const handleReject = () => {
    setExiting("reject");
    setTimeout(() => {
      onReject(article.id);
    }, 300);
  };

  return (
    <Card
      className={`transition-all duration-300 hover:shadow-sm animate-fade-in ${
        selected ? "ring-2 ring-primary/50 bg-primary/5" : ""
      } ${
        exiting === "approve" ? "opacity-0 translate-x-12 scale-95" : ""
      } ${
        exiting === "reject" ? "opacity-0 -translate-x-12 scale-95" : ""
      }`}
    >
      <CardContent className="p-3 sm:p-4 space-y-2">
        {/* Header */}
        <div className="flex items-start gap-2 sm:gap-3">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(article.id)}
            className="mt-0.5 shrink-0"
          />
          <div className="flex-1 min-w-0 space-y-1">
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-xs sm:text-sm text-foreground hover:text-primary transition-colors line-clamp-2 block"
            >
              {cleanTitle}
              <ExternalLink className="inline-block ml-1 h-3 w-3 opacity-40" />
            </a>
            {cleanDescription && (
              <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2">{cleanDescription}</p>
            )}
          </div>
        </div>

        {/* Tags & metadata */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap pl-6 sm:pl-7">
          {tags.map(tag => (
            <Badge key={tag} variant="outline" className={`text-[9px] sm:text-[10px] py-0 px-1 sm:px-1.5 ${PILLAR_COLORS[tag] || ""}`}>
              {PILLAR_LABELS[tag] || tag}
            </Badge>
          ))}
          {article.source_name && (
            <Badge variant="outline" className="text-[9px] sm:text-[10px] py-0 px-1 sm:px-1.5">{article.source_name}</Badge>
          )}
          {topicName && (
            <Badge className="text-[9px] sm:text-[10px] py-0 px-1 sm:px-1.5 bg-primary/10 text-primary border-0">{topicName}</Badge>
          )}
          {article.published_at && (
            <span className="text-[9px] sm:text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(article.published_at), { addSuffix: true, locale: ptBR })}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1 pl-6 sm:pl-7">
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-[11px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            onClick={handleApprove}
            disabled={isSummarizing || exiting !== null}
          >
            <ThumbsUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Aprovar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-[11px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 text-destructive hover:bg-destructive/5 border-destructive/30"
            onClick={handleReject}
            disabled={exiting !== null}
          >
            <ThumbsDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Descartar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-[11px] sm:text-xs h-7 sm:h-8 px-2 ml-auto"
            onClick={() => onGenerateSummary(article.id)}
            disabled={isSummarizing}
          >
            <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Resumir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
