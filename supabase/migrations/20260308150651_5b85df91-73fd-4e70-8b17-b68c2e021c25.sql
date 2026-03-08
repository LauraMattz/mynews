ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS ai_relevance_tags text[] DEFAULT '{}';
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS ai_relevance_score smallint DEFAULT 0;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS ai_review_status text DEFAULT 'pending';