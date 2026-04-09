
ALTER TABLE public.products
ADD COLUMN original_price numeric NULL,
ADD COLUMN final_price numeric NULL,
ADD COLUMN payment_method text NULL;
