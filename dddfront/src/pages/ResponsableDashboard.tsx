import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PlusCircle,
  Megaphone,
  Archive,
  LogOut,
  Eye,
  CheckCircle,
  XCircle,
  Users,
  LayoutDashboard,
  BarChart3,
  Briefcase,
  Settings,
  FileText,
  Download,
  Building2,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  MessageSquare,
  Send,
  Filter,
  Search,
  Award,
  RotateCcw,
} from "lucide-react";
import AdvancedSearch from "@/components/AdvancedSearch";
import ResponsableAdvancedStats from "@/components/ResponsableAdvancedStats";
import DashboardNavbar from "@/components/layout/DashboardNavbar";
import { exportData } from "@/lib/exportUtils";
import { generatePVReport } from "@/lib/reportUtils";
import {
  ALL_LEGAL_DOCUMENT_UPLOAD_CATEGORIES,
  legalDocumentLabel,
  missingLegalCategories,
} from "@/lib/legalDocuments";
import { SOURCE_FINANCEMENT_OPTIONS, type SourceFinancement } from "@/lib/appelOffreFinancement";
import { TYPE_MARCHE_OPTIONS, type TypeMarche } from "@/lib/appelOffreCategorisation";
import { type ReopenAoTarget } from "@/lib/reopenAppelOffre";
import { ReopenAppelOffreDialog } from "@/components/appel-offre/ReopenAppelOffreDialog";
import {
  AO_PIECE_LABELS,
  buildAppelOffreCreateFormData,
} from "@/lib/appelOffreCreateFormData";
import { validateAoPieceSize } from "@/lib/uploadLimits";
import {
  getSenegalPhoneValidationError,
  normalizeSenegalPhone,
  sanitizePhoneInput,
} from "@/lib/phoneValidation";
import { DataTablePagination } from "@/components/ui/DataTablePagination";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";


interface AppelOffre {
  id: number;
  reference: string;
  source_financement?: string;
  source_financement_label?: string;
  titre: string;
  description: string;
  /** Lieu / horaires / contact pour le dépôt physique — saisi par le PRM ou l’admin */
  modalites_soumission_physique?: string | null;
  date_limite_depot: string;
  statut: 'draft' | 'published' | 'closed' | 'archived';
  candidatures_count?: number;
  pieces_ao_manquantes?: string[];
  pieces_ao_completes?: boolean;
}

interface Candidature {
  id: number;
  fournisseur: {
    id: number;
    nom_entreprise: string;
    email_contact: string;
    references_professionnelles?: string | null;
  };
  date_soumission: string;
  statut: string;
  montant_propose?: number;
}

interface DocumentLegal {
  id: number;
  nom_fichier: string;
  categorie: string;
  type_fichier?: string;
  chemin_fichier: string;
  url?: string;
  created_at: string;
}

interface CommentItem {
  id: number;
  message: string;
  created_at: string;
  user?: { id: number; name: string };
  document?: { nom_fichier: string };
}

interface ResponsableProfile {
  direction?: string;
  fonction?: string;
  telephone?: string;
}

type DashboardFilterValue = string | number | boolean;

function roleDisplayLabel(roleName?: string): string {
  switch (roleName) {
    case "RESPONSABLE_MARCHE":
      return "Personne responsable du marché (PRM)";
    case "ADMIN":
      return "Administrateur";
    case "FOURNISSEUR":
      return "Fournisseur";
    default:
      return roleName ? roleName.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "Utilisateur";
  }
}

