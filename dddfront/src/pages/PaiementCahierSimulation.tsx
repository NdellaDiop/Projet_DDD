import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Phone, MapPin, Clock, ArrowLeft, ShieldAlert } from "lucide-react";

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

const PaiementCahierSimulation = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("t") ?? "";
  const { api, isReady, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepte, setAccepte] = useState(false);

  const isFournisseur = user?.role?.name === "FOURNISSEUR";

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

  const handlePayer = async () => {
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
          "Aucun montant n’a été prélevé. Vous pouvez télécharger le cahier des charges et le compléter pour répondre aux exigences avant le dépôt des plis.",
      });
      if (preview?.appel_offre?.id) {
        navigate(`/appels-offres/${preview.appel_offre.id}`);
      } else {
        navigate("/appels-offres");
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

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Bandeau type site réservation */}
      <div className="bg-teal-700 text-white text-sm">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-2">
          <span className="inline-flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0" aria-hidden />
            Contactez-nous : +221 33 824 10 10
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            5, Avenue Birago Diop — Point E, Dakar
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" aria-hidden />
            24h/24 — 7j/7
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-10">
        <Button type="button" variant="ghost" className="mb-6 -ml-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
          <p>
            <strong>Simulation</strong> — parcours inspiré du site de réservation public (aucun paiement réel, aucun prélèvement).
          </p>
        </div>

        <Card className="shadow-md">
          <CardHeader className="border-b bg-white">
            <CardTitle className="text-xl text-slate-800">Règlement — cahier des charges</CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Récapitulatif avant validation (équivalent au bouton « PAYER » du flux réservation).
            </p>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
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

                {preview.statut !== "completed" && (
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="cgu"
                      checked={accepte}
                      onCheckedChange={(v) => setAccepte(v === true)}
                    />
                    <Label htmlFor="cgu" className="text-sm leading-snug cursor-pointer font-normal">
                      J&apos;ai lu et j&apos;accepte les conditions générales de vente et d&apos;utilisation (simulation).
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
                  <Button
                    type="button"
                    className="w-full h-12 text-base font-semibold bg-teal-600 hover:bg-teal-700"
                    disabled={submitting}
                    onClick={() => void handlePayer()}
                  >
                    {submitting ? "Traitement…" : "PAYER"}
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} — démo interne portail marchés (référence visuelle{" "}
          <a
            href="https://booking.demdikk.sn/reservation.php"
            className="underline hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            réservation Dakar Dem Dikk
          </a>
          ).
        </p>
      </div>
    </div>
  );
};

export default PaiementCahierSimulation;
