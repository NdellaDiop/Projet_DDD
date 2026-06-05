import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import QRCode from "react-qr-code";
import { ArrowLeft, ArrowLeftRight, Copy, ExternalLink, QrCode } from "lucide-react";
import { PaiementCahierLayout } from "@/components/paiement/PaiementCahierLayout";
import { OrangeMoneyLogo, WaveLogo } from "@/components/paiement/PaymentMethodLogos";

type PaymentProvider = "wave" | "orange_money" | "simulation";
type Step = "method" | "infos" | "payment";

interface PreviewPayload {
  appel_offre: { id: number; titre: string; reference: string };
  montant_xof: number;
  deja_acquis: boolean;
  paiement_wave_active: boolean;
  paiement_orange_money_active: boolean;
  cahier_simulation_active: boolean;
  fournisseur?: {
    nom?: string | null;
    email?: string | null;
    telephone?: string | null;
  };
}

const PROVIDER_LABELS: Record<PaymentProvider, string> = {
  wave: "Wave",
  orange_money: "Orange Money",
  simulation: "Simulation (démo)",
};

const PaiementCahier = () => {
  const [searchParams] = useSearchParams();
  const aoId = searchParams.get("ao") ?? "";
  const { api, isReady, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("method");
  const [moyen, setMoyen] = useState<PaymentProvider>("wave");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accepte, setAccepte] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [initiating, setInitiating] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const isFournisseur = user?.role?.name === "FOURNISSEUR";

  const providersDisponibles = useMemo(() => {
    if (!preview) return [] as PaymentProvider[];
    const list: PaymentProvider[] = [];
    if (preview.paiement_wave_active) list.push("wave");
    if (preview.paiement_orange_money_active) list.push("orange_money");
    if (preview.cahier_simulation_active) list.push("simulation");
    return list;
  }, [preview]);

  const titreMoyen = PROVIDER_LABELS[moyen];

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated || !isFournisseur) {
      navigate("/connexion", {
        state: { from: `/paiement/cahier${aoId ? `?ao=${encodeURIComponent(aoId)}` : ""}` },
      });
      return;
    }
    if (!aoId) {
      setError("Lien incomplet (marché manquant). Reprenez depuis la fiche de l'appel d'offres.");
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/api/appels-offres/${aoId}/cahier/paiement/preview`);
        const data = res.data as PreviewPayload;
        setPreview(data);
        setName(data.fournisseur?.nom ?? user?.name ?? "");
        setEmail(data.fournisseur?.email ?? user?.email ?? "");
        setPhone(data.fournisseur?.telephone ?? user?.telephone ?? "");

        const dispo: PaymentProvider[] = [];
        if (data.paiement_wave_active) dispo.push("wave");
        if (data.paiement_orange_money_active) dispo.push("orange_money");
        if (data.cahier_simulation_active) dispo.push("simulation");
        if (dispo.length > 0) setMoyen(dispo[0]);
      } catch (e: unknown) {
        const msg =
          typeof e === "object" && e !== null && "response" in e
            ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;
        setError(typeof msg === "string" ? msg : "Impossible de charger le récapitulatif.");
      } finally {
        setLoading(false);
      }
    })();
  }, [api, aoId, isAuthenticated, isFournisseur, isReady, navigate, user?.email, user?.name, user?.telephone]);

  const lancerPaiement = async () => {
    if (!api || !preview || !accepte) {
      if (!accepte) {
        toast({
          title: "Conditions requises",
          description: "Acceptez les conditions avant de continuer.",
          variant: "destructive",
        });
      }
      return;
    }

    if (moyen === "simulation") {
      try {
        setInitiating(true);
        const res = await api.post(`/api/appels-offres/${preview.appel_offre.id}/cahier/paiement/initier`, {
          provider: "simulation",
          demo_ui: "wave",
        });
        if (res.data?.deja_acquis) {
          navigate(`/appels-offres/${preview.appel_offre.id}`);
          return;
        }
        const url = res.data?.payment_url;
        if (typeof url === "string") {
          window.location.assign(url);
          return;
        }
        throw new Error("URL simulation introuvable.");
      } catch (e: unknown) {
        const msg =
          typeof e === "object" && e !== null && "response" in e
            ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;
        toast({
          title: "Erreur",
          description: typeof msg === "string" ? msg : "Impossible d'ouvrir la simulation.",
          variant: "destructive",
        });
      } finally {
        setInitiating(false);
      }
      return;
    }

    try {
      setInitiating(true);
      const res = await api.post(`/api/appels-offres/${preview.appel_offre.id}/cahier/paiement/initier`, {
        provider: moyen,
      });
      if (res.data?.deja_acquis) {
        toast({
          title: "Accès déjà acquis",
          description: "Le cahier des charges est déjà disponible au téléchargement.",
        });
        navigate(`/appels-offres/${preview.appel_offre.id}`);
        return;
      }
      const url = res.data?.payment_url;
      if (typeof url === "string" && /^https?:\/\//i.test(url)) {
        setPaymentUrl(url);
        setStep("payment");
        return;
      }
      toast({
        title: "Paiement",
        description:
          typeof res.data?.message === "string"
            ? res.data.message
            : "Impossible d'obtenir l'URL de paiement.",
        variant: "destructive",
      });
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e !== null && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast({
        title: "Erreur",
        description: typeof msg === "string" ? msg : "Impossible d'initier le paiement.",
        variant: "destructive",
      });
    } finally {
      setInitiating(false);
    }
  };

  const verifierEtRetourner = async () => {
    if (!api || !preview) return;
    try {
      setVerifying(true);
      if (moyen === "wave") {
        try {
          const res = await api.post(
            `/api/appels-offres/${preview.appel_offre.id}/cahier/paiement/verifier-wave`
          );
          if (res.data?.deja_acquis || res.data?.statut === "completed") {
            toast({
              title: "Paiement confirmé",
              description: "Vous pouvez télécharger le cahier des charges.",
            });
            navigate(`/appels-offres/${preview.appel_offre.id}`);
            return;
          }
        } catch {
          /* vérif synchrone peut être désactivée en prod */
        }
      }
      toast({
        title: "Vérification en cours",
        description:
          "Si vous venez de payer, le déblocage peut prendre quelques instants. Revenez à la fiche marché.",
      });
      navigate(`/appels-offres/${preview.appel_offre.id}`);
    } finally {
      setVerifying(false);
    }
  };

  const canGoInfos = step === "method" && providersDisponibles.length > 0;
  const canGoPayment =
    step === "infos" && phone.trim().length >= 8 && name.trim().length >= 2 && accepte;

  const handleBack = () => {
    if (preview?.appel_offre?.id) {
      navigate(`/appels-offres/${preview.appel_offre.id}`);
    } else {
      navigate(-1);
    }
  };

  const copierLienPaiement = async () => {
    if (!paymentUrl) return;
    try {
      await navigator.clipboard.writeText(paymentUrl);
      toast({ title: "Lien copié" });
    } catch {
      toast({
        title: "Copie impossible",
        description: "Copiez le lien depuis la barre d'adresse du navigateur.",
        variant: "destructive",
      });
    }
  };

  return (
    <PaiementCahierLayout onBack={handleBack}>
      {loading && (
        <p className="text-sm text-muted-foreground text-center py-8">Chargement du récapitulatif…</p>
      )}
      {!loading && error && (
        <p className="text-sm text-destructive text-center py-4">{error}</p>
      )}
      {!loading && preview && (
        <>
          <div className="space-y-1 rounded-lg border bg-slate-50 p-4 text-sm">
            <p>
              <span className="text-muted-foreground">Marché : </span>
              <span className="font-medium text-slate-800">{preview.appel_offre.titre}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Référence : </span>
              {preview.appel_offre.reference}
            </p>
            <p className="pt-2 text-lg font-semibold text-teal-800">
              Montant : {Number(preview.montant_xof).toLocaleString("fr-FR")} FCFA
            </p>
            <p className="text-xs text-muted-foreground">Accès au cahier des charges (1 achat par marché).</p>
          </div>

          {preview.deja_acquis ? (
            <>
              <p className="text-sm text-center text-muted-foreground">
                L&apos;accès au cahier est déjà enregistré pour ce marché.
              </p>
              <Button
                type="button"
                className="w-full h-12 text-base font-semibold bg-teal-600 hover:bg-teal-700"
                onClick={() => navigate(`/appels-offres/${preview.appel_offre.id}`)}
              >
                Retour à la fiche marché
              </Button>
            </>
          ) : providersDisponibles.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground">
              Paiement en ligne non configuré sur le serveur (Wave / Orange Money).
            </p>
          ) : (
            <>
              {step !== "method" && (
                <div className="flex items-start gap-3">
                  <Checkbox id="cgu" checked={accepte} onCheckedChange={(v) => setAccepte(v === true)} />
                  <Label htmlFor="cgu" className="text-sm leading-snug cursor-pointer font-normal">
                    J&apos;ai lu et j&apos;accepte les conditions de règlement du cahier des charges.
                  </Label>
                </div>
              )}

              {step === "method" && (
                <>
                  <p className="text-sm text-slate-700 text-center">
                    Veuillez choisir votre méthode de paiement
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {preview.paiement_orange_money_active && (
                      <button
                        type="button"
                        onClick={() => setMoyen("orange_money")}
                        className={`rounded-2xl border bg-white p-4 text-center shadow-sm hover:shadow-md transition ${
                          moyen === "orange_money" ? "border-teal-600 ring-2 ring-teal-100" : "border-slate-200"
                        }`}
                      >
                        <OrangeMoneyLogo className="mx-auto mb-2 h-12 w-12" />
                        <p className="text-xs font-medium text-slate-700">Orange Money</p>
                      </button>
                    )}
                    {preview.paiement_wave_active && (
                      <button
                        type="button"
                        onClick={() => setMoyen("wave")}
                        className={`rounded-2xl border bg-white p-4 text-center shadow-sm hover:shadow-md transition ${
                          moyen === "wave" ? "border-teal-600 ring-2 ring-teal-100" : "border-slate-200"
                        }`}
                      >
                        <WaveLogo className="mx-auto mb-2 h-12 w-12" />
                        <p className="text-xs font-medium text-slate-700">Wave</p>
                      </button>
                    )}
                    {preview.cahier_simulation_active && (
                      <button
                        type="button"
                        onClick={() => setMoyen("simulation")}
                        className={`rounded-2xl border bg-white p-4 text-center shadow-sm hover:shadow-md transition ${
                          moyen === "simulation" ? "border-teal-600 ring-2 ring-teal-100" : "border-slate-200"
                        }`}
                      >
                        <div className="mx-auto mb-2 h-12 w-12 rounded-xl bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                          Démo
                        </div>
                        <p className="text-xs font-medium text-slate-600">Simulation</p>
                      </button>
                    )}
                  </div>
                  <Button
                    type="button"
                    className="w-full h-12 text-base font-semibold bg-teal-600 hover:bg-teal-700"
                    disabled={!canGoInfos}
                    onClick={() => setStep("infos")}
                  >
                    Continuer
                  </Button>
                </>
              )}

              {step === "infos" && (
                <>
                  <div className="flex items-center justify-between">
                    <Button type="button" variant="ghost" className="-ml-2" onClick={() => setStep("method")}>
                      <ArrowLeft className="h-4 w-4 mr-2" /> Retour
                    </Button>
                    <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
                      <ArrowLeftRight className="h-4 w-4" /> {titreMoyen}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>
                        Numéro {moyen === "orange_money" ? "Orange Money" : moyen === "wave" ? "Wave" : "mobile"}
                      </Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="7X XXX XX XX" />
                    </div>
                    <div className="space-y-2">
                      <Label>Nom et prénom</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Prénom et nom" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email (optionnel)</Label>
                      <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@domain.com" />
                    </div>
                    {moyen !== "simulation" && (
                      <p className="text-xs text-muted-foreground">
                        Ces informations facilitent le suivi. Le règlement s&apos;effectue sur la plateforme{" "}
                        {titreMoyen} via le lien ou le QR code à l&apos;étape suivante.
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    className="w-full h-12 text-base font-semibold bg-teal-600 hover:bg-teal-700"
                    disabled={!canGoPayment || initiating}
                    onClick={() => void lancerPaiement()}
                  >
                    {initiating ? "Préparation…" : moyen === "simulation" ? "Continuer (démo)" : "Obtenir le lien de paiement"}
                  </Button>
                </>
              )}

              {step === "payment" && paymentUrl && (
                <>
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 shrink-0 px-2"
                      onClick={() => {
                        setPaymentUrl(null);
                        setStep("infos");
                      }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" /> Retour
                    </Button>
                    <div className="text-sm text-muted-foreground inline-flex items-center gap-2 shrink-0">
                      <QrCode className="h-4 w-4" /> {titreMoyen}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border bg-white p-4 sm:p-6 text-center">
                    <h3 className="text-xl font-semibold text-slate-800 sm:text-2xl">Finaliser le paiement</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      Scannez le QR code ou utilisez le lien {titreMoyen} pour régler{" "}
                      <strong>{Number(preview.montant_xof).toLocaleString("fr-FR")} FCFA</strong>.
                    </p>
                    <div className="mx-auto mt-6 w-full max-w-[240px] rounded-xl border bg-slate-50 p-3">
                      <QRCode
                        value={paymentUrl}
                        size={256}
                        className="h-auto w-full max-w-full"
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      />
                    </div>
                    <div className="mt-6 grid w-full gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full border-teal-200 text-teal-800 hover:bg-teal-50"
                        onClick={() => window.open(paymentUrl, "_blank", "noopener,noreferrer")}
                      >
                        <ExternalLink className="h-4 w-4 mr-2 shrink-0" />
                        Ouvrir {titreMoyen}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full border-slate-200 text-slate-700 hover:bg-slate-50"
                        onClick={() => void copierLienPaiement()}
                      >
                        <Copy className="h-4 w-4 mr-2 shrink-0" />
                        Copier le lien de paiement
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="button"
                    className="w-full h-12 text-base font-semibold bg-teal-600 hover:bg-teal-700"
                    disabled={verifying}
                    onClick={() => void verifierEtRetourner()}
                  >
                    {verifying ? "Vérification…" : "J'ai effectué le paiement"}
                  </Button>
                </>
              )}
            </>
          )}
        </>
      )}
    </PaiementCahierLayout>
  );
};

export default PaiementCahier;
