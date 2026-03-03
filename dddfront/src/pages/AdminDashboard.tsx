import React, { useState, useEffect, useCallback } from "react";
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
  Shield,
  Settings,
  Activity,
  AlertCircle,
  UserCheck,
  UserX,
  LogOut,
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
  Download
} from "lucide-react";
import { motion } from "framer-motion";
import { API_BASE_URL } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";


// ============================================\n
// INTERFACES\n
// ============================================\n

interface DashboardStats {
  totalFournisseurs: number;
  fournisseursActifs: number;
  fournisseursEnAttente: number;
  totalAppelsOffres: number;
  appelsOffresActifs: number;
  appelsOffresClotures: number;
  totalCandidatures: number;
  candidaturesEnCours: number;
  candidaturesRetenues: number;
  candidaturesRejetees: number;
  totalResponsables: number;
}

interface AppelOffre {
  id: number;
  titre: string;
  reference: string;
  statut: "draft" | "published" | "closed" | "archived"; 
  date_publication: string;
  date_cloture: string; 
  nombre_candidatures: number;
  responsable: {
    name: string;
  };
}

interface Fournisseur {
  id: number;
  raison_sociale: string; 
  ninea: string;
  email: string; 
  telephone: string;
  statut: "actif" | "en_attente" | "rejete"; 
  date_inscription: string;
  nombre_candidatures: number;
  domaines_activite?: string[];
}

interface ResponsableMarche {
  id: number;
  user_id: number;
  departement: string;
  fonction: string;
  telephone: string;
  user?: {
    name: string;
    email: string;
  };
  nombre_appels_offres?: number;
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
  titre: string;
  description: string;
  date_limite_depot: string;
  statut: 'draft' | 'published' | 'closed' | 'archived';
  candidatures_count?: number;
  responsable_marche_id?: number | null;
  responsable?: {
    name: string;
  } | null;
}

interface CandidatureAdmin {
  id: number;
  fournisseur: {
    id: number;
    nom_entreprise: string;
    email_contact: string;
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

  // ============================================
  // COMPOSANT PRINCIPAL
  // ============================================

const AdminDashboard: React.FC = () => {
  const [isCreateResponsableOpen, setIsCreateResponsableOpen] = useState(false);
  const [isEditResponsableOpen, setIsEditResponsableOpen] = useState(false);
  const [editingResponsable, setEditingResponsable] = useState<any>(null);
  const [isViewFournisseurOpen, setIsViewFournisseurOpen] = useState(false);
  const [selectedFournisseur, setSelectedFournisseur] = useState<Fournisseur | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });
  const [newResponsable, setNewResponsable] = useState({
    name: "",
    email: "",
    password: "",
    departement: "",
    fonction: "",
    telephone: "",
  });
  const [selectedAppelOffre, setSelectedAppelOffre] = useState<AppelOffre | null>(null);
  const [isViewAppelOffreOpen, setIsViewAppelOffreOpen] = useState(false);
  
