import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Star, Loader2, Link as LinkIcon, Settings2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MediaItem {
  id: string;
  url: string;
  is_main: boolean;
  object_fit?: string;
  focal_x?: number;
  focal_y?: number;
}

interface ImageUploaderProps {
  productId: string | null;
  images: MediaItem[];
  onImagesChange: (images: MediaItem[]) => void;
  pendingFiles?: File[];
  onPendingFilesChange?: (files: File[]) => void;
  pendingUrls?: string[];
  onPendingUrlsChange?: (urls: string[]) => void;
}

const ImageUploader = ({ productId, images, onImagesChange, pendingFiles = [], onPendingFilesChange, pendingUrls = [], onPendingUrlsChange }: ImageUploaderProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [downloadingUrl, setDownloadingUrl] = useState(false);
  const [configImage, setConfigImage] = useState<MediaItem | null>(null);
  const [configFit, setConfigFit] = useState("cover");
  const [configFocalX, setConfigFocalX] = useState(0.5);
  const [configFocalY, setConfigFocalY] = useState(0.5);

  const uploadFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files || (files instanceof FileList && files.length === 0)) return;
      const fileArray = Array.from(files);
      if (!productId) {
        if (onPendingFilesChange) {
          onPendingFilesChange([...pendingFiles, ...fileArray.filter(f => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024)]);
        }
        return;
      }
      setUploading(true);
      try {
        const newImages: MediaItem[] = [];
        for (const file of fileArray) {
          if (!file.type.startsWith("image/")) continue;
          if (file.size > 5 * 1024 * 1024) { toast({ title: "Imagem muito grande", description: `${file.name} excede 5MB`, variant: "destructive" }); continue; }
          const ext = file.name.split(".").pop();
          const path = `${productId}/${crypto.randomUUID()}.${ext}`;
          const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file);
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
          const isMain = images.length === 0 && newImages.length === 0;
          const { data: media, error: dbError } = await supabase
            .from("media").insert({ product_id: productId, url: urlData.publicUrl, type: "image", is_main: isMain }).select().single();
          if (dbError) throw dbError;
          if (isMain) await supabase.from("products").update({ main_image_id: media.id }).eq("id", productId);
          newImages.push(media);
        }
        onImagesChange([...images, ...newImages]);
        if (newImages.length > 0) toast({ title: `${newImages.length} imagem(ns) enviada(s)` });
      } catch (err: any) {
        toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
      } finally { setUploading(false); }
    },
    [productId, images, onImagesChange, toast, pendingFiles, onPendingFilesChange]
  );

  const handleUrlDownload = async () => {
    if (!imageUrl.trim()) return;
    if (!productId) {
      if (onPendingUrlsChange) onPendingUrlsChange([...pendingUrls, imageUrl.trim()]);
      setImageUrl(""); setShowUrlInput(false);
      toast({ title: "URL adicionada! Será baixada ao salvar o produto." });
      return;
    }
    setDownloadingUrl(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-image`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageUrl: imageUrl.trim(), productId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao baixar imagem");
      const isMain = images.length === 0;
      const { data: media, error: dbError } = await supabase
        .from("media").insert({ product_id: productId, url: result.publicUrl, type: "image", is_main: isMain }).select().single();
      if (dbError) throw dbError;
      if (isMain) await supabase.from("products").update({ main_image_id: media.id }).eq("id", productId);
      onImagesChange([...images, media]);
      setImageUrl(""); setShowUrlInput(false);
      toast({ title: "Imagem baixada e salva!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setDownloadingUrl(false); }
  };

  const setMainImage = async (mediaId: string) => {
    if (!productId) return;
    await supabase.from("media").update({ is_main: false }).eq("product_id", productId);
    await supabase.from("media").update({ is_main: true }).eq("id", mediaId);
    await supabase.from("products").update({ main_image_id: mediaId }).eq("id", productId);
    onImagesChange(images.map((img) => ({ ...img, is_main: img.id === mediaId })));
  };

  const deleteImage = async (media: MediaItem) => {
    if (!productId) return;
    const path = media.url.split("/product-images/")[1];
    if (path) await supabase.storage.from("product-images").remove([path]);
    await supabase.from("media").delete().eq("id", media.id);
    const remaining = images.filter((i) => i.id !== media.id);
    if (media.is_main && remaining.length > 0) { await setMainImage(remaining[0].id); remaining[0].is_main = true; }
    if (media.is_main) await supabase.from("products").update({ main_image_id: remaining[0]?.id ?? null }).eq("id", productId);
    onImagesChange(remaining);
  };

  const openImageConfig = (img: MediaItem) => {
    setConfigImage(img);
    setConfigFit(img.object_fit || "cover");
    setConfigFocalX(img.focal_x ?? 0.5);
    setConfigFocalY(img.focal_y ?? 0.5);
  };

  const saveImageConfig = async () => {
    if (!configImage) return;
    const { error } = await supabase.from("media").update({
      object_fit: configFit, focal_x: configFocalX, focal_y: configFocalY,
    }).eq("id", configImage.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    onImagesChange(images.map((img) => img.id === configImage.id ? { ...img, object_fit: configFit, focal_x: configFocalX, focal_y: configFocalY } : img));
    setConfigImage(null);
    toast({ title: "Configuração salva!" });
  };

  const pendingPreviews = pendingFiles.map((file, i) => ({
    key: `pending-${i}`, name: file.name, preview: URL.createObjectURL(file),
  }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {images.map((img) => (
          <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
            <img src={img.url} alt="" className="h-full w-full"
              style={{
                objectFit: (img.object_fit as any) || "cover",
                objectPosition: `${(img.focal_x ?? 0.5) * 100}% ${(img.focal_y ?? 0.5) * 100}%`,
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Button type="button" size="icon" variant="secondary" className="h-7 w-7" onClick={() => setMainImage(img.id)} title="Definir como principal">
                <Star className={`h-3.5 w-3.5 ${img.is_main ? "fill-warning text-warning" : ""}`} />
              </Button>
              <Button type="button" size="icon" variant="secondary" className="h-7 w-7" onClick={() => openImageConfig(img)} title="Configurar exibição">
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" size="icon" variant="destructive" className="h-7 w-7" onClick={() => deleteImage(img)} title="Remover">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            {img.is_main && (
              <span className="absolute left-1 top-1 rounded bg-warning px-1.5 py-0.5 text-[10px] font-semibold text-warning-foreground">Principal</span>
            )}
          </div>
        ))}
        {pendingPreviews.map((p) => (
          <div key={p.key} className="relative aspect-square overflow-hidden rounded-lg border-2 border-dashed border-primary/30 bg-muted">
            <img src={p.preview} alt={p.name} className="h-full w-full object-cover opacity-60" />
            <span className="absolute bottom-1 left-1 right-1 rounded bg-primary/80 px-1 py-0.5 text-center text-[9px] font-medium text-primary-foreground">Pendente</span>
            <Button type="button" size="icon" variant="destructive" className="absolute right-1 top-1 h-5 w-5" onClick={() => {
              if (onPendingFilesChange) { const idx = parseInt(p.key.split("-")[1]); onPendingFilesChange(pendingFiles.filter((_, i) => i !== idx)); }
            }}><X className="h-3 w-3" /></Button>
          </div>
        ))}
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-muted/50 text-muted-foreground transition-colors hover:border-primary hover:text-primary">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Upload className="h-5 w-5" /><span className="text-[10px]">Enviar</span></>}
          <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => uploadFiles(e.target.files)} />
        </label>
      </div>

      {pendingUrls.map((url, i) => (
        <div key={`pending-url-${i}`} className="flex items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-muted/50 px-3 py-2">
          <LinkIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-xs text-muted-foreground">{url}</span>
          <span className="shrink-0 text-[9px] font-medium text-primary">Pendente</span>
          <Button type="button" size="icon" variant="ghost" className="h-5 w-5" onClick={() => { if (onPendingUrlsChange) onPendingUrlsChange(pendingUrls.filter((_, idx) => idx !== i)); }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}

      {showUrlInput ? (
        <div className="flex gap-2">
          <Input placeholder="https://exemplo.com/imagem.jpg" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="text-sm" />
          <Button type="button" size="sm" onClick={handleUrlDownload} disabled={downloadingUrl || !imageUrl.trim()}>
            {downloadingUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : "Baixar"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => { setShowUrlInput(false); setImageUrl(""); }}><X className="h-4 w-4" /></Button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={() => setShowUrlInput(true)}>
          <LinkIcon className="h-3.5 w-3.5" /> Adicionar por URL
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        Máx. 5MB por imagem. ⭐ = principal. ⚙ = configurar exibição.
        {!productId && " As imagens serão enviadas ao salvar o produto."}
      </p>

      {/* Image display config dialog */}
      <Dialog open={!!configImage} onOpenChange={(open) => !open && setConfigImage(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Configurar exibição</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Modo de exibição</Label>
              <Select value={configFit} onValueChange={setConfigFit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Preencher (cover) — pode cortar bordas</SelectItem>
                  <SelectItem value="contain">Mostrar inteira (contain) — pode ter bordas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ponto focal (clique na imagem)</Label>
              <p className="text-xs text-muted-foreground mb-2">Clique onde quer que seja o centro de foco da imagem</p>
              {configImage && (
                <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted cursor-crosshair"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setConfigFocalX((e.clientX - rect.left) / rect.width);
                    setConfigFocalY((e.clientY - rect.top) / rect.height);
                  }}>
                  <img src={configImage.url} alt="" className="h-full w-full"
                    style={{ objectFit: configFit as any, objectPosition: `${configFocalX * 100}% ${configFocalY * 100}%` }} />
                  <div className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary/80 shadow-lg pointer-events-none"
                    style={{ left: `${configFocalX * 100}%`, top: `${configFocalY * 100}%` }} />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigImage(null)}>Cancelar</Button>
            <Button onClick={saveImageConfig}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImageUploader;
