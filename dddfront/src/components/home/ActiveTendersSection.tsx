// dddfront/src/components/home/ActiveTendersSection.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar, Tag, Clock, Building2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { sourceFinancementLabel } from "@/lib/appelOffreFinancement";

interface AppelOffre {
  id: number;
  responsable_marche_id: number;
  titre: string;
  description: string;
  date_publication: string;
  date_limite_depot: string;
  statut: "draft" | "published" | "closed" | "archived";
  created_at: string;
  updated_at: string;
  reference?: string;
  source_financement?: string;
  source_financement_label?: string | null;
}

const getUrgencyColor = (daysLeft: number) => {
  if (daysLeft <= 7) return "text-destructive";
  if (daysLeft <= 14) return "text-warning";
  return "text-muted-foreground";
};

const ActiveTendersSection = () => {
  const { api } = useAuth();
  const [appelsOffres, setAppelsOffres] = useState<AppelOffre[]>([]);
  const [loading, setLoading] = useState(true);

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
      } catch (err: unknown) {
        console.error("Erreur lors de la récupération des appels d'offres:", err);
        setAppelsOffres([]);
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
        <div className="container max-w-5xl text-center">
          <p className="text-lg text-muted-foreground">Chargement des appels d'offres...</p>
        </div>
      </section>
    );
  }

  if (appelsOffres.length === 0) {
    return (
      <section className="py-20 md:py-28 bg-muted/50">
        <div className="container max-w-5xl text-center">
          <p className="text-lg text-muted-foreground">Aucun appel d'offre actif pour le moment.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 md:py-28 bg-muted/50">
      <div className="container max-w-5xl">
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
              Consultez les avis publiés et les modalités de dépôt des plis (présentiel) pour chaque marché.
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

            return (
              <Link
                key={tender.id}
                to={`/appels-offres/${tender.id}`}
                className="group block"
              >
                <article className="h-full rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <Badge variant="outline" className="border-border bg-muted/50 text-muted-foreground font-medium">
                      <Tag className="mr-1.5 h-3 w-3" />
                      Marché public
                    </Badge>
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                      {tender.reference?.trim() ? tender.reference : `AO-${tender.id}`}
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
                      <span className="truncate">
                        Financement :{" "}
                        {sourceFinancementLabel(
                          tender.source_financement,
                          tender.source_financement_label ?? null
                        )}
                      </span>
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
                      Consulter les avis
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