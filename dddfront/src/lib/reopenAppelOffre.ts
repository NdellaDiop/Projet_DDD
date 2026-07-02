/** Aligné sur AppelOffre::dateLimiteDepotDepassee() (fin du jour calendaire). */
export function dateLimiteDepotDepassee(iso: string | undefined | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const fin = new Date(d);
  fin.setHours(23, 59, 59, 999);
  return Date.now() > fin.getTime();
}

/** Demande une nouvelle échéance si l'ancienne est dépassée (réouverture AO). */
export function demanderNouvelleDateLimite(titre?: string): string | null {
  const suggestion = new Date();
  suggestion.setDate(suggestion.getDate() + 7);
  suggestion.setHours(17, 0, 0, 0);
  const defaut = suggestion.toISOString().slice(0, 16);

  const saisie = window.prompt(
    `La date limite est dépassée pour ${titre ? `« ${titre} »` : "cet appel d'offres"}.\n\n` +
      "Saisissez la nouvelle date et heure limite (format AAAA-MM-JJTHH:MM) :",
    defaut
  );
  if (!saisie?.trim()) return null;

  const parsed = new Date(saisie.trim());
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
    window.alert("Date invalide ou déjà passée.");
    return null;
  }

  return parsed.toISOString();
}
