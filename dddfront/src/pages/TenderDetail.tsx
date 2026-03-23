// ... (imports existants)
import { Link, useParams } from "react-router-dom";
import { useState, useEffect } from "react"; // Importez useState et useEffect
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  Tag,
  Clock,
  Building2,
  FileDown,
  Send,
  CheckCircle2,
  AlertCircle,
  FileText,
  Briefcase,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext"; // Importez useAuth
import { toast } from "@/components/ui/use-toast"; // Importez toast

// Définissez une interface pour le modèle AppelOffre de votre backend
// Assurez-vous que les noms des champs correspondent exactement à ce que votre API renvoie
interface AppelOffre {
  id: number;
  responsable_marche_id: number;
  titre: string;
  description: string;
  date_publication: string; // Sera une chaîne de date/heure ISO
  date_limite_depot: string; // Sera une chaîne de date/heure ISO
  statut: 'ouvert' | 'ferme' | 'annule';
  // Ajoutez d'autres champs si votre API en renvoie directement (ex: reference, category, budget)
  created_at?: string;
  updated_at?: string;
}

// Nous allons conserver ces fonctions d'aide pour la coloration des badges
const getCategoryColor = (category: string) => {
  // Cette fonction dépendra de la façon dont les catégories sont gérées dans votre backend
  // Pour l'instant, nous pouvons la simplifier ou la lier à d'autres propriétés de l'appel d'offre
  // ou la retirer si la catégorie n'est pas directement retournée
  switch (category) {
    case "Fournitures":
      return "bg-info/10 text-info border-info/20";
    case "Services":
      return "bg-primary/10 text-primary border-primary/20";
    case "Travaux":
      return "bg-accent/20 text-accent-foreground border-accent/30";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getStatusBadge = (status: AppelOffre['statut']) => {
  switch (status) {
    case "ouvert":
      return "bg-success/10 text-success border-success/20";
    case "ferme":
    case "annule":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground";
  }
};

// Fonction pour calculer les jours restants (copiée de ActiveTendersSection.tsx)
const calculateDaysLeft = (deadline: string): number => {
  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Pour une comparaison basée uniquement sur la date
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0; // Ne pas afficher de jours négatifs
};


const TenderDetail = () => {
  const { id } = useParams<{ id: string }>(); // Récupère l'ID de l'URL
  const { api } = useAuth(); // Récupérez l'instance Axios configurée

  const [tender, setTender] = useState<AppelOffre | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenderDetail = async () => {
      try {
        setLoading(true);
        const response = await api.get<AppelOffre>(`/api/appels-offres/${id}`);
        setTender(response.data);
      } catch (err: unknown) {
        console.error("Erreur lors de la récupération des détails de l'appel d'offres:", err);
        setError("Impossible de charger les détails de l'appel d'offres. Veuillez réessayer.");
        toast({
          title: "Erreur de chargement",
          description: "Impossible de récupérer les détails de l'appel d'offres.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTenderDetail();
    }
  }, [id, api]); // Re-déclenche si l'ID de l'appel d'offre ou l'instance API change

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-20 md:py-28 bg-muted/50">
          <div className="container text-center">
            <p className="text-lg text-muted-foreground">Chargement des détails de l'appel d'offres...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-20 md:py-28 bg-muted/50">
          <div className="container text-center">
            <p className="text-lg text-destructive">{error}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-20 md:py-28 bg-muted/50">
          <div className="container text-center">
            <p className="text-lg text-muted-foreground">Appel d'offre non trouvé.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Calcul des jours restants
  const daysLeft = calculateDaysLeft(tender.date_limite_depot);

  // Valeurs simulées si non présentes dans le backend pour ne pas casser l'affichage
  // Idéalement, ces champs devraient être retournés par l'API pour un affichage précis.
  const simulatedCategory = "Fournitures"; // À adapter si le backend renvoie une catégorie
  const simulatedReference = `AO-${tender.id}`; // Utiliser l'ID si pas de référence unique
  const simulatedBudget = "Non spécifié"; // À adapter si le backend renvoie un budget
  const simulatedRequirements: string[] = [
    "Veuillez consulter le cahier des charges officiel pour les conditions de participation.",
    "Être une entreprise légalement constituée.",
  ];
  const simulatedDocuments: { name: string; size: string; type: string }[] = [
    { name: "Aucun document disponible", size: "0 KB", type: "N/A" },
  ];
  const simulatedEvaluationCriteria: { name: string; weight: number }[] = [
    { name: "Critères non spécifiés", weight: 100 },
  ];
  const simulatedContact = {
    department: "Service des Marchés",
    email: "contact@demdikk.sn",
    phone: "Non spécifié",
    address: "Adresse non spécifiée",
  };


  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="bg-muted/50 border-b border-border">
          <div className="container py-4">
            <Link
              to="/appels-offres"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour aux appels d'offres
            </Link>
          </div>
        </div>

        {/* Header */}
        <section className="py-10 md:py-16 border-b border-border">
          <div className="container">
            <div className="grid lg:grid-cols-3 gap-10">
              {/* Main Info */}
              <div className="lg:col-span-2">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Badge variant="outline" className={`${getCategoryColor(simulatedCategory)} font-medium`}>
                    <Tag className="mr-1.5 h-3 w-3" />
                    {simulatedCategory}
                  </Badge>
                  <Badge variant="outline" className={getStatusBadge(tender.statut)}>
                    {/* Afficher le label correspondant au statut backend */}
                    {tender.statut === 'ouvert' ? 'Ouvert' : (tender.statut === 'ferme' ? 'Clôturé' : 'Annulé')}
                  </Badge>
                  <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded">
                    {simulatedReference}
                  </span>
                </div>

                {/* Title */}
                <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-6">
                  {tender.titre}
                </h1>

                {/* Meta Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-muted/50 rounded-xl p-4">
                    <Building2 className="h-5 w-5 text-primary mb-2" />
                    <div className="text-xs text-muted-foreground mb-1">Budget estimatif</div>
                    <div className="font-semibold text-foreground text-sm">{simulatedBudget}</div>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4">
                    <Calendar className="h-5 w-5 text-primary mb-2" />
                    <div className="text-xs text-muted-foreground mb-1">Date limite</div>
                    <div className="font-semibold text-foreground text-sm">
                      {new Date(tender.date_limite_depot).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4">
                    <Clock className="h-5 w-5 text-warning mb-2" />
                    <div className="text-xs text-muted-foreground mb-1">Temps restant</div>
                    <div className="font-semibold text-foreground text-sm">{daysLeft} jours</div>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4">
                    <FileText className="h-5 w-5 text-primary mb-2" />
                    <div className="text-xs text-muted-foreground mb-1">Publication</div>
                    <div className="font-semibold text-foreground text-sm">
                      {new Date(tender.date_publication).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Card */}
              <div className="lg:col-span-1">
                <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-lg">
                  <div className="text-center mb-6">
                    {tender.statut === 'ouvert' ? (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success text-sm font-medium mb-4">
                        <CheckCircle2 className="h-4 w-4" />
                        Ouvert aux soumissions
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium mb-4">
                        <AlertCircle className="h-4 w-4" />
                        {tender.statut === 'ferme' ? 'Clôturé' : 'Annulé'}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Connectez-vous pour soumettre votre offre
                    </p>
                  </div>
                  <div className="space-y-3">
                    <Button className="w-full" size="lg" asChild disabled={tender.statut !== 'ouvert'}>
                      <Link to="/connexion">
                        <Send className="mr-2 h-5 w-5" />
                        Soumettre une offre
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full" size="lg">
                      <FileDown className="mr-2 h-5 w-5" />
                      Télécharger le dossier {/* Ce bouton nécessitera une logique backend pour les documents */}
                    </Button>
                  </div>
                  <div className="mt-6 pt-6 border-t border-border">
                    <div className="flex items-start gap-3 text-sm">
                      <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                      <p className="text-muted-foreground">
                        Vous devez avoir un compte fournisseur validé pour soumettre une offre.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-10 md:py-16">
          <div className="container">
            <div className="grid lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 space-y-10">
                {/* Description */}
                <div>
                  <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                    Description
                  </h2>
                  <div className="prose prose-sm max-w-none text-muted-foreground">
                    {tender.description.split("\n\n").map((paragraph, i) => (
                      <p key={i} className="mb-4 leading-relaxed">{paragraph}</p>
                    ))}
                  </div>
                </div>

                {/* Requirements (Affichage des exigences - actuellement simulé) */}
                <div>
                  <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                    Conditions de participation
                  </h2>
                  <ul className="space-y-3">
                    {simulatedRequirements.map((req, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Evaluation Criteria (Critères d'évaluation - actuellement simulé) */}
                <div>
                  <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                    Critères d'évaluation
                  </h2>
                  <div className="space-y-4">
                    {simulatedEvaluationCriteria.map((criteria, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">{criteria.name}</span>
                          <span className="text-sm text-muted-foreground">{criteria.weight}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${criteria.weight}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Documents (Documents à télécharger - actuellement simulé) */}
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-4">
                    Documents à télécharger
                  </h3>
                  <div className="space-y-3">
                    {simulatedDocuments.map((doc, index) => (
                      <button
                        key={index}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left group"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {doc.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {doc.type} • {doc.size}
                          </div>
                        </div>
                        <FileDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contact (Contact - actuellement simulé) */}
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-4">
                    Contact
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Briefcase className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-foreground">{simulatedContact.department}</div>
                        <div className="text-sm text-muted-foreground">Dakar Dem Dikk</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div className="text-sm text-muted-foreground">{simulatedContact.address}</div>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-border">
                    <Button variant="outline" className="w-full" asChild>
                      <a href={`mailto:${simulatedContact.email}`}>
                        Contacter le service
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default TenderDetail;