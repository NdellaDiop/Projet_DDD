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
  MessageSquare
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

  // ============================================
  // CHARGEMENT DES DONNÉES
  // ============================================

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!api) {
        throw new Error("API client non disponible.");
      }

      const statsResponse = await api.get('/api/admin/dashboard-stats');
      setStats(statsResponse.data);
      const appelsOffresResponse = await api.get('/api/admin/appels-offres-dashboard');
      setAppelsOffres(appelsOffresResponse.data);
      const fournisseursResponse = await api.get('/api/admin/fournisseurs-dashboard');
      setFournisseurs(fournisseursResponse.data);
      const responsablesResponse = await api.get('/api/admin/responsables-dashboard');
      setResponsables(responsablesResponse.data);
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
  }, [api]);

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
              </h1>
              <p className="text-slate-500 mt-1">
                {activeTab === 'vue-ensemble' && "Métriques clés et activités récentes"}
                {activeTab === 'appels-offres' && "Suivez et gérez tous les appels d'offres de la plateforme"}
                {activeTab === 'fournisseurs' && "Gérez les inscriptions et validations des fournisseurs"}
                {activeTab === 'responsables' && "Administrez les comptes des responsables de marché"}
                {activeTab === 'suggestions' && "Consultez et traitez les retours des fournisseurs"}
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
                        .filter((ao) => {
                          const matchesSearch = ao.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                ao.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                ao.responsable.name.toLowerCase().includes(searchTerm.toLowerCase());
                          const matchesStatut = filterStatut === "tous" || ao.statut === filterStatut;
                          return matchesSearch && matchesStatut;
                        })
                        .map((ao) => (
                        <TableRow key={ao.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-mono text-sm font-medium text-primary">{ao.reference}</TableCell>
                          <TableCell className="font-medium text-slate-700">{ao.titre}</TableCell>
                          <TableCell>{getStatutBadge(ao.statut)}</TableCell>
                          <TableCell className="text-sm text-slate-500">{formatDate(ao.date_cloture)}</TableCell>
                          <TableCell>
                             <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                    {ao.responsable.name.charAt(0)}
                                </div>
                                <span className="text-sm">{ao.responsable.name}</span>
                             </div>
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