
-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  coupon_code TEXT,
  affiliate_url TEXT NOT NULL,
  video_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  main_image_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create media table
CREATE TABLE public.media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'image',
  is_main BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add FK for main_image_id after media exists
ALTER TABLE public.products ADD CONSTRAINT fk_main_image FOREIGN KEY (main_image_id) REFERENCES public.media(id) ON DELETE SET NULL;

-- Create clicks table
CREATE TABLE public.clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  referrer TEXT,
  user_agent TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;

-- Products: authenticated users can do everything
CREATE POLICY "Authenticated users can manage products" ON public.products FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Products: public can read active products
CREATE POLICY "Public can view active products" ON public.products FOR SELECT USING (status = 'active');

-- Media: authenticated users can manage
CREATE POLICY "Authenticated users can manage media" ON public.media FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Media: public can read media of active products
CREATE POLICY "Public can view media of active products" ON public.media FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products WHERE products.id = media.product_id AND products.status = 'active')
);

-- Clicks: anyone can insert (public redirect)
CREATE POLICY "Anyone can insert clicks" ON public.clicks FOR INSERT WITH CHECK (true);

-- Clicks: authenticated users can read
CREATE POLICY "Authenticated users can view clicks" ON public.clicks FOR SELECT USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_clicks_product_id ON public.clicks(product_id);
CREATE INDEX idx_clicks_clicked_at ON public.clicks(clicked_at);
CREATE INDEX idx_media_product_id ON public.media(product_id);

-- Storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

CREATE POLICY "Anyone can view product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Authenticated users can upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update product images" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete product images" ON storage.objects FOR DELETE USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);
