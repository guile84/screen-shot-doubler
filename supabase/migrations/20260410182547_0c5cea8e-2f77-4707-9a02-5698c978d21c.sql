
CREATE TABLE public.sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active sites" ON public.sites FOR SELECT USING (status = 'active');
CREATE POLICY "Authenticated users can manage sites" ON public.sites FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE public.site_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  ip_address TEXT,
  referrer TEXT,
  user_agent TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.site_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert site clicks" ON public.site_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can view site clicks" ON public.site_clicks FOR SELECT USING (auth.uid() IS NOT NULL);
