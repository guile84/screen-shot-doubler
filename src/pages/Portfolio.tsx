import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Package, ShoppingBag, Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";

const Portfolio = () => {
  const { data: company } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("company_settings")
        .select("name, logo_url")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["portfolio-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, price, description, affiliate_url, created_at, main_image_id")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const productIds = products?.map((p) => p.id) ?? [];

  const { data: mediaMap } = useQuery({
    queryKey: ["portfolio-media", productIds],
    queryFn: async () => {
      if (productIds.length === 0) return {};
      const { data } = await supabase
        .from("media")
        .select("id, url, product_id, is_main")
        .in("product_id", productIds);
      const map: Record<string, string> = {};
      if (data) {
        const grouped: Record<string, typeof data> = {};
        data.forEach((m) => {
          if (!grouped[m.product_id]) grouped[m.product_id] = [];
          grouped[m.product_id].push(m);
        });
        Object.entries(grouped).forEach(([pid, items]) => {
          const main = items.find((i) => i.is_main);
          map[pid] = main ? main.url : items[0].url;
        });
      }
      return map;
    },
    enabled: productIds.length > 0,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-6 text-center">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-3">
          {company?.logo_url ? (
            <img src={company.logo_url} alt={company.name || "Logo"} className="h-10 w-10 rounded-lg object-contain" />
          ) : (
            <Package className="h-6 w-6 text-primary" />
          )}
          <h1 className="text-2xl font-bold text-foreground">
            {company?.name || "Nossos Produtos"}
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Confira nossa seleção de produtos recomendados
        </p>
      </header>

      {/* Grid */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        {!products || products.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">Nenhum produto disponível no momento.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const imageUrl = mediaMap?.[product.id];
              return (
                <div
                  key={product.id}
                  className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-1"
                >
                  {/* Image */}
                  <div className="aspect-square w-full overflow-hidden bg-muted">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-12 w-12 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="space-y-2 p-4">
                    <h2 className="font-semibold text-foreground line-clamp-2">
                      {product.name}
                    </h2>
                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      {product.price != null ? (
                        <span className="text-lg font-bold text-primary">
                          R$ {Number(product.price).toFixed(2).replace(".", ",")}
                        </span>
                      ) : (
                        <span />
                      )}
                    </div>
                    <a
                      href={product.affiliate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button className="w-full gap-2" size="sm">
                        <ShoppingBag className="h-4 w-4" />
                        Ver Produto
                      </Button>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        {company?.name ? `${company.name} — ` : ""}Todos os direitos reservados
      </footer>
    </div>
  );
};

export default Portfolio;