  // États pour la gestion des appels d'offres (comme responsable)
  const [mesAppelsOffres, setMesAppelsOffres] = useState<AppelOffreAdmin[]>([]);
  const [isCreateAOOpen, setIsCreateAOOpen] = useState(false);
  const [newTender, setNewTender] = useState({
    titre: "",
    description: "",
    date_limite_depot: "",
  });
  const [selectedAOForCandidatures, setSelectedAOForCandidatures] = useState<AppelOffreAdmin | null>(null);
  const [candidaturesAO, setCandidaturesAO] = useState<CandidatureAdmin[]>([]);
  const [isViewCandidatesOpen, setIsViewCandidatesOpen] = useState(false);
  const [isViewDossierOpen, setIsViewDossierOpen] = useState(false);
  const [selectedCandidature, setSelectedCandidature] = useState<CandidatureAdmin | null>(null);
  const [legalDocuments, setLegalDocuments] = useState<DocumentLegal[]>([]);
  const [candidatureDocuments, setCandidatureDocuments] = useState<DocumentLegal[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // États pour l'assignation d'AO
  const [isAssignAOOpen, setIsAssignAOOpen] = useState(false);
  const [selectedAOForAssign, setSelectedAOForAssign] = useState<AppelOffreAdmin | null>(null);
  const [selectedResponsableId, setSelectedResponsableId] = useState<number | null>(null);

  const { user: authUser, api, logout } = useAuth();
  const navigate = useNavigate();  
  const getRoleName = (u: any) => {
    const raw = typeof u?.role === "string" ? u.role : u?.role?.name;
    return raw?.toString().trim().toUpperCase();
  };

  // États principaux
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("vue-ensemble");

  // Données du dashboard
  const [stats, setStats] = useState<DashboardStats>({
    totalFournisseurs: 0,
    fournisseursActifs: 0,
    fournisseursEnAttente: 0,
    totalAppelsOffres: 0,
    appelsOffresActifs: 0,
    appelsOffresClotures: 0,
    totalCandidatures: 0,
    candidaturesEnCours: 0,
    candidaturesRetenues: 0,
    candidaturesRejetees: 0,
    totalResponsables: 0,
  });

  const [appelsOffres, setAppelsOffres] = useState<AppelOffre[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [responsables, setResponsables] = useState<ResponsableMarche[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  // États de filtres et recherche
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatut, setFilterStatut] = useState("tous");

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
  const updatePaginationState = (key: keyof typeof pagination, meta: any) => {
    setPagination(prev => ({
      ...prev,
      [key]: {
        currentPage: meta.current_page,
        totalPages: meta.last_page,
        totalItems: meta.total,
        perPage: meta.per_page,
      }
    }));
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!api) {
        throw new Error("API client non disponible.");
      }

      const statsResponse = await api.get('/api/admin/dashboard-stats');
      setStats(statsResponse.data);

      const appelsOffresResponse = await api.get('/api/admin/appels-offres-dashboard', { params: { per_page: pagination.appelsOffres.perPage } });
      // Gestion de la pagination Laravel (data.data) ou réponse directe (data)
      if (appelsOffresResponse.data.data) {
        setAppelsOffres(appelsOffresResponse.data.data);
        updatePaginationState('appelsOffres', appelsOffresResponse.data);
      } else {
        setAppelsOffres(appelsOffresResponse.data);
      }

      const fournisseursResponse = await api.get('/api/admin/fournisseurs-dashboard', { params: { per_page: pagination.fournisseurs.perPage } });
      if (fournisseursResponse.data.data) {
        setFournisseurs(fournisseursResponse.data.data);
        updatePaginationState('fournisseurs', fournisseursResponse.data);
      } else {
        setFournisseurs(fournisseursResponse.data);
      }

      const responsablesResponse = await api.get('/api/admin/responsables-dashboard', { params: { per_page: pagination.responsables.perPage } });
      if (responsablesResponse.data.data) {
        setResponsables(responsablesResponse.data.data);
        updatePaginationState('responsables', responsablesResponse.data);
      } else {
        setResponsables(responsablesResponse.data);
      }

      const suggestionsResponse = await api.get('/api/admin/suggestions');
      setSuggestions(suggestionsResponse.data);
      const activitiesResponse = await api.get('/api/admin/recent-activities');
      setRecentActivities(activitiesResponse.data);

    } catch (err: any) {
      console.error("Erreur lors du chargement des données:", err);
      const errorMessage = err.response?.data?.message || "Impossible de charger les données.";
      setError(errorMessage);
      toast({
        title: "Erreur de chargement",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [api]); // Retrait de 'pagination' des dépendances pour éviter la boucle infinie si on ne fait pas attention

  useEffect(() => {
    const roleName = getRoleName(authUser);
    const isAdmin = roleName === "ADMIN" || (authUser as any)?.role_id === 1;
  
    if (!authUser || !isAdmin) {
      setError("Accès non autorisé.");
      setLoading(false);
      return;
    }
  
    fetchDashboardData();
  }, [authUser, fetchDashboardData]);

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
    };

    const config = variants[statut] || { variant: "outline" as const, label: statut };
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
    try {
      if (!api) throw new Error("API non disponible");
      
      await api.post(`${API_BASE_URL}/api/admin/responsables`, {
        name: newResponsable.name,
        email: newResponsable.email,
        password: newResponsable.password,
        departement: newResponsable.departement,
        fonction: newResponsable.fonction,
        telephone: newResponsable.telephone,
      });

      toast({ title: "Succès", description: "Responsable créé avec succès." });
      
      setIsCreateResponsableOpen(false);
      setNewResponsable({ name: "", email: "", password: "", departement: "", fonction: "", telephone: "" });
      fetchDashboardData();
    } catch (error: any) {
      console.error("Erreur création responsable:", error);
      toast({ title: "Erreur", description: "Erreur lors de la création.", variant: "destructive" });
    }
  };

  const handleDeleteResponsable = async (id: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce responsable ?")) return;

    try {
      if (!api) throw new Error("API non disponible");
      await api.delete(`${API_BASE_URL}/api/admin/responsables/${id}`);
      toast({ title: "Succès", description: "Responsable supprimé." });
      fetchDashboardData();
    } catch (error: any) {
      toast({ title: "Erreur", description: "Impossible de supprimer.", variant: "destructive" });
    }
  };

  const handleEditClick = (responsable: ResponsableMarche) => {
    setEditingResponsable({
      id: responsable.id,
      name: responsable.user?.name || "",
      email: responsable.user?.email || "",
      departement: responsable.departement,
      fonction: responsable.fonction,
      telephone: responsable.telephone,
    });
    setIsEditResponsableOpen(true);
  };

  const handleUpdateResponsable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!api) throw new Error("API non disponible");
      
