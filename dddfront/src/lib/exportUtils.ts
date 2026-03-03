import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';

// Types pour les données d'export
export type ExportFormat = 'excel' | 'pdf';

interface ExportColumn {
  header: string;
  key: string;
  format?: (value: any) => string;
}

interface ExportOptions {
  fileName: string;
  title: string;
  columns: ExportColumn[];
  data: any[];
}

/**
 * Exporte les données au format Excel
 */
const exportToExcel = ({ fileName, data, columns }: ExportOptions) => {
  // Préparer les données pour Excel en ne gardant que les colonnes demandées
  const excelData = data.map(item => {
    const row: Record<string, any> = {};
    columns.forEach(col => {
      let value = item[col.key];
      // Gérer les clés imbriquées (ex: 'user.name')
      if (col.key.includes('.')) {
        const keys = col.key.split('.');
        value = item;
        for (const key of keys) {
          value = value ? value[key] : '';
        }
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
      let value = item[col.key];
      // Gérer les clés imbriquées (ex: 'user.name')
      if (col.key.includes('.')) {
        const keys = col.key.split('.');
        value = item;
        for (const key of keys) {
          value = value ? value[key] : '';
        }
      }
      return col.format ? col.format(value) : (value || '');
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
