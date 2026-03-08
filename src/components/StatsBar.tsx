import { Card, CardContent } from "@/components/ui/card";
import { Rss, FileText, Sparkles, Inbox } from "lucide-react";

interface StatsProps {
  activeFeeds: number;
  totalArticles: number;
  summarizedArticles: number;
  pendingTriage: number;
}

const statItems = [
  { key: "activeFeeds", label: "Feeds", icon: Rss, color: "text-primary" },
  { key: "totalArticles", label: "Artigos", icon: FileText, color: "text-accent" },
  { key: "summarizedArticles", label: "Resumidos", icon: Sparkles, color: "text-primary" },
  { key: "pendingTriage", label: "Triar", icon: Inbox, color: "text-accent" },
] as const;

export function StatsBar({ activeFeeds, totalArticles, summarizedArticles, pendingTriage }: StatsProps) {
  const values = { activeFeeds, totalArticles, summarizedArticles, pendingTriage };

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {statItems.map(({ key, label, icon: Icon, color }) => (
        <Card key={key} className="border-0 shadow-sm bg-card/80">
          <CardContent className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 p-2.5 sm:p-4">
            <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-muted flex items-center justify-center ${color} shrink-0`}>
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-lg sm:text-2xl font-bold leading-none">{values[key]}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
