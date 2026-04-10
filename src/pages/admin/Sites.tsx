import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Pencil, Loader2, Globe, Save, X, Play, Pause, Upload,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SiteForm {
  description: string;
  destination_url: string;
  image_url: string;
}

const emptySite: SiteForm = { description: "", destination_url: "", image_url: "" };

const Sites = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SiteForm>(emptySite);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sites, isLoading } = useQuery({
    queryKey: ["admin-sites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sites" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const openNew = () => { setEditingId(null); setForm(emptySite); setDialogOpen(true); };

  const openEdit = (site: any) => {
    setEditingId(site.id);
    setForm({ description: site.description || "", destination_url: site.destination_url || "", image_url: site.image_url || "" });
    setDialogOpen(true);
  };

  const handleUploadImage = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `sites/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: pub.publicUrl }));
      toast({ title: "Imagem enviada!" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.description.trim() || !form.destination_url.trim()) {
      toast({ title: "Preencha descrição e link de destino", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        description: form.description.trim(),
        destination_url: form.destination_url.trim(),
        image_url: form.image_url.trim() || null,
      };
      if (editingId) {
        const { error } = await supabase.from("sites" as any).update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Site atualizado!" });
      } else {
        const { error } = await supabase.from("sites" as any).insert(payload);
        if (error) throw error;
        toast({ title: "Site criado!" });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-sites"] });
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    const { error } = await supabase.from("sites" as any).update({ status: newStatus }).eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["admin-sites"] });
      toast({ title: newStatus === "active" ? "Site ativado" : "Site pausado" });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("sites" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["admin-sites"] });
      toast({ title: "Site excluído" });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sites</h1>
            <p className="text-sm text-muted-foreground">{sites?.length ?? 0} site(s) cadastrado(s)</p>
          </div>
          <Button onClick={openNew}><Plus className="h-4 w-4" /> Novo site</Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !sites || sites.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Globe className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum site cadastrado</p>
              <Button variant="outline" className="mt-4" onClick={openNew}>Cadastrar primeiro site</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sites.map((site: any) => (
              <Card key={site.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4 space-y-3">
                  {site.image_url && (
                    <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
                      <img src={site.image_url} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground line-clamp-2">{site.description}</p>
                    <Badge variant={site.status === "active" ? "default" : "secondary"}>
                      {site.status === "active" ? "Ativo" : "Pausado"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{site.destination_url}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(site.created_at), "dd MMM yyyy", { locale: ptBR })}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => openEdit(site)}>
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleToggleStatus(site.id, site.status)}>
                      {site.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      {site.status === "active" ? "Pausar" : "Ativar"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir site?</AlertDialogTitle>
                          <AlertDialogDescription>Isso excluirá permanentemente este site.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(site.id)}>Excluir</AlertDialogAction>
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
            <DialogTitle>{editingId ? "Editar Site" : "Novo Site"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descrição *</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição do site..." rows={2} />
            </div>
            <div>
              <Label>Link de destino *</Label>
              <Input value={form.destination_url} onChange={(e) => setForm({ ...form, destination_url: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <Label>Imagem</Label>
              <div className="space-y-2">
                <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="URL da imagem..." />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">ou</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Upload
                  </Button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleUploadImage(e.target.files[0]); }} />
                </div>
                {form.image_url && (
                  <img src={form.image_url} alt="Preview" className="h-20 w-20 rounded-md object-cover border border-border" />
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}><X className="h-4 w-4" /> Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Sites;
