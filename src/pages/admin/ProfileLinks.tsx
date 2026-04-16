import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, GripVertical, Eye, Image as ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProfileLink {
  id: string;
  title: string;
  url: string;
  icon_emoji: string;
  icon_image_url: string | null;
  sort_order: number;
  status: string;
}

const EMOJI_OPTIONS = ["🔗", "🛒", "📱", "💬", "📸", "🎥", "🎵", "📧", "🌐", "⭐", "🏠", "💰", "🎁", "📢", "🔥"];

const ProfileLinks = () => {
  const { toast } = useToast();
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchLinks = async () => {
    const { data } = await supabase.from("profile_links").select("*").order("sort_order");
    setLinks((data as ProfileLink[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLinks(); }, []);

  const addLink = () => {
    setLinks([...links, {
      id: `new-${Date.now()}`, title: "", url: "", icon_emoji: "🔗",
      icon_image_url: null, sort_order: links.length, status: "active",
    }]);
  };

  const updateLink = (index: number, field: keyof ProfileLink, value: any) => {
    const updated = [...links];
    (updated[index] as any)[field] = value;
    setLinks(updated);
  };

  const removeLink = async (index: number) => {
    const link = links[index];
    if (!link.id.startsWith("new-")) {
      await supabase.from("profile_links").delete().eq("id", link.id);
    }
    setLinks(links.filter((_, i) => i !== index));
    toast({ title: "Link removido" });
  };

  const moveLink = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= links.length) return;
    const updated = [...links];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setLinks(updated);
  };

  const handleImageUpload = async (index: number, file: File) => {
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      toast({ title: "Imagem inválida", description: "Máx. 2MB, formato de imagem", variant: "destructive" });
      return;
    }
    try {
      const ext = file.name.split(".").pop();
      const path = `profile-icons/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      updateLink(index, "icon_image_url", urlData.publicUrl);
      toast({ title: "Ícone enviado!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        if (!link.title.trim() || !link.url.trim()) continue;
        const payload = {
          title: link.title.trim(), url: link.url.trim(), icon_emoji: link.icon_emoji,
          icon_image_url: link.icon_image_url || null, sort_order: i, status: link.status,
        };
        if (link.id.startsWith("new-")) {
          await supabase.from("profile_links").insert(payload);
        } else {
          await supabase.from("profile_links").update(payload).eq("id", link.id);
        }
      }
      toast({ title: "Links salvos!" });
      fetchLinks();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Links do Perfil</h1>
            <p className="text-sm text-muted-foreground">Configure os links da sua página de perfil</p>
          </div>
          <Link to="/profile" target="_blank">
            <Button variant="outline" size="sm" className="gap-2"><Eye className="h-4 w-4" /> Visualizar</Button>
          </Link>
        </div>

        <div className="space-y-3 max-w-2xl">
          {links.map((link, index) => (
            <Card key={link.id} className="shadow-sm">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex flex-col gap-1 pt-2">
                  <button type="button" onClick={() => moveLink(index, -1)} disabled={index === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                    <GripVertical className="h-4 w-4 rotate-90 scale-x-[-1]" />
                  </button>
                  <button type="button" onClick={() => moveLink(index, 1)} disabled={index === links.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                    <GripVertical className="h-4 w-4 rotate-90" />
                  </button>
                </div>

                <div className="flex-1 space-y-3">
                  {/* Icon selection */}
                  <div>
                    <Label className="text-xs mb-1 block">Ícone</Label>
                    <Tabs defaultValue={link.icon_image_url ? "image" : "emoji"} className="w-full">
                      <TabsList className="h-8">
                        <TabsTrigger value="emoji" className="text-xs h-6 px-2">Emoji</TabsTrigger>
                        <TabsTrigger value="image" className="text-xs h-6 px-2">Imagem</TabsTrigger>
                      </TabsList>
                      <TabsContent value="emoji" className="mt-2">
                        <div className="flex flex-wrap gap-1">
                          {EMOJI_OPTIONS.map((e) => (
                            <button key={e} type="button" onClick={() => { updateLink(index, "icon_emoji", e); updateLink(index, "icon_image_url", null); }}
                              className={`h-8 w-8 rounded-md text-lg flex items-center justify-center transition-colors ${link.icon_emoji === e && !link.icon_image_url ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted"}`}>
                              {e}
                            </button>
                          ))}
                        </div>
                      </TabsContent>
                      <TabsContent value="image" className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          {link.icon_image_url && (
                            <img src={link.icon_image_url} alt="" className="h-10 w-10 rounded-lg object-cover border border-border" />
                          )}
                          <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                            <ImageIcon className="h-4 w-4" /> Upload
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleImageUpload(index, f);
                            }} />
                          </label>
                        </div>
                        <Input placeholder="Ou cole a URL da imagem..." value={link.icon_image_url || ""} onChange={(e) => updateLink(index, "icon_image_url", e.target.value || null)} className="text-sm" />
                      </TabsContent>
                    </Tabs>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Título</Label>
                      <Input value={link.title} onChange={(e) => updateLink(index, "title", e.target.value)} placeholder="Ex: Meu Instagram" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">URL</Label>
                      <Input value={link.url} onChange={(e) => updateLink(index, "url", e.target.value)} placeholder="https://..." />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Status:</Label>
                    <button type="button" onClick={() => updateLink(index, "status", link.status === "active" ? "inactive" : "active")}
                      className={`rounded-full px-3 py-0.5 text-xs font-medium transition-colors ${link.status === "active" ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"}`}>
                      {link.status === "active" ? "Ativo" : "Inativo"}
                    </button>
                  </div>
                </div>

                <Button variant="ghost" size="icon" className="mt-6 text-destructive hover:text-destructive" onClick={() => removeLink(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-3 max-w-2xl">
          <Button variant="outline" onClick={addLink} className="gap-2"><Plus className="h-4 w-4" /> Adicionar Link</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar Todos
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ProfileLinks;
