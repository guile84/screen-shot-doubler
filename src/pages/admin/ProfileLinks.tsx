import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, GripVertical, ExternalLink, Eye } from "lucide-react";
import { Link } from "react-router-dom";

interface ProfileLink {
  id: string;
  title: string;
  url: string;
  icon_emoji: string;
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
    const { data } = await supabase
      .from("profile_links")
      .select("*")
      .order("sort_order");
    setLinks((data as ProfileLink[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLinks(); }, []);

  const addLink = () => {
    setLinks([
      ...links,
      {
        id: `new-${Date.now()}`,
        title: "",
        url: "",
        icon_emoji: "🔗",
        sort_order: links.length,
        status: "active",
      },
    ]);
  };

  const updateLink = (index: number, field: keyof ProfileLink, value: string) => {
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

  const handleSave = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        if (!link.title.trim() || !link.url.trim()) continue;

        const payload = {
          title: link.title.trim(),
          url: link.url.trim(),
          icon_emoji: link.icon_emoji,
          sort_order: i,
          status: link.status,
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
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Links do Perfil</h1>
            <p className="text-sm text-muted-foreground">
              Configure os links que aparecerão na sua página de perfil estilo Linktree
            </p>
          </div>
          <Link to="/profile" target="_blank">
            <Button variant="outline" size="sm" className="gap-2">
              <Eye className="h-4 w-4" />
              Visualizar
            </Button>
          </Link>
        </div>

        <div className="space-y-3 max-w-2xl">
          {links.map((link, index) => (
            <Card key={link.id} className="shadow-sm">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex flex-col gap-1 pt-2">
                  <button
                    type="button"
                    onClick={() => moveLink(index, -1)}
                    disabled={index === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                  >
                    <GripVertical className="h-4 w-4 rotate-90 scale-x-[-1]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveLink(index, 1)}
                    disabled={index === links.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                  >
                    <GripVertical className="h-4 w-4 rotate-90" />
                  </button>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Emoji</Label>
                      <select
                        value={link.icon_emoji}
                        onChange={(e) => updateLink(index, "icon_emoji", e.target.value)}
                        className="h-10 w-16 rounded-md border border-input bg-background text-center text-lg"
                      >
                        {EMOJI_OPTIONS.map((e) => (
                          <option key={e} value={e}>{e}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Título</Label>
                      <Input
                        value={link.title}
                        onChange={(e) => updateLink(index, "title", e.target.value)}
                        placeholder="Ex: Meu Instagram"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">URL</Label>
                    <Input
                      value={link.url}
                      onChange={(e) => updateLink(index, "url", e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Status:</Label>
                    <button
                      type="button"
                      onClick={() =>
                        updateLink(index, "status", link.status === "active" ? "inactive" : "active")
                      }
                      className={`rounded-full px-3 py-0.5 text-xs font-medium transition-colors ${
                        link.status === "active"
                          ? "bg-accent/20 text-accent"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {link.status === "active" ? "Ativo" : "Inativo"}
                    </button>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-6 text-destructive hover:text-destructive"
                  onClick={() => removeLink(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-3 max-w-2xl">
          <Button variant="outline" onClick={addLink} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Link
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar Todos
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ProfileLinks;
