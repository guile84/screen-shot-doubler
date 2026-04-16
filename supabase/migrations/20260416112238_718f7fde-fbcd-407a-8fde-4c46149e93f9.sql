
-- Product Groups table
CREATE TABLE public.product_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.product_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active groups" ON public.product_groups
  FOR SELECT USING (status = 'active');

CREATE POLICY "Authenticated users can manage groups" ON public.product_groups
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER update_product_groups_updated_at
  BEFORE UPDATE ON public.product_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Product Group Items junction table
CREATE TABLE public.product_group_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.product_groups(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(group_id, product_id)
);

ALTER TABLE public.product_group_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view group items" ON public.product_group_items
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage group items" ON public.product_group_items
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add icon_image_url to profile_links
ALTER TABLE public.profile_links ADD COLUMN icon_image_url text;

-- Add image display config to media
ALTER TABLE public.media ADD COLUMN object_fit text NOT NULL DEFAULT 'cover';
ALTER TABLE public.media ADD COLUMN focal_x numeric NOT NULL DEFAULT 0.5;
ALTER TABLE public.media ADD COLUMN focal_y numeric NOT NULL DEFAULT 0.5;
