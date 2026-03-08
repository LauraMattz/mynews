import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useTopics() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const topicsQuery = useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const addTopic = useMutation({
    mutationFn: async (topic: { name: string; keywords: string[] }) => {
      const { data, error } = await supabase.from("topics").insert(topic).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      toast({ title: "Tópico criado!" });
    },
    onError: (e) => {
      toast({ title: "Erro ao criar tópico", description: e.message, variant: "destructive" });
    },
  });

  const deleteTopic = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("topics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      toast({ title: "Tópico removido" });
    },
  });

  return { topicsQuery, addTopic, deleteTopic };
}
