
-- Create role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Only admins can read user_roles
CREATE POLICY "Admins can read roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read outbound_clicks
DROP POLICY IF EXISTS "No public reads" ON public.outbound_clicks;

CREATE POLICY "Admins can read clicks"
ON public.outbound_clicks
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anon cannot read clicks"
ON public.outbound_clicks
FOR SELECT
TO anon
USING (false);

-- Create analytics view for dashboard
CREATE OR REPLACE VIEW public.click_stats AS
SELECT
  oc.deal_id,
  d.title AS deal_title,
  d.brand,
  d.category,
  d.merchant,
  COUNT(*) AS click_count,
  MIN(oc.clicked_at) AS first_click,
  MAX(oc.clicked_at) AS last_click
FROM public.outbound_clicks oc
LEFT JOIN public.deals d ON d.id = oc.deal_id
GROUP BY oc.deal_id, d.title, d.brand, d.category, d.merchant;
