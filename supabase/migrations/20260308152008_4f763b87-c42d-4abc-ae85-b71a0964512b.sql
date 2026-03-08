
CREATE TABLE public.filter_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  term text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(type, term)
);

ALTER TABLE public.filter_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read filter_terms" ON public.filter_terms FOR SELECT USING (true);
CREATE POLICY "Anyone can insert filter_terms" ON public.filter_terms FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update filter_terms" ON public.filter_terms FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete filter_terms" ON public.filter_terms FOR DELETE USING (true);
