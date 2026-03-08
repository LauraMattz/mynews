
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Topics table
CREATE TABLE public.topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read topics" ON public.topics FOR SELECT USING (true);
CREATE POLICY "Anyone can insert topics" ON public.topics FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update topics" ON public.topics FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete topics" ON public.topics FOR DELETE USING (true);

-- Feeds table
CREATE TABLE public.feeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.feeds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read feeds" ON public.feeds FOR SELECT USING (true);
CREATE POLICY "Anyone can insert feeds" ON public.feeds FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update feeds" ON public.feeds FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete feeds" ON public.feeds FOR DELETE USING (true);
CREATE TRIGGER update_feeds_updated_at BEFORE UPDATE ON public.feeds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Articles table
CREATE TABLE public.articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_id UUID REFERENCES public.feeds(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  link TEXT NOT NULL UNIQUE,
  description TEXT,
  summary TEXT,
  source_name TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  relevance_score REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read articles" ON public.articles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert articles" ON public.articles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update articles" ON public.articles FOR UPDATE USING (true);

CREATE INDEX idx_articles_feed_id ON public.articles(feed_id);
CREATE INDEX idx_articles_relevance ON public.articles(relevance_score DESC);
CREATE INDEX idx_articles_published ON public.articles(published_at DESC);

-- Votes table
CREATE TABLE public.votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(article_id)
);
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read votes" ON public.votes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert votes" ON public.votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update votes" ON public.votes FOR UPDATE USING (true);

-- Function to update article relevance score based on votes
CREATE OR REPLACE FUNCTION public.update_article_relevance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.articles
  SET relevance_score = COALESCE((
    SELECT SUM(v.vote)::REAL FROM public.votes v WHERE v.article_id = NEW.article_id
  ), 0)
  WHERE id = NEW.article_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_relevance_on_vote
AFTER INSERT OR UPDATE ON public.votes
FOR EACH ROW EXECUTE FUNCTION public.update_article_relevance();
