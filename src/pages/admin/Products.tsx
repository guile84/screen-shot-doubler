import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Copy,
  Play,
  Pause,
  MousePointerClick,
  Loader2,
  Package,
  DollarSign,
  ExternalLink,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type StatusFilter = "all" | "active" | "paused";

const Products = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [quickPriceProduct, setQuickPriceProduct] = useState<any>(null);
  const [quickOriginalPrice, setQuickOriginalPrice] = useState("");
  const [quickFinalPrice, setQuickFinalPrice] = useState("");
  const [quickPrice, setQuickPrice] = useState("");
  const [quickPaymentMethod, setQuickPaymentMethod] = useState("");
  const [quickCoupon, setQuickCoupon] = useState("");
  const [isSavingQuick, setIsSavingQuick] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Get main images for products
  const { data: mainImages } = useQuery({
    queryKey: ["product-main-images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media")
        .select("product_id, url")
        .eq("is_main", true);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((m) => { map[m.product_id] = m.url; });
      return map;
    },
  });

  const { data: clickCounts } = useQuery({
    queryKey: ["product-click-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clicks")
        .select("product_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((c) => {
        counts[c.product_id] = (counts[c.product_id] || 0) + 1;
      });
      return counts;
    },
  });

  const filtered = products?.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    const { error } = await supabase
      .from("products")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: newStatus === "active" ? "Produto ativado" : "Produto pausado" });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: "Produto excluído" });
    }
  };

  const copyPublicLink = (slug: string) => {
    const url = `${window.location.origin}/p/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!" });
  };

  const openQuickPrice = (product: any) => {
    setQuickPriceProduct(product);
    setQuickOriginalPrice(product.original_price != null ? String(product.original_price) : "");
    setQuickFinalPrice(product.final_price != null ? String(product.final_price) : "");
    setQuickPrice(product.price != null ? String(product.price) : "");
    setQuickPaymentMethod(product.payment_method ?? "");
    setQuickCoupon(product.coupon_code ?? "");
  };

  const handleQuickSave = async () => {
    if (!quickPriceProduct) return;
    setIsSavingQuick(true);
    try {
      const newFinal = quickFinalPrice ? Number(quickFinalPrice) : null;
      const newPrice = quickPrice ? Number(quickPrice) : null;
      const effectiveNew = newFinal ?? newPrice;
      const oldFinal = quickPriceProduct.final_price != null ? Number(quickPriceProduct.final_price) : (quickPriceProduct.price != null ? Number(quickPriceProduct.price) : null);

      const payload: any = {
        original_price: quickOriginalPrice ? Number(quickOriginalPrice) : null,
        final_price: newFinal,
        price: newPrice,
        payment_method: quickPaymentMethod || null,
        coupon_code: quickCoupon.trim().toUpperCase() || null,
      };

      const { error } = await supabase.from("products").update(payload).eq("id", quickPriceProduct.id);
      if (error) throw error;

      // Save price history if value changed
      if (effectiveNew != null && effectiveNew !== oldFinal) {
        await supabase.from("price_history").insert({
          product_id: quickPriceProduct.id,
          price: effectiveNew,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["product", quickPriceProduct.id] });
      queryClient.invalidateQueries({ queryKey: ["public-product"] });
      toast({ title: "Atualizado!" });
      setQuickPriceProduct(null);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSavingQuick(false);
    }
  };

  const statusFilters: { label: string; value: StatusFilter }[] = [
    { label: "Todos", value: "all" },
    { label: "Ativos", value: "active" },
    { label: "Pausados", value: "paused" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
            <p className="text-sm text-muted-foreground">
              {products?.length ?? 0} produto(s) cadastrado(s)
            </p>
          </div>
          <Link to="/admin/produtos/novo">
            <Button>
              <Plus className="h-4 w-4" />
              Novo produto
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              maxLength={100}
            />
          </div>
          <div className="flex gap-1">
            {statusFilters.map((f) => (
              <Button
                key={f.value}
                variant={statusFilter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered?.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">
                {products?.length === 0
                  ? "Nenhum produto cadastrado"
                  : "Nenhum produto encontrado"}
              </p>
              {products?.length === 0 && (
                <Link to="/admin/produtos/novo" className="mt-4">
                  <Button variant="outline">Cadastrar primeiro produto</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered?.map((product) => {
              const thumb = mainImages?.[product.id];
              const displayPrice = product.final_price ?? product.price;
              return (
                <Card key={product.id} className="shadow-card transition-shadow hover:shadow-card-hover overflow-hidden">
                  <CardContent className="p-0">
                    {/* Thumbnail */}
                    <div className="relative h-32 bg-muted">
                      {thumb ? (
                        <img src={thumb} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                      )}
                      <Badge
                        variant={product.status === "active" ? "default" : "secondary"}
                        className={`absolute top-2 right-2 ${
                          product.status === "active"
                            ? "bg-success text-success-foreground"
                            : ""
                        }`}
                      >
                        {product.status === "active" ? "Ativo" : "Pausado"}
                      </Badge>
                    </div>

                    <div className="p-4">
                      {/* Header */}
                      <h3 className="truncate font-semibold text-foreground">{product.name}</h3>
                      <p className="truncate text-xs text-muted-foreground mb-3">/p/{product.slug}</p>

                      {/* Info */}
                      <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
                        {displayPrice != null && (
                          <span className="font-medium text-foreground">
                            R$ {Number(displayPrice).toFixed(2).replace(".", ",")}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <MousePointerClick className="h-3.5 w-3.5" />
                          {clickCounts?.[product.id] ?? 0} cliques
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-1.5">
                        <Link to={`/admin/produtos/${product.id}/editar`}>
                          <Button variant="outline" size="sm">
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                        </Link>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openQuickPrice(product)}
                        >
                          <DollarSign className="h-3.5 w-3.5" />
                          Preço
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyPublicLink(product.slug)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Link
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          title="Abrir em nova aba"
                        >
                          <a
                            href={`/p/${product.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(product.id, product.status)}
                        >
                          {product.status === "active" ? (
                            <Pause className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                          {product.status === "active" ? "Pausar" : "Ativar"}
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Isso excluirá permanentemente "{product.name}" e todos os dados
                                relacionados (imagens, cliques).
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(product.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Price/Coupon Dialog */}
      <Dialog open={!!quickPriceProduct} onOpenChange={(open) => !open && setQuickPriceProduct(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Preço e cupom — {quickPriceProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quick-original-price">Preço de origem (R$)</Label>
                <Input id="quick-original-price" type="number" step="0.01" min="0" placeholder="499.90" value={quickOriginalPrice} onChange={(e) => setQuickOriginalPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quick-final-price">Preço final (R$)</Label>
                <Input id="quick-final-price" type="number" step="0.01" min="0" placeholder="299.90" value={quickFinalPrice} onChange={(e) => setQuickFinalPrice(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quick-price">Preço único (R$) <span className="text-xs text-muted-foreground">— usado se não preencher acima</span></Label>
                <Input id="quick-price" type="number" step="0.01" min="0" placeholder="299.90" value={quickPrice} onChange={(e) => setQuickPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quick-payment">Forma de pagamento</Label>
                <Select value={quickPaymentMethod || "none"} onValueChange={(v) => setQuickPaymentMethod(v === "none" ? "" : v)}>
                  <SelectTrigger id="quick-payment">
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
            <div className="space-y-2">
              <Label htmlFor="quick-coupon">Código de cupom</Label>
              <Input id="quick-coupon" placeholder="PROMO10" value={quickCoupon} onChange={(e) => setQuickCoupon(e.target.value.toUpperCase())} maxLength={50} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickPriceProduct(null)}>Cancelar</Button>
            <Button onClick={handleQuickSave} disabled={isSavingQuick}>
              {isSavingQuick && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Products;
