import { useState } from "react";
import { useTopics } from "@/hooks/useTopics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X, Tag } from "lucide-react";

export function TopicManager() {
  const { topicsQuery, addTopic, deleteTopic } = useTopics();
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");

  const handleAdd = () => {
    if (!name.trim()) return;
    const kws = keywords.split(",").map(k => k.trim()).filter(Boolean);
    addTopic.mutate({ name: name.trim(), keywords: kws });
    setName("");
    setKeywords("");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Tag className="h-5 w-5 text-primary" />
          Tópicos de Interesse
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Nome do tópico"
            value={name}
            onChange={e => setName(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Palavras-chave (separadas por vírgula)"
            value={keywords}
            onChange={e => setKeywords(e.target.value)}
            className="flex-[2]"
          />
          <Button onClick={handleAdd} size="icon" disabled={addTopic.isPending}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {topicsQuery.data?.map(topic => (
            <Badge
              key={topic.id}
              variant="secondary"
              className="gap-1 py-1.5 px-3 text-sm"
            >
              {topic.name}
              {topic.keywords.length > 0 && (
                <span className="text-muted-foreground ml-1">
                  ({topic.keywords.join(", ")})
                </span>
              )}
              <button
                onClick={() => deleteTopic.mutate(topic.id)}
                className="ml-1 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {topicsQuery.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum tópico cadastrado</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
