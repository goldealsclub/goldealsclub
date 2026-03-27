
-- Fix 1: newsletter_subscribers - restrict insert to valid email format and prevent duplicates
DROP POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscribers
  FOR INSERT TO anon, authenticated
  WITH CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Fix 2: outbound_clicks - ensure user_id matches auth or is null for anon
DROP POLICY "Anyone can insert clicks" ON public.outbound_clicks;
CREATE POLICY "Authenticated users insert own clicks" ON public.outbound_clicks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anon users insert anonymous clicks" ON public.outbound_clicks
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);
