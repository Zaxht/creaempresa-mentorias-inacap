import type { Workbook, Worksheet, Cell, Borders } from 'exceljs';
import { MENTORSHIP_STATUSES, type AppState } from './domain';
import { getMetrics, getMentorStats, getMenteeStats } from './metrics';

export async function imageToBase64(path: string) {
  try {
    const response = await fetch(path);
    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function addWorkbookHeader(
  worksheet: Worksheet,
  logoId: number | undefined,
  title: string,
  subtitle: string,
) {
  worksheet.properties.defaultRowHeight = 22;
  worksheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.35,
      right: 0.35,
      top: 0.45,
      bottom: 0.45,
      header: 0.2,
      footer: 0.2,
    },
  };

  worksheet.addRow([]);
  worksheet.addRow([]);
  worksheet.addRow([]);
  worksheet.mergeCells('B1:H1');
  worksheet.mergeCells('B2:H2');
  worksheet.getCell('B1').value = title;
  worksheet.getCell('B2').value = subtitle;
  worksheet.getCell('B1').font = {
    bold: true,
    size: 18,
    color: { argb: 'FF0F322E' },
  };
  worksheet.getCell('B2').font = {
    size: 11,
    color: { argb: 'FF667085' },
  };
  worksheet.getCell('B1').alignment = { vertical: 'middle' };
  worksheet.getCell('B2').alignment = { vertical: 'middle' };

  if (typeof logoId === 'number') {
    worksheet.addImage(logoId, {
      tl: { col: 0.15, row: 0.15 },
      ext: { width: 42, height: 56 },
    });
  }
}

function addStyledTable(
  worksheet: Worksheet,
  headers: string[],
  rows: Array<Array<string | number>>,
  widths: number[],
) {
  worksheet.addRow([]);
  const headerRow = worksheet.addRow(headers);
  const headerRowNumber = headerRow.number;
  worksheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];
  worksheet.autoFilter = {
    from: { row: headerRowNumber, column: 1 },
    to: { row: headerRowNumber, column: headers.length },
  };

  headers.forEach((_, index) => {
    worksheet.getColumn(index + 1).width = widths[index] ?? 18;
  });

  headerRow.height = 26;
  headerRow.eachCell((cell: Cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F322E' },
    };
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.border = excelBorder();
  });

  rows.forEach((row, index) => {
    const dataRow = worksheet.addRow(row);
    dataRow.height = 24;
    dataRow.eachCell((cell: Cell) => {
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = excelBorder();
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: index % 2 === 0 ? 'FFFFFFFF' : 'FFF4F8F6' },
      };
    });
  });
}

function excelBorder(): Partial<Borders> {
  return {
    top: { style: 'thin', color: { argb: 'FFDDE5E1' } },
    left: { style: 'thin', color: { argb: 'FFDDE5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFDDE5E1' } },
    right: { style: 'thin', color: { argb: 'FFDDE5E1' } },
  };
}

export function addSummarySheet(
  workbook: Workbook,
  logoId: number | undefined,
  state: AppState,
) {
  const metrics = getMetrics(state);
  const worksheet = workbook.addWorksheet('Resumen');
  addWorkbookHeader(
    worksheet,
    logoId,
    'Monitoreo de mentorías 2026',
    'Resumen general Crea Empresa',
  );
  addStyledTable(
    worksheet,
    ['Indicador', 'Valor'],
    [
      ['Mentores', metrics.mentors],
      ['Mentoreados', metrics.mentees],
      ['Mentorías', metrics.mentorships],
      ['Mentorías activas', metrics.activeMentorships],
      ['Mentorías terminadas', metrics.finished],
      ['Horas registradas', metrics.hours],
      ['Sesiones realizadas', metrics.completedSessions],
      ['Evidencias adjuntas', metrics.evidenceCount],
      ['Cierre general', `${metrics.completionRate}%`],
    ],
    [32, 18],
  );

  worksheet.addRow([]);
  addStyledTable(
    worksheet,
    ['Estado', 'Cantidad'],
    MENTORSHIP_STATUSES.map((status) => [
      status,
      state.mentorships.filter((mentorship) => mentorship.status === status)
        .length,
    ]),
    [32, 18],
  );
}

