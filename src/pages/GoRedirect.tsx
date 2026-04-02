import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const GoRedirect = () => {
  const { slug } = useParams<{ slug: string }>();

  useEffect(() => {
    const redirect = async () => {
      if (!slug) return;

      const { data: product } = await supabase
        .from("products")
        .select("id, affiliate_url")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();

      if (product) {
        // Register click
        await supabase.from("clicks").insert({
          product_id: product.id,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent || null,
        });

        // Redirect
        window.location.href = product.affiliate_url;
      }
    };

    redirect();
  }, [slug]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default GoRedirect;
