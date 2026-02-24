import { UserPlus, Search, FileUp, CheckCircle2 } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Créez votre compte",
    description: "Inscrivez-vous en tant que fournisseur avec vos documents officiels (NINEA, RCCM, attestations).",
  },
  {
    icon: Search,
    step: "02",
    title: "Consultez les offres",
    description: "Parcourez les appels d'offres publiés et identifiez ceux correspondant à votre secteur d'activité.",
  },
  {
    icon: FileUp,
    step: "03",
    title: "Soumettez votre dossier",
    description: "Déposez votre offre technique et financière avec tous les documents requis avant la date limite.",
  },
  {
    icon: CheckCircle2,
    step: "04",
    title: "Suivez votre candidature",
    description: "Recevez des notifications à chaque étape et accédez aux résultats depuis votre espace.",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-20 md:py-28 bg-secondary text-secondary-foreground overflow-hidden">
      <div className="container">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <span className="inline-block px-4 py-1.5 mb-4 text-xs font-semibold uppercase tracking-wider bg-accent text-accent-foreground rounded-full">
            Processus
          </span>
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl mb-4">
            Comment ça marche ?
          </h2>
          <p className="text-secondary-foreground/80 text-lg">
            Participez aux marchés publics de Dakar Dem Dikk en 4 étapes simples.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line (desktop) */}
          <div className="absolute top-24 left-0 right-0 h-0.5 bg-secondary-foreground/10 hidden lg:block" />

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div
                key={index}
                className="relative group"
              >
                {/* Step Card */}
                <div className="relative z-10 bg-secondary-foreground/5 backdrop-blur-sm rounded-2xl p-8 h-full border border-secondary-foreground/10 transition-all duration-300 hover:bg-secondary-foreground/10 hover:border-accent/50">
                  {/* Step Number */}
                  <div className="absolute -top-4 left-6 px-3 py-1 bg-accent text-accent-foreground font-display font-bold text-sm rounded-full">
                    {step.step}
                  </div>

                  {/* Icon */}
                  <div className="mb-6 mt-2 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                    <step.icon className="h-8 w-8" />
                  </div>

                  {/* Content */}
                  <h3 className="font-display text-xl font-semibold mb-3">
                    {step.title}
                  </h3>
                  <p className="text-secondary-foreground/70 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Arrow (between cards on mobile/tablet) */}
                {index < steps.length - 1 && (
                  <div className="flex justify-center my-4 lg:hidden">
                    <div className="w-0.5 h-8 bg-secondary-foreground/20" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
