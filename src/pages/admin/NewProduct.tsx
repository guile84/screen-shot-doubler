import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const NewProduct = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Novo produto</h1>
          <p className="text-sm text-muted-foreground">Cadastre um novo produto de afiliado</p>
        </div>

        <Card className="shadow-card">
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Formulário de cadastro será implementado na Etapa 3</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default NewProduct;