export default function ResponsableDashboard() {
  const { api, user, logout } = useAuth();
  // Dépôt en présentiel : on ne doit pas exposer le module "candidatures" au PRM.
  const afficherCandidatures = false;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "overview" | "appels-offres" | "fournisseurs" | "statistiques"
  >("overview");
  const [appelsOffres, setAppelsOffres] = useState<AppelOffre[]>([]);
  const [selectedAppelOffre, setSelectedAppelOffre] = useState<AppelOffre | null>(null);
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingAppelsOffres, setLoadingAppelsOffres] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination et Filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, DashboardFilterValue>>({});
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    perPage: 15,
  });

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // État pour la création
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [reopenDialogAo, setReopenDialogAo] = useState<ReopenAoTarget | null>(null);
  const [reopenSubmitting, setReopenSubmitting] = useState(false);
  const [reopenForceDate, setReopenForceDate] = useState(false);
  const [newTender, setNewTender] = useState({
    reference: "",
    source_financement: "etat" as SourceFinancement,
    mode_passation: "",
    type_marche: "" as TypeMarche | "",
    titre: "",
    description: "",
    modalites_soumission_physique: "",
    date_limite_depot: "",
    cahier_paiement_requis: false,
    cahier_prix_xof: "" as string,
  });
  const [avisAoFile, setAvisAoFile] = useState<File | null>(null);
  const [cahierChargesFile, setCahierChargesFile] = useState<File | null>(null);
  const [creatingTender, setCreatingTender] = useState(false);

  const [isEditModalitesOpen, setIsEditModalitesOpen] = useState(false);
  const [aoForModalites, setAoForModalites] = useState<AppelOffre | null>(null);
  const [draftModalites, setDraftModalites] = useState("");
  const [savingModalites, setSavingModalites] = useState(false);

  // État pour voir les candidatures d'un AO
  const [isViewCandidatesOpen, setIsViewCandidatesOpen] = useState(false);

  // État pour voir le dossier d'une candidature
  const [isViewDossierOpen, setIsViewDossierOpen] = useState(false);
  const [selectedCandidature, setSelectedCandidature] = useState<Candidature | null>(null);
  const [legalDocuments, setLegalDocuments] = useState<DocumentLegal[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Compte (profil / paramètres)
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [accountTab, setAccountTab] = useState<"profile" | "settings">("profile");
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });

  // État pour le profil responsable
  const [profile, setProfile] = useState<ResponsableProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    direction: "",
    fonction: "",
    telephone: "",
  });

  // Annuaire fournisseurs (lecture seule pour contrôle des dossiers au siège)
  type DirectoryFournisseur = {
    id: number;
    raison_sociale: string;
    ninea?: string | null;
    email?: string | null;
    telephone?: string | null;
    adresse?: string | null;
    statut: string;
    references_professionnelles?: string | null;
    user?: { id: number; name: string; email: string } | null;
  };
  const [directoryFournisseurs, setDirectoryFournisseurs] = useState<DirectoryFournisseur[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [directorySearch, setDirectorySearch] = useState("");
  const [debouncedDirectorySearch, setDebouncedDirectorySearch] = useState("");
  const [directoryPagination, setDirectoryPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    perPage: 15,
  });
  const [isViewDirectoryFournisseurOpen, setIsViewDirectoryFournisseurOpen] = useState(false);
  const [selectedDirectoryFournisseur, setSelectedDirectoryFournisseur] =
    useState<DirectoryFournisseur | null>(null);
  const [directoryLegalDocs, setDirectoryLegalDocs] = useState<DocumentLegal[]>([]);
  const [loadingDirectoryLegalDocs, setLoadingDirectoryLegalDocs] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedDirectorySearch(directorySearch), 400);
    return () => clearTimeout(t);
  }, [directorySearch]);


  const getErrorMessage = (error: unknown, fallback: string): string => {
    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
    ) {
      return (error as { response?: { data?: { message?: string } } }).response?.data?.message as string;
    }
    if (error instanceof Error) return error.message;
    return fallback;
  };

  const loadDirectoryFournisseurs = useCallback(
    async (page = 1) => {
      if (!api) return;
      setLoadingDirectory(true);
      try {
        const res = await api.get("/api/fournisseurs-directory", {
          params: {
            page,
            per_page: directoryPagination.perPage,
            search: debouncedDirectorySearch,
          },
        });
        const payload = res.data;
        const list: DirectoryFournisseur[] = Array.isArray(payload?.data) ? payload.data : [];
        setDirectoryFournisseurs(list);
        if (payload?.meta) {
          setDirectoryPagination((prev) => ({
            ...prev,
            currentPage: payload.meta.current_page,
            totalPages: payload.meta.last_page,
            totalItems: payload.meta.total,
            perPage: payload.meta.per_page,
          }));
        } else {
          setDirectoryPagination((prev) => ({
            ...prev,
            currentPage: 1,
            totalPages: 1,
            totalItems: list.length,
            perPage: list.length || prev.perPage,
          }));
        }
      } catch (error) {
        console.error("Erreur chargement annuaire fournisseurs:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger l'annuaire des fournisseurs.",
          variant: "destructive",
        });
        setDirectoryFournisseurs([]);
      } finally {
        setLoadingDirectory(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api, debouncedDirectorySearch, directoryPagination.perPage]
  );

  useEffect(() => {
    if (activeTab === "fournisseurs") {
      void loadDirectoryFournisseurs(1);
    }
  }, [activeTab, loadDirectoryFournisseurs]);

  const openDirectoryFournisseur = async (f: DirectoryFournisseur) => {
    setSelectedDirectoryFournisseur(f);
    setIsViewDirectoryFournisseurOpen(true);
    setDirectoryLegalDocs([]);
    if (!api) return;
    setLoadingDirectoryLegalDocs(true);
    try {
      const res = await api.get(`/api/fournisseurs/${f.id}/documents-legaux`);
      const payload = res.data;
      const docs: DocumentLegal[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
      setDirectoryLegalDocs(docs);
    } catch (error) {
      setDirectoryLegalDocs([]);
      toast({
        title: "Documents indisponibles",
        description: getErrorMessage(error, "Impossible de charger les documents légaux."),
        variant: "destructive",
      });
    } finally {
      setLoadingDirectoryLegalDocs(false);
    }
  };

  const openLegalDocument = async (doc: DocumentLegal) => {
    if (!api) return;
    try {
      const response = await api.get(`/api/documents/${doc.id}/download`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data]);
      const contentType =
        response.headers["content-type"] || doc.type_fichier || "application/octet-stream";
      const url = window.URL.createObjectURL(blob);
      if (contentType.includes("pdf") || contentType.includes("image")) {
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.download = doc.nom_fichier || `document-${doc.id}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: getErrorMessage(error, "Impossible d'ouvrir le document."),
        variant: "destructive",
      });
    }
  };

  const loadProfile = useCallback(async () => {
    if (!api) return;
    try {
      setLoadingProfile(true);
      const profileRes = await api.get("/api/responsable/profile");
      setProfile(profileRes.data);
      setProfileForm({
        direction: profileRes.data.direction || "",
        fonction: profileRes.data.fonction || "",
        telephone: profileRes.data.telephone || "",
      });
    } catch (error) {
      console.error("Erreur chargement profil:", error);
    } finally {
      setLoadingProfile(false);
    }
  }, [api]);

  const loadAppelsOffres = useCallback(
    async (options?: { fetchAll?: boolean }) => {
      if (!api) return;
      const fetchAll = options?.fetchAll === true;
      try {
        setLoadingAppelsOffres(true);
        if (!fetchAll) setIsRefreshing(true);

        const params: Record<string, DashboardFilterValue> = {};

        if (fetchAll) {
          // Vue d'ensemble : tous les AO du PRM pour compteurs + aperçu (pas de pagination)
          params.all = true;
        } else {
          params.page = pagination.currentPage;
          params.per_page = pagination.perPage;
          params.search = debouncedSearchTerm;
          Object.assign(params, advancedFilters);
          if (filterStatut && filterStatut !== "tous") {
            params.statut = filterStatut;
          }
        }

        const response = await api.get("/api/responsable/mes-appels-offres", { params });

        if (response.data.data && response.data.meta) {
          setAppelsOffres(response.data.data);
          setPagination((prev) => ({
            ...prev,
            currentPage: response.data.meta.current_page,
            totalPages: response.data.meta.last_page,
            totalItems: response.data.meta.total,
            perPage: response.data.meta.per_page,
          }));
        } else {
          const data = Array.isArray(response.data) ? response.data : response.data.data || [];
          setAppelsOffres(data);
          setPagination((prev) => ({
            ...prev,
            currentPage: 1,
            totalPages: 1,
            totalItems: data.length,
            perPage: data.length || 15,
          }));
        }
      } catch (error) {
        console.error("Erreur chargement AO:", error);
      } finally {
        setLoadingAppelsOffres(false);
        setIsRefreshing(false);
      }
    },
    [
      api,
      pagination.currentPage,
      pagination.perPage,
      debouncedSearchTerm,
      advancedFilters,
      filterStatut,
    ]
  );

  const overviewStats = (() => {
    const total = appelsOffres.length;
    const draft = appelsOffres.filter((a) => a.statut === "draft").length;
    const published = appelsOffres.filter((a) => a.statut === "published").length;
    const closed = appelsOffres.filter((a) => a.statut === "closed").length;
    return { total, draft, published, closed, candidatures: 0 };
  })();

  useEffect(() => {
    if (activeTab === "appels-offres") {
      void loadAppelsOffres({ fetchAll: false });
    } else if (activeTab === "overview") {
      void loadAppelsOffres({ fetchAll: true });
    }
  }, [activeTab, loadAppelsOffres]);

  // Chargement initial du profil
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const loadData = async () => {
    await Promise.all([
      loadAppelsOffres({ fetchAll: activeTab === "overview" }),
      loadProfile(),
    ]);
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handlePerPageChange = (perPage: number) => {
    setPagination(prev => ({ ...prev, perPage, currentPage: 1 }));
  };

  const handleAdvancedSearch = (filters: Record<string, DashboardFilterValue>) => {
    setAdvancedFilters(filters);
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset pagination
    // L'effet useEffect déclenchera le rechargement car pagination ou activeTab a changé
    // Si pagination ne change pas (ex: on est déjà page 1), on doit appeler loadAppelsOffres manuellement
    // Pour simplifier, on force l'appel ici si besoin, mais useEffect est plus propre.
    // Astuce : on peut ajouter advancedFilters aux dépendances du useEffect.
  };



  const handleExportData = async (format: 'excel' | 'pdf') => {
    if (!api) return;
    try {
        const params: Record<string, DashboardFilterValue> = {
            all: true,
            search: searchTerm,
            ...advancedFilters
        };
        if (filterStatut && filterStatut !== 'tous') {
            params.statut = filterStatut;
        }

        const response = await api.get("/api/responsable/mes-appels-offres", { params });
        // Avec Resource::collection, les données sont souvent enveloppées dans 'data'
        const data = response.data.data || response.data; 

        exportData(format, {
            fileName: 'mes_appels_offres',
            title: 'Mes Appels d\'Offres',
            columns: [
                { header: 'Référence', key: 'reference' },
                { header: 'Titre', key: 'titre' },
                { header: 'Date Clôture', key: 'date_limite_depot', format: (v: string) => v ? new Date(v).toLocaleDateString() : '-' },
                { header: 'Statut', key: 'statut' },
                // Dépôt en présentiel : pas d'export "candidatures"
            ],
            data: data
        });

        toast({ title: "Export réussi", description: `Le fichier ${format.toUpperCase()} a été généré.` });
    } catch (error) {
        console.error("Erreur export:", error);
        toast({ title: "Erreur", description: "Impossible d'exporter les données.", variant: "destructive" });
    }
  };


  const handleCreateTender = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api) return;
    try {
      setCreatingTender(true);
      const parsedDate = new Date(newTender.date_limite_depot);
      if (!newTender.date_limite_depot || Number.isNaN(parsedDate.getTime())) {
        toast({
          title: "Date invalide",
          description: "Renseignez une date limite de dépôt valide.",
          variant: "destructive",
        });
        return;
      }
      if (newTender.cahier_paiement_requis) {
        const raw = parseInt(String(newTender.cahier_prix_xof).replace(/\D/g, ""), 10);
        if (!raw || raw < 1) {
          toast({
            title: "Montant manquant",
            description: "Indiquez un montant en FCFA pour le cahier des charges payant.",
            variant: "destructive",
          });
          return;
        }
      }
      if (!newTender.mode_passation.trim() || !newTender.type_marche) {
        toast({
          title: "Champs manquants",
          description: "Renseignez le mode de passation et sélectionnez le type de marché.",
          variant: "destructive",
        });
        return;
      }
      if (!avisAoFile || !cahierChargesFile) {
        toast({
          title: "Pièces manquantes",
          description: "Joignez l'avis d'appel d'offres et le cahier des charges (obligatoires avant publication).",
          variant: "destructive",
        });
        return;
      }
      const avisSizeErr = validateAoPieceSize(avisAoFile, "Avis");
      const cahierSizeErr = validateAoPieceSize(cahierChargesFile, "Cahier des charges");
      if (avisSizeErr || cahierSizeErr) {
        toast({
          title: "Fichier trop volumineux",
          description: [avisSizeErr, cahierSizeErr].filter(Boolean).join(" "),
          variant: "destructive",
        });
        return;
      }
      const formData = buildAppelOffreCreateFormData(
        newTender,
        avisAoFile,
        cahierChargesFile,
        parsedDate
      );

      await api.post("/api/appels-offres/with-documents", formData);

      toast({
        title: "Succès",
        description: "Appel d'offres créé en brouillon avec l'avis et le cahier des charges.",
      });
      setIsCreateOpen(false);
      setNewTender({
        reference: "",
        source_financement: "etat",
        mode_passation: "",
        type_marche: "",
        titre: "",
        description: "",
        modalites_soumission_physique: "",
        date_limite_depot: "",
        cahier_paiement_requis: false,
        cahier_prix_xof: "",
      });
      setAvisAoFile(null);
      setCahierChargesFile(null);
      loadData();
    } catch (error: unknown) {
      console.error("Erreur création:", error);
      const message = getErrorMessage(error, "Erreur lors de la création.");
      // Si on a des erreurs de validation précises
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        (error as { response?: { data?: { errors?: Record<string, string[]> } } }).response?.data?.errors
      ) {
         const errors = Object.values((error as { response?: { data?: { errors?: Record<string, string[]> } } }).response?.data?.errors || {}).flat().join('\n');
         toast({ title: "Erreur de validation", description: errors, variant: "destructive" });
      } else {
         toast({ title: "Erreur", description: message, variant: "destructive" });
      }
    } finally {
      setCreatingTender(false);
    }
  };

  const handlePublish = async (id: number, titre?: string) => {
    if (!api) return;
    const label = titre ? `« ${titre} »` : "cet appel d'offres";
    if (
      !confirm(
        `Confirmer la publication de ${label} ?\n\nL'avis sera visible par les fournisseurs. Vérifiez les pièces et les modalités de dépôt.`
      )
    ) {
      return;
    }
    try {
      await api.post(`/api/appels-offres/${id}/publish`);
      toast({ title: "Publié", description: "L'appel d'offres est maintenant visible." });
      loadData();
    } catch (error) {
      const message = getErrorMessage(error, "Impossible de publier.");
      toast({ title: "Erreur", description: message, variant: "destructive" });
    }
  };

  const openEditModalites = (ao: AppelOffre) => {
    setAoForModalites(ao);
    setDraftModalites(ao.modalites_soumission_physique ?? "");
    setIsEditModalitesOpen(true);
  };

  const handleSaveModalites = async () => {
    if (!api || !aoForModalites) return;
    const t = draftModalites.trim();
    if (aoForModalites.statut === "published" && t === "") {
      toast({
        title: "Champ requis",
        description: "Renseignez les modalités de dépôt : elles doivent rester visibles sur la fiche publique.",
        variant: "destructive",
      });
      return;
    }
    setSavingModalites(true);
    try {
      await api.put(`/api/appels-offres/${aoForModalites.id}`, {
        modalites_soumission_physique: t || null,
      });
      toast({ title: "Enregistré", description: "Les modalités de dépôt des plis ont été mises à jour." });
      setIsEditModalitesOpen(false);
      setAoForModalites(null);
      loadData();
    } catch (error) {
      toast({
        title: "Erreur",
        description: getErrorMessage(error, "Mise à jour impossible."),
        variant: "destructive",
      });
    } finally {
      setSavingModalites(false);
    }
  };

  const handleClose = async (id: number, titre?: string) => {
    if (!api) return;
    const label = titre ? `« ${titre} »` : "cet appel d'offres";
    if (
      !confirm(
        `Confirmer la clôture de ${label} ?\n\nLe dépôt des plis ne sera plus ouvert. Vous pourrez réouvrir l'appel d'offres plus tard si nécessaire.`
      )
    ) {
      return;
    }
    try {
      await api.post(`/api/appels-offres/${id}/close`);
      toast({ title: "Clôturé", description: "L'appel d'offres est clôturé." });
      loadData();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de clôturer.", variant: "destructive" });
    }
  };

  const handleReopen = (ao: ReopenAoTarget) => {
    setReopenForceDate(false);
    setReopenDialogAo(ao);
  };

  const submitReopen = async (dateLimiteDepot?: string) => {
    if (!api || !reopenDialogAo) return;
    setReopenSubmitting(true);
    try {
      const body = dateLimiteDepot ? { date_limite_depot: dateLimiteDepot } : {};
      await api.post(`/api/appels-offres/${reopenDialogAo.id}/reopen`, body);
      toast({ title: "Réouvert", description: "L'appel d'offres est de nouveau publié." });
      setReopenDialogAo(null);
      setReopenForceDate(false);
      loadData();
    } catch (error: unknown) {
      const payload =
        typeof error === "object" && error !== null && "response" in error
          ? (error as { response?: { data?: { message?: string; requires_new_date_limite?: boolean } } })
              .response?.data
          : undefined;
      if (payload?.requires_new_date_limite) {
        setReopenForceDate(true);
        toast({
          title: "Nouvelle date limite requise",
          description: payload.message ?? "Indiquez une nouvelle échéance pour réouvrir ce marché.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: getErrorMessage(error, "Impossible de réouvrir cet appel d'offres."),
          variant: "destructive",
        });
      }
    } finally {
      setReopenSubmitting(false);
    }
  };

  const handleViewCandidatures = async (ao: AppelOffre) => {
    if (!api) return;
    setSelectedAppelOffre(ao);
    try {
      const res = await api.get(`/api/responsable/appels-offres/${ao.id}/candidatures-recues`); 
      // Gérer la pagination : si data.data existe, c'est paginé, sinon c'est un tableau direct
      const candidaturesData = res.data?.data || res.data || [];
      setCandidatures(Array.isArray(candidaturesData) ? candidaturesData : []);
      setIsViewCandidatesOpen(true);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de charger les candidatures.", variant: "destructive" });
    }
  };

  const handleEvaluateCandidature = async (candidatureId: number, decision: 'accept' | 'reject') => {
    if (!api) return;
    try {
      await api.post(`/api/candidatures/${candidatureId}/${decision}`);
      toast({ 
        title: decision === 'accept' ? "Candidature acceptée" : "Candidature rejetée",
        variant: decision === 'accept' ? "default" : "destructive"
      });
      setCandidatures(prev => Array.isArray(prev) ? prev.map(c => c.id === candidatureId ? { ...c, statut: decision === 'accept' ? 'accepted' : 'rejected' } : c) : []);
    } catch (error: unknown) {
      console.error("Erreur évaluation:", error);
      const message = getErrorMessage(error, "Action impossible.");
      toast({ title: "Erreur", description: message, variant: "destructive" });
    }
  };

  const [candidatureDocuments, setCandidatureDocuments] = useState<DocumentLegal[]>([]);

  const handleViewDossier = async (candidature: Candidature) => {
    if (!api) return;
    
    // Réinitialiser les états
    setSelectedCandidature(candidature);
    setLegalDocuments([]);
    setCandidatureDocuments([]);
    setComments([]);
    setNewComment("");
    setSelectedDocumentId(null);
    setLoadingDocuments(true);
    setLoadingComments(true);
    setIsViewDossierOpen(true);
    
    try {
      const [legalDocsRes, candidatureDocsRes, commentsRes] = await Promise.all([
        api.get(`/api/responsable/candidatures/${candidature.id}/documents-legaux`).catch((err) => {
          console.error("Erreur chargement documents légaux:", err);
          console.error("Détails erreur:", err.response?.data);
          return { data: { data: [] } };
        }),
        api.get(`/api/candidatures/${candidature.id}`).catch((err) => {
          console.error("Erreur chargement candidature:", err);
          return { data: { data: null } };
        }),
        api.get(`/api/candidatures/${candidature.id}/comments`).catch((err) => {
          console.error("Erreur chargement commentaires:", err);
          return { data: [] };
        })
      ]);
      
      // La réponse peut être un objet avec une propriété data ou directement un tableau
      const legalDocsData = legalDocsRes.data?.data || legalDocsRes.data;
      setLegalDocuments(Array.isArray(legalDocsData) ? legalDocsData : []);
      
      // Récupérer les documents de la candidature (offre technique et financière)
      const candidatureData = candidatureDocsRes.data?.data || candidatureDocsRes.data;
      if (candidatureData?.documents && Array.isArray(candidatureData.documents)) {
        setCandidatureDocuments(candidatureData.documents);
      } else {
        setCandidatureDocuments([]);
      }
      
      // Charger les commentaires
      const commentsData = commentsRes.data;
      setComments(Array.isArray(commentsData) ? commentsData : []);
    } catch (error: unknown) {
      console.error("Erreur chargement documents:", error);
      toast({ 
        title: "Erreur", 
        description: getErrorMessage(error, "Impossible de charger les documents."), 
        variant: "destructive" 
      });
      setLegalDocuments([]);
      setCandidatureDocuments([]);
      setComments([]);
    } finally {
      setLoadingDocuments(false);
      setLoadingComments(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!api || !selectedCandidature || !newComment.trim()) return;
    
    setSubmittingComment(true);
    try {
      const response = await api.post(`/api/candidatures/${selectedCandidature.id}/comments`, {
        message: newComment.trim(),
        document_id: selectedDocumentId
      });
      
      setComments([...comments, response.data]);
      setNewComment("");
      setSelectedDocumentId(null);
      toast({
        title: "Commentaire ajouté",
        description: "Votre commentaire a été envoyé au fournisseur.",
      });
    } catch (error: unknown) {
      console.error("Erreur ajout commentaire:", error);
      toast({
        title: "Erreur",
        description: getErrorMessage(error, "Impossible d'ajouter le commentaire."),
        variant: "destructive"
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const getStatutBadge = (statut: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Brouillon", variant: "secondary" },
      published: { label: "Publié", variant: "default" },
      closed: { label: "Clôturé", variant: "destructive" },
      archived: { label: "Archivé", variant: "outline" },
    };
    const config = map[statut] || { label: statut, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleGenerateReport = () => {
    if (!selectedAppelOffre || !user) return;

    const reportData = {
      appelOffre: {
        reference: selectedAppelOffre.reference,
        titre: selectedAppelOffre.titre,
        description: selectedAppelOffre.description,
        // On utilise la date limite comme date de cloture
        date_cloture: new Date(selectedAppelOffre.date_limite_depot).toLocaleDateString(),
        // Date de publication estimée (ou récupérer via API si disponible)
        date_publication: new Date().toLocaleDateString(), // Simplification pour l'instant
        responsable: user.name,
      },
      candidatures: (Array.isArray(candidatures) ? candidatures : []).map((c) => ({
        fournisseur: c.fournisseur.nom_entreprise,
        email: c.fournisseur.email_contact,
        date_soumission: new Date(c.date_soumission).toLocaleDateString(),
        montant: c.montant_propose ? `${Number(c.montant_propose).toLocaleString('fr-FR').replace(/[\s\u00A0\u202F]/g, ' ')} FCFA` : 'Non spécifié',
        statut: c.statut === 'accepted' ? 'Retenu' : c.statut === 'rejected' ? 'Rejeté' : 'En attente',
        documents_complets: 'Oui', // À dynamiser si on vérifie les docs
      })),
    };

    generatePVReport(reportData);
    toast({
      title: "Rapport généré",
      description: "Le Procès-Verbal d'analyse a été téléchargé.",
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: "Déconnexion", description: "À bientôt !" });
      navigate("/connexion");
    } catch (error) {
      window.location.href = "/connexion";
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api) return;
    
    // Validation côté client
    if (!profileForm.direction || !profileForm.fonction || !profileForm.telephone) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    const phoneError = getSenegalPhoneValidationError(profileForm.telephone);
    if (phoneError) {
      toast({ title: "Téléphone invalide", description: phoneError, variant: "destructive" });
      return;
    }
    const normalizedPhone = normalizeSenegalPhone(profileForm.telephone);
    if (!normalizedPhone) {
      toast({
        title: "Téléphone invalide",
        description: "Numéro sénégalais requis (9 chiffres).",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const payload = {
        direction: profileForm.direction.trim(),
        fonction: profileForm.fonction.trim(),
        telephone: normalizedPhone,
      };

      const response = await api.put("/api/responsable/profile", payload);
      setProfile(response.data);
      setEditingProfile(false);
      
      // Recharger le profil
      try {
        const profileRes = await api.get("/api/responsable/profile");
        setProfile(profileRes.data);
        setProfileForm({
          direction: profileRes.data.direction || "",
          fonction: profileRes.data.fonction || "",
          telephone: profileRes.data.telephone || "",
        });
      } catch (err) {
        console.error("Erreur rechargement profil:", err);
      }
      
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été enregistrées avec succès",
      });
    } catch (error: unknown) {
      console.error("Erreur mise à jour profil:", error);
      const responseData =
        typeof error === "object" && error !== null && "response" in error
          ? (error as { response?: { data?: { errors?: Record<string, string[]>, message?: string } } }).response?.data
          : undefined;
      
      let errorMessage = "Erreur lors de la mise à jour";
      
      if (responseData?.errors) {
        // Afficher toutes les erreurs de validation
        const errors = responseData.errors;
        const errorList = Object.entries(errors)
          .map(([field, messages]: [string, string[]]) => {
            const fieldName = field === 'direction' ? 'Direction' :
                            field === 'fonction' ? 'Fonction' :
                            field === 'telephone' ? 'Téléphone' :
                            field;
            return `${fieldName}: ${Array.isArray(messages) ? messages.join(', ') : messages}`;
          })
          .join('; ');
        errorMessage = errorList;
      } else if (responseData?.message) {
        errorMessage = responseData.message;
      }
      
      toast({
        title: "Erreur de validation",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
        toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
        return;
    }

    try {
      if (!api) throw new Error("API non disponible");
      
      await api.put('/api/update-password', {
        current_password: passwordData.current,
        new_password: passwordData.new,
        new_password_confirmation: passwordData.confirm
      });

      toast({ title: "Succès", description: "Votre mot de passe a été mis à jour." });
      setIsAccountOpen(false);
      setPasswordData({ current: "", new: "", confirm: "" });
    } catch (error: unknown) {
        const message = getErrorMessage(error, "Erreur lors de la mise à jour du mot de passe.");
        toast({ title: "Erreur", description: message, variant: "destructive" });
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <DashboardNavbar
        title="Espace PRM"
        onOpenProfile={() => {
          setAccountTab("profile");
          setIsAccountOpen(true);
        }}
        onOpenSettings={() => {
          setAccountTab("settings");
          setIsAccountOpen(true);
        }}
        onLogout={handleLogout}
      />
      <div className="flex min-h-0 w-full flex-1 pt-16">
      
      {/* SIDEBAR */}
      <aside className="fixed bottom-0 left-0 top-16 z-30 flex w-64 flex-col border-r border-slate-200 bg-white shadow-sm">
        {/* Résumé profil (comme maquette) */}
        <div className="px-4 pt-6 pb-5 border-b border-slate-100 shrink-0">
          <div className="flex flex-col items-center text-center">
            <div
              className="h-14 w-14 rounded-full bg-primary/12 flex items-center justify-center text-lg font-semibold text-primary mb-3 ring-2 ring-primary/15"
              aria-hidden
            >
              {user?.name?.trim()?.charAt(0)?.toLocaleUpperCase("fr") ?? "?"}
            </div>
            <p className="font-semibold text-slate-800 text-sm leading-tight">{user?.name ?? "—"}</p>
            <p className="text-xs text-slate-500 mt-1.5 px-1 break-all leading-snug">{user?.email ?? ""}</p>
            <Badge
              variant="outline"
              className="mt-3 text-xs font-medium border-primary/35 text-primary bg-white hover:bg-primary/5"
            >
              {roleDisplayLabel(user?.role?.name)}
            </Badge>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          <Button
            variant={activeTab === "overview" ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === "overview" ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "text-slate-600 hover:bg-slate-100"}`}
            onClick={() => setActiveTab("overview")}
          >
            <LayoutDashboard className="w-4 h-4 mr-3" />
            Vue d'ensemble
          </Button>

          <Button
            variant={activeTab === "appels-offres" ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === "appels-offres" ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "text-slate-600 hover:bg-slate-100"}`}
            onClick={() => setActiveTab("appels-offres")}
          >
            <Briefcase className="w-4 h-4 mr-3" />
            Mes Appels d'Offres
          </Button>

          <Button
            variant={activeTab === "fournisseurs" ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === "fournisseurs" ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "text-slate-600 hover:bg-slate-100"}`}
            onClick={() => setActiveTab("fournisseurs")}
          >
            <Users className="w-4 h-4 mr-3" />
            Fournisseurs
          </Button>

          <Button
            variant={activeTab === "statistiques" ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === "statistiques" ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "text-slate-600 hover:bg-slate-100"}`}
            onClick={() => setActiveTab("statistiques")}
          >
            <BarChart3 className="w-4 h-4 mr-3" />
            Statistiques
          </Button>
        </nav>

        {/* PIED DE PAGE */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-400 text-center">
            Utilisez le menu en haut à droite pour votre profil et la déconnexion.
          </p>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <main className="ml-64 min-h-0 flex-1 overflow-y-auto">
        <div className="p-8">
        
        {/* En-tête de section dynamique */}
        <div className="flex justify-between items-center mb-8">
           <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {activeTab === 'overview' && "Vue d'ensemble"}
                {activeTab === 'appels-offres' && "Gestion des Appels d'Offres"}
                {activeTab === 'fournisseurs' && "Annuaire des Fournisseurs"}
                {activeTab === 'statistiques' && "Tableau de Bord Statistiques"}
              </h1>
              <p className="text-slate-500 mt-1">
                {activeTab === 'overview' && "Un aperçu rapide de vos activités et actions prioritaires."}
                {activeTab === 'appels-offres' && "Créez, publiez et gérez vos appels d'offres."}
                {activeTab === 'fournisseurs' && "Consultez les dossiers légaux des fournisseurs lors du dépôt des plis au siège."}
                {activeTab === 'statistiques' && "Analysez les performances de vos marchés."}
              </p>
           </div>
           
           {/* Actions contextuelles */}
           <div className="flex gap-2">
              {activeTab === 'appels-offres' && (
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Nouveau Appel d'Offre
                  </Button>
              )}
           </div>
        </div>

        {/* TAB: VUE D'ENSEMBLE */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card
                className="group relative overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow bg-white cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => {
                  setFilterStatut("tous");
                  setActiveTab("appels-offres");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setFilterStatut("tous");
                    setActiveTab("appels-offres");
                  }
                }}
                title="Voir tous mes appels d'offres"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <div className="absolute -top-20 -left-24 h-40 w-80 rotate-[25deg] bg-gradient-to-r from-transparent via-white/45 to-transparent" />
                  <div className="absolute -bottom-24 -right-32 h-44 w-96 rotate-[25deg] bg-gradient-to-r from-transparent via-slate-100/60 to-transparent" />
                </div>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Appels d'offres</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{overviewStats.total}</p>
                      <p className="text-xs text-slate-400 mt-1">Total géré</p>
                    </div>
                    <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                      <Briefcase className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="group relative overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow bg-white cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => {
                  setFilterStatut("draft");
                  setActiveTab("appels-offres");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setFilterStatut("draft");
                    setActiveTab("appels-offres");
                  }
                }}
                title="Voir les appels d'offres en brouillon"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <div className="absolute -top-20 -left-24 h-40 w-80 rotate-[25deg] bg-gradient-to-r from-transparent via-white/45 to-transparent" />
                  <div className="absolute -bottom-24 -right-32 h-44 w-96 rotate-[25deg] bg-gradient-to-r from-transparent via-amber-50/80 to-transparent" />
                </div>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Brouillons</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{overviewStats.draft}</p>
                      <p className="text-xs text-slate-400 mt-1">À finaliser</p>
                    </div>
                    <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
                      <FileText className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="group relative overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow bg-white cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => {
                  setFilterStatut("published");
                  setActiveTab("appels-offres");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setFilterStatut("published");
                    setActiveTab("appels-offres");
                  }
                }}
                title="Voir les appels d'offres publiés"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <div className="absolute -top-20 -left-24 h-40 w-80 rotate-[25deg] bg-gradient-to-r from-transparent via-white/45 to-transparent" />
                  <div className="absolute -bottom-24 -right-32 h-44 w-96 rotate-[25deg] bg-gradient-to-r from-transparent via-emerald-50/90 to-transparent" />
                </div>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Publiés</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{overviewStats.published}</p>
                      <p className="text-xs text-slate-400 mt-1">En cours</p>
                    </div>
                    <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
                      <Megaphone className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="group relative overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow bg-white cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => {
                  setFilterStatut("closed");
                  setActiveTab("appels-offres");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setFilterStatut("closed");
                    setActiveTab("appels-offres");
                  }
                }}
                title="Voir les appels d'offres clôturés"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <div className="absolute -top-20 -left-24 h-40 w-80 rotate-[25deg] bg-gradient-to-r from-transparent via-white/45 to-transparent" />
                  <div className="absolute -bottom-24 -right-32 h-44 w-96 rotate-[25deg] bg-gradient-to-r from-transparent via-slate-100/70 to-transparent" />
                </div>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Clôturés</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{overviewStats.closed}</p>
                      <p className="text-xs text-slate-400 mt-1">Terminés</p>
                    </div>
                    <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                      <Archive className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-800">Actions rapides</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button onClick={() => setIsCreateOpen(true)} className="justify-start">
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Créer un appel d'offres
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab("appels-offres")} className="justify-start">
                      <Briefcase className="w-4 h-4 mr-2" />
                      Gérer mes appels d'offres
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab("statistiques")} className="justify-start">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Voir les statistiques
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsAccountOpen(true)}
                      className="justify-start"
                      title="Ouvrir mon profil et mes paramètres"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Mon profil / Paramètres
                    </Button>
                  </div>
                  {overviewStats.draft > 0 && (
                    <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                          <AlertCircle className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-amber-900">À finaliser</p>
                          <p className="text-sm text-amber-900/90 mt-1">
                            Vous avez <strong>{overviewStats.draft}</strong> appel(s) d&apos;offres en brouillon.
                            Ajoutez l&apos;avis d&apos;appel d&apos;offres et le cahier des charges avant publication.
                          </p>
                          <div className="mt-3">
                            <Button size="sm" variant="outline" className="border-amber-200 bg-white hover:bg-white" onClick={() => setActiveTab("appels-offres")}>
                              Voir les brouillons
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-800">Derniers appels d'offres</h3>
                    <Button variant="link" className="px-0" onClick={() => setActiveTab("appels-offres")}>
                      Tout voir
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {Array.isArray(appelsOffres) && appelsOffres.slice(0, 5).map((ao) => (
                      <div key={ao.id} className="group flex items-center justify-between gap-3 p-3 border rounded-lg bg-white hover:bg-slate-50/60 transition-colors">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800 truncate group-hover:text-slate-900">{ao.titre}</div>
                          <div className="text-xs text-slate-500 truncate mt-0.5 font-mono">{ao.reference}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {getStatutBadge(ao.statut)}
                          <Button size="sm" variant="outline" className="h-8" onClick={() => navigate(`/appels-offres/${ao.id}`)}>
                            <FileText className="w-3 h-3 mr-1" />
                            Fiche
                          </Button>
                        </div>
                      </div>
                    ))}
                    {Array.isArray(appelsOffres) && appelsOffres.length === 0 && (
                      <div className="rounded-lg border border-dashed bg-white p-6 text-center">
                        <div className="mx-auto h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                          <Briefcase className="h-5 w-5" />
                        </div>
                        <p className="mt-3 text-sm font-medium text-slate-800">Aucun appel d'offres pour le moment</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Créez votre premier appel d&apos;offres pour commencer.
                        </p>
                        <div className="mt-4 flex justify-center">
                          <Button onClick={() => setIsCreateOpen(true)}>
                            <PlusCircle className="w-4 h-4 mr-2" />
                            Créer un appel d'offres
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* TAB: MES APPELS D'OFFRES */}
        {activeTab === "appels-offres" && (
            <div className="animate-in fade-in duration-500 space-y-4">
                {/* Barre d'outils */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                            <Input
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 bg-white"
                            />
                        </div>
                        <Select value={filterStatut} onValueChange={setFilterStatut}>
                            <SelectTrigger className="w-[140px] bg-white">
                                <SelectValue placeholder="Statut" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="tous">Tous statuts</SelectItem>
                                <SelectItem value="draft">Brouillon</SelectItem>
                                <SelectItem value="published">Publié</SelectItem>
                                <SelectItem value="closed">Clôturé</SelectItem>
                            </SelectContent>
                        </Select>
                        <AdvancedSearch 
                            onSearch={handleAdvancedSearch}
                            configs={[
                                { key: 'date_debut', label: 'Publié après le', type: 'date' },
                                { key: 'date_fin', label: 'Publié avant le', type: 'date' }
                            ]}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleExportData('excel')}>
                            <Download className="mr-2 h-4 w-4" /> Excel
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleExportData('pdf')}>
                            <Download className="mr-2 h-4 w-4" /> PDF
                        </Button>
                    </div>
                </div>

                <Card className="border-none shadow-sm">
                    <CardContent className="p-0">
                        <div className={`rounded-lg border border-slate-100 overflow-hidden bg-white ${isRefreshing || loadingAppelsOffres ? 'opacity-60 pointer-events-none transition-opacity' : ''}`}>
                            <Table>
                              <TableHeader className="bg-slate-50">
                                <TableRow>
                                  <TableHead className="font-semibold">Référence</TableHead>
                                  <TableHead className="font-semibold">Titre</TableHead>
                                  <TableHead className="font-semibold">Date Limite</TableHead>
                                  <TableHead className="font-semibold">Statut</TableHead>
                                  {/* Dépôt en présentiel : pas de colonne candidatures */}
                                  <TableHead className="text-right font-semibold">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {Array.isArray(appelsOffres) && appelsOffres.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <Briefcase className="w-8 h-8 text-slate-300" />
                                                <p>Aucun appel d'offres créé pour le moment.</p>
                                                <Button variant="link" onClick={() => setIsCreateOpen(true)} className="text-primary">
                                                    Créer votre premier appel d'offres
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : Array.isArray(appelsOffres) && appelsOffres.map((ao) => (
                                  <TableRow key={ao.id} className="hover:bg-slate-50/50">
                                    <TableCell className="font-mono text-xs font-medium text-slate-600">{ao.reference}</TableCell>
                                    <TableCell className="font-medium text-slate-800">{ao.titre}</TableCell>
                                    <TableCell className="text-slate-600">{new Date(ao.date_limite_depot).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                      <div className="flex flex-col gap-1 items-start">
                                        {getStatutBadge(ao.statut)}
                                        {ao.statut === "draft" &&
                                          (ao.pieces_ao_manquantes?.length ?? 0) > 0 && (
                                            <Badge
                                              variant="outline"
                                              className="text-amber-700 border-amber-300 bg-amber-50 text-[10px]"
                                            >
                                              Pièces manquantes
                                            </Badge>
                                          )}
                                      </div>
                                    </TableCell>
                                    {/* Dépôt en présentiel : pas de colonne candidatures */}
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8"
                                          onClick={() => navigate(`/appels-offres/${ao.id}`)}
                                          title="Ouvrir la fiche (documents & infos)"
                                        >
                                          <FileText className="w-3 h-3 mr-1" /> Fiche
                                        </Button>
                                        {(ao.statut === "draft" || ao.statut === "published") && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8"
                                            onClick={() => openEditModalites(ao)}
                                            title="Modalités de dépôt des plis (présentiel)"
                                          >
                                            <MapPin className="w-3 h-3 mr-1" /> Modalités
                                          </Button>
                                        )}
                                        {ao.statut === "draft" && (
                                          <Button
                                            size="sm"
                                            className="h-8 bg-blue-600 hover:bg-blue-700"
                                            disabled={(ao.pieces_ao_manquantes?.length ?? 0) > 0}
                                            onClick={() => handlePublish(ao.id, ao.titre)}
                                            title={
                                              (ao.pieces_ao_manquantes?.length ?? 0) > 0
                                                ? `Ajoutez : ${(ao.pieces_ao_manquantes ?? [])
                                                    .map((c) => AO_PIECE_LABELS[c] ?? c)
                                                    .join(", ")}`
                                                : "Publier"
                                            }
                                          >
                                            <Megaphone className="w-3 h-3 mr-1" /> Publier
                                          </Button>
                                        )}
                                        {ao.statut === 'published' && (
                                            <Button size="sm" variant="secondary" className="h-8 border border-slate-200" onClick={() => handleClose(ao.id, ao.titre)} title="Clôturer">
                                                <Archive className="w-3 h-3 mr-1" /> Clôturer
                                            </Button>
                                        )}
                                        {ao.statut === "closed" && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 border-green-200 text-green-800 hover:bg-green-50"
                                            onClick={() => handleReopen(ao)}
                                            title="Réouvrir l'appel d'offres"
                                          >
                                            <RotateCcw className="w-3 h-3 mr-1" /> Réouvrir
                                          </Button>
                                        )}
                                        {/* Dépôt en présentiel : pas de candidatures en ligne */}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                        </div>
                        <div className="mt-4">
                            <DataTablePagination
                                currentPage={pagination.currentPage}
                                totalPages={pagination.totalPages}
                                totalItems={pagination.totalItems}
                                perPage={pagination.perPage}
                                onPageChange={handlePageChange}
                                onPerPageChange={handlePerPageChange}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}

        {/* TAB: FOURNISSEURS (annuaire light pour contrôle des dossiers au siège) */}
        {activeTab === "fournisseurs" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="border-none shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">
                      Fournisseurs validés
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Consultez le dossier d&apos;un fournisseur (pièces légales) lorsqu&apos;il se présente au siège pour le dépôt des plis.
                    </p>
                  </div>
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par raison sociale, NINEA, email…"
                      className="pl-10 bg-slate-50 border-slate-200"
                      value={directorySearch}
                      onChange={(e) => setDirectorySearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-slate-100 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-semibold">Raison sociale</TableHead>
                        <TableHead className="font-semibold">NINEA</TableHead>
                        <TableHead className="font-semibold">Contact</TableHead>
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingDirectory ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            Chargement…
                          </TableCell>
                        </TableRow>
                      ) : directoryFournisseurs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            Aucun fournisseur trouvé.
                          </TableCell>
                        </TableRow>
                      ) : (
                        directoryFournisseurs.map((f) => (
                          <TableRow key={f.id} className="hover:bg-slate-50/50">
                            <TableCell className="font-medium text-slate-800">
                              {f.raison_sociale}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-slate-500">
                              {f.ninea || "—"}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="font-medium break-all">{f.email || "—"}</div>
                                <div className="text-muted-foreground text-xs">
                                  {f.telephone || ""}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDirectoryFournisseur(f)}
                              >
                                <FileText className="w-3.5 h-3.5 mr-1.5" /> Voir le dossier
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <DataTablePagination
                  currentPage={directoryPagination.currentPage}
                  totalPages={directoryPagination.totalPages}
                  totalItems={directoryPagination.totalItems}
                  perPage={directoryPagination.perPage}
                  onPageChange={(page) => loadDirectoryFournisseurs(page)}
                  onPerPageChange={(perPage) => {
                    setDirectoryPagination((prev) => ({ ...prev, perPage }));
                    void loadDirectoryFournisseurs(1);
                  }}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB: STATISTIQUES */}
        {activeTab === "statistiques" && (
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Statistiques Avancées (Inclut désormais les cartes globales) */}
                <ResponsableAdvancedStats />

                {/* Liste des derniers AO pour stats rapides */}
                <Card className="border-none shadow-sm mt-6">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Aperçu rapide</h3>
                        <div className="space-y-4">
                             {Array.isArray(appelsOffres) && appelsOffres.slice(0, 3).map(ao => (
                                 <div key={ao.id} className="flex items-center justify-between p-4 border rounded-lg">
                                     <div>
                                         <p className="font-medium">{ao.titre}</p>
                                         <p className="text-xs text-muted-foreground">{ao.reference}</p>
                                     </div>
                                     <div className="flex gap-4 text-sm text-muted-foreground">
                                         {/* Dépôt en présentiel : pas de candidatures */}
                                         <span className="flex items-center gap-1">{getStatutBadge(ao.statut)}</span>
                                     </div>
                                 </div>
                             ))}
                             {Array.isArray(appelsOffres) && appelsOffres.length === 0 && <p className="text-muted-foreground">Aucune donnée à afficher.</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}

        </div>
      </main>
      </div>

      {/* Modale Création */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:w-full sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Créer un Appel d'Offre</DialogTitle>
                <DialogDescription className="text-sm">
                  Créez le brouillon et joignez tout de suite l&apos;avis d&apos;appel d&apos;offres et le cahier des charges (requis avant publication).
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTender} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Référence de l'appel d'offres</Label>
                  <Input
                    value={newTender.reference}
                    onChange={(e) => setNewTender({ ...newTender, reference: e.target.value })}
                    required
                    placeholder="Ex: DDD-AO-2026-001"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Référence unique saisie manuellement (vous ou l&apos;administrateur).
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Source de financement</Label>
                    <Select
                      value={newTender.source_financement}
                      onValueChange={(v) =>
                        setNewTender({ ...newTender, source_financement: v as SourceFinancement })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCE_FINANCEMENT_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Type de marché</Label>
                    <Select
                      value={newTender.type_marche || undefined}
                      onValueChange={(v) =>
                        setNewTender({ ...newTender, type_marche: v as TypeMarche })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir..." />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPE_MARCHE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Mode de passation</Label>
                  <Input
                    value={newTender.mode_passation}
                    onChange={(e) => setNewTender({ ...newTender, mode_passation: e.target.value })}
                    required
                    placeholder="Ex: Appel d'offres ouvert, Demande de renseignements et de prix..."
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Titre de l'appel d'offres</Label>
                        <Input 
                            value={newTender.titre} 
                            onChange={e => setNewTender({...newTender, titre: e.target.value})} 
                            required 
                            placeholder="Ex: Acquisition..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Date et heure limite de dépôt</Label>
                        <Input 
                            type="datetime-local" 
                            value={newTender.date_limite_depot} 
                            onChange={e => setNewTender({...newTender, date_limite_depot: e.target.value})} 
                            required 
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Description détaillée</Label>
                    <Textarea 
                        value={newTender.description} 
                        onChange={e => setNewTender({...newTender, description: e.target.value})} 
                        required 
                        placeholder="Détails du besoin, contexte..."
                        className="min-h-[100px]"
                    />
                </div>
                <div className="space-y-2">
                  <Label>Modalités de dépôt des plis (soumission physique)</Label>
                  <Textarea
                    value={newTender.modalites_soumission_physique}
                    onChange={(e) => setNewTender({ ...newTender, modalites_soumission_physique: e.target.value })}
                    placeholder="Adresse du guichet, horaires, salle de dépôt, téléphone du service des marchés…"
                    className="min-h-[88px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Obligatoire avant publication : elles s’affichent sur la fiche publique. Sans texte, un message neutre apparaît côté portail.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label className="text-sm font-medium">Cahier des charges payant</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        L&apos;avis d&apos;appel d&apos;offres reste gratuit. Indiquez un montant si le cahier des charges n&apos;est accessible qu&apos;après paiement (Wave / Orange Money).
                      </p>
                    </div>
                    <Switch
                      checked={newTender.cahier_paiement_requis}
                      onCheckedChange={(v) =>
                        setNewTender((prev) => ({
                          ...prev,
                          cahier_paiement_requis: v,
                          cahier_prix_xof: v ? prev.cahier_prix_xof : "",
                        }))
                      }
                    />
                  </div>
                  {newTender.cahier_paiement_requis && (
                    <div className="space-y-2">
                      <Label htmlFor="prm_cahier_prix_xof">Montant (FCFA)</Label>
                      <Input
                        id="prm_cahier_prix_xof"
                        type="number"
                        min={1}
                        step={1}
                        value={newTender.cahier_prix_xof}
                        onChange={(e) => setNewTender({ ...newTender, cahier_prix_xof: e.target.value })}
                        placeholder="Ex: 25000"
                        required
                      />
                    </div>
                  )}
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                  <div className="space-y-2">
                    <Label>Avis d&apos;appel d&apos;offres (PDF)</Label>
                    <Input
                      type="file"
                      accept=".pdf"
                      required
                      onChange={(e) => setAvisAoFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cahier des charges</Label>
                    <Input
                      type="file"
                      accept=".pdf,.zip,.doc,.docx,.xls,.xlsx"
                      required
                      onChange={(e) => setCahierChargesFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Le cahier peut être un PDF ou un dossier compressé (selon les pièces fournies).
                    </p>
                  </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={creatingTender}>
                      Annuler
                    </Button>
                    <Button type="submit" disabled={creatingTender}>
                      {creatingTender ? "Création..." : "Créer le brouillon"}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

      {/* Modale Dossier Fournisseur (annuaire) */}
      <Dialog
        open={isViewDirectoryFournisseurOpen}
        onOpenChange={(open) => {
          setIsViewDirectoryFournisseurOpen(open);
          if (!open) {
            setSelectedDirectoryFournisseur(null);
            setDirectoryLegalDocs([]);
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] sm:w-full sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dossier du fournisseur</DialogTitle>
            <DialogDescription className="text-sm">
              Informations administratives et pièces légales déposées en ligne par le fournisseur.
            </DialogDescription>
          </DialogHeader>
          {selectedDirectoryFournisseur && (
            <div className="space-y-5 py-2">
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                <h3 className="text-lg font-bold text-slate-800">
                  {selectedDirectoryFournisseur.raison_sociale}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2 text-sm text-slate-600">
                  {selectedDirectoryFournisseur.ninea && (
                    <p>
                      <span className="text-xs text-muted-foreground">NINEA : </span>
                      <span className="font-mono">{selectedDirectoryFournisseur.ninea}</span>
                    </p>
                  )}
                  {selectedDirectoryFournisseur.email && (
                    <p className="break-all">
                      <span className="text-xs text-muted-foreground">Email : </span>
                      {selectedDirectoryFournisseur.email}
                    </p>
                  )}
                  {selectedDirectoryFournisseur.telephone && (
                    <p>
                      <span className="text-xs text-muted-foreground">Téléphone : </span>
                      {selectedDirectoryFournisseur.telephone}
                    </p>
                  )}
                  {selectedDirectoryFournisseur.adresse && (
                    <p className="sm:col-span-2">
                      <span className="text-xs text-muted-foreground">Adresse : </span>
                      {selectedDirectoryFournisseur.adresse}
                    </p>
                  )}
                </div>
              </div>

              {selectedDirectoryFournisseur.references_professionnelles?.trim() && (
                <div className="rounded-lg border border-slate-100 bg-white p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Références professionnelles
                  </h4>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {selectedDirectoryFournisseur.references_professionnelles}
                  </p>
                </div>
              )}

              {/* Documents légaux */}
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm text-slate-800">
                    Documents légaux
                  </h4>
                  {loadingDirectoryLegalDocs && (
                    <span className="text-xs text-muted-foreground">Chargement…</span>
                  )}
                </div>

                {!loadingDirectoryLegalDocs && missingLegalCategories(directoryLegalDocs).length > 0 && (
                  <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <span className="font-semibold">Pièces obligatoires manquantes : </span>
                    {missingLegalCategories(directoryLegalDocs)
                      .map((c) => legalDocumentLabel(c))
                      .join(", ")}
                  </div>
                )}

                <div className="space-y-2">
                  {ALL_LEGAL_DOCUMENT_UPLOAD_CATEGORIES.map((categorie) => {
                    const docs = directoryLegalDocs.filter((d) => d.categorie === categorie);
                    return (
                      <div
                        key={categorie}
                        className="flex items-center justify-between gap-3 rounded-md border border-slate-100 px-3 py-2 text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">
                            {legalDocumentLabel(categorie)}
                          </p>
                          {docs.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">Non fourni</p>
                          ) : (
                            <p className="text-xs text-muted-foreground truncate">
                              {docs[0].nom_fichier}
                              {docs[0].created_at && (
                                <>
                                  {" "}
                                  · ajouté le{" "}
                                  {new Date(docs[0].created_at).toLocaleDateString("fr-FR")}
                                </>
                              )}
                            </p>
                          )}
                        </div>
                        {docs.length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openLegalDocument(docs[0])}
                            title="Ouvrir / télécharger"
                          >
                            <Download className="w-3.5 h-3.5 mr-1.5" /> Ouvrir
                          </Button>
                        )}
                      </div>
                    );
                  })}
                  {!loadingDirectoryLegalDocs && directoryLegalDocs.length === 0 && (
                    <p className="text-xs text-muted-foreground italic text-center py-2">
                      Aucun document légal déposé pour le moment.
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsViewDirectoryFournisseurOpen(false)}
                >
                  Fermer
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditModalitesOpen}
        onOpenChange={(open) => {
          setIsEditModalitesOpen(open);
          if (!open) setAoForModalites(null);
        }}
      >
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Modalités de dépôt des plis (présentiel)</DialogTitle>
            <DialogDescription>
              {aoForModalites && (
                <>
                  <span className="font-mono text-foreground">{aoForModalites.reference}</span> — {aoForModalites.titre}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="prm_modalites_depot">Lieu, horaires, contact du service des marchés</Label>
            <Textarea
              id="prm_modalites_depot"
              value={draftModalites}
              onChange={(e) => setDraftModalites(e.target.value)}
              className="min-h-[140px]"
              placeholder="Ex. : accueil du service des marchés, jours et heures, adresse, téléphone…"
            />
            {aoForModalites?.statut === "published" && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200/80 rounded-md px-2 py-1.5">
                Cet appel d’offres est publié : le texte ne peut pas être vide (il reste affiché aux fournisseurs).
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditModalitesOpen(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={handleSaveModalites} disabled={savingModalites}>
              {savingModalites ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modale Candidatures (désactivée en mode dépôt présentiel) */}
      {afficherCandidatures && (
      <Dialog open={isViewCandidatesOpen} onOpenChange={setIsViewCandidatesOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    Candidatures reçues
                    {selectedAppelOffre && (
                        <Badge variant="outline" className="font-normal text-muted-foreground">
                            {selectedAppelOffre.reference}
                        </Badge>
                    )}
                </DialogTitle>
            </DialogHeader>
            <div className="py-4">
                {Array.isArray(candidatures) && candidatures.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-muted-foreground">Aucune candidature reçue pour le moment.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {Array.isArray(candidatures) && candidatures.map(cand => (
                            <div key={cand.id} className="flex flex-col md:flex-row md:items-center justify-between border p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition-all">
                                <div className="space-y-1 mb-4 md:mb-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-lg text-slate-800">{cand.fournisseur.nom_entreprise}</h4>
                                        <Badge variant={cand.statut === 'accepted' ? 'default' : cand.statut === 'rejected' ? 'destructive' : 'secondary'}>
                                            {cand.statut === 'submitted' ? 'Soumise' : cand.statut === 'accepted' ? 'Acceptée' : cand.statut === 'rejected' ? 'Rejetée' : cand.statut}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-slate-600 flex items-center gap-2">
                                        <span className="font-medium">Contact:</span> {cand.fournisseur.email_contact}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        Soumis le {new Date(cand.date_soumission).toLocaleDateString()} à {new Date(cand.date_soumission).toLocaleTimeString()}
                                    </p>
                                    {cand.montant_propose && (
                                        <p className="text-sm font-medium text-primary">
                                            Offre: {cand.montant_propose.toLocaleString()} FCFA
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    {/* On ne montre les boutons que si le statut est en attente (submitted) */}
                                    {cand.statut === 'submitted' && (
                                        <>
                                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleEvaluateCandidature(cand.id, 'accept')}>
                                                <CheckCircle className="w-4 h-4 mr-1" /> Retenir
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleEvaluateCandidature(cand.id, 'reject')}>
                                                <XCircle className="w-4 h-4 mr-1" /> Rejeter
                                            </Button>
                                        </>
                                    )}
                                    <Button size="sm" variant="outline" onClick={() => handleViewDossier(cand)}>
                                        <Eye className="w-4 h-4 mr-1" /> Voir dossier
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewCandidatesOpen(false)}>Fermer</Button>
                <Button onClick={handleGenerateReport}>
                    <FileText className="w-4 h-4 mr-2" />
                    Générer PV d'Analyse
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      {/* Modale Voir Dossier */}
      <Dialog open={isViewDossierOpen} onOpenChange={(open) => {
        setIsViewDossierOpen(open);
        if (!open) {
          setSelectedCandidature(null);
          setLegalDocuments([]);
          setCandidatureDocuments([]);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dossier de candidature</DialogTitle>
            <DialogDescription className="sr-only">
              Détails du dossier fournisseur et des pièces associées.
            </DialogDescription>
          </DialogHeader>
          
          {loadingDocuments ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="text-sm text-muted-foreground">Chargement du dossier...</p>
              </div>
            </div>
          ) : selectedCandidature ? (
            <div className="py-4 space-y-6">
              {/* Informations du fournisseur */}
              <Card className="border-none shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    Informations du fournisseur
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Nom de l'entreprise</p>
                        <p className="font-medium text-slate-800">{selectedCandidature.fournisseur.nom_entreprise}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Email de contact</p>
                        <p className="font-medium text-slate-800">{selectedCandidature.fournisseur.email_contact}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 rounded-lg border bg-slate-50/80 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                        <Award className="w-5 h-5 text-amber-700" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-800">Références professionnelles</h4>
                        <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                          Déclaratif — clients ou marchés antérieurs indiqués par le fournisseur.
                        </p>
                        {selectedCandidature.fournisseur.references_professionnelles?.trim() ? (
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {selectedCandidature.fournisseur.references_professionnelles}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Non renseigné</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Montant proposé */}
              {selectedCandidature.montant_propose && (
                <Card className="border-none shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Montant des offres</h3>
                    <p className="text-2xl font-bold text-primary">
                      {selectedCandidature.montant_propose.toLocaleString()} FCFA
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Soumis le {new Date(selectedCandidature.date_soumission).toLocaleDateString()} à {new Date(selectedCandidature.date_soumission).toLocaleTimeString()}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Documents légaux */}
              <Card className="border-none shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Documents légaux
                  </h3>
                  
                  {loadingDocuments ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                        <p className="text-sm text-muted-foreground">Chargement des documents...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ALL_LEGAL_DOCUMENT_UPLOAD_CATEGORIES.map((categorie) => {
                        const docs = legalDocuments.filter(d => d.categorie === categorie);
                        const categorieLabel = legalDocumentLabel(categorie);
                        const isAutre = categorie === "AUTRE";
                        
                        return (
                          <div key={categorie} className="border rounded-lg p-4 bg-white">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-slate-700">{categorieLabel}</h4>
                              {docs.length > 0 ? (
                                <Badge className="bg-green-100 text-green-700 border-none">
                                  {docs.length} document{docs.length > 1 ? 's' : ''}
                                </Badge>
                              ) : isAutre ? (
                                <Badge variant="outline" className="text-slate-500 border-slate-200">
                                  Facultatif — non fourni
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-200">
                                  Manquant
                                </Badge>
                              )}
                            </div>
                            {docs.length > 0 && (
                              <div className="space-y-2 mt-3">
                                {docs.map((doc) => (
                                  <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-3">
                                      <div className="bg-white p-2 rounded border border-slate-200">
                                        <FileText className="w-4 h-4 text-blue-600" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-slate-800">{doc.nom_fichier}</p>
                                        <p className="text-xs text-muted-foreground">
                                          Ajouté le {new Date(doc.created_at).toLocaleDateString()}
                                        </p>
                                      </div>
                                    </div>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      onClick={async () => {
                                        if (!api) return;
                                        
                                        try {
                                          // Récupérer le document via l'API avec authentification
                                          const response = await api.get(`/api/documents/${doc.id}/download`, {
                                            responseType: 'blob'
                                          });
                                          
                                          const blob = new Blob([response.data]);
                                          const contentType = response.headers['content-type'] || doc.type_fichier || 'application/pdf';
                                          
                                          // Pour les PDFs et images, ouvrir dans un nouvel onglet
                                          if (contentType.includes('pdf') || contentType.includes('image')) {
                                            const url = window.URL.createObjectURL(blob);
                                            window.open(url, '_blank', 'noopener,noreferrer');
                                            // Nettoyer l'URL après un délai
                                            setTimeout(() => window.URL.revokeObjectURL(url), 100);
                                          } else {
                                            // Pour les autres types, télécharger
                                            const url = window.URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.target = '_blank';
                                            link.rel = 'noopener noreferrer';
                                            
                                            const extension = contentType.includes('word') ? '.docx'
                                              : contentType.includes('excel') ? '.xlsx'
                                              : '.pdf';
                                            
                                            link.download = doc.nom_fichier || `document${extension}`;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            window.URL.revokeObjectURL(url);
                                          }
                                        } catch (error: unknown) {
                                          console.error("Erreur ouverture document:", error);
                                          toast({
                                            title: "Erreur",
                                            description: getErrorMessage(error, "Impossible d'ouvrir le document."),
                                            variant: "destructive"
                                          });
                                        }
                                      }}
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      Voir
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Documents de candidature (Offre technique et financière) */}
              <Card className="border-none shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Documents de la candidature
                  </h3>
                  
                  {candidatureDocuments.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg bg-slate-50">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-muted-foreground">Aucun document de candidature disponible.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {['OFFRE_TECHNIQUE', 'OFFRE_FINANCIERE'].map((categorie) => {
                        const docs = candidatureDocuments.filter(d => d.categorie === categorie);
                        const categorieLabel = categorie === 'OFFRE_TECHNIQUE' ? 'Offre technique' : 'Offre financière';
                        
                        return (
                          <div key={categorie} className="border rounded-lg p-4 bg-white">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-slate-700">{categorieLabel}</h4>
                              {docs.length > 0 ? (
                                <Badge className="bg-green-100 text-green-700 border-none">
                                  {docs.length} document{docs.length > 1 ? 's' : ''}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-200">
                                  Manquant
                                </Badge>
                              )}
                            </div>
                            {docs.length > 0 && (
                              <div className="space-y-2 mt-3">
                                {docs.map((doc) => (
                                  <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-3">
                                      <div className="bg-white p-2 rounded border border-slate-200">
                                        <FileText className="w-4 h-4 text-blue-600" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-slate-800">{doc.nom_fichier}</p>
                                        <p className="text-xs text-muted-foreground">
                                          Ajouté le {new Date(doc.created_at).toLocaleDateString()}
                                        </p>
                                      </div>
                                    </div>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      onClick={async () => {
                                        if (!api) return;
                                        
                                        try {
                                          // Récupérer le document via l'API avec authentification
                                          const response = await api.get(`/api/documents/${doc.id}/download`, {
                                            responseType: 'blob'
                                          });
                                          
                                          const blob = new Blob([response.data]);
                                          const contentType = response.headers['content-type'] || doc.type_fichier || 'application/pdf';
                                          
                                          // Pour les PDFs et images, ouvrir dans un nouvel onglet
                                          if (contentType.includes('pdf') || contentType.includes('image')) {
                                            const url = window.URL.createObjectURL(blob);
                                            window.open(url, '_blank', 'noopener,noreferrer');
                                            // Nettoyer l'URL après un délai
                                            setTimeout(() => window.URL.revokeObjectURL(url), 100);
                                          } else {
                                            // Pour les autres types, télécharger
                                            const url = window.URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.target = '_blank';
                                            link.rel = 'noopener noreferrer';
                                            
                                            const extension = contentType.includes('word') ? '.docx'
                                              : contentType.includes('excel') ? '.xlsx'
                                              : '.pdf';
                                            
                                            link.download = doc.nom_fichier || `document${extension}`;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            window.URL.revokeObjectURL(url);
                                          }
                                        } catch (error: unknown) {
                                          console.error("Erreur ouverture document:", error);
                                          toast({
                                            title: "Erreur",
                                            description: getErrorMessage(error, "Impossible d'ouvrir le document."),
                                            variant: "destructive"
                                          });
                                        }
                                      }}
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      Voir
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Avertissement si documents légaux manquants */}
              {missingLegalCategories(legalDocuments).length > 0 && (
                <Card className="border-none shadow-sm bg-orange-50 border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-orange-800 mb-1">Documents légaux incomplets</p>
                        <p className="text-xs text-orange-700">
                          Ce fournisseur n'a pas fourni tous les documents légaux obligatoires (RCCM, NINEA, quitus fiscal,
                          attestations IPRES, CSS, non-faillite, ARCOP). Il est recommandé de demander la complétion du dossier
                          avant de trancher.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Section Commentaires */}
              <Card className="border-none shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Commentaires et communication
                  </h3>
                  
                  {/* Liste des commentaires */}
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {loadingComments ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucun commentaire pour le moment.
                      </p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className={`p-3 rounded-lg border ${comment.user?.id === user?.id ? 'bg-primary/5 border-primary/20' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-700">
                                {comment.user?.name || 'Utilisateur'}
                              </span>
                              {comment.document && (
                                <Badge variant="outline" className="text-xs">
                                  Document: {comment.document.nom_fichier}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Formulaire d'ajout de commentaire */}
                  <div className="space-y-2 border-t pt-4">
                    <Label htmlFor="new-comment">Ajouter un commentaire</Label>
                    <Textarea
                      id="new-comment"
                      placeholder="Écrivez votre commentaire ici..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Le fournisseur sera notifié de votre commentaire
                      </div>
                      <Button 
                        onClick={handleSubmitComment}
                        disabled={!newComment.trim() || submittingComment}
                        size="sm"
                      >
                        {submittingComment ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                            Envoi...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Envoyer
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucune information disponible.</p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsViewDossierOpen(false);
              setComments([]);
              setNewComment("");
              setSelectedDocumentId(null);
            }}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mon compte : Profil / Paramètres */}
      <Dialog open={isAccountOpen} onOpenChange={(open) => {
        setIsAccountOpen(open);
        if (!open) {
          setPasswordData({ current: "", new: "", confirm: "" });
          setAccountTab("profile");
        }
      }}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{accountTab === "profile" ? "Mon profil" : "Paramètres"}</DialogTitle>
            <DialogDescription>
              {accountTab === "profile"
                ? "Consultez et mettez à jour vos informations professionnelles."
                : "Gérez les paramètres de sécurité de votre compte."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 border-b pb-2">
            <Button
              type="button"
              size="sm"
              variant={accountTab === "profile" ? "default" : "outline"}
              onClick={() => setAccountTab("profile")}
            >
              Mon profil
            </Button>
            <Button
              type="button"
              size="sm"
              variant={accountTab === "settings" ? "default" : "outline"}
              onClick={() => setAccountTab("settings")}
            >
              Paramètres
            </Button>
          </div>

          {accountTab === "profile" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
              <div className="md:col-span-1">
                <div className="bg-slate-50 border rounded-lg p-5">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="h-20 w-20 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-3xl">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{user?.name}</div>
                      <div className="text-sm text-slate-500">{user?.email}</div>
                    </div>
                    <Badge variant="outline" className="text-xs border-primary/20 text-primary bg-primary/5">
                      PRM
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Informations professionnelles</h3>
                <form onSubmit={handleProfileUpdate} className="grid gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Direction</Label>
                      <Input
                        value={profileForm.direction}
                        onChange={(e) => setProfileForm({ ...profileForm, direction: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Fonction</Label>
                      <Input
                        value={profileForm.fonction}
                        onChange={(e) => setProfileForm({ ...profileForm, fonction: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Téléphone</Label>
                    <Input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="77 123 45 67"
                      value={profileForm.telephone}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          telephone: sanitizePhoneInput(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit">Sauvegarder</Button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="py-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Sécurité</h3>
              <form onSubmit={handleUpdatePassword} className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Mot de passe actuel</Label>
                  <Input
                    type="password"
                    value={passwordData.current}
                    onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Nouveau mot de passe</Label>
                  <Input
                    type="password"
                    value={passwordData.new}
                    onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Confirmer le nouveau mot de passe</Label>
                  <Input
                    type="password"
                    value={passwordData.confirm}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="submit">Mettre à jour</Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ReopenAppelOffreDialog
        ao={reopenDialogAo}
        open={reopenDialogAo !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReopenDialogAo(null);
            setReopenForceDate(false);
          }
        }}
        onConfirm={submitReopen}
        submitting={reopenSubmitting}
        forceDateRequired={reopenForceDate}
      />
    </div>
  );
}