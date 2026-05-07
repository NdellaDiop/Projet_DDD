/** Valeurs alignées sur `App\Models\AppelOffre::SOURCE_*` (backend). */
export const SOURCE_FINANCEMENT_VALUES = ["fonds_propres", "etat", "financement_exterieure"] as const;

export type SourceFinancement = (typeof SOURCE_FINANCEMENT_VALUES)[number];

export const SOURCE_FINANCEMENT_OPTIONS: { value: SourceFinancement; label: string }[] = [
  { value: "fonds_propres", label: "Fonds propres" },
  { value: "etat", label: "État" },
  { value: "financement_exterieure", label: "Financement extérieure" },
];

export function sourceFinancementLabel(
  value?: string | null,
  fallbackLabel?: string | null
): string {
  if (fallbackLabel) return fallbackLabel;
  const opt = SOURCE_FINANCEMENT_OPTIONS.find((o) => o.value === value);
  return opt?.label ?? (value ? String(value) : "—");
}
