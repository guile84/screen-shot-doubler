
CREATE TABLE public.coupon_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coupon_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert coupon clicks"
ON public.coupon_clicks FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Authenticated users can view coupon clicks"
ON public.coupon_clicks FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);
