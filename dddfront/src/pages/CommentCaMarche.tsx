import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { UserPlus, Search, FileUp, CheckCircle2, Shield, Clock, FileText, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Créez votre compte",
    description: "Inscrivez-vous en tant que fournisseur avec vos documents officiels (NINEA, RCCM, attestations).",
    details: [
      "Remplissez le formulaire d'inscription",
      "Téléchargez vos documents légaux",
      "Validez votre adresse email",
      "Attendez la vérification de votre dossier"
    ]
  },
  {
    icon: Search,
    step: "02",
    title: "Consultez les offres",
    description: "Parcourez les appels d'offres publiés et identifiez ceux correspondant à votre secteur d'activité.",
    details: [
      "Filtrez par catégorie ou budget",
      "Consultez les cahiers des charges",
      "Téléchargez les documents techniques",
      "Posez vos questions avant la date limite"
    ]
  },
  {
    icon: FileUp,
    step: "03",
    title: "Soumettez votre dossier",
    description: "Déposez votre offre technique et financière avec tous les documents requis avant la date limite.",
    details: [
      "Préparez votre offre technique",
      "Joignez votre proposition financière",
      "Vérifiez la conformité des documents",
      "Soumettez avant la date de clôture"
    ]
  },
  {
    icon: CheckCircle2,
    step: "04",
    title: "Suivez votre candidature",
    description: "Recevez des notifications à chaque étape et accédez aux résultats depuis votre espace.",
    details: [
      "Suivez l'avancement en temps réel",
      "Recevez les notifications par email",
      "Consultez les résultats d'évaluation",
      "Accédez à l'historique de vos candidatures"
    ]
  },
];

const benefits = [
  {
    icon: Shield,
    title: "Processus transparent",
    description: "Toutes les étapes sont documentées et traçables pour garantir l'équité entre les soumissionnaires."
  },
  {
    icon: Clock,
    title: "Gain de temps",
    description: "Fini les déplacements physiques, tout se fait en ligne depuis votre espace fournisseur."
  },
  {
    icon: FileText,
    title: "Documents centralisés",
    description: "Tous vos documents sont stockés de manière sécurisée et réutilisables pour vos prochaines candidatures."
  },
  {
    icon: Award,
    title: "Égalité des chances",
    description: "Chaque fournisseur est évalué selon les mêmes critères objectifs définis dans le cahier des charges."
  },
];

const CommentCaMarche = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="container">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mx-auto max-w-3xl text-center"
            >
              <span className="inline-block px-4 py-1.5 mb-4 text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary rounded-full">
                Guide
              </span>
              <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl mb-6">
                Comment ça marche ?
              </h1>
              <p className="text-muted-foreground text-lg md:text-xl">
                Découvrez le processus simple et transparent pour participer aux appels d'offres de Dakar Dem Dikk.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Steps Section */}
        <section className="py-20 md:py-28">
          <div className="container">
            <div className="space-y-16 md:space-y-24">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`flex flex-col ${index % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 md:gap-16 items-center`}
                >
                  {/* Icon Side */}
                  <div className="flex-1 flex justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-2xl" />
                      <div className="relative bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-8 md:p-12">
                        <step.icon className="h-16 w-16 md:h-24 md:w-24 text-primary-foreground" />
                        <div className="absolute -top-4 -right-4 bg-accent text-accent-foreground font-display font-bold text-xl md:text-2xl rounded-full h-12 w-12 md:h-16 md:w-16 flex items-center justify-center">
                          {step.step}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content Side */}
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
                      {step.title}
                    </h2>
                    <p className="text-muted-foreground text-lg mb-6">
                      {step.description}
                    </p>
                    <ul className="space-y-3">
                      {step.details.map((detail, detailIndex) => (
                        <li key={detailIndex} className="flex items-center gap-3 justify-center md:justify-start">
                          <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                          <span className="text-foreground">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 md:py-28 bg-secondary text-secondary-foreground">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl mb-4">
                Pourquoi utiliser notre plateforme ?
              </h2>
              <p className="text-secondary-foreground/80 text-lg">
                Des avantages concrets pour simplifier votre participation aux marchés publics.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-secondary-foreground/5 backdrop-blur-sm rounded-2xl p-8 border border-secondary-foreground/10 text-center"
                >
                  <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <benefit.icon className="h-8 w-8" />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-3">
                    {benefit.title}
                  </h3>
                  <p className="text-secondary-foreground/70">
                    {benefit.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 md:py-28">
          <div className="container">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="mx-auto max-w-4xl text-center bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-12 md:p-16"
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Prêt à commencer ?
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
                Créez votre compte fournisseur dès maintenant et accédez à toutes les opportunités de marchés publics.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" variant="secondary" className="font-semibold">
                  <Link to="/inscription">Créer mon compte</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                  <Link to="/appels-offres">Voir les appels d'offres</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CommentCaMarche;
