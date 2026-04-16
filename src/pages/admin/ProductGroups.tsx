import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Pencil, Loader2, Save, X, FolderOpen, Copy, Search, Package,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface GroupForm {
  name: string;
  slug: string;
  description: string;
}

const emptyGroup: GroupForm = { name: "", slug: "", description: "" };

const generateSlug = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const ProductGroups = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GroupForm>(emptyGroup);
  const [saving, setSaving] = useState(false);
  const [manageGroupId, setManageGroupId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");

  const { data: groups, isLoading } = useQuery({
    queryKey: ["admin-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_groups")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: groupItems } = useQuery({
    queryKey: ["admin-group-items", manageGroupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_group_items")
        .select("*, products(id, name, slug)")
        .eq("group_id", manageGroupId!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!manageGroupId,
  });

  const { data: allProducts } = useQuery({
    queryKey: ["admin-products-for-groups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name, slug").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!manageGroupId,
  });

  const { data: mainImages } = useQuery({
    queryKey: ["product-main-images-groups"],
    queryFn: async () => {
      const { data } = await supabase.from("media").select("product_id, url").eq("is_main", true);
      const map: Record<string, string> = {};
      data?.forEach((m) => { map[m.product_id] = m.url; });
      return map;
    },
    enabled: !!manageGroupId,
  });

  const openNew = () => { setEditingId(null); setForm(emptyGroup); setDialogOpen(true); };

  const openEdit = (g: any) => {
    setEditingId(g.id);
    setForm({ name: g.name, slug: g.slug, description: g.description || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast({ title: "Preencha nome e slug", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), slug: form.slug.trim(), description: form.description.trim() || null };
      if (editingId) {
        const { error } = await supabase.from("product_groups").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Grupo atualizado!" });
      } else {
        const { error } = await supabase.from("product_groups").insert(payload);
        if (error) throw error;
        toast({ title: "Grupo criado!" });
      }
      qc.invalidateQueries({ queryKey: ["admin-groups"] });
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("product_groups").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { qc.invalidateQueries({ queryKey: ["admin-groups"] }); toast({ title: "Grupo excluído" }); }
  };

  const addProductToGroup = async (productId: string) => {
    if (!manageGroupId) return;
    const nextOrder = (groupItems?.length ?? 0);
    const { error } = await supabase.from("product_group_items").insert({ group_id: manageGroupId, product_id: productId, sort_order: nextOrder });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["admin-group-items", manageGroupId] });
    toast({ title: "Produto adicionado!" });
  };

  const removeProductFromGroup = async (itemId: string) => {
    const { error } = await supabase.from("product_group_items").delete().eq("id", itemId);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { qc.invalidateQueries({ queryKey: ["admin-group-items", manageGroupId] }); toast({ title: "Produto removido" }); }
  };

  const copyGroupLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/g/${slug}`);
    toast({ title: "Link copiado!" });
  };

  const existingProductIds = new Set(groupItems?.map((gi: any) => gi.product_id) ?? []);
  const availableProducts = allProducts?.filter(
    (p) => !existingProductIds.has(p.id) && (!productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()))
  ) ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Grupos de Produtos</h1>
            <p className="text-sm text-muted-foreground">{groups?.length ?? 0} grupo(s)</p>
          </div>
          <Button onClick={openNew}><Plus className="h-4 w-4" /> Novo grupo</Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !groups || groups.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum grupo cadastrado</p>
            <Button variant="outline" className="mt-4" onClick={openNew}>Criar primeiro grupo</Button>
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <Card key={g.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{g.name}</p>
                      <p className="text-xs text-muted-foreground">/g/{g.slug}</p>
                    </div>
                    <Badge variant={g.status === "active" ? "default" : "secondary"}>
                      {g.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  {g.description && <p className="text-sm text-muted-foreground line-clamp-2">{g.description}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => setManageGroupId(g.id)}>
                      <Package className="h-3.5 w-3.5" /> Produtos
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(g)}>
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => copyGroupLink(g.slug)}>
                      <Copy className="h-3.5 w-3.5" /> Link
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir grupo?</AlertDialogTitle>
                          <AlertDialogDescription>Isso excluirá o grupo e removerá os vínculos com produtos.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(g.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? "Editar Grupo" : "Novo Grupo"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => {
                const name = e.target.value;
                setForm({ ...form, name, slug: editingId ? form.slug : generateSlug(name) });
              }} placeholder="Ex: Melhores Airfryers" />
            </div>
            <div>
              <Label>Slug (URL) *</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="melhores-airfryers" />
              <p className="mt-1 text-xs text-muted-foreground">URL: /g/{form.slug || "..."}</p>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição do grupo..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}><X className="h-4 w-4" /> Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Products Dialog */}
      <Dialog open={!!manageGroupId} onOpenChange={(open) => !open && setManageGroupId(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Produtos do Grupo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Current products */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Produtos no grupo ({groupItems?.length ?? 0})</Label>
              {groupItems?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum produto adicionado</p>}
              {groupItems?.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border p-2">
                  {mainImages?.[item.product_id] ? (
                    <img src={mainImages[item.product_id]} alt="" className="h-10 w-10 rounded-md object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted"><Package className="h-4 w-4 text-muted-foreground" /></div>
                  )}
                  <span className="flex-1 text-sm font-medium truncate">{item.products?.name}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeProductFromGroup(item.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add products */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Adicionar produto</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar produto..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {availableProducts.map((p) => (
                  <button key={p.id} onClick={() => addProductToGroup(p.id)} className="flex w-full items-center gap-3 rounded-lg border border-border p-2 text-left hover:bg-muted transition-colors">
                    {mainImages?.[p.id] ? (
                      <img src={mainImages[p.id]} alt="" className="h-8 w-8 rounded-md object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted"><Package className="h-3.5 w-3.5 text-muted-foreground" /></div>
                    )}
                    <span className="text-sm truncate">{p.name}</span>
                    <Plus className="ml-auto h-4 w-4 text-primary shrink-0" />
                  </button>
                ))}
                {availableProducts.length === 0 && <p className="text-xs text-muted-foreground py-2 text-center">Nenhum produto disponível</p>}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default ProductGroups;
