import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import {
  buildReportSheets,
  DEFAULT_REPORT_OPTIONS,
  reportFilename,
  displayReportCell,
  hasExampleData,
} from '../lib/mentorias/report-model.ts';
import { populateReportWorkbook } from '../lib/mentorias/report-workbook.ts';
import { scopeState } from '../lib/mentorias/access.ts';

const state = {
  mentors: [
    {
      id: 'm1',
      name: 'Camila Torres',
      title: 'Asesora',
      expertise: ['Tecnología'],
      email: 'camila@demo.example.com',
      phone: '',
      bio: 'Apoyo a pequeños negocios.',
    },
    {
      id: 'm2',
      name: 'Otra mentora',
      title: '',
      expertise: [],
      email: '',
      phone: '',
      bio: '',
    },
  ],
  mentees: [
    {
      id: 'p1',
      name: 'Diego Valdés',
      venture: 'Taller Roble',
      stage: 'En marcha',
      email: 'diego@demo.example.com',
      phone: '',
      need: 'Organizar pedidos.',
    },
    {
      id: 'p2',
      name: 'Otro participante',
      venture: '',
      stage: '',
      email: '',
      phone: '',
      need: '',
    },
  ],
  mentorships: [
    {
      id: 'a',
      mentorId: 'm1',
      menteeId: 'p1',
      sourceNumber: 1,
      month: 'Noviembre',
      hours: 4.5,
      space: 'Laboratorio',
      status: 'En proceso',
      service: 'Mentoría en informática y ciberseguridad',
      formalization: 'Sí',
      planningSir: 'Sí',
      executionSir: 'Pendiente',
      paidAt: '',
      goal: 'Ordenar pedidos y respaldar diseños.',
      sessions: Array.from({ length: 6 }, (_, i) => ({
        id: `s${i}`,
        number: i + 1,
        date: i < 3 ? `2026-11-${String(i + 1).padStart(2, '0')}` : '',
        status: i < 3 ? 'Realizada' : 'Pendiente',
        summary: i < 3 ? 'Acuerdos de trabajo y próximos pasos.' : '',
        ...(i === 0
          ? {
              photo: {
                name: 'ejemplo.png',
                path: 'private/a.png',
                dataUrl: 'https://signed?token=secret',
                type: 'image/png',
                size: 20,
              },
            }
          : {}),
      })),
    },
    {
      id: 'b',
      mentorId: 'm2',
      menteeId: 'p2',
      sourceNumber: 2,
      month: '',
      hours: 0,
      space: '',
      status: 'En proceso',
      service: '',
      formalization: 'Pendiente',
      planningSir: 'Pendiente',
      executionSir: 'Pendiente',
      paidAt: '',
      goal: '',
      sessions: [],
    },
  ],
};

test('la selección controla las hojas y columnas, sin filtrar datos por la paginación visual', () => {
  const before = JSON.stringify(state);
  const selected = {
    ...DEFAULT_REPORT_OPTIONS,
    summary: false,
    mentors: false,
    mentees: false,
    mentorships: false,
    attachments: false,
  };
  const sheets = buildReportSheets(state, selected);
  assert.deepEqual(
    sheets.map((s) => s.name),
    ['Sesiones'],
  );
  assert.equal(sheets[0].tables[0].rows.length, 6);
  assert.equal(sheets[0].tables[0].columns.length, 7);
  const withEvidence = buildReportSheets(state, {
    ...selected,
    attachments: true,
  });
  assert.equal(withEvidence[0].tables[0].columns.length, 9);
  assert.equal(withEvidence[0].tables[0].rows[0][7], 'ejemplo.png');
  assert.doesNotMatch(JSON.stringify(withEvidence), /private\/|signed\?token/);
  assert.equal(JSON.stringify(state), before);
  assert.deepEqual(
    buildReportSheets(state, { ...selected, sessions: false }),
    [],
  );
});

test('el informe del mentor conserva el alcance de su cuenta en todas las hojas', () => {
  const scoped = scopeState(state, 'Mentor', 'm1');
  const sheets = buildReportSheets(scoped, DEFAULT_REPORT_OPTIONS);
  assert.doesNotMatch(JSON.stringify(sheets), /Otra mentora|Otro participante/);
  assert.equal(
    sheets.find((s) => s.key === 'mentors').tables[0].rows.length,
    1,
  );
  assert.equal(
    sheets
      .find((s) => s.key === 'summary')
      .tables[0].rows.find((row) => row[0] === 'Horas de acompañamiento')[1],
    4.5,
  );
  assert.equal(hasExampleData(scoped), true);
  assert.equal(
    hasExampleData({ mentors: [], mentees: [], mentorships: [] }),
    false,
  );
});

