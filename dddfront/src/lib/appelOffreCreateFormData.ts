export interface AppelOffreCreateInput {
  reference: string;
  source_financement: string;
  mode_passation: string;
  type_marche: string;
  titre: string;
  description: string;
  modalites_soumission_physique: string;
  date_limite_depot: string;
  cahier_paiement_requis: boolean;
  cahier_prix_xof: string;
}

/** FormData pour POST /api/appels-offres/with-documents (création atomique). */
export function buildAppelOffreCreateFormData(
  tender: AppelOffreCreateInput,
  avisFile: File,
  cahierFile: File,
  parsedDeadline: Date
): FormData {
  const fd = new FormData();
  fd.append("reference", tender.reference.trim());
  fd.append("source_financement", tender.source_financement);
  fd.append("mode_passation", tender.mode_passation.trim());
  fd.append("type_marche", tender.type_marche);
  fd.append("titre", tender.titre.trim());
  fd.append("description", tender.description.trim());
  fd.append("modalites_soumission_physique", tender.modalites_soumission_physique.trim());
  fd.append("date_limite_depot", parsedDeadline.toISOString());
  fd.append("statut", "draft");
  fd.append(
    "cahier_paiement_requis",
    tender.cahier_paiement_requis ? "1" : "0"
  );
  if (tender.cahier_paiement_requis) {
    const prix = Math.max(
      1,
      parseInt(String(tender.cahier_prix_xof).replace(/\D/g, ""), 10) || 0
    );
    fd.append("cahier_prix_xof", String(prix));
  }
  fd.append("avis", avisFile);
  fd.append("cahier", cahierFile);
  return fd;
}

export const AO_PIECE_LABELS: Record<string, string> = {
  AVIS_APPEL_OFFRES: "Avis d'appel d'offres",
  CAHIER_DES_CHARGES: "Cahier des charges",
};
