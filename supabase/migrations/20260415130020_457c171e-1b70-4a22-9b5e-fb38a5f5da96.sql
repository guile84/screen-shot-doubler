
CREATE TABLE public.profile_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  url text NOT NULL,
  icon_emoji text DEFAULT '🔗',
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active profile links" ON public.profile_links FOR SELECT USING (status = 'active');
CREATE POLICY "Authenticated users can manage profile links" ON public.profile_links FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