      await api.put(`${API_BASE_URL}/api/admin/responsables/${editingResponsable.id}`, {
        name: editingResponsable.name,
        email: editingResponsable.email,
        departement: editingResponsable.departement,
        fonction: editingResponsable.fonction,
        telephone: editingResponsable.telephone,
      });

      toast({ title: "Succès", description: "Responsable mis à jour." });
      setIsEditResponsableOpen(false);
      fetchDashboardData();
    } catch (error: any) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour.", variant: "destructive" });
    }
  };

  const getActivityIcon = (action: string) => {
    const icons: Record<string, any> = {
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
    } catch (error: any) {
      toast({ title: "Erreur", description: "Impossible de valider.", variant: "destructive" });
    }
  };

  const handleRejectFournisseur = async (fournisseurId: number) => {
    try {
      if (!api) throw new Error("API client non disponible.");
      await api.post(`${API_BASE_URL}/api/admin/fournisseurs/${fournisseurId}/reject`);
      toast({ title: "Succès", description: "Fournisseur rejeté.", variant: "destructive" });
      fetchDashboardData();
    } catch (error: any) {
      toast({ title: "Erreur", description: "Impossible de rejeter.", variant: "destructive" });
    }
  };

  const handleViewFournisseur = (fournisseur: Fournisseur) => {
    setSelectedFournisseur(fournisseur);
    setIsViewFournisseurOpen(true);
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
        setSuggestions(prev => prev.map(s => s.id === suggestionId ? { ...s, statut: status as any } : s));
      } catch (error: any) {
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
    } catch (error: any) {
        const message = error.response?.data?.message || "Erreur lors de la mise à jour du mot de passe.";
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
      let rawData: any[] = [];
      
      if (Array.isArray(data)) {
        rawData = data;
      } else if (data && Array.isArray(data.data)) {
        rawData = data.data;
        // Mise à jour de la pagination si présente
        updatePaginationState('mesAppelsOffres', data);
      }

      // Mapper les données pour assurer la compatibilité avec l'interface AppelOffreAdmin
      // Notamment pour le champ 'responsable' qui peut arriver comme 'responsable_marche'
      const mappedData = rawData.map((item: any) => ({
        ...item,
        responsable: item.responsable || (item.responsable_marche?.user ? { name: item.responsable_marche.user.name } : null)
      }));

      setMesAppelsOffres(mappedData);
    } catch (error: any) {
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
      await api.post("/api/appels-offres", {
        ...newTender,
        statut: 'draft'
      });
      toast({ title: "Succès", description: "Appel d'offre créé en brouillon." });
      setIsCreateAOOpen(false);
      setNewTender({ titre: "", description: "", date_limite_depot: "" });
      loadMesAppelsOffres();
    } catch (error: any) {
      console.error("Erreur création:", error);
      const message = error.response?.data?.message || "Erreur lors de la création.";
      if (error.response?.data?.errors) {
         const errors = Object.values(error.response.data.errors).flat().join('\n');
         toast({ title: "Erreur de validation", description: errors, variant: "destructive" });
      } else {
         toast({ title: "Erreur", description: message, variant: "destructive" });
      }
    }
  };

  const handlePublish = async (id: number) => {
    if (!api) return;
    try {
      await api.post(`/api/appels-offres/${id}/publish`);
      toast({ title: "Publié", description: "L'appel d'offre est maintenant visible." });
      loadMesAppelsOffres();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de publier.", variant: "destructive" });
    }
  };

  const handleClose = async (id: number) => {
    if (!api) return;
    try {
      await api.post(`/api/appels-offres/${id}/close`);
      toast({ title: "Clôturé", description: "L'appel d'offre est fermé aux candidatures." });
      loadMesAppelsOffres();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de clôturer.", variant: "destructive" });
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
    } catch (error: any) {
      console.error("Erreur évaluation:", error);
      const message = error.response?.data?.message || "Action impossible.";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    }
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
    } catch (error: any) {
      console.error("Erreur chargement documents:", error);
      toast({ 
        title: "Erreur", 
        description: error.response?.data?.message || "Impossible de charger les documents.", 
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
    } catch (error: any) {
      console.error("Erreur ajout commentaire:", error);
      toast({
        title: "Erreur",
        description: error.response?.data?.message || "Impossible d'ajouter le commentaire.",
        variant: "destructive"
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const getStatutBadgeAO = (statut: string) => {
    const map: Record<string, any> = {
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
    try {
      await api.post(`/api/appels-offres/${selectedAOForAssign.id}/assign`, {
        responsable_marche_id: selectedResponsableId
      });
      toast({ 
        title: "Succès", 
        description: "L'appel d'offre a été assigné au responsable." 
      });
      setIsAssignAOOpen(false);
      setSelectedAOForAssign(null);
      setSelectedResponsableId(null);
      loadMesAppelsOffres();
    } catch (error: any) {
      console.error("Erreur assignation:", error);
      const message = error.response?.data?.message || "Impossible d'assigner l'appel d'offre.";
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

  // ============================================
  // PAGINATION HANDLERS
  // ============================================

  const handlePageChange = async (type: keyof typeof pagination, page: number) => {
    if (!api) return;

    if (type === 'mesAppelsOffres') {
      loadMesAppelsOffres(page);
      return;
    }

    try {
      setLoading(true);
      const perPage = pagination[type].perPage;
      let endpoint = '';
      
      switch(type) {
        case 'appelsOffres':
          endpoint = '/api/admin/appels-offres-dashboard';
          break;
        case 'fournisseurs':
          endpoint = '/api/admin/fournisseurs-dashboard';
          break;
        case 'responsables':
          endpoint = '/api/admin/responsables-dashboard';
          break;
      }

      if (endpoint) {
        const response = await api.get(endpoint, {
          params: { page, per_page: perPage, search: searchTerm, statut: filterStatut }
        });
        
        if (response.data.data) {
          switch(type) {
            case 'appelsOffres': setAppelsOffres(response.data.data); break;
            case 'fournisseurs': setFournisseurs(response.data.data); break;
            case 'responsables': setResponsables(response.data.data); break;
          }
          updatePaginationState(type, response.data);
        }
      }
    } catch (error) {
      console.error("Erreur pagination:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePerPageChange = async (type: keyof typeof pagination, perPage: number) => {
    setPagination(prev => ({
      ...prev,
      [type]: { ...prev[type], perPage, currentPage: 1 }
    }));
    // Recharger avec la nouvelle limite (page 1)
    if (type === 'mesAppelsOffres') {
      loadMesAppelsOffres(1, perPage);
    } else {
      handlePageChange(type, 1);
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
  const isAdmin = roleName === "ADMIN" || (authUser as any)?.role_id === 1;

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
      subtitle: `${stats.fournisseursActifs} actifs • ${stats.fournisseursEnAttente} en attente`,
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Appels d'offres",
      value: stats.totalAppelsOffres,
      subtitle: `${stats.appelsOffresActifs} actifs • ${stats.appelsOffresClotures} clôturés`,
      icon: FileText,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Candidatures",
      value: stats.totalCandidatures,
      subtitle: `${stats.candidaturesRetenues} retenues • ${stats.candidaturesRejetees} rejetées`,
      icon: CheckCircle,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Responsables",
      value: stats.totalResponsables,
      subtitle: "Comptes actifs",
      icon: User,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  // ============================================
  // RENDU PRINCIPAL AVEC SIDEBAR
  // ============================================

  return (
    <div className="min-h-screen flex bg-slate-100">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-50 flex flex-col shadow-sm">
        
        {/* EN-TÊTE : PROFIL UTILISATEUR (Déplacé en haut) */}
        <div className="p-6 border-b border-slate-100 flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl mb-3">
              {authUser?.name?.charAt(0).toUpperCase()}
            </div>
            <h2 className="font-bold text-lg text-slate-800">{authUser?.name}</h2>
            <p className="text-xs text-muted-foreground">{authUser?.email}</p>
            <Badge variant="outline" className="mt-2 text-xs border-blue-200 text-blue-600 bg-blue-50">
              Administrateur
            </Badge>
            
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          <Button
            variant={activeTab === "vue-ensemble" ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === "vue-ensemble" ? "bg-primary/10 text-primary" : "text-slate-600"}`}
            onClick={() => setActiveTab("vue-ensemble")}
          >
            <LayoutDashboard className="w-4 h-4 mr-3" />
            Vue d'ensemble
          </Button>
          
          <Button
            variant={activeTab === "appels-offres" ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === "appels-offres" ? "bg-primary/10 text-primary" : "text-slate-600"}`}
            onClick={() => setActiveTab("appels-offres")}
          >
            <Briefcase className="w-4 h-4 mr-3" />
            Appels d'offres
          </Button>

          <Button
            variant={activeTab === "fournisseurs" ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === "fournisseurs" ? "bg-primary/10 text-primary" : "text-slate-600"}`}
            onClick={() => setActiveTab("fournisseurs")}
          >
            <Building2 className="w-4 h-4 mr-3" />
            Fournisseurs
          </Button>

          <Button
            variant={activeTab === "responsables" ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === "responsables" ? "bg-primary/10 text-primary" : "text-slate-600"}`}
            onClick={() => setActiveTab("responsables")}
          >
            <Users className="w-4 h-4 mr-3" />
            Responsables
          </Button>

          <Button
            variant={activeTab === "suggestions" ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === "suggestions" ? "bg-primary/10 text-primary" : "text-slate-600"}`}
            onClick={() => setActiveTab("suggestions")}
          >
            <MessageSquare className="w-4 h-4 mr-3" />
            Suggestions
          </Button>

          <Button
            variant={activeTab === "gestion-ao" ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === "gestion-ao" ? "bg-primary/10 text-primary" : "text-slate-600"}`}
            onClick={() => {
              setActiveTab("gestion-ao");
              loadMesAppelsOffres();
            }}
          >
            <Megaphone className="w-4 h-4 mr-3" />
            Gestion Appels d'Offres
          </Button>
        </nav>
 {/* PIED DE PAGE : PARAMÈTRES ET DÉCONNEXION */}
 <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
            <Button 
                variant="outline" 
                className="flex-1 border-slate-200 hover:bg-white text-slate-600" 
                onClick={() => setIsSettingsOpen(true)}
                title="Paramètres"
            >
                <Settings className="w-4 h-4" />
            </Button>
            <Button 
                variant="destructive" 
                className="flex-1 hover:bg-red-600" 
                onClick={handleLogout}
                title="Déconnexion"
            >
                <LogOut className="w-4 h-4" />
            </Button>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        
        {/* En-tête de section dynamique */}
        <div className="flex justify-between items-center mb-8">
           <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {activeTab === 'vue-ensemble' && "Vue d'ensemble"}
                {activeTab === 'appels-offres' && "Gestion des Appels d'Offres"}
                {activeTab === 'fournisseurs' && "Annuaire Fournisseurs"}
                {activeTab === 'responsables' && "Équipe Responsables Marché"}
                {activeTab === 'suggestions' && "Boîte à idées"}
                {activeTab === 'gestion-ao' && "Gestion Appels d'Offres"}
              </h1>
              <p className="text-slate-500 mt-1">
                {activeTab === 'vue-ensemble' && "Métriques clés et activités récentes"}
                {activeTab === 'appels-offres' && "Suivez et gérez tous les appels d'offres de la plateforme"}
                {activeTab === 'fournisseurs' && "Gérez les inscriptions et validations des fournisseurs"}
                {activeTab === 'responsables' && "Administrez les comptes des responsables de marché"}
                {activeTab === 'suggestions' && "Consultez et traitez les retours des fournisseurs"}
                {activeTab === 'gestion-ao' && "Créez, publiez et gérez vos appels d'offres et candidatures"}
              </p>
           </div>
           
           {/* Actions contextuelles */}
           <div className="flex gap-2">
              {activeTab === 'responsables' && (
                  <Button onClick={() => setIsCreateResponsableOpen(true)}>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Nouveau Responsable
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
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                                className="bg-green-600 hover:bg-green-700 h-8 px-2"
                                onClick={() => handleValidateFournisseur(fournisseur.id)}
                                title="Valider"
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
                        <TableHead className="font-semibold">Responsable</TableHead>
                        <TableHead className="text-right font-semibold">Candidatures</TableHead>
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
                          <TableCell className="text-right">
                            <Badge variant="secondary" className="font-mono">{ao.nombre_candidatures}</Badge>
                          </TableCell>
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
                              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                  Aucun appel d'offre trouvé.
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
              <CardContent className="p-0">
                <div className="rounded-lg border border-slate-100 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Raison sociale</TableHead>
                        <TableHead>NINEA</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Candidatures</TableHead>
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
                          <TableCell>{getStatutBadge(f.statut)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{f.nombre_candidatures}</Badge>
                          </TableCell>
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
                                     <span className="text-xs text-muted-foreground">Département</span>
                                     <span className="font-medium">{r.departement}</span>
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



        {/* 5. SUGGESTIONS */}
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
                        <TableHead className="font-semibold">Responsable</TableHead>
                        <TableHead className="font-semibold">Candidatures</TableHead>
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!Array.isArray(mesAppelsOffres) || mesAppelsOffres.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <Briefcase className="w-8 h-8 text-slate-300" />
                              <p>Aucun appel d'offre créé pour le moment.</p>
                              <Button variant="link" onClick={() => setIsCreateAOOpen(true)} className="text-primary">
                                Créer votre premier appel d'offre
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : mesAppelsOffres.map((ao) => (
                        <TableRow key={ao.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-mono text-xs font-medium text-slate-600">{ao.reference}</TableCell>
                          <TableCell className="font-medium text-slate-800">{ao.titre}</TableCell>
                          <TableCell className="text-slate-600">{new Date(ao.date_limite_depot).toLocaleDateString()}</TableCell>
                          <TableCell>{getStatutBadgeAO(ao.statut)}</TableCell>
                          <TableCell>
                            {ao.responsable?.name ? (
                              <span className="text-sm text-slate-700">{ao.responsable.name}</span>
                            ) : (
                              <Badge variant="outline" className="text-orange-600 border-orange-200">Non assigné</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-400" />
                              <span className="text-sm font-medium">{ao.candidatures_count || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {!ao.responsable_marche_id && (
                                <Button size="sm" variant="outline" className="h-8 border border-primary text-primary hover:bg-primary/10" onClick={() => handleOpenAssignModal(ao)} title="Assigner à un responsable">
                                  <User className="w-3 h-3 mr-1" /> Assigner
                                </Button>
                              )}
                              {ao.statut === 'draft' && (
                                <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700" onClick={() => handlePublish(ao.id)} title="Publier">
                                  <Megaphone className="w-3 h-3 mr-1" /> Publier
                                </Button>
                              )}
                              {ao.statut === 'published' && (
                                <Button size="sm" variant="secondary" className="h-8 border border-slate-200" onClick={() => handleClose(ao.id)} title="Clôturer">
                                  <Archive className="w-3 h-3 mr-1" /> Clôturer
                                </Button>
                              )}
                              <Button size="sm" variant="outline" className="h-8" onClick={() => handleViewCandidatures(ao)} title="Voir les candidatures">
                                <Eye className="w-3 h-3 mr-1" /> Candidatures
                              </Button>
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

      </main>

      {/* Modale Création Responsable */}
      <Dialog open={isCreateResponsableOpen} onOpenChange={setIsCreateResponsableOpen}>
        <DialogContent className="sm:max-w-[600px]"> {/* Modale plus large */}
          <DialogHeader>
            <DialogTitle>Ajouter un Responsable Marché</DialogTitle>
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
                    value={newResponsable.telephone}
                    onChange={(e) => setNewResponsable({ ...newResponsable, telephone: e.target.value })}
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

            {/* Ligne 3 : Département et Mot de passe */}
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="departement">Département</Label>
                  <Input
                    id="departement"
                    value={newResponsable.departement}
                    onChange={(e) => setNewResponsable({ ...newResponsable, departement: e.target.value })}
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
              <Button type="submit">Créer le compte</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modale Modification Responsable */}
      <Dialog open={isEditResponsableOpen} onOpenChange={setIsEditResponsableOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Modifier le Responsable</DialogTitle>
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

              {/* Ligne 2 : Téléphone et Département */}
              <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Téléphone</Label>
                    <Input
                      value={editingResponsable.telephone}
                      onChange={(e) => setEditingResponsable({ ...editingResponsable, telephone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Département</Label>
                    <Input
                      value={editingResponsable.departement}
                      onChange={(e) => setEditingResponsable({ ...editingResponsable, departement: e.target.value })}
                      required
                    />
                  </div>
              </div>

              {/* Ligne 3 : Fonction (seul sur la dernière ligne ou avec un autre champ futur) */}
              <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Fonction</Label>
                    <Input
                      value={editingResponsable.fonction}
                      onChange={(e) => setEditingResponsable({ ...editingResponsable, fonction: e.target.value })}
                      required
                    />
                  </div>
                  {/* Espace vide ou autre champ si nécessaire */}
              </div>

              <DialogFooter>
                <Button type="submit">Enregistrer les modifications</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modale Détails Fournisseur */}
      <Dialog open={isViewFournisseurOpen} onOpenChange={setIsViewFournisseurOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Détails du Fournisseur</DialogTitle>
          </DialogHeader>
          {selectedFournisseur && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Raison Sociale</h4>
                  <p className="text-lg font-medium">{selectedFournisseur.raison_sociale}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">NINEA</h4>
                  <p>{selectedFournisseur.ninea}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Email Contact</h4>
                  <p>{selectedFournisseur.email}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Téléphone</h4>
                  <p>{selectedFournisseur.telephone}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Statut</h4>
                  <div className="mt-1">{getStatutBadge(selectedFournisseur.statut)}</div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Date d'inscription</h4>
                  <p>{selectedFournisseur.date_inscription}</p>
                </div>
              </div>
              
              <div className="border-t pt-4 mt-2">
                 <h4 className="font-semibold mb-2">Actions Rapides</h4>
                 <div className="flex gap-2">
                    {selectedFournisseur.statut === 'en_attente' && (
                        <>
                            <Button size="sm" onClick={() => { handleValidateFournisseur(selectedFournisseur.id); setIsViewFournisseurOpen(false); }}>
                                Valider le compte
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => { handleRejectFournisseur(selectedFournisseur.id); setIsViewFournisseurOpen(false); }}>
                                Rejeter
                            </Button>
                        </>
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Détails de l'Appel d'Offre</DialogTitle>
          </DialogHeader>
          {selectedAppelOffre && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <h4 className="font-semibold text-sm text-muted-foreground">Titre</h4>
                  <p className="text-lg font-medium">{selectedAppelOffre.titre}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Référence</h4>
                  <p className="font-mono">{selectedAppelOffre.reference}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Statut</h4>
                  <div className="mt-1">{getStatutBadge(selectedAppelOffre.statut)}</div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Date de publication</h4>
                  <p>{formatDate(selectedAppelOffre.date_publication)}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Date de clôture</h4>
                  <p>{formatDate(selectedAppelOffre.date_cloture)}</p>
                </div>
                <div className="col-span-2">
                  <h4 className="font-semibold text-sm text-muted-foreground">Responsable</h4>
                  <p>{selectedAppelOffre.responsable?.name}</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewAppelOffreOpen(false)}>Fermer</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modale Création Appel d'Offre */}
      <Dialog open={isCreateAOOpen} onOpenChange={setIsCreateAOOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Créer un Appel d'Offre</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTender} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Titre de l'appel d'offre</Label>
                <Input 
                  value={newTender.titre} 
                  onChange={e => setNewTender({...newTender, titre: e.target.value})} 
                  required 
                  placeholder="Ex: Acquisition..."
                />
              </div>
              <div className="space-y-2">
                <Label>Date limite de dépôt</Label>
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateAOOpen(false)}>Annuler</Button>
              <Button type="submit">Créer le brouillon</Button>
            </DialogFooter>
          </form>
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
                </CardContent>
              </Card>

              {/* Montant proposé */}
              {selectedCandidature.montant_propose && (
                <Card className="border-none shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Montant de l'offre</h3>
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
                  ) : legalDocuments.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg bg-slate-50">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-muted-foreground">Aucun document légal disponible pour ce fournisseur.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {['RCCM', 'NINEA', 'QUITUS_FISCAL'].map((categorie) => {
                        const docs = legalDocuments.filter(d => d.categorie === categorie);
                        const categorieLabel = categorie === 'RCCM' ? 'RCCM (Registre du Commerce)' 
                          : categorie === 'NINEA' ? 'NINEA' 
                          : 'Quitus Fiscal';
                        
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
                                        } catch (error: any) {
                                          toast({
                                            title: "Erreur",
                                            description: error.response?.data?.message || "Impossible d'ouvrir le document.",
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
                                        } catch (error: any) {
                                          toast({
                                            title: "Erreur",
                                            description: error.response?.data?.message || "Impossible d'ouvrir le document.",
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
              {legalDocuments.length < 3 && (
                <Card className="border-none shadow-sm bg-orange-50 border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-orange-800 mb-1">Documents légaux incomplets</p>
                        <p className="text-xs text-orange-700">
                          Ce fournisseur n'a pas uploadé tous les documents légaux requis (RCCM, NINEA, Quitus Fiscal). 
                          Il est recommandé de rejeter cette candidature ou de demander la complétion des documents.
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
            <DialogTitle>Assigner un Appel d'Offre</DialogTitle>
          </DialogHeader>
          {selectedAOForAssign && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm font-semibold text-slate-700 mb-1">Appel d'offre</p>
                <p className="text-lg font-bold text-slate-800">{selectedAOForAssign.titre}</p>
                <p className="text-xs text-slate-500 font-mono mt-1">{selectedAOForAssign.reference}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="responsable-select">Sélectionner un responsable</Label>
                <Select 
                  value={selectedResponsableId?.toString() || ""} 
                  onValueChange={(value) => setSelectedResponsableId(parseInt(value))}
                >
                  <SelectTrigger id="responsable-select">
                    <SelectValue placeholder="Choisir un responsable..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(responsables) && responsables.map((r) => (
                      <SelectItem key={r.id} value={r.id.toString()}>
                        {r.user?.name || `Responsable #${r.id}`} - {r.departement}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {Array.isArray(responsables) && responsables.length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucun responsable disponible.</p>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAssignAOOpen(false)}>Annuler</Button>
                <Button 
                  onClick={handleAssignAO} 
                  disabled={!selectedResponsableId}
                >
                  Assigner
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modale Paramètres */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Paramètres du compte</DialogTitle>
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
    </div>
  );
};

export default AdminDashboard;