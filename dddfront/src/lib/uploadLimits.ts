/** Aligné sur StoreAppelOffreWithDocumentsRequest (max 10240 Ko). */
export const MAX_AO_PIECE_BYTES = 10 * 1024 * 1024;

export function formatMaxUploadMo(): string {
  return "10 Mo";
}

export function validateAoPieceSize(file: File, label: string): string | null {
  if (file.size > MAX_AO_PIECE_BYTES) {
    return `${label} : taille max ${formatMaxUploadMo()} (fichier : ${(file.size / (1024 * 1024)).toFixed(1)} Mo).`;
  }
  return null;
}
