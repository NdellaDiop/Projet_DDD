import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PVReportData {
  appelOffre: {
    reference: string;
    titre: string;
    date_publication: string;
    date_cloture: string;
    description: string;
    responsable: string;
  };
  candidatures: Array<{
    fournisseur: string;
    email: string;
    date_soumission: string;
    montant: string;
    statut: string;
    documents_complets: string; // "Oui" ou "Non"
  }>;
}

export const generatePVReport = (data: PVReportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // 1. En-tête avec Logo (Simulé par du texte stylisé)
  doc.setFontSize(22);
  doc.setTextColor(0, 77, 64); // Vert foncé (type Dakar Dem Dikk)
  doc.text("DAKAR DEM DIKK", pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Service des Marchés Publics", pageWidth / 2, 26, { align: 'center' });
  
  // Ligne de séparation
  doc.setDrawColor(0, 77, 64);
  doc.setLineWidth(1);
  doc.line(20, 32, pageWidth - 20, 32);

  // 2. Titre du Rapport
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text("PROCÈS-VERBAL D'ANALYSE DES OFFRES", pageWidth / 2, 45, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Date du rapport : ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 20, 55, { align: 'right' });

  // 3. Détails du Marché
  doc.setFillColor(245, 245, 245);
  doc.rect(14, 60, pageWidth - 28, 45, 'F');
  
  doc.setFontSize(12);
  doc.setTextColor(0, 77, 64);
  doc.text("DÉTAILS DU MARCHÉ", 20, 70);
  
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`Référence : ${data.appelOffre.reference}`, 20, 80);
  doc.text(`Titre : ${data.appelOffre.titre}`, 20, 86);
  doc.text(`Date de publication : ${data.appelOffre.date_publication}`, 20, 92);
  doc.text(`Date de clôture : ${data.appelOffre.date_cloture}`, 120, 92);
  doc.text(`Responsable du dossier : ${data.appelOffre.responsable}`, 20, 98);

  // 4. Tableau des Candidatures
  doc.setFontSize(12);
  doc.setTextColor(0, 77, 64);
  doc.text("TABLEAU COMPARATIF DES OFFRES", 14, 120);

  const tableHeaders = [['Fournisseur', 'Date Soumission', 'Montant (FCFA)', 'Documents', 'Décision']];
  const tableData = data.candidatures.map(c => [
    c.fournisseur,
    c.date_soumission,
    c.montant,
    c.documents_complets,
    c.statut
  ]);

  autoTable(doc, {
    head: tableHeaders,
    body: tableData,
    startY: 125,
    theme: 'grid',
    headStyles: { fillColor: [0, 77, 64], textColor: 255, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 50 }, // Fournisseur
      1: { cellWidth: 30, halign: 'center' }, // Date
      2: { cellWidth: 40, halign: 'right' }, // Montant
      3: { cellWidth: 25, halign: 'center' }, // Docs
      4: { cellWidth: 35, halign: 'center', fontStyle: 'bold' } // Décision
    },
    styles: { fontSize: 9, cellPadding: 3 },
    alternateRowStyles: { fillColor: [240, 248, 255] }
  });

  // Récupérer la position Y après le tableau
  const finalY = (doc as any).lastAutoTable.finalY || 150;

  // 5. Conclusion / Synthèse
  doc.setFontSize(12);
  doc.setTextColor(0, 77, 64);
  doc.text("SYNTHÈSE DE LA COMMISSION", 14, finalY + 15);
  
  doc.setFontSize(10);
  doc.setTextColor(0);
  const retenus = data.candidatures.filter(c => c.statut.toLowerCase().includes('retenu') || c.statut.toLowerCase().includes('acceptée'));
  
  if (retenus.length > 0) {
    const winner = retenus[0];
    doc.text(`Après analyse des offres techniques et financières, la commission décide d'attribuer le marché à l'entreprise ${winner.fournisseur} pour un montant de ${winner.montant}.`, 14, finalY + 25, { maxWidth: pageWidth - 28 });
  } else {
    doc.text("À ce stade, aucune offre n'a été formellement retenue par la commission.", 14, finalY + 25);
  }

  // 6. Signatures
  doc.setFontSize(12);
  doc.setTextColor(0, 77, 64);
  doc.text("SIGNATURES DES MEMBRES DE LA COMMISSION", 14, finalY + 50);

  // Cadres pour signatures
  const signatureY = finalY + 60;
  const boxWidth = (pageWidth - 40) / 3;
  
  doc.setDrawColor(200);
  doc.rect(14, signatureY, boxWidth, 40); // Membre 1
  doc.rect(14 + boxWidth + 6, signatureY, boxWidth, 40); // Président
  doc.rect(14 + (boxWidth + 6) * 2, signatureY, boxWidth, 40); // Secrétaire

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Le Rapporteur", 14 + 5, signatureY + 8);
  doc.text("Le Président", 14 + boxWidth + 6 + 5, signatureY + 8);
  doc.text("Le Directeur Général", 14 + (boxWidth + 6) * 2 + 5, signatureY + 8);

  // Pied de page
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} sur ${pageCount} - Document généré automatiquement via le Portail Marchés Publics`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }

  doc.save(`PV_Analyse_${data.appelOffre.reference}.pdf`);
};
