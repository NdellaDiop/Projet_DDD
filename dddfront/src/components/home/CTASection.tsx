import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, UserPlus, FileText } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-20 md:py-28">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl gradient-hero p-10 md:p-16">
          {/* Background decorations */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-accent/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-white/10 rounded-full blur-3xl" />

          <div className="relative z-10 grid gap-10 lg:grid-cols-2 lg:items-center">
            {/* Left Content */}
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl mb-6">
                Prêt à saisir de nouvelles{" "}
                <span className="text-accent">opportunités</span> ?
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-lg">
                Rejoignez les centaines de fournisseurs qui font déjà confiance à notre plateforme 
                pour accéder aux marchés de Dakar Dem Dikk.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="heroAccent" size="lg" asChild>
                  <Link to="/inscription">
                    <UserPlus className="mr-2 h-5 w-5" />
                    Créer un compte gratuit
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="heroOutline" size="lg" asChild>
                  <Link to="/comment-ca-marche">
                    <FileText className="mr-2 h-5 w-5" />
                    En savoir plus
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right Stats/Benefits */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "Gratuit", label: "Inscription et consultation" },
                { value: "Sécurisé", label: "Données protégées" },
                { value: "Simple", label: "Interface intuitive" },
                { value: "Rapide", label: "Soumission en ligne" },
              ].map((item, index) => (
                <div
                  key={index}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
                >
                  <div className="font-display text-2xl font-bold text-white mb-1">
                    {item.value}
                  </div>
                  <div className="text-sm text-white/70">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
