'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  Plus,
  RotateCcw,
  Search,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'monitoreo-mentorias-2026';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const STATUSES = [
  '',
  'Suspendida',
  'En proceso',
  'Terminada',
  'No corresponde',
  'Esperando derivación',
  'Derivada',
] as const;

const SERVICES = [
  '',
  'Mentoría administrativa y financiera',
  'Mentoría en gestión comercial',
  'Mentoría en informática y ciberseguridad',
] as const;

const CHECK_OPTIONS = ['', 'Sí', 'No', 'No corresponde'] as const;

type MonitoringRow = {
  id: number;
  mentor: string;
  mentee: string;
  month: string;
  hours: string;
  space: string;
  sessions: boolean[];
  status: string;
  service: string;
  formalization: string;
  planningSir: string;
  executionSir: string;
  paidAt: string;
};

const createEmptyRow = (id: number): MonitoringRow => ({
  id,
  mentor: '',
  mentee: '',
  month: '',
  hours: '',
  space: '',
  sessions: Array.from({ length: 6 }, () => false),
  status: '',
  service: '',
  formalization: '',
  planningSir: '',
  executionSir: '',
  paidAt: '',
});

const INITIAL_ROWS: MonitoringRow[] = Array.from({ length: 42 }, (_, index) => {
  const row = createEmptyRow(index + 1);

  if (row.id === 16) {
    return {
      ...row,
      mentor: 'Víctor Valenzuela Ruz',
      mentee: 'Catherine Vega',
      status: 'Suspendida',
    };
  }

  if (row.id === 17) {
    return {
      ...row,
      mentor: 'Maritza Madariaga',
      mentee: 'Claudia Rojas',
      status: 'Suspendida',
    };
  }

  return row;
});

const statusStyles: Record<string, string> = {
  Suspendida: 'border-rose-200 bg-rose-50 text-rose-700',
  'En proceso': 'border-sky-200 bg-sky-50 text-sky-700',
  Terminada: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'No corresponde': 'border-zinc-200 bg-zinc-50 text-zinc-600',
  'Esperando derivación': 'border-amber-200 bg-amber-50 text-amber-700',
  Derivada: 'border-violet-200 bg-violet-50 text-violet-700',
};

const csvHeaders = [
  'N°',
  'Mentor',
  'Mentoreado',
  'Mes de la Mentoria',
  'Horas de Mentoria',
  'Espacio utilizado',
  'Sesión 1',
  'Sesión 2',
  'Sesión 3',
  'Sesión 4',
  'Sesión 5',
  'Sesión 6',
  'Estado',
  'Servicio Entregado',
  'Formalización',
  'Planificación SIR',
  'Ejecución SIR',
  'Pagada en',
];

function toCsvCell(value: string | number | boolean) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rowHasData(row: MonitoringRow) {
  return Boolean(
    row.mentor ||
      row.mentee ||
      row.month ||
      row.hours ||
      row.space ||
      row.status ||
      row.service ||
      row.formalization ||
      row.planningSir ||
      row.executionSir ||
      row.paidAt ||
      row.sessions.some(Boolean),
  );
}

function completedSessions(row: MonitoringRow) {
  return row.sessions.filter(Boolean).length;
}

function normalizeStoredRows(rows: MonitoringRow[]) {
  return rows.map((row, index) => ({
    ...createEmptyRow(row.id || index + 1),
    ...row,
    sessions: Array.from({ length: 6 }, (_, sessionIndex) =>
      Boolean(row.sessions?.[sessionIndex]),
    ),
  }));
}

