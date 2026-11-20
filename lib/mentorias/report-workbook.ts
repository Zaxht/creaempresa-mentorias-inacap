import type { Workbook } from 'exceljs';
import type { ReportSheet, ReportColumn } from './report-model';

export async function imageToBase64(path: string) {
  const response = await fetch(path);
  if (!response.ok)
    throw new Error(
      'No se pudo cargar el logo del informe. Vuelve a intentarlo.',
    );
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () =>
      reject(new Error('No se pudo preparar el logo del informe.'));
    reader.readAsDataURL(blob);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const colors = {
  red: 'FFC51C35',
  ink: 'FF252A28',
  muted: 'FF707366',
  cream: 'FFF6F3ED',
  white: 'FFFFFEFA',
  rule: 'FFE3DED3',
};
function excelValue(value: string | number, column: ReportColumn) {
  if (
    column.kind === 'date' &&
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  )
    return new Date(`${value}T00:00:00Z`);
  return value;
}

export function populateReportWorkbook(
  workbook: Workbook,
  sheets: ReportSheet[],
  logo: string,
  date: string,
  exampleData: boolean,
) {
  if (!sheets.length)
    throw new Error('Elige al menos una hoja para descargar.');
  workbook.creator = 'Crea Empresa · INACAP';
  workbook.subject = exampleData
    ? 'Datos ficticios para demostración académica'
    : 'Seguimiento del programa de mentorías';
  workbook.created = new Date();
  workbook.modified = workbook.created;
  const logoId = workbook.addImage({ base64: logo, extension: 'png' });
  const [year, month, day] = date.split('-');
  const note = `Preparado el ${day}-${month}-${year}${exampleData ? ' · Datos de ejemplo para uso académico' : ''}`;
  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name, {
      properties: { tabColor: { argb: colors.red }, defaultRowHeight: 28 },
    });
    const columns = sheet.tables[0].columns;
    const lastColumn = worksheet.getColumn(columns.length).letter;
    columns.forEach((col, index) => {
      worksheet.getColumn(index + 1).width = col.width;
    });
    worksheet.mergeCells(`A1:${lastColumn}1`);
    worksheet.mergeCells(`A2:${lastColumn}2`);
    worksheet.mergeCells(`A3:${lastColumn}3`);
    worksheet.getCell('A1').value = `Crea Empresa · ${sheet.name}`;
    worksheet.getCell('A1').font = {
      name: 'Aptos Display',
      size: 18,
      bold: true,
      color: { argb: colors.ink },
    };
    worksheet.getCell('A2').value = sheet.subtitle;
    worksheet.getCell('A2').font = {
      name: 'Aptos',
      size: 11,
      color: { argb: colors.muted },
    };
    ['A1', 'A2'].forEach((address) => {
      worksheet.getCell(address).alignment = { indent: 6, vertical: 'middle' };
    });
    worksheet.getCell('A3').value = note;
    worksheet.getCell('A3').font = {
      name: 'Aptos',
      size: 9,
      color: { argb: colors.muted },
    };
    worksheet.getCell('A3').alignment = { vertical: 'middle' };
    worksheet.getRow(1).height = 33;
    worksheet.getRow(2).height = 23;
    worksheet.getRow(3).height = 25;
    worksheet.addImage(logoId, {
      tl: { col: 0.08, row: 0.18 },
      ext: { width: 42, height: 42 },
    });
    let rowNumber = 5;
    let firstHeader = 0;
    for (const table of sheet.tables) {
      if (table.title) {
        worksheet.mergeCells(rowNumber, 1, rowNumber, columns.length);
        const cell = worksheet.getCell(rowNumber, 1);
        cell.value = table.title;
        cell.font = {
          name: 'Aptos',
          bold: true,
          size: 12,
          color: { argb: colors.ink },
        };
        cell.alignment = { vertical: 'middle' };
        worksheet.getRow(rowNumber).height = 30;
        rowNumber++;
      }
      const header = worksheet.getRow(rowNumber);
      header.values = table.columns.map((col) => col.label);
      header.height = 34;
      header.eachCell((cell) => {
        cell.font = {
          name: 'Aptos',
          bold: true,
          size: 11,
          color: { argb: 'FFFFFFFF' },
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colors.red },
        };
        cell.alignment = { vertical: 'middle', wrapText: true, indent: 1 };
      });
      if (!firstHeader) {
        firstHeader = rowNumber;
        worksheet.views = [
          { state: 'frozen', ySplit: firstHeader, showGridLines: false },
        ];
        if (sheet.key !== 'summary')
          worksheet.autoFilter = {
            from: { row: rowNumber, column: 1 },
            to: { row: rowNumber + table.rows.length, column: columns.length },
          };
      }
      rowNumber++;
      for (const [index, values] of table.rows.entries()) {
        const row = worksheet.getRow(rowNumber++);
        row.values = values.map((value, col) =>
          excelValue(value, table.columns[col]),
        );
        const lineCount = Math.max(
          1,
          ...values.map((value, col) =>
            String(value)
              .split('\n')
              .reduce(
                (sum, line) =>
                  sum +
                  Math.max(
                    1,
                    Math.ceil(
                      line.length / Math.max(8, table.columns[col].width - 3),
                    ),
                  ),
                0,
              ),
          ),
        );
        row.height = Math.min(409, Math.max(29, lineCount * 15 + 12));
        for (let col = 1; col <= columns.length; col++) {
          const cell = row.getCell(col);
          cell.font = { name: 'Aptos', size: 11, color: { argb: colors.ink } };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: index % 2 ? colors.cream : colors.white },
          };
          cell.border = {
            bottom: { style: 'hair', color: { argb: colors.rule } },
          };
          cell.alignment = {
            vertical: 'middle',
            wrapText: true,
            indent: 1,
            horizontal: typeof values[col - 1] === 'number' ? 'right' : 'left',
          };
          if (table.columns[col - 1].kind === 'date')
            cell.numFmt = 'dd-mm-yyyy';
          else if (typeof values[col - 1] === 'number')
            cell.numFmt = Number.isInteger(values[col - 1]) ? '0' : '0.0#';
        }
      }
      if (!table.rows.length) {
        worksheet.mergeCells(rowNumber, 1, rowNumber, columns.length);
        worksheet.getCell(rowNumber++, 1).value =
          'Sin registros en esta sección.';
      }
      rowNumber += 2;
    }
    worksheet.pageSetup = {
      paperSize: 9,
      orientation: columns.length > 2 ? 'landscape' : 'portrait',
      fitToPage: true,
      fitToWidth: Math.max(
        1,
        Math.ceil(
          columns.reduce((total, column) => total + column.width, 0) / 150,
        ),
      ),
      fitToHeight: sheet.key === 'summary' ? 1 : 0,
      printArea: `A1:${lastColumn}${rowNumber - 3}`,
      printTitlesRow: `1:${firstHeader}`,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.45,
        bottom: 0.45,
        header: 0.2,
        footer: 0.2,
      },
    };
    worksheet.headerFooter.oddFooter =
      '&L Crea Empresa · INACAP&R Página &P de &N';
  }
}
