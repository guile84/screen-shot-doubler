import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import ProductForm from "@/components/ProductForm";
import { Loader2 } from "lucide-react";

const EditProduct = () => {
  const { id } = useParams<{ id: string }>();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as typeof data & { original_price: number | null; final_price: number | null; payment_method: string | null };
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!product) {
    return (
      <AdminLayout>
        <p className="text-muted-foreground">Produto não encontrado.</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <ProductForm
        isEditing
        initialData={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description ?? "",
          price: product.price != null ? String(product.price) : "",
          original_price: product.original_price != null ? String(product.original_price) : "",
          final_price: product.final_price != null ? String(product.final_price) : "",
          payment_method: product.payment_method ?? "",
          coupon_code: product.coupon_code ?? "",
          affiliate_url: product.affiliate_url,
          video_url: product.video_url ?? "",
          status: product.status as "active" | "paused",
        }}
      />
    </AdminLayout>
  );
};

export default EditProduct;
