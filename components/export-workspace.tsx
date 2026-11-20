'use client';
import Image from 'next/image';
import { useState, type ReactNode } from 'react';
import {
  BarChart3,
  UserRoundCheck,
  UsersRound,
  Waypoints,
  CalendarDays,
  Check,
  Download,
  FileSpreadsheet,
  Paperclip,
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  Eye,
  CheckCheck,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { programDate } from '@/lib/mentorias/access';
import {
  buildReportSheets,
  DEFAULT_REPORT_OPTIONS,
  REPORT_SECTIONS,
  reportFilename,
  displayReportCell,
  hasExampleData,
  type ReportKey,
  type ReportTable,
} from '@/lib/mentorias/report-model';
import {
  downloadBlob,
  imageToBase64,
  populateReportWorkbook,
} from '@/lib/mentorias/report-workbook';
import type { AppState, ExportOptions } from '@/lib/mentorias/domain';
import './export-workspace.css';

const ICONS = {
  summary: BarChart3,
  mentors: UserRoundCheck,
  mentees: UsersRound,
  mentorships: Waypoints,
  sessions: CalendarDays,
};
const PAGE_SIZE = 10;

export function ExportWorkspace({
  state,
  heading,
  hasUnsavedChanges,
}: {
  state: AppState;
  heading: ReactNode;
  hasUnsavedChanges: boolean;
}) {
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_REPORT_OPTIONS);
  const [activeKey, setActiveKey] = useState<ReportKey>('summary');
  const [reportDate] = useState(programDate);
  const [filename, setFilename] = useState(
    `Mentorías Crea Empresa - ${reportDate}`,
  );
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const sheets = buildReportSheets(state, options);
  const active = sheets.find((sheet) => sheet.key === activeKey) ?? sheets[0];
  const examples = hasExampleData(state);
  const counts = {
    summary: '9 indicadores',
    mentors: `${state.mentors.length} perfiles`,
    mentees: `${state.mentees.length} perfiles`,
    mentorships: `${state.mentorships.length} registros`,
    sessions: `${state.mentorships.reduce((total, m) => total + m.sessions.length, 0)} sesiones`,
  };
  const changeOptions = (next: ExportOptions) => {
    setOptions(next);
    setFeedback('');
    setError('');
  };
  const download = async () => {
    if (busy || !sheets.length || hasUnsavedChanges) return;
    setBusy(true);
    setFeedback('');
    setError('');
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const logo = await imageToBase64('/logoinacap.png');
      populateReportWorkbook(workbook, sheets, logo, reportDate, examples);
      const buffer = await workbook.xlsx.writeBuffer();
      downloadBlob(
        new Blob([buffer as BlobPart], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        reportFilename(filename),
      );
      setFeedback('Archivo generado. Revisa tus descargas.');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudo generar el archivo. Intenta nuevamente.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="export-workspace">
      {heading}
      <div className="export-layout">
        <aside className="export-builder">
          <fieldset disabled={busy}>
            <legend className="export-step">
              <span>01</span> Elige el contenido
            </legend>
            <p className="export-intro">
              Cada sección será una hoja de tu Excel.
            </p>
            <div className="export-presets">
              <Button
                variant="ghost"
                onClick={() =>
                  changeOptions({
                    ...DEFAULT_REPORT_OPTIONS,
                    attachments: options.attachments,
                  })
                }
              >
                <CheckCheck size={14} />
                Todo
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  changeOptions({
                    summary: true,
                    mentors: false,
                    mentees: false,
                    mentorships: false,
                    sessions: false,
                    attachments: options.attachments,
                  })
                }
              >
                Solo resumen
              </Button>
            </div>
            <div className="export-choices">
              {REPORT_SECTIONS.map((section) => {
                const Icon = ICONS[section.key];
                return (
                  <label
                    className="export-choice"
                    key={section.key}
                    data-checked={options[section.key]}
                    htmlFor={`export-${section.key}`}
                  >
                    <input
                      id={`export-${section.key}`}
                      type="checkbox"
                      checked={options[section.key]}
                      onChange={(event) =>
                        changeOptions({
                          ...options,
                          [section.key]: event.target.checked,
                        })
                      }
                      aria-label={`Incluir ${section.label}`}
                    />
                    <span className="export-choice-icon">
                      <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    <span className="export-choice-copy">
                      <strong>{section.label}</strong>
                      <span>{section.detail}</span>
                      <small>{counts[section.key]}</small>
                    </span>
                    <span className="export-checkbox" aria-hidden="true">
                      {options[section.key] && (
                        <Check size={12} strokeWidth={2.5} />
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
            {options.sessions && (
              <label
                className="export-evidence"
                htmlFor="export-evidence"
                aria-label="Nombres de evidencias"
              >
                <input
                  id="export-evidence"
                  type="checkbox"
                  checked={options.attachments}
                  onChange={(event) =>
                    changeOptions({
                      ...options,
                      attachments: event.target.checked,
                    })
                  }
                />
                <span>
                  <span>
                    <Paperclip size={13} aria-hidden="true" /> Nombres de
                    evidencias
                  </span>
                  <small>
                    Añade Foto y Documento a la hoja Sesiones. Los archivos se
                    consultan en el programa.
                  </small>
                </span>
              </label>
            )}
            <div className="export-file">
              <label htmlFor="export-filename">Nombre del archivo</label>
              <div>
                <Input
                  id="export-filename"
                  maxLength={120}
                  value={filename}
                  onChange={(event) => {
                    setFilename(event.target.value);
                    setFeedback('');
                  }}
                />
                <span>.xlsx</span>
              </div>
            </div>
            <a className="export-jump" href="#export-review">
              Ver vista previa <ArrowRight size={15} />
            </a>
          </fieldset>
        </aside>
        <section
          id="export-review"
          className="export-review"
          aria-label="Vista previa del Excel"
        >
          <div className="export-review-heading">
            <div>
              <h2 className="export-step">
                <span>02</span> Revisa tu archivo
              </h2>
              <p>Los mismos datos y columnas que descargarás.</p>
            </div>
            <Eye size={19} aria-hidden="true" />
          </div>
          {active ? (
            <div className="export-book">
              <div
                className="export-tabs"
                role="tablist"
                tabIndex={-1}
                aria-label="Hojas seleccionadas"
                onKeyDown={(event) => {
                  if (
                    !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(
                      event.key,
                    )
                  )
                    return;
                  event.preventDefault();
                  const index = sheets.findIndex(
                    (sheet) => sheet.key === active.key,
                  );
                  const next =
                    event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? sheets.length - 1
                        : (index +
                            (event.key === 'ArrowRight' ? 1 : -1) +
                            sheets.length) %
                          sheets.length;
                  setActiveKey(sheets[next].key);
                  document
                    .getElementById(`report-tab-${sheets[next].key}`)
                    ?.focus();
                }}
              >
                {sheets.map((sheet) => (
                  <button
                    type="button"
                    key={sheet.key}
                    role="tab"
                    id={`report-tab-${sheet.key}`}
                    aria-controls="report-preview-panel"
                    aria-selected={active.key === sheet.key}
                    tabIndex={active.key === sheet.key ? 0 : -1}
                    onClick={() => setActiveKey(sheet.key)}
                  >
                    {sheet.name}
                  </button>
                ))}
              </div>
              <div
                role="tabpanel"
                id="report-preview-panel"
                aria-labelledby={`report-tab-${active.key}`}
                tabIndex={0}
                className="export-sheet"
              >
                <header className="export-sheet-header">
                  <Image
                    unoptimized
                    src="/logoinacap.png"
                    width={40}
                    height={40}
                    alt="INACAP"
                  />
                  <div>
                    <span>CREA EMPRESA</span>
                    <h3>{active.name}</h3>
                    <p>{active.subtitle}</p>
                  </div>
                  <FileSpreadsheet
                    size={24}
                    strokeWidth={1.3}
                    aria-hidden="true"
                  />
                </header>
                <p className="export-sheet-date">
                  Preparado el {displayReportCell(reportDate, 'date')}
                  {examples && <span>Datos de ejemplo · uso académico</span>}
                </p>
                {active.tables.map((table, index) => (
                  <TablePreview
                    key={`${active.key}-${index}-${options.attachments}`}
                    table={table}
                    name={active.name}
                  />
                ))}
                <footer className="export-sheet-footer">
                  <span>INACAP · Crea Empresa</span>
                  <span>
                    Hoja {sheets.indexOf(active) + 1} de {sheets.length}
                  </span>
                </footer>
              </div>
              <div className="export-book-note">
                <Check size={14} aria-hidden="true" />
                Logo, filtros y formato de impresión incluidos.
              </div>
            </div>
          ) : (
            <div className="export-empty">
              <FileSpreadsheet size={42} strokeWidth={1.1} />
              <h3>Tu informe empieza aquí</h3>
              <p>Elige una sección para ver cómo quedará.</p>
              <Button
                variant="outline"
                onClick={() => changeOptions({ ...options, summary: true })}
              >
                Añadir resumen <ArrowRight size={15} />
              </Button>
            </div>
          )}
        </section>
        <div className="export-download">
          <p>
            <strong>{sheets.length}</strong>{' '}
            {sheets.length === 1 ? 'hoja seleccionada' : 'hojas seleccionadas'}
            <span>XLSX</span>
          </p>
          <Button
            onClick={download}
            disabled={busy || !sheets.length || hasUnsavedChanges}
          >
            {busy ? (
              <LoaderCircle className="animate-spin" size={17} />
            ) : (
              <Download size={17} />
            )}
            {busy ? 'Preparando archivo…' : 'Descargar Excel'}
          </Button>
          {!sheets.length && (
            <p className="export-help">Selecciona al menos una sección.</p>
          )}
          {hasUnsavedChanges && (
            <p className="export-help">
              Guarda los cambios del programa antes de descargar.
            </p>
          )}
          {feedback && (
            <output className="export-success">
              <Check size={14} />
              {feedback}
            </output>
          )}
          {error && (
            <p className="export-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function TablePreview({ table, name }: { table: ReportTable; name: string }) {
  const [requestedPage, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(table.rows.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pages - 1);
  const start = page * PAGE_SIZE;
  const rows = table.rows.slice(start, start + PAGE_SIZE);
  const wide = table.columns.length > 2;
  return (
    <div className="export-table-block">
      {table.title && <h4>{table.title}</h4>}
      {wide && (
        <p className="export-scroll-hint">
          <ArrowLeft size={11} />
          <span>Desliza para ver las {table.columns.length} columnas</span>
          <ArrowRight size={11} />
        </p>
      )}
      <section
        className="export-table-scroll"
        aria-label={`Tabla ${table.title || name}`}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Keyboard users need to scroll the wide table.
        tabIndex={0}
      >
        <table
          style={
            wide
              ? {
                  minWidth: table.columns.reduce(
                    (sum, col) => sum + col.width * 6,
                    0,
                  ),
                  tableLayout: 'fixed',
                }
              : undefined
          }
        >
          <caption className="sr-only">{table.title || name}</caption>
          {wide && (
            <colgroup>
              {table.columns.map((col) => (
                <col key={col.label} style={{ width: col.width * 6 }} />
              ))}
            </colgroup>
          )}
          <thead>
            <tr>
              {table.columns.map((col) => (
                <th key={col.label} scope="col">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr key={start + index}>
                  {row.map((value, col) => (
                    <td
                      key={table.columns[col].label}
                      data-number={typeof value === 'number'}
                    >
                      {displayReportCell(value, table.columns[col].kind)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={table.columns.length} className="export-no-rows">
                  Sin registros en esta sección.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      {wide && (
        <div className="export-pagination">
          <output>
            {rows.length
              ? `${start + 1}–${start + rows.length} de ${table.rows.length} filas`
              : '0 filas'}
          </output>
          {pages > 1 && (
            <div>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={!page}
                aria-label="Filas anteriores"
                onClick={() => setPage(page - 1)}
              >
                <ArrowLeft size={15} />
              </Button>
              <span>
                {page + 1} / {pages}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={page + 1 >= pages}
                aria-label="Filas siguientes"
                onClick={() => setPage(page + 1)}
              >
                <ArrowRight size={15} />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
