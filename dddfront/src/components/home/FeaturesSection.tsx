import { Shield, Clock, FileSearch, Users, Bell, BarChart3 } from "lucide-react";

const features = [
  {
    icon: FileSearch,
    title: "Consultation des avis",
    description:
      "Parcourez les appels d'offres publiés, lisez ou téléchargez l'avis (PDF) et les pièces associées, comme sur les portails d'autorités de place.",
  },
  {
    icon: Shield,
    title: "Sécurité & Transparence",
    description: "Processus sécurisé garantissant l'égalité d'accès à l'information pour tous les prestataires.",
  },
  {
    icon: Clock,
    title: "Notifications & suivi",
    description:
      "Recevez des messages dans l'application (convocation, suite de procédure) lorsque le service des marchés actualise votre dossier.",
  },
  {
    icon: Users,
    title: "Espace Fournisseur",
    description:
      "Tenez à jour vos documents légaux et consultez les avis publiés. La remise des plis (soumission) se fait en présentiel au siège.",
  },
  {
    icon: Bell,
    title: "Notifications",
    description:
      "Recevez des messages dans l'application lorsque le service des marchés actualise votre dossier ou l'avis d'un marché évolue.",
  },
  {
    icon: BarChart3,
    title: "Tableau de bord",
    description:
      "Vue d'ensemble de vos démarches : consultations, documents, candidatures lorsque la fonctionnalité est activée.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="pt-2 pb-6 md:pt-3 md:pb-8">
      <div className="container max-w-5xl">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center mb-8">
          <span className="inline-block px-4 py-1.5 mb-3 text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full">
            Fonctionnalités
          </span>
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl mb-3">
            Une plateforme conçue pour vous
          </h2>
          <p className="text-muted-foreground text-lg">
            Découvrez les outils mis à votre disposition pour participer efficacement aux marchés publics de Dakar Dem Dikk.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-5">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1"
            >
              {/* Icon */}
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-6 w-6" />
              </div>

              {/* Content */}
              <h3 className="mb-2 font-display text-xl font-semibold text-foreground">
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
