import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useFilterTerms() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const termsQuery = useQuery({
    queryKey: ["filter-terms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("filter_terms")
        .select("*")
        .order("term");
      if (error) throw error;
      return data;
    },
  });

  const blocklistTerms = (termsQuery.data || []).filter(t => t.type === "blocklist").map(t => t.term);
  const relevanceTerms = (termsQuery.data || []).filter(t => t.type === "relevance").map(t => t.term);

  const addTerm = useMutation({
    mutationFn: async ({ type, term }: { type: string; term: string }) => {
      const { error } = await supabase.from("filter_terms").insert({ type, term: term.toLowerCase().trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filter-terms"] });
      toast({ title: "Termo adicionado!" });
    },
    onError: (e) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });

  const removeTerm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("filter_terms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filter-terms"] });
      toast({ title: "Termo removido" });
    },
  });

  return { termsQuery, blocklistTerms, relevanceTerms, addTerm, removeTerm };
}
