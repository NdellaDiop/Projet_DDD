import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import QRCode from "react-qr-code";
import { ArrowLeft, ArrowLeftRight, QrCode } from "lucide-react";
import { PaiementCahierLayout } from "@/components/paiement/PaiementCahierLayout";
import { OrangeMoneyLogo, WaveLogo } from "@/components/paiement/PaymentMethodLogos";

/** Page type « réservation » (réf. booking.demdikk.sn) — paiement cahier simulé, aucun débit réel. */

interface PreviewPayload {
  montant_xof: number;
  achat_id: number;
  statut: string;
  appel_offre: {
    id: number;
    titre: string;
    reference: string;
  };
}

type DemoUi = "wave" | "orange_money";
type Step = "method" | "infos" | "qr";

const PaiementCahierSimulation = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("t") ?? "";
  const auto = searchParams.get("auto") ?? "";
  const { api, isReady, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepte, setAccepte] = useState(false);
  const [step, setStep] = useState<Step>("method");
  const [moyen, setMoyen] = useState<DemoUi>("wave");
  const [wavePhone, setWavePhone] = useState("");
  const [waveName, setWaveName] = useState("");
  const [waveEmail, setWaveEmail] = useState("");

  const isFournisseur = user?.role?.name === "FOURNISSEUR";

  const titreMoyen = moyen === "wave" ? "Wave" : "Orange Money";

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated || !isFournisseur) {
      navigate("/connexion", { state: { from: `/paiement/cahier/simulation${token ? `?t=${encodeURIComponent(token)}` : ""}` } });
      return;
    }
    if (!token) {
      setError("Lien incomplet (paramètre manquant). Reprenez depuis la fiche marché.");
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get("/api/paiements/cahier/simulation/preview", {
          params: { t: token },
        });
        setPreview(res.data as PreviewPayload);
      } catch (e: unknown) {
        const msg =
          typeof e === "object" && e !== null && "response" in e
            ? (e as { response?: { data?: { message?: string }; status?: number } }).response?.data?.message
            : undefined;
        setError(typeof msg === "string" ? msg : "Impossible de charger le récapitulatif.");
      } finally {
        setLoading(false);
      }
    })();
  }, [api, isAuthenticated, isFournisseur, isReady, navigate, token]);

  const handleConfirmer = async () => {
    if (!api || !token || !accepte) {
      if (!accepte) {
        toast({
          title: "Conditions requises",
          description: "Cochez la case pour accepter les conditions avant de continuer.",
          variant: "destructive",
        });
      }
      return;
    }
    try {
      setSubmitting(true);
      await api.post("/api/paiements/cahier/simulation/confirmer", {
        token,
        accepte_conditions: true,
      });
      toast({
        title: "Règlement simulé enregistré",
        description:
          "Aucun montant n’a été prélevé. Retrouvez le cahier dans Mes achats.",
      });
      if (preview?.appel_offre?.id) {
        navigate(`/fournisseur/dashboard?tab=mes-achats&paiement=success&ao=${preview.appel_offre.id}`);
      } else {
        navigate("/fournisseur/dashboard?tab=mes-achats");
      }
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e !== null && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast({
        title: "Erreur",
        description: typeof msg === "string" ? msg : "Confirmation impossible.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Si la page est ouverte depuis un scan QR (auto=1), on confirme automatiquement.
  useEffect(() => {
    if (!api || !token || auto !== "1") return;
    if (!accepte) setAccepte(true);
    void (async () => {
      try {
        await api.post("/api/paiements/cahier/simulation/confirmer", {
          token,
          accepte_conditions: true,
        });
        toast({
          title: "Paiement validé (scan)",
          description: "Simulation : l'accès au cahier est débloqué.",
        });
        if (preview?.appel_offre?.id) navigate(`/appels-offres/${preview.appel_offre.id}`);
        else navigate("/appels-offres");
      } catch {
        // fallback: laisser l'utilisateur confirmer manuellement
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, auto, token]);

  const qrValue = useMemo(() => {
    if (!preview?.appel_offre?.id) return "";
    // Le QR code ouvre la même page en mode auto-confirmation (simulation).
    return `${window.location.origin}/paiement/cahier/simulation?t=${encodeURIComponent(token)}&auto=1`;
  }, [preview?.appel_offre?.id, token]);

  const canGoInfos = step === "method" && !!token;
  const canGoQr =
    step === "infos" &&
    (moyen !== "wave" || (wavePhone.trim().length >= 8 && waveName.trim().length >= 2));

  return (
    <PaiementCahierLayout onBack={() => navigate(-1)}>
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
                  <p className="text-xs text-muted-foreground">Prix unitaire = total (1 accès cahier).</p>
                </div>

                {preview.statut !== "completed" && step !== "method" && (
                  <div className="flex items-start gap-3">
                    <Checkbox id="cgu" checked={accepte} onCheckedChange={(v) => setAccepte(v === true)} />
                    <Label htmlFor="cgu" className="text-sm leading-snug cursor-pointer font-normal">
                      J&apos;ai lu et j&apos;accepte les conditions générales (simulation).
                    </Label>
                  </div>
                )}

                {preview.statut === "completed" ? (
                  <>
                    <p className="text-sm text-center text-muted-foreground">
                      L&apos;accès au cahier est déjà enregistré pour ce marché.
                    </p>
                    <Button
                      type="button"
                      variant="default"
                      className="w-full h-12 text-base font-semibold bg-teal-600 hover:bg-teal-700"
                      onClick={() => navigate(`/appels-offres/${preview.appel_offre.id}`)}
                    >
                      Retour à la fiche marché
                    </Button>
                  </>
                ) : (
                  <>
                    {step === "method" && (
                      <>
                        <p className="text-sm text-slate-700 text-center">
                          Veuillez choisir votre méthode de paiement
                        </p>
                        <div className="grid grid-cols-3 gap-3">
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
                          <button
                            type="button"
                            disabled
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center opacity-60"
                          >
                            <div className="mx-auto mb-2 h-12 w-12 rounded-xl bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                              …
                            </div>
                            <p className="text-xs font-medium text-slate-600">Autres</p>
                          </button>
                        </div>
                        <Button
                          type="button"
                          className="w-full h-12 text-base font-semibold bg-teal-600 hover:bg-teal-700"
                          disabled={!canGoInfos}
                          onClick={() => {
                            setWavePhone("");
                            setWaveName("");
                            setWaveEmail("");
                            setStep("infos");
                          }}
                        >
                          Continuer
                        </Button>
                        <Button type="button" variant="outline" className="w-full" onClick={() => navigate(-1)}>
                          Annuler
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

                        {moyen === "wave" ? (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label>Numéro Téléphone Wave</Label>
                              <Input value={wavePhone} onChange={(e) => setWavePhone(e.target.value)} placeholder="xx xx xx xx" />
                            </div>
                            <div className="space-y-2">
                              <Label>Nom et Prénom</Label>
                              <Input value={waveName} onChange={(e) => setWaveName(e.target.value)} placeholder="Prénom et Nom" />
                            </div>
                            <div className="space-y-2">
                              <Label>Email (optionnel)</Label>
                              <Input value={waveEmail} onChange={(e) => setWaveEmail(e.target.value)} placeholder="example@domain.com" />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label>Numéro Orange Money</Label>
                              <Input placeholder="xx xx xx xx" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Simulation : aucun débit réel. Vous recevrez ensuite un QR Code de validation.
                            </p>
                          </div>
                        )}

                        <Button
                          type="button"
                          className="w-full h-12 text-base font-semibold bg-teal-600 hover:bg-teal-700"
                          disabled={!canGoQr}
                          onClick={() => setStep("qr")}
                        >
                          Valider
                        </Button>
                      </>
                    )}

                    {step === "qr" && (
                      <>
                        <div className="flex items-center justify-between">
                          <Button type="button" variant="ghost" className="-ml-2" onClick={() => setStep("infos")}>
                            <ArrowLeft className="h-4 w-4 mr-2" /> Retour
                          </Button>
                          <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
                            <QrCode className="h-4 w-4" /> QR Code ({titreMoyen})
                          </div>
                        </div>

                        <div className="rounded-lg border bg-white p-5 text-center">
                          <h3 className="text-2xl font-semibold text-slate-800">Paiement</h3>
                          <p className="mt-2 text-sm text-slate-600">
                            Le paiement est en cours de traitement. Vous allez recevoir un SMS pour confirmation.
                          </p>
                          <p className="mt-2 text-sm text-slate-600">
                            ou{" "}
                            <button
                              type="button"
                              className="text-teal-700 underline"
                              onClick={() => window.open(qrValue, "_blank")}
                            >
                              Cliquez sur ce lien
                            </button>{" "}
                            ou scanner le QRCode pour valider le paiement.
                          </p>
                          <div className="mt-6 flex justify-center">
                            <div className="rounded-xl bg-white p-3 border">
                              {qrValue ? <QRCode value={qrValue} size={220} /> : null}
                            </div>
                          </div>
                        </div>

                        <Button
                          type="button"
                          className="w-full h-12 text-base font-semibold bg-teal-600 hover:bg-teal-700"
                          disabled={submitting || !accepte}
                          onClick={() => void handleConfirmer()}
                        >
                          {submitting ? "Traitement…" : "J’ai validé le paiement (simulation)"}
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

export default PaiementCahierSimulation;
