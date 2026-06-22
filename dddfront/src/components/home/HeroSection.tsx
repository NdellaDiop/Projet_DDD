import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, Shield } from "lucide-react";
import { HERO_BACKGROUND_IMAGE } from "@/lib/branding";

const HeroSection = () => {
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = photoLoaded && !photoFailed;

  return (
    <section className="relative overflow-hidden">
      {/* Fond de secours (dégradé actuel si la photo est absente) */}
      <div className="absolute inset-0 gradient-hero" aria-hidden="true" />

      {/* Photo bus floutée pour laisser le texte lisible */}
      {!photoFailed && (
        <div
          className={`absolute inset-0 overflow-hidden transition-opacity duration-700 ${
            showPhoto ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        >
          <img
            src={HERO_BACKGROUND_IMAGE}
            alt=""
            className="absolute inset-0 h-full w-full scale-105 object-cover object-center blur-sm"
            onLoad={() => setPhotoLoaded(true)}
            onError={() => setPhotoFailed(true)}
          />
        </div>
      )}

      {/* Voile coloré par-dessus la photo */}
      <div
        className={`absolute inset-0 transition-colors duration-700 ${
          showPhoto
            ? "bg-gradient-to-br from-slate-900/50 via-primary/60 to-primary/45"
            : "bg-transparent"
        }`}
        aria-hidden="true"
      />

      {/* Motif décoratif léger */}
      <div className="absolute inset-0 opacity-10" aria-hidden="true">
        <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-20 right-10 h-96 w-96 rounded-full bg-accent blur-3xl" />
      </div>

      <div className="container relative z-10 max-w-5xl pt-4 pb-24 md:pt-6 md:pb-28 lg:pt-8 lg:pb-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex animate-fade-up items-center gap-2 rounded-full border border-white/15 bg-black/25 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
            <Shield className="h-4 w-4" />
            Plateforme officielle de Dakar Dem Dikk
          </div>

          <h1
            className="mb-4 animate-fade-up font-display text-4xl font-bold tracking-tight text-white drop-shadow-lg md:text-5xl lg:text-6xl"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="relative">
              Portail des marchés Publics
              <svg
                className="absolute -bottom-2 left-0 h-3 w-full text-accent"
                viewBox="0 0 200 12"
                preserveAspectRatio="none"
              >
                <path
                  d="M0,8 Q50,0 100,8 T200,8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          <p
            className="mx-auto mb-6 max-w-2xl animate-fade-up text-lg leading-relaxed text-white drop-shadow-md md:text-xl"
            style={{ animationDelay: "0.2s" }}
          >
            Consultez les avis d&apos;appel d&apos;offres publiés par Dakar Dem Dikk.
            Transparence et information du public ; le dépôt des offres se poursuit selon les
            modalités indiquées sur chaque marché.
          </p>

          <div
            className="flex animate-fade-up flex-col items-center justify-center gap-4 sm:flex-row"
            style={{ animationDelay: "0.3s" }}
          >
            <Button variant="heroAccent" size="lg" asChild>
              <Link to="/appels-offres">
                <Search className="mr-2 h-5 w-5" />
                Voir les Appels d&apos;Offres
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="heroOutline" size="lg" asChild>
              <Link to="/inscription">Devenir Fournisseur</Link>
            </Button>
          </div>

          <div
            className="mt-8 grid animate-fade-up grid-cols-2 gap-4 md:grid-cols-4 md:gap-6"
            style={{ animationDelay: "0.4s" }}
          >
            {[
              { title: "Consultation", desc: "Avis et pièces sur le portail" },
              { title: "Dépôt des plis", desc: "En présentiel au siège (modalités par marché)" },
              { title: "Comptes vérifiés", desc: "Fournisseurs validés par l'administration" },
              { title: "Notifications", desc: "Suivi dans votre espace" },
            ].map((item, index) => (
              <div
                key={index}
                className="rounded-xl border border-white/10 bg-black/20 px-2 py-3 text-center backdrop-blur-sm md:px-3"
              >
                <div className="font-display text-lg font-bold leading-tight text-white drop-shadow-md md:text-xl">
                  {item.title}
                </div>
                <div className="mt-2 text-xs leading-snug text-white/90 md:text-sm">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-0">
        <svg
          viewBox="0 0 1440 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-auto w-full"
        >
          <path
            d="M0 50L48 45.7C96 41.3 192 32.7 288 30.2C384 27.7 480 31.3 576 38.5C672 45.7 768 56.3 864 58.8C960 61.3 1056 55.7 1152 50C1248 44.3 1344 38.7 1392 35.8L1440 33V100H1392C1344 100 1248 100 1152 100C1056 100 960 100 864 100C768 100 672 100 576 100C480 100 384 100 288 100C192 100 96 100 48 100H0V50Z"
            fill="hsl(var(--background))"
          />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
