import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Upload,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  Award,
  LayoutDashboard,
  MessageSquare,
  Send,
  UserCircle,
  Bell,
  ChevronDown,
  ArrowRight,
  Download,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import DashboardNavbar from "@/components/layout/DashboardNavbar";
import FournisseurChatWidget from "@/components/chat/FournisseurChatWidget";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DataTablePagination } from "@/components/ui/DataTablePagination";
import { exportData } from "@/lib/exportUtils";
import {
  isValidSenegalPhone,
  sanitizePhoneInput,
  SENEGAL_PHONE_ERROR,
} from "@/lib/phoneValidation";
import {
  LEGAL_DOCUMENT_CATEGORIES,
  ALL_LEGAL_DOCUMENT_UPLOAD_CATEGORIES,
  legalDocumentLabel,
} from "@/lib/legalDocuments";

interface Candidature {
  id: number;
  appel_offre_id: number;
  fournisseur_id: number;
  statut: string;
  date_soumission: string;
  montant_propose?: number;
  appel_offre: {
    id: number;
    titre: string;
    numero_reference: string;
    date_limite: string;
    statut: string;
  };
  documents?: Document[];
}

interface Document {
  id: number;
  nom_fichier: string;
  categorie: string;
  type_fichier: string;
  chemin_fichier: string;
  url?: string;
  created_at: string;
}

interface FournisseurProfile {
  id: number;
  nom_entreprise: string;
  adresse: string;
  telephone: string;
  email_contact: string;
  ninea?: string;
  rccm?: string;
  quitus_fiscal?: string;
  /** Statut administratif du compte : « actif » (validé), « en_attente », « rejete ». */
  statut?: "actif" | "en_attente" | "rejete" | string;
  /** Références clients / marchés passés (texte libre). */
  references_professionnelles?: string | null;
  /** Préférences portail (alignées sur `config/portail.php`). */
  portail?: {
    candidature_en_ligne: boolean;
  };
}

interface Suggestion {
  id: number;
  sujet: string;
  message: string;
  statut: string;
  created_at: string;
}

