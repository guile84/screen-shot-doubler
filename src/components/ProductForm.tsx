import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { generateSlug, isValidUrl, isVideoUrl } from "@/lib/product-utils";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import ImageUploader from "./ImageUploader";

interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  price: string;
  original_price: string;
  final_price: string;
  payment_method: string;
  coupon_code: string;
  affiliate_url: string;
  video_url: string;
  status: "active" | "paused";
}

interface ProductFormProps {
  initialData?: ProductFormData & { id: string };
  isEditing?: boolean;
}

const emptyForm: ProductFormData = {
  name: "",
  slug: "",
  description: "",
  price: "",
  original_price: "",
  final_price: "",
  payment_method: "",
  coupon_code: "",
  affiliate_url: "",
  video_url: "",
  status: "active",
};

const ProductForm = ({ initialData, isEditing = false }: ProductFormProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState<ProductFormData>(initialData ?? emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [productId, setProductId] = useState<string | null>(initialData?.id ?? null);
  const [images, setImages] = useState<{ id: string; url: string; is_main: boolean }[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingUrls, setPendingUrls] = useState<string[]>([]);

  // Load images for existing product
  useEffect(() => {
    if (!productId) return;
    supabase
      .from("media")
      .select("id, url, is_main")
      .eq("product_id", productId)
      .order("created_at")
      .then(({ data }) => {
        if (data) setImages(data);
      });
  }, [productId]);

  useEffect(() => {
    if (!slugManuallyEdited && !isEditing) {
      setForm((prev) => ({ ...prev, slug: generateSlug(prev.name) }));
    }
  }, [form.name, slugManuallyEdited, isEditing]);

  const updateField = (field: keyof ProductFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Nome é obrigatório";
    if (form.name.length > 200) newErrors.name = "Nome deve ter no máximo 200 caracteres";
    if (!form.slug.trim()) newErrors.slug = "Slug é obrigatório";
    if (!/^[a-z0-9-]+$/.test(form.slug)) newErrors.slug = "Slug deve conter apenas letras minúsculas, números e hífens";
    if (!form.affiliate_url.trim()) newErrors.affiliate_url = "Link de afiliado é obrigatório";
    else if (!isValidUrl(form.affiliate_url)) newErrors.affiliate_url = "URL inválida";
    if (form.video_url && !isVideoUrl(form.video_url)) newErrors.video_url = "Use um link do YouTube ou Vimeo";
    if (form.price && (isNaN(Number(form.price)) || Number(form.price) < 0)) newErrors.price = "Preço inválido";
    if (form.description && form.description.length > 5000) newErrors.description = "Descrição muito longa (máx. 5000 caracteres)";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Upload pending files and URLs after product creation
  const uploadPendingMedia = async (newProductId: string) => {
    const newImages: { id: string; url: string; is_main: boolean }[] = [];

    // Upload pending files
    for (const file of pendingFiles) {
      const ext = file.name.split(".").pop();
      const path = `${newProductId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file);
      if (uploadError) continue;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      const isMain = newImages.length === 0;
      const { data: media, error: dbError } = await supabase
        .from("media")
        .insert({ product_id: newProductId, url: urlData.publicUrl, type: "image", is_main: isMain })
        .select()
        .single();
      if (dbError) continue;
      if (isMain) {
        await supabase.from("products").update({ main_image_id: media.id }).eq("id", newProductId);
      }
      newImages.push(media);
    }

    // Download pending URLs
    for (const url of pendingUrls) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-image`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ imageUrl: url, productId: newProductId }),
          }
        );
        const result = await res.json();
        if (!res.ok) continue;
        const isMain = newImages.length === 0;
        const { data: media, error: dbError } = await supabase
          .from("media")
          .insert({ product_id: newProductId, url: result.publicUrl, type: "image", is_main: isMain })
          .select()
          .single();
        if (dbError) continue;
        if (isMain) {
          await supabase.from("products").update({ main_image_id: media.id }).eq("id", newProductId);
        }
        newImages.push(media);
      } catch { continue; }
    }

    setPendingFiles([]);
    setPendingUrls([]);
    setImages(newImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || null,
        price: form.price ? Number(form.price) : null,
        original_price: form.original_price ? Number(form.original_price) : null,
        final_price: form.final_price ? Number(form.final_price) : null,
        payment_method: form.payment_method || null,
        coupon_code: form.coupon_code.trim().toUpperCase() || null,
        affiliate_url: form.affiliate_url.trim(),
        video_url: form.video_url.trim() || null,
        status: form.status,
      };

      if (isEditing && initialData?.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", initialData.id);
        if (error) throw error;
        toast({ title: "Produto atualizado!" });
        navigate("/admin/produtos");
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select().single();
        if (error) {
          if (error.code === "23505") {
            setErrors({ slug: "Este slug já está em uso" });
            return;
          }
          throw error;
        }
        setProductId(data.id);
        // Upload pending images
        await uploadPendingMedia(data.id);
        toast({ title: "Produto cadastrado com sucesso!" });
        navigate("/admin/produtos");
      }
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/produtos">
          <Button variant="ghost" size="icon" type="button">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEditing ? "Editar produto" : "Novo produto"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditing ? "Atualize as informações do produto" : "Cadastre um novo produto de afiliado"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Informações básicas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do produto *</Label>
                <Input id="name" placeholder="Ex: Tênis Nike Air Max" value={form.name} onChange={(e) => updateField("name", e.target.value)} maxLength={200} />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL) *</Label>
                <Input id="slug" placeholder="tenis-nike-air-max" value={form.slug} onChange={(e) => { setSlugManuallyEdited(true); updateField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); }} maxLength={200} />
                {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
                {form.slug && <p className="text-xs text-muted-foreground">Link público: /p/{form.slug}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" placeholder="Descreva o produto..." value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={4} maxLength={5000} />
                {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Preço e cupom</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="original_price">Preço de origem (R$)</Label>
                  <Input id="original_price" type="number" step="0.01" min="0" placeholder="499.90" value={form.original_price} onChange={(e) => updateField("original_price", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="final_price">Preço final (R$)</Label>
                  <Input id="final_price" type="number" step="0.01" min="0" placeholder="299.90" value={form.final_price} onChange={(e) => updateField("final_price", e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço único (R$) <span className="text-muted-foreground text-xs">— usado se não preencher acima</span></Label>
                  <Input id="price" type="number" step="0.01" min="0" placeholder="299.90" value={form.price} onChange={(e) => updateField("price", e.target.value)} />
                  {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Forma de pagamento</Label>
                  <Select value={form.payment_method || "none"} onValueChange={(v) => updateField("payment_method", v === "none" ? "" : v)}>
                    <SelectTrigger id="payment_method">
                      <SelectValue placeholder="Nenhuma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="a_vista">À vista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="coupon_code">Código de cupom</Label>
                  <Input id="coupon_code" placeholder="PROMO10" value={form.coupon_code} onChange={(e) => updateField("coupon_code", e.target.value.toUpperCase())} maxLength={50} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Links</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="affiliate_url">Link de afiliado *</Label>
                <Input id="affiliate_url" type="url" placeholder="https://..." value={form.affiliate_url} onChange={(e) => updateField("affiliate_url", e.target.value)} />
                {errors.affiliate_url && <p className="text-xs text-destructive">{errors.affiliate_url}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="video_url">Link de vídeo (YouTube ou Vimeo)</Label>
                <Input id="video_url" type="url" placeholder="https://youtube.com/watch?v=..." value={form.video_url} onChange={(e) => updateField("video_url", e.target.value)} />
                {errors.video_url && <p className="text-xs text-destructive">{errors.video_url}</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{form.status === "active" ? "Ativo" : "Pausado"}</p>
                  <p className="text-xs text-muted-foreground">{form.status === "active" ? "Produto visível na página pública" : "Produto oculto da página pública"}</p>
                </div>
                <Switch checked={form.status === "active"} onCheckedChange={(checked) => updateField("status", checked ? "active" : "paused")} />
              </div>
            </CardContent>
          </Card>

          {/* Image upload - always visible */}
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Imagens</CardTitle></CardHeader>
            <CardContent>
              <ImageUploader
                productId={productId}
                images={images}
                onImagesChange={setImages}
                pendingFiles={pendingFiles}
                onPendingFilesChange={setPendingFiles}
                pendingUrls={pendingUrls}
                onPendingUrlsChange={setPendingUrls}
              />
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="pt-6 space-y-2">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditing ? "Salvar alterações" : "Cadastrar produto"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
};

export default ProductForm;
