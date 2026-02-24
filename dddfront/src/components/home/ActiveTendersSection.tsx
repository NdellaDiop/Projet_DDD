// dddfront/src/components/home/ActiveTendersSection.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar, Tag, Clock, Building2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";

interface AppelOffre {
  id: number;
  responsable_marche_id: number;
  titre: string;
  description: string;
  date_publication: string; // Sera une chaîne de date/heure ISO
  date_limite_depot: string; // Sera une chaîne de date/heure ISO
  statut: 'draft' | 'published' | 'closed' | 'archived';
  // Ajoutez d'autres champs si votre API en renvoie (ex: reference, category, budget si non simulés)
  created_at: string;
  updated_at: string;
}

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

const getUrgencyColor = (daysLeft: number) => {
  if (daysLeft <= 7) return "text-destructive";
  if (daysLeft <= 14) return "text-warning";
  return "text-muted-foreground";
};

const ActiveTendersSection = () => {
  const { api } = useAuth();
  const [appelsOffres, setAppelsOffres] = useState<AppelOffre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppelsOffres = async () => {
      try {
        setLoading(true);
        // La route /api/appels-offres est accessible à tous les rôles pour la lecture
        const response = await api.get('/api/appels-offres');

        let tendersToProcess: AppelOffre[] = [];

        // Vérifie si la réponse est un objet avec une propriété 'data' qui est un tableau
        if (response.data && typeof response.data === 'object' && Array.isArray(response.data.data)) {
          tendersToProcess = response.data.data;
        }
        // Sinon, vérifie si la réponse est directement un tableau
        else if (Array.isArray(response.data)) {
          tendersToProcess = response.data;
        } else {
          setAppelsOffres([]);
          setLoading(false);
          return;
        }

        // On filtre pour ne garder que ceux qui sont "published" (votre backend renvoie 'published', pas 'ouvert')
        const fetchedTenders = tendersToProcess.filter(tender => tender.statut === 'published');
        // On ne garde que les 4 plus récents pour l'accueil
        setAppelsOffres(fetchedTenders.slice(0, 4));
      } catch (err: any) {
        console.error("Erreur lors de la récupération des appels d'offres:", err);
        setError(null); // On ne veut pas afficher d'erreur critique sur la home, juste pas d'appels d'offres
      } finally {
        setLoading(false);
      }
    };

    fetchAppelsOffres();
  }, [api]);

  // Fonction pour calculer les jours restants
  const calculateDaysLeft = (deadline: string): number => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Pour une comparaison basée uniquement sur la date
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0; // Ne pas afficher de jours négatifs
  };

  if (loading) {
    return (
      <section className="py-20 md:py-28 bg-muted/50">
        <div className="container text-center">
          <p className="text-lg text-muted-foreground">Chargement des appels d'offres...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-20 md:py-28 bg-muted/50">
        <div className="container text-center">
          <p className="text-lg text-destructive">{error}</p>
        </div>
      </section>
    );
  }

  if (appelsOffres.length === 0) {
    return (
      <section className="py-20 md:py-28 bg-muted/50">
        <div className="container text-center">
          <p className="text-lg text-muted-foreground">Aucun appel d'offre actif pour le moment.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 md:py-28 bg-muted/50">
      <div className="container">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <span className="inline-block px-4 py-1.5 mb-4 text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full">
              Opportunités
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Appels d'Offres en Cours
            </h2>
            <p className="mt-3 text-muted-foreground text-lg max-w-xl">
              Consultez les dernières opportunités de marchés publics et soumissionnez en ligne.
            </p>
          </div>
          <Button variant="outline" asChild className="shrink-0">
            <Link to="/appels-offres">
              Voir tous les appels
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Tenders Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {appelsOffres.map((tender) => {
            const daysLeft = calculateDaysLeft(tender.date_limite_depot);
            const simulatedCategory = "Fournitures"; 
            const simulatedReference = (tender as any).reference || `AO-${tender.id}`;

            return (
              <Link
                key={tender.id}
                to={`/appels-offres/${tender.id}`}
                className="group block"
              >
                <article className="h-full rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <Badge
                      variant="outline"
                      className={`${getCategoryColor(simulatedCategory)} font-medium`}
                    >
                      <Tag className="mr-1.5 h-3 w-3" />
                      {simulatedCategory}
                    </Badge>
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                      {simulatedReference}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-display text-lg font-semibold text-foreground mb-4 group-hover:text-primary transition-colors line-clamp-2">
                    {tender.titre}
                  </h3>

                  {/* Meta Info */}
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4 shrink-0" />
                      {/* Votre API ne renvoie pas de budget directement. Si vous voulez l'afficher,
                          il faudra l'ajouter au modèle AppelOffre dans le backend ou le simuler ici. */}
                      <span className="truncate">Budget non spécifié</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>{new Date(tender.date_limite_depot).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className={`flex items-center gap-1.5 text-sm font-medium ${getUrgencyColor(daysLeft)}`}>
                      <Clock className="h-4 w-4" />
                      {daysLeft} jours restants
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Consulter
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ActiveTendersSection;