test('el XLSX conserva el modelo de la vista previa, logo, fechas, filtros y formato de impresión', async () => {
  const sheets = buildReportSheets(state, DEFAULT_REPORT_OPTIONS);
  const source = new ExcelJS.Workbook();
  const logo = `data:image/png;base64,${(await readFile(new URL('../public/logoinacap.png', import.meta.url))).toString('base64')}`;
  populateReportWorkbook(source, sheets, logo, '2026-11-20', true);
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(await source.xlsx.writeBuffer());
  assert.deepEqual(
    loaded.worksheets.map((s) => s.name),
    sheets.map((s) => s.name),
  );
  for (const model of sheets) {
    const sheet = loaded.getWorksheet(model.name);
    assert.equal(sheet.getImages().length, 1);
    assert.match(sheet.getCell('A3').value, /Datos de ejemplo/);
    assert.equal(
      sheet.pageSetup.fitToWidth,
      Math.max(
        1,
        Math.ceil(
          model.tables[0].columns.reduce(
            (total, column) => total + column.width,
            0,
          ) / 150,
        ),
      ),
    );
    assert.match(sheet.pageSetup.printArea, /^A1:/);
    assert.match(sheet.headerFooter.oddFooter, /&P de &N/);
    let rowIndex = 5;
    for (const table of model.tables) {
      if (table.title) rowIndex++;
      assert.deepEqual(
        sheet.getRow(rowIndex).values.slice(1),
        table.columns.map((c) => c.label),
      );
      assert.equal(sheet.getCell(rowIndex, 1).fill.fgColor.argb, 'FFC51C35');
      rowIndex++;
      for (const values of table.rows) {
        values.forEach((value, col) => {
          const cell = sheet.getCell(rowIndex, col + 1);
          if (table.columns[col].kind === 'date' && value) {
            assert.equal(cell.value.toISOString().slice(0, 10), value);
            assert.equal(cell.numFmt, 'dd-mm-yyyy');
          } else assert.equal(cell.value ?? '', value);
        });
        rowIndex++;
      }
      rowIndex += table.rows.length ? 2 : 3;
    }
    assert.equal(sheet.views[0].ySplit, model.key === 'summary' ? 6 : 5);
    if (model.key === 'summary') assert.equal(sheet.autoFilter, undefined);
    else assert.ok(sheet.autoFilter);
  }
  assert.throws(
    () =>
      populateReportWorkbook(
        new ExcelJS.Workbook(),
        [],
        logo,
        '2026-11-20',
        false,
      ),
    /al menos una hoja/,
  );
});

test('el archivo vacío es válido y los textos que parecen fórmulas siguen siendo texto', async () => {
  const selected = {
    ...DEFAULT_REPORT_OPTIONS,
    summary: false,
    mentees: false,
    mentorships: false,
    sessions: false,
  };
  const empty = buildReportSheets(
    { mentors: [], mentees: [], mentorships: [] },
    selected,
  );
  assert.deepEqual(empty[0].tables[0].rows, []);
  const model = buildReportSheets(
    {
      ...state,
      mentors: [
        { ...state.mentors[0], name: '=HYPERLINK("https://example.com")' },
      ],
    },
    selected,
  );
  const book = new ExcelJS.Workbook();
  const logo = `data:image/png;base64,${(await readFile(new URL('../public/logoinacap.png', import.meta.url))).toString('base64')}`;
  populateReportWorkbook(book, model, logo, '2026-11-20', true);
  assert.equal(
    book.getWorksheet('Mentores').getCell('A6').type,
    ExcelJS.ValueType.String,
  );
  assert.equal(reportFilename('Resumen.xlsx'), 'Resumen.xlsx');
  assert.equal(reportFilename(''), 'mentorias-crea-empresa.xlsx');
  assert.equal(
    reportFilename('reporte/noviembre:*'),
    'reporte-noviembre--.xlsx',
  );
  assert.equal(displayReportCell('2026-11-06', 'date'), '06-11-2026');
});
