import { useState, useEffect } from "react";
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
  LogOut,
  LayoutDashboard,
  Settings,
  User as UserIcon,
  MessageSquare
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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
}

interface Document {
  id: number;
  nom_fichier: string;
  categorie: string;
  type_fichier: string;
  chemin_fichier: string;
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
}

interface Suggestion {
  id: number;
  sujet: string;
  message: string;
  statut: string;
  created_at: string;
}

export default function FournisseurDashboard() {
  const { api, user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [newSuggestion, setNewSuggestion] = useState({ sujet: "", message: "" });
  const [profile, setProfile] = useState<FournisseurProfile | null>(null);
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
    quitus_fiscal: "",
  });

  // États pour la modification de candidature
  const [editingCandidature, setEditingCandidature] = useState<Candidature | null>(null);
  const [editMontant, setEditMontant] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, [api]);

  const loadDashboardData = async () => {
    if (!api) return;
    try {
      setLoading(true);
      const [candidaturesRes, documentsRes, profileRes, suggestionsRes] = await Promise.all([
        api.get("/api/fournisseur/candidatures"),
        api.get("/api/fournisseur/documents-legaux"),
        api.get("/api/fournisseur/profile"),
        api.get("/api/suggestions"),
      ]);

      const candData = candidaturesRes.data;
      setCandidatures(Array.isArray(candData) ? candData : candData.data || []);

      const docsData = documentsRes.data;
      setDocuments(Array.isArray(docsData) ? docsData : docsData.data || []);

      setSuggestions(suggestionsRes.data || []);

      setProfile(profileRes.data);
      setProfileForm({
        nom_entreprise: profileRes.data.nom_entreprise || "",
        adresse: profileRes.data.adresse || "",
        telephone: profileRes.data.telephone || "",
        email_contact: profileRes.data.email_contact || "",
        ninea: profileRes.data.ninea || "",
        rccm: profileRes.data.rccm || "",
        quitus_fiscal: profileRes.data.quitus_fiscal || "",
      });
    } catch (error: any) {
      console.error("Erreur chargement dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api) return;
    try {
      const response = await api.put("/api/fournisseur/profile", profileForm);
      setProfile(response.data);
      setEditingProfile(false);
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été enregistrées avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.response?.data?.message || "Erreur lors de la mise à jour",
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
        description: "Le montant de votre offre a été modifié.",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erreur",
        description: error.response?.data?.message || "Impossible de mettre à jour la candidature.",
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
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.response?.data?.message || "Erreur lors de l'envoi",
        variant: "destructive",
      });
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, categorie: string) => {
    if (!api) return;
    const file = e.target.files?.[0];
    if (!file) return;

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
        description: `${categorie} ajouté avec succès`,
      });

      loadDashboardData();
    } catch (error: any) {
      toast({
        title: "Erreur d'upload",
        description: error.response?.data?.message || "Erreur lors de l'upload",
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
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le document",
        variant: "destructive",
      });
    }
  };

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
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
      <Badge variant={config.variant as any} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const stats = {
    candidatures_total: candidatures.length,
    candidatures_en_cours: candidatures.filter((c) => c.statut === "submitted" || c.statut === "SOUMISE" || c.statut === "under_review" || c.statut === "EN_EVALUATION").length,
    candidatures_acceptees: candidatures.filter((c) => c.statut === "accepted" || c.statut === "ACCEPTEE").length,
    documents_total: documents.length,
  };

  const handleLogout = async () => {
    await logout();
    toast({ title: "Déconnexion", description: "Vous avez été déconnecté." });
    navigate("/connexion");
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

  return (
    <div className="min-h-screen flex bg-slate-100">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-50 flex flex-col shadow-sm">
        
        {/* EN-TÊTE PROFIL */}
        <div className="p-6 border-b border-slate-100 flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl mb-3">
              {profile?.nom_entreprise?.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase()}
            </div>
            <h2 className="font-bold text-lg text-slate-800 line-clamp-1" title={profile?.nom_entreprise || user?.name}>
              {profile?.nom_entreprise || user?.name}
            </h2>
            <p className="text-xs text-muted-foreground truncate w-full">{user?.email}</p>
            <Badge variant="outline" className="mt-2 text-xs border-blue-200 text-blue-600 bg-blue-50">
              Fournisseur
            </Badge>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <Button
            variant={activeTab === "overview" ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === "overview" ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "text-slate-600 hover:bg-slate-100"}`}
            onClick={() => setActiveTab("overview")}
          >
            <LayoutDashboard className="w-4 h-4 mr-3" />
            Vue d'ensemble
          </Button>

          <Button
            variant={activeTab === "candidatures" ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === "candidatures" ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "text-slate-600 hover:bg-slate-100"}`}
            onClick={() => setActiveTab("candidatures")}
          >
            <FileText className="w-4 h-4 mr-3" />
            Mes candidatures
          </Button>

          <Button
            variant={activeTab === "documents" ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === "documents" ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "text-slate-600 hover:bg-slate-100"}`}
            onClick={() => setActiveTab("documents")}
          >
            <Upload className="w-4 h-4 mr-3" />
            Documents légaux
          </Button>

          <Button
            variant={activeTab === "suggestions" ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === "suggestions" ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "text-slate-600 hover:bg-slate-100"}`}
            onClick={() => setActiveTab("suggestions")}
          >
            <MessageSquare className="w-4 h-4 mr-3" />
            Boîte à idées
          </Button>

          <Button
            variant={activeTab === "profile" ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === "profile" ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "text-slate-600 hover:bg-slate-100"}`}
            onClick={() => setActiveTab("profile")}
          >
            <UserIcon className="w-4 h-4 mr-3" />
            Mon profil
          </Button>
        </nav>

        {/* PIED DE PAGE : DECONNEXION */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
            <Button 
                variant="destructive" 
                className="w-full justify-start hover:bg-red-600" 
                onClick={handleLogout}
            >
                <LogOut className="w-4 h-4 mr-3" />
                Déconnexion
            </Button>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        
        {/* En-tête de section dynamique */}
        <div className="flex justify-between items-center mb-8">
           <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {activeTab === 'overview' && "Tableau de bord Fournisseur"}
                {activeTab === 'candidatures' && "Suivi des Candidatures"}
                {activeTab === 'documents' && "Gestion Documentaire"}
                {activeTab === 'suggestions' && "Boîte à idées"}
                {activeTab === 'profile' && "Profil Entreprise"}
              </h1>
              <p className="text-slate-500 mt-1">
                {activeTab === 'overview' && `Bienvenue, ${profile?.nom_entreprise || user?.name}. Voici un résumé de vos activités.`}
                {activeTab === 'candidatures' && "Consultez l'historique et le statut de vos soumissions."}
                {activeTab === 'documents' && "Assurez-vous que vos documents légaux sont à jour."}
                {activeTab === 'suggestions' && "Proposez des améliorations pour la plateforme."}
                {activeTab === 'profile' && "Mettez à jour les informations de votre entreprise."}
              </p>
           </div>
        </div>

        {/* VUE D'ENSEMBLE */}
        {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Cartes statistiques */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="border-none shadow-sm hover:shadow-md transition-all">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Candidatures totales</CardTitle>
                        <div className="bg-blue-50 p-2 rounded-lg"><FileText className="w-4 h-4 text-blue-600" /></div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{stats.candidatures_total}</div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Card className="border-none shadow-sm hover:shadow-md transition-all">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">En cours</CardTitle>
                        <div className="bg-orange-50 p-2 rounded-lg"><Clock className="w-4 h-4 text-orange-600" /></div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{stats.candidatures_en_cours}</div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Card className="border-none shadow-sm hover:shadow-md transition-all">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Acceptées</CardTitle>
                        <div className="bg-green-50 p-2 rounded-lg"><Award className="w-4 h-4 text-green-600" /></div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.candidatures_acceptees}</div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Card className="border-none shadow-sm hover:shadow-md transition-all">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Documents</CardTitle>
                        <div className="bg-purple-50 p-2 rounded-lg"><Upload className="w-4 h-4 text-purple-600" /></div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{stats.documents_total}</div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Dernières candidatures</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {candidatures.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">Aucune candidature pour le moment.</p>
                        ) : (
                            <div className="space-y-3">
                                {candidatures.slice(0, 5).map((candidature) => (
                                    <div key={candidature.id} className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-slate-50 transition-colors">
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-slate-800">{candidature.appel_offre.titre}</h4>
                                            <div className="flex gap-4 mt-1">
                                                <span className="text-xs text-muted-foreground">Réf: {candidature.appel_offre.numero_reference}</span>
                                                <span className="text-xs text-muted-foreground">Soumis le: {new Date(candidature.date_soumission).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div>{getStatutBadge(candidature.statut)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        )}

        {/* MES CANDIDATURES */}
        {activeTab === "candidatures" && (
            <div className="animate-in fade-in duration-500">
                <div className="flex justify-end mb-4">
                    <Button onClick={() => navigate("/appels-offres")}>
                        Voir les offres disponibles
                    </Button>
                </div>
                <Card className="border-none shadow-sm">
                    <CardContent className="p-6">
                        {candidatures.length === 0 ? (
                            <div className="text-center py-12">
                                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                                <p className="text-muted-foreground">Vous n'avez pas encore postulé à des appels d'offres.</p>
                                <Button className="mt-4" onClick={() => navigate("/appels-offres")}>
                                    Consulter les offres disponibles
                                </Button>
                            </div>
                        ) : (
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
                                                    {candidature.montant_propose && (
                                                        <div className="flex justify-between md:justify-start gap-2">
                                                            <span className="text-muted-foreground">Montant:</span>
                                                            <span className="font-medium text-primary">{candidature.montant_propose.toLocaleString()} FCFA</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                {getStatutBadge(candidature.statut)}
                                                {(candidature.statut === 'submitted' || candidature.statut === 'SOUMISE') && (
                                                  <Button variant="outline" size="sm" onClick={() => handleEditClick(candidature)}>
                                                      Modifier
                                                  </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        )}

        {/* DOCUMENTS LEGAUX */}
        {activeTab === "documents" && (
            <div className="animate-in fade-in duration-500">
                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Documents requis</CardTitle>
                        <CardDescription>Maintenez vos documents à jour pour pouvoir postuler.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {["RCCM", "NINEA", "QUITUS_FISCAL"].map((typeDoc) => (
                            <div key={typeDoc} className="space-y-3 p-4 border rounded-lg bg-white">
                                <div className="flex justify-between items-center">
                                    <Label className="text-base font-semibold">
                                        {typeDoc === "RCCM" && "RCCM (Registre du Commerce)"}
                                        {typeDoc === "NINEA" && "NINEA"}
                                        {typeDoc === "QUITUS_FISCAL" && "Quitus Fiscal"}
                                    </Label>
                                    {documents.some(d => d.categorie === typeDoc) ? (
                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none"><CheckCircle className="w-3 h-3 mr-1"/> Uploadé</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-200"><AlertCircle className="w-3 h-3 mr-1"/> Manquant</Badge>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-4">
                                    <Input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        className="max-w-md bg-slate-50"
                                        onChange={(e) => handleDocumentUpload(e, typeDoc)}
                                        disabled={uploadingDoc}
                                    />
                                </div>

                                {documents.filter((d) => d.categorie === typeDoc).map((doc) => (
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
                                            <Button size="sm" variant="outline" onClick={() => window.open(`/storage/${doc.chemin_fichier}`, "_blank")}>
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDocumentDelete(doc.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
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
                                                <Badge variant={sug.statut === 'pending' ? 'outline' : 'secondary'}>
                                                    {sug.statut === 'pending' ? 'En attente' : sug.statut}
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
            <div className="animate-in fade-in duration-500">
                <Card className="border-none shadow-sm max-w-4xl">
                    <CardContent className="p-6">
                        {/* On affiche toujours les infos ici, plus de condition editingProfile */}
                        <div className="space-y-8">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Informations de l'entreprise</h3>
                                    <p className="text-sm text-muted-foreground">Ces informations seront utilisées pour vos documents.</p>
                                </div>
                                <Button onClick={() => setEditingProfile(true)}>
                                    Modifier
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center"><Building2 className="w-4 h-4 text-blue-600" /></div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Nom de l'entreprise</p>
                                            <p className="font-medium text-slate-800">{profile?.nom_entreprise || "-"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center"><Mail className="w-4 h-4 text-blue-600" /></div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Email de contact</p>
                                            <p className="font-medium text-slate-800">{profile?.email_contact || "-"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center"><Phone className="w-4 h-4 text-blue-600" /></div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Téléphone</p>
                                            <p className="font-medium text-slate-800">{profile?.telephone || "-"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center"><MapPin className="w-4 h-4 text-blue-600" /></div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Adresse</p>
                                            <p className="font-medium text-slate-800">{profile?.adresse || "-"}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 bg-slate-50 p-6 rounded-lg border border-slate-100">
                                    <h4 className="font-semibold text-sm text-slate-600 mb-2">Identifiants Légaux</h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground">NINEA</p>
                                            <p className="font-mono font-medium">{profile?.ninea || "Non renseigné"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">RCCM</p>
                                            <p className="font-mono font-medium">{profile?.rccm || "Non renseigné"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Quitus Fiscal</p>
                                            <p className="font-mono font-medium">{profile?.quitus_fiscal || "Non renseigné"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}

      </main>

      {/* MODALE DE MODIFICATION DU PROFIL (NOUVEAU) */}
      <Dialog open={editingProfile} onOpenChange={setEditingProfile}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Modifier le profil entreprise</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleProfileUpdate} className="grid gap-4 py-4">
            
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
                        value={profileForm.telephone} 
                        onChange={(e) => setProfileForm({ ...profileForm, telephone: e.target.value })} 
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

            <div className="border-t my-2"></div>
            <p className="text-sm font-medium text-slate-500 mb-2">Identifiants légaux</p>

            {/* Ligne 3 */}
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>NINEA</Label>
                    <Input 
                        value={profileForm.ninea} 
                        onChange={(e) => setProfileForm({ ...profileForm, ninea: e.target.value })} 
                    />
                </div>
                <div className="grid gap-2">
                    <Label>RCCM</Label>
                    <Input 
                        value={profileForm.rccm} 
                        onChange={(e) => setProfileForm({ ...profileForm, rccm: e.target.value })} 
                    />
                </div>
            </div>

            {/* Ligne 4 */}
            <div className="grid grid-cols-2 gap-4">
                 <div className="grid gap-2">
                    <Label>Quitus Fiscal</Label>
                    <Input 
                        value={profileForm.quitus_fiscal} 
                        onChange={(e) => setProfileForm({ ...profileForm, quitus_fiscal: e.target.value })} 
                    />
                </div>
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingProfile(false)}>Annuler</Button>
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
              <Label>Appel d'offre</Label>
              <div className="p-3 bg-slate-50 border rounded-md text-sm font-medium">
                {editingCandidature?.appel_offre.titre}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-montant">Montant de votre offre (FCFA)</Label>
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