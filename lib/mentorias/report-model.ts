import {
  MENTORSHIP_STATUSES,
  type AppState,
  type ExportOptions,
} from './domain.ts';
import { getMetrics, getMentorStats, getMenteeStats } from './metrics.ts';

export type ReportKey = Exclude<keyof ExportOptions, 'attachments'>;
export type ReportColumn = {
  label: string;
  width: number;
  kind?: 'number' | 'date';
};
export type ReportTable = {
  title?: string;
  columns: ReportColumn[];
  rows: (string | number)[][];
};
export type ReportSheet = {
  key: ReportKey;
  name: string;
  subtitle: string;
  tables: ReportTable[];
};
export const REPORT_SECTIONS: {
  key: ReportKey;
  label: string;
  detail: string;
}[] = [
  {
    key: 'summary',
    label: 'Resumen',
    detail: 'Indicadores y estados del programa',
  },
  {
    key: 'mentors',
    label: 'Mentores',
    detail: 'Experiencia, contacto y actividad',
  },
  {
    key: 'mentees',
    label: 'Mentoreados',
    detail: 'Proyectos y necesidades de apoyo',
  },
  {
    key: 'mentorships',
    label: 'Mentorías',
    detail: 'Objetivos, avance y gestión',
  },
  {
    key: 'sessions',
    label: 'Sesiones',
    detail: 'Fechas, acuerdos y evidencias',
  },
];
export const DEFAULT_REPORT_OPTIONS: ExportOptions = {
  summary: true,
  mentors: true,
  mentees: true,
  mentorships: true,
  sessions: true,
  attachments: true,
};
const column = (
  label: string,
  width: number,
  kind?: ReportColumn['kind'],
): ReportColumn => ({ label, width, kind });
export const hasExampleData = (state: AppState) =>
  [...state.mentors, ...state.mentees].some((person) =>
    person.email.endsWith('@demo.example.com'),
  );
