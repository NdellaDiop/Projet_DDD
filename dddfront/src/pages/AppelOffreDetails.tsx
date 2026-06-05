import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
  MapPin,
  BookOpen,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Upload,
  Trash2,
  Wallet,
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
import { sourceFinancementLabel } from "@/lib/appelOffreFinancement";
import { typeMarcheLabel } from "@/lib/appelOffreCategorisation";

interface AppelOffreDocument {
  id: number;
  nom_fichier: string;
  categorie: string;
  download_url: string | null;
  telechargement_bloque?: boolean;
  blocage_paiement_cahier?: boolean;
  created_at?: string;
}

interface AppelOffre {
  id: number;
  titre: string;
  reference: string;
  source_financement?: string;
  source_financement_label?: string;
  mode_passation?: string | null;
  type_marche?: string | null;
  type_marche_label?: string | null;
  description: string;
  /** Modalités de dépôt des plis au siège (soumission physique), saisies par le PRM / admin */
  modalites_soumission_physique?: string | null;
  date_publication: string;
  date_limite_depot: string;
  statut: 'draft' | 'published' | 'closed' | 'archived';
  cahier_paiement_requis?: boolean;
  cahier_prix_xof?: number | null;
  paiement_wave_active?: boolean;
  paiement_orange_money_active?: boolean;
  /** Vrai si le back autorise le flux PAYER simulé (CAHIER_PAIEMENT_SIMULATION) */
  cahier_simulation_active?: boolean;
  responsable?: {
    name?: string;
    email?: string;
    user?: { name?: string; email?: string };
  };
  documents?: AppelOffreDocument[];
}

const ORDRE_PIECES_AO = ["AVIS_APPEL_OFFRES", "CAHIER_DES_CHARGES", "REGLEMENT_CONSULTATION", "ANNEXE_AO"] as const;

function trierDocumentsAo(docs: AppelOffreDocument[]): AppelOffreDocument[] {
  const ordre = [...ORDRE_PIECES_AO];
  return [...docs].sort((a, b) => {
    const ia = ordre.indexOf(a.categorie as (typeof ORDRE_PIECES_AO)[number]);
    const ib = ordre.indexOf(b.categorie as (typeof ORDRE_PIECES_AO)[number]);
    const sa = ia === -1 ? 99 : ia;
    const sb = ib === -1 ? 99 : ib;
    return sa - sb;
  });
}

