import { Shield, Clock, FileSearch, Users, Bell, BarChart3 } from "lucide-react";

const features = [
  {
    icon: FileSearch,
    title: "Consultation Simplifiée",
    description: "Parcourez facilement tous les appels d'offres publiés avec des filtres par catégorie, date et statut.",
  },
  {
    icon: Shield,
    title: "Sécurité & Transparence",
    description: "Processus sécurisé garantissant l'égalité d'accès à l'information pour tous les prestataires.",
  },
  {
    icon: Clock,
    title: "Suivi en Temps Réel",
    description: "Suivez l'état de vos candidatures à chaque étape : soumis, en évaluation, retenu ou rejeté.",
  },
  {
    icon: Users,
    title: "Espace Fournisseur",
    description: "Gérez votre compte, vos documents et l'historique de toutes vos participations en un seul endroit.",
  },
  {
    icon: Bell,
    title: "Alertes Personnalisées",
    description: "Recevez des notifications pour les nouveaux appels d'offres correspondant à votre secteur d'activité.",
  },
  {
    icon: BarChart3,
    title: "Tableau de Bord",
    description: "Visualisez vos statistiques : appels en cours, marchés gagnés, historique complet.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-20 md:py-28">
      <div className="container">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <span className="inline-block px-4 py-1.5 mb-4 text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full">
            Fonctionnalités
          </span>
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl mb-4">
            Une plateforme conçue pour vous
          </h2>
          <p className="text-muted-foreground text-lg">
            Découvrez les outils mis à votre disposition pour participer efficacement aux marchés publics de Dakar Dem Dikk.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1"
            >
              {/* Icon */}
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-7 w-7" />
              </div>

              {/* Content */}
              <h3 className="mb-3 font-display text-xl font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Decorative corner */}
              <div className="absolute top-0 right-0 h-20 w-20 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="absolute top-4 right-4 h-3 w-3 rounded-full bg-accent" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
