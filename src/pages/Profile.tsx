import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Loader2 } from "lucide-react";

interface ProfileLink {
  id: string;
  title: string;
  url: string;
  icon_emoji: string;
  sort_order: number;
}

interface CompanyData {
  name: string | null;
  logo_url: string | null;
}

const Profile = () => {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("company_settings").select("name, logo_url").limit(1).maybeSingle(),
      supabase.from("profile_links").select("*").eq("status", "active").order("sort_order"),
    ]).then(([companyRes, linksRes]) => {
      setCompany(companyRes.data);
      setLinks((linksRes.data as ProfileLink[]) || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[hsl(220,70%,50%)] via-[hsl(260,60%,50%)] to-[hsl(300,50%,45%)]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-[hsl(220,70%,50%)] via-[hsl(260,60%,50%)] to-[hsl(300,50%,45%)] px-4 py-12">
      {/* Avatar / Logo */}
      <div className="mb-4 h-24 w-24 overflow-hidden rounded-full border-4 border-white/30 bg-white/20 shadow-xl backdrop-blur-sm">
        {company?.logo_url ? (
          <img src={company.logo_url} alt={company.name || ""} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-white">
            {company?.name?.[0] || "?"}
          </div>
        )}
      </div>

      {/* Company Name */}
      <h1 className="mb-1 text-2xl font-bold text-white drop-shadow-md">
        {company?.name || "Meu Perfil"}
      </h1>
      <p className="mb-8 text-sm text-white/70">@{(company?.name || "perfil").toLowerCase().replace(/\s+/g, "")}</p>

      {/* Links */}
      <div className="flex w-full max-w-md flex-col gap-3">
        {links.map((link, i) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:bg-white/20 hover:shadow-xl active:scale-[0.98]"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span className="text-xl">{link.icon_emoji}</span>
            <span className="flex-1 text-center font-medium">{link.title}</span>
            <ExternalLink className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-70" />
          </a>
        ))}

        {links.length === 0 && (
          <p className="text-center text-sm text-white/60">Nenhum link cadastrado ainda.</p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-12">
        <p className="text-xs text-white/40">
          {company?.name || "Perfil"}
        </p>
      </div>
    </div>
  );
};

export default Profile;
