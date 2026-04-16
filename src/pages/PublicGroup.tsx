import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Package, ShoppingBag, Copy, Check, ArrowLeft } from "lucide-react";
import StarRating from "@/components/StarRating";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

const PublicGroup = () => {
  const { slug } = useParams<{ slug: string }>();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyCoupon = useCallback((id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const { data: group, isLoading: loadingGroup } = useQuery({
    queryKey: ["public-group", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_groups")
        .select("*")
        .eq("slug", slug!)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["public-group-products", group?.id],
    queryFn: async () => {
      const { data: items, error } = await supabase
        .from("product_group_items")
        .select("product_id, sort_order")
        .eq("group_id", group!.id)
        .order("sort_order");
      if (error) throw error;
      if (!items?.length) return [];

      const ids = items.map((i) => i.product_id);
      const { data: prods } = await supabase
        .from("products")
        .select("id, name, slug, price, original_price, final_price, payment_method, description, coupon_code, rating, review_count")
        .in("id", ids)
        .eq("status", "active");

      // Sort by group order
      const orderMap = new Map(items.map((i) => [i.product_id, i.sort_order]));
      return (prods ?? []).sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
    },
    enabled: !!group?.id,
  });

  const productIds = products?.map((p) => p.id) ?? [];

  const { data: mediaMap } = useQuery({
    queryKey: ["public-group-media", productIds],
    queryFn: async () => {
      if (!productIds.length) return {};
      const { data } = await supabase.from("media").select("product_id, url, is_main").in("product_id", productIds);
      const map: Record<string, string> = {};
      if (data) {
        const grouped: Record<string, typeof data> = {};
        data.forEach((m) => { if (!grouped[m.product_id]) grouped[m.product_id] = []; grouped[m.product_id].push(m); });
        Object.entries(grouped).forEach(([pid, items]) => {
          const main = items.find((i) => i.is_main);
          map[pid] = main ? main.url : items[0].url;
        });
      }
      return map;
    },
    enabled: productIds.length > 0,
  });

  const { data: company } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("company_settings").select("name, logo_url").limit(1).maybeSingle();
      return data;
    },
  });

  if (loadingGroup || loadingProducts) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-muted-foreground">Grupo não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-6">
        <div className="mx-auto max-w-5xl">
          <Link to="/profile" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <div className="flex items-center gap-3">
            {company?.logo_url && (
              <img src={company.logo_url} alt="" className="h-10 w-10 rounded-lg object-contain" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
              {group.description && <p className="text-sm text-muted-foreground">{group.description}</p>}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {!products || products.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">Nenhum produto neste grupo.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const imageUrl = mediaMap?.[product.id];
              return (
                <div key={product.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
                  <div className="aspect-square w-full overflow-hidden bg-muted">
                    {imageUrl ? (
                      <img src={imageUrl} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><Package className="h-12 w-12 text-muted-foreground/40" /></div>
                    )}
                  </div>
                  <div className="space-y-3 p-4">
                    {product.rating != null && Number(product.rating) > 0 && (
                      <StarRating rating={Number(product.rating)} reviewCount={Number(product.review_count) || 0} />
                    )}
                    <h2 className="font-semibold text-foreground line-clamp-2">{product.name}</h2>
                    {product.description && <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>}
                    {(() => {
                      const orig = product.original_price != null ? Number(product.original_price) : null;
                      const final_ = product.final_price != null ? Number(product.final_price) : null;
                      const price = product.price != null ? Number(product.price) : null;
                      const pm = product.payment_method;
                      const pmLabel = pm === "pix" ? " no Pix" : pm === "a_vista" ? " à vista" : "";
                      if (orig && final_) {
                        const discount = Math.round(((orig - final_) / orig) * 100);
                        return (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm text-muted-foreground line-through">R$ {orig.toFixed(2).replace(".", ",")}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-primary">R$ {final_.toFixed(2).replace(".", ",")}{pmLabel}</span>
                              {discount > 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">-{discount}%</span>}
                            </div>
                          </div>
                        );
                      }
                      if (final_) return <span className="text-lg font-bold text-primary">R$ {final_.toFixed(2).replace(".", ",")}{pmLabel}</span>;
                      if (price != null) return <span className="text-lg font-bold text-primary">R$ {price.toFixed(2).replace(".", ",")}{pmLabel}</span>;
                      return null;
                    })()}
                    {product.coupon_code && (
                      <button onClick={() => copyCoupon(product.id, product.coupon_code!)} className="flex w-full items-center justify-between rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2 transition-colors hover:bg-primary/10">
                        <div className="text-left">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Cupom</p>
                          <p className="font-mono text-sm font-bold tracking-wider text-foreground">{product.coupon_code}</p>
                        </div>
                        {copiedId === product.id ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    )}
                    <a href={`/go/${product.slug}`} target="_blank" rel="noopener noreferrer" className="block">
                      <Button className="w-full gap-2" size="sm"><ShoppingBag className="h-4 w-4" /> Ver Produto</Button>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        {company?.name ? `${company.name} — ` : ""}Todos os direitos reservados
      </footer>
    </div>
  );
};

export default PublicGroup;
