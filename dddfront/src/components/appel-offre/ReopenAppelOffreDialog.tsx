import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  defaultNouvelleDateLimiteLocal,
  parseDatetimeLocalToIso,
  reopenRequiresNewDate,
  type ReopenAoTarget,
} from "@/lib/reopenAppelOffre";

interface Props {
  ao: ReopenAoTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (dateLimiteDepot?: string) => Promise<void>;
  submitting?: boolean;
  /** Forcer la saisie d'une date (ex. après erreur API). */
  forceDateRequired?: boolean;
}

export function ReopenAppelOffreDialog({
  ao,
  open,
  onOpenChange,
  onConfirm,
  submitting = false,
  forceDateRequired = false,
}: Props) {
  const [dateLocale, setDateLocale] = useState(defaultNouvelleDateLimiteLocal());
  const [dateError, setDateError] = useState<string | null>(null);

  const needsDate = forceDateRequired || (ao ? reopenRequiresNewDate(ao) : false);

  useEffect(() => {
    if (open) {
      setDateLocale(defaultNouvelleDateLimiteLocal());
      setDateError(null);
    }
  }, [open, ao?.id]);

  const handleSubmit = async () => {
    if (!ao) return;

    let iso: string | undefined;
    if (needsDate) {
      const parsed = parseDatetimeLocalToIso(dateLocale);
      if (!parsed) {
        setDateError("Indiquez une date et heure futures.");
        return;
      }
      iso = parsed;
    }

    setDateError(null);
    await onConfirm(iso);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Réouvrir l&apos;appel d&apos;offres</DialogTitle>
          <DialogDescription>
            {ao?.titre ? (
              <>
                <span className="font-medium text-slate-800">{ao.titre}</span>
                <br />
              </>
            ) : null}
            L&apos;avis repassera au statut <strong>publié</strong>. Les fournisseurs pourront à nouveau
            consulter le marché et acquérir le cahier des charges si applicable.
          </DialogDescription>
        </DialogHeader>

        {needsDate && (
          <div className="space-y-2 py-2">
            <Label htmlFor="reopen_date_limite">
              Nouvelle date limite de dépôt <span className="text-destructive">*</span>
            </Label>
            <Input
              id="reopen_date_limite"
              type="datetime-local"
              value={dateLocale}
              onChange={(e) => {
                setDateLocale(e.target.value);
                setDateError(null);
              }}
            />
            <p className="text-xs text-muted-foreground">
              L&apos;ancienne échéance est dépassée : une nouvelle date est obligatoire pour réouvrir le
              marché et permettre l&apos;achat du cahier.
            </p>
            {dateError && <p className="text-xs text-destructive">{dateError}</p>}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? "Réouverture…" : "Réouvrir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
