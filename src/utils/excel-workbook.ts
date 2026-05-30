import ExcelJS from 'exceljs';

type JsonSheet = {
  name: string;
  rows: Record<string, unknown>[];
};

type ArraySheet = {
  name: string;
  rows: (string | number)[][];
};

export type ExcelSheet = JsonSheet | ArraySheet;

function isJsonSheet(sheet: ExcelSheet): sheet is JsonSheet {
  return sheet.rows.length === 0 || !Array.isArray(sheet.rows[0]);
}

function addJsonSheet(workbook: ExcelJS.Workbook, name: string, rows: Record<string, unknown>[]) {
  const worksheet = workbook.addWorksheet(name);
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]); 
  worksheet.addRow(headers);
  rows.forEach((row) => {
    worksheet.addRow(headers.map((header) => row[header] ?? ''));
  });
}

function addArraySheet(workbook: ExcelJS.Workbook, name: string, rows: (string | number)[][]) {
  const worksheet = workbook.addWorksheet(name);
  rows.forEach((row) => worksheet.addRow(row));
}

export async function writeExcelWorkbook(sheets: ExcelSheet[]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();

  sheets.forEach((sheet) => {
    if (isJsonSheet(sheet)) {
      addJsonSheet(workbook, sheet.name, sheet.rows);
      return;
    }
    addArraySheet(workbook, sheet.name, sheet.rows);
  });

  return workbook.xlsx.writeBuffer();
}
