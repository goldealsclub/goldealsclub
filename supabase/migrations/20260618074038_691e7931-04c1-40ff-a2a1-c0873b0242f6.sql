
DROP POLICY IF EXISTS "Anyone can view votes" ON public.deal_votes;

CREATE POLICY "Users can view own votes"
ON public.deal_votes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_deal_vote_scores(deal_ids text[])
RETURNS TABLE(deal_id text, score bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dv.deal_id, COALESCE(SUM(dv.vote), 0)::bigint AS score
  FROM public.deal_votes dv
  WHERE dv.deal_id = ANY(deal_ids)
  GROUP BY dv.deal_id;
$$;

REVOKE ALL ON FUNCTION public.get_deal_vote_scores(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_deal_vote_scores(text[]) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can insert events" ON public.events;
CREATE POLICY "Anyone can insert events"
ON public.events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  event_type IS NOT NULL
  AND (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()))
  )
);

DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;
CREATE POLICY "Anyone can insert page views"
ON public.page_views
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL)
  OR (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()))
);

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

DO $$
DECLARE
  cron_secret text := '37bd41fb0621e6530cbb9e1d9f592503b7c8abe52fd649475abe6cd21b5174ff';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5cWd4aHV6b2JtcXlna3NiYXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMjU0NDgsImV4cCI6MjA4ODgwMTQ0OH0.yndVTKpuMkgee4a8YIfezymps5L2YGMNXhNNr1xkBiE';
BEGIN
  PERFORM cron.unschedule(jobname) FROM cron.job
    WHERE jobname IN ('daily-deal-alerts','awin-daily-import','awin-import-daily-6am','snapshot-deals-daily','prepare-daily-video-brief-7am-paris');

  PERFORM cron.schedule('daily-deal-alerts','0 8 * * *',
    format($cmd$SELECT net.http_post(url:='https://yyqgxhuzobmqygksbaze.supabase.co/functions/v1/daily-alerts', headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s','x-cron-secret','%s'), body:='{"trigger":"cron"}'::jsonb);$cmd$, anon_key, cron_secret));

  PERFORM cron.schedule('awin-daily-import','0 3 * * *',
    format($cmd$SELECT net.http_post(url:='https://yyqgxhuzobmqygksbaze.supabase.co/functions/v1/import-awin-orchestrator?mode=parallel', headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s','x-cron-secret','%s'), body:=jsonb_build_object('triggered_at', now()));$cmd$, anon_key, cron_secret));

  PERFORM cron.schedule('awin-import-daily-6am','0 6 * * *',
    format($cmd$SELECT net.http_post(url:='https://yyqgxhuzobmqygksbaze.supabase.co/functions/v1/import-awin-orchestrator', headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s','x-cron-secret','%s'), body:='{"mode":"parallel"}'::jsonb);$cmd$, anon_key, cron_secret));

  PERFORM cron.schedule('snapshot-deals-daily','0 6 * * *',
    format($cmd$SELECT net.http_post(url:='https://yyqgxhuzobmqygksbaze.supabase.co/functions/v1/snapshot-deals', headers:=jsonb_build_object('Content-Type','application/json','apikey','%s','Authorization','Bearer %s','x-cron-secret','%s'), body:=jsonb_build_object('triggered_at', now()));$cmd$, anon_key, anon_key, cron_secret));

  PERFORM cron.schedule('prepare-daily-video-brief-7am-paris','0 5 * * *',
    format($cmd$SELECT net.http_post(url:='https://yyqgxhuzobmqygksbaze.supabase.co/functions/v1/prepare-daily-video-brief', headers:=jsonb_build_object('Content-Type','application/json','apikey','%s','Authorization','Bearer %s','x-cron-secret','%s'), body:='{"trigger":"cron"}'::jsonb);$cmd$, anon_key, anon_key, cron_secret));
END $$;
