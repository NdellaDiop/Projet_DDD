/**
 * Numéro sénégalais : 9 chiffres.
 * Mobile : 70, 71, 76, 77, 78… (tout 7X) — Fixe : 3X…
 * Indicatif +221 optionnel.
 */
export function isValidSenegalPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (!digits) return false;

  const local = digits.length === 12 && digits.startsWith("221")
    ? digits.slice(3)
    : digits;

  return /^[37]\d{8}$/.test(local);
}

export function normalizeSenegalPhone(value: string): string | null {
  if (!isValidSenegalPhone(value)) return null;

  const digits = value.replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("221")
    ? digits.slice(3)
    : digits;

  return local;
}

/** Filtre la saisie : chiffres, espaces, +, tirets, parenthèses. */
export function sanitizePhoneInput(value: string): string {
  return value.replace(/[^\d+\s\-().]/g, "").slice(0, 20);
}

export const SENEGAL_PHONE_ERROR =
  "Numéro invalide. Saisissez un numéro sénégalais à 9 chiffres (70, 71, 76, 77, 78… ou fixe 33…).";

/** Message d'erreur téléphone (vide, incomplet ou format invalide), ou null si OK. */
export function getSenegalPhoneValidationError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Le téléphone est obligatoire.";

  const digits = trimmed.replace(/\D/g, "");
  const local =
    digits.length === 12 && digits.startsWith("221") ? digits.slice(3) : digits;

  if (local.length < 9) {
    return `Le numéro doit comporter 9 chiffres (${local.length}/9).`;
  }
  if (!isValidSenegalPhone(trimmed)) return SENEGAL_PHONE_ERROR;
  return null;
}
