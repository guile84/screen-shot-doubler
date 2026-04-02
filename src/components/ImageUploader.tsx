import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Star, Loader2, ImageIcon } from "lucide-react";

interface MediaItem {
  id: string;
  url: string;
  is_main: boolean;
}

interface ImageUploaderProps {
  productId: string;
  images: MediaItem[];
  onImagesChange: (images: MediaItem[]) => void;
}

const ImageUploader = ({ productId, images, onImagesChange }: ImageUploaderProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const uploadFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploading(true);

      try {
        const newImages: MediaItem[] = [];

        for (const file of Array.from(files)) {
          if (!file.type.startsWith("image/")) continue;
          if (file.size > 5 * 1024 * 1024) {
            toast({ title: "Imagem muito grande", description: `${file.name} excede 5MB`, variant: "destructive" });
            continue;
          }

          const ext = file.name.split(".").pop();
          const path = `${productId}/${crypto.randomUUID()}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("product-images")
            .upload(path, file);
          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from("product-images")
            .getPublicUrl(path);

          const isMain = images.length === 0 && newImages.length === 0;

          const { data: media, error: dbError } = await supabase
            .from("media")
            .insert({ product_id: productId, url: urlData.publicUrl, type: "image", is_main: isMain })
            .select()
            .single();
          if (dbError) throw dbError;

          if (isMain) {
            await supabase.from("products").update({ main_image_id: media.id }).eq("id", productId);
          }

          newImages.push(media);
        }

        onImagesChange([...images, ...newImages]);
        toast({ title: `${newImages.length} imagem(ns) enviada(s)` });
      } catch (err: any) {
        toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
      } finally {
        setUploading(false);
      }
    },
    [productId, images, onImagesChange, toast]
  );

  const setMainImage = async (mediaId: string) => {
    await supabase.from("media").update({ is_main: false }).eq("product_id", productId);
    await supabase.from("media").update({ is_main: true }).eq("id", mediaId);
    await supabase.from("products").update({ main_image_id: mediaId }).eq("id", productId);
    onImagesChange(images.map((img) => ({ ...img, is_main: img.id === mediaId })));
  };

  const deleteImage = async (media: MediaItem) => {
    const path = media.url.split("/product-images/")[1];
    if (path) await supabase.storage.from("product-images").remove([path]);
    await supabase.from("media").delete().eq("id", media.id);

    const remaining = images.filter((i) => i.id !== media.id);
    if (media.is_main && remaining.length > 0) {
      await setMainImage(remaining[0].id);
      remaining[0].is_main = true;
    }
    if (media.is_main) {
      await supabase.from("products").update({ main_image_id: remaining[0]?.id ?? null }).eq("id", productId);
    }
    onImagesChange(remaining);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {images.map((img) => (
          <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
            <img src={img.url} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-7 w-7"
                onClick={() => setMainImage(img.id)}
                title="Definir como principal"
              >
                <Star className={`h-3.5 w-3.5 ${img.is_main ? "fill-warning text-warning" : ""}`} />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="h-7 w-7"
                onClick={() => deleteImage(img)}
                title="Remover"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            {img.is_main && (
              <span className="absolute left-1 top-1 rounded bg-warning px-1.5 py-0.5 text-[10px] font-semibold text-warning-foreground">
                Principal
              </span>
            )}
          </div>
        ))}

        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-muted/50 text-muted-foreground transition-colors hover:border-primary hover:text-primary">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Upload className="h-5 w-5" />
              <span className="text-[10px]">Enviar</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => uploadFiles(e.target.files)}
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">Máx. 5MB por imagem. A estrela define a imagem principal.</p>
    </div>
  );
};

export default ImageUploader;
