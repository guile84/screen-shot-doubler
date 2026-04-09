import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useDynamicFavicon() {
  useEffect(() => {
    supabase
      .from("company_settings")
      .select("logo_url, name")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.logo_url) {
          let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
          if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
          }
          link.href = data.logo_url;
          link.type = "image/png";
        }
        if (data?.name) {
          document.title = data.name;
        }
      });
  }, []);
}
