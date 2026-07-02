/** Aligné sur AppelOffre::dateLimiteDepotDepassee() (fin du jour calendaire). */
export function dateLimiteDepotDepassee(iso: string | undefined | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const fin = new Date(d);
  fin.setHours(23, 59, 59, 999);
  return Date.now() > fin.getTime();
}

/** Valeur par défaut pour input datetime-local (+7 jours, 17h). */
export function defaultNouvelleDateLimiteLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(17, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local → ISO pour l'API Laravel. */
export function parseDatetimeLocalToIso(value: string): string | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
    return null;
  }
  return parsed.toISOString();
}

export type ReopenAoTarget = {
  id: number;
  titre?: string;
  date_limite_depot?: string;
};

export function reopenRequiresNewDate(ao: ReopenAoTarget): boolean {
  return dateLimiteDepotDepassee(ao.date_limite_depot);
}
