import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ThumbsUp, ThumbsDown, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState, useRef, useCallback } from "react";

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

const SWIPE_THRESHOLD = 80;

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

  // Swipe state
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);

  const handleApprove = useCallback(() => {
    if (exiting) return;
    setExiting("approve");
    setTimeout(() => {
      onApprove(article.id);
      onGenerateSummary(article.id);
    }, 300);
  }, [article.id, exiting, onApprove, onGenerateSummary]);

  const handleReject = useCallback(() => {
    if (exiting) return;
    setExiting("reject");
    setTimeout(() => {
      onReject(article.id);
    }, 300);
  }, [article.id, exiting, onReject]);

  // Touch handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (exiting) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    isHorizontalSwipeRef.current = null;
  }, [exiting]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || exiting) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    // Determine swipe direction on first significant move
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        isHorizontalSwipeRef.current = Math.abs(dx) > Math.abs(dy);
      }
      return;
    }

    if (!isHorizontalSwipeRef.current) return;

    // Prevent vertical scroll while swiping horizontally
    e.preventDefault();
    setIsSwiping(true);
    setSwipeX(dx);
  }, [exiting]);

  const onTouchEnd = useCallback(() => {
    if (!touchStartRef.current || !isSwiping) {
      touchStartRef.current = null;
      isHorizontalSwipeRef.current = null;
      return;
    }

    if (swipeX > SWIPE_THRESHOLD) {
      handleApprove();
    } else if (swipeX < -SWIPE_THRESHOLD) {
      handleReject();
    }

    setSwipeX(0);
    setIsSwiping(false);
    touchStartRef.current = null;
    isHorizontalSwipeRef.current = null;
  }, [swipeX, isSwiping, handleApprove, handleReject]);

  // Swipe visual feedback
  const swipeProgress = Math.min(Math.abs(swipeX) / SWIPE_THRESHOLD, 1);
  const isSwipingRight = swipeX > 0;
  const isSwipingLeft = swipeX < 0;
  const swipePastThreshold = Math.abs(swipeX) > SWIPE_THRESHOLD;

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Swipe background indicators */}
      {isSwiping && (
        <>
          {/* Approve background (right swipe) */}
          <div
            className={`absolute inset-y-0 left-0 flex items-center pl-4 transition-opacity ${
              isSwipingRight ? "opacity-100" : "opacity-0"
            }`}
            style={{ width: Math.max(0, swipeX) }}
          >
            <div className={`flex items-center gap-2 ${swipePastThreshold && isSwipingRight ? "text-emerald-600" : "text-emerald-400"}`}>
              <ThumbsUp className="h-5 w-5" />
              <span className="text-xs font-semibold whitespace-nowrap">Aprovar</span>
            </div>
          </div>
          {/* Reject background (left swipe) */}
          <div
            className={`absolute inset-y-0 right-0 flex items-center justify-end pr-4 transition-opacity ${
              isSwipingLeft ? "opacity-100" : "opacity-0"
            }`}
            style={{ width: Math.max(0, -swipeX) }}
          >
            <div className={`flex items-center gap-2 ${swipePastThreshold && isSwipingLeft ? "text-destructive" : "text-destructive/50"}`}>
              <span className="text-xs font-semibold whitespace-nowrap">Descartar</span>
              <ThumbsDown className="h-5 w-5" />
            </div>
          </div>
        </>
      )}

      <Card
        className={`transition-all duration-300 hover:shadow-sm animate-fade-in relative ${
          selected ? "ring-2 ring-primary/50 bg-primary/5" : ""
        } ${
          exiting === "approve" ? "opacity-0 translate-x-full scale-95" : ""
        } ${
          exiting === "reject" ? "opacity-0 -translate-x-full scale-95" : ""
        } ${
          isSwiping && swipePastThreshold && isSwipingRight ? "border-emerald-300" : ""
        } ${
          isSwiping && swipePastThreshold && isSwipingLeft ? "border-destructive/50" : ""
        }`}
        style={{
          transform: isSwiping ? `translateX(${swipeX}px) rotate(${swipeX * 0.02}deg)` : undefined,
          transition: isSwiping ? "none" : undefined,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            {/* Checkbox */}
            <Checkbox
              checked={selected}
              onCheckedChange={() => onToggleSelect(article.id)}
              className="mt-1 shrink-0"
            />

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1.5">
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
              {/* Tags & metadata */}
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
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

              {/* Swipe hint — mobile only */}
              <p className="text-[9px] text-muted-foreground/40 sm:hidden select-none">
                ← descartar · aprovar →
              </p>
            </div>

            {/* Actions — desktop only */}
            <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs h-8 px-3 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 w-full justify-center"
                onClick={handleApprove}
                disabled={isSummarizing || exiting !== null}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                Aprovar + Resumir
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs h-8 px-3 text-destructive hover:bg-destructive/5 border-destructive/30 w-full justify-center"
                onClick={handleReject}
                disabled={exiting !== null}
              >
                <ThumbsDown className="h-3.5 w-3.5" />
                Descartar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}