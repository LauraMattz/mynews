
-- Add source_reputation column to feeds
ALTER TABLE public.feeds ADD COLUMN IF NOT EXISTS approval_rate real DEFAULT 0;
ALTER TABLE public.feeds ADD COLUMN IF NOT EXISTS total_articles integer DEFAULT 0;

-- Add recommendation_score to articles (composite score)
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS recommendation_score real DEFAULT 0;

-- Function to recalculate source reputation based on voting history
CREATE OR REPLACE FUNCTION public.recalculate_source_reputation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE feeds f SET
    approval_rate = COALESCE(sub.rate, 0),
    total_articles = COALESCE(sub.total, 0)
  FROM (
    SELECT 
      a.feed_id,
      COUNT(*) as total,
      CASE WHEN COUNT(*) > 0 
        THEN COUNT(*) FILTER (WHERE a.ai_review_status = 'approved')::real / COUNT(*)::real
        ELSE 0 
      END as rate
    FROM articles a
    WHERE a.feed_id IS NOT NULL AND a.ai_review_status IN ('approved', 'rejected')
    GROUP BY a.feed_id
  ) sub
  WHERE f.id = sub.feed_id;
END;
$$;

-- Function to compute recommendation score for an article
CREATE OR REPLACE FUNCTION public.compute_recommendation_score(
  p_relevance_score real,
  p_ai_relevance_score smallint,
  p_source_approval_rate real,
  p_published_at timestamptz,
  p_ai_review_status text
)
RETURNS real
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  vote_component real;
  ai_component real;
  source_component real;
  recency_component real;
  hours_old real;
BEGIN
  -- Vote component: user feedback (weight: 30%)
  vote_component := LEAST(GREATEST(p_relevance_score, -5), 5) / 5.0 * 30;
  
  -- AI component: AI classification score (weight: 25%)
  ai_component := COALESCE(p_ai_relevance_score, 0)::real / 10.0 * 25;
  
  -- Source reputation component (weight: 25%)
  source_component := COALESCE(p_source_approval_rate, 0.5) * 25;
  
  -- Recency component: newer = better, decays over 72h (weight: 20%)
  hours_old := EXTRACT(EPOCH FROM (now() - COALESCE(p_published_at, now()))) / 3600.0;
  recency_component := GREATEST(0, (1 - hours_old / 72.0)) * 20;
  
  -- Penalty for rejected articles
  IF p_ai_review_status = 'rejected' THEN
    RETURN -100;
  END IF;
  
  RETURN vote_component + ai_component + source_component + recency_component;
END;
$$;

-- Trigger to update recommendation_score when votes change
CREATE OR REPLACE FUNCTION public.update_recommendation_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ai_score smallint;
  v_ai_status text;
  v_published_at timestamptz;
  v_relevance_score real;
  v_source_rate real;
  v_feed_id uuid;
BEGIN
  -- Get article data
  SELECT a.ai_relevance_score, a.ai_review_status, a.published_at, a.relevance_score, a.feed_id
  INTO v_ai_score, v_ai_status, v_published_at, v_relevance_score, v_feed_id
  FROM articles a WHERE a.id = NEW.id;

  -- Get source approval rate
  SELECT COALESCE(f.approval_rate, 0.5) INTO v_source_rate
  FROM feeds f WHERE f.id = v_feed_id;

  -- Update recommendation score
  UPDATE articles SET recommendation_score = compute_recommendation_score(
    v_relevance_score, v_ai_score, v_source_rate, v_published_at, v_ai_status
  ) WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Trigger on articles update (when score/status changes)
CREATE TRIGGER trg_update_recommendation_score
  AFTER UPDATE OF relevance_score, ai_relevance_score, ai_review_status ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_recommendation_score();

-- Batch update all existing articles' recommendation scores
UPDATE articles a SET recommendation_score = compute_recommendation_score(
  a.relevance_score,
  a.ai_relevance_score,
  COALESCE((SELECT f.approval_rate FROM feeds f WHERE f.id = a.feed_id), 0.5),
  a.published_at,
  a.ai_review_status
);
