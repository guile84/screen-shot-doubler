import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Copy, Check, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useCallback } from "react";

function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      const id = u.hostname.includes("youtu.be") ? u.pathname.slice(1) : u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {}
  return null;
}

const PublicProduct = () => {
  const { slug } = useParams<{ slug: string }>();
  const [copied, setCopied] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ["public-product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug!)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: images } = useQuery({
    queryKey: ["public-product-images", product?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("media")
        .select("id, url, is_main")
        .eq("product_id", product!.id)
        .order("is_main", { ascending: false });
      return data ?? [];
    },
    enabled: !!product?.id,
  });

  const copyCoupon = useCallback(() => {
    if (!product?.coupon_code) return;
    navigator.clipboard.writeText(product.coupon_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [product?.coupon_code]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-muted-foreground">Produto indisponível</p>
      </div>
    );
  }

  const embedUrl = product.video_url ? getEmbedUrl(product.video_url) : null;
  const hasImages = images && images.length > 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {/* Image carousel */}
          {hasImages && (
            <div className="relative aspect-square w-full bg-muted">
              <img
                src={images[imgIndex].url}
                alt={product.name}
                className="h-full w-full object-cover"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setImgIndex((i) => (i + 1) % images.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setImgIndex(i)}
                        className={`h-2 w-2 rounded-full transition-colors ${i === imgIndex ? "bg-white" : "bg-white/50"}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Video */}
          {embedUrl && (
            <div className="aspect-video w-full">
              <iframe
                src={embedUrl}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={product.name}
              />
            </div>
          )}

          {/* Content */}
          <div className="space-y-4 p-6">
            <h1 className="text-xl font-bold text-foreground">{product.name}</h1>

            {product.price != null && (
              <p className="text-2xl font-bold text-primary">
                R$ {Number(product.price).toFixed(2).replace(".", ",")}
              </p>
            )}

            {product.description && (
              <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
            )}

            {/* Coupon */}
            {product.coupon_code && (
              <button
                onClick={copyCoupon}
                className="flex w-full items-center justify-between rounded-lg border-2 border-dashed border-warning bg-warning/10 px-4 py-3 transition-colors hover:bg-warning/20"
              >
                <div className="text-left">
                  <p className="text-xs font-medium text-muted-foreground">Cupom de desconto</p>
                  <p className="font-mono text-lg font-bold tracking-wider text-foreground">{product.coupon_code}</p>
                </div>
                {copied ? (
                  <Check className="h-5 w-5 text-success" />
                ) : (
                  <Copy className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            )}

            {/* CTA */}
            <Button asChild className="w-full gap-2 text-base" size="lg">
              <a href={`/go/${product.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Ver produto
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProduct;
