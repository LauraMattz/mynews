import { Progress } from "@/components/ui/progress";
import type { FetchProgress, SummarizeProgress } from "@/hooks/useArticles";
import { Loader2 } from "lucide-react";

interface ProgressBarProps {
  fetchProgress: FetchProgress;
  summarizeProgress: SummarizeProgress;
}

export function PipelineProgress({ fetchProgress, summarizeProgress }: ProgressBarProps) {
  const isActive = fetchProgress.stage !== "idle" || summarizeProgress.stage !== "idle";
  if (!isActive) return null;

  const activePipeline = fetchProgress.stage !== "idle" ? fetchProgress : null;
  const activeAI = summarizeProgress.stage !== "idle" ? summarizeProgress : null;

  return (
    <div className="space-y-2 animate-fade-in">
      {activePipeline && (
        <div className="bg-card border rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            {activePipeline.stage !== "done" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            <span className="text-sm font-medium">{activePipeline.message}</span>
            <span className="text-xs text-muted-foreground ml-auto">{Math.round(activePipeline.percent)}%</span>
          </div>
          <Progress value={activePipeline.percent} className="h-2" />
        </div>
      )}
      {activeAI && (
        <div className="bg-card border rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            {activeAI.stage !== "done" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            <span className="text-sm font-medium">{activeAI.message}</span>
            {activeAI.total > 0 && (
              <span className="text-xs text-muted-foreground ml-auto">
                {activeAI.current}/{activeAI.total}
              </span>
            )}
          </div>
          {activeAI.total > 0 && (
            <Progress value={(activeAI.current / activeAI.total) * 100} className="h-2" />
          )}
        </div>
      )}
    </div>
  );
}
