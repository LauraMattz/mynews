import { useState } from "react";
import { useFilterTerms } from "@/hooks/useFilterTerms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X, ShieldBan, Target } from "lucide-react";

export function FilterTermsEditor() {
  const { termsQuery, addTerm, removeTerm } = useFilterTerms();
  const [newTerm, setNewTerm] = useState("");
  const [activeType, setActiveType] = useState<"blocklist" | "relevance">("blocklist");

  const allTerms = termsQuery.data || [];
  const blocklist = allTerms.filter(t => t.type === "blocklist");
  const relevance = allTerms.filter(t => t.type === "relevance");

  const handleAdd = () => {
    if (!newTerm.trim()) return;
    addTerm.mutate({ type: activeType, term: newTerm });
    setNewTerm("");
  };

  const currentTerms = activeType === "blocklist" ? blocklist : relevance;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Filtros de Conteúdo</CardTitle>
        <p className="text-xs text-muted-foreground">
          Gerencie os termos que bloqueiam ou priorizam artigos na triagem.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeType} onValueChange={v => setActiveType(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="blocklist" className="gap-1.5">
              <ShieldBan className="h-4 w-4" />
              Blocklist ({blocklist.length})
            </TabsTrigger>
            <TabsTrigger value="relevance" className="gap-1.5">
              <Target className="h-4 w-4" />
              Relevância ({relevance.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeType} className="mt-3 space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder={activeType === "blocklist" ? "Termo para bloquear..." : "Termo de relevância..."}
                value={newTerm}
                onChange={e => setNewTerm(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
              />
              <Button onClick={handleAdd} size="icon" disabled={addTerm.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto">
              {currentTerms.map(t => (
                <Badge
                  key={t.id}
                  variant="secondary"
                  className={`gap-1 text-xs py-1 ${
                    activeType === "blocklist" 
                      ? "bg-destructive/10 text-destructive border-destructive/20" 
                      : "bg-primary/10 text-primary border-primary/20"
                  }`}
                >
                  {t.term}
                  <button
                    onClick={() => removeTerm.mutate(t.id)}
                    className="ml-0.5 hover:opacity-70 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {currentTerms.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">Nenhum termo cadastrado</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
