import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Package, ShoppingBag, Copy, Check, Search, X, ExternalLink, Ticket } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const Portfolio = () => {
  const location = useLocation();
  const defaultTab = location.pathname === "/cupons" ? "coupons" : "products";
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const copyCoupon = useCallback((id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const trackCouponClick = useCallback((couponId: string) => {
    supabase.from("coupon_clicks").insert({
      coupon_id: couponId,
      user_agent: navigator.userAgent,
      referrer: document.referrer || null,
    } as any).then(() => {});
  }, []);

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

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["portfolio-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, price, original_price, final_price, payment_method, description, affiliate_url, created_at, main_image_id, coupon_code")
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

  const { data: coupons, isLoading: loadingCoupons } = useQuery({
    queryKey: ["portfolio-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!search.trim()) return products;
    const q = normalize(search.trim());
    return products.filter(
      (p) =>
        normalize(p.name).includes(q) ||
        (p.description && normalize(p.description).includes(q)) ||
        (p.coupon_code && normalize(p.coupon_code).includes(q))
    );
  }, [products, search]);

  const filteredCoupons = useMemo(() => {
    if (!coupons) return [];
    if (!search.trim()) return coupons;
    const q = normalize(search.trim());
    return coupons.filter(
      (c) =>
        normalize(c.description).includes(q) ||
        (c.coupon_code && normalize(c.coupon_code).includes(q))
    );
  }, [coupons, search]);

  const isLoading = loadingProducts || loadingCoupons;

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
          Confira nossa seleção de produtos e cupons recomendados
        </p>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Search */}
        <div className="relative mb-6 mx-auto max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-6 w-full max-w-xs mx-auto">
            <TabsTrigger value="products" className="flex-1 gap-1.5">
              <Package className="h-4 w-4" /> Produtos
            </TabsTrigger>
            <TabsTrigger value="coupons" className="flex-1 gap-1.5">
              <Ticket className="h-4 w-4" /> Cupons
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            {filteredProducts.length === 0 ? (
              <p className="py-20 text-center text-muted-foreground">
                {search ? "Nenhum produto encontrado." : "Nenhum produto disponível no momento."}
              </p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product) => {
                  const imageUrl = mediaMap?.[product.id];
                  return (
                    <div
                      key={product.id}
                      className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-1"
                    >
                      <div className="aspect-square w-full overflow-hidden bg-muted">
                        {imageUrl ? (
                          <img src={imageUrl} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-12 w-12 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="font-semibold text-foreground line-clamp-2">{product.name}</h2>
                          <span className="shrink-0 text-[11px] text-muted-foreground/70 pt-0.5">
                            {format(new Date(product.created_at), "dd MMM yyyy", { locale: ptBR })}
                          </span>
                        </div>
                        {product.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                        )}
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
                                <span className="text-sm text-muted-foreground line-through">
                                  R$ {orig.toFixed(2).replace(".", ",")}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-bold text-primary">
                                    R$ {final_.toFixed(2).replace(".", ",")}{pmLabel}
                                  </span>
                                  {discount > 0 && (
                                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                      -{discount}%
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          if (final_) {
                            return (
                              <span className="text-lg font-bold text-primary">
                                R$ {final_.toFixed(2).replace(".", ",")}{pmLabel}
                              </span>
                            );
                          }
                          if (price != null) {
                            return (
                              <span className="text-lg font-bold text-primary">
                                R$ {price.toFixed(2).replace(".", ",")}{pmLabel}
                              </span>
                            );
                          }
                          return null;
                        })()}
                        {product.coupon_code && (
                          <button
                            onClick={() => copyCoupon(product.id, product.coupon_code!)}
                            className="flex w-full items-center justify-between rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2 transition-colors hover:bg-primary/10"
                          >
                            <div className="text-left">
                              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Cupom</p>
                              <p className="font-mono text-sm font-bold tracking-wider text-foreground">{product.coupon_code}</p>
                            </div>
                            {copiedId === product.id ? (
                              <Check className="h-4 w-4 text-primary" />
                            ) : (
                              <Copy className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        )}
                        <a href={product.affiliate_url} target="_blank" rel="noopener noreferrer" className="block">
                          <Button className="w-full gap-2" size="sm">
                            <ShoppingBag className="h-4 w-4" /> Ver Produto
                          </Button>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Coupons Tab */}
          <TabsContent value="coupons">
            {filteredCoupons.length === 0 ? (
              <p className="py-20 text-center text-muted-foreground">
                {search ? "Nenhum cupom encontrado." : "Nenhum cupom disponível no momento."}
              </p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-hidden rounded-xl border border-border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Data</TableHead>
                        <TableHead className="w-[64px]">Imagem</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-[140px]">Cupom</TableHead>
                        <TableHead className="w-[100px] text-center">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCoupons.map((coupon) => (
                        <TableRow key={coupon.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(coupon.created_at), "dd MMM yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {coupon.image_url ? (
                              <img src={coupon.image_url} alt="" className="h-10 w-10 rounded-md object-cover" loading="lazy" />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                                <Ticket className="h-4 w-4 text-muted-foreground/40" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-foreground">{coupon.description}</TableCell>
                          <TableCell>
                            {coupon.coupon_code ? (
                              <button
                                onClick={() => copyCoupon(coupon.id, coupon.coupon_code!)}
                                className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-primary/30 bg-primary/5 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-foreground transition-colors hover:bg-primary/10"
                              >
                                {coupon.coupon_code}
                                {copiedId === coupon.id ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                              </button>
                            ) : (
                              <span className="text-xs font-medium text-muted-foreground italic">Selecionados</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <a href={coupon.destination_url} target="_blank" rel="noopener noreferrer" onClick={() => trackCouponClick(coupon.id)}>
                              <Button size="sm" variant="outline" className="gap-1.5">
                                <ExternalLink className="h-3.5 w-3.5" /> Ir
                              </Button>
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile cards */}
                <div className="flex flex-col gap-3 sm:hidden">
                  {filteredCoupons.map((coupon) => (
                    <div key={coupon.id} className="flex gap-3 rounded-xl border border-border bg-card p-3">
                      {coupon.image_url ? (
                        <img src={coupon.image_url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Ticket className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-foreground line-clamp-2">{coupon.description}</p>
                          <span className="shrink-0 text-[10px] text-muted-foreground/70 pt-0.5">
                            {format(new Date(coupon.created_at), "dd MMM", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {coupon.coupon_code ? (
                            <button
                              onClick={() => copyCoupon(coupon.id, coupon.coupon_code!)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-primary/30 bg-primary/5 px-2 py-1 font-mono text-xs font-bold tracking-wider text-foreground transition-colors hover:bg-primary/10"
                            >
                              {coupon.coupon_code}
                              {copiedId === coupon.id ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                            </button>
                          ) : (
                            <span className="text-xs font-medium text-muted-foreground italic">Selecionados</span>
                          )}
                          <a href={coupon.destination_url} target="_blank" rel="noopener noreferrer" className="ml-auto" onClick={() => trackCouponClick(coupon.id)}>
                            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs px-2">
                              <ExternalLink className="h-3 w-3" /> Ir
                            </Button>
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        {company?.name ? `${company.name} — ` : ""}Todos os direitos reservados
      </footer>
    </div>
  );
};

export default Portfolio;
