import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useFeeds() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const feedsQuery = useQuery({
    queryKey: ["feeds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feeds")
        .select("*, topics(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addFeed = useMutation({
    mutationFn: async (feed: { url: string; name: string; topic_id?: string }) => {
      const { data, error } = await supabase.from("feeds").insert(feed).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeds"] });
      toast({ title: "Feed adicionado!" });
    },
    onError: (e) => {
      toast({ title: "Erro ao adicionar feed", description: e.message, variant: "destructive" });
    },
  });

  const deleteFeed = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feeds").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeds"] });
      toast({ title: "Feed removido" });
    },
  });

  const toggleFeed = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("feeds").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeds"] });
    },
  });

  return { feedsQuery, addFeed, deleteFeed, toggleFeed };
}
