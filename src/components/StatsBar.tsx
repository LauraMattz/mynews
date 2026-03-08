import { Card, CardContent } from "@/components/ui/card";
import { Rss, FileText, Sparkles, Inbox } from "lucide-react";

interface StatsProps {
  activeFeeds: number;
  totalArticles: number;
  summarizedArticles: number;
  pendingTriage: number;
}

const statItems = [
  { key: "activeFeeds", label: "Feeds Ativos", icon: Rss, color: "text-primary" },
  { key: "totalArticles", label: "Artigos", icon: FileText, color: "text-accent" },
  { key: "summarizedArticles", label: "Resumidos", icon: Sparkles, color: "text-primary" },
  { key: "pendingTriage", label: "Para Triar", icon: Inbox, color: "text-accent" },
] as const;

export function StatsBar({ activeFeeds, totalArticles, summarizedArticles, pendingTriage }: StatsProps) {
  const values = { activeFeeds, totalArticles, summarizedArticles, pendingTriage };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statItems.map(({ key, label, icon: Icon, color }) => (
        <Card key={key} className="border-0 shadow-sm bg-card/80">
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`h-10 w-10 rounded-xl bg-muted flex items-center justify-center ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{values[key]}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