export function addMentorsSheet(
  workbook: Workbook,
  logoId: number | undefined,
  state: AppState,
) {
  const worksheet = workbook.addWorksheet('Mentores');
  addWorkbookHeader(worksheet, logoId, 'Mentores', 'Perfiles y carga asignada');
  addStyledTable(
    worksheet,
    [
      'Nombre',
      'Perfil',
      'Correo',
      'Teléfono',
      'Especialidades',
      'Mentorías',
      'Terminadas',
      'Horas',
    ],
    state.mentors.map((mentor) => {
      const stats = getMentorStats(mentor.id, state.mentorships);

      return [
        mentor.name,
        mentor.title,
        mentor.email,
        mentor.phone,
        mentor.expertise.join(', '),
        stats.total,
        stats.finished,
        stats.hours,
      ];
    }),
    [28, 22, 28, 18, 42, 14, 14, 12],
  );
}

export function addMenteesSheet(
  workbook: Workbook,
  logoId: number | undefined,
  state: AppState,
) {
  const worksheet = workbook.addWorksheet('Mentoreados');
  addWorkbookHeader(
    worksheet,
    logoId,
    'Mentoreados',
    'Fichas de participantes y emprendimientos',
  );
  addStyledTable(
    worksheet,
    [
      'Nombre',
      'Emprendimiento',
      'Etapa',
      'Correo',
      'Teléfono',
      'Necesidad',
      'Mentorías',
      'Sesiones realizadas',
    ],
    state.mentees.map((mentee) => {
      const stats = getMenteeStats(mentee.id, state.mentorships);

      return [
        mentee.name,
        mentee.venture,
        mentee.stage,
        mentee.email,
        mentee.phone,
        mentee.need,
        stats.total,
        stats.completedSessions,
      ];
    }),
    [28, 28, 20, 28, 18, 46, 14, 18],
  );
}

export function addMentorshipsSheet(
  workbook: Workbook,
  logoId: number | undefined,
  state: AppState,
) {
  const worksheet = workbook.addWorksheet('Mentorias');
  addWorkbookHeader(
    worksheet,
    logoId,
    'Mentorías',
    'Seguimiento operativo por mentoría',
  );
  addStyledTable(
    worksheet,
    [
      'N°',
      'Mentor',
      'Mentoreado',
      'Mes',
      'Horas',
      'Espacio',
      'Estado',
      'Servicio',
      'Formalización',
      'Planificación SIR',
      'Ejecución SIR',
      'Pagada en',
      'Sesiones realizadas',
      'Objetivo',
    ],
    state.mentorships.map((mentorship) => {
      const mentor = state.mentors.find(
        (item) => item.id === mentorship.mentorId,
      );
      const mentee = state.mentees.find(
        (item) => item.id === mentorship.menteeId,
      );

      return [
        mentorship.sourceNumber,
        mentor?.name ?? '',
        mentee?.name ?? '',
        mentorship.month,
        mentorship.hours,
        mentorship.space,
        mentorship.status,
        mentorship.service,
        mentorship.formalization,
        mentorship.planningSir,
        mentorship.executionSir,
        mentorship.paidAt,
        mentorship.sessions.filter((session) => session.status === 'Realizada')
          .length,
        mentorship.goal,
      ];
    }),
    [10, 28, 28, 16, 12, 22, 22, 36, 18, 20, 18, 16, 18, 44],
  );
}

export function addSessionsSheet(
  workbook: Workbook,
  logoId: number | undefined,
  state: AppState,
  includeAttachments: boolean,
) {
  const worksheet = workbook.addWorksheet('Sesiones');
  addWorkbookHeader(
    worksheet,
    logoId,
    'Sesiones',
    'Detalle de avances, acuerdos y evidencias',
  );
  const headers = [
    'Mentoría',
    'Mentor',
    'Mentoreado',
    'Sesión',
    'Fecha',
    'Estado',
    'Resumen',
    ...(includeAttachments ? ['Foto', 'Documento'] : []),
  ];
  const widths = [12, 28, 28, 12, 16, 18, 54, 28, 30];
  const rows = state.mentorships.flatMap((mentorship) => {
    const mentor = state.mentors.find(
      (item) => item.id === mentorship.mentorId,
    );
    const mentee = state.mentees.find(
      (item) => item.id === mentorship.menteeId,
    );

    return mentorship.sessions.map((session) => [
      mentorship.sourceNumber,
      mentor?.name ?? '',
      mentee?.name ?? '',
      session.number,
      session.date,
      session.status,
      session.summary,
      ...(includeAttachments
        ? [session.photo?.name ?? '', session.document?.name ?? '']
        : []),
    ]);
  });

  addStyledTable(worksheet, headers, rows, widths);
}
