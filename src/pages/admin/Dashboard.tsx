import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, MousePointerClick, TrendingUp, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [productsRes, clicksTodayRes, clicksWeekRes] = await Promise.all([
        supabase.from("products").select("id, name, status", { count: "exact" }),
        supabase
          .from("clicks")
          .select("id", { count: "exact" })
          .gte("clicked_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase
          .from("clicks")
          .select("id", { count: "exact" })
          .gte("clicked_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);

      return {
        totalProducts: productsRes.count ?? 0,
        activeProducts: productsRes.data?.filter((p) => p.status === "active").length ?? 0,
        clicksToday: clicksTodayRes.count ?? 0,
        clicksWeek: clicksWeekRes.count ?? 0,
      };
    },
  });

  const statCards = [
    { label: "Produtos cadastrados", value: stats?.totalProducts ?? 0, icon: Package, color: "text-primary" },
    { label: "Produtos ativos", value: stats?.activeProducts ?? 0, icon: Eye, color: "text-success" },
    { label: "Cliques hoje", value: stats?.clicksToday ?? 0, icon: MousePointerClick, color: "text-warning" },
    { label: "Cliques na semana", value: stats?.clicksWeek ?? 0, icon: TrendingUp, color: "text-info" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Visão geral dos seus produtos de afiliados</p>
          </div>
          <Link to="/admin/produtos/novo">
            <Button>Novo produto</Button>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Início rápido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cadastre seus produtos, compartilhe os links públicos e acompanhe os cliques.
            </p>
            <div className="flex gap-3">
              <Link to="/admin/produtos/novo">
                <Button size="sm">Cadastrar produto</Button>
              </Link>
              <Link to="/admin/produtos">
                <Button size="sm" variant="outline">Ver produtos</Button>
              </Link>
              <Link to="/admin/stats">
                <Button size="sm" variant="outline">Estatísticas</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
