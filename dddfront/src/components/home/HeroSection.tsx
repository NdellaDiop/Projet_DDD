import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, Shield } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden gradient-hero">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent rounded-full blur-3xl" />
      </div>

      <div className="container max-w-5xl relative z-10 pt-4 pb-24 md:pt-6 md:pb-28 lg:pt-8 lg:pb-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm animate-fade-up">
            <Shield className="h-4 w-4" />
            Plateforme officielle de Dakar Dem Dikk
          </div>

          {/* Title */}
          <h1 className="mb-4 font-display text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <span className="relative">
              Portail des marchés Publics
              <svg className="absolute -bottom-2 left-0 w-full h-3 text-accent" viewBox="0 0 200 12" preserveAspectRatio="none">
                <path d="M0,8 Q50,0 100,8 T200,8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
              </svg>
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mb-6 text-lg text-white/80 md:text-xl max-w-2xl mx-auto leading-relaxed animate-fade-up" style={{ animationDelay: "0.2s" }}>
            Consultez les avis d&apos;appel d&apos;offres publiés par Dakar Dem Dikk. 
            Transparence et information du public ; le dépôt des offres se poursuit selon les modalités indiquées sur chaque marché.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: "0.3s" }}>
            <Button variant="heroAccent" size="lg" asChild>
              <Link to="/appels-offres">
                <Search className="mr-2 h-5 w-5" />
                Voir les Appels d'Offres
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="heroOutline" size="lg" asChild>
              <Link to="/inscription">
                Devenir Fournisseur
              </Link>
            </Button>
          </div>

          {/* Points clés (pas de chiffres marketing non sourcés) */}
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6 animate-fade-up" style={{ animationDelay: "0.4s" }}>
            {[
              { title: "Consultation", desc: "Avis et pièces sur le portail" },
              { title: "Dépôt des plis", desc: "En présentiel au siège (modalités par marché)" },
              { title: "Comptes vérifiés", desc: "Fournisseurs validés par l'administration" },
              { title: "Notifications", desc: "Suivi dans votre espace" },
            ].map((item, index) => (
              <div key={index} className="text-center px-1">
                <div className="font-display text-lg font-bold text-white md:text-xl leading-tight">
                  {item.title}
                </div>
                <div className="mt-2 text-xs md:text-sm text-white/70 leading-snug">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Wave Divider — padding bas du conteneur ci-dessus pour ne pas masquer les points clés */}
      <div className="absolute bottom-0 left-0 right-0 z-0 pointer-events-none">
        <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
          <path d="M0 50L48 45.7C96 41.3 192 32.7 288 30.2C384 27.7 480 31.3 576 38.5C672 45.7 768 56.3 864 58.8C960 61.3 1056 55.7 1152 50C1248 44.3 1344 38.7 1392 35.8L1440 33V100H1392C1344 100 1248 100 1152 100C1056 100 960 100 864 100C768 100 672 100 576 100C480 100 384 100 288 100C192 100 96 100 48 100H0V50Z" fill="hsl(var(--background))"/>
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
