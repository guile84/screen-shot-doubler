import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MousePointerClick, TrendingUp, Package } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useMemo } from "react";

const Stats = () => {
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

  const chartData = useMemo(() => {
    if (!clicks) return [];
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
  }, [clicks]);

  const productRanking = useMemo(() => {
    if (!clicks || !products) return [];
    const countMap: Record<string, number> = {};
    clicks.forEach((c) => {
      countMap[c.product_id] = (countMap[c.product_id] || 0) + 1;
    });
    return products
      .map((p) => ({ ...p, clicks: countMap[p.id] || 0 }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);
  }, [clicks, products]);

  const totalClicks = clicks?.length ?? 0;
  const todayClicks = clicks?.filter((c) => c.clicked_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length ?? 0;

  if (isLoading) {
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
          <p className="text-sm text-muted-foreground">Acompanhe os cliques nos seus produtos</p>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="shadow-card">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <MousePointerClick className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalClicks}</p>
                <p className="text-xs text-muted-foreground">Total de cliques</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-success/10 p-3">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{todayClicks}</p>
                <p className="text-xs text-muted-foreground">Cliques hoje</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-info/10 p-3">
                <Package className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{products?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Produtos cadastrados</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Cliques nos últimos 7 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Cliques" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Product ranking */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Ranking de produtos</CardTitle>
          </CardHeader>
          <CardContent>
            {productRanking.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum clique registrado ainda.</p>
            ) : (
              <div className="space-y-3">
                {productRanking.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                        {i + 1}
                      </span>
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
      </div>
    </AdminLayout>
  );
};

export default Stats;
