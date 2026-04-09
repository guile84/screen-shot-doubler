import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MousePointerClick, TrendingUp, Package, Ticket } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const buildLast7DaysChart = (clicks: { clicked_at: string }[]) => {
  const map: Record<string, number> = {};
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    map[d.toISOString().slice(0, 10)] = 0;
  }
  clicks.forEach((c) => {
    const day = c.clicked_at.slice(0, 10);
    if (day in map) map[day]++;
  });
  return Object.entries(map).map(([date, total]) => ({
    date: new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    total,
  }));
};

const Stats = () => {
  // Product clicks
  const { data: clicks, isLoading } = useQuery({
    queryKey: ["admin-clicks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clicks")
        .select("id, clicked_at, product_id")
        .order("clicked_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["admin-products-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name, slug");
      if (error) throw error;
      return data;
    },
  });

  // Coupon clicks
  const { data: couponClicks, isLoading: loadingCouponClicks } = useQuery({
    queryKey: ["admin-coupon-clicks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupon_clicks" as any)
        .select("id, clicked_at, coupon_id")
        .order("clicked_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as unknown as { id: string; clicked_at: string; coupon_id: string }[];
    },
  });

  const { data: coupons } = useQuery({
    queryKey: ["admin-coupons-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("id, description, coupon_code");
      if (error) throw error;
      return data;
    },
  });

  // Product stats
  const productChartData = useMemo(() => buildLast7DaysChart(clicks ?? []), [clicks]);
  const productRanking = useMemo(() => {
    if (!clicks || !products) return [];
    const countMap: Record<string, number> = {};
    clicks.forEach((c) => { countMap[c.product_id] = (countMap[c.product_id] || 0) + 1; });
    return products
      .map((p) => ({ ...p, clicks: countMap[p.id] || 0 }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);
  }, [clicks, products]);

  const totalClicks = clicks?.length ?? 0;
  const todayClicks = clicks?.filter((c) => c.clicked_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length ?? 0;

  // Coupon stats
  const couponChartData = useMemo(() => buildLast7DaysChart(couponClicks ?? []), [couponClicks]);
  const couponRanking = useMemo(() => {
    if (!couponClicks || !coupons) return [];
    const countMap: Record<string, number> = {};
    couponClicks.forEach((c) => { countMap[c.coupon_id] = (countMap[c.coupon_id] || 0) + 1; });
    return coupons
      .map((c) => ({ ...c, clicks: countMap[c.id] || 0 }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);
  }, [couponClicks, coupons]);

  const totalCouponClicks = couponClicks?.length ?? 0;
  const todayCouponClicks = couponClicks?.filter((c) => c.clicked_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length ?? 0;

  if (isLoading || loadingCouponClicks) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estatísticas</h1>
          <p className="text-sm text-muted-foreground">Acompanhe os cliques nos seus produtos e cupons</p>
        </div>

        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products" className="gap-1.5"><Package className="h-4 w-4" /> Produtos</TabsTrigger>
            <TabsTrigger value="coupons" className="gap-1.5"><Ticket className="h-4 w-4" /> Cupons</TabsTrigger>
          </TabsList>

          {/* ---- Products Tab ---- */}
          <TabsContent value="products" className="space-y-6 mt-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="shadow-card">
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="rounded-lg bg-primary/10 p-3"><MousePointerClick className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{totalClicks}</p>
                    <p className="text-xs text-muted-foreground">Total de cliques</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="rounded-lg bg-success/10 p-3"><TrendingUp className="h-5 w-5 text-success" /></div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{todayClicks}</p>
                    <p className="text-xs text-muted-foreground">Cliques hoje</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="rounded-lg bg-info/10 p-3"><Package className="h-5 w-5 text-info" /></div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{products?.length ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Produtos cadastrados</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-base">Cliques nos últimos 7 dias</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }} />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Cliques" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-base">Ranking de produtos</CardTitle></CardHeader>
              <CardContent>
                {productRanking.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum clique registrado ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {productRanking.map((p, i) => (
                      <div key={p.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium text-foreground">{p.name}</p>
                            <p className="text-xs text-muted-foreground">/p/{p.slug}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-primary">{p.clicks}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- Coupons Tab ---- */}
          <TabsContent value="coupons" className="space-y-6 mt-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="shadow-card">
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="rounded-lg bg-primary/10 p-3"><MousePointerClick className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{totalCouponClicks}</p>
                    <p className="text-xs text-muted-foreground">Total de cliques</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="rounded-lg bg-success/10 p-3"><TrendingUp className="h-5 w-5 text-success" /></div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{todayCouponClicks}</p>
                    <p className="text-xs text-muted-foreground">Cliques hoje</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="rounded-lg bg-info/10 p-3"><Ticket className="h-5 w-5 text-info" /></div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{coupons?.length ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Cupons cadastrados</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-base">Cliques nos últimos 7 dias</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={couponChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }} />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Cliques" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-base">Ranking de cupons</CardTitle></CardHeader>
              <CardContent>
                {couponRanking.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum clique registrado ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {couponRanking.map((c, i) => (
                      <div key={c.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium text-foreground line-clamp-1">{c.description}</p>
                            {c.coupon_code && <p className="text-xs font-mono text-muted-foreground">{c.coupon_code}</p>}
                          </div>
                        </div>
                        <span className="text-sm font-bold text-primary">{c.clicks}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default Stats;