interface InAppNotification {
  id: number;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface AvisOuvertResume {
  id: number;
  titre: string;
  reference: string;
  date_limite_depot: string;
  statut?: string;
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

export default function FournisseurDashboard() {
  const { api, user, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [newSuggestion, setNewSuggestion] = useState({ sujet: "", message: "" });
  const [profile, setProfile] = useState<FournisseurProfile | null>(null);
  /** Aligné sur `portail.candidature_en_ligne` (GET /api/fournisseur/profile). */
  const soumissionEnLigne = profile?.portail?.candidature_en_ligne === true;
  const [loading, setLoading] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const navigate = useNavigate();
  // États pour la modification du profil
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    nom_entreprise: "",
    adresse: "",
    telephone: "",
    email_contact: "",
    ninea: "",
    rccm: "",
    references_professionnelles: "",
  });

  // États pour la modification de candidature
  const [editingCandidature, setEditingCandidature] = useState<Candidature | null>(null);
  const [editMontant, setEditMontant] = useState("");
  
  // États pour les commentaires
  const [candidatureComments, setCandidatureComments] = useState<Record<number, CommentItem[]>>({});
  const [expandedCandidatureId, setExpandedCandidatureId] = useState<number | null>(null);
  const [newComments, setNewComments] = useState<Record<number, string>>({});
  const [submittingComments, setSubmittingComments] = useState<Record<number, boolean>>({});
  const [isPasswordSettingsOpen, setIsPasswordSettingsOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });
  const [portalNotifications, setPortalNotifications] = useState<InAppNotification[]>([]);
  const [avisOuverts, setAvisOuverts] = useState<AvisOuvertResume[]>([]);
  const [avisPublishedTotal, setAvisPublishedTotal] = useState(0);
  const [historiqueOuvert, setHistoriqueOuvert] = useState(false);

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

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    perPage: 15,
  });

  const loadDashboardData = useCallback(async () => {
    if (!api) return;
    try {
      setLoading(true);
      const [candidaturesRes, documentsRes, profileRes, suggestionsRes, notificationsRes, avisRes] = await Promise.all([
        api.get("/api/fournisseur/candidatures", {
          params: { page: pagination.currentPage, per_page: pagination.perPage }
        }),
        api.get("/api/fournisseur/documents-legaux"),
        api.get("/api/fournisseur/profile"),
        api.get("/api/suggestions"),
        api.get("/api/notifications").catch(() => ({ data: [] as InAppNotification[] })),
        api
          .get("/api/appels-offres", {
            params: { per_page: 8, statut: "published" },
          })
          .catch(() => ({ data: { data: [] as AvisOuvertResume[], meta: { total: 0 } } })),
      ]);

      const rawNotifs = notificationsRes.data;
      setPortalNotifications(Array.isArray(rawNotifs) ? rawNotifs : []);

      const avisPayload = avisRes.data as {
        data?: AvisOuvertResume[];
        meta?: { total?: number };
      };
      const avisRows = Array.isArray(avisPayload?.data) ? avisPayload.data : [];
      setAvisOuverts(avisRows);
      setAvisPublishedTotal(
        typeof avisPayload?.meta?.total === "number" ? avisPayload.meta.total : avisRows.length
      );

      const candData = candidaturesRes.data;
      const candidaturesList = Array.isArray(candData.data) ? candData.data : candData;
      
      if (candData.meta) {
        setPagination(prev => ({
          ...prev,
          currentPage: candData.meta.current_page,
          totalPages: candData.meta.last_page,
          totalItems: candData.meta.total,
          perPage: candData.meta.per_page
        }));
      } else {
        setPagination(prev => ({
          ...prev,
          currentPage: 1,
          totalPages: 1,
          totalItems: Array.isArray(candidaturesList) ? candidaturesList.length : 0,
          perPage: Array.isArray(candidaturesList) ? (candidaturesList.length || 15) : 15
        }));
      }

      if (!Array.isArray(candidaturesList) || candidaturesList.length === 0) {
        setCandidatures([]);
      } else {
        const BATCH = 6;
        const candidaturesWithDocs: Candidature[] = [];
        for (let i = 0; i < candidaturesList.length; i += BATCH) {
          const slice = candidaturesList.slice(i, i + BATCH);
          const batchResults = await Promise.all(
            slice.map(async (cand: Candidature) => {
              try {
                const [candidatureDetail, commentsRes] = await Promise.all([
                  api.get(`/api/candidatures/${cand.id}`),
                  api.get(`/api/candidatures/${cand.id}/comments`).catch(() => ({ data: [] })),
                ]);
                const candidatureData = candidatureDetail.data?.data || candidatureDetail.data;
                const commentsData = commentsRes.data || [];

                setCandidatureComments((prev) => ({
                  ...prev,
                  [cand.id]: Array.isArray(commentsData) ? commentsData : [],
                }));

                return {
                  ...cand,
                  documents: candidatureData?.documents || [],
                };
              } catch (err) {
                console.error(`Erreur chargement documents pour candidature ${cand.id}:`, err);
                return { ...cand, documents: [] };
              }
            })
          );
          candidaturesWithDocs.push(...batchResults);
        }

        setCandidatures(candidaturesWithDocs);
      }

      const docsData = documentsRes.data;
      setDocuments(Array.isArray(docsData) ? docsData : docsData.data || []);

      setSuggestions(suggestionsRes.data || []);

      setProfile(profileRes.data);
      setProfileForm({
        nom_entreprise: profileRes.data.nom_entreprise || "",
        adresse: profileRes.data.adresse || "",
        telephone: profileRes.data.telephone || "",
        email_contact: profileRes.data.email_contact || "",
        ninea: profileRes.data.ninea ?? "",
        rccm: profileRes.data.rccm ?? "",
        references_professionnelles: profileRes.data.references_professionnelles ?? "",
      });
    } catch (error: unknown) {
      console.error("Erreur chargement dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [api, pagination.currentPage, pagination.perPage]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api) return;
    
    // Validation côté client
    const nomEntreprise = profileForm.nom_entreprise?.trim() || '';
    const adresse = profileForm.adresse?.trim() || '';
    const telephone = profileForm.telephone?.trim() || '';
    const emailContact = profileForm.email_contact?.trim() || '';
    
    if (!nomEntreprise || !adresse || !telephone || !emailContact) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }
    
    if (!isValidSenegalPhone(telephone)) {
      toast({
        title: "Erreur",
        description: SENEGAL_PHONE_ERROR,
        variant: "destructive",
      });
      return;
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailContact)) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer une adresse email valide",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Utiliser JSON au lieu de FormData car on n'envoie plus de fichiers
      const data = {
        nom_entreprise: nomEntreprise,
        adresse: adresse,
        telephone: telephone,
        email_contact: emailContact,
        ninea: profileForm.ninea?.trim() || null,
        rccm: profileForm.rccm?.trim() || null,
        references_professionnelles: profileForm.references_professionnelles?.trim() || null,
      };
      
      console.log('Données envoyées:', data);
      
      const response = await api.put("/api/fournisseur/profile", data);
      
      // Fermer le modal
      setEditingProfile(false);
      
      // Utiliser directement les données de la réponse pour mettre à jour le state immédiatement
      const updatedProfile = response.data;
      console.log('Profil mis à jour - données reçues:', updatedProfile);
      
      // Créer un nouvel objet pour forcer React à détecter le changement
      const newProfile: FournisseurProfile = {
        ...updatedProfile,
        nom_entreprise: updatedProfile.nom_entreprise || "",
        adresse: updatedProfile.adresse || "",
        telephone: updatedProfile.telephone || "",
        email_contact: updatedProfile.email_contact || "",
        ninea: updatedProfile.ninea ?? null,
        rccm: updatedProfile.rccm ?? null,
        references_professionnelles: updatedProfile.references_professionnelles ?? null,
        portail: updatedProfile.portail ?? profile?.portail,
      };
      
      // Mettre à jour le state immédiatement avec les données de la réponse
      setProfile(newProfile);
      
      // Mettre à jour le formulaire avec les nouvelles valeurs
      setProfileForm({
        nom_entreprise: updatedProfile.nom_entreprise || "",
        adresse: updatedProfile.adresse || "",
        telephone: updatedProfile.telephone || "",
        email_contact: updatedProfile.email_contact || "",
        ninea: updatedProfile.ninea ?? "",
        rccm: updatedProfile.rccm ?? "",
        references_professionnelles: updatedProfile.references_professionnelles ?? "",
      });
      
      // Rafraîchir les données utilisateur dans le contexte d'authentification
      // pour mettre à jour l'email si il a été modifié
      const emailChanged = updatedProfile?.email_changed || false;
      if (refreshUser) {
        await refreshUser();
      }
      
      // Recharger le profil depuis le serveur après un court délai pour garantir la cohérence
      setTimeout(async () => {
        try {
          const profileRes = await api.get("/api/fournisseur/profile");
          const serverProfile = profileRes.data;
          console.log('Profil rechargé depuis serveur:', serverProfile);
          // Créer un nouvel objet pour forcer React à détecter le changement
          const refreshedProfile: FournisseurProfile = {
            ...serverProfile,
            nom_entreprise: serverProfile.nom_entreprise || "",
            adresse: serverProfile.adresse || "",
            telephone: serverProfile.telephone || "",
            email_contact: serverProfile.email_contact || "",
            ninea: serverProfile.ninea ?? null,
            rccm: serverProfile.rccm ?? null,
            references_professionnelles: serverProfile.references_professionnelles ?? null,
            portail: serverProfile.portail ?? profile?.portail,
          };
          // Mettre à jour avec les données du serveur pour garantir la cohérence
          setProfile(refreshedProfile);
          setProfileForm({
            nom_entreprise: refreshedProfile.nom_entreprise || "",
            adresse: refreshedProfile.adresse || "",
            telephone: refreshedProfile.telephone || "",
            email_contact: refreshedProfile.email_contact || "",
            ninea: refreshedProfile.ninea ?? "",
            rccm: refreshedProfile.rccm ?? "",
            references_professionnelles: refreshedProfile.references_professionnelles ?? "",
          });
        } catch (err) {
          console.error("Erreur rechargement profil:", err);
        }
      }, 500);
      
      // Message de succès adapté selon si l'email a changé
      const successMessage = emailChanged 
        ? "Vos informations ont été enregistrées avec succès. Vous pouvez maintenant vous connecter avec votre nouvel email."
        : "Vos informations ont été enregistrées avec succès.";
      
      toast({
        title: "Profil mis à jour",
        description: successMessage,
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
            const fieldName = field === 'nom_entreprise' ? 'Nom de l\'entreprise' :
                            field === 'email_contact' ? 'Email de contact' :
                            field === 'telephone' ? 'Téléphone' :
                            field === 'adresse' ? 'Adresse' :
                            field === 'references_professionnelles' ? 'Références professionnelles' :
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

  const handleEditClick = (candidature: Candidature) => {
    setEditingCandidature(candidature);
    setEditMontant(candidature.montant_propose ? candidature.montant_propose.toString() : "");
  };

  const handleUpdateCandidature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api || !editingCandidature) return;

    try {
      // On envoie aussi le statut et la date_soumission pour passer la validation du StoreCandidatureRequest si elle est stricte, 
      // mais idéalement le backend ne devrait pas en avoir besoin pour un update partiel.
      // Cependant, j'ai réutilisé StoreCandidatureRequest pour l'update, donc il faut respecter les règles.
      // Attendons, StoreCandidatureRequest demande 'fournisseur_id', 'statut', 'date_soumission'.
      // Je vais envoyer ces données pour être sûr.
      
      await api.put(`/api/candidatures/${editingCandidature.id}`, {
        montant_propose: parseFloat(editMontant),
        fournisseur_id: editingCandidature.fournisseur_id,
        statut: editingCandidature.statut,
        date_soumission: editingCandidature.date_soumission
      });

      setCandidatures(prev => prev.map(c => c.id === editingCandidature.id ? { ...c, montant_propose: parseFloat(editMontant) } : c));
      setEditingCandidature(null);
      
      toast({
        title: "Candidature mise à jour",
        description: "Le montant proposé pour vos offres a été modifié.",
      });
    } catch (error: unknown) {
      console.error(error);
      toast({
        title: "Erreur",
        description: getErrorMessage(error, "Impossible de mettre à jour la candidature."),
        variant: "destructive"
      });
    }
  };

  const handleCreateSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api) return;
    try {
      const response = await api.post("/api/suggestions", newSuggestion);
      setSuggestions([response.data.data, ...suggestions]);
      setNewSuggestion({ sujet: "", message: "" });
      toast({
        title: "Suggestion envoyée",
        description: "Merci pour votre contribution !",
      });
    } catch (error: unknown) {
      toast({
        title: "Erreur",
        description: getErrorMessage(error, "Erreur lors de l'envoi"),
        variant: "destructive",
      });
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, categorie: string) => {
    if (!api) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (profile?.statut && profile.statut !== "actif") {
      // Réinitialise le champ pour permettre une nouvelle sélection après validation
      e.target.value = "";
      toast({
        title: "Compte non validé",
        description:
          "Votre compte doit être validé par l'administrateur avant de déposer vos documents légaux.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("categorie", categorie);

    try {
      setUploadingDoc(true);
      await api.post("/api/fournisseur/documents-legaux", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast({
        title: "Document uploadé",
        description: `${legalDocumentLabel(categorie)} ajouté avec succès`,
      });

      loadDashboardData();
    } catch (error: unknown) {
      toast({
        title: "Erreur d'upload",
        description: getErrorMessage(error, "Erreur lors de l'upload"),
        variant: "destructive",
      });
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDocumentDelete = async (docId: number) => {
    if (!api) return;
    if (!confirm("Voulez-vous vraiment supprimer ce document ?")) return;

    try {
      await api.delete(`/api/fournisseur/documents-legaux/${docId}`);
      toast({
        title: "Document supprimé",
        description: "Le document a été supprimé avec succès",
      });
      loadDashboardData();
    } catch (error: unknown) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le document",
        variant: "destructive",
      });
    }
  };

  const getStatutBadge = (statut: string) => {
    const variants: Record<
      string,
      { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }>; label: string }
    > = {
      submitted: { variant: "default", icon: Clock, label: "Soumise" },
      SOUMISE: { variant: "default", icon: Clock, label: "Soumise" }, // Rétrocompatibilité
      under_review: { variant: "secondary", icon: Eye, label: "En évaluation" },
      EN_EVALUATION: { variant: "secondary", icon: Eye, label: "En évaluation" },
      accepted: { variant: "default", icon: CheckCircle, label: "Acceptée" },
      ACCEPTEE: { variant: "default", icon: CheckCircle, label: "Acceptée" },
      rejected: { variant: "destructive", icon: XCircle, label: "Rejetée" },
      REJETEE: { variant: "destructive", icon: XCircle, label: "Rejetée" },
    };

    const config = variants[statut] || { variant: "default", icon: AlertCircle, label: statut };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const stats = {
    notifs_non_lues: portalNotifications.filter((n) => !n.is_read).length,
    avis_ouverts_total: avisPublishedTotal,
    candidatures_total: candidatures.length,
    candidatures_en_cours: candidatures.filter((c) => c.statut === "submitted" || c.statut === "SOUMISE" || c.statut === "under_review" || c.statut === "EN_EVALUATION").length,
    candidatures_acceptees: candidatures.filter((c) => c.statut === "accepted" || c.statut === "ACCEPTEE").length,
    documents_total: documents.length,
  };

  const markNotificationRead = async (id: number) => {
    if (!api) return;
    try {
      await api.put(`/api/notifications/${id}`, { is_read: true });
      setPortalNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (error: unknown) {
      toast({
        title: "Erreur",
        description: getErrorMessage(error, "Impossible de mettre à jour la notification."),
        variant: "destructive",
      });
    }
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handlePerPageChange = (perPage: number) => {
    setPagination(prev => ({ ...prev, perPage, currentPage: 1 }));
  };

  const handleExportData = async (type: 'excel' | 'pdf') => {
    if (!api) return;
    try {
      // On demande toutes les données pour l'export (paramètre 'all=true' à gérer côté backend si nécessaire, 
      // sinon on récupère tout ce qu'on peut)
      const response = await api.get('/api/fournisseur/candidatures', {
        params: { per_page: 1000 } 
      });
      
      const rawData = response.data.data || response.data;
      
      // Définir les colonnes pour l'export
      const columns = [
        { header: "Appel d'offres", key: "appel_offre.titre" },
        { header: "Référence", key: "appel_offre.numero_reference" },
        { 
          header: "Date limite", 
          key: "appel_offre.date_limite",
          format: (val: unknown) => val ? new Date(String(val)).toLocaleDateString() : "-"
        },
        { 
          header: "Date soumission", 
          key: "date_soumission",
          format: (val: unknown) => val ? new Date(String(val)).toLocaleDateString() : "-"
        },
        { 
          header: "Montant (FCFA)", 
          key: "montant_propose",
          format: (val: unknown) => val ? Number(val).toLocaleString() : "Non renseigné"
        },
        { 
          header: "Statut", 
          key: "statut",
          format: (val: unknown) => val === 'submitted' ? 'Soumise' : 
                                   val === 'accepted' ? 'Acceptée' : 
                                   val === 'rejected' ? 'Rejetée' : String(val ?? '')
        }
      ];

      // Appeler exportData avec la bonne signature (format, options)
      exportData(type, {
        fileName: soumissionEnLigne
          ? `mes_candidatures_${new Date().toISOString().split("T")[0]}`
          : `historique_portail_${new Date().toISOString().split("T")[0]}`,
        title: soumissionEnLigne ? "Mes candidatures" : "Historique portail (dossiers enregistrés)",
        columns: columns,
        data: rawData
      });

    } catch (error) {
      console.error("Erreur export:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'exporter les données.",
        variant: "destructive"
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    toast({ title: "Déconnexion", description: "Vous avez été déconnecté." });
    navigate("/connexion");
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!api) throw new Error("API non disponible");
      await api.put("/api/update-password", {
        current_password: passwordData.current,
        new_password: passwordData.new,
        new_password_confirmation: passwordData.confirm,
      });
      toast({ title: "Succès", description: "Votre mot de passe a été mis à jour." });
      setIsPasswordSettingsOpen(false);
      setPasswordData({ current: "", new: "", confirm: "" });
    } catch (error: unknown) {
      toast({
        title: "Erreur",
        description: getErrorMessage(error, "Erreur lors de la mise à jour du mot de passe."),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  if (!api) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">API non disponible.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <DashboardNavbar
        title="Espace Fournisseur"
        onOpenProfile={() => setActiveTab("profile")}
        onOpenSettings={() => setIsPasswordSettingsOpen(true)}
        onLogout={handleLogout}
      />
      <FournisseurChatWidget api={api} />
      <div className="flex min-h-0 w-full flex-1 pt-16">
        {/* SIDEBAR — même principe que l’espace responsable */}
        <aside className="fixed bottom-0 left-0 top-16 z-30 flex w-64 flex-col border-r border-slate-200 bg-white shadow-sm">
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
                Fournisseur
              </Badge>
            </div>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            <Button
              variant={activeTab === "overview" ? "default" : "ghost"}
              className={`w-full justify-start ${activeTab === "overview" ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "text-slate-600 hover:bg-slate-100"}`}
              onClick={() => setActiveTab("overview")}
            >
              <LayoutDashboard className="w-4 h-4 mr-3" />
              Vue d&apos;ensemble
            </Button>

            <Button
              variant={activeTab === "candidatures" ? "default" : "ghost"}
              className={`w-full justify-start ${activeTab === "candidatures" ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "text-slate-600 hover:bg-slate-100"}`}
              onClick={() => setActiveTab("candidatures")}
            >
              <Bell className="w-4 h-4 mr-3" />
              Notifications & avis
            </Button>

            <Button
              variant={activeTab === "documents" ? "default" : "ghost"}
              className={`w-full justify-start ${activeTab === "documents" ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "text-slate-600 hover:bg-slate-100"}`}
              onClick={() => setActiveTab("documents")}
            >
              <Upload className="w-4 h-4 mr-3" />
              Mes documents
            </Button>

            <Button
              variant={activeTab === "profile" ? "default" : "ghost"}
              className={`w-full justify-start ${activeTab === "profile" ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "text-slate-600 hover:bg-slate-100"}`}
              onClick={() => setActiveTab("profile")}
            >
              <UserCircle className="w-4 h-4 mr-3" />
              Profil entreprise
            </Button>

            <Button
              variant={activeTab === "suggestions" ? "default" : "ghost"}
              className={`w-full justify-start ${activeTab === "suggestions" ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "text-slate-600 hover:bg-slate-100"}`}
              onClick={() => setActiveTab("suggestions")}
            >
              <MessageSquare className="w-4 h-4 mr-3" />
              Boîte à idées
            </Button>
          </nav>

          <div className="p-4 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-400 text-center">
              Références clients / marchés : onglet « Profil entreprise ». Paramètres et déconnexion : menu en haut à droite.
            </p>
          </div>
        </aside>

        <main className="ml-64 min-h-0 flex-1 overflow-y-auto">
          <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 md:px-8 md:py-8">
        
        {/* En-tête de section dynamique */}
        <div className="flex justify-between items-center mb-8">
           <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {activeTab === 'overview' && "Tableau de bord Fournisseur"}
                {activeTab === 'candidatures' && "Notifications & avis publiés"}
                {activeTab === 'documents' && "Mes documents"}
                {activeTab === 'suggestions' && "Boîte à idées"}
                {activeTab === 'profile' && "Profil Entreprise"}
              </h1>
              <p className="text-slate-500 mt-1">
                {activeTab === 'overview' && `Bienvenue, ${profile?.nom_entreprise || user?.name}. Voici un résumé de vos activités.`}
                {activeTab === 'candidatures' &&
                  "Vous consultez les avis et téléchargez les pièces sur la fiche marché ; le dépôt des offres se fait en présentiel. Notifications et suivi ci-dessous."}
                {activeTab === 'documents' && "Pièces obligatoires : tenez votre dossier à jour pour que les PRM disposent de vos informations avant votre venue au siège (soumission physique)."}
                {activeTab === 'suggestions' && "Proposez des améliorations pour la plateforme."}
                {activeTab === 'profile' && "Coordonnées, références professionnelles (clients, marchés passés) et aperçu de vos pièces."}
          </p>
           </div>
        </div>

        {/* VUE D'ENSEMBLE */}
        {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-500">
                {!soumissionEnLigne && (
                  <Alert className="border-primary/35 bg-primary/[0.06]">
                    <FileText className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-slate-900">Comment répondre à un marché sur ce portail</AlertTitle>
                    <AlertDescription>
                      <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm text-slate-700">
                        <li>Consultez l&apos;avis et les pièces jointes publiées (liste des marchés ou fiche détail).</li>
                        <li>
                          Téléchargez le <strong>cahier des charges</strong> — gratuit ou payant selon le marché — puis travaillez ce fichier (ou les modèles fournis) sur votre ordinateur pour{" "}
                          <strong>répondre aux exigences</strong> : compléter les formulaires, rédiger les pièces demandées, joindre les annexes prévues.
                        </li>
                        <li>
                          Si vous êtes intéressé, constituez votre dossier complet et déplacez-vous pour le{" "}
                          <strong>dépôt physique des plis</strong> au lieu et aux horaires indiqués (section « Dépôt des plis » sur l&apos;avis). Il n&apos;y a{" "}
                          <strong>pas de candidature ni de dépôt d&apos;offres en ligne</strong> sur ce portail.
                        </li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                )}
        {/* Cartes statistiques */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="border-none shadow-sm hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Notifications non lues</CardTitle>
                        <div className="bg-amber-50 p-2 rounded-lg"><Bell className="w-4 h-4 text-amber-600" /></div>
              </CardHeader>
              <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{stats.notifs_non_lues}</div>
              </CardContent>
            </Card>
          </motion.div>

                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Card className="border-none shadow-sm hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avis publiés (ouverts)</CardTitle>
                        <div className="bg-blue-50 p-2 rounded-lg"><FileText className="w-4 h-4 text-blue-600" /></div>
              </CardHeader>
              <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{stats.avis_ouverts_total}</div>
              </CardContent>
            </Card>
          </motion.div>

                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Card className="border-none shadow-sm hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Suivi dans le portail</CardTitle>
                        <div className="bg-slate-100 p-2 rounded-lg"><Clock className="w-4 h-4 text-slate-600" /></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-700">{stats.candidatures_total}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sans dépôt en ligne, ce compteur reste en général à 0 (éventuel historique ou saisie par le service).
                </p>
              </CardContent>
            </Card>
          </motion.div>

                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Card className="border-none shadow-sm hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Mes documents</CardTitle>
                        <div className="bg-purple-50 p-2 rounded-lg"><Upload className="w-4 h-4 text-purple-600" /></div>
              </CardHeader>
              <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{stats.documents_total}</div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

                <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>À traiter en priorité</CardTitle>
                  <CardDescription>
                    Notifications du portail ou avis récemment ouverts — même contenu que l&apos;onglet « Notifications & avis ».
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("candidatures")}>
                  Ouvrir Notifications & avis
                </Button>
              </CardHeader>
              <CardContent>
                {portalNotifications.filter((n) => !n.is_read).length > 0 ? (
                  <div className="space-y-3">
                    {portalNotifications
                      .filter((n) => !n.is_read)
                      .slice(0, 5)
                      .map((n) => (
                        <div
                          key={n.id}
                          className="flex flex-col gap-2 rounded-lg border border-amber-100 bg-amber-50/60 p-4 sm:flex-row sm:items-start sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900">{n.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(n.created_at).toLocaleString("fr-FR")}
                            </p>
                          </div>
                          <Button size="sm" variant="secondary" onClick={() => void markNotificationRead(n.id)}>
                            Marquer lu
                          </Button>
                        </div>
                      ))}
                  </div>
                ) : avisOuverts.length > 0 ? (
                  <div className="space-y-3">
                    {avisOuverts.slice(0, 4).map((ao) => (
                      <div
                        key={ao.id}
                        className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between bg-white"
                      >
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-800 truncate">{ao.titre}</h4>
                          <p className="text-xs text-muted-foreground font-mono">{ao.reference}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Clôture :{" "}
                            {new Date(ao.date_limite_depot).toLocaleString("fr-FR", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                        <Button size="sm" onClick={() => navigate(`/appels-offres/${ao.id}`)}>
                          Voir la fiche
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Aucune notification non lue et aucun avis ouvert listé pour le moment. Consultez la liste complète des marchés.
                  </p>
                )}
              </CardContent>
            </Card>
            </div>
        )}

        {/* NOTIFICATIONS & AVIS (ex. Mes démarches) */}
        {activeTab === "candidatures" && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-800">Notifications & avis</h2>
                <Button variant="outline" onClick={() => navigate("/appels-offres")}>
                  Liste complète des marchés
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-amber-600" />
                    Notifications
                  </CardTitle>
                  <CardDescription>
                    Messages envoyés via le portail (convocation, suite de procédure, rappels…).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {portalNotifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune notification pour le moment.</p>
                  ) : (
                    <ul className="divide-y rounded-lg border bg-white">
                      {portalNotifications.map((n) => (
                        <li
                          key={n.id}
                          className={`flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between ${!n.is_read ? "bg-amber-50/50" : ""}`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-sm text-slate-800">{n.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(n.created_at).toLocaleString("fr-FR")}
                            </p>
                          </div>
                          {!n.is_read ? (
                            <Button size="sm" variant="secondary" onClick={() => void markNotificationRead(n.id)}>
                              Marquer lu
                            </Button>
                          ) : (
                            <Badge variant="outline" className="shrink-0">Lu</Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Avis publiés (marchés ouverts)
                  </CardTitle>
                  <CardDescription>
                    Accédez à la fiche avis (PDF, cahier, modalités de dépôt au siège).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {avisOuverts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun avis au statut « publié » pour le moment.</p>
                  ) : (
                    <ul className="space-y-2">
                      {avisOuverts.map((ao) => (
                        <li
                          key={ao.id}
                          className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900">{ao.titre}</p>
                            <p className="text-xs font-mono text-muted-foreground">{ao.reference}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Clôture :{' '}
                              {new Date(ao.date_limite_depot).toLocaleString('fr-FR', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </p>
                          </div>
                          <Button size="sm" onClick={() => navigate(`/appels-offres/${ao.id}`)}>
                            Ouvrir la fiche
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Collapsible open={historiqueOuvert} onOpenChange={setHistoriqueOuvert} className="space-y-3">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between" type="button">
                    <span>
                      Dossiers enregistrés dans l&apos;outil — {candidatures.length} ligne(s)
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform ${historiqueOuvert ? "rotate-180" : ""}`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Vous ne déposez pas vos offres via ce portail : vous consultez l&apos;avis, téléchargez le cahier puis vous rendez sur place. Les lignes ci-dessous ne correspondent qu&apos;à un éventuel historique ou à une saisie effectuée par le service des marchés.
                  </p>
                  {candidatures.length > 0 ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleExportData("excel")}>
                          <Download className="mr-2 h-4 w-4" /> Excel
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleExportData("pdf")}>
                          <Download className="mr-2 h-4 w-4" /> PDF
                        </Button>
                      </div>
                      <div className="grid gap-4">
                                          {candidatures.map((candidature) => (
                                                          <div key={candidature.id} className="border rounded-lg p-6 bg-white hover:shadow-md transition-all">
                                                              <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                                                                  <div className="flex-1 space-y-3">
                                                    <div>
                                                                          <h3 className="text-lg font-bold text-slate-800">{candidature.appel_offre.titre}</h3>
                                                                          <Badge variant="outline" className="mt-1">{candidature.appel_offre.numero_reference}</Badge>
                                                    </div>
                                                                      
                                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                                                          <div className="flex justify-between md:justify-start gap-2">
                                                                              <span className="text-muted-foreground">Date limite:</span>
                                                                              <span className="font-medium">{new Date(candidature.appel_offre.date_limite).toLocaleDateString()}</span>
                                                    </div>
                                                                          <div className="flex justify-between md:justify-start gap-2">
                                                                              <span className="text-muted-foreground">Soumis le:</span>
                                                                              <span className="font-medium">{new Date(candidature.date_soumission).toLocaleDateString()}</span>
                                                    </div>
                                                                          {candidature.montant_propose !== null && candidature.montant_propose !== undefined && candidature.montant_propose > 0 && (
                                                                              <div className="flex justify-between md:justify-start gap-2">
                                                                                  <span className="text-muted-foreground">Montant:</span>
                                                                                  <span className="font-medium text-primary">{candidature.montant_propose.toLocaleString()} FCFA</span>
                                                      </div>
                                                    )}
                                                                          {(!candidature.montant_propose || candidature.montant_propose === 0) && (
                                                                              <div className="flex justify-between md:justify-start gap-2">
                                                                                  <span className="text-muted-foreground">Montant:</span>
                                                                                  <span className="font-medium text-orange-600">Non renseigné</span>
                                        </div>
                                      )}
                                        </div>
                                                                      
                                                                      {/* Documents déposés pour cette candidature */}
                                                                      {candidature.documents && candidature.documents.length > 0 && (
                                                                        <div className="mt-4 pt-4 border-t border-slate-200">
                                                                          <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                              <FileText className="w-4 h-4" />
                                                                            Documents déposés ({candidature.documents.length})
                                                                          </h4>
                                                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                            {candidature.documents.map((doc: Document) => (
                                                                              <div key={doc.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100">
                                                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                                                                  <span className="text-xs text-slate-700 truncate" title={doc.nom_fichier}>
                                                                                    {doc.nom_fichier}
                                              </span>
                                            </div>
                                              <Button
                                                size="sm"
                                                                                  variant="ghost"
                                                                                  className="h-7 px-2 shrink-0"
                                                                                  onClick={async () => {
                                                                                    if (!api) return;
                                                                                    try {
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
                                                                                  <Eye className="w-3 h-3 mr-1" />
                                                                                  Voir
                                              </Button>
                                                                              </div>
                                                                            ))}
                                                                          </div>
                                                      </div>
                                                    )}
                                                                      
                                                                      {/* Section Commentaires */}
                                                                      <div className="mt-4 pt-4 border-t border-slate-200">
                                                                        <div className="flex items-center justify-between mb-3">
                                                                          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                                                            <MessageSquare className="w-4 h-4" />
                                                                            Commentaires ({candidatureComments[candidature.id]?.length || 0})
                                                                          </h4>
                                              <Button
                                                                            variant="ghost"
                                                size="sm"
                                                                            onClick={() => {
                                                                              if (expandedCandidatureId === candidature.id) {
                                                                                setExpandedCandidatureId(null);
                                                                              } else {
                                                                                setExpandedCandidatureId(candidature.id);
                                                                                // Charger les commentaires si pas encore chargés
                                                                                if (!candidatureComments[candidature.id] && api) {
                                                                                  api.get(`/api/candidatures/${candidature.id}/comments`)
                                                                                    .then(res => {
                                                                                      setCandidatureComments(prev => ({
                                                                                        ...prev,
                                                                                        [candidature.id]: Array.isArray(res.data) ? res.data : []
                                                                                      }));
                                                                                    })
                                                                                    .catch(err => console.error("Erreur chargement commentaires:", err));
                                                                                }
                                                                              }
                                                                            }}
                                                                          >
                                                                            {expandedCandidatureId === candidature.id ? "Masquer" : "Voir"}
                                              </Button>
                                            </div>
                                                                        
                                                                        {expandedCandidatureId === candidature.id && (
                                                                          <div className="space-y-3">
                                                                            {/* Liste des commentaires */}
                                                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                                              {candidatureComments[candidature.id]?.length === 0 ? (
                                                                                <p className="text-xs text-muted-foreground text-center py-2">
                                                                                  Aucun commentaire pour le moment.
                                                                                </p>
                                                                              ) : (
                                                                                candidatureComments[candidature.id]?.map((comment) => (
                                                                                  <div key={comment.id} className={`p-2 rounded-lg border text-xs ${comment.user?.id === user?.id ? 'bg-primary/5 border-primary/20' : 'bg-slate-50 border-slate-200'}`}>
                                                                                    <div className="flex items-start justify-between mb-1">
                                                                                      <span className="font-semibold text-slate-700">
                                                                                        {comment.user?.name || 'Utilisateur'}
                                                                                      </span>
                                                                                      <span className="text-muted-foreground">
                                                                                        {new Date(comment.created_at).toLocaleString()}
                                                                                      </span>
                                          </div>
                                                                                    <p className="text-slate-600 whitespace-pre-wrap">{comment.message}</p>
                                                                                  </div>
                                                                                ))
                                                                              )}
                                      </div>
                      
                                                                            {/* Formulaire de réponse */}
                                                                            <div className="space-y-2 border-t pt-2">
                                                                              <Textarea
                                                                                placeholder="Répondre au responsable..."
                                                                                value={newComments[candidature.id] || ""}
                                                                                onChange={(e) => setNewComments(prev => ({
                                                                                  ...prev,
                                                                                  [candidature.id]: e.target.value
                                                                                }))}
                                                                                rows={2}
                                                                                className="resize-none text-xs"
                                                                              />
                                                                              <div className="flex justify-end">
                                              <Button
                                                size="sm"
                                                                                  onClick={async () => {
                                                                                    if (!api || !newComments[candidature.id]?.trim()) return;
                                                                                    
                                                                                    setSubmittingComments(prev => ({ ...prev, [candidature.id]: true }));
                                                                                    try {
                                                                                      const response = await api.post(`/api/candidatures/${candidature.id}/comments`, {
                                                                                        message: newComments[candidature.id].trim()
                                                                                      });
                                                                                      
                                                                                      setCandidatureComments(prev => ({
                                                                                        ...prev,
                                                                                        [candidature.id]: [...(prev[candidature.id] || []), response.data]
                                                                                      }));
                                                                                      setNewComments(prev => ({ ...prev, [candidature.id]: "" }));
                                                                                      toast({
                                                                                        title: "Commentaire envoyé",
                                                                                        description: "Votre réponse a été envoyée au responsable.",
                                                                                      });
                                                                                    } catch (error: unknown) {
                                                                                      console.error("Erreur envoi commentaire:", error);
                                                                                      toast({
                                                                                        title: "Erreur",
                                                                                        description: getErrorMessage(error, "Impossible d'envoyer le commentaire."),
                                                                                        variant: "destructive"
                                                                                      });
                                                                                    } finally {
                                                                                      setSubmittingComments(prev => ({ ...prev, [candidature.id]: false }));
                                                                                    }
                                                                                  }}
                                                                                  disabled={!newComments[candidature.id]?.trim() || submittingComments[candidature.id]}
                                                                                  className="h-7 text-xs"
                                                                                >
                                                                                  {submittingComments[candidature.id] ? (
                                                                                    <>
                                                                                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent mr-1"></div>
                                                                                      Envoi...
                                                                                    </>
                                                                                  ) : (
                                                                                    <>
                                                                                      <Send className="w-3 h-3 mr-1" />
                                                                                      Envoyer
                                                                                    </>
                                                                                  )}
                                              </Button>
                                                                              </div>
                                                                            </div>
                                                                          </div>
                                                                        )}
                                                                      </div>
                                                  </div>
                                                                  <div className="flex flex-col items-end gap-2">
                                                                      {getStatutBadge(candidature.statut)}
                                                                      {soumissionEnLigne &&
                                                                      (candidature.statut === 'submitted' || candidature.statut === 'SOUMISE') &&
                                                                       candidature.appel_offre.statut !== 'closed' && (
                                                                        <Button variant="outline" size="sm" onClick={() => handleEditClick(candidature)}>
                                                                            Modifier
                                              </Button>
                                                                      )}
                                                                      {candidature.appel_offre.statut === 'closed' && (
                                                                        <Badge variant="outline" className="text-xs">
                                                                          Appel d'offres clôturé
                                                                        </Badge>
                                                                      )}
                                                </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>

                                      {candidatures.length > 0 && (
                                        <div className="mt-6">
                                          <DataTablePagination
                                            currentPage={pagination.currentPage}
                                            totalPages={pagination.totalPages}
                                            totalItems={pagination.totalItems}
                                            perPage={pagination.perPage}
                                            onPageChange={handlePageChange}
                                            onPerPageChange={handlePerPageChange}
                                          />
                                        </div>
                                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">
                      Aucune ligne : comportement normal tant que la procédure est uniquement présentielle (pas de candidature en ligne).
                    </p>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>
        )}

        {/* MES DOCUMENTS */}
        {activeTab === "documents" && (
            <div className="animate-in fade-in duration-500 space-y-6">
                <Card className="border-none shadow-sm">
              <CardHeader>
                        <CardTitle>Documents requis</CardTitle>
                        <CardDescription>
                          Ces pièces permettent aux équipes d&apos;identifier votre entreprise avant une venue au siège pour le dépôt des offres. Pour indiquer des clients ou marchés déjà réalisés (texte), utilisez l’onglet{" "}
                          <span className="font-medium text-slate-700">Profil entreprise</span> puis « Modifier » — champ « Références professionnelles ».
                        </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                        {profile?.statut && profile.statut !== "actif" && (
                          <div
                            className={`rounded-lg border px-4 py-3 text-sm ${
                              profile.statut === "rejete"
                                ? "border-red-200 bg-red-50 text-red-800"
                                : "border-amber-200 bg-amber-50 text-amber-900"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                              <div>
                                <p className="font-semibold">
                                  {profile.statut === "rejete"
                                    ? "Compte rejeté"
                                    : "Validation administrateur en attente"}
                                </p>
                                <p className="mt-0.5 text-xs leading-relaxed">
                                  {profile.statut === "rejete"
                                    ? "Votre compte fournisseur a été rejeté par l'administrateur. Vous ne pouvez pas déposer de documents légaux. Contactez le service des marchés pour plus d'informations."
                                    : "Le dépôt de vos documents légaux sera ouvert dès que l'administrateur aura validé votre compte. Vous serez prévenu par email."}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        {[...LEGAL_DOCUMENT_CATEGORIES, "AUTRE"].map((typeDoc) => {
                          const isAutre = typeDoc === "AUTRE";
                          const docsForCat = documents.filter((d) => d.categorie === typeDoc);

                          return (
                            <div
                              key={typeDoc}
                              className={`space-y-3 p-4 border rounded-lg ${isAutre ? "bg-slate-50/70 border-dashed" : "bg-white"}`}
                            >
                                <div className="flex justify-between items-center">
                                    <Label className="text-base font-semibold">
                                        {legalDocumentLabel(typeDoc)}{" "}
                                        {isAutre && <span className="text-xs text-muted-foreground font-normal">(optionnel)</span>}
                                    </Label>
                                    {docsForCat.length > 0 ? (
                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none"><CheckCircle className="w-3 h-3 mr-1"/> Uploadé</Badge>
                                    ) : isAutre ? (
                                        <Badge variant="outline" className="text-slate-500 border-slate-200 bg-white"><AlertCircle className="w-3 h-3 mr-1"/> Facultatif</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-200"><AlertCircle className="w-3 h-3 mr-1"/> Manquant</Badge>
                                    )}
                                </div>

                                {isAutre && (
                                  <p className="text-sm text-muted-foreground">
                                    Pièces complémentaires (certificats, attestations de bonne exécution, etc.). Plusieurs fichiers possibles.
                                  </p>
                                )}
                                
                                <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                                        className="max-w-md bg-slate-50"
                                        onChange={(e) => handleDocumentUpload(e, typeDoc)}
                      disabled={uploadingDoc || (profile?.statut !== undefined && profile.statut !== "actif")}
                    />
                  </div>

                                {docsForCat.map((doc) => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 mt-3">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-white p-2 rounded border border-slate-200">
                                                <FileText className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-800">{doc.nom_fichier}</p>
                                                <p className="text-xs text-muted-foreground">Ajouté le {new Date(doc.created_at).toLocaleDateString()}</p>
                                            </div>
                      </div>
                      <div className="flex gap-2">
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
                          <Eye className="w-4 h-4" />
                        </Button>
                                            <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDocumentDelete(doc.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                            </div>
                          );
                        })}
              </CardContent>
            </Card>
            </div>
        )}

        {/* BOÎTE À IDÉES (SUGGESTIONS) */}
        {activeTab === "suggestions" && (
            <div className="animate-in fade-in duration-500 grid gap-6 grid-cols-1 lg:grid-cols-3">
                <div className="lg:col-span-1 space-y-6">
                    <Card className="border-none shadow-sm">
              <CardHeader>
                            <CardTitle>Nouvelle Suggestion</CardTitle>
                            <CardDescription>Partagez vos idées pour améliorer la plateforme.</CardDescription>
              </CardHeader>
              <CardContent>
                            <form onSubmit={handleCreateSuggestion} className="space-y-4">
                      <div className="space-y-2">
                                    <Label htmlFor="sujet">Sujet</Label>
                    <Input
                                        id="sujet"
                                        value={newSuggestion.sujet}
                                        onChange={(e) => setNewSuggestion({ ...newSuggestion, sujet: e.target.value })}
                                        placeholder="Ex: Amélioration du dashboard..."
                                        required
                    />
                        </div>
                      <div className="space-y-2">
                                    <Label htmlFor="message">Message</Label>
                                    <Textarea 
                                        id="message"
                                        value={newSuggestion.message}
                                        onChange={(e) => setNewSuggestion({ ...newSuggestion, message: e.target.value })}
                                        placeholder="Décrivez votre idée..."
                                        required
                                        className="min-h-[150px]"
                                    />
                        </div>
                                <Button type="submit" className="w-full">
                                    Envoyer ma suggestion
                        </Button>
                            </form>
                        </CardContent>
                    </Card>
                      </div>

                <div className="lg:col-span-2">
                    <Card className="border-none shadow-sm h-full">
                        <CardHeader>
                            <CardTitle>Historique de vos suggestions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {suggestions.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>Vous n'avez pas encore envoyé de suggestions.</p>
                        </div>
                            ) : (
                                <div className="space-y-4">
                                    {suggestions.map((sug) => (
                                        <div key={sug.id} className="p-4 border rounded-lg bg-white space-y-2">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-semibold text-slate-800">{sug.sujet}</h4>
                                                <Badge 
                                                    variant={
                                                        sug.statut === 'pending' ? 'outline' : 
                                                        sug.statut === 'rejected' ? 'destructive' : 
                                                        'secondary'
                                                    }
                                                    className={
                                                        sug.statut === 'approved' || sug.statut === 'implemented' 
                                                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                                                            : ''
                                                    }
                                                >
                                                    {sug.statut === 'pending' ? 'En attente' :
                                                     sug.statut === 'approved' ? 'Approuvée' :
                                                     sug.statut === 'implemented' ? 'Implémentée' :
                                                     sug.statut === 'rejected' ? 'Rejetée' :
                                                     sug.statut}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-slate-600 whitespace-pre-line">{sug.message}</p>
                                            <p className="text-xs text-muted-foreground pt-2 border-t mt-2">
                                                Envoyé le {new Date(sug.created_at).toLocaleDateString()}
                                            </p>
                        </div>
                  ))}
                      </div>
                            )}
              </CardContent>
            </Card>
                          </div>
                        </div>
                      )}

        {/* MON PROFIL */}
        {activeTab === "profile" && (
            <div className="animate-in fade-in duration-500 w-full">
                <Card className="border-none shadow-sm w-full">
                    <CardContent className="p-4 sm:p-6 md:p-8">
                        {/* On affiche toujours les infos ici, plus de condition editingProfile */}
                        <div className="space-y-8">
                            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Informations de l'entreprise</h3>
                                    <p className="text-sm text-muted-foreground">
                                      Coordonnées utilisées pour vos échanges. Références professionnelles et pièces déposées sont détaillées ci-dessous.
                                    </p>
                          </div>
                                <Button onClick={() => setEditingProfile(true)} className="shrink-0 self-start sm:self-auto">
                                    Modifier
                                </Button>
                        </div>

                            <div className="grid grid-cols-1 gap-10 xl:grid-cols-12 xl:gap-12">
                              <div className="space-y-6 xl:col-span-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 xl:grid-cols-1 2xl:grid-cols-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center"><Building2 className="w-5 h-5 text-blue-600" /></div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Nom de l'entreprise</p>
                                        <p className="font-medium text-slate-800">{profile?.nom_entreprise || "-"}</p>
                          </div>
                        </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center"><Mail className="w-5 h-5 text-blue-600" /></div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Email de contact</p>
                                        <p className="font-medium text-slate-800">{profile?.email_contact || "-"}</p>
                        </div>
                      </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center"><FileText className="w-5 h-5 text-blue-600" /></div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">NINEA (numéro)</p>
                                        <p className="font-medium text-slate-800">{profile?.ninea || "-"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center"><FileText className="w-5 h-5 text-blue-600" /></div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">RCCM (numéro registre du commerce)</p>
                                        <p className="font-medium text-slate-800">{profile?.rccm || "-"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center"><Phone className="w-5 h-5 text-blue-600" /></div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Téléphone</p>
                                        <p className="font-medium text-slate-800">{profile?.telephone || "-"}</p>
                          </div>
                        </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center"><MapPin className="w-5 h-5 text-blue-600" /></div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Adresse</p>
                                        <p className="font-medium text-slate-800">{profile?.adresse || "-"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border bg-slate-50/80 p-4 md:p-5">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                                  <Award className="w-5 h-5 text-amber-700" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-semibold text-slate-800">Références professionnelles</h4>
                                  <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                                    Clients, marchés ou projets déjà réalisés (facultatif, visible par l’équipe marchés).
                                  </p>
                                  {profile?.references_professionnelles?.trim() ? (
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{profile.references_professionnelles}</p>
                                  ) : (
                                    <p className="text-sm text-muted-foreground italic">Non renseigné — vous pouvez l’ajouter via « Modifier ».</p>
                                  )}
                                </div>
                              </div>
                            </div>
                              </div>

                            {/* Aperçu des pièces déposées (même onglet Mes documents) */}
                            <div className="xl:col-span-7 xl:border-l xl:border-slate-200 xl:pl-10 pt-8 border-t border-slate-200 xl:border-t-0 xl:pt-0 mt-0">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-primary" />
                                    Mes documents déposés
                                </h3>
                                {documents.length === 0 ? (
                                    <div className="text-center py-8 border-2 border-dashed rounded-lg bg-slate-50">
                                        <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                        <p className="text-muted-foreground">Aucun document légal uploadé.</p>
                                        <p className="text-xs text-muted-foreground mt-1">Allez dans l’onglet « Mes documents » pour déposer vos pièces.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {ALL_LEGAL_DOCUMENT_UPLOAD_CATEGORIES.map((categorie) => {
                                            const docs = documents.filter(d => d.categorie === categorie);
                                            const categorieLabel = legalDocumentLabel(categorie);
                                            
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
                                                                Aucun document
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
                    </div>
                  </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}

          </div>
      </main>
      </div>

      <Dialog
        open={isPasswordSettingsOpen}
        onOpenChange={(open) => {
          setIsPasswordSettingsOpen(open);
          if (!open) setPasswordData({ current: "", new: "", confirm: "" });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Paramètres du compte</DialogTitle>
            <DialogDescription>
              Modifiez votre mot de passe pour sécuriser votre compte fournisseur.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePassword} className="grid gap-4 py-2">
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
              <Button type="button" variant="outline" onClick={() => setIsPasswordSettingsOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">Mettre à jour</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODALE DE MODIFICATION DU PROFIL (NOUVEAU) */}
      <Dialog 
        open={editingProfile} 
        onOpenChange={(open) => {
          setEditingProfile(open);
          // Réinitialiser le formulaire avec les valeurs actuelles du profil quand on ouvre le modal
          if (open && profile) {
            setProfileForm({
              nom_entreprise: profile.nom_entreprise || "",
              adresse: profile.adresse || "",
              telephone: profile.telephone || "",
              email_contact: profile.email_contact || "",
              ninea: profile.ninea ?? "",
              rccm: profile.rccm ?? "",
              references_professionnelles: profile.references_professionnelles ?? "",
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Modifier le profil entreprise</DialogTitle>
            <DialogDescription>
              En bas du formulaire : champ facultatif « Références professionnelles » (clients, marchés, contacts attestables).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProfileUpdate} className="grid gap-4 py-4">
            
            <div className="border-t my-2"></div>
            
            {/* Ligne 1 */}
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Nom de l'entreprise</Label>
                        <Input
                          value={profileForm.nom_entreprise}
                        onChange={(e) => setProfileForm({ ...profileForm, nom_entreprise: e.target.value })} 
                          required
                        />
                      </div>
                <div className="grid gap-2">
                    <Label>Email de contact</Label>
                        <Input
                          type="email"
                          value={profileForm.email_contact}
                        onChange={(e) => setProfileForm({ ...profileForm, email_contact: e.target.value })} 
                          required
                        />
                </div>
                      </div>

            {/* Ligne 2 */}
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Téléphone</Label>
                    <Input
                      type="tel"
                      value={profileForm.telephone}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          telephone: sanitizePhoneInput(e.target.value),
                        })
                      }
                      placeholder="Ex. 70, 76, 77 ou 78…"
                      required
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Adresse</Label>
                    <Input
                      value={profileForm.adresse}
                      onChange={(e) => setProfileForm({ ...profileForm, adresse: e.target.value })} 
                      required
                    />
                </div>
            </div>

            {/* NINEA / RCCM */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="ninea">NINEA (numéro)</Label>
                <Input
                  id="ninea"
                  value={profileForm.ninea}
                  onChange={(e) => setProfileForm({ ...profileForm, ninea: e.target.value })}
                  placeholder="Ex. : 123456789"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rccm">RCCM (registre du commerce) — numéro</Label>
                <Input
                  id="rccm"
                  value={profileForm.rccm}
                  onChange={(e) => setProfileForm({ ...profileForm, rccm: e.target.value })}
                  placeholder="Ex. : SN-DKR-2020-A-12345"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="references_professionnelles">Références professionnelles (facultatif)</Label>
              <Textarea
                id="references_professionnelles"
                value={profileForm.references_professionnelles}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, references_professionnelles: e.target.value })
                }
                placeholder="Ex. : prestations pour Société X (2022), marché public n°…, contacts attestables…"
                className="min-h-[120px] resize-y"
              />
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setEditingProfile(false);
                }}>Annuler</Button>
                <Button type="submit">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODALE DE MODIFICATION CANDIDATURE (NOUVEAU) */}
      <Dialog open={!!editingCandidature} onOpenChange={(open) => !open && setEditingCandidature(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier ma candidature</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateCandidature} className="space-y-4 py-4">
                      <div className="space-y-2">
              <Label>Appel d'offres</Label>
              <div className="p-3 bg-slate-50 border rounded-md text-sm font-medium">
                {editingCandidature?.appel_offre.titre}
              </div>
                      </div>

                      <div className="space-y-2">
              <Label htmlFor="edit-montant">Montant de vos offres (FCFA)</Label>
                        <Input
                id="edit-montant"
                type="number"
                min="0"
                value={editMontant}
                onChange={(e) => setEditMontant(e.target.value)}
                required
              />
                    </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingCandidature(null)}>Annuler</Button>
              <Button type="submit">Mettre à jour</Button>
            </DialogFooter>
                  </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}