import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

function setMetaTag(property: string, content: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[property='${property}']`);
  if (!meta) {
    meta = document.querySelector<HTMLMetaElement>(`meta[name='${property}']`);
  }
  if (meta) {
    meta.setAttribute("content", content);
  } else {
    meta = document.createElement("meta");
    if (property.startsWith("og:")) {
      meta.setAttribute("property", property);
    } else {
      meta.setAttribute("name", property);
    }
    meta.setAttribute("content", content);
    document.head.appendChild(meta);
  }
}

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

          setMetaTag("og:image", data.logo_url);
          setMetaTag("twitter:image", data.logo_url);
        }
        if (data?.name) {
          document.title = data.name;
          setMetaTag("og:title", data.name);
          setMetaTag("twitter:title", data.name);
          setMetaTag("og:description", data.name);
          setMetaTag("twitter:description", data.name);
        }
      });
  }, []);
}
