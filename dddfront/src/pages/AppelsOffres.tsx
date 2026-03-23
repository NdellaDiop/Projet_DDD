import { useState, useEffect } from "react"; 
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Calendar,
  Tag,
  Clock,
  Building2,
  ArrowRight,
  Filter,
  FileText,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext"; // Importez useAuth
import { toast } from "@/components/ui/use-toast"; // Importez toast

// Définissez une interface pour le modèle AppelOffre de votre backend
// Assurez-vous que les noms des champs correspondent exactement à ce que votre API renvoie
interface AppelOffre {
  id: number;
  responsable_marche_id: number; // Supposons que ceci est présent
  titre: string;
  description: string;
  date_publication: string;
  date_limite_depot: string;
  statut: 'draft' | 'published' | 'closed' | 'archived';
  created_at?: string;
  updated_at?: string;
  reference?: string; // Ajout de la référence
}

const getStatusBadge = (status: AppelOffre['statut']) => {
  switch (status) {
    case "published":
      return "bg-success/10 text-success border-success/20";
    case "closed":
    case "archived": 
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


const AppelsOffres = () => {
  const { api } = useAuth(); // Récupérez l'instance Axios configurée
  const [appelsOffres, setAppelsOffres] = useState<AppelOffre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); 

  useEffect(() => {
    const fetchAppelsOffres = async () => {
      try {
        setLoading(true);
        // Construire les paramètres de requête
        const params: Record<string, string | number> = {};
        if (statusFilter !== "all") {
          params.statut = statusFilter;
        }
        
        // Ajouter la recherche côté serveur si nécessaire, ou on laisse le filtre client pour l'instant
        // Pour une vraie pagination, il faudra aussi envoyer 'page' et 'per_page'
        // Pour l'instant, on récupère tout ce que l'API nous donne (qui est paginé par défaut à 15)
        // Idéalement, on devrait augmenter per_page ici pour avoir plus de résultats sur la page publique
        params.per_page = 50; 

        const response = await api.get('/api/appels-offres', { params });

        const tenders =
          response.data && Array.isArray(response.data.data)
            ? response.data.data
            : Array.isArray(response.data)
            ? response.data
            : [];

setAppelsOffres(tenders);
      } catch (err: unknown) {
        console.error("Erreur lors de la récupération des appels d'offres:", err);
        setError("Impossible de charger les appels d'offres. Veuillez réessayer.");
        toast({
          title: "Erreur de chargement",
          description: "Impossible de récupérer les appels d'offres.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAppelsOffres();
  }, [api, statusFilter]); // Re-déclenche si l'instance API change (peu probable mais bonne pratique)

  const filteredTenders = appelsOffres.filter((tender) => {
    const matchesSearch =
      tender.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tender.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      // Si vous avez une référence dans le backend, utilisez-la ici
      (tender.reference || `ao-${tender.id}`).toLowerCase().includes(searchQuery.toLowerCase()); // Simulation de recherche par "référence" via ID
    
    // Mappage des statuts du frontend vers ceux du backend
    const matchesStatus =
    statusFilter === "all" ||
    (statusFilter === "published" && tender.statut === "published") ||
    (statusFilter === "closed" && tender.statut === "closed");

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <section className="py-20 md:py-28 bg-muted/50">
            <div className="container text-center">
              <p className="text-lg text-muted-foreground">Chargement des appels d'offres...</p>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <section className="py-20 md:py-28 bg-muted/50">
            <div className="container text-center">
              <p className="text-lg text-destructive">{error}</p>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="gradient-hero py-16 md:py-20">
          <div className="container">
            <div className="max-w-3xl">
              <h1 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl mb-4">
                Appels d'Offres
              </h1>
              <p className="text-white/80 text-lg max-w-2xl">
                Consultez tous les appels d'offres publiés par Dakar Dem Dikk et
                soumissionnez en ligne.
              </p>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="py-8 border-b border-border bg-card sticky top-16 md:top-20 z-40">
          <div className="container">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par titre, description ou référence..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="published">Ouvert</SelectItem>
                    <SelectItem value="closed">Clôturé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="py-10 md:py-16">
          <div className="container">
            {/* Results count */}
            <div className="flex items-center justify-between mb-8">
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {filteredTenders.length}
                </span>{" "}
                appel(s) d'offres trouvé(s)
              </p>
            </div>

            {/* Tenders List */}
            <div className="space-y-4">
              {filteredTenders.length > 0 ? (
                filteredTenders.map((tender) => {
                  const daysLeft = calculateDaysLeft(tender.date_limite_depot);
                  const simulatedReference = `AO-${tender.id}`; // Fallback si pas de ref

                  return (
                    <Link
                      key={tender.id}
                      to={`/appels-offres/${tender.id}`}
                      className="group block"
                    >
                      <article className="rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:shadow-md hover:border-primary/30">
                        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                          {/* Main Content */}
                          <div className="flex-1 min-w-0">
                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <Badge
                                variant="outline"
                                className={getStatusBadge(tender.statut)}
                              >
                                {/* Afficher le label correspondant au statut backend */}
                                {tender.statut === 'published' ? 'Ouvert' : (tender.statut === 'closed' ? 'Clôturé' : 'Annulé')}
                              </Badge>
                              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                                {tender.reference || simulatedReference}
                              </span>
                            </div>

                            {/* Title */}
                            <h2 className="font-display text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                              {tender.titre}
                            </h2>

                            {/* Description */}
                            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                              {tender.description}
                            </p>

                            {/* Meta */}
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                {/* Budget non spécifié si non retourné par le backend */}
                                <span>Budget : Sur demande</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  Date limite :{" "}
                                  {new Date(tender.date_limite_depot).toLocaleDateString("fr-FR")}
                                </span>
                              </div>
                              {tender.statut === "published" && (
                                <div
                                  className={`flex items-center gap-2 font-medium ${
                                    daysLeft <= 7
                                      ? "text-destructive"
                                      : daysLeft <= 14
                                      ? "text-warning"
                                      : "text-success"
                                  }`}
                                >
                                  <Clock className="h-4 w-4" />
                                  <span>{daysLeft} jours restants</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action */}
                          <div className="flex lg:flex-col items-center gap-3">
                            <Button
                              variant="card"
                              className="w-full lg:w-auto"
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Consulter
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </article>
                    </Link>
                  );
                })
              ) : (
                // Empty State when no tenders match filters
                <div className="text-center py-16">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                    Aucun résultat trouvé
                  </h3>
                  <p className="text-muted-foreground">
                    Essayez de modifier vos critères de recherche.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default AppelsOffres;