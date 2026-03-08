import { useState } from "react";
import { useFeeds } from "@/hooks/useFeeds";
import { useTopics } from "@/hooks/useTopics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rss, Plus, Trash2 } from "lucide-react";

export function FeedManager() {
  const { feedsQuery, addFeed, deleteFeed, toggleFeed } = useFeeds();
  const { topicsQuery } = useTopics();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [topicId, setTopicId] = useState<string>("");

  const handleAdd = () => {
    if (!url.trim() || !name.trim()) return;
    addFeed.mutate({
      url: url.trim(),
      name: name.trim(),
      topic_id: topicId || undefined,
    });
    setUrl("");
    setName("");
    setTopicId("");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Rss className="h-5 w-5 text-primary" />
          Feeds RSS
          <span className="text-sm font-normal text-muted-foreground ml-auto">
            {feedsQuery.data?.filter(f => f.is_active).length || 0} ativos
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Nome do feed"
            value={name}
            onChange={e => setName(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="URL do feed RSS"
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="flex-[2]"
          />
          <Select value={topicId} onValueChange={setTopicId}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tópico" />
            </SelectTrigger>
            <SelectContent>
              {topicsQuery.data?.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} size="icon" disabled={addFeed.isPending}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {feedsQuery.data?.map(feed => (
            <div
              key={feed.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <Switch
                checked={feed.is_active}
                onCheckedChange={is_active => toggleFeed.mutate({ id: feed.id, is_active })}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{feed.name}</p>
                <p className="text-xs text-muted-foreground truncate">{feed.url}</p>
              </div>
              {feed.topics && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {(feed.topics as any).name}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => deleteFeed.mutate(feed.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {feedsQuery.data?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum feed cadastrado. Adicione feeds RSS acima.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