/** Style « fiche avis » type portails institutionnels (ex. ARTP : date limite lisible en premier). */
function formatDateLimiteFicheAvis(iso: string): string {
  const d = new Date(iso);
  const jourSemaine = d.toLocaleDateString("fr-FR", { weekday: "long" });
  const datePart = d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const heure = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${jourSemaine} ${datePart} — ${heure}`;
}

const AppelOffreDetails = () => {
  const { id } = useParams();
  const { api, user, token, isReady, isAuthenticated, isFournisseur, isAdmin, isResponsableMarche } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const waveReturnHandled = useRef(false);
  const [appelOffre, setAppelOffre] = useState<AppelOffre | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pdfViewer, setPdfViewer] = useState<{ url: string; title: string } | null>(null);

  // Documents joints à l'AO (upload modale : avis + cahier ; autres types possibles en base)
  const [isUploadAoDocOpen, setIsUploadAoDocOpen] = useState(false);
  const [aoDocCategory, setAoDocCategory] = useState<"AVIS_APPEL_OFFRES" | "CAHIER_DES_CHARGES">("AVIS_APPEL_OFFRES");
  const [aoDocFile, setAoDocFile] = useState<File | null>(null);
  const [uploadingAoDoc, setUploadingAoDoc] = useState(false);
  const [deletingAoDocId, setDeletingAoDocId] = useState<number | null>(null);
  const [savingAttribution, setSavingAttribution] = useState(false);
  const [attributaireNom, setAttributaireNom] = useState("");
  const [attributaireNinea, setAttributaireNinea] = useState("");
  const [attributionMontant, setAttributionMontant] = useState("");
  const [attributionCommentaire, setAttributionCommentaire] = useState("");

  const canManageAoDocs = isAuthenticated && (isAdmin || isResponsableMarche);
  const canAttribuer = isAuthenticated && (isAdmin || isResponsableMarche);

  const aoDocCategoryLabel: Record<string, string> = {
    AVIS_APPEL_OFFRES: "Avis d'appel d'offres (PDF, gratuit)",
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
        setError("Impossible de charger les détails de cet appel d'offres.");
      } finally {
        setLoading(false);
      }
    };

    if (id && isReady) {
        fetchDetails();
    }
  }, [id, api, isReady, isAuthenticated, user?.id, token]);

  useEffect(() => {
    waveReturnHandled.current = false;
  }, [id]);

  /** Après retour Wave (?paiement=wave&statut=success), tente une vérif serveur si WAVE_ALLOW_SYNC_VERIFY est activé côté API. */
  useEffect(() => {
    if (!api || !id || !isFournisseur || waveReturnHandled.current) return;
    const paiement = searchParams.get("paiement");
    const statut = searchParams.get("statut");
    if (paiement !== "wave" || statut !== "success") return;

    waveReturnHandled.current = true;
    void (async () => {
      try {
        const res = await api.post(`/api/appels-offres/${id}/cahier/paiement/verifier-wave`);
        if (res.data?.deja_acquis || res.data?.statut === "completed") {
          toast({
            title: "Paiement confirmé",
            description:
              "Vous pouvez télécharger le cahier des charges, le compléter pour répondre aux exigences, puis constituer vos plis pour le dépôt au siège.",
          });
        }
      } catch {
        /* 403 si vérif synchrone désactivée — normal en prod si webhook seulement */
      }
      try {
        const r = await api.get(`/api/appels-offres/${id}`);
        setAppelOffre(r.data.data || r.data);
      } finally {
        setSearchParams({}, { replace: true });
      }
    })();
  }, [api, id, isFournisseur, searchParams, setSearchParams]);

  const refreshDetails = async () => {
    if (!api || !id) return;
    const response = await api.get(`/api/appels-offres/${id}`);
    setAppelOffre(response.data.data || response.data);
  };

  const enregistrerAttribution = async () => {
    if (!api || !appelOffre) return;
    const nom = attributaireNom.trim();
    if (!nom) {
      toast({
        title: "Champ requis",
        description: "Renseignez le nom de l'attributaire.",
        variant: "destructive",
      });
      return;
    }
    try {
      setSavingAttribution(true);
      await api.post(`/api/appels-offres/${appelOffre.id}/attribution`, {
        attributaire_nom: nom,
        attributaire_ninea: attributaireNinea.trim() || null,
        attribution_montant_xof: attributionMontant.trim() ? Number(attributionMontant) : null,
        attribution_commentaire: attributionCommentaire.trim() || null,
      });
      toast({
        title: "Attribution enregistrée",
        description: "La décision a été enregistrée (flux présentiel).",
      });
      await refreshDetails();
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast({
        title: "Erreur",
        description: typeof msg === "string" ? msg : "Impossible d'enregistrer l'attribution.",
        variant: "destructive",
      });
    } finally {
      setSavingAttribution(false);
    }
  };

  const annulerAttribution = async () => {
    if (!api || !appelOffre) return;
    if (!window.confirm("Annuler l'attribution enregistrée pour cet appel d'offres ?")) return;
    try {
      setSavingAttribution(true);
      await api.post(`/api/appels-offres/${appelOffre.id}/attribution/annuler`);
      toast({ title: "Attribution annulée", description: "L'appel d'offres repasse à « non attribué »." });
      await refreshDetails();
    } catch {
      toast({ title: "Erreur", description: "Impossible d'annuler l'attribution.", variant: "destructive" });
    } finally {
      setSavingAttribution(false);
    }
  };

  const downloadAoDocument = async (doc: { id: number; nom_fichier: string; download_url: string | null }) => {
    if (!api || !doc.download_url) {
      toast({
        title: "Téléchargement indisponible",
        description: "Connectez-vous en tant que fournisseur ou acquittez le montant du cahier des charges si demandé.",
        variant: "destructive",
      });
      return;
    }
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

  const pdfBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (pdfBlobUrlRef.current) {
        URL.revokeObjectURL(pdfBlobUrlRef.current);
      }
    };
  }, []);

  const closePdfViewer = () => {
    if (pdfBlobUrlRef.current) {
      URL.revokeObjectURL(pdfBlobUrlRef.current);
      pdfBlobUrlRef.current = null;
    }
    setPdfViewer(null);
  };

  const ouvrirPdfEnLigne = async (doc: AppelOffreDocument) => {
    if (!api || !doc.download_url) return;
    try {
      const res = await api.get(doc.download_url, { responseType: "blob" });
      const blob = new Blob([res.data], {
        type: (res.headers["content-type"] as string) || "application/pdf",
      });
      if (pdfBlobUrlRef.current) URL.revokeObjectURL(pdfBlobUrlRef.current);
      const url = URL.createObjectURL(blob);
      pdfBlobUrlRef.current = url;
      setPdfViewer({ url, title: doc.nom_fichier });
    } catch {
      toast({
        title: "Lecture en ligne",
        description: "Impossible d'afficher le fichier. Utilisez « Télécharger ».",
        variant: "destructive",
      });
    }
  };

  const fichierEstPdf = (nom: string) => nom.toLowerCase().endsWith(".pdf");

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
                <h2 className="text-2xl font-bold text-slate-800">Appel d'offres non trouvé</h2>
                <p className="text-muted-foreground">{error || "Cet appel d'offres n'existe pas ou a été supprimé."}</p>
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
                  Retour à la liste des avis
                </Button>
            </div>

            <div className="mb-8 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm text-slate-800 shadow-sm">
              <div className="flex gap-3">
                <BookOpen className="h-5 w-5 shrink-0 text-primary mt-0.5" aria-hidden />
                <div>
                  <p className="font-semibold text-slate-900">Consultation publique des avis</p>
                  <p className="mt-1 leading-relaxed text-slate-700">
                    Présentation calquée sur les fiches d&apos;avis des portails institutionnels :{" "}
                    <strong>date limite</strong> et <strong>référence</strong> en tête, texte intégral, puis{" "}
                    <strong>fichiers attachés</strong>. La <strong>soumission</strong> (dépôt des plis) reste physique au siège, selon le bloc « Dépôt des plis » ci-dessous.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Colonne Principale (Gauche) */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* En-tête type « fiche avis » (structure proche ARTP / autorités) */}
                    <Card className="border border-slate-200 shadow-sm overflow-hidden h-full">
                        <div className="h-1.5 bg-primary w-full" />
                        <CardHeader className="space-y-5 pb-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Dakar Dem Dikk — Portail des marchés publics
                            </p>
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                                <p className="text-xs font-medium uppercase text-slate-500">Date limite</p>
                                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 md:text-2xl">
                                  {formatDateLimiteFicheAvis(appelOffre.date_limite_depot)}
                                </p>
                              </div>
                              <Badge variant={isClosed ? "secondary" : "default"} className="w-fit shrink-0 text-sm px-3 py-1">
                                {isClosed ? "Clôturé" : "Ouvert"}
                              </Badge>
                            </div>
                            <div>
                              <CardTitle className="text-2xl md:text-3xl font-bold text-slate-900 leading-snug">
                                {appelOffre.titre}
                              </CardTitle>
                              <p className="mt-3 font-mono text-sm text-slate-600">{appelOffre.reference}</p>
                            </div>
                            {(appelOffre.responsable?.name || appelOffre.responsable?.user?.name) && (
                              <div className="rounded-md border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm">
                                <span className="font-medium text-slate-700">Personne responsable du marché — </span>
                                <span className="text-slate-900">
                                  {appelOffre.responsable?.name || appelOffre.responsable?.user?.name}
                                </span>
                              </div>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-6 pt-0">
                            <div className="prose prose-slate max-w-none">
                                <h3 className="text-lg font-semibold text-slate-800 mb-3">
                                  Texte de l&apos;avis et précisions
                                </h3>
                                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-[15px]">
                                    {appelOffre.description}
                                </p>
                            </div>

                            <Card className="border-amber-200/80 bg-amber-50/40 shadow-sm">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2 text-slate-900">
                                  <MapPin className="h-5 w-5 text-amber-800 shrink-0" />
                                  Dépôt des plis — soumission en présentiel
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3 text-sm text-slate-800">
                                <p
                                  className={
                                    appelOffre.modalites_soumission_physique?.trim()
                                      ? "whitespace-pre-wrap leading-relaxed"
                                      : "text-muted-foreground italic leading-relaxed"
                                  }
                                >
                                  {appelOffre.modalites_soumission_physique?.trim()
                                    ? appelOffre.modalites_soumission_physique
                                    : "Les modalités de dépôt en présentiel (lieu, horaires, contact du service des marchés) ne figurent pas sur ce portail. Consultez les pièces jointes de l’avis ou contactez l’organisme acheteur."}
                                </p>
                                <p className="text-xs text-muted-foreground border-t border-amber-200/60 pt-3">
                                  Après analyse du dossier, le service des marchés peut vous adresser une notification dans cette application pour la suite de la procédure (convocation, passage au siège, etc.).
                                </p>
                                {isFournisseur && (
                                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                                    <p className="font-medium text-slate-900 text-sm mb-1">Documents légaux</p>
                                    <p className="text-muted-foreground text-xs leading-snug mb-3">
                                      Les pièces que vous téléchargez dans votre espace permettent aux PRM de préconstituer votre dossier avant votre venue pour déposer la soumission physique.
                                    </p>
                                    <Button size="sm" variant="secondary" type="button" onClick={() => navigate("/fournisseur/dashboard")}>
                                      Mon espace fournisseur — Mes documents
                                    </Button>
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            <Separator />

                            <div>
                                <h3 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    Fichiers attachés
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                  Avis, cahier des charges, règlement de consultation et annexes (comme sur une fiche d&apos;avis institutionnelle).
                                </p>
                                {appelOffre.cahier_paiement_requis && (appelOffre.cahier_prix_xof ?? 0) > 0 && (
                                  <p className="text-sm rounded-md border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2 mb-4">
                                    Pour ce marché, le <strong>cahier des charges</strong> est payant :{" "}
                                    <strong>{Number(appelOffre.cahier_prix_xof).toLocaleString("fr-FR")} FCFA</strong> (fixé sur la fiche de l&apos;appel d&apos;offres).
                                  </p>
                                )}
                                {!appelOffre.cahier_paiement_requis && (
                                  <p className="text-sm text-muted-foreground mb-4">
                                    Pour ce marché, le cahier des charges est <strong>consultable gratuitement</strong> une fois connecté en tant que fournisseur.
                                  </p>
                                )}
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
                                        {trierDocumentsAo(appelOffre.documents).map((doc) => (
                                            <div key={doc.id} className="flex flex-col gap-3 p-3 border rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="bg-white p-2 rounded border shrink-0">
                                                        <FileText className="h-5 w-5 text-slate-400" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                      <span className="font-medium text-slate-700 truncate">{doc.nom_fichier}</span>
                                                      <span className="text-xs text-muted-foreground">{aoDocCategoryLabel[doc.categorie] ?? doc.categorie}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 shrink-0 justify-end">
                                                  {doc.download_url ? (
                                                    <>
                                                      {fichierEstPdf(doc.nom_fichier) && (
                                                        <Button
                                                          variant="outline"
                                                          size="sm"
                                                          onClick={() => void ouvrirPdfEnLigne(doc)}
                                                        >
                                                          <BookOpen className="h-4 w-4 mr-2" />
                                                          Lire en ligne
                                                        </Button>
                                                      )}
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
                                                    </>
                                                  ) : doc.blocage_paiement_cahier ? (
                                                    <>
                                                      {!isAuthenticated ? (
                                                        <Button size="sm" variant="secondary" onClick={() => navigate("/connexion")}>
                                                          Se connecter pour payer
                                                        </Button>
                                                      ) : isFournisseur ? (
                                                        <>
                                                          {(appelOffre.paiement_wave_active || appelOffre.paiement_orange_money_active || appelOffre.cahier_simulation_active) ? (
                                                            <Button
                                                              size="sm"
                                                              variant="default"
                                                              onClick={() =>
                                                                navigate(`/paiement/cahier?ao=${appelOffre.id}`)
                                                              }
                                                            >
                                                              <Wallet className="h-4 w-4 mr-2" />
                                                              Payer le cahier —{" "}
                                                              {(appelOffre.cahier_prix_xof ?? 0) > 0
                                                                ? `${Number(appelOffre.cahier_prix_xof).toLocaleString("fr-FR")} FCFA`
                                                                : ""}
                                                            </Button>
                                                          ) : (
                                                            <span className="text-xs text-muted-foreground">
                                                              Paiement en ligne non configuré sur le serveur (Wave / Orange / simulation).
                                                            </span>
                                                          )}
                                                        </>
                                                      ) : (
                                                        <span className="text-xs text-muted-foreground">Réservé aux fournisseurs</span>
                                                      )}
                                                    </>
                                                  ) : (
                                                    <Button size="sm" variant="secondary" onClick={() => navigate("/connexion")}>
                                                      Se connecter pour télécharger
                                                    </Button>
                                                  )}
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
                                    <p className="text-sm text-muted-foreground italic">Aucun document joint à cet appel d'offres pour le moment.</p>
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
                                        <p className="text-sm font-medium text-slate-500">Date et heure limite de dépôt</p>
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
                                    <Building2 className="h-5 w-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Source de financement</p>
                                        <p className="font-semibold text-slate-800">
                                            {sourceFinancementLabel(
                                                appelOffre.source_financement,
                                                appelOffre.source_financement_label ?? null
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <FileText className="h-5 w-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Mode de passation</p>
                                        <p className="font-semibold text-slate-800">
                                            {appelOffre.mode_passation?.trim() || "—"}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <BookOpen className="h-5 w-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Type de marché</p>
                                        <p className="font-semibold text-slate-800">
                                            {typeMarcheLabel(
                                                appelOffre.type_marche,
                                                appelOffre.type_marche_label ?? null
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Wallet className="h-5 w-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Cahier des charges</p>
                                        {appelOffre.cahier_paiement_requis && (appelOffre.cahier_prix_xof ?? 0) > 0 ? (
                                            <p className="font-semibold text-slate-800">
                                                Payant — {Number(appelOffre.cahier_prix_xof).toLocaleString("fr-FR")} FCFA
                                            </p>
                                        ) : (
                                            <p className="font-semibold text-emerald-700">Gratuit (téléchargement)</p>
                                        )}
                                    </div>
                                </div>

                            </div>

                            <Separator />

                            {isFournisseur ? (
                                <div className="space-y-3">
                                    <p className="text-sm text-slate-600 text-center leading-snug">
                                      La <strong>soumission</strong> des offres (dépôt des plis) se fait en présentiel. Téléchargez le cahier lorsqu&apos;il est disponible, complétez-le pour répondre aux exigences du marché, puis déposez votre dossier au siège selon les modalités ci-contre. Tenez aussi à jour vos documents légaux dans votre espace.
                                    </p>
                                    <Button className="w-full" size="lg" variant="secondary" type="button" onClick={() => navigate("/fournisseur/dashboard")}>
                                        Mon espace fournisseur
                                    </Button>
                                    <a
                                      href="https://www.openstreetmap.org/search?query=Point%20E%20Dakar%20Birago%20Diop"
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex h-9 w-full items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground"
                                    >
                                      <ExternalLink className="mr-2 h-4 w-4" />
                                      Itinéraire siège (carte)
                                    </a>
                                </div>
                            ) : !isAuthenticated ? (
                                <div className="space-y-3">
                                    <Button className="w-full" onClick={() => navigate("/connexion")}>
                                        Se connecter (fournisseur)
                                    </Button>
                                    <p className="text-xs text-center text-muted-foreground">
                                        Compte fournisseur requis pour le cahier payant et le dépôt de vos pièces légales.
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-slate-100 p-3 rounded-md text-sm text-center text-slate-600">
                                    Connecté en tant que {user?.role?.name}. <br/>
                                    La publication des avis est ouverte à tous ; les fonctionnalités fournisseur concernent le téléchargement du cahier et vos documents.
                                </div>
                            )}

                        </CardContent>
                    </Card>

                    {canAttribuer && (
                      <Card className="border border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg font-semibold text-slate-800">Attribution (présentiel)</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Enregistrez la décision après réception/évaluation des plis au siège. Cette action ne dépend pas d’une candidature en ligne.
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {appelOffre.statut !== "closed" ? (
                            <p className="text-sm text-muted-foreground">
                              Disponible une fois l’appel d'offres <strong>clôturé</strong>.
                            </p>
                          ) : (
                            <>
                              <div className="space-y-2">
                                <Label>Attributaire (nom entreprise)</Label>
                                <Input value={attributaireNom} onChange={(e) => setAttributaireNom(e.target.value)} placeholder="Ex: Entreprise XYZ SARL" />
                              </div>
                              <div className="space-y-2">
                                <Label>NINEA (optionnel)</Label>
                                <Input value={attributaireNinea} onChange={(e) => setAttributaireNinea(e.target.value)} placeholder="Identifiant légal (si connu)" />
                              </div>
                              <div className="space-y-2">
                                <Label>Montant attribué (FCFA, optionnel)</Label>
                                <Input
                                  inputMode="numeric"
                                  value={attributionMontant}
                                  onChange={(e) => setAttributionMontant(e.target.value)}
                                  placeholder="Ex: 12500000"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Commentaire (optionnel)</Label>
                                <Input
                                  value={attributionCommentaire}
                                  onChange={(e) => setAttributionCommentaire(e.target.value)}
                                  placeholder="PV, observations, références internes..."
                                />
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button type="button" onClick={() => void enregistrerAttribution()} disabled={savingAttribution}>
                                  {savingAttribution ? "Enregistrement..." : "Enregistrer l’attribution"}
                                </Button>
                                <Button type="button" variant="outline" onClick={() => void annulerAttribution()} disabled={savingAttribution}>
                                  Annuler l’attribution
                                </Button>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    )}

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
              Joignez l’avis d’appel d'offres (PDF) et le cahier des charges avant publication.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={uploadAoDocument} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type de document</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={aoDocCategory}
                onChange={(e) => setAoDocCategory(e.target.value as "AVIS_APPEL_OFFRES" | "CAHIER_DES_CHARGES")}
              >
                <option value="AVIS_APPEL_OFFRES">Avis d&apos;appel d&apos;offres — PDF (obligatoire)</option>
                <option value="CAHIER_DES_CHARGES">Cahier des charges (obligatoire)</option>
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

      <Dialog
        open={!!pdfViewer}
        onOpenChange={(open) => {
          if (!open) closePdfViewer();
        }}
      >
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle className="truncate pr-8">{pdfViewer?.title ?? "Document"}</DialogTitle>
            <DialogDescription className="sr-only">Aperçu PDF dans le navigateur</DialogDescription>
          </DialogHeader>
          {pdfViewer?.url ? (
            <iframe title={pdfViewer.title} src={pdfViewer.url} className="flex-1 min-h-[60vh] w-full border-0 bg-slate-100" />
          ) : null}
          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button type="button" variant="outline" onClick={closePdfViewer}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppelOffreDetails;