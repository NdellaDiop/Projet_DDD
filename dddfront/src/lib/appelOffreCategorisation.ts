/**
 * `mode_passation` est désormais saisi librement par le PRM / admin (champ texte).
 * On conserve uniquement la catégorisation par type de marché (liste fermée).
 */

/** Valeurs alignées sur `App\Models\AppelOffre::TYPE_*` (backend). */
export const TYPE_MARCHE_VALUES = [
  "travaux",
  "fournitures",
  "services_courants",
  "prestations_intellectuelles",
] as const;

export type TypeMarche = (typeof TYPE_MARCHE_VALUES)[number];

export const TYPE_MARCHE_OPTIONS: { value: TypeMarche; label: string }[] = [
  { value: "travaux", label: "Travaux" },
  { value: "fournitures", label: "Fournitures" },
  { value: "services_courants", label: "Services courants" },
  { value: "prestations_intellectuelles", label: "Prestations intellectuelles" },
];

export function typeMarcheLabel(
  value?: string | null,
  fallbackLabel?: string | null
): string {
  if (fallbackLabel) return fallbackLabel;
  const opt = TYPE_MARCHE_OPTIONS.find((o) => o.value === value);
  return opt?.label ?? (value ? String(value) : "—");
}