export function reportFilename(value: string) {
  const name = value
    .trim()
    .replace(/\.xlsx$/i, '')
    .replace(/[<>:"/\\|?*]/g, '-')
    .split('')
    .filter((char) => char.charCodeAt(0) >= 32)
    .join('')
    .replace(/[.\s]+$/g, '')
    .slice(0, 120);
  return `${name || 'mentorias-crea-empresa'}.xlsx`;
}
export function displayReportCell(
  value: string | number,
  kind?: ReportColumn['kind'],
) {
  if (value === '') return '—';
  if (
    kind === 'date' &&
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    const [year, month, day] = value.split('-');
    return `${day}-${month}-${year}`;
  }
  return typeof value === 'number'
    ? value.toLocaleString('es-CL', { maximumFractionDigits: 2 })
    : value;
}

// A single data model feeds both the on-screen preview and the downloaded file.
export function buildReportSheets(
  state: AppState,
  options: ExportOptions,
): ReportSheet[] {
  const sheets: ReportSheet[] = [];
  const mentorName = (id: string) =>
    state.mentors.find((person) => person.id === id)?.name ?? '';
  const menteeName = (id: string) =>
    state.mentees.find((person) => person.id === id)?.name ?? '';
  if (options.summary) {
    const metrics = getMetrics(state);
    sheets.push({
      key: 'summary',
      name: 'Resumen',
      subtitle: 'El programa, de un vistazo',
      tables: [
        {
          title: 'Indicadores generales',
          columns: [column('Indicador', 42), column('Valor', 24)],
          rows: [
            ['Mentores', metrics.mentors],
            ['Mentoreados', metrics.mentees],
            ['Mentorías', metrics.mentorships],
            ['Mentorías activas', metrics.activeMentorships],
            ['Mentorías terminadas', metrics.finished],
            ['Horas de acompañamiento', metrics.hours],
            ['Sesiones realizadas', metrics.completedSessions],
            ['Evidencias adjuntas', metrics.evidenceCount],
            ['Cierre del programa', `${metrics.completionRate}%`],
          ],
        },
        {
          title: 'Estado de las mentorías',
          columns: [column('Estado', 42), column('Cantidad', 24, 'number')],
          rows: MENTORSHIP_STATUSES.map((status) => [
            status,
            state.mentorships.filter((m) => m.status === status).length,
          ]),
        },
      ],
    });
  }
  if (options.mentors)
    sheets.push({
      key: 'mentors',
      name: 'Mentores',
      subtitle: 'Experiencia y acompañamiento',
      tables: [
        {
          columns: [
            column('Nombre', 29),
            column('Presentación', 34),
            column('Especialidades', 34),
            column('Correo', 38),
            column('Teléfono', 20),
            column('Experiencia y enfoque', 58),
            column('Mentorías', 14, 'number'),
            column('Terminadas', 14, 'number'),
            column('Horas', 12, 'number'),
          ],
          rows: state.mentors.map((p) => {
            const stats = getMentorStats(p.id, state.mentorships);
            return [
              p.name,
              p.title,
              p.expertise.join(', '),
              p.email,
              p.phone,
              p.bio,
              stats.total,
              stats.finished,
              stats.hours,
            ];
          }),
        },
      ],
    });
  if (options.mentees)
    sheets.push({
      key: 'mentees',
      name: 'Mentoreados',
      subtitle: 'Personas e ideas en crecimiento',
      tables: [
        {
          columns: [
            column('Nombre', 29),
            column('Emprendimiento', 30),
            column('Etapa', 24),
            column('Correo', 38),
            column('Teléfono', 20),
            column('Apoyo que necesita', 58),
            column('Mentorías', 14, 'number'),
            column('Sesiones realizadas', 20, 'number'),
          ],
          rows: state.mentees.map((p) => {
            const stats = getMenteeStats(p.id, state.mentorships);
            return [
              p.name,
              p.venture,
              p.stage,
              p.email,
              p.phone,
              p.need,
              stats.total,
              stats.completedSessions,
            ];
          }),
        },
      ],
    });
  if (options.mentorships)
    sheets.push({
      key: 'mentorships',
      name: 'Mentorías',
      subtitle: 'Seguimiento de cada acompañamiento',
      tables: [
        {
          columns: [
            column('N°', 9, 'number'),
            column('Mentor', 29),
            column('Mentoreado', 29),
            column('Mes de inicio', 18),
            column('Horas', 12, 'number'),
            column('Espacio', 29),
            column('Estado', 23),
            column('Servicio', 44),
            column('Formalización', 20),
            column('Planificación SIR', 22),
            column('Ejecución SIR', 20),
            column('Fecha de pago', 18, 'date'),
            column('Sesiones realizadas', 20, 'number'),
            column('Objetivo', 58),
          ],
          rows: state.mentorships.map((m) => [
            m.sourceNumber,
            mentorName(m.mentorId),
            menteeName(m.menteeId),
            m.month,
            m.hours,
            m.space,
            m.status,
            m.service,
            m.formalization,
            m.planningSir,
            m.executionSir,
            m.paidAt,
            m.sessions.filter((s) => s.status === 'Realizada').length,
            m.goal,
          ]),
        },
      ],
    });
  if (options.sessions)
    sheets.push({
      key: 'sessions',
      name: 'Sesiones',
      subtitle: 'Conversaciones, avances y próximos pasos',
      tables: [
        {
          columns: [
            column('Mentoría', 12, 'number'),
            column('Mentor', 29),
            column('Mentoreado', 29),
            column('Sesión', 12, 'number'),
            column('Fecha', 18, 'date'),
            column('Estado', 20),
            column('Acuerdos y avances', 68),
            ...(options.attachments
              ? [column('Foto', 32), column('Documento', 34)]
              : []),
          ],
          rows: state.mentorships.flatMap((m) =>
            m.sessions.map((s) => [
              m.sourceNumber,
              mentorName(m.mentorId),
              menteeName(m.menteeId),
              s.number,
              s.date,
              s.status,
              s.summary,
              ...(options.attachments
                ? [s.photo?.name ?? '', s.document?.name ?? '']
                : []),
            ]),
          ),
        },
      ],
    });
  return sheets;
}
