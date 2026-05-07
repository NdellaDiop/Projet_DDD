/** Catégories alignées sur `App\Models\Document::LEGAL_CATEGORIES` (backend). */
export const LEGAL_DOCUMENT_CATEGORIES = [
  "RCCM",
  "NINEA",
  "QUITUS_FISCAL",
  "ATTESTATION_IPRES",
  "ATTESTATION_CSS",
  "ATTESTATION_NON_FAILLITE",
  "ATTESTATION_ARCOP",
] as const;

export type LegalDocumentCategory = (typeof LEGAL_DOCUMENT_CATEGORIES)[number];

/** Pièces complémentaires (hors liste obligatoire). */
export const OPTIONAL_LEGAL_DOCUMENT_CATEGORIES = ["AUTRE"] as const;

export type OptionalLegalDocumentCategory = (typeof OPTIONAL_LEGAL_DOCUMENT_CATEGORIES)[number];

/** Obligatoires + optionnels (affichage dossier / profil). */
export const ALL_LEGAL_DOCUMENT_UPLOAD_CATEGORIES = [
  ...LEGAL_DOCUMENT_CATEGORIES,
  ...OPTIONAL_LEGAL_DOCUMENT_CATEGORIES,
] as const;

const LABELS: Record<LegalDocumentCategory | OptionalLegalDocumentCategory, string> = {
  RCCM: "Justificatif RCCM (PDF/Image)",
  NINEA: "Justificatif NINEA (PDF/Image)",
  QUITUS_FISCAL: "Quitus fiscal",
  ATTESTATION_IPRES: "Attestation IPRES",
  ATTESTATION_CSS: "Attestation Caisse de sécurité sociale (CSS)",
  ATTESTATION_NON_FAILLITE: "Attestation de non-faillite",
  ATTESTATION_ARCOP: "Attestation ARCOP",
  AUTRE: "Autres documents (optionnel)",
};

export function legalDocumentLabel(code: string): string {
  return LABELS[code as LegalDocumentCategory | OptionalLegalDocumentCategory] ?? code;
}

export function missingLegalCategories(
  documents: { categorie: string }[]
): LegalDocumentCategory[] {
  const present = new Set(documents.map((d) => d.categorie));
  return LEGAL_DOCUMENT_CATEGORIES.filter((c) => !present.has(c));
}
