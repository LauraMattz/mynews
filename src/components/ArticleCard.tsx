import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown, Trash2, ExternalLink, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ArticleCardProps {
  article: {
    id: string;
    title: string;
    link: string;
    description: string | null;
    summary: string | null;
    source_name: string | null;
    published_at: string | null;
    relevance_score: number;
    feeds: any;
    votes: any;
  };
  onVote: (articleId: string, vote: 1 | -1) => void;
  onDelete: (id: string) => void;
  onSummarize: (id: string) => void;
  isSummarizing: boolean;
}

export function ArticleCard({ article, onVote, onDelete, onSummarize, isSummarizing }: ArticleCardProps) {
  const currentVote = article.votes?.vote || 0;
  const topicName = article.feeds?.topics?.name;

  return (
    <Card className="group animate-fade-in hover:shadow-md transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex gap-4">
          {/* Vote buttons */}
          <div className="flex flex-col items-center gap-1 pt-1">
            <Button
              variant={currentVote === 1 ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => onVote(article.id, 1)}
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
            <span className={`text-sm font-semibold ${
              article.relevance_score > 0 ? "text-success" : 
              article.relevance_score < 0 ? "text-destructive" : "text-muted-foreground"
            }`}>
              {article.relevance_score}
            </span>
            <Button
              variant={currentVote === -1 ? "destructive" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => onVote(article.id, -1)}
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-2 flex-1"
              >
                {article.title}
                <ExternalLink className="inline-block ml-1 h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {article.source_name && (
                <Badge variant="outline" className="text-xs">
                  {article.source_name}
                </Badge>
              )}
              {topicName && (
                <Badge className="text-xs bg-primary/10 text-primary border-0">
                  {topicName}
                </Badge>
              )}
              {article.published_at && (
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(article.published_at), { addSuffix: true, locale: ptBR })}
                </span>
              )}
            </div>

            {article.summary ? (
              <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-1.5 text-primary text-xs font-medium mb-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  Resumo IA
                </div>
                <p className="text-foreground/90 leading-relaxed">{article.summary}</p>
              </div>
            ) : article.description ? (
              <p className="text-sm text-muted-foreground line-clamp-2">{article.description}</p>
            ) : null}

            <div className="flex items-center gap-2 pt-1">
              {!article.summary && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => onSummarize(article.id)}
                  disabled={isSummarizing}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Gerar Resumo
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-destructive ml-auto"
                onClick={() => onDelete(article.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
