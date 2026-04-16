import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Loader2, Ticket, Save, X, Play, Pause, Copy as CopyIcon } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CouponForm {
  description: string;
  coupon_code: string;
  destination_url: string;
  image_url: string;
}

const emptyCoupon: CouponForm = { description: "", coupon_code: "", destination_url: "", image_url: "" };

const Coupons = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyCoupon);
  const [saving, setSaving] = useState(false);

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const openNew = () => { setEditingId(null); setForm(emptyCoupon); setDialogOpen(true); };

  const openEdit = (coupon: any) => {
    setEditingId(coupon.id);
    setForm({ description: coupon.description || "", coupon_code: coupon.coupon_code || "", destination_url: coupon.destination_url || "", image_url: coupon.image_url || "" });
    setDialogOpen(true);
  };

  const openDuplicate = (coupon: any) => {
    setEditingId(null); // null = create new
    setForm({ description: coupon.description || "", coupon_code: coupon.coupon_code || "", destination_url: coupon.destination_url || "", image_url: coupon.image_url || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.description.trim() || !form.destination_url.trim()) {
      toast({ title: "Preencha descrição e link de destino", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = { description: form.description.trim(), coupon_code: form.coupon_code.trim() || null, destination_url: form.destination_url.trim(), image_url: form.image_url.trim() || null };
      if (editingId) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Cupom atualizado!" });
      } else {
        const { error } = await supabase.from("coupons").insert(payload);
        if (error) throw error;
        toast({ title: "Cupom criado!" });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    const { error } = await supabase.from("coupons").update({ status: newStatus }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }); toast({ title: newStatus === "active" ? "Cupom ativado" : "Cupom pausado" }); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }); toast({ title: "Cupom excluído" }); }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cupons</h1>
            <p className="text-sm text-muted-foreground">{coupons?.length ?? 0} cupom(ns) cadastrado(s)</p>
          </div>
          <Button onClick={openNew}><Plus className="h-4 w-4" /> Novo cupom</Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !coupons || coupons.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-12">
            <Ticket className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum cupom cadastrado</p>
            <Button variant="outline" className="mt-4" onClick={openNew}>Cadastrar primeiro cupom</Button>
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coupons.map((coupon) => (
              <Card key={coupon.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4 space-y-3">
                  {coupon.image_url && (
                    <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
                      <img src={coupon.image_url} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground line-clamp-2">{coupon.description}</p>
                    <Badge variant={coupon.status === "active" ? "default" : "secondary"}>
                      {coupon.status === "active" ? "Ativo" : "Pausado"}
                    </Badge>
                  </div>
                  {coupon.coupon_code && (
                    <p className="font-mono text-sm font-bold tracking-wider text-primary">{coupon.coupon_code}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(coupon.created_at), "dd MMM yyyy", { locale: ptBR })}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => openEdit(coupon)}>
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openDuplicate(coupon)} title="Duplicar">
                      <CopyIcon className="h-3.5 w-3.5" /> Duplicar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleToggleStatus(coupon.id, coupon.status)}>
                      {coupon.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      {coupon.status === "active" ? "Pausar" : "Ativar"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir cupom?</AlertDialogTitle>
                          <AlertDialogDescription>Isso excluirá permanentemente este cupom.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(coupon.id)}>Excluir</AlertDialogAction>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Cupom" : "Novo Cupom"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Descrição *</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição do cupom..." rows={2} /></div>
            <div><Label>Código do Cupom</Label><Input value={form.coupon_code} onChange={(e) => setForm({ ...form, coupon_code: e.target.value })} placeholder="Ex: DESCONTO10" />
              <p className="mt-1 text-xs text-muted-foreground">Deixe vazio para exibir "Selecionados"</p></div>
            <div><Label>Link de destino *</Label><Input value={form.destination_url} onChange={(e) => setForm({ ...form, destination_url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>URL da imagem</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}><X className="h-4 w-4" /> Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Coupons;
