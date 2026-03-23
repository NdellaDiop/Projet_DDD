import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';

// Types pour les données d'export
export type ExportFormat = 'excel' | 'pdf';

interface ExportColumn {
  header: string;
  key: string;
  format?: (value: unknown) => string;
}

interface ExportOptions {
  fileName: string;
  title: string;
  columns: ExportColumn[];
  data: Record<string, unknown>[];
}

/**
 * Exporte les données au format Excel
 */
const exportToExcel = ({ fileName, data, columns }: ExportOptions) => {
  // Préparer les données pour Excel en ne gardant que les colonnes demandées
  const excelData = data.map(item => {
    const row: Record<string, unknown> = {};
    columns.forEach(col => {
      let value: unknown = item[col.key];
      // Gérer les clés imbriquées (ex: 'user.name')
      if (col.key.includes('.')) {
        const keys = col.key.split('.');
        let nestedValue: unknown = item;
        for (const key of keys) {
          nestedValue =
            typeof nestedValue === 'object' && nestedValue !== null
              ? (nestedValue as Record<string, unknown>)[key]
              : '';
        }
        value = nestedValue;
      }
      
      row[col.header] = col.format ? col.format(value) : value;
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Données');
  
  // Générer le buffer et sauvegarder
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
  saveAs(dataBlob, `${fileName}.xlsx`);
};

/**
 * Exporte les données au format PDF
 */
const exportToPDF = ({ fileName, title, data, columns }: ExportOptions) => {
  const doc = new jsPDF();

  // Titre du document
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  doc.setFontSize(11);
  doc.text(`Date d'export: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);

  // Préparer les données pour le tableau
  const tableData = data.map(item => {
    return columns.map(col => {
      let value: unknown = item[col.key];
      // Gérer les clés imbriquées (ex: 'user.name')
      if (col.key.includes('.')) {
        const keys = col.key.split('.');
        let nestedValue: unknown = item;
        for (const key of keys) {
          nestedValue =
            typeof nestedValue === 'object' && nestedValue !== null
              ? (nestedValue as Record<string, unknown>)[key]
              : '';
        }
        value = nestedValue;
      }
      if (col.format) return col.format(value);
      return value !== null && value !== undefined ? String(value) : '';
    });
  });

  const tableHeaders = columns.map(col => col.header);

  // Générer le tableau
  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: 40,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  doc.save(`${fileName}.pdf`);
};

/**
 * Fonction principale d'export
 */
export const exportData = (format: ExportFormat, options: ExportOptions) => {
  if (format === 'excel') {
    exportToExcel(options);
  } else {
    exportToPDF(options);
  }
};
