import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import {
  Calendar,
  Clock,
  FileText,
  Building2,
  ArrowLeft,
  Download,
  Send,
  User,
  CheckCircle,
  AlertCircle,
  Upload,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AppelOffre {
  id: number;
  titre: string;
  reference: string;
  description: string;
  date_publication: string;
  date_limite_depot: string;
  statut: 'draft' | 'published' | 'closed' | 'archived';
  responsable?: {
    name: string;
    email: string;
  };
  documents?: { id: number; nom_fichier: string; categorie: string; download_url: string }[];
}

const AppelOffreDetails = () => {
  const { id } = useParams();
  const { api, user, isAuthenticated, isFournisseur, isAdmin, isResponsableMarche } = useAuth();
  const navigate = useNavigate();
  const [appelOffre, setAppelOffre] = useState<AppelOffre | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // État pour la modale de candidature
  const [isPostulerOpen, setIsPostulerOpen] = useState(false);
  const [submissionData, setSubmissionData] = useState({
    montant_propose: "",
  });
  const [offreTechnique, setOffreTechnique] = useState<File | null>(null);
  const [offreFinanciere, setOffreFinanciere] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Documents joints à l'AO (cahier/règlement/annexes)
  const [isUploadAoDocOpen, setIsUploadAoDocOpen] = useState(false);
  const [aoDocCategory, setAoDocCategory] = useState<"CAHIER_DES_CHARGES" | "REGLEMENT_CONSULTATION" | "ANNEXE_AO">("CAHIER_DES_CHARGES");
  const [aoDocFile, setAoDocFile] = useState<File | null>(null);
  const [uploadingAoDoc, setUploadingAoDoc] = useState(false);
  const [deletingAoDocId, setDeletingAoDocId] = useState<number | null>(null);

  const canManageAoDocs = isAuthenticated && (isAdmin || isResponsableMarche);

  const aoDocCategoryLabel: Record<string, string> = {
    CAHIER_DES_CHARGES: "Cahier des charges",
    REGLEMENT_CONSULTATION: "Règlement de consultation",
    ANNEXE_AO: "Annexe",
  };

  // Calcul des jours restants
  const calculateDaysLeft = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        // On suppose que l'API a une route GET /api/appels-offres/{id}
        // Si elle n'existe pas, il faudra l'ajouter au backend.
        const response = await api.get(`/api/appels-offres/${id}`);
        setAppelOffre(response.data.data || response.data);
      } catch (err: unknown) {
        console.error("Erreur chargement détails:", err);
        setError("Impossible de charger les détails de cet appel d'offre.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
        fetchDetails();
    }
  }, [id, api]);

  const refreshDetails = async () => {
    if (!api || !id) return;
    const response = await api.get(`/api/appels-offres/${id}`);
    setAppelOffre(response.data.data || response.data);
  };

  const downloadAoDocument = async (doc: { id: number; nom_fichier: string; download_url: string }) => {
    if (!api) return;
    try {
      const response = await api.get(doc.download_url, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = doc.nom_fichier || `document-${doc.id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: unknown) {
      console.error("Erreur téléchargement document AO:", err);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger ce document.",
        variant: "destructive",
      });
    }
  };

  const uploadAoDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api || !appelOffre || !aoDocFile) return;

    try {
      setUploadingAoDoc(true);
      const formData = new FormData();
      formData.append("file", aoDocFile);
      formData.append("categorie", aoDocCategory);
      formData.append("appel_offre_id", String(appelOffre.id));

      await api.post("/api/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast({
        title: "Document ajouté",
        description: `${aoDocCategoryLabel[aoDocCategory]} joint à l'appel d'offres.`,
      });

      setAoDocFile(null);
      setIsUploadAoDocOpen(false);
      await refreshDetails();
    } catch (err: unknown) {
      console.error("Erreur upload document AO:", err);
      const responseData =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data
          : undefined;

      let description = "Impossible d'ajouter le document à l'appel d'offres.";
      if (responseData?.errors) {
        description = Object.entries(responseData.errors)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(", ") : String(messages)}`)
          .join(" | ");
      } else if (typeof responseData?.message === "string") {
        description = responseData.message;
      }

      toast({
        title: "Erreur",
        description,
        variant: "destructive",
      });
    } finally {
      setUploadingAoDoc(false);
    }
  };

  const deleteAoDocument = async (doc: { id: number; nom_fichier: string }) => {
    if (!api) return;
    if (!window.confirm(`Supprimer « ${doc.nom_fichier} » ? Cette action est définitive.`)) return;

    try {
      setDeletingAoDocId(doc.id);
      await api.delete(`/api/documents/${doc.id}`);
      toast({
        title: "Document supprimé",
        description: "La pièce jointe a été retirée de l'appel d'offres.",
      });
      await refreshDetails();
    } catch (err: unknown) {
      console.error("Erreur suppression document AO:", err);
      const responseData =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
          : undefined;
      toast({
        title: "Erreur",
        description:
          typeof responseData?.message === "string"
            ? responseData.message
            : "Impossible de supprimer ce document.",
        variant: "destructive",
      });
    } finally {
      setDeletingAoDocId(null);
    }
  };

  const handlePostuler = () => {
    if (!isAuthenticated) {
        navigate("/connexion"); // Rediriger vers login si pas connecté
        return;
    }
    setIsPostulerOpen(true);
  };

  const submitCandidature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api || !appelOffre) return;

    try {
        setSubmitting(true);
        
        const montant = parseFloat(submissionData.montant_propose);
        if (isNaN(montant) || montant < 0) {
            setSubmitting(false);
            toast({
                title: "Erreur",
                description: "Veuillez entrer un montant valide.",
                variant: "destructive"
            });
            return;
        }

        // Créer la candidature
        const candidatureResponse = await api.post(`/api/appels-offres/${appelOffre.id}/candidatures`, {
            montant_propose: montant,
            fournisseur_id:
              typeof user === "object" && user !== null && "fournisseur" in user
                ? (((user as { fournisseur?: { id?: number }; id?: number }).fournisseur?.id) ??
                  (user as { fournisseur?: { id?: number }; id?: number }).id)
                : undefined,
        });

        const candidatureId = candidatureResponse.data.data?.id || candidatureResponse.data.id;

        // Upload des documents si fournis
        const uploadPromises = [];
        
        if (offreTechnique) {
            const formDataTech = new FormData();
            formDataTech.append('file', offreTechnique);
            formDataTech.append('categorie', 'OFFRE_TECHNIQUE');
            formDataTech.append('candidature_id', candidatureId.toString());
            uploadPromises.push(
                api.post('/api/documents', formDataTech, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
            );
        }

        if (offreFinanciere) {
            const formDataFin = new FormData();
            formDataFin.append('file', offreFinanciere);
            formDataFin.append('categorie', 'OFFRE_FINANCIERE');
            formDataFin.append('candidature_id', candidatureId.toString());
            uploadPromises.push(
                api.post('/api/documents', formDataFin, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
            );
        }

        // Attendre que tous les uploads soient terminés
        if (uploadPromises.length > 0) {
            await Promise.all(uploadPromises);
        }

        toast({
            title: "Candidature envoyée",
            description: "Votre candidature a été soumise avec succès.",
        });
        setIsPostulerOpen(false);
        setSubmissionData({ montant_propose: "" });
        setOffreTechnique(null);
        setOffreFinanciere(null);
        navigate("/fournisseur/dashboard");

    } catch (error: unknown) {
        console.error("Erreur soumission:", error);
        const responseData =
          typeof error === "object" &&
          error !== null &&
          "response" in error
            ? (error as { response?: { data?: { message?: string; missing_documents?: unknown[] } } }).response?.data
            : undefined;
        const errorMessage = responseData?.message || "Impossible de soumettre la candidature.";
        const missingDocs = responseData?.missing_documents;
        
        let description = errorMessage;
        if (missingDocs && Array.isArray(missingDocs)) {
            description = errorMessage + " Veuillez les uploader dans votre dashboard (section Documents légaux).";
        }
        
        toast({
            title: "Erreur",
            description: description,
            variant: "destructive"
        });
    } finally {
        setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="text-muted-foreground">Chargement des détails...</p>
            </div>
        </main>
      </div>
    );
  }

  if (error || !appelOffre) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                <h2 className="text-2xl font-bold text-slate-800">Appel d'offre non trouvé</h2>
                <p className="text-muted-foreground">{error || "Cet appel d'offre n'existe pas ou a été supprimé."}</p>
                <Button variant="outline" onClick={() => navigate("/appels-offres")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour à la liste
                </Button>
            </div>
        </main>
      </div>
    );
  }

  const daysLeft = calculateDaysLeft(appelOffre.date_limite_depot);
  const isClosed = daysLeft === 0 || appelOffre.statut === 'closed';
  const dashboardBackHref = isAdmin ? "/admin" : isResponsableMarche ? "/responsable/dashboard" : "/appels-offres";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 py-10">
        <div className="container max-w-5xl">
            
            {/* Bouton Retour (Hors de la grille pour aligner les blocs en dessous) */}
            <div className="mb-6 flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  className="pl-0 hover:bg-transparent hover:text-primary"
                  onClick={() => navigate(dashboardBackHref)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour au dashboard
                </Button>
                <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-primary" onClick={() => navigate("/appels-offres")}>
                  Retour à la liste publique
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Colonne Principale (Gauche) */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* En-tête de l'AO */}
                    <Card className="border-none shadow-sm overflow-hidden h-full">
                        <div className="h-2 bg-primary w-full"></div>
                        <CardHeader>
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <Badge variant="outline" className="mb-2 border-primary/20 text-primary bg-primary/5">
                                        {appelOffre.reference}
                                    </Badge>
                                    <CardTitle className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight">
                                        {appelOffre.titre}
                                    </CardTitle>
                                </div>
                                <Badge variant={isClosed ? "secondary" : "default"} className="text-sm px-3 py-1">
                                    {isClosed ? "Clôturé" : "Ouvert"}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="prose prose-slate max-w-none">
                                <h3 className="text-lg font-semibold text-slate-700 mb-2">Description du besoin</h3>
                                <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                                    {appelOffre.description}
                                </p>
                            </div>

                            <Separator />

                            <div>
                                <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    Documents joints
                                </h3>
                                {canManageAoDocs && (
                                  <div className="mb-4">
                                    <Button variant="outline" size="sm" onClick={() => setIsUploadAoDocOpen(true)}>
                                      <Upload className="h-4 w-4 mr-2" />
                                      Ajouter un document
                                    </Button>
                                  </div>
                                )}
                                {appelOffre.documents && appelOffre.documents.length > 0 ? (
                                    <div className="grid gap-3">
                                        {appelOffre.documents.map((doc) => (
                                            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-white p-2 rounded border">
                                                        <FileText className="h-5 w-5 text-slate-400" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                      <span className="font-medium text-slate-700">{doc.nom_fichier}</span>
                                                      <span className="text-xs text-muted-foreground">{aoDocCategoryLabel[doc.categorie] ?? doc.categorie}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                      downloadAoDocument({
                                                        id: doc.id,
                                                        nom_fichier: doc.nom_fichier,
                                                        download_url: doc.download_url,
                                                      })
                                                    }
                                                  >
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Télécharger
                                                  </Button>
                                                  {canManageAoDocs && (
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                      disabled={deletingAoDocId === doc.id}
                                                      onClick={() => deleteAoDocument({ id: doc.id, nom_fichier: doc.nom_fichier })}
                                                    >
                                                      <Trash2 className="h-4 w-4 mr-2" />
                                                      {deletingAoDocId === doc.id ? "…" : "Supprimer"}
                                                    </Button>
                                                  )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">Aucun document joint à cet appel d'offre pour le moment.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* Colonne Latérale (Droite) */}
                <div className="space-y-6">
                    
                    {/* Carte d'action */}
                    <Card className="border-none shadow-sm sticky top-24">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                            <CardTitle className="text-lg font-semibold text-slate-800">Informations clés</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Calendar className="h-5 w-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Date limite de dépôt</p>
                                        <p className="font-semibold text-slate-800">
                                            {new Date(appelOffre.date_limite_depot).toLocaleDateString("fr-FR", {
                                                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="flex items-start gap-3">
                                    <Clock className="h-5 w-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Délai restant</p>
                                        <p className={`font-semibold ${daysLeft <= 5 ? 'text-destructive' : 'text-green-600'}`}>
                                            {isClosed ? "Terminé" : `${daysLeft} jours`}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <User className="h-5 w-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Responsable du marché</p>
                                        <p className="font-semibold text-slate-800">
                                            {appelOffre.responsable?.name || "Service des Marchés"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {isFournisseur ? (
                                <Button className="w-full" size="lg" onClick={handlePostuler} disabled={isClosed}>
                                    <Send className="mr-2 h-4 w-4" />
                                    {isClosed ? "Candidatures fermées" : "Postuler à cette offre"}
                                </Button>
                            ) : !isAuthenticated ? (
                                <div className="space-y-3">
                                    <Button className="w-full" onClick={() => navigate("/connexion")}>
                                        Se connecter pour postuler
                                    </Button>
                                    <p className="text-xs text-center text-muted-foreground">
                                        Vous devez avoir un compte fournisseur validé.
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-slate-100 p-3 rounded-md text-sm text-center text-slate-600">
                                    Connecté en tant que {user?.role?.name}. <br/>
                                    Seuls les fournisseurs peuvent postuler.
                                </div>
                            )}

                        </CardContent>
                    </Card>

                </div>
            </div>

        </div>
      </main>

      {/* Modale ajout document AO (admin/responsable) */}
      <Dialog open={isUploadAoDocOpen} onOpenChange={setIsUploadAoDocOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Ajouter un document à l'appel d'offres</DialogTitle>
            <DialogDescription>
              Joignez le cahier des charges et le règlement de consultation avant publication.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={uploadAoDocument} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type de document</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={aoDocCategory}
                onChange={(e) => setAoDocCategory(e.target.value as typeof aoDocCategory)}
              >
                <option value="CAHIER_DES_CHARGES">Cahier des charges (obligatoire)</option>
                <option value="REGLEMENT_CONSULTATION">Règlement de consultation (obligatoire)</option>
                <option value="ANNEXE_AO">Annexe (optionnel)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Fichier</Label>
              <Input
                type="file"
                accept=".pdf,.zip,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setAoDocFile(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
              {aoDocFile && (
                <p className="text-xs text-muted-foreground">
                  Fichier sélectionné : <span className="font-medium">{aoDocFile.name}</span>
                </p>
              )}
              <p className="text-xs text-muted-foreground">Taille max : 10 MB.</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsUploadAoDocOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={!aoDocFile || uploadingAoDoc}>
                {uploadingAoDoc ? "Envoi..." : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modale de soumission */}
      <Dialog open={isPostulerOpen} onOpenChange={setIsPostulerOpen}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>Postuler à l'appel d'offre</DialogTitle>
                <DialogDescription>
                  Renseignez le montant et joignez vos documents d'offre si nécessaire.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={submitCandidature} className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="montant">Montant de votre offre (FCFA)</Label>
                    <Input 
                        id="montant"
                        type="number"
                        min="0"
                        placeholder="Ex: 5000000"
                        value={submissionData.montant_propose}
                        onChange={(e) => setSubmissionData({...submissionData, montant_propose: e.target.value})}
                        required
                    />
                </div>
                
                <div className="space-y-4">
                    <Label>Documents de l'offre</Label>
                    
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label htmlFor="offre-technique" className="text-sm font-medium">
                                Offre technique (PDF)
                            </Label>
                            <Input
                                id="offre-technique"
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => setOffreTechnique(e.target.files?.[0] || null)}
                                className="cursor-pointer"
                            />
                            {offreTechnique && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    {offreTechnique.name}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="offre-financiere" className="text-sm font-medium">
                                Offre financière (PDF)
                            </Label>
                            <Input
                                id="offre-financiere"
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => setOffreFinanciere(e.target.files?.[0] || null)}
                                className="cursor-pointer"
                            />
                            {offreFinanciere && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    {offreFinanciere.name}
                                </p>
                            )}
                        </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                        <strong>Note :</strong> Assurez-vous d'avoir uploadé tous vos documents légaux (RCCM, NINEA, Quitus Fiscal) dans votre dashboard avant de postuler.
                    </p>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsPostulerOpen(false)}>Annuler</Button>
                    <Button type="submit" disabled={submitting}>
                        {submitting ? "Envoi en cours..." : "Confirmer ma candidature"}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppelOffreDetails;