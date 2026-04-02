import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const PublicProduct = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: product, isLoading, error } = useQuery({
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
        {product.price && (
          <p className="mt-2 text-xl font-semibold text-primary">
            R$ {Number(product.price).toFixed(2).replace(".", ",")}
          </p>
        )}
        {product.description && (
          <p className="mt-4 text-sm text-muted-foreground">{product.description}</p>
        )}
        <p className="mt-8 text-xs text-muted-foreground">Página pública completa na Etapa 5</p>
      </div>
    </div>
  );
};

export default PublicProduct;
