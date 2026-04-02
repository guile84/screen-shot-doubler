import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";

const Stats = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estatísticas</h1>
          <p className="text-sm text-muted-foreground">Acompanhe os cliques nos seus produtos</p>
        </div>

        <Card className="shadow-card">
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Painel de estatísticas será implementado na Etapa 8</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Stats;