export default function Home() {
  const [rows, setRows] = useState<MonitoringRow[]>(INITIAL_ROWS);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [monthFilter, setMonthFilter] = useState('Todos');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as MonitoringRow[];
        setRows(normalizeStoredRows(parsed));
      } catch {
        setRows(INITIAL_ROWS);
      }
    }

    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (hasLoaded) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    }
  }, [hasLoaded, rows]);

  const filteredRows = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesQuery =
        !cleanQuery ||
        [row.mentor, row.mentee, row.service, row.space].some((value) =>
          value.toLowerCase().includes(cleanQuery),
        );
      const matchesStatus =
        statusFilter === 'Todos' || row.status === statusFilter;
      const matchesMonth = monthFilter === 'Todos' || row.month === monthFilter;

      return matchesQuery && matchesStatus && matchesMonth;
    });
  }, [monthFilter, query, rows, statusFilter]);

  const metrics = useMemo(() => {
    const rowsWithData = rows.filter(rowHasData);
    const totalHours = rows.reduce(
      (sum, row) => sum + Number.parseFloat(row.hours || '0'),
      0,
    );
    const sessionCount = rows.reduce(
      (sum, row) => sum + completedSessions(row),
      0,
    );
    const finished = rows.filter((row) => row.status === 'Terminada').length;
    const inProgress = rows.filter((row) => row.status === 'En proceso').length;
    const suspended = rows.filter((row) => row.status === 'Suspendida').length;

    return {
      rowsWithData: rowsWithData.length,
      totalHours,
      sessionCount,
      finished,
      inProgress,
      suspended,
      completionRate:
        rowsWithData.length === 0 ? 0 : Math.round((finished / rowsWithData.length) * 100),
    };
  }, [rows]);

  const statusSummary = useMemo(
    () =>
      STATUSES.filter(Boolean).map((status) => ({
        status,
        count: rows.filter((row) => row.status === status).length,
      })),
    [rows],
  );

  const serviceSummary = useMemo(
    () =>
      SERVICES.filter(Boolean).map((service) => ({
        service,
        count: rows.filter((row) => row.service === service).length,
      })),
    [rows],
  );

  const updateRow = (id: number, patch: Partial<MonitoringRow>) => {
    setRows((currentRows) =>
      currentRows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const updateSession = (id: number, sessionIndex: number, checked: boolean) => {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === id
          ? {
              ...row,
              sessions: row.sessions.map((session, index) =>
                index === sessionIndex ? checked : session,
              ),
            }
          : row,
      ),
    );
  };

  const addRow = () => {
    const nextId = Math.max(...rows.map((row) => row.id), 0) + 1;
    setRows((currentRows) => [...currentRows, createEmptyRow(nextId)]);
  };

  const resetTemplate = () => {
    const shouldReset = window.confirm(
      'Esto restaurará la plantilla original y borrará los cambios guardados en este navegador.',
    );

    if (shouldReset) {
      setRows(INITIAL_ROWS);
    }
  };

  const exportCsv = () => {
    const lines = [
      csvHeaders.map(toCsvCell).join(','),
      ...rows.map((row) =>
        [
          row.id,
          row.mentor,
          row.mentee,
          row.month,
          row.hours,
          row.space,
          ...row.sessions.map((session) => (session ? 'Sí' : '')),
          row.status,
          row.service,
          row.formalization,
          row.planningSir,
          row.executionSir,
          row.paidAt,
        ]
          .map(toCsvCell)
          .join(','),
      ),
    ];

    const blob = new Blob([`\uFEFF${lines.join('\n')}`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'monitoreo-mentorias-2026.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7faf8_0%,#eef5f1_48%,#f8fafc_100%)] text-foreground">
      <section className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-emerald-900/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <FileSpreadsheet className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">
                Crea Empresa
              </p>
              <h1 className="text-2xl font-semibold text-balance sm:text-3xl">
                Monitoreo de mentorías 2026
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={resetTemplate}>
              <RotateCcw aria-hidden="true" />
              Restaurar
            </Button>
            <Button type="button" variant="secondary" onClick={addRow}>
              <Plus aria-hidden="true" />
              Agregar fila
            </Button>
            <Button type="button" onClick={exportCsv}>
              <Download aria-hidden="true" />
              Exportar CSV
            </Button>
          </div>
        </header>

        <section
          aria-label="Resumen"
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <MetricCard
            icon={<Users className="size-4" aria-hidden="true" />}
            label="Registros con datos"
            value={`${metrics.rowsWithData} / ${rows.length}`}
            helper={`${filteredRows.length} visibles`}
          />
          <MetricCard
            icon={<Clock3 className="size-4" aria-hidden="true" />}
            label="Horas registradas"
            value={metrics.totalHours.toLocaleString('es-CL', {
              maximumFractionDigits: 1,
            })}
            helper={`${metrics.sessionCount} sesiones marcadas`}
          />
          <MetricCard
            icon={<CheckCircle2 className="size-4" aria-hidden="true" />}
            label="Terminadas"
            value={`${metrics.finished}`}
            helper={`${metrics.completionRate}% de registros con datos`}
          />
          <MetricCard
            icon={<CalendarDays className="size-4" aria-hidden="true" />}
            label="En proceso / suspendidas"
            value={`${metrics.inProgress} / ${metrics.suspended}`}
            helper="Seguimiento operativo"
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="rounded-lg border border-emerald-900/10 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border p-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_190px_170px] lg:min-w-[680px]">
                <label className="relative block">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="pl-8"
                    placeholder="Buscar mentor, mentoreado o servicio"
                    aria-label="Buscar mentor, mentoreado o servicio"
                  />
                </label>

                <NativeSelect
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filtrar por estado"
                  className="w-full"
                >
                  <NativeSelectOption value="Todos">Todos los estados</NativeSelectOption>
                  {STATUSES.filter(Boolean).map((status) => (
                    <NativeSelectOption key={status} value={status}>
                      {status}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>

                <NativeSelect
                  value={monthFilter}
                  onChange={(event) => setMonthFilter(event.target.value)}
                  aria-label="Filtrar por mes"
                  className="w-full"
                >
                  <NativeSelectOption value="Todos">Todos los meses</NativeSelectOption>
                  {MONTHS.map((month) => (
                    <NativeSelectOption key={month} value={month}>
                      {month}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              <p className="text-sm font-medium text-muted-foreground">
                {filteredRows.length} de {rows.length} filas
              </p>
            </div>

            <div className="max-h-[68vh] overflow-auto">
              <Table className="min-w-[1540px]">
                <TableHeader className="sticky top-0 z-10 bg-white">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12">N°</TableHead>
                    <TableHead className="w-48">Mentor</TableHead>
                    <TableHead className="w-48">Mentoreado</TableHead>
                    <TableHead className="w-36">Mes</TableHead>
                    <TableHead className="w-28">Horas</TableHead>
                    <TableHead className="w-44">Espacio</TableHead>
                    <TableHead className="w-48 text-center">Sesiones</TableHead>
                    <TableHead className="w-44">Estado</TableHead>
                    <TableHead className="w-64">Servicio</TableHead>
                    <TableHead className="w-36">Formalización</TableHead>
                    <TableHead className="w-36">Planificación SIR</TableHead>
                    <TableHead className="w-36">Ejecución SIR</TableHead>
                    <TableHead className="w-40">Pagada en</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium text-muted-foreground">
                        {row.id}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.mentor}
                          onChange={(event) =>
                            updateRow(row.id, { mentor: event.target.value })
                          }
                          aria-label={`Mentor fila ${row.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.mentee}
                          onChange={(event) =>
                            updateRow(row.id, { mentee: event.target.value })
                          }
                          aria-label={`Mentoreado fila ${row.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <NativeSelect
                          value={row.month}
                          onChange={(event) =>
                            updateRow(row.id, { month: event.target.value })
                          }
                          aria-label={`Mes de mentoría fila ${row.id}`}
                          className="w-full"
                        >
                          <NativeSelectOption value="">Sin mes</NativeSelectOption>
                          {MONTHS.map((month) => (
                            <NativeSelectOption key={month} value={month}>
                              {month}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={row.hours}
                          onChange={(event) =>
                            updateRow(row.id, { hours: event.target.value })
                          }
                          aria-label={`Horas de mentoría fila ${row.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.space}
                          onChange={(event) =>
                            updateRow(row.id, { space: event.target.value })
                          }
                          aria-label={`Espacio utilizado fila ${row.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          {row.sessions.map((session, sessionIndex) => (
                            <label
                              key={sessionIndex}
                              className="grid size-6 place-items-center rounded-md border border-input bg-white text-xs font-semibold text-muted-foreground transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
                              title={`Sesión ${sessionIndex + 1}`}
                            >
                              <input
                                type="checkbox"
                                checked={session}
                                onChange={(event) =>
                                  updateSession(
                                    row.id,
                                    sessionIndex,
                                    event.target.checked,
                                  )
                                }
                                className="sr-only"
                                aria-label={`Sesión ${sessionIndex + 1} fila ${row.id}`}
                              />
                              {sessionIndex + 1}
                            </label>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <NativeSelect
                          value={row.status}
                          onChange={(event) =>
                            updateRow(row.id, { status: event.target.value })
                          }
                          aria-label={`Estado fila ${row.id}`}
                          className="w-full"
                        >
                          <NativeSelectOption value="">Sin estado</NativeSelectOption>
                          {STATUSES.filter(Boolean).map((status) => (
                            <NativeSelectOption key={status} value={status}>
                              {status}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      </TableCell>
                      <TableCell>
                        <NativeSelect
                          value={row.service}
                          onChange={(event) =>
                            updateRow(row.id, { service: event.target.value })
                          }
                          aria-label={`Servicio entregado fila ${row.id}`}
                          className="w-full"
                        >
                          <NativeSelectOption value="">Sin servicio</NativeSelectOption>
                          {SERVICES.filter(Boolean).map((service) => (
                            <NativeSelectOption key={service} value={service}>
                              {service}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      </TableCell>
                      <TableCell>
                        <CheckSelect
                          value={row.formalization}
                          label={`Formalización fila ${row.id}`}
                          onChange={(value) =>
                            updateRow(row.id, { formalization: value })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <CheckSelect
                          value={row.planningSir}
                          label={`Planificación SIR fila ${row.id}`}
                          onChange={(value) =>
                            updateRow(row.id, { planningSir: value })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <CheckSelect
                          value={row.executionSir}
                          label={`Ejecución SIR fila ${row.id}`}
                          onChange={(value) =>
                            updateRow(row.id, { executionSir: value })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={row.paidAt}
                          onChange={(event) =>
                            updateRow(row.id, { paidAt: event.target.value })
                          }
                          aria-label={`Fecha de pago fila ${row.id}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <aside className="grid content-start gap-4">
            <section className="rounded-lg border border-emerald-900/10 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">Estados</h2>
                <Badge variant="outline">{metrics.rowsWithData} activos</Badge>
              </div>
              <div className="grid gap-3">
                {statusSummary.map(({ status, count }) => (
                  <SummaryBar
                    key={status}
                    label={status}
                    count={count}
                    total={Math.max(metrics.rowsWithData, 1)}
                    className={statusStyles[status]}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-emerald-900/10 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-base font-semibold">Servicios</h2>
              <div className="grid gap-3">
                {serviceSummary.map(({ service, count }) => (
                  <SummaryBar
                    key={service}
                    label={service}
                    count={count}
                    total={Math.max(metrics.rowsWithData, 1)}
                    className="border-teal-200 bg-teal-50 text-teal-700"
                  />
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-emerald-900/10 bg-[#0f322e] p-4 text-white shadow-sm">
              <h2 className="text-base font-semibold">Progreso general</h2>
              <div className="mt-4 flex items-end gap-3">
                <span className="text-4xl font-semibold">
                  {metrics.completionRate}%
                </span>
                <span className="pb-1 text-sm text-emerald-100">
                  terminadas
                </span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-[#f2c14e]"
                  style={{ width: `${metrics.completionRate}%` }}
                />
              </div>
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <article className="rounded-lg border border-emerald-900/10 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span className="grid size-7 place-items-center rounded-md bg-accent text-accent-foreground">
          {icon}
        </span>
        {label}
      </div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
    </article>
  );
}

function SummaryBar({
  label,
  count,
  total,
  className,
}: {
  label: string;
  count: number;
  total: number;
  className: string;
}) {
  const percentage = Math.min(100, Math.round((count / total) * 100));

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <Badge variant="outline" className={cn('max-w-[220px]', className)}>
          <span className="truncate">{label}</span>
        </Badge>
        <span className="font-semibold tabular-nums">{count}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function CheckSelect({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <NativeSelect
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      className="w-full"
    >
      {CHECK_OPTIONS.map((option) => (
        <NativeSelectOption key={option || 'empty'} value={option}>
          {option || 'Pendiente'}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
