
CREATE TABLE public.deal_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vote smallint NOT NULL DEFAULT 1 CHECK (vote IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, user_id)
);

ALTER TABLE public.deal_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view votes" ON public.deal_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote" ON public.deal_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vote" ON public.deal_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own vote" ON public.deal_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);
