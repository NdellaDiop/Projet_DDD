import { useState, useEffect } from "react";
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
  BarChart3,
  Briefcase,
  Settings
} from "lucide-react";

interface AppelOffre {
  id: number;
  reference: string;
  titre: string;
  description: string;
  date_limite_depot: string;
  statut: 'draft' | 'published' | 'closed' | 'archived';
  candidatures_count?: number;
}

interface Candidature {
  id: number;
  fournisseur: {
    id: number;
    nom_entreprise: string;
    email_contact: string;
  };
  date_soumission: string;
  statut: string;
  montant_propose?: number;
}

export default function ResponsableDashboard() {
  const { api, user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("appels-offres");
  const [appelsOffres, setAppelsOffres] = useState<AppelOffre[]>([]);
  const [selectedAppelOffre, setSelectedAppelOffre] = useState<AppelOffre | null>(null);
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [loading, setLoading] = useState(true);

  // États pour la création
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTender, setNewTender] = useState({
    titre: "",
    description: "",
    date_limite_depot: "",
  });

  // État pour voir les candidatures d'un AO
  const [isViewCandidatesOpen, setIsViewCandidatesOpen] = useState(false);

  // État pour les paramètres
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });


  useEffect(() => {
    loadData();
  }, [api]);

  const loadData = async () => {
    if (!api) return;
    try {
      setLoading(true);
      const response = await api.get("/api/responsable/mes-appels-offres");
      setAppelsOffres(response.data);
    } catch (error) {
      console.error("Erreur chargement:", error);
    } finally {
      setLoading(false);
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
      setIsCreateOpen(false);
      setNewTender({ titre: "", description: "", date_limite_depot: "" });
      loadData();
    } catch (error: any) {
      console.error("Erreur création:", error);
      const message = error.response?.data?.message || "Erreur lors de la création.";
      // Si on a des erreurs de validation précises
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
      loadData();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de publier.", variant: "destructive" });
    }
  };

  const handleClose = async (id: number) => {
    if (!api) return;
    try {
      await api.post(`/api/appels-offres/${id}/close`);
      toast({ title: "Clôturé", description: "L'appel d'offre est fermé aux candidatures." });
      loadData();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de clôturer.", variant: "destructive" });
    }
  };

  const handleViewCandidatures = async (ao: AppelOffre) => {
    if (!api) return;
    setSelectedAppelOffre(ao);
    try {
      const res = await api.get(`/api/responsable/appels-offres/${ao.id}/candidatures-recues`); 
      setCandidatures(res.data);
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
      setCandidatures(prev => prev.map(c => c.id === candidatureId ? { ...c, statut: decision === 'accept' ? 'accepted' : 'rejected' } : c));
    } catch (error: any) {
      console.error("Erreur évaluation:", error);
      const message = error.response?.data?.message || "Action impossible.";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    }
  };

  const getStatutBadge = (statut: string) => {
    const map: Record<string, any> = {
      draft: { label: "Brouillon", variant: "secondary" },
      published: { label: "Publié", variant: "default" },
      closed: { label: "Clôturé", variant: "destructive" },
      archived: { label: "Archivé", variant: "outline" },
    };
    const config = map[statut] || { label: statut, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
      setIsSettingsOpen(false);
      setPasswordData({ current: "", new: "", confirm: "" });
    } catch (error: any) {
        const message = error.response?.data?.message || "Erreur lors de la mise à jour du mot de passe.";
        toast({ title: "Erreur", description: message, variant: "destructive" });
    }
  };

  if (loading) {
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
    <div className="min-h-screen flex bg-slate-100">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-50 flex flex-col shadow-sm">
        
        {/* EN-TÊTE PROFIL */}
        <div className="p-6 border-b border-slate-100 flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl mb-3">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <h2 className="font-bold text-lg text-slate-800 line-clamp-1" title={user?.name}>
              {user?.name}
            </h2>
            <p className="text-xs text-muted-foreground truncate w-full">{user?.email}</p>
            <Badge variant="outline" className="mt-2 text-xs border-primary/20 text-primary bg-primary/5">
              Responsable Marché
            </Badge>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <Button
            variant={activeTab === "appels-offres" ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === "appels-offres" ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "text-slate-600 hover:bg-slate-100"}`}
            onClick={() => setActiveTab("appels-offres")}
          >
            <Briefcase className="w-4 h-4 mr-3" />
            Mes Appels d'Offres
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
                {activeTab === 'appels-offres' && "Gestion des Appels d'Offres"}
                {activeTab === 'statistiques' && "Tableau de Bord Statistiques"}
              </h1>
              <p className="text-slate-500 mt-1">
                {activeTab === 'appels-offres' && "Créez, publiez et gérez vos appels d'offres et candidatures."}
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

        {/* TAB: MES APPELS D'OFFRES */}
        {activeTab === "appels-offres" && (
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
                                  <TableHead className="font-semibold">Candidatures</TableHead>
                                  <TableHead className="text-right font-semibold">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {appelsOffres.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <Briefcase className="w-8 h-8 text-slate-300" />
                                                <p>Aucun appel d'offre créé pour le moment.</p>
                                                <Button variant="link" onClick={() => setIsCreateOpen(true)} className="text-primary">
                                                    Créer votre premier appel d'offre
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : appelsOffres.map((ao) => (
                                  <TableRow key={ao.id} className="hover:bg-slate-50/50">
                                    <TableCell className="font-mono text-xs font-medium text-slate-600">{ao.reference}</TableCell>
                                    <TableCell className="font-medium text-slate-800">{ao.titre}</TableCell>
                                    <TableCell className="text-slate-600">{new Date(ao.date_limite_depot).toLocaleDateString()}</TableCell>
                                    <TableCell>{getStatutBadge(ao.statut)}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Users className="w-3 h-3 text-slate-400" />
                                            <span className="text-sm font-medium">{ao.candidatures_count || 0}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
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
                    </CardContent>
                </Card>
            </div>
        )}

        {/* TAB: STATISTIQUES */}
        {activeTab === "statistiques" && (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-none shadow-sm hover:shadow-md transition-all">
                        <CardContent className="p-6 flex flex-col items-center text-center">
                            <div className="p-3 bg-blue-50 rounded-full mb-4">
                                <Briefcase className="w-6 h-6 text-blue-600" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">Total Appels d'Offres</p>
                            <h3 className="text-3xl font-bold text-slate-800 mt-2">{appelsOffres.length}</h3>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm hover:shadow-md transition-all">
                        <CardContent className="p-6 flex flex-col items-center text-center">
                            <div className="p-3 bg-green-50 rounded-full mb-4">
                                <Megaphone className="w-6 h-6 text-green-600" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">En cours de publication</p>
                            <h3 className="text-3xl font-bold text-slate-800 mt-2">
                                {appelsOffres.filter(ao => ao.statut === 'published').length}
                            </h3>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm hover:shadow-md transition-all">
                        <CardContent className="p-6 flex flex-col items-center text-center">
                            <div className="p-3 bg-purple-50 rounded-full mb-4">
                                <Users className="w-6 h-6 text-purple-600" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">Candidatures reçues</p>
                            <h3 className="text-3xl font-bold text-slate-800 mt-2">
                                {appelsOffres.reduce((acc, ao) => acc + (ao.candidatures_count || 0), 0)}
                            </h3>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm hover:shadow-md transition-all">
                        <CardContent className="p-6 flex flex-col items-center text-center">
                            <div className="p-3 bg-orange-50 rounded-full mb-4">
                                <Archive className="w-6 h-6 text-orange-600" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">Marchés clôturés</p>
                            <h3 className="text-3xl font-bold text-slate-800 mt-2">
                                {appelsOffres.filter(ao => ao.statut === 'closed').length}
                            </h3>
                        </CardContent>
                    </Card>
                </div>

                {/* Liste des derniers AO pour stats rapides */}
                <Card className="border-none shadow-sm mt-6">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Aperçu rapide</h3>
                        <div className="space-y-4">
                             {appelsOffres.slice(0, 3).map(ao => (
                                 <div key={ao.id} className="flex items-center justify-between p-4 border rounded-lg">
                                     <div>
                                         <p className="font-medium">{ao.titre}</p>
                                         <p className="text-xs text-muted-foreground">{ao.reference}</p>
                                     </div>
                                     <div className="flex gap-4 text-sm text-muted-foreground">
                                         <span className="flex items-center gap-1"><Users className="w-4 h-4"/> {ao.candidatures_count || 0}</span>
                                         <span className="flex items-center gap-1">{getStatutBadge(ao.statut)}</span>
                                     </div>
                                 </div>
                             ))}
                             {appelsOffres.length === 0 && <p className="text-muted-foreground">Aucune donnée à afficher.</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}

      </main>

      {/* Modale Création */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
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
                    {selectedAppelOffre && (
                        <Badge variant="outline" className="font-normal text-muted-foreground">
                            {selectedAppelOffre.reference}
                        </Badge>
                    )}
                </DialogTitle>
            </DialogHeader>
            <div className="py-4">
                {candidatures.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-muted-foreground">Aucune candidature reçue pour le moment.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {candidatures.map(cand => (
                            <div key={cand.id} className="flex flex-col md:flex-row md:items-center justify-between border p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition-all">
                                <div className="space-y-1 mb-4 md:mb-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-lg text-slate-800">{cand.fournisseur.nom_entreprise}</h4>
                                        <Badge variant={cand.statut === 'accepted' ? 'default' : cand.statut === 'rejected' ? 'destructive' : 'secondary'}>
                                            {cand.statut}
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
                                    <Button size="sm" variant="outline">
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
}