import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/DataTablePagination";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlusCircle,
  User,
  Edit,
  Trash2,
  FileText,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Eye,
  Search,
  BarChart3,
  Activity,
  AlertCircle,
  UserCheck,
  UserX,
  LayoutDashboard,
  Users,
  Briefcase,
  MessageSquare,
  Megaphone,
  Archive,
  Mail,
  Phone,
  MapPin,
  Send,
  Filter,
  Download,
  FileClock,
  Award,
  RotateCcw,
  Undo2,
  Shield,
} from "lucide-react";
import { motion } from "framer-motion";
import { API_BASE_URL } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import DashboardNavbar from "@/components/layout/DashboardNavbar";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import AuditHistory from "@/components/AuditHistory";
import AdvancedSearch, { FilterConfig } from "@/components/AdvancedSearch";
import AdvancedStats from "@/components/AdvancedStats";


// ============================================\n
// INTERFACES\n
// ============================================\n

interface DashboardStats {
  totalFournisseurs: number;
  fournisseursActifs: number;
  fournisseursEnAttente: number;
  fournisseursRejetes: number;
  totalAppelsOffres: number;
  appelsOffresActifs: number;
  appelsOffresClotures: number;
  appelsOffresBrouillon: number;
  totalCandidatures: number;
  candidaturesEnCours: number;
  candidaturesRetenues: number;
  candidaturesRejetees: number;
  totalResponsables: number;
  totalGestionnaires: number;
}

const EMPTY_DASHBOARD_STATS: DashboardStats = {
  totalFournisseurs: 0,
  fournisseursActifs: 0,
  fournisseursEnAttente: 0,
  fournisseursRejetes: 0,
  totalAppelsOffres: 0,
  appelsOffresActifs: 0,
  appelsOffresClotures: 0,
  appelsOffresBrouillon: 0,
  totalCandidatures: 0,
  candidaturesEnCours: 0,
  candidaturesRetenues: 0,
  candidaturesRejetees: 0,
  totalResponsables: 0,
  totalGestionnaires: 0,
};

function parseDashboardStats(payload: unknown): DashboardStats | null {
  if (!payload || typeof payload !== "object") return null;
  const d = payload as Record<string, unknown>;
  if (d.totalFournisseurs === undefined && d.totalAppelsOffres === undefined) return null;
  const num = (key: keyof DashboardStats) => Number(d[key] ?? 0);
  return {
    totalFournisseurs: num("totalFournisseurs"),
    fournisseursActifs: num("fournisseursActifs"),
    fournisseursEnAttente: num("fournisseursEnAttente"),
    fournisseursRejetes: num("fournisseursRejetes"),
    totalAppelsOffres: num("totalAppelsOffres"),
    appelsOffresActifs: num("appelsOffresActifs"),
    appelsOffresClotures: num("appelsOffresClotures"),
    appelsOffresBrouillon: num("appelsOffresBrouillon"),
    totalCandidatures: num("totalCandidatures"),
    candidaturesEnCours: num("candidaturesEnCours"),
    candidaturesRetenues: num("candidaturesRetenues"),
    candidaturesRejetees: num("candidaturesRejetees"),
    totalResponsables: num("totalResponsables"),
    totalGestionnaires: num("totalGestionnaires"),
  };
}

interface AppelOffre {
  id: number;
  titre: string;
  reference: string;
  statut: "draft" | "published" | "closed" | "archived";
  description?: string | null;
  modalites_soumission_physique?: string | null;
  source_financement?: string | null;
  source_financement_label?: string | null;
  mode_passation?: string | null;
  type_marche?: string | null;
  type_marche_label?: string | null;
  cahier_paiement_requis?: boolean;
  cahier_prix_xof?: number | null;
  date_publication: string;
  date_cloture: string;
  date_limite_depot?: string;
  nombre_candidatures: number;
  attribution_statut?: string | null;
  attributaire_nom?: string | null;
  attribution_montant_xof?: number | null;
  attribution_date?: string | null;
  responsable_marche_id?: number | null;
  responsable: {
    name: string;
    email?: string | null;
    fonction?: string | null;
    direction?: string | null;
  } | null;
}

interface Fournisseur {
  id: number;
  raison_sociale: string;
  ninea: string;
  rccm?: string | null;
  email: string;
  telephone: string;
  statut: "actif" | "en_attente" | "rejete";
  date_inscription: string;
  nombre_candidatures: number;
  domaines_activite?: string[];
  references_professionnelles?: string | null;
  documents_legaux_count?: number;
  pieces_obligatoires_presentes?: string[];
  pieces_obligatoires_manquantes?: string[];
  dossier_complet?: boolean;
  compte_actif?: boolean;
}

interface ContactMessage {
  id: number;
  nom: string | null;
  email: string;
  sujet: string;
  message: string;
  statut: "nouveau" | "lu" | "archive";
  created_at: string;
  user?: {
    name: string;
    email: string;
  };
}

interface ResponsableMarche {
  id: number;
  user_id: number;
  direction: string;
  fonction: string;
  telephone: string;
  user?: {
    name: string;
    email: string;
  };
  nombre_appels_offres?: number;
}

interface GestionnaireUser {
  id: number;
  name: string;
  email: string;
  is_active?: boolean;
  created_at?: string;
}

interface RecentActivity {
  id: number;
  action: string;
  details: string;
  user: string;
  date: string;
}

interface Suggestion {
  id: number;
  sujet: string;
  message: string;
  statut: 'pending' | 'read' | 'implemented' | 'rejected';
  created_at: string;
  user: {
    name: string;
    email: string;
    fournisseur?: {
        nom_entreprise: string;
    }
  };
}

interface AppelOffreAdmin {
  id: number;
  reference: string;
  source_financement?: string;
  source_financement_label?: string;
  titre: string;
  description: string;
  modalites_soumission_physique?: string | null;
  date_limite_depot: string;
  statut: 'draft' | 'published' | 'closed' | 'archived';
  candidatures_count?: number;
  responsable_marche_id?: number | null;
  responsable?: {
    name: string;
  } | null;
  date_publication?: string;
  date_cloture?: string;
  cahier_paiement_requis?: boolean;
  cahier_prix_xof?: number | null;
  pieces_ao_manquantes?: string[];
  pieces_ao_completes?: boolean;
}

interface CandidatureAdmin {
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
  appel_offre?: {
    id: number;
    titre: string;
    numero_reference: string;
    date_limite: string;
    statut: string;
  };
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

interface EditingResponsable {
  id: number;
  name: string;
  email: string;
  direction: string;
  fonction: string;
  telephone: string;
  password: string;
  password_confirmation: string;
}

interface CommentItem {
  id: number;
  message: string;
  created_at: string;
  user?: {
    id: number;
    name: string;
  };
  document?: {
    nom_fichier: string;
  };
}

type DashboardFilterValue = string | number | boolean;

  // ============================================
  // COMPOSANT PRINCIPAL
  // ============================================

const AdminDashboard: React.FC = () => {
  // Dépôt en présentiel : ne pas exposer le module "candidatures" sur le dashboard admin.
  const afficherCandidatures = false;
  const [isCreateResponsableOpen, setIsCreateResponsableOpen] = useState(false);
  const [isCreateGestionnaireOpen, setIsCreateGestionnaireOpen] = useState(false);
  const [isEditGestionnaireOpen, setIsEditGestionnaireOpen] = useState(false);
  const [editingGestionnaire, setEditingGestionnaire] = useState<GestionnaireUser | null>(null);
  const [isEditResponsableOpen, setIsEditResponsableOpen] = useState(false);
  const [editingResponsable, setEditingResponsable] = useState<EditingResponsable | null>(null);
  const [isViewFournisseurOpen, setIsViewFournisseurOpen] = useState(false);
  const [selectedFournisseur, setSelectedFournisseur] = useState<Fournisseur | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAccountProfileOpen, setIsAccountProfileOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });
  const [newResponsable, setNewResponsable] = useState({
    name: "",
    email: "",
    password: "",
    direction: "",
    fonction: "",
    telephone: "",
  });
  const [newGestionnaire, setNewGestionnaire] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [editGestionnaireForm, setEditGestionnaireForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  const [selectedAppelOffre, setSelectedAppelOffre] = useState<AppelOffre | null>(null);
  const [isViewAppelOffreOpen, setIsViewAppelOffreOpen] = useState(false);
  
  // États pour la gestion des appels d'offres (comme responsable)
  const [mesAppelsOffres, setMesAppelsOffres] = useState<AppelOffreAdmin[]>([]);
  const [isCreateAOOpen, setIsCreateAOOpen] = useState(false);
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
  const [aoForModalites, setAoForModalites] = useState<AppelOffreAdmin | null>(null);
  const [draftModalites, setDraftModalites] = useState("");
  const [savingModalites, setSavingModalites] = useState(false);
  const [selectedAOForCandidatures, setSelectedAOForCandidatures] = useState<AppelOffreAdmin | null>(null);
  const [candidaturesAO, setCandidaturesAO] = useState<CandidatureAdmin[]>([]);
  const [isViewCandidatesOpen, setIsViewCandidatesOpen] = useState(false);
  const [isViewDossierOpen, setIsViewDossierOpen] = useState(false);
  const [selectedCandidature, setSelectedCandidature] = useState<CandidatureAdmin | null>(null);
  const [legalDocuments, setLegalDocuments] = useState<DocumentLegal[]>([]);
  const [candidatureDocuments, setCandidatureDocuments] = useState<DocumentLegal[]>([]);
  // Documents légaux affichés dans la modale « Détails du Fournisseur »
  const [fournisseurLegalDocs, setFournisseurLegalDocs] = useState<DocumentLegal[]>([]);
  const [loadingFournisseurLegalDocs, setLoadingFournisseurLegalDocs] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // États pour l'assignation d'AO
  const [isAssignAOOpen, setIsAssignAOOpen] = useState(false);
  const [selectedAOForAssign, setSelectedAOForAssign] = useState<AppelOffreAdmin | null>(null);
  const [selectedResponsableId, setSelectedResponsableId] = useState<number | null>(null);

  const { user: authUser, api, logout, isReady, token, isAuthenticated, isAdmin: isAdminFromContext } = useAuth();
  const navigate = useNavigate();
  const getRoleName = (u: unknown) => {
    const roleContainer =
      typeof u === "object" && u !== null ? (u as { role?: string | { name?: string } }).role : undefined;
    const raw = typeof roleContainer === "string" ? roleContainer : roleContainer?.name;
    return raw?.toString().trim().toUpperCase();
  };

  const getRoleId = (u: unknown): number | undefined => {
    if (typeof u === "object" && u !== null && "role_id" in u) {
      return (u as { role_id?: number }).role_id;
    }
    return undefined;
  };

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

  const getApiErrorDetails = (
    error: unknown,
    fallback: string
  ): { message: string; libellesManquantes?: string[] } => {
    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error
    ) {
      const data = (error as {
        response?: { data?: { message?: string; libelles_manquantes?: string[] } };
      }).response?.data;

      if (data) {
        return {
          message: typeof data.message === "string" ? data.message : fallback,
          libellesManquantes: Array.isArray(data.libelles_manquantes)
            ? data.libelles_manquantes
            : undefined,
        };
      }
    }

    return { message: getErrorMessage(error, fallback) };
  };

  // États principaux
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("vue-ensemble");

  // Données du dashboard
  const [stats, setStats] = useState<DashboardStats>(EMPTY_DASHBOARD_STATS);

  const [appelsOffres, setAppelsOffres] = useState<AppelOffre[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [responsables, setResponsables] = useState<ResponsableMarche[]>([]);
  const [gestionnaires, setGestionnaires] = useState<GestionnaireUser[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const lastGlobalFetchRef = useRef(0);
  const lastAppelsFetchRef = useRef(0);
  const lastFournisseursFetchRef = useRef(0);
  const lastResponsablesFetchRef = useRef(0);
  const lastGestionnairesFetchRef = useRef(0);

  // États de filtres et recherche
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(""); // Nouvel état debounce
  const [filterStatut, setFilterStatut] = useState("tous");
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, DashboardFilterValue>>({});

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Etats de pagination
  const [pagination, setPagination] = useState({
    appelsOffres: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      perPage: 15,
    },
    fournisseurs: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      perPage: 15,
    },
    responsables: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      perPage: 15,
    },
    gestionnaires: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      perPage: 15,
    },
    mesAppelsOffres: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      perPage: 15,
    },
  });

  // ============================================
  // CHARGEMENT DES DONNÉES
  // ============================================

  // Fonction utilitaire pour mettre à jour la pagination
  const updatePaginationState = useCallback((
    key: keyof typeof pagination,
    meta: { current_page: number; last_page: number; total: number; per_page: number }
  ) => {
    setPagination(prev => {
      const current = prev[key];
      // On ne met à jour que les métadonnées serveur (total et pages) pour éviter les boucles infinies
      // On garde currentPage et perPage tels que définis par l'UI
      if (current.totalPages === meta.last_page && current.totalItems === meta.total) {
          return prev;
      }
      return {
        ...prev,
        [key]: {
          ...current,
          totalPages: meta.last_page,
          totalItems: meta.total,
        }
      };
    });
  }, []);

  const fetchGlobalData = useCallback(async () => {
    if (!api || !isReady || !isAuthenticated) return;

    try {
      const results = await Promise.allSettled([
        api.get('/api/admin/dashboard-stats'),
        api.get('/api/admin/suggestions'),
        api.get('/api/admin/recent-activities'),
        api.get('/api/admin/contact'),
      ]);

      if (results[0].status === 'fulfilled') {
        const parsed = parseDashboardStats(results[0].value.data);
        if (parsed) {
          setStats(parsed);
        } else {
          console.error('Réponse stats admin invalide:', results[0].value.data);
        }
      } else {
        console.error('Erreur stats admin:', results[0].reason);
      }

      if (results[1].status === 'fulfilled') {
        const payload = results[1].value.data;
        setSuggestions(Array.isArray(payload) ? payload : []);
      }

      if (results[2].status === 'fulfilled') {
        const payload = results[2].value.data;
        setRecentActivities(Array.isArray(payload) ? payload : []);
      }

      if (results[3].status === 'fulfilled') {
        const payload = results[3].value.data;
        setContactMessages(Array.isArray(payload) ? payload : []);
      }
    } catch (error) {
      console.error("Erreur chargement global:", error);
    }
  }, [api, isReady, isAuthenticated]);

  const fetchAppelsOffres = useCallback(async () => {
    const hasToken = Boolean(token || localStorage.getItem('access_token'));
    if (!api || !isReady || !isAuthenticated || !hasToken) return;
    const now = Date.now();
    if (now - lastAppelsFetchRef.current < 800) return;
    lastAppelsFetchRef.current = now;
    try {
      const params: Record<string, DashboardFilterValue> = {
          per_page: pagination.appelsOffres.perPage,
          page: pagination.appelsOffres.currentPage,
          search: debouncedSearchTerm,
          ...advancedFilters
      };

      if (filterStatut && filterStatut !== 'tous') {
          params.statut = filterStatut;
      }

      const response = await api.get('/api/admin/appels-offres-dashboard', { params });

      if (response.data.data) {
        setAppelsOffres(response.data.data);
        updatePaginationState('appelsOffres', response.data);
      } else {
        const data = Array.isArray(response.data) ? response.data : [];
        setAppelsOffres(data);
        setPagination(prev => ({ ...prev, appelsOffres: { ...prev.appelsOffres, totalItems: data.length, totalPages: 1 } }));
      }
    } catch (error) {
      console.error("Erreur chargement AO:", error);
    }
  }, [api, isReady, isAuthenticated, token, pagination.appelsOffres.perPage, pagination.appelsOffres.currentPage, debouncedSearchTerm, filterStatut, advancedFilters, updatePaginationState]);

  const fetchFournisseurs = useCallback(async () => {
    const hasToken = Boolean(token || localStorage.getItem('access_token'));
    if (!api || !isReady || !isAuthenticated || !hasToken) return;
    const now = Date.now();
    if (now - lastFournisseursFetchRef.current < 800) return;
    lastFournisseursFetchRef.current = now;
    try {
      const params: Record<string, DashboardFilterValue> = {
          per_page: pagination.fournisseurs.perPage,
          page: pagination.fournisseurs.currentPage,
          search: debouncedSearchTerm,
          ...advancedFilters
      };

      const response = await api.get('/api/admin/fournisseurs-dashboard', { params });

      if (response.data.data) {
        setFournisseurs(response.data.data);
        updatePaginationState('fournisseurs', response.data);
      } else {
        const data = Array.isArray(response.data) ? response.data : [];
        setFournisseurs(data);
        setPagination(prev => ({ ...prev, fournisseurs: { ...prev.fournisseurs, totalItems: data.length, totalPages: 1 } }));
      }
    } catch (error) {
      console.error("Erreur chargement Fournisseurs:", error);
    }
  }, [api, isReady, isAuthenticated, token, pagination.fournisseurs.perPage, pagination.fournisseurs.currentPage, debouncedSearchTerm, advancedFilters, updatePaginationState]);

  const fetchResponsables = useCallback(async () => {
    const hasToken = Boolean(token || localStorage.getItem('access_token'));
    if (!api || !isReady || !isAuthenticated || !hasToken) return;
    const now = Date.now();
    if (now - lastResponsablesFetchRef.current < 800) return;
    lastResponsablesFetchRef.current = now;
    try {
      const params: Record<string, DashboardFilterValue> = {
          per_page: pagination.responsables.perPage,
          page: pagination.responsables.currentPage,
          search: debouncedSearchTerm
      };

      const response = await api.get('/api/admin/responsables-dashboard', { params });

      if (response.data.data) {
        setResponsables(response.data.data);
        updatePaginationState('responsables', response.data);
      } else {
        const data = Array.isArray(response.data) ? response.data : [];
        setResponsables(data);
        setPagination(prev => ({ ...prev, responsables: { ...prev.responsables, totalItems: data.length, totalPages: 1 } }));
      }
    } catch (error) {
      console.error("Erreur chargement PRM:", error);
    }
  }, [api, isReady, isAuthenticated, token, pagination.responsables.perPage, pagination.responsables.currentPage, debouncedSearchTerm, updatePaginationState]);

  const fetchGestionnaires = useCallback(async () => {
    const hasToken = Boolean(token || localStorage.getItem('access_token'));
    if (!api || !isReady || !isAuthenticated || !hasToken) return;
    const now = Date.now();
    if (now - lastGestionnairesFetchRef.current < 800) return;
    lastGestionnairesFetchRef.current = now;
    try {
      const params: Record<string, DashboardFilterValue> = {
        per_page: pagination.gestionnaires.perPage,
        page: pagination.gestionnaires.currentPage,
        search: debouncedSearchTerm,
      };

      const response = await api.get('/api/admin/gestionnaires', { params });

      if (response.data.data) {
        setGestionnaires(response.data.data);
        updatePaginationState('gestionnaires', response.data);
      } else {
        const data = Array.isArray(response.data) ? response.data : [];
        setGestionnaires(data);
        setPagination(prev => ({ ...prev, gestionnaires: { ...prev.gestionnaires, totalItems: data.length, totalPages: 1 } }));
      }
    } catch (error) {
      console.error("Erreur chargement gestionnaires:", error);
    }
  }, [api, isReady, isAuthenticated, token, pagination.gestionnaires.perPage, pagination.gestionnaires.currentPage, debouncedSearchTerm, updatePaginationState]);

  // Wrapper de compatibilité pour recharger toutes les données
  const fetchDashboardData = useCallback(async () => {
      await Promise.all([
          fetchGlobalData(),
          fetchAppelsOffres(),
          fetchFournisseurs(),
          fetchResponsables(),
          fetchGestionnaires(),
      ]);
  }, [fetchGlobalData, fetchAppelsOffres, fetchFournisseurs, fetchResponsables, fetchGestionnaires]);

  const loadOverviewData = useCallback(async () => {
    if (!api || !isReady || !isAuthenticated) return;

    try {
      setLoading(true);
      await fetchGlobalData();
    } finally {
      setLoading(false);
    }
  }, [api, isReady, isAuthenticated, fetchGlobalData]);

  // Chargement initial + après connexion (authUser?.id évite les re-renders inutiles)
  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    void loadOverviewData();
  }, [isReady, isAuthenticated, authUser?.id, loadOverviewData]);

  // Secours : si les cartes restent à 0, retenter une fois après un court délai
  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    const timer = window.setTimeout(() => {
      if (stats.totalFournisseurs === 0 && stats.totalAppelsOffres === 0 && stats.totalResponsables === 0) {
        void fetchGlobalData();
      }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [isReady, isAuthenticated, authUser?.id, fetchGlobalData, stats.totalFournisseurs, stats.totalAppelsOffres, stats.totalResponsables]);

  // Effets de pagination séparés
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { 
      setIsMounted(true); 
      return () => setIsMounted(false);
  }, []);

  useEffect(() => {
      if (isMounted && isReady && isAuthenticated && (token || localStorage.getItem('access_token'))) fetchAppelsOffres();
  }, [fetchAppelsOffres, isMounted, isReady, isAuthenticated, token]);

  useEffect(() => {
      if (isMounted && isReady && isAuthenticated && (token || localStorage.getItem('access_token'))) fetchFournisseurs();
  }, [fetchFournisseurs, isMounted, isReady, isAuthenticated, token]);

  useEffect(() => {
      if (isMounted && isReady && isAuthenticated && (token || localStorage.getItem('access_token'))) fetchResponsables();
  }, [fetchResponsables, isMounted, isReady, isAuthenticated, token]);

  useEffect(() => {
      if (isMounted && isReady && isAuthenticated && (token || localStorage.getItem('access_token'))) fetchGestionnaires();
  }, [fetchGestionnaires, isMounted, isReady, isAuthenticated, token]);

  // Effet pour rendre l'overlay transparent pour la modale "Voir Dossier"
  useEffect(() => {
    if (isViewDossierOpen) {
      // Utiliser un délai pour s'assurer que l'overlay est dans le DOM
      const timer = setTimeout(() => {
        const overlay = document.querySelector('[data-radix-dialog-overlay]');
        if (overlay) {
          (overlay as HTMLElement).style.backgroundColor = 'transparent';
        }
      }, 10);
      return () => clearTimeout(timer);
    } else {
      // Réinitialiser l'overlay quand la modale est fermée
      const overlay = document.querySelector('[data-radix-dialog-overlay]');
      if (overlay) {
        (overlay as HTMLElement).style.backgroundColor = '';
      }
    }
  }, [isViewDossierOpen]);

  // ============================================
  // FONCTIONS UTILITAIRES
  // ============================================

  const handleLogout = async () => {
    await logout();
    toast({ title: "Déconnexion", description: "Vous avez été déconnecté." });
    navigate("/connexion");
  };
  
  const getStatutBadge = (statut: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      published: { variant: "default", label: "Ouvert" },
      closed: { variant: "outline", label: "Clôturé" },
      archived: { variant: "secondary", label: "Archivé" },
      draft: { variant: "secondary", label: "Brouillon" },
      actif: { variant: "default", label: "Actif" },
      en_attente: { variant: "secondary", label: "En attente" },
      rejete: { variant: "destructive", label: "Rejeté" },
      suspendu: { variant: "outline", label: "Suspendu" },
    };

    const config = variants[statut] || { variant: "outline" as const, label: statut };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getFournisseurStatutBadge = (fournisseur: Fournisseur) => {
    if (fournisseur.statut === "actif" && fournisseur.compte_actif === false) {
      return getStatutBadge("suspendu");
    }
    return getStatutBadge(fournisseur.statut);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const handleCreateResponsable = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneError = getSenegalPhoneValidationError(newResponsable.telephone);
    if (phoneError) {
      toast({ title: "Téléphone invalide", description: phoneError, variant: "destructive" });
      return;
    }
    const normalizedPhone = normalizeSenegalPhone(newResponsable.telephone);
    if (!normalizedPhone) {
      toast({
        title: "Téléphone invalide",
        description: "Numéro sénégalais requis (9 chiffres).",
        variant: "destructive",
      });
      return;
    }
    try {
      if (!api) throw new Error("API non disponible");
      
      await api.post(`${API_BASE_URL}/api/admin/responsables`, {
        name: newResponsable.name,
        email: newResponsable.email,
        password: newResponsable.password,
        direction: newResponsable.direction,
        fonction: newResponsable.fonction,
        telephone: normalizedPhone,
      });

      toast({ title: "Succès", description: "Personne responsable du marché (PRM) créée avec succès." });
      
      setIsCreateResponsableOpen(false);
      setNewResponsable({ name: "", email: "", password: "", direction: "", fonction: "", telephone: "" });
      fetchDashboardData();
    } catch (error: unknown) {
      console.error("Erreur création PRM:", error);
      toast({
        title: "Erreur",
        description: getErrorMessage(error, "Erreur lors de la création."),
        variant: "destructive",
      });
    }
  };

  const handleDeleteResponsable = async (id: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette personne responsable du marché (PRM) ?")) return;

    try {
      if (!api) throw new Error("API non disponible");
      await api.delete(`${API_BASE_URL}/api/admin/responsables/${id}`);
      toast({ title: "Succès", description: "Personne responsable du marché (PRM) supprimée." });
      fetchDashboardData();
    } catch (error: unknown) {
      toast({ title: "Erreur", description: "Impossible de supprimer.", variant: "destructive" });
    }
  };

  const handleCreateGestionnaire = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!api) throw new Error("API non disponible");

      await api.post(`${API_BASE_URL}/api/admin/gestionnaires`, {
        name: newGestionnaire.name,
        email: newGestionnaire.email,
        password: newGestionnaire.password,
      });

      toast({ title: "Succès", description: "Compte gestionnaire créé avec succès." });
      setIsCreateGestionnaireOpen(false);
      setNewGestionnaire({ name: "", email: "", password: "" });
      fetchGestionnaires();
    } catch (error: unknown) {
      toast({
        title: "Erreur",
        description: getErrorMessage(error, "Erreur lors de la création."),
        variant: "destructive",
      });
    }
  };

  const handleEditGestionnaireClick = (gestionnaire: GestionnaireUser) => {
    setEditingGestionnaire(gestionnaire);
    setEditGestionnaireForm({
      name: gestionnaire.name,
      email: gestionnaire.email,
      password: "",
      password_confirmation: "",
    });
    setIsEditGestionnaireOpen(true);
  };

  const handleUpdateGestionnaire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGestionnaire || !api) return;

    try {
      const payload: Record<string, string> = {
        name: editGestionnaireForm.name,
        email: editGestionnaireForm.email,
      };
      if (editGestionnaireForm.password) {
        payload.password = editGestionnaireForm.password;
        payload.password_confirmation = editGestionnaireForm.password_confirmation;
      }

      await api.put(`${API_BASE_URL}/api/admin/gestionnaires/${editingGestionnaire.id}`, payload);
      toast({ title: "Succès", description: "Gestionnaire mis à jour." });
      setIsEditGestionnaireOpen(false);
      setEditingGestionnaire(null);
      fetchGestionnaires();
    } catch (error: unknown) {
      toast({
        title: "Erreur",
        description: getErrorMessage(error, "Erreur lors de la mise à jour."),
        variant: "destructive",
      });
    }
  };

  const handleDeleteGestionnaire = async (id: number) => {
    if (!confirm("Supprimer ce compte gestionnaire ?")) return;

    try {
      if (!api) throw new Error("API non disponible");
      await api.delete(`${API_BASE_URL}/api/admin/gestionnaires/${id}`);
      toast({ title: "Succès", description: "Gestionnaire supprimé." });
      fetchGestionnaires();
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer.", variant: "destructive" });
    }
  };

  const handleEditClick = (responsable: ResponsableMarche) => {
    setEditingResponsable({
      id: responsable.id,
      name: responsable.user?.name || "",
      email: responsable.user?.email || "",
      direction: responsable.direction,
      fonction: responsable.fonction,
      telephone: responsable.telephone,
      password: "",
      password_confirmation: "",
    });
    setIsEditResponsableOpen(true);
  };

  const handleUpdateResponsable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResponsable) return;
    const phoneError = getSenegalPhoneValidationError(editingResponsable.telephone);
    if (phoneError) {
      toast({ title: "Téléphone invalide", description: phoneError, variant: "destructive" });
      return;
    }
    const normalizedPhone = normalizeSenegalPhone(editingResponsable.telephone);
    if (!normalizedPhone) {
      toast({
        title: "Téléphone invalide",
        description: "Numéro sénégalais requis (9 chiffres).",
        variant: "destructive",
      });
      return;
    }
    try {
      if (!api) throw new Error("API non disponible");
      
      const payload: Record<string, string> = {
        name: editingResponsable.name,
        email: editingResponsable.email,
        direction: editingResponsable.direction,
        fonction: editingResponsable.fonction,
        telephone: normalizedPhone,
      };

      if (editingResponsable.password.trim()) {
        if (editingResponsable.password !== editingResponsable.password_confirmation) {
          toast({
            title: "Mot de passe",
            description: "La confirmation ne correspond pas au nouveau mot de passe.",
            variant: "destructive",
          });
          return;
        }
        payload.password = editingResponsable.password;
        payload.password_confirmation = editingResponsable.password_confirmation;
      }

      await api.put(`${API_BASE_URL}/api/admin/responsables/${editingResponsable.id}`, payload);

      toast({ title: "Succès", description: "Personne responsable du marché (PRM) mise à jour." });
      setIsEditResponsableOpen(false);
      fetchDashboardData();
    } catch (error: unknown) {
      toast({
        title: "Erreur",
        description: getErrorMessage(error, "Impossible de mettre à jour."),
        variant: "destructive",
      });
    }
  };

  const getActivityIcon = (action: string) => {
    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
      validate_fournisseur: UserCheck,
      reject_fournisseur: UserX,
      accept_candidature: CheckCircle,
      reject_candidature: XCircle,
      publish_appel_offre: FileText,
      close_appel_offre: Clock,
      create_responsable: User,
    };
    return icons[action] || Activity;
  };

  const handleValidateFournisseur = async (fournisseurId: number) => {
    try {
      if (!api) throw new Error("API client non disponible.");
      await api.post(`${API_BASE_URL}/api/admin/fournisseurs/${fournisseurId}/validate`);
      toast({ title: "Succès", description: "Fournisseur validé." });
      fetchDashboardData();
    } catch (error: unknown) {
      const { message, libellesManquantes } = getApiErrorDetails(
        error,
        "Impossible de valider ce fournisseur."
      );
      toast({
        title: "Validation impossible",
        description: libellesManquantes?.length
          ? `${message} Pièces manquantes : ${libellesManquantes.join(", ")}.`
          : message,
        variant: "destructive",
      });
    }
  };

  const handleRejectFournisseur = async (fournisseurId: number) => {
    if (!confirm("Confirmer le rejet de ce compte fournisseur ?")) return;
    try {
      if (!api) throw new Error("API client non disponible.");
      await api.post(`${API_BASE_URL}/api/admin/fournisseurs/${fournisseurId}/reject`);
      toast({ title: "Succès", description: "Fournisseur rejeté.", variant: "destructive" });
      fetchDashboardData();
    } catch (error: unknown) {
      toast({
        title: "Erreur",
        description: getErrorMessage(error, "Impossible de rejeter."),
        variant: "destructive",
      });
    }
  };

  const handleSuspendFournisseur = async (fournisseurId: number) => {
    if (!confirm("Suspendre ce compte fournisseur ? Il ne pourra plus se connecter.")) return;
    try {
      if (!api) throw new Error("API client non disponible.");
      await api.post(`${API_BASE_URL}/api/admin/fournisseurs/${fournisseurId}/suspend`);
      toast({ title: "Compte suspendu", description: "Le fournisseur ne peut plus se connecter." });
      fetchDashboardData();
      setIsViewFournisseurOpen(false);
    } catch (error: unknown) {
      toast({
        title: "Erreur",
        description: getErrorMessage(error, "Impossible de suspendre ce compte."),
        variant: "destructive",
      });
    }
  };

  const handleReactivateFournisseur = async (fournisseurId: number) => {
    if (!confirm("Réactiver ou remettre en examen ce compte fournisseur ?")) return;
    try {
      if (!api) throw new Error("API client non disponible.");
      const res = await api.post(`${API_BASE_URL}/api/admin/fournisseurs/${fournisseurId}/reactivate`);
      toast({
        title: "Succès",
        description: typeof res.data?.message === "string" ? res.data.message : "Compte mis à jour.",
      });
      fetchDashboardData();
      setIsViewFournisseurOpen(false);
    } catch (error: unknown) {
      toast({
        title: "Erreur",
        description: getErrorMessage(error, "Impossible de réactiver ce compte."),
        variant: "destructive",
      });
    }
  };

  const handleMarkContactRead = async (messageId: number) => {
    if (!api) return;
    try {
      await api.put(`/api/admin/contact/${messageId}/read`);
      setContactMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, statut: "lu" } : m))
      );
    } catch (error: unknown) {
      toast({
        title: "Erreur",
        description: getErrorMessage(error, "Impossible de marquer le message comme lu."),
        variant: "destructive",
      });
    }
  };

  const handleArchiveContact = async (messageId: number) => {
    if (!api) return;
    try {
      await api.put(`/api/admin/contact/${messageId}/archive`);
      setContactMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, statut: "archive" } : m))
      );
    } catch (error: unknown) {
      toast({
        title: "Erreur",
        description: getErrorMessage(error, "Impossible d'archiver le message."),
        variant: "destructive",
      });
    }
  };

  const handleViewFournisseur = async (fournisseur: Fournisseur) => {
    setSelectedFournisseur(fournisseur);
    setIsViewFournisseurOpen(true);
    setFournisseurLegalDocs([]);
    if (!api) return;
    setLoadingFournisseurLegalDocs(true);
    try {
      const res = await api.get(`/api/fournisseurs/${fournisseur.id}/documents-legaux`);
      const payload = res.data;
      const docs: DocumentLegal[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
      setFournisseurLegalDocs(docs);
    } catch (error) {
      setFournisseurLegalDocs([]);
      toast({
        title: "Documents indisponibles",
        description: getErrorMessage(error, "Impossible de charger les documents légaux du fournisseur."),
        variant: "destructive",
      });
    } finally {
      setLoadingFournisseurLegalDocs(false);
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

  const handleViewAppelOffre = (ao: AppelOffre) => {
      setSelectedAppelOffre(ao);
      setIsViewAppelOffreOpen(true);
  };

  const handleUpdateSuggestionStatus = async (suggestionId: number, status: string) => {
      try {
        if (!api) throw new Error("API non disponible");
        await api.put(`/api/admin/suggestions/${suggestionId}`, { statut: status });
        toast({ title: "Succès", description: "Statut de la suggestion mis à jour." });
        setSuggestions(prev => prev.map(s => s.id === suggestionId ? { ...s, statut: status as Suggestion['statut'] } : s));
      } catch (error: unknown) {
        toast({ title: "Erreur", description: "Impossible de mettre à jour le statut.", variant: "destructive" });
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
      
      // Appel API pour mettre à jour le mot de passe
      // Note: Laravel attend 'new_password_confirmation' pour la validation 'confirmed'
      await api.put('/api/update-password', {
        current_password: passwordData.current,
        new_password: passwordData.new,
        new_password_confirmation: passwordData.confirm
      });

      toast({ title: "Succès", description: "Votre mot de passe a été mis à jour." });
      setIsSettingsOpen(false);
      setPasswordData({ current: "", new: "", confirm: "" });
    } catch (error: unknown) {
        const message = getErrorMessage(error, "Erreur lors de la mise à jour du mot de passe.");
        toast({ title: "Erreur", description: message, variant: "destructive" });
    }
  };

  // Fonctions pour la gestion des appels d'offres (comme responsable)
  const loadMesAppelsOffres = async (page = 1, perPage = pagination.mesAppelsOffres.perPage) => {
    if (!api) return;
    try {
      const res = await api.get("/api/responsable/mes-appels-offres", {
        params: { page, per_page: perPage }
      });
      // S'assurer que nous avons toujours un tableau
      const data = res.data;
      let rawData: Array<Record<string, unknown>> = [];
      
      if (Array.isArray(data)) {
        rawData = data;
      } else if (data && Array.isArray(data.data)) {
        rawData = data.data;
        // Mise à jour de la pagination si présente
        updatePaginationState('mesAppelsOffres', data);
      }

      // Mapper les données pour assurer la compatibilité avec l'interface AppelOffreAdmin
      // La ressource API renvoie responsable.user.name, alors que l'interface attend responsable.name
      const mappedData: AppelOffreAdmin[] = rawData.map((item) => {
        const typedItem = item as unknown as AppelOffreAdmin & {
          responsable?: { name?: string; user?: { name?: string } };
          responsable_marche?: { user?: { name?: string } };
        };
        let responsableObj = null;
        
        // Cas 1 : Structure Resource (responsable.user.name)
        if (typedItem.responsable?.user?.name) {
            responsableObj = { name: typedItem.responsable.user.name };
        }
        // Cas 2 : Structure directe (responsable.name) - rare ici mais possible
        else if (typedItem.responsable?.name) {
            responsableObj = { name: typedItem.responsable.name };
        }
        // Cas 3 : Fallback sur responsable_marche
        else if (typedItem.responsable_marche?.user?.name) {
            responsableObj = { name: typedItem.responsable_marche.user.name };
        }

        return {
            ...typedItem,
            responsable: responsableObj
        };
      });

      setMesAppelsOffres(mappedData);
    } catch (error: unknown) {
      console.error("Erreur chargement appels d'offres:", error);
      setMesAppelsOffres([]); // S'assurer que c'est toujours un tableau même en cas d'erreur
      toast({
        title: "Erreur",
        description: "Impossible de charger les appels d'offres.",
        variant: "destructive"
      });
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
      setIsCreateAOOpen(false);
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
      loadMesAppelsOffres();
    } catch (error: unknown) {
      console.error("Erreur création:", error);
      const message = getErrorMessage(error, "Erreur lors de la création.");
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        (error as { response?: { data?: { errors?: Record<string, string[]> } } }).response?.data?.errors
      ) {
         const errors = Object.values(
          (error as { response?: { data?: { errors?: Record<string, string[]> } } }).response?.data?.errors || {}
         ).flat().join('\n');
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
        `Confirmer la publication de ${label} ?\n\nL'avis sera visible par les fournisseurs. Vérifiez les pièces jointes et les modalités de dépôt avant de continuer.`
      )
    ) {
      return;
    }
    try {
      await api.post(`/api/appels-offres/${id}/publish`);
      toast({ title: "Publié", description: "L'appel d'offres est maintenant visible." });
      loadMesAppelsOffres();
    } catch (error) {
      const msg = getErrorMessage(error, "Impossible de publier.");
      toast({
        title: "Publication impossible",
        description: msg,
        variant: "destructive",
      });
    }
  };

  const openEditModalites = (ao: AppelOffreAdmin) => {
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
      loadMesAppelsOffres();
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
      toast({ title: "Clôturé", description: "L'appel d'offres est clôturé ; le dépôt des plis n'est plus ouvert." });
      loadMesAppelsOffres();
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
      loadMesAppelsOffres();
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

  const handleUnpublish = async (id: number, titre?: string) => {
    if (!api) return;
    const label = titre ? `« ${titre} »` : "cet appel d'offres";
    if (
      !confirm(
        `Repasser ${label} en brouillon ?\n\nIl ne sera plus visible publiquement jusqu'à une nouvelle publication.`
      )
    ) {
      return;
    }
    try {
      await api.post(`/api/appels-offres/${id}/unpublish`);
      toast({ title: "Brouillon", description: "L'appel d'offres n'est plus publié." });
      loadMesAppelsOffres();
    } catch (error) {
      toast({
        title: "Erreur",
        description: getErrorMessage(error, "Impossible de repasser en brouillon."),
        variant: "destructive",
      });
    }
  };

  const handleViewCandidatures = async (ao: AppelOffreAdmin) => {
    if (!api) return;
    setSelectedAOForCandidatures(ao);
    try {
      const res = await api.get(`/api/responsable/appels-offres/${ao.id}/candidatures-recues`); 
      
      const data = res.data;
      if (Array.isArray(data)) {
        setCandidaturesAO(data);
      } else if (data && Array.isArray(data.data)) {
        setCandidaturesAO(data.data);
      } else {
        setCandidaturesAO([]);
      }
      
      setIsViewCandidatesOpen(true);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de charger les candidatures.", variant: "destructive" });
      setCandidaturesAO([]);
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
      setCandidaturesAO(prev => prev.map(c => c.id === candidatureId ? { ...c, statut: decision === 'accept' ? 'accepted' : 'rejected' } : c));
      loadMesAppelsOffres();
    } catch (error: unknown) {
      console.error("Erreur évaluation:", error);
      const message = getErrorMessage(error, "Action impossible.");
      toast({ title: "Erreur", description: message, variant: "destructive" });
    }
  };

  const handleGenerateReport = () => {
    if (!selectedAOForCandidatures) return;

    // Déterminer le nom du responsable
    let responsableName = 'Administrateur';
    if (selectedAOForCandidatures.responsable && selectedAOForCandidatures.responsable.name) {
        responsableName = selectedAOForCandidatures.responsable.name;
    }

    const reportData = {
      appelOffre: {
        reference: selectedAOForCandidatures.reference,
        titre: selectedAOForCandidatures.titre,
        description: selectedAOForCandidatures.description || "Aucune description",
        // Utiliser date_cloture ou date_limite_depot si disponible
        date_cloture: selectedAOForCandidatures.date_cloture ? new Date(selectedAOForCandidatures.date_cloture).toLocaleDateString() : 'Non spécifiée',
        date_publication: selectedAOForCandidatures.date_publication ? new Date(selectedAOForCandidatures.date_publication).toLocaleDateString() : new Date().toLocaleDateString(),
        responsable: responsableName,
      },
      candidatures: (Array.isArray(candidaturesAO) ? candidaturesAO : []).map((c) => ({
        fournisseur: c.fournisseur?.nom_entreprise || 'Inconnu',
        email: c.fournisseur?.email_contact || 'N/A',
        date_soumission: c.date_soumission ? new Date(c.date_soumission).toLocaleDateString() : 'N/A',
        montant: c.montant_propose ? `${Number(c.montant_propose).toLocaleString('fr-FR').replace(/[\s\u00A0\u202F]/g, ' ')} FCFA` : 'Non spécifié',
        statut: c.statut === 'accepted' ? 'Retenu' : c.statut === 'rejected' ? 'Rejeté' : 'En attente',
        documents_complets: 'Oui', 
      })),
    };

    generatePVReport(reportData);
    toast({
      title: "Rapport généré",
      description: "Le Procès-Verbal d'analyse a été téléchargé.",
    });
  };

  const handleViewDossier = async (candidature: CandidatureAdmin) => {
    if (!api) return;
    
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
        api.get(`/api/responsable/candidatures/${candidature.id}/documents-legaux`).catch(() => ({ data: { data: [] } })),
        api.get(`/api/candidatures/${candidature.id}`).catch(() => ({ data: { data: null } })),
        api.get(`/api/candidatures/${candidature.id}/comments`).catch(() => ({ data: [] }))
      ]);
      
      const legalDocsData = legalDocsRes.data?.data || legalDocsRes.data;
      setLegalDocuments(Array.isArray(legalDocsData) ? legalDocsData : []);
      
      const candidatureData = candidatureDocsRes.data?.data || candidatureDocsRes.data;
      if (candidatureData?.documents && Array.isArray(candidatureData.documents)) {
        setCandidatureDocuments(candidatureData.documents);
      } else {
        setCandidatureDocuments([]);
      }
      
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

  const getStatutBadgeAO = (statut: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Brouillon", variant: "secondary" },
      published: { label: "Publié", variant: "default" },
      closed: { label: "Clôturé", variant: "destructive" },
      archived: { label: "Archivé", variant: "outline" },
    };
    const config = map[statut] || { label: statut, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleAssignAO = async () => {
    if (!api || !selectedAOForAssign || !selectedResponsableId) return;

    const prm = responsables.find((r) => r.id === selectedResponsableId);
    const prmLabel = prm?.user?.name ?? `PRM #${selectedResponsableId}`;
    const isChange = Boolean(
      selectedAOForAssign.responsable_marche_id &&
        selectedAOForAssign.responsable_marche_id !== selectedResponsableId
    );
    const confirmMsg = isChange
      ? `Confirmer le changement de PRM pour « ${selectedAOForAssign.titre} » ?\n\nNouveau responsable : ${prmLabel}`
      : `Confirmer l'assignation de « ${selectedAOForAssign.titre} » à ${prmLabel} ?`;

    if (!confirm(confirmMsg)) return;

    try {
      await api.post(`/api/appels-offres/${selectedAOForAssign.id}/assign`, {
        responsable_marche_id: selectedResponsableId
      });
      toast({ 
        title: "Succès", 
        description: isChange
          ? "Le PRM assigné a été modifié."
          : "L'appel d'offres a été assigné au responsable." 
      });
      setIsAssignAOOpen(false);
      setSelectedAOForAssign(null);
      setSelectedResponsableId(null);
      loadMesAppelsOffres();
    } catch (error: unknown) {
      console.error("Erreur assignation:", error);
      const message = getErrorMessage(error, "Impossible d'assigner cet appel d'offres.");
      toast({ 
        title: "Erreur", 
        description: message, 
        variant: "destructive" 
      });
    }
  };

  const handleOpenAssignModal = (ao: AppelOffreAdmin) => {
    setSelectedAOForAssign(ao);
    setSelectedResponsableId(ao.responsable_marche_id || null);
    setIsAssignAOOpen(true);
  };

  const handleExportData = async (type: 'appelsOffres' | 'fournisseurs' | 'responsables', format: 'excel' | 'pdf') => {
    if (!api) return;

    try {
      let endpoint = '';
      let fileName = '';
      let title = '';
      let columns: Array<{ header: string; key: string; format?: (v: string) => string }> = [];

      switch (type) {
        case 'appelsOffres':
          endpoint = '/api/admin/appels-offres-dashboard';
          fileName = 'appels_offres_export';
          title = 'Liste des Appels d\'Offres';
          columns = [
            { header: 'ID', key: 'id' },
            { header: 'Titre', key: 'titre' },
            { header: 'Référence', key: 'reference' },
            { header: 'Statut', key: 'statut' },
            { header: 'Date Publication', key: 'date_publication', format: (v: string) => v ? new Date(v).toLocaleDateString() : '-' },
            { header: 'Date Clôture', key: 'date_cloture', format: (v: string) => v ? new Date(v).toLocaleDateString() : '-' },
            // Dépôt en présentiel : pas d'export "candidatures"
            { header: 'Personne responsable du marché (PRM)', key: 'responsable.name' },
          ];
          break;
        case 'fournisseurs':
          endpoint = '/api/admin/fournisseurs-dashboard';
          fileName = 'fournisseurs_export';
          title = 'Liste des Fournisseurs';
          columns = [
            { header: 'ID', key: 'id' },
            { header: 'Raison Sociale', key: 'raison_sociale' },
            { header: 'NINEA', key: 'ninea' },
            { header: 'Email', key: 'email' },
            { header: 'Téléphone', key: 'telephone' },
            { header: 'Statut', key: 'statut' },
            { header: 'Date Inscription', key: 'date_inscription', format: (v: string) => v ? new Date(v).toLocaleDateString() : '-' },
            // Dépôt en présentiel : pas d'export "candidatures"
          ];
          break;
        case 'responsables':
          endpoint = '/api/admin/responsables-dashboard';
          fileName = 'responsables_export';
          title = 'Liste des PRM';
          columns = [
            { header: 'ID', key: 'id' },
            { header: 'Nom', key: 'user.name' },
            { header: 'Email', key: 'user.email' },
            { header: 'Direction', key: 'direction' },
            { header: 'Fonction', key: 'fonction' },
            { header: 'Téléphone', key: 'telephone' },
            { header: 'Appels d\'Offres', key: 'nombre_appels_offres' },
          ];
          break;
      }

      // Préparation des paramètres
      const params: Record<string, DashboardFilterValue> = {
        all: true,
        search: searchTerm
      };

      // Ne pas envoyer "tous" comme filtre de statut
      if (filterStatut && filterStatut !== 'tous') {
        params.statut = filterStatut;
      }

      const response = await api.get(endpoint, { params });
      
      const data = response.data;

      exportData(format, {
        fileName,
        title,
        columns,
        data
      });

      toast({
        title: "Export réussi",
        description: `Le fichier ${format.toUpperCase()} a été généré avec succès.`,
      });

    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      toast({
        title: "Erreur d'export",
        description: "Impossible de générer le fichier d'export.",
        variant: "destructive",
      });
    }
  };

  // Reset filtres avancés et recherche au changement d'onglet
  useEffect(() => {
    setAdvancedFilters({});
    setSearchTerm("");
    setDebouncedSearchTerm("");
  }, [activeTab]);

  const handleAdvancedSearch = (filters: Record<string, DashboardFilterValue>) => {
    setAdvancedFilters(filters);
    
    // Réinitialiser la pagination à la page 1
    if (activeTab === 'appels-offres') {
      setPagination(prev => ({ 
        ...prev, 
        appelsOffres: { ...prev.appelsOffres, currentPage: 1 } 
      }));
    } else if (activeTab === 'fournisseurs') {
      setPagination(prev => ({ 
        ...prev, 
        fournisseurs: { ...prev.fournisseurs, currentPage: 1 } 
      }));
    }
  };

  // ============================================
  // PAGINATION HANDLERS
  // ============================================

  const handlePageChange = async (type: keyof typeof pagination, page: number) => {
    if (!api) return;

    if (type === 'mesAppelsOffres') {
      loadMesAppelsOffres(page);
      return;
    }

    // Pour les types gérés par useEffect (appelsOffres, fournisseurs, responsables),
    // on met juste à jour l'état, ce qui déclenchera le chargement via les hooks.
    setPagination(prev => ({
      ...prev,
      [type]: { ...prev[type], currentPage: page }
    }));
  };

  const handlePerPageChange = async (type: keyof typeof pagination, perPage: number) => {
    // Recharger avec la nouvelle limite (page 1)
    if (type === 'mesAppelsOffres') {
      setPagination(prev => ({
        ...prev,
        [type]: { ...prev[type], perPage, currentPage: 1 }
      }));
      loadMesAppelsOffres(1, perPage);
    } else {
      // Pour les autres, on met à jour l'état et le useEffect fera le reste
      setPagination(prev => ({
        ...prev,
        [type]: { ...prev[type], perPage, currentPage: 1 }
      }));
    }
  };


  // ============================================
  // RENDU CONDITIONNEL (Loading / Error)
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-lg text-muted-foreground">Chargement du tableau de bord...</p>
      </div>
    );
  }

  const roleName = getRoleName(authUser);
  const isAdmin = roleName === "ADMIN" || getRoleId(authUser) === 1;

  if (error || !authUser || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/10">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-lg text-destructive">{error || "Accès non autorisé"}</p>
        <Button variant="outline" onClick={handleLogout} className="mt-4">
          Se déconnecter
        </Button>
      </div>
    );
  }

  // Cartes de statistiques
  const statsCards = [
    {
      title: "Fournisseurs",
      value: stats.totalFournisseurs,
      subtitle: `${stats.fournisseursActifs} actifs • ${stats.fournisseursEnAttente} en attente • ${stats.fournisseursRejetes} rejetés`,
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Appels d'offres",
      value: stats.totalAppelsOffres,
      subtitle: `${stats.appelsOffresActifs} actifs • ${stats.appelsOffresClotures} clôturés • ${stats.appelsOffresBrouillon} brouillons`,
      icon: FileText,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    ...(afficherCandidatures
      ? [
          {
            title: "Candidatures",
            value: stats.totalCandidatures,
            subtitle: `${stats.candidaturesRetenues} retenues • ${stats.candidaturesRejetees} rejetées`,
            icon: CheckCircle,
            color: "text-purple-600",
            bgColor: "bg-purple-50",
          },
        ]
      : []),
    {
      title: "Personnes responsables du marché (PRM)",
      value: stats.totalResponsables,
      subtitle: "Comptes actifs",
      icon: User,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Gestionnaires",
      value: stats.totalGestionnaires,
      subtitle: "Comptes actifs",
      icon: Shield,
      color: "text-slate-700",
      bgColor: "bg-slate-100",
    },
  ];

  // ============================================
  // RENDU PRINCIPAL AVEC SIDEBAR
  // ============================================

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <DashboardNavbar
        title="Espace Administrateur"
        onOpenProfile={() => setIsAccountProfileOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
      />
      <div className="flex min-h-0 w-full flex-1 pt-16">
      <aside className="fixed bottom-0 left-0 top-16 z-30 flex w-64 flex-col border-r border-slate-200 bg-white shadow-sm">
        <div className="px-4 pt-6 pb-5 border-b border-slate-100 shrink-0">
          <div className="flex flex-col items-center text-center">
            <div
              className="h-14 w-14 rounded-full bg-primary/12 flex items-center justify-center text-lg font-semibold text-primary mb-3 ring-2 ring-primary/15"
              aria-hidden
            >
              {authUser?.name?.trim()?.charAt(0)?.toLocaleUpperCase("fr") ?? "?"}
            </div>
            <p className="font-semibold text-slate-800 text-sm leading-tight">{authUser?.name ?? "—"}</p>
            <p className="text-xs text-slate-500 mt-1.5 px-1 break-all leading-snug">{authUser?.email ?? ""}</p>
            <Badge
              variant="outline"
              className="mt-3 text-xs font-medium border-primary/35 text-primary bg-white hover:bg-primary/5"
            >
              Administrateur
            </Badge>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          <Button
            variant={activeTab === "vue-ensemble" ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === "vue-ensemble" ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "text-slate-600 hover:bg-slate-100"}`}
            onClick={() => setActiveTab("vue-ensemble")}
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
            Appels d'offres
          </Button>

          <Button
            variant={activeTab === "fournisseurs" ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === "fournisseurs" ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "text-slate-600 hover:bg-slate-100"}`}
            onClick={() => setActiveTab("fournisseurs")}
          >
            <Building2 className="w-4 h-4 mr-3" />
            Fournisseurs
          </Button>

          <Button
            variant={activeTab === "responsables" ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === "responsables" ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "text-slate-600 hover:bg-slate-100"}`}
            onClick={() => setActiveTab("responsables")}
          >
            <Users className="w-4 h-4 mr-3" />
            PRM
          </Button>

          <Button
            variant={activeTab === "gestionnaires" ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === "gestionnaires" ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "text-slate-600 hover:bg-slate-100"}`}
            onClick={() => setActiveTab("gestionnaires")}
          >
            <Shield className="w-4 h-4 mr-3" />
            Gestionnaires
          </Button>

          <Button
            variant={activeTab === "suggestions" ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === "suggestions" ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "text-slate-600 hover:bg-slate-100"}`}
            onClick={() => setActiveTab("suggestions")}
          >
            <MessageSquare className="w-4 h-4 mr-3" />
            Suggestions
          </Button>

          <Button
            variant={activeTab === "contact" ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === "contact" ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "text-slate-600 hover:bg-slate-100"}`}
            onClick={() => setActiveTab("contact")}
          >
            <Mail className="w-4 h-4 mr-3" />
            Messages contact
            {contactMessages.filter((m) => m.statut === "nouveau").length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {contactMessages.filter((m) => m.statut === "nouveau").length}
              </Badge>
            )}
          </Button>

          <Button
            variant={activeTab === "gestion-ao" ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === "gestion-ao" ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "text-slate-600 hover:bg-slate-100"}`}
            onClick={() => {
              setActiveTab("gestion-ao");
              loadMesAppelsOffres();
            }}
          >
            <Megaphone className="w-4 h-4 mr-3" />
            Gestion Appels d'Offres
          </Button>

          <Button
            variant={activeTab === "audit" ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === "audit" ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "text-slate-600 hover:bg-slate-100"}`}
            onClick={() => setActiveTab("audit")}
          >
            <FileClock className="w-4 h-4 mr-3" />
            Historique Audit
          </Button>
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-400 text-center">
            Utilisez le menu en haut à droite pour votre profil, les paramètres et la déconnexion.
          </p>
        </div>
      </aside>

      <main className="ml-64 min-h-0 flex-1 overflow-y-auto">
        <div className="p-8">
        {/* En-tête de section dynamique */}
        <div className="flex justify-between items-center mb-8">
           <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {activeTab === 'vue-ensemble' && "Vue d'ensemble"}
                {activeTab === 'appels-offres' && "Gestion des Appels d'Offres"}
                {activeTab === 'fournisseurs' && "Annuaire Fournisseurs"}
                {activeTab === 'responsables' && "Équipe PRM"}
                {activeTab === 'gestionnaires' && "Comptes gestionnaires"}
                {activeTab === 'suggestions' && "Boîte à idées"}
                {activeTab === 'contact' && "Messages contact"}
                {activeTab === 'gestion-ao' && "Gestion Appels d'Offres"}
                {activeTab === 'audit' && "Historique des modifications"}
              </h1>
              <p className="text-slate-500 mt-1">
                {activeTab === 'vue-ensemble' && "Métriques clés et activités récentes"}
                {activeTab === 'appels-offres' && "Suivez et gérez tous les appels d'offres de la plateforme"}
                {activeTab === 'fournisseurs' && "Gérez les inscriptions et validations des fournisseurs"}
                {activeTab === 'responsables' && "Administrez les comptes des PRM"}
                {activeTab === 'gestionnaires' && "Créez des comptes gestionnaires (vue globale sur les AO, sans gestion des fournisseurs)"}
                {activeTab === 'suggestions' && "Consultez et traitez les retours des fournisseurs"}
                {activeTab === 'contact' && "Messages reçus via le formulaire de contact du portail"}
                {activeTab === 'gestion-ao' && "Créez, publiez et gérez vos appels d'offres"}
                {activeTab === 'audit' && "Trace des AO, fournisseurs, candidatures, PRM, comptes, documents et paiements cahier"}
              </p>
           </div>
           
           {/* Actions contextuelles */}
           <div className="flex gap-2">
              {activeTab === 'responsables' && (
                  <Button onClick={() => setIsCreateResponsableOpen(true)}>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Nouveau PRM
                  </Button>
              )}
              {activeTab === 'gestionnaires' && (
                  <Button onClick={() => setIsCreateGestionnaireOpen(true)}>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Nouveau gestionnaire
                  </Button>
              )}
               {activeTab === 'fournisseurs' && (
                  <Button variant="outline" onClick={fetchDashboardData}>
                    <Activity className="w-4 h-4 mr-2" />
                    Actualiser
                  </Button>
              )}
              {activeTab === 'gestion-ao' && (
                  <Button onClick={() => setIsCreateAOOpen(true)}>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Nouveau Appel d'Offre
                  </Button>
              )}
           </div>
        </div>

        {/* CONTENU DES ONGLETS */}
        
        {/* 1. VUE D'ENSEMBLE */}
        {activeTab === "vue-ensemble" && (
          <div className="space-y-6 animate-in fade-in duration-500">
             {/* Cartes Stats */}
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {statsCards.map((stat, index) => (
                  <motion.div
                    key={stat.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="hover:shadow-lg transition-all duration-300 border-none shadow-sm h-full">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {stat.title}
                        </CardTitle>
                        <div className={`${stat.bgColor} p-3 rounded-xl`}>
                          <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-slate-800">{stat.value}</div>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">{stat.subtitle}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
             </div>

             {/* Graphiques Statistiques Avancées */}
             <AdvancedStats />

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Activités récentes */}
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Activity className="w-5 h-5 text-primary" />
                      Activités récentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentActivities.map((activity) => {
                        const IconComponent = getActivityIcon(activity.action);
                        return (
                          <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                            <div className="bg-primary/10 p-2 rounded-lg">
                              <IconComponent className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-800">{activity.details}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <span className="font-semibold text-primary">{activity.user}</span>
                                <span>•</span>
                                <span>{activity.date}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {recentActivities.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">Aucune activité récente.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Fournisseurs en attente */}
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Clock className="w-5 h-5 text-orange-500" />
                      Fournisseurs en attente
                    </CardTitle>
                    <CardDescription>
                      {stats.fournisseursEnAttente} comptes à valider
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {fournisseurs
                        .filter((f) => f.statut === "en_attente")
                        .map((fournisseur) => (
                          <div key={fournisseur.id} className="flex items-center justify-between p-4 rounded-lg border bg-white">
                            <div className="flex-1">
                              <p className="font-bold text-slate-800">{fournisseur.raison_sociale}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {fournisseur.ninea ? `NINEA: ${fournisseur.ninea}` : "NINEA: Non spécifié"}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2"
                                onClick={() => handleViewFournisseur(fournisseur)}
                                title="Voir détails"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 h-8 px-2"
                                disabled={fournisseur.dossier_complet === false}
                                onClick={() => void handleValidateFournisseur(fournisseur.id)}
                                title={
                                  fournisseur.dossier_complet === false
                                    ? "Dossier incomplet"
                                    : "Valider"
                                }
                              >
                                <UserCheck className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 px-2"
                                onClick={() => handleRejectFournisseur(fournisseur.id)}
                                title="Rejeter"
                              >
                                <UserX className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                         {fournisseurs.filter((f) => f.statut === "en_attente").length === 0 && (
                            <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                                <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                                <p>Tous les fournisseurs sont à jour.</p>
                            </div>
                         )}
                    </div>
                  </CardContent>
                </Card>
             </div>
          </div>
        )}

        {/* 2. APPELS D'OFFRES */}
        {activeTab === "appels-offres" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                 <div className="flex flex-col md:flex-row gap-4 justify-between">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleExportData('appelsOffres', 'excel')}>
                        <Download className="mr-2 h-4 w-4" /> Excel
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleExportData('appelsOffres', 'pdf')}>
                        <Download className="mr-2 h-4 w-4" /> PDF
                      </Button>
                      <AdvancedSearch 
                        onSearch={handleAdvancedSearch}
                        configs={[
                          { key: 'date_debut', label: 'Publié après le', type: 'date' },
                          { key: 'date_fin', label: 'Publié avant le', type: 'date' }
                        ]}
                      />
                    </div>
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                            placeholder="Rechercher par référence, titre..." 
                            className="pl-10 bg-slate-50 border-slate-200"
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>
                    <Select value={filterStatut} onValueChange={setFilterStatut}>
                        <SelectTrigger className="w-[200px] bg-slate-50 border-slate-200">
                          <SelectValue placeholder="Filtrer par statut" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="tous">Tous les statuts</SelectItem>
                            <SelectItem value="draft">Brouillons</SelectItem>
                            <SelectItem value="published">Ouverts</SelectItem>
                            <SelectItem value="closed">Clôturés</SelectItem>
                            <SelectItem value="archived">Archivés</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-slate-100 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-semibold">Référence</TableHead>
                        <TableHead className="font-semibold">Titre</TableHead>
                        <TableHead className="font-semibold">Statut</TableHead>
                        <TableHead className="font-semibold">Clôture</TableHead>
                        <TableHead className="font-semibold">Personne responsable du marché (PRM)</TableHead>
                        {/* Dépôt en présentiel : pas de colonne candidatures */}
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appelsOffres
                        .map((ao) => (
                        <TableRow key={ao.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-mono text-sm font-medium text-primary">{ao.reference}</TableCell>
                          <TableCell className="font-medium text-slate-700">{ao.titre}</TableCell>
                          <TableCell>{getStatutBadge(ao.statut)}</TableCell>
                          <TableCell className="text-sm text-slate-500">{formatDate(ao.date_cloture)}</TableCell>
                          <TableCell>
                             {ao.responsable ? (
                               <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                      {ao.responsable.name?.charAt(0)}
                                  </div>
                                  <span className="text-sm">{ao.responsable.name}</span>
                               </div>
                             ) : (
                                <Badge variant="outline" className="text-orange-600 border-orange-200">Non assigné</Badge>
                             )}
                          </TableCell>
                          {/* Dépôt en présentiel : pas de colonne candidatures */}
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewAppelOffre(ao)}>
                                  <Eye className="w-4 h-4 text-slate-500" />
                                </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {appelsOffres.length === 0 && (
                          <TableRow>
                              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                  Aucun appel d'offres trouvé.
                              </TableCell>
                          </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <DataTablePagination
                  currentPage={pagination.appelsOffres.currentPage}
                  totalPages={pagination.appelsOffres.totalPages}
                  totalItems={pagination.appelsOffres.totalItems}
                  perPage={pagination.appelsOffres.perPage}
                  onPageChange={(page) => handlePageChange('appelsOffres', page)}
                  onPerPageChange={(perPage) => handlePerPageChange('appelsOffres', perPage)}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* 3. FOURNISSEURS */}
        {activeTab === "fournisseurs" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                  <div className="flex flex-col md:flex-row gap-4 justify-between">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleExportData('fournisseurs', 'excel')}>
                        <Download className="mr-2 h-4 w-4" /> Excel
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleExportData('fournisseurs', 'pdf')}>
                        <Download className="mr-2 h-4 w-4" /> PDF
                      </Button>
                      <AdvancedSearch 
                        onSearch={handleAdvancedSearch}
                        configs={[
                          { key: 'raison_sociale', label: 'Raison Sociale', type: 'text', placeholder: 'Ex: Entreprise X' },
                        ]}
                      />
                    </div>
                  </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="rounded-lg border border-slate-100 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Raison sociale</TableHead>
                        <TableHead>NINEA</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Statut</TableHead>
                        {/* Dépôt en présentiel : pas de colonne candidatures */}
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fournisseurs.map((f) => (
                        <TableRow key={f.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-bold text-slate-800">{f.raison_sociale}</TableCell>
                          <TableCell className="font-mono text-sm text-slate-500">{f.ninea}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{f.email}</div>
                              <div className="text-muted-foreground text-xs">{f.telephone}</div>
                            </div>
                          </TableCell>
                          <TableCell>{getFournisseurStatutBadge(f)}</TableCell>
                          {/* Dépôt en présentiel : pas de colonne candidatures */}
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleViewFournisseur(f)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Détails
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <DataTablePagination
                  currentPage={pagination.fournisseurs.currentPage}
                  totalPages={pagination.fournisseurs.totalPages}
                  totalItems={pagination.fournisseurs.totalItems}
                  perPage={pagination.fournisseurs.perPage}
                  onPageChange={(page) => handlePageChange('fournisseurs', page)}
                  onPerPageChange={(perPage) => handlePerPageChange('fournisseurs', perPage)}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* 4. RESPONSABLES */}
        {activeTab === "responsables" && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="flex justify-end gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={() => handleExportData('responsables', 'excel')}>
                  <Download className="mr-2 h-4 w-4" /> Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportData('responsables', 'pdf')}>
                  <Download className="mr-2 h-4 w-4" /> PDF
                </Button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {responsables.map((r) => (
                     <Card key={r.id} className="hover:shadow-md transition-shadow border-slate-200">
                         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                             <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                    {r.user?.name?.charAt(0) || "R"}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{r.user?.name}</h3>
                                    <p className="text-xs text-muted-foreground">{r.fonction}</p>
                                </div>
                             </div>
                             <div className="flex">
                                 <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => handleEditClick(r)}>
                                     <Edit className="w-4 h-4" />
                                 </Button>
                                 <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-destructive" onClick={() => handleDeleteResponsable(r.id)}>
                                     <Trash2 className="w-4 h-4" />
                                 </Button>
                             </div>
                         </CardHeader>
                         <CardContent className="mt-4 space-y-3">
                             <div className="grid grid-cols-2 gap-2 text-sm">
                                 <div className="flex flex-col">
                                     <span className="text-xs text-muted-foreground">Direction</span>
                                     <span className="font-medium">{r.direction}</span>
                                 </div>
                                 <div className="flex flex-col">
                                     <span className="text-xs text-muted-foreground">Téléphone</span>
                                     <span className="font-medium">{r.telephone}</span>
                                 </div>
                             </div>
                             <div className="pt-3 border-t">
                                 <div className="flex justify-between items-center">
                                     <span className="text-sm text-muted-foreground">Appels d'offres gérés</span>
                                     <Badge variant="secondary">{r.nombre_appels_offres}</Badge>
                                 </div>
                             </div>
                         </CardContent>
                     </Card>
                 ))}
             </div>
             <div className="mt-4">
               <DataTablePagination
                  currentPage={pagination.responsables.currentPage}
                  totalPages={pagination.responsables.totalPages}
                  totalItems={pagination.responsables.totalItems}
                  perPage={pagination.responsables.perPage}
                  onPageChange={(page) => handlePageChange('responsables', page)}
                  onPerPageChange={(perPage) => handlePerPageChange('responsables', perPage)}
                />
             </div>
          </div>
        )}

        {/* 4b. GESTIONNAIRES */}
        {activeTab === "gestionnaires" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gestionnaires.map((g) => (
                <Card key={g.id} className="hover:shadow-md transition-shadow border-slate-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-400 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                        {g.name?.charAt(0) || "G"}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">{g.name}</h3>
                        <p className="text-xs text-muted-foreground break-all">{g.email}</p>
                      </div>
                    </div>
                    <div className="flex">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => handleEditGestionnaireClick(g)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-destructive" onClick={() => handleDeleteGestionnaire(g.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="mt-2">
                    <Badge variant={g.is_active === false ? "outline" : "secondary"}>
                      {g.is_active === false ? "Inactif" : "Actif"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
            <DataTablePagination
              currentPage={pagination.gestionnaires.currentPage}
              totalPages={pagination.gestionnaires.totalPages}
              totalItems={pagination.gestionnaires.totalItems}
              perPage={pagination.gestionnaires.perPage}
              onPageChange={(page) => handlePageChange('gestionnaires', page)}
              onPerPageChange={(perPage) => handlePerPageChange('gestionnaires', perPage)}
            />
          </div>
        )}



        {/* 5. SUGGESTIONS */}
        {activeTab === "contact" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Messages contact
                </CardTitle>
                <CardDescription>
                  Formulaire public du portail — répondez directement à l&apos;adresse e-mail de l&apos;expéditeur.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {contactMessages
                  .filter((m) => m.statut !== "archive")
                  .map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-lg border p-4 shadow-sm ${
                        message.statut === "nouveau" ? "bg-amber-50/50 border-amber-200" : "bg-white"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                        <div>
                          <h4 className="font-semibold text-slate-900">{message.sujet}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {message.nom || message.user?.name || "Visiteur"} —{" "}
                            <a href={`mailto:${message.email}`} className="text-primary hover:underline">
                              {message.email}
                            </a>
                            {" · "}
                            {new Date(message.created_at).toLocaleString("fr-FR")}
                          </p>
                        </div>
                        <Badge variant={message.statut === "nouveau" ? "default" : "outline"}>
                          {message.statut === "nouveau" ? "Nouveau" : "Lu"}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-line bg-slate-50 p-3 rounded-md border">
                        {message.message}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {message.statut === "nouveau" && (
                          <Button size="sm" variant="secondary" onClick={() => void handleMarkContactRead(message.id)}>
                            Marquer lu
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => void handleArchiveContact(message.id)}>
                          Archiver
                        </Button>
                        <Button size="sm" asChild>
                          <a href={`mailto:${message.email}?subject=Re: ${encodeURIComponent(message.sujet)}`}>
                            Répondre
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                {contactMessages.filter((m) => m.statut !== "archive").length === 0 && (
                  <p className="text-center py-12 text-muted-foreground">Aucun message contact à afficher.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "suggestions" && (
            <div className="space-y-6 animate-in fade-in duration-500">
                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Boîte à idées</CardTitle>
                        <CardDescription>Consultez et gérez les suggestions des fournisseurs.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {suggestions.map((suggestion) => (
                                <div key={suggestion.id} className="p-4 border rounded-lg bg-white shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-semibold text-lg">{suggestion.sujet}</h4>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <span className="font-medium text-slate-700">{suggestion.user?.fournisseur?.nom_entreprise || suggestion.user?.name}</span>
                                                <span>•</span>
                                                <span>{new Date(suggestion.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Select 
                                                defaultValue={suggestion.statut} 
                                                onValueChange={(val) => handleUpdateSuggestionStatus(suggestion.id, val)}
                                            >
                                                <SelectTrigger className="w-[180px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="pending">En attente</SelectItem>
                                                    <SelectItem value="read">Lue</SelectItem>
                                                    <SelectItem value="implemented">Prise en compte</SelectItem>
                                                    <SelectItem value="rejected">Rejetée</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <p className="text-slate-600 whitespace-pre-line bg-slate-50 p-3 rounded-md border border-slate-100">
                                        {suggestion.message}
                                    </p>
                                </div>
                            ))}
                            {suggestions.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground">
                                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>Aucune suggestion reçue pour le moment.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}

        {/* 6. GESTION APPELS D'OFFRES */}
        {activeTab === "gestion-ao" && (
          <div className="animate-in fade-in duration-500">
            <Card className="border-none shadow-sm">
              <CardContent className="p-0">
                <div className="rounded-lg border border-slate-100 overflow-hidden bg-white">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-semibold">Référence</TableHead>
                        <TableHead className="font-semibold">Titre</TableHead>
                        <TableHead className="font-semibold">Date Limite</TableHead>
                        <TableHead className="font-semibold">Statut</TableHead>
                        <TableHead className="font-semibold">Personne responsable du marché (PRM)</TableHead>
                        {/* Dépôt en présentiel : pas de colonne candidatures */}
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!Array.isArray(mesAppelsOffres) || mesAppelsOffres.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <Briefcase className="w-8 h-8 text-slate-300" />
                              <p>Aucun appel d'offres créé pour le moment.</p>
                              <Button variant="link" onClick={() => setIsCreateAOOpen(true)} className="text-primary">
                                Créer votre premier appel d'offres
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : mesAppelsOffres.map((ao) => (
                        <TableRow key={ao.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-mono text-xs font-medium text-slate-600">{ao.reference}</TableCell>
                          <TableCell className="font-medium text-slate-800">{ao.titre}</TableCell>
                          <TableCell className="text-slate-600">{new Date(ao.date_limite_depot).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 items-start">
                              {getStatutBadgeAO(ao.statut)}
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
                          <TableCell>
                            {ao.responsable?.name ? (
                              <span className="text-sm text-slate-700">{ao.responsable.name}</span>
                            ) : (
                              <Badge variant="outline" className="text-orange-600 border-orange-200">Non assigné</Badge>
                            )}
                          </TableCell>
                          {/* Dépôt en présentiel : pas de colonne candidatures */}
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border border-primary text-primary hover:bg-primary/10"
                                onClick={() => handleOpenAssignModal(ao)}
                                title={
                                  ao.responsable_marche_id
                                    ? "Changer la personne responsable du marché (PRM)"
                                    : "Assigner à une personne responsable du marché (PRM)"
                                }
                              >
                                <User className="w-3 h-3 mr-1" />{" "}
                                {ao.responsable_marche_id ? "Changer PRM" : "Assigner"}
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
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8"
                                onClick={() => navigate(`/appels-offres/${ao.id}`)}
                                title="Fiche publique : documents, modalités, publication"
                              >
                                <FileText className="w-3 h-3 mr-1" /> Fiche
                              </Button>
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
                                <>
                                  <Button size="sm" variant="secondary" className="h-8 border border-slate-200" onClick={() => handleClose(ao.id, ao.titre)} title="Clôturer">
                                    <Archive className="w-3 h-3 mr-1" /> Clôturer
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 border-amber-200 text-amber-800 hover:bg-amber-50"
                                    onClick={() => handleUnpublish(ao.id, ao.titre)}
                                    title="Repasser en brouillon"
                                  >
                                    <Undo2 className="w-3 h-3 mr-1" /> Brouillon
                                  </Button>
                                </>
                              )}
                              {ao.statut === 'closed' && (
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
                <DataTablePagination
                  currentPage={pagination.mesAppelsOffres.currentPage}
                  totalPages={pagination.mesAppelsOffres.totalPages}
                  totalItems={pagination.mesAppelsOffres.totalItems}
                  perPage={pagination.mesAppelsOffres.perPage}
                  onPageChange={(page) => handlePageChange('mesAppelsOffres', page)}
                  onPerPageChange={(perPage) => handlePerPageChange('mesAppelsOffres', perPage)}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* 7. AUDIT LOGS */}
        {activeTab === "audit" && (
          <div className="animate-in fade-in duration-500">
            <AuditHistory />
          </div>
        )}

        </div>
      </main>
      </div>

      {/* Modale Création Responsable */}
      <Dialog open={isCreateResponsableOpen} onOpenChange={setIsCreateResponsableOpen}>
        <DialogContent className="sm:max-w-[600px]"> {/* Modale plus large */}
          <DialogHeader>
            <DialogTitle>Ajouter un PRM</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateResponsable} className="grid gap-4 py-4">

            {/* Ligne 1 : Nom et Email */}
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nom complet</Label>
                  <Input
                    id="name"
                    value={newResponsable.name}
                    onChange={(e) => setNewResponsable({ ...newResponsable, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newResponsable.email}
                    onChange={(e) => setNewResponsable({ ...newResponsable, email: e.target.value })}
                    required
                  />
                </div>
            </div>

            {/* Ligne 2 : Téléphone et Fonction */}
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input
                    id="telephone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="77 123 45 67"
                    value={newResponsable.telephone}
                    onChange={(e) =>
                      setNewResponsable({
                        ...newResponsable,
                        telephone: sanitizePhoneInput(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fonction">Fonction</Label>
                  <Input
                    id="fonction"
                    value={newResponsable.fonction}
                    onChange={(e) => setNewResponsable({ ...newResponsable, fonction: e.target.value })}
                    required
                  />
                </div>
            </div>

            {/* Ligne 3 : Direction et Mot de passe */}
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="direction">Direction</Label>
                  <Input
                    id="direction"
                    value={newResponsable.direction}
                    onChange={(e) => setNewResponsable({ ...newResponsable, direction: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Mot de passe provisoire</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newResponsable.password}
                    onChange={(e) => setNewResponsable({ ...newResponsable, password: e.target.value })}
                    required
                  />
                </div>
            </div>

            <DialogFooter>
              <Button type="submit">Créer le PRM</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modale Modification Responsable */}
      <Dialog open={isEditResponsableOpen} onOpenChange={setIsEditResponsableOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Modifier le PRM</DialogTitle>
          </DialogHeader>
          {editingResponsable && (
            <form onSubmit={handleUpdateResponsable} className="grid gap-4 py-4">
              
              {/* Ligne 1 : Nom et Email */}
              <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Nom complet</Label>
                    <Input
                      value={editingResponsable.name}
                      onChange={(e) => setEditingResponsable({ ...editingResponsable, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={editingResponsable.email}
                      onChange={(e) => setEditingResponsable({ ...editingResponsable, email: e.target.value })}
                      required
                    />
                  </div>
              </div>

              {/* Ligne 2 : Téléphone et Direction */}
              <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Téléphone</Label>
                    <Input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="77 123 45 67"
                      value={editingResponsable.telephone}
                      onChange={(e) =>
                        setEditingResponsable({
                          ...editingResponsable,
                          telephone: sanitizePhoneInput(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Direction</Label>
                    <Input
                      value={editingResponsable.direction}
                      onChange={(e) => setEditingResponsable({ ...editingResponsable, direction: e.target.value })}
                      required
                    />
                  </div>
              </div>

              {/* Ligne 3 : Fonction */}
              <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Fonction</Label>
                    <Input
                      value={editingResponsable.fonction}
                      onChange={(e) => setEditingResponsable({ ...editingResponsable, fonction: e.target.value })}
                      required
                    />
                  </div>
              </div>

              <div className="rounded-lg border border-dashed border-slate-200 p-4 space-y-3">
                <p className="text-sm font-medium text-slate-800">Réinitialiser le mot de passe (optionnel)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Nouveau mot de passe</Label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={editingResponsable.password}
                      onChange={(e) => setEditingResponsable({ ...editingResponsable, password: e.target.value })}
                      placeholder="Laisser vide pour ne pas changer"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Confirmation</Label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={editingResponsable.password_confirmation}
                      onChange={(e) =>
                        setEditingResponsable({ ...editingResponsable, password_confirmation: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="submit">Enregistrer les modifications</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modale Création Gestionnaire */}
      <Dialog open={isCreateGestionnaireOpen} onOpenChange={setIsCreateGestionnaireOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Ajouter un gestionnaire</DialogTitle>
            <DialogDescription>
              Accès à tous les appels d&apos;offres (création, publication, clôture) sans gestion des comptes fournisseurs.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateGestionnaire} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="gestionnaire-name">Nom complet</Label>
              <Input
                id="gestionnaire-name"
                value={newGestionnaire.name}
                onChange={(e) => setNewGestionnaire({ ...newGestionnaire, name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gestionnaire-email">Email</Label>
              <Input
                id="gestionnaire-email"
                type="email"
                value={newGestionnaire.email}
                onChange={(e) => setNewGestionnaire({ ...newGestionnaire, email: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gestionnaire-password">Mot de passe</Label>
              <Input
                id="gestionnaire-password"
                type="password"
                autoComplete="new-password"
                value={newGestionnaire.password}
                onChange={(e) => setNewGestionnaire({ ...newGestionnaire, password: e.target.value })}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit">Créer le gestionnaire</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modale Modification Gestionnaire */}
      <Dialog open={isEditGestionnaireOpen} onOpenChange={setIsEditGestionnaireOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Modifier le gestionnaire</DialogTitle>
          </DialogHeader>
          {editingGestionnaire && (
            <form onSubmit={handleUpdateGestionnaire} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nom complet</Label>
                <Input
                  value={editGestionnaireForm.name}
                  onChange={(e) => setEditGestionnaireForm({ ...editGestionnaireForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editGestionnaireForm.email}
                  onChange={(e) => setEditGestionnaireForm({ ...editGestionnaireForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="rounded-lg border border-dashed border-slate-200 p-4 space-y-3">
                <p className="text-sm font-medium text-slate-800">Réinitialiser le mot de passe (optionnel)</p>
                <div className="grid gap-2">
                  <Label>Nouveau mot de passe</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={editGestionnaireForm.password}
                    onChange={(e) => setEditGestionnaireForm({ ...editGestionnaireForm, password: e.target.value })}
                    placeholder="Laisser vide pour ne pas changer"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Confirmation</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={editGestionnaireForm.password_confirmation}
                    onChange={(e) =>
                      setEditGestionnaireForm({ ...editGestionnaireForm, password_confirmation: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Enregistrer</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modale Détails Fournisseur */}
      <Dialog open={isViewFournisseurOpen} onOpenChange={setIsViewFournisseurOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:w-full sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails du Fournisseur</DialogTitle>
            <DialogDescription className="text-sm">
              Dossier complet : informations administratives et pièces légales déposées en ligne.
            </DialogDescription>
          </DialogHeader>
          {selectedFournisseur && (
            <div className="space-y-5 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Raison Sociale</h4>
                  <p className="text-lg font-medium">{selectedFournisseur.raison_sociale}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">NINEA</h4>
                  <p className="font-mono">{selectedFournisseur.ninea}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Email Contact</h4>
                  <p className="break-all">{selectedFournisseur.email}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Téléphone</h4>
                  <p>{selectedFournisseur.telephone}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Statut</h4>
                  <div className="mt-1">{getFournisseurStatutBadge(selectedFournisseur)}</div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Date d'inscription</h4>
                  <p>{selectedFournisseur.date_inscription}</p>
                </div>
              </div>

              <div className="rounded-lg border bg-slate-50/80 p-4">
                <h4 className="font-semibold text-sm text-muted-foreground mb-1">Références professionnelles</h4>
                {selectedFournisseur.references_professionnelles?.trim() ? (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedFournisseur.references_professionnelles}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Non renseigné</p>
                )}
              </div>

              {/* Documents légaux */}
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm text-slate-800">
                    Documents légaux du fournisseur
                  </h4>
                  {loadingFournisseurLegalDocs && (
                    <span className="text-xs text-muted-foreground">Chargement…</span>
                  )}
                </div>

                {missingLegalCategories(fournisseurLegalDocs).length > 0 && !loadingFournisseurLegalDocs && (
                  <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <span className="font-semibold">Pièces obligatoires manquantes : </span>
                    {missingLegalCategories(fournisseurLegalDocs)
                      .map((c) => legalDocumentLabel(c))
                      .join(", ")}
                  </div>
                )}

                <div className="space-y-2">
                  {ALL_LEGAL_DOCUMENT_UPLOAD_CATEGORIES.map((categorie) => {
                    const docs = fournisseurLegalDocs.filter((d) => d.categorie === categorie);
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
                  {!loadingFournisseurLegalDocs && fournisseurLegalDocs.length === 0 && (
                    <p className="text-xs text-muted-foreground italic text-center py-2">
                      Aucun document légal déposé pour le moment.
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                 <h4 className="font-semibold mb-2 text-sm">Actions rapides</h4>
                 <div className="flex flex-wrap gap-2">
                    {selectedFournisseur.statut === "en_attente" && (
                        <>
                            <Button
                              size="sm"
                              disabled={selectedFournisseur.dossier_complet === false}
                              title={
                                selectedFournisseur.dossier_complet === false
                                  ? "Dossier incomplet — vérifiez les pièces manquantes ci-dessus"
                                  : "Valider le compte"
                              }
                              onClick={() => void handleValidateFournisseur(selectedFournisseur.id)}
                            >
                                Valider le compte
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => void handleRejectFournisseur(selectedFournisseur.id)}>
                                Rejeter
                            </Button>
                        </>
                    )}
                    {selectedFournisseur.statut === "actif" && selectedFournisseur.compte_actif !== false && (
                      <Button size="sm" variant="outline" onClick={() => void handleSuspendFournisseur(selectedFournisseur.id)}>
                        Suspendre le compte
                      </Button>
                    )}
                    {(selectedFournisseur.statut === "rejete" ||
                      (selectedFournisseur.statut === "actif" && selectedFournisseur.compte_actif === false)) && (
                      <Button size="sm" variant="secondary" onClick={() => void handleReactivateFournisseur(selectedFournisseur.id)}>
                        {selectedFournisseur.statut === "rejete" ? "Remettre en examen" : "Réactiver le compte"}
                      </Button>
                    )}
                     <Button variant="outline" size="sm" onClick={() => setIsViewFournisseurOpen(false)}>Fermer</Button>
                 </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modale Détails Appel d'Offre */}
      <Dialog open={isViewAppelOffreOpen} onOpenChange={setIsViewAppelOffreOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:w-full sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de l'Appel d'Offres</DialogTitle>
            <DialogDescription className="text-sm">
              Fiche récapitulative complète de l&apos;appel d&apos;offres.
            </DialogDescription>
          </DialogHeader>
          {selectedAppelOffre && (
            <div className="space-y-5 py-2">
              {/* En-tête : titre + statut + référence */}
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="text-lg font-bold text-slate-800 leading-snug">
                      {selectedAppelOffre.titre}
                    </h3>
                    <p className="font-mono text-xs text-slate-500 mt-1">
                      {selectedAppelOffre.reference}
                    </p>
                  </div>
                  <div className="shrink-0">{getStatutBadge(selectedAppelOffre.statut)}</div>
                </div>
              </div>

              {/* Section : caractéristiques du marché */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Caractéristiques du marché
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Source de financement</p>
                    <p className="font-medium text-slate-800">
                      {selectedAppelOffre.source_financement_label || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Type de marché</p>
                    <p className="font-medium text-slate-800">
                      {selectedAppelOffre.type_marche_label || "—"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium text-muted-foreground">Mode de passation</p>
                    <p className="font-medium text-slate-800">
                      {selectedAppelOffre.mode_passation?.trim() || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section : calendrier */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Calendrier
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Date de publication</p>
                    <p className="font-medium text-slate-800">
                      {formatDate(selectedAppelOffre.date_publication)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Date et heure limite de dépôt</p>
                    <p className="font-medium text-slate-800">
                      {selectedAppelOffre.date_cloture
                        ? new Date(selectedAppelOffre.date_cloture).toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section : description */}
              {selectedAppelOffre.description && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Description
                  </h4>
                  <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                    {selectedAppelOffre.description}
                  </p>
                </div>
              )}

              {/* Section : modalités de dépôt */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Modalités de dépôt des plis (présentiel)
                </h4>
                {selectedAppelOffre.modalites_soumission_physique ? (
                  <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                    {selectedAppelOffre.modalites_soumission_physique}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">Non renseignées.</p>
                )}
              </div>

              {/* Section : cahier des charges (payant / gratuit) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Cahier des charges
                </h4>
                {selectedAppelOffre.cahier_paiement_requis &&
                (selectedAppelOffre.cahier_prix_xof ?? 0) > 0 ? (
                  <p className="text-sm font-medium text-slate-800">
                    Payant —{" "}
                    {Number(selectedAppelOffre.cahier_prix_xof).toLocaleString("fr-FR")} FCFA
                  </p>
                ) : (
                  <p className="text-sm font-medium text-emerald-700">Gratuit (téléchargement direct)</p>
                )}
              </div>

              {/* Section : PRM */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Personne responsable du marché (PRM)
                </h4>
                {selectedAppelOffre.responsable ? (
                  <div className="rounded-md border border-slate-100 bg-white p-3 text-sm">
                    <p className="font-semibold text-slate-800">
                      {selectedAppelOffre.responsable.name}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-1 text-slate-600">
                      {selectedAppelOffre.responsable.email && (
                        <p>
                          <span className="text-xs text-muted-foreground">Email : </span>
                          {selectedAppelOffre.responsable.email}
                        </p>
                      )}
                      {selectedAppelOffre.responsable.fonction && (
                        <p>
                          <span className="text-xs text-muted-foreground">Fonction : </span>
                          {selectedAppelOffre.responsable.fonction}
                        </p>
                      )}
                      {selectedAppelOffre.responsable.direction && (
                        <p className="sm:col-span-2">
                          <span className="text-xs text-muted-foreground">Direction : </span>
                          {selectedAppelOffre.responsable.direction}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <Badge variant="outline" className="text-orange-600 border-orange-200">
                    Non assigné
                  </Badge>
                )}
              </div>

              {/* Section : attribution (si AO clôturé/attribué) */}
              {selectedAppelOffre.attribution_statut &&
                selectedAppelOffre.attribution_statut !== "non_attribue" && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Attribution
                    </h4>
                    <div className="rounded-md border border-emerald-100 bg-emerald-50/60 p-3 text-sm space-y-1">
                      {selectedAppelOffre.attributaire_nom && (
                        <p>
                          <span className="text-xs text-muted-foreground">Attributaire : </span>
                          <span className="font-medium text-slate-800">
                            {selectedAppelOffre.attributaire_nom}
                          </span>
                        </p>
                      )}
                      {(selectedAppelOffre.attribution_montant_xof ?? 0) > 0 && (
                        <p>
                          <span className="text-xs text-muted-foreground">Montant : </span>
                          <span className="font-medium text-slate-800">
                            {Number(selectedAppelOffre.attribution_montant_xof).toLocaleString("fr-FR")} FCFA
                          </span>
                        </p>
                      )}
                      {selectedAppelOffre.attribution_date && (
                        <p>
                          <span className="text-xs text-muted-foreground">Date : </span>
                          <span className="font-medium text-slate-800">
                            {formatDate(selectedAppelOffre.attribution_date)}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                )}

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsViewAppelOffreOpen(false);
                    navigate(`/appels-offres/${selectedAppelOffre.id}`);
                  }}
                >
                  Ouvrir la fiche publique
                </Button>
                <Button variant="default" onClick={() => setIsViewAppelOffreOpen(false)}>
                  Fermer
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modale Création Appel d'Offre */}
      <Dialog open={isCreateAOOpen} onOpenChange={setIsCreateAOOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:w-full sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer un Appel d'Offre</DialogTitle>
            <DialogDescription className="text-sm">
              L&apos;avis et le cahier sont enregistrés en même temps que le brouillon. Si l&apos;envoi échoue, rien n&apos;est créé.
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
                Référence unique saisie manuellement (responsable ou administrateur).
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
                Obligatoire avant publication : affichage sur la fiche publique. Sans texte, un message neutre apparaît sur le portail.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-sm font-medium">Cahier des charges payant</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    L&apos;avis d&apos;appel d&apos;offres reste gratuit. Le montant s&apos;applique uniquement au téléchargement du cahier des charges (Wave / Orange Money).
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
                  <Label htmlFor="cahier_prix_xof">Montant (FCFA)</Label>
                  <Input
                    id="cahier_prix_xof"
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
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateAOOpen(false)}
                disabled={creatingTender}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={creatingTender}>
                {creatingTender ? "Création..." : "Créer le brouillon"}
              </Button>
            </DialogFooter>
          </form>
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
            <Label htmlFor="admin_modalites_depot">Lieu, horaires, contact du service des marchés</Label>
            <Textarea
              id="admin_modalites_depot"
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

      {/* Modale Candidatures */}
      <Dialog open={isViewCandidatesOpen} onOpenChange={setIsViewCandidatesOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Candidatures reçues
              {selectedAOForCandidatures && (
                <Badge variant="outline" className="font-normal text-muted-foreground">
                  {selectedAOForCandidatures.reference}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Liste des candidatures associées à l’appel d'offres sélectionné.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {candidaturesAO.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-muted-foreground">Aucune candidature reçue pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {candidaturesAO.map(cand => (
                  <div key={cand.id} className="flex flex-col md:flex-row md:items-center justify-between border p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition-all">
                    <div className="space-y-1 mb-4 md:mb-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg text-slate-800">{cand.fournisseur?.nom_entreprise || 'Entreprise inconnue'}</h4>
                        <Badge variant={cand.statut === 'accepted' ? 'default' : cand.statut === 'rejected' ? 'destructive' : 'secondary'}>
                          {cand.statut === 'submitted' ? 'Soumise' : cand.statut === 'accepted' ? 'Acceptée' : cand.statut === 'rejected' ? 'Rejetée' : cand.statut}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 flex items-center gap-2">
                        <span className="font-medium">Contact:</span> {cand.fournisseur?.email_contact || 'N/A'}
                      </p>
                      <p className="text-sm text-slate-500">
                        Soumis le {cand.date_soumission ? new Date(cand.date_soumission).toLocaleDateString() : 'Date inconnue'} {cand.date_soumission ? `à ${new Date(cand.date_soumission).toLocaleTimeString()}` : ''}
                      </p>
                      {cand.montant_propose && (
                        <p className="text-sm font-medium text-primary">
                          Offre: {Number(cand.montant_propose).toLocaleString()} FCFA
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
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

      {/* Modale Voir Dossier */}
      <Dialog open={isViewDossierOpen} onOpenChange={(open) => {
        setIsViewDossierOpen(open);
        if (!open) {
          setSelectedCandidature(null);
          setLegalDocuments([]);
          setCandidatureDocuments([]);
          setComments([]);
          setNewComment("");
          setSelectedDocumentId(null);
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
                                          const response = await api.get(`/api/documents/${doc.id}/download`, {
                                            responseType: 'blob'
                                          });
                                          const blob = new Blob([response.data]);
                                          const contentType = response.headers['content-type'] || doc.type_fichier || 'application/pdf';
                                          if (contentType.includes('pdf') || contentType.includes('image')) {
                                            const url = window.URL.createObjectURL(blob);
                                            window.open(url, '_blank', 'noopener,noreferrer');
                                            setTimeout(() => window.URL.revokeObjectURL(url), 100);
                                          } else {
                                            const url = window.URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.target = '_blank';
                                            link.rel = 'noopener noreferrer';
                                            const extension = contentType.includes('word') ? '.docx' : contentType.includes('excel') ? '.xlsx' : '.pdf';
                                            link.download = doc.nom_fichier || `document${extension}`;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            window.URL.revokeObjectURL(url);
                                          }
                                        } catch (error: unknown) {
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

              {/* Documents de candidature */}
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
                                          const response = await api.get(`/api/documents/${doc.id}/download`, {
                                            responseType: 'blob'
                                          });
                                          const blob = new Blob([response.data]);
                                          const contentType = response.headers['content-type'] || doc.type_fichier || 'application/pdf';
                                          if (contentType.includes('pdf') || contentType.includes('image')) {
                                            const url = window.URL.createObjectURL(blob);
                                            window.open(url, '_blank', 'noopener,noreferrer');
                                            setTimeout(() => window.URL.revokeObjectURL(url), 100);
                                          } else {
                                            const url = window.URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.target = '_blank';
                                            link.rel = 'noopener noreferrer';
                                            const extension = contentType.includes('word') ? '.docx' : contentType.includes('excel') ? '.xlsx' : '.pdf';
                                            link.download = doc.nom_fichier || `document${extension}`;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            window.URL.revokeObjectURL(url);
                                          }
                                        } catch (error: unknown) {
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
                        <div key={comment.id} className={`p-3 rounded-lg border ${comment.user?.id === authUser?.id ? 'bg-primary/5 border-primary/20' : 'bg-slate-50 border-slate-200'}`}>
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

      {/* Modale Assignation AO */}
      <Dialog open={isAssignAOOpen} onOpenChange={(open) => {
        setIsAssignAOOpen(open);
        if (!open) {
          setSelectedAOForAssign(null);
          setSelectedResponsableId(null);
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedAOForAssign?.responsable_marche_id
                ? "Changer le PRM assigné"
                : "Assigner un Appel d'Offre"}
            </DialogTitle>
            <DialogDescription>
              {selectedAOForAssign?.responsable_marche_id
                ? "Sélectionnez un autre responsable de marché pour cet appel d'offres."
                : "Choisissez la personne responsable du marché (PRM) en charge de cet appel d'offres."}
            </DialogDescription>
          </DialogHeader>
          {selectedAOForAssign && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm font-semibold text-slate-700 mb-1">Appel d'offres</p>
                <p className="text-lg font-bold text-slate-800">{selectedAOForAssign.titre}</p>
                <p className="text-xs text-slate-500 font-mono mt-1">{selectedAOForAssign.reference}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="responsable-select">Sélectionner une personne responsable du marché (PRM)</Label>
                <Select 
                  value={selectedResponsableId?.toString() || ""} 
                  onValueChange={(value) => setSelectedResponsableId(parseInt(value))}
                >
                  <SelectTrigger id="responsable-select">
                    <SelectValue placeholder="Choisir une personne responsable du marché (PRM)..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(responsables) && responsables.map((r) => (
                      <SelectItem key={r.id} value={r.id.toString()}>
                        {r.user?.name || `PRM #${r.id}`} - {r.direction}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {Array.isArray(responsables) && responsables.length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucune personne responsable du marché (PRM) disponible.</p>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAssignAOOpen(false)}>Annuler</Button>
                <Button 
                  onClick={handleAssignAO} 
                  disabled={
                    !selectedResponsableId ||
                    selectedResponsableId === selectedAOForAssign.responsable_marche_id
                  }
                >
                  {selectedAOForAssign.responsable_marche_id ? "Confirmer le changement" : "Assigner"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mon profil (aperçu compte admin) */}
      <Dialog open={isAccountProfileOpen} onOpenChange={setIsAccountProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mon profil</DialogTitle>
            <DialogDescription>
              Informations du compte administrateur connecté.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-2">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/12 text-primary flex items-center justify-center text-xl font-semibold shrink-0">
                {authUser?.name?.trim()?.charAt(0)?.toLocaleUpperCase("fr") ?? "?"}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate">{authUser?.name ?? "—"}</p>
                <p className="text-sm text-slate-500 break-all">{authUser?.email ?? "—"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-primary/35 text-primary">
                    Administrateur
                  </Badge>
                  {authUser?.is_active === false ? (
                    <Badge variant="destructive">Compte désactivé</Badge>
                  ) : (
                    <Badge variant="secondary">Compte actif</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-white">
              <div className="grid grid-cols-1 gap-3 p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-500">ID</span>
                  <span className="font-mono text-slate-800">{authUser?.id ?? "—"}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-500">Rôle technique</span>
                  <span className="font-mono text-slate-800">{authUser?.role?.name ?? "—"}</span>
                </div>
                {authUser?.telephone && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">Téléphone</span>
                    <span className="text-slate-800">{authUser.telephone}</span>
                  </div>
                )}
                {(authUser as any)?.direction && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">Direction</span>
                    <span className="text-slate-800">{String((authUser as any).direction)}</span>
                  </div>
                )}
                {(authUser as any)?.fonction && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">Fonction</span>
                    <span className="text-slate-800">{String((authUser as any).fonction)}</span>
                  </div>
                )}
                {authUser?.created_at && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">Créé le</span>
                    <span className="text-slate-800">{new Date(authUser.created_at).toLocaleString("fr-FR")}</span>
                  </div>
                )}
                {authUser?.last_login_at && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">Dernière connexion</span>
                    <span className="text-slate-800">{new Date(authUser.last_login_at).toLocaleString("fr-FR")}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (!authUser?.email) return;
                  navigator.clipboard?.writeText(authUser.email);
                }}
              >
                Copier l’email
              </Button>
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  setIsAccountProfileOpen(false);
                  setIsSettingsOpen(true);
                }}
              >
                Paramètres
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setIsAccountProfileOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modale Paramètres */}
      <Dialog
        open={isSettingsOpen}
        onOpenChange={(open) => {
          setIsSettingsOpen(open);
          if (!open) setPasswordData({ current: "", new: "", confirm: "" });
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Paramètres du compte</DialogTitle>
            <DialogDescription>
              Modifiez votre mot de passe pour sécuriser votre compte administrateur.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePassword} className="grid gap-4 py-4">
             <div className="grid gap-2">
              <Label>Mot de passe actuel</Label>
              <Input 
                type="password" 
                value={passwordData.current}
                onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
                required 
              />
            </div>
            <div className="grid gap-2">
              <Label>Nouveau mot de passe</Label>
              <Input 
                type="password"
                value={passwordData.new}
                onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
                required 
              />
            </div>
            <div className="grid gap-2">
              <Label>Confirmer le nouveau mot de passe</Label>
              <Input 
                type="password"
                value={passwordData.confirm}
                onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
                required 
              />
            </div>
            <DialogFooter>
              <Button type="submit">Mettre à jour</Button>
            </DialogFooter>
          </form>
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
};

export default AdminDashboard;