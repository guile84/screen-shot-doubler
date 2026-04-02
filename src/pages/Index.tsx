import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Package, ArrowRight, Shield, BarChart3, Share2 } from "lucide-react";

const features = [
  { icon: Package, title: "Gerencie produtos", description: "Cadastre e organize todos os seus produtos de afiliados em um só lugar." },
  { icon: Share2, title: "Links públicos", description: "Compartilhe páginas limpas e profissionais para cada produto." },
  { icon: BarChart3, title: "Rastreie cliques", description: "Acompanhe estatísticas de cliques em tempo real." },
  { icon: Shield, title: "Painel seguro", description: "Acesso protegido por autenticação. Só você gerencia." },
];

const Index = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold text-foreground">Afiliados</span>
        </div>
        <Link to="/login">
          <Button variant="outline" size="sm">
            Entrar
          </Button>
        </Link>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Package className="h-4 w-4" />
            Gestão de Afiliados
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Gerencie seus produtos de afiliados com simplicidade
          </h1>
          <p className="text-lg text-muted-foreground">
            Cadastre produtos, compartilhe links profissionais e acompanhe seus cliques — tudo em uma ferramenta pessoal e segura.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/login">
              <Button size="lg" className="gap-2">
                Começar agora
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card px-4 py-16">
        <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-2">
          {features.map((feature) => (
            <div key={feature.title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        Site de Afiliados — Ferramenta pessoal de gestão
      </footer>
    </div>
  );
};

export default Index;
