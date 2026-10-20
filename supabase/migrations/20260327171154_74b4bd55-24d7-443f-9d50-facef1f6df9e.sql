-- Compte admin de l'ancien projet : ignoré s'il n'existe pas (nouveau projet Supabase).
INSERT INTO public.user_roles (user_id, role)
SELECT '41f5ee08-4190-42e7-8475-924a5e634a66', 'admin'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = '41f5ee08-4190-42e7-8475-924a5e634a66')
ON CONFLICT (user_id, role) DO NOTHING;