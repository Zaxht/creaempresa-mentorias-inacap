'use client';
import Image from 'next/image';
import { CreateRecordDialog } from '@/components/create-record-dialog';
import { PersonFields } from '@/components/person-fields';
import { ProgramGraphic } from '@/components/program-graphic';
import { MentorshipWorkspace } from '@/components/mentorship-workspace';
import { PeopleWorkspace, PersonProfile } from '@/components/people-workspace';

import { useEffect, useState, type ReactNode } from 'react';
import {
  CalendarDays,
  ClipboardCheck,
  Clock3,
  Download,
  FileSpreadsheet,
  FolderOpen,
  LayoutDashboard,
  Paperclip,
  User,
  UserCheck,
  Users,
  Mail,
  Phone,
  BriefcaseBusiness,
  Target,
  MapPin,
  BadgeCheck,
  LogOut,
  RefreshCw,
  Save,
  Sparkles,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ProgramSelect as NativeSelect,
  ProgramOption as NativeSelectOption,
} from '@/components/program-select';
import { cn } from '@/lib/utils';
import { MentoriasAccess } from '@/components/mentorias-access';
import {
  MentoriasRepository,
  type Workspace,
} from '@/lib/mentorias/repository';
import { scopeState, validateFile } from '@/lib/mentorias/access';
import {
  collectChanges,
  mentorshipSaveState,
  acknowledgedMentorship,
  personSaveState,
  acknowledgedPerson,
} from '@/lib/mentorias/changes';
import { getMetrics } from '@/lib/mentorias/metrics';
import {
  imageToBase64,
  downloadBlob,
  addSummarySheet,
  addMentorsSheet,
  addMenteesSheet,
  addMentorshipsSheet,
  addSessionsSheet,
} from '@/lib/mentorias/reports';
import {
  MONTHS,
  MENTORSHIP_STATUSES,
  SERVICES,
  type Role,
  type View,
  type MentorshipStatus,
  type Attachment,
  type SessionRecord,
  type Mentor,
  type Mentee,
  type Mentorship,
  type AppState,
  type ExportOptions,
} from '@/lib/mentorias/domain';

const STORAGE_KEY = 'creaempresa-mentorias-app-v2';
const LOGO_PATH = '/logoinacap.png';

const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  summary: true,
  mentors: true,
  mentees: true,
  mentorships: true,
  sessions: true,
  attachments: true,
};

const DEFAULT_MENTORS: Mentor[] = [
  {
    id: 'mentor-victor-valenzuela',
    name: 'Víctor Valenzuela Ruz',
    title: 'Mentor financiero',
    email: '',
    phone: '',
    expertise: ['Finanzas', 'Administración', 'Formalización'],
    bio: 'Acompañamiento enfocado en orden financiero, gestión administrativa y continuidad del emprendimiento.',
  },
  {
    id: 'mentor-maritza-madariaga',
    name: 'Maritza Madariaga',
    title: 'Mentora comercial',
    email: '',
    phone: '',
    expertise: ['Gestión comercial', 'Ventas', 'Plan de acción'],
    bio: 'Acompañamiento para fortalecer propuesta de valor, relación con clientes y seguimiento comercial.',
  },
];

const DEFAULT_MENTEES: Mentee[] = [
  {
    id: 'mentee-catherine-vega',
    name: 'Catherine Vega',
    venture: '',
    stage: 'Por registrar',
    email: '',
    phone: '',
    need: 'Continuidad de mentoría por revisar.',
  },
  {
    id: 'mentee-claudia-rojas',
    name: 'Claudia Rojas',
    venture: '',
    stage: 'Por registrar',
    email: '',
    phone: '',
    need: 'Continuidad de mentoría por revisar.',
  },
];

const DEFAULT_STATE: AppState = {
  mentors: DEFAULT_MENTORS,
  mentees: DEFAULT_MENTEES,
  mentorships: [
    {
      id: 'mentoria-016',
      sourceNumber: 16,
      mentorId: 'mentor-victor-valenzuela',
      menteeId: 'mentee-catherine-vega',
      month: '',
      hours: 0,
      space: '',
      status: 'Suspendida',
      service: '',
      formalization: 'Pendiente',
      planningSir: 'Pendiente',
      executionSir: 'Pendiente',
      paidAt: '',
      goal: 'Revisar continuidad, alcance de apoyo y próximos acuerdos.',
      sessions: createSessions(),
    },
    {
      id: 'mentoria-017',
      sourceNumber: 17,
      mentorId: 'mentor-maritza-madariaga',
      menteeId: 'mentee-claudia-rojas',
      month: '',
      hours: 0,
      space: '',
      status: 'Suspendida',
      service: '',
      formalization: 'Pendiente',
      planningSir: 'Pendiente',
      executionSir: 'Pendiente',
      paidAt: '',
      goal: 'Revisar continuidad, alcance de apoyo y próximos acuerdos.',
      sessions: createSessions(),
    },
  ],
};

const statusTones: Record<MentorshipStatus, string> = {
  Suspendida: 'border-rose-200 bg-rose-50 text-rose-700',
  'En proceso': 'border-sky-200 bg-sky-50 text-sky-700',
  Terminada: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'No corresponde': 'border-zinc-200 bg-zinc-50 text-zinc-600',
  'Esperando derivación': 'border-amber-200 bg-amber-50 text-amber-700',
  Derivada: 'border-violet-200 bg-violet-50 text-violet-700',
};

function createSessions(): SessionRecord[] {
  return Array.from({ length: 6 }, (_, index) => ({
    number: index + 1,
    date: '',
    status: 'Pendiente',
    summary: '',
  }));
}

function getNavigation(role: Role) {
  if (role === 'Administrador') {
    return [
      { id: 'dashboard', label: 'Resumen', icon: <LayoutDashboard /> },
      { id: 'mentors', label: 'Mentores', icon: <UserCheck /> },
      { id: 'mentees', label: 'Mentoreados', icon: <Users /> },
      { id: 'mentorships', label: 'Mentorías', icon: <ClipboardCheck /> },
      { id: 'export', label: 'Excel', icon: <FileSpreadsheet /> },
    ] as const;
  }

  if (role === 'Mentor') {
    return [
      { id: 'profile', label: 'Mi perfil', icon: <User /> },
      { id: 'mentorships', label: 'Mis mentorías', icon: <ClipboardCheck /> },
      { id: 'export', label: 'Excel', icon: <FileSpreadsheet /> },
    ] as const;
  }

  return [
    { id: 'profile', label: 'Mi perfil', icon: <User /> },
    { id: 'mentorships', label: 'Mis sesiones', icon: <CalendarDays /> },
  ] as const;
}

function defaultViewForRole(role: Role): View {
  return role === 'Administrador' ? 'dashboard' : 'profile';
}

function normalizeState(state: Partial<AppState>): AppState {
  const mentors = (state.mentors?.length ? state.mentors : DEFAULT_MENTORS).map(
    (mentor) => ({
      ...mentor,
      expertise: Array.isArray(mentor.expertise) ? mentor.expertise : [],
    }),
  );
  const mentees = state.mentees?.length ? state.mentees : DEFAULT_MENTEES;
  const mentorships = (
    state.mentorships?.length ? state.mentorships : DEFAULT_STATE.mentorships
  ).map((mentorship, index) => ({
    ...mentorship,
    sourceNumber: mentorship.sourceNumber || index + 1,
    hours: Number(mentorship.hours || 0),
    formalization: mentorship.formalization || 'Pendiente',
    planningSir: mentorship.planningSir || 'Pendiente',
    executionSir: mentorship.executionSir || 'Pendiente',
    sessions: Array.from({ length: 6 }, (_, sessionIndex) => ({
      ...createSessions()[sessionIndex],
      ...mentorship.sessions?.[sessionIndex],
      number: sessionIndex + 1,
    })),
  }));

  return { mentors, mentees, mentorships };
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return 'CE';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatHours(value: number) {
  return value.toLocaleString('es-CL', { maximumFractionDigits: 1 });
}

function readFile(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: typeof reader.result === 'string' ? reader.result : '',
      });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function sanitizeFilename(name: string) {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*]/g, '-')
    .split('')
    .filter((char) => char.charCodeAt(0) >= 32)
    .join('')
    .replace(/\.xlsx$/i, '')
    .replace(/\s+/g, '-')
    .toLowerCase();

  return cleaned || 'monitoreo-mentorias-2026';
}

export default function Home() {
  return (
    <MentoriasAccess>
      {(repository, workspace, exit) => (
        <WorkspaceView
          repository={repository}
          workspace={workspace}
          exit={exit}
        />
      )}
    </MentoriasAccess>
  );
}

function WorkspaceView({
  repository,
  workspace,
  exit,
}: {
  repository: MentoriasRepository | null;
  workspace: Workspace | null;
  exit: () => void;
}) {
  const [original, setOriginal] = useState<AppState>(
    workspace?.state ?? DEFAULT_STATE,
  );
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [state, setState] = useState<AppState>(
    workspace?.state ?? DEFAULT_STATE,
  );
  const [hasLoaded, setHasLoaded] = useState(false);
  const [role] = useState<Role>(workspace?.role ?? 'Administrador');
  const [activeView, setActiveView] = useState<View>(
    defaultViewForRole(workspace?.role ?? 'Administrador'),
  );
  const [activeMentorId, setActiveMentorId] = useState(
    workspace?.mentorId ?? DEFAULT_MENTORS[0].id,
  );
  const [activeMenteeId, setActiveMenteeId] = useState(
    workspace?.menteeId ?? DEFAULT_MENTEES[0].id,
  );
  const [mentorshipToOpen, setMentorshipToOpen] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [saveWarning, setSaveWarning] = useState('');
  const [exportOptions, setExportOptions] = useState<ExportOptions>(
    DEFAULT_EXPORT_OPTIONS,
  );
  const [fileName, setFileName] = useState('monitoreo-mentorias-2026');
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [newMentor, setNewMentor] = useState({
    name: '',
    expertise: '',
    email: '',
    password: '',
    phone: '',
  });
  const [newMentee, setNewMentee] = useState({
    name: '',
    venture: '',
    email: '',
    password: '',
    phone: '',
  });
  const [newMentorship, setNewMentorship] = useState({
    mentorId: '',
    menteeId: '',
    month: MONTHS[new Date().getMonth()],
    service: '',
  });

  useEffect(() => {
    if (repository) return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        // eslint-disable-next-line react/react-compiler -- Hydrate browser-only demonstration after SSR.
        setState(normalizeState(JSON.parse(stored) as Partial<AppState>));
      }
    } catch {
      setSaveWarning('No se pudieron recuperar los datos de la demostración.');
    }
    setHasLoaded(true);
  }, [repository]);

  useEffect(() => {
    if (!hasLoaded || repository) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // eslint-disable-next-line react/react-compiler -- Report a failure from the external storage write.
      setSaveWarning(
        'El navegador no pudo guardar los datos. Reduce los archivos adjuntos.',
      );
    }
  }, [hasLoaded, state, repository]);

  const hasChanges =
    repository !== null && collectChanges(original, state).length > 0;
  useEffect(() => {
    if (!hasChanges) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasChanges]);
  const saveChanges = async () => {
    if (!repository) return;
    setSaving(true);
    setSaveMessage('');
    try {
      await repository.save(original, state);
      const fresh = await repository.load();
      setState(fresh.state);
      setOriginal(fresh.state);
      setSaveMessage('Cambios guardados en el programa.');
    } catch (error) {
      setSaveMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar. Tus cambios siguen en pantalla.',
      );
    } finally {
      setSaving(false);
    }
  };
  const reload = async () => {
    if (
      !repository ||
      (hasChanges &&
        !window.confirm('Se descartarán los cambios sin guardar. ¿Continuar?'))
    )
      return;
    setSaving(true);
    try {
      const fresh = await repository.load();
      setState(fresh.state);
      setOriginal(fresh.state);
      setSaveMessage('Datos actualizados.');
    } catch {
      setSaveMessage('No se pudieron actualizar los datos.');
    } finally {
      setSaving(false);
    }
  };

  const { mentors, mentees, mentorships } = state;
  const activeMentor =
    mentors.find((mentor) => mentor.id === activeMentorId) ?? mentors[0];
  const activeMentee =
    mentees.find((mentee) => mentee.id === activeMenteeId) ?? mentees[0];

  const scopedState = scopeState(
    state,
    role,
    activeMentor?.id,
    activeMentee?.id,
  );
  const metrics = getMetrics(scopedState);
  const navigation = getNavigation(role);

  const savePerson = async (record: Mentor | Mentee) => {
    if (saving) throw new Error('Espera a que termine el guardado.');
    const mentor = 'expertise' in record;
    if (
      role !== 'Administrador' &&
      !(mentor
        ? role === 'Mentor' && record.id === activeMentor?.id
        : role === 'Mentoreado' && record.id === activeMentee?.id)
    )
      throw new Error('No tienes permiso para editar este perfil.');
    setSaving(true);
    try {
      let saved = record;
      if (repository) {
        const next = personSaveState(original, record);
        const commands = collectChanges(original, next);
        await repository.save(original, next);
        saved = acknowledgedPerson(record, commands);
        try {
          const fresh = await repository.load();
          saved =
            fresh.state[mentor ? 'mentors' : 'mentees'].find(
              (item) => item.id === record.id,
            ) ?? saved;
        } catch {
          setSaveWarning(
            'El perfil se guardó. Actualiza cuando vuelva la conexión para renovar su foto.',
          );
        }
      }
      setOriginal((value) => personSaveState(value, saved));
      setState((value) => personSaveState(value, saved));
    } finally {
      setSaving(false);
    }
  };
  const openMentorship = (id: string) => {
    setMentorshipToOpen(id);
    setSearch('');
    setStatusFilter('Todos');
    setActiveView('mentorships');
  };

  const saveMentorship = async (record: Mentorship) => {
    if (saving) throw new Error('Espera a que termine el guardado.');
    const current = state.mentorships.find((item) => item.id === record.id);
    if (
      !current ||
      role === 'Mentoreado' ||
      (role === 'Mentor' && current.mentorId !== activeMentor?.id)
    )
      throw new Error('No tienes permiso para editar esta mentoría.');
    setSaving(true);
    try {
      let saved = record;
      if (repository) {
        const next = mentorshipSaveState(original, record);
        const commands = collectChanges(original, next);
        await repository.save(original, next);
        saved = acknowledgedMentorship(record, commands);
        try {
          const fresh = await repository.load();
          saved =
            fresh.state.mentorships.find((item) => item.id === record.id) ??
            saved;
        } catch {
          setSaveWarning(
            'Los cambios se guardaron. Actualiza cuando vuelva la conexión para renovar los archivos.',
          );
        }
      }
      setOriginal((value) => ({
        ...value,
        mentorships: value.mentorships.map((item) =>
          item.id === saved.id ? saved : item,
        ),
      }));
      setState((value) => ({
        ...value,
        mentorships: value.mentorships.map((item) =>
          item.id === saved.id ? saved : item,
        ),
      }));
    } finally {
      setSaving(false);
    }
  };
  const uploadSessionFile = async (
    file: File,
    kind: 'photo' | 'document',
    prefix: string,
  ) => {
    await validateFile(file, kind);
    return repository ? repository.upload(file, kind, prefix) : readFile(file);
  };

  const createRecord = async <K extends keyof AppState>(
    key: K,
    record: AppState[K][number],
    password?: string,
  ) => {
    if (saving) throw new Error('Espera a que termine el guardado.');
    setSaving(true);
    try {
      let saved = record;
      if (repository) {
        let savedId = record.id;
        if (key === 'mentors' || key === 'mentees') {
          savedId = await repository.createPerson(
            key,
            record as Mentor | Mentee,
            password ?? '',
          );
          saved = { ...record, id: savedId };
        } else {
          await repository.save(original, {
            ...original,
            [key]: [...original[key], record],
          });
        }
        try {
          const fresh = await repository.load();
          saved =
            fresh.state[key].find((item) => item.id === savedId) ?? record;
        } catch {
          setSaveWarning(
            'El registro se guardó. Pulsa Actualizar para recuperar sus datos completos.',
          );
        }
        setOriginal((current) => ({
          ...current,
          [key]: [...current[key], saved],
        }));
      }
      setState((current) => ({ ...current, [key]: [...current[key], saved] }));
      setSaveMessage(
        repository
          ? key === 'mentors' || key === 'mentees'
            ? 'Cuenta y ficha creadas. Comparte el correo y la contraseña inicial con la persona.'
            : 'Registro creado y guardado.'
          : 'Registro creado en la demostración.',
      );
    } finally {
      setSaving(false);
    }
  };

  const addMentor = async () => {
    if (role !== 'Administrador')
      throw new Error('No tienes permiso para crear registros.');
    const name = newMentor.name.trim();

    if (!name) throw new Error('Escribe el nombre de la persona.');

    const mentor: Mentor = {
      id: crypto.randomUUID(),
      name,
      title: '',
      email: newMentor.email.trim().toLowerCase(),
      phone: newMentor.phone.trim(),
      expertise: newMentor.expertise
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      bio: '',
    };

    await createRecord('mentors', mentor, newMentor.password);
    setActiveMentorId(mentor.id);
    setNewMentor({
      name: '',
      expertise: '',
      email: '',
      phone: '',
      password: '',
    });
  };

  const addMentee = async () => {
    if (role !== 'Administrador')
      throw new Error('No tienes permiso para crear registros.');
    const name = newMentee.name.trim();

    if (!name) throw new Error('Escribe el nombre de la persona.');

    const mentee: Mentee = {
      id: crypto.randomUUID(),
      name,
      venture: newMentee.venture.trim(),
      stage: '',
      email: newMentee.email.trim().toLowerCase(),
      phone: newMentee.phone.trim(),
      need: '',
    };

    await createRecord('mentees', mentee, newMentee.password);
    setActiveMenteeId(mentee.id);
    setNewMentee({ name: '', venture: '', email: '', phone: '', password: '' });
  };

  const addMentorship = async () => {
    if (role !== 'Administrador')
      throw new Error('No tienes permiso para crear registros.');
    if (
      !mentors.some((m) => m.id === newMentorship.mentorId) ||
      !mentees.some((m) => m.id === newMentorship.menteeId)
    ) {
      throw new Error('Selecciona un mentor y un mentoreado.');
    }
    if (!SERVICES.includes(newMentorship.service as (typeof SERVICES)[number]))
      throw new Error('Selecciona el servicio de la mentoría.');

    const mentorship: Mentorship = {
      id: crypto.randomUUID(),
      sourceNumber:
        Math.max(0, ...mentorships.map((item) => item.sourceNumber)) + 1,
      mentorId: newMentorship.mentorId,
      menteeId: newMentorship.menteeId,
      month: newMentorship.month,
      hours: 0,
      space: '',
      status: 'En proceso',
      service: newMentorship.service,
      formalization: 'Pendiente',
      planningSir: 'Pendiente',
      executionSir: 'Pendiente',
      paidAt: '',
      goal: '',
      sessions: repository ? [] : createSessions(),
    };

    await createRecord('mentorships', mentorship);
    setNewMentorship({
      mentorId: '',
      menteeId: '',
      month: MONTHS[new Date().getMonth()],
      service: '',
    });
    setSearch('');
    setStatusFilter('Todos');
    setActiveView('mentorships');
  };

  const exportExcel = async () => {
    if (role === 'Mentoreado') return;
    if (
      !['summary', 'mentors', 'mentees', 'mentorships', 'sessions'].some(
        (key) => exportOptions[key as keyof ExportOptions],
      )
    ) {
      setExportMessage('Selecciona al menos una sección para exportar.');
      return;
    }
    if (hasChanges) {
      setExportMessage('Guarda los cambios antes de exportar.');
      return;
    }
    setIsExporting(true);
    setExportMessage('');

    try {
      const exportState = repository
        ? (await repository.load()).state
        : scopedState;
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Crea Empresa';
      workbook.created = new Date();
      workbook.modified = new Date();
      workbook.calcProperties.fullCalcOnLoad = true;

      const logoBase64 = await imageToBase64(LOGO_PATH);
      const logoId = logoBase64
        ? workbook.addImage({ base64: logoBase64, extension: 'png' })
        : undefined;

      if (exportOptions.summary) {
        addSummarySheet(workbook, logoId, exportState);
      }

      if (exportOptions.mentors) {
        addMentorsSheet(workbook, logoId, exportState);
      }

      if (exportOptions.mentees) {
        addMenteesSheet(workbook, logoId, exportState);
      }

      if (exportOptions.mentorships) {
        addMentorshipsSheet(workbook, logoId, exportState);
      }

      if (exportOptions.sessions) {
        addSessionsSheet(
          workbook,
          logoId,
          exportState,
          exportOptions.attachments,
        );
      }

      if (workbook.worksheets.length === 0) {
        addSummarySheet(workbook, logoId, exportState);
      }

      const buffer = await workbook.xlsx.writeBuffer();
      downloadBlob(
        new Blob([buffer as BlobPart], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        `${sanitizeFilename(fileName)}.xlsx`,
      );
      setExportMessage('Excel descargado.');
    } catch {
      setExportMessage('No se pudo generar el Excel en este navegador.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="workspace min-h-screen text-foreground">
      <div className="workspace-topbar">
        <div className="workspace-brand">
          <Image
            unoptimized
            width={44}
            height={44}
            src={LOGO_PATH}
            alt="INACAP"
          />
          <div>
            <strong>
              Crea Empresa<span>.</span>
            </strong>
            <span>PROGRAMA DE MENTORÍAS</span>
          </div>
        </div>
        <div className="workspace-account">
          <span>{role}</span>
          <span className="save-status" aria-live="polite">
            <i data-pending={hasChanges || saving} />
            {saving
              ? 'Guardando…'
              : hasChanges
                ? 'Cambios sin guardar'
                : 'Todo guardado'}
          </span>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          {repository && (
            <>
              {hasChanges && (
                <Button onClick={() => void saveChanges()} disabled={saving}>
                  <Save size={15} /> Guardar cambios
                </Button>
              )}
              <Button
                variant="outline"
                aria-label="Actualizar"
                onClick={() => void reload()}
                disabled={saving}
              >
                <RefreshCw size={15} />{' '}
                <span className="hidden sm:inline">Actualizar</span>
              </Button>
            </>
          )}
          <Button
            variant="outline"
            aria-label="Salir"
            disabled={saving}
            onClick={() => {
              if (
                !hasChanges ||
                window.confirm('Hay cambios sin guardar. ¿Salir?')
              )
                exit();
            }}
          >
            <LogOut size={15} /> <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>
      </div>
      {saveMessage && (
        <output className="block border-b border-zinc-200 bg-zinc-100 px-5 py-3 text-sm">
          {saveMessage}
        </output>
      )}
      <fieldset disabled={saving} className="min-w-0 border-0 p-0">
        <div className="workspace-layout">
          <aside className="workspace-sidebar">
            <p className="nav-caption">Tu programa</p>
            <nav
              className="flex gap-1 overflow-x-auto lg:grid"
              aria-label="Secciones"
            >
              {navigation.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setMentorshipToOpen(null);
                    setActiveView(item.id);
                    window.scrollTo({ top: 0, behavior: 'instant' });
                  }}
                  aria-current={activeView === item.id ? 'page' : undefined}
                  className={cn(
                    'flex h-12 shrink-0 items-center gap-3 rounded-xl px-4 text-left text-sm font-medium transition-colors',
                    activeView === item.id
                      ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-100'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <span className="[&_svg]:size-4">{item.icon}</span>
                  {item.label}
                  <span className="nav-index">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </button>
              ))}
            </nav>

            <div className="sidebar-progress">
              <p className="text-xs font-semibold uppercase text-zinc-300">
                Estado general
              </p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-3xl font-semibold">
                  {metrics.completionRate}%
                </span>
                <span className="pb-1 text-sm text-zinc-300">cierre</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-red-400"
                  style={{ width: `${metrics.completionRate}%` }}
                />
              </div>
            </div>

            {saveWarning ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                {saveWarning}
              </p>
            ) : null}
          </aside>

          <section className="workspace-content min-w-0">
            {activeView === 'dashboard' ? (
              <DashboardView
                metrics={metrics}
                state={state}
                newMentorship={newMentorship}
                setNewMentorship={setNewMentorship}
                addMentorship={addMentorship}
              />
            ) : null}

            {activeView === 'mentors' || activeView === 'mentees' ? (
              <PeopleWorkspace
                key={activeView}
                kind={activeView}
                mentors={mentors}
                mentees={mentees}
                mentorships={mentorships}
                onSave={savePerson}
                onUpload={uploadSessionFile}
                onOpenMentorship={openMentorship}
                heading={
                  <PageHeading
                    eyebrow={
                      activeView === 'mentors' ? 'Equipo' : 'Participantes'
                    }
                    title={
                      activeView === 'mentors' ? 'Mentores' : 'Mentoreados'
                    }
                    body={
                      activeView === 'mentors'
                        ? 'Las personas que acompañan cada proyecto. Conoce su experiencia y recorrido.'
                        : 'Personas e ideas en crecimiento. Conoce sus proyectos y acompañamientos.'
                    }
                  />
                }
                createAction={
                  activeView === 'mentors' ? (
                    <CreateRecordDialog
                      title="Nuevo mentor"
                      description="Una ficha y una cuenta de acceso, en un solo paso."
                      onCreate={addMentor}
                      onCancel={() =>
                        setNewMentor({
                          name: '',
                          expertise: '',
                          email: '',
                          password: '',
                          phone: '',
                        })
                      }
                    >
                      <PersonFields
                        kind="mentor"
                        value={newMentor}
                        onChange={(patch) =>
                          setNewMentor({ ...newMentor, ...patch })
                        }
                      />
                    </CreateRecordDialog>
                  ) : (
                    <CreateRecordDialog
                      title="Nuevo mentoreado"
                      description="Una ficha y una cuenta de acceso, en un solo paso."
                      onCreate={addMentee}
                      onCancel={() =>
                        setNewMentee({
                          name: '',
                          venture: '',
                          email: '',
                          password: '',
                          phone: '',
                        })
                      }
                    >
                      <PersonFields
                        kind="mentee"
                        value={newMentee}
                        onChange={(patch) =>
                          setNewMentee({ ...newMentee, ...patch })
                        }
                      />
                    </CreateRecordDialog>
                  )
                }
              />
            ) : null}

            {activeView === 'profile' &&
            (role === 'Mentor' ? activeMentor : activeMentee) ? (
              <PersonProfile
                person={role === 'Mentor' ? activeMentor : activeMentee}
                mentors={mentors}
                mentees={mentees}
                mentorships={mentorships}
                onSave={savePerson}
                onUpload={uploadSessionFile}
                onOpenMentorship={openMentorship}
              />
            ) : null}

            {activeView === 'mentorships' ? (
              <MentorshipWorkspace
                initialId={mentorshipToOpen}
                createAction={
                  role === 'Administrador' ? (
                    <NewMentorshipForm
                      state={state}
                      newMentorship={newMentorship}
                      setNewMentorship={setNewMentorship}
                      addMentorship={addMentorship}
                    />
                  ) : null
                }
                role={role}
                search={search}
                setSearch={setSearch}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                mentorships={scopedState.mentorships}
                mentors={mentors}
                mentees={mentees}
                heading={
                  <PageHeading
                    eyebrow="Seguimiento"
                    title={role === 'Mentoreado' ? 'Mis sesiones' : 'Mentorías'}
                    body="Un acompañamiento a la vez. Elige una mentoría para ver sus avances y sesiones."
                  />
                }
                onSave={saveMentorship}
                onUpload={uploadSessionFile}
              />
            ) : null}

            {activeView === 'export' ? (
              <ExportView
                metrics={metrics}
                exportOptions={exportOptions}
                setExportOptions={setExportOptions}
                fileName={fileName}
                setFileName={setFileName}
                isExporting={isExporting}
                exportMessage={exportMessage}
                exportExcel={exportExcel}
              />
            ) : null}
          </section>
        </div>
      </fieldset>
    </main>
  );
}

type MentorshipDraft = {
  mentorId: string;
  menteeId: string;
  month: string;
  service: string;
};
function NewMentorshipForm({
  state,
  newMentorship,
  setNewMentorship,
  addMentorship,
}: {
  state: AppState;
  newMentorship: MentorshipDraft;
  setNewMentorship: (value: MentorshipDraft) => void;
  addMentorship: () => Promise<void>;
}) {
  return (
    <div className="grid gap-2">
      <CreateRecordDialog
        title="Nueva mentoría"
        description="Selecciona las personas y el servicio. Se crearán seis sesiones pendientes."
        onCreate={addMentorship}
        onCancel={() =>
          setNewMentorship({
            mentorId: '',
            menteeId: '',
            month: MONTHS[new Date().getMonth()],
            service: '',
          })
        }
        disabled={!state.mentors.length || !state.mentees.length}
      >
        <FieldLabel label="Mentor">
          <NativeSelect
            required
            value={newMentorship.mentorId}
            onChange={(event) =>
              setNewMentorship({
                ...newMentorship,
                mentorId: event.target.value,
              })
            }
            className="w-full"
            aria-label="Seleccionar mentor"
          >
            <NativeSelectOption value="" disabled>
              Selecciona un mentor
            </NativeSelectOption>
            {state.mentors.map((mentor) => (
              <NativeSelectOption key={mentor.id} value={mentor.id}>
                {mentor.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FieldLabel>
        <FieldLabel label="Mentoreado">
          <NativeSelect
            required
            value={newMentorship.menteeId}
            onChange={(event) =>
              setNewMentorship({
                ...newMentorship,
                menteeId: event.target.value,
              })
            }
            className="w-full"
            aria-label="Seleccionar mentoreado"
          >
            <NativeSelectOption value="" disabled>
              Selecciona un mentoreado
            </NativeSelectOption>
            {state.mentees.map((mentee) => (
              <NativeSelectOption key={mentee.id} value={mentee.id}>
                {mentee.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FieldLabel>
        <div className="grid gap-4">
          <FieldLabel label="Mes de inicio">
            <NativeSelect
              value={newMentorship.month}
              onChange={(event) =>
                setNewMentorship({
                  ...newMentorship,
                  month: event.target.value,
                })
              }
              className="w-full"
              aria-label="Mes"
            >
              {MONTHS.map((month) => (
                <NativeSelectOption key={month} value={month}>
                  {month}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FieldLabel>
          <FieldLabel label="Servicio">
            <NativeSelect
              required
              value={newMentorship.service}
              onChange={(event) =>
                setNewMentorship({
                  ...newMentorship,
                  service: event.target.value,
                })
              }
              className="w-full"
              aria-label="Servicio"
            >
              <NativeSelectOption value="" disabled>
                Selecciona un servicio
              </NativeSelectOption>
              {SERVICES.map((service) => (
                <NativeSelectOption key={service} value={service}>
                  {service}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FieldLabel>
        </div>
      </CreateRecordDialog>
      {(!state.mentors.length || !state.mentees.length) && (
        <p className="max-w-sm text-sm text-muted-foreground">
          Primero registra al menos un mentor y un mentoreado desde sus
          secciones.
        </p>
      )}
    </div>
  );
}

function DashboardView({
  metrics,
  state,
  newMentorship,
  setNewMentorship,
  addMentorship,
}: {
  metrics: ReturnType<typeof getMetrics>;
  state: AppState;
  newMentorship: {
    mentorId: string;
    menteeId: string;
    month: string;
    service: string;
  };
  setNewMentorship: (value: {
    mentorId: string;
    menteeId: string;
    month: string;
    service: string;
  }) => void;
  addMentorship: () => Promise<void>;
}) {
  const attentionItems = state.mentorships.filter((mentorship) =>
    ['Suspendida', 'Esperando derivación', 'Derivada'].includes(
      mentorship.status,
    ),
  );

  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow="Tu programa, de un vistazo"
        title="Resumen del programa"
        body="Revisa los avances y continúa acompañando a cada emprendimiento."
      />
      <section className="metric-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<ClipboardCheck />}
          label="Mentorías"
          value={String(metrics.mentorships)}
          helper={`${metrics.activeMentorships} activas`}
        />
        <MetricCard
          icon={<Users />}
          label="Participantes"
          value={`${metrics.mentors} / ${metrics.mentees}`}
          helper="mentores / mentoreados"
        />
        <MetricCard
          icon={<Clock3 />}
          label="Horas"
          value={formatHours(metrics.hours)}
          helper={`${metrics.completedSessions} sesiones realizadas`}
        />
        <MetricCard
          icon={<Paperclip />}
          label="Evidencias"
          value={String(metrics.evidenceCount)}
          helper="fotos y documentos"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="surface-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">El pulso del programa</h2>
              <p className="text-sm text-muted-foreground">
                Vista general por estado, servicio y avance de sesiones.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SummaryPanel
              title="Estados"
              items={MENTORSHIP_STATUSES.map((status) => ({
                label: status,
                count: state.mentorships.filter(
                  (item) => item.status === status,
                ).length,
                tone: statusTones[status],
              }))}
              total={Math.max(1, state.mentorships.length)}
            />
            <SummaryPanel
              title="Servicios"
              items={SERVICES.map((service) => ({
                label: service,
                count: state.mentorships.filter(
                  (item) => item.service === service,
                ).length,
                tone: 'border-teal-200 bg-teal-50 text-teal-700',
              }))}
              total={Math.max(1, state.mentorships.length)}
            />
          </div>
        </div>

        <div className="surface-card p-5">
          <div className="mb-5 flex items-center gap-4">
            <div
              className="completion-ring"
              style={{
                background: `conic-gradient(#bf1830 ${metrics.completionRate}%, #f1e9ec 0)`,
              }}
            >
              <span>{metrics.completionRate}%</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Avance del programa
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Mentorías terminadas
              </p>
            </div>
          </div>
          <h2 className="text-lg font-semibold">Iniciar un acompañamiento</h2>
          <p className="my-4 text-sm text-muted-foreground">
            Vincula un mentor con un mentoreado. Al guardar se preparan las seis
            sesiones.
          </p>
          <NewMentorshipForm
            state={state}
            newMentorship={newMentorship}
            setNewMentorship={setNewMentorship}
            addMentorship={addMentorship}
          />
        </div>
      </section>

      <section className="surface-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Requieren atención</h2>
          <Badge variant="outline">{attentionItems.length}</Badge>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {attentionItems.length ? (
            attentionItems.map((mentorship) => (
              <CompactMentorshipCard
                key={mentorship.id}
                mentorship={mentorship}
                mentor={state.mentors.find(
                  (mentor) => mentor.id === mentorship.mentorId,
                )}
                mentee={state.mentees.find(
                  (mentee) => mentee.id === mentorship.menteeId,
                )}
              />
            ))
          ) : (
            <EmptyState
              title="Sin estados que requieran atención"
              body="No hay mentorías suspendidas ni pendientes de derivación."
            />
          )}
        </div>
      </section>
    </div>
  );
}

function ExportView({
  metrics,
  exportOptions,
  setExportOptions,
  fileName,
  setFileName,
  isExporting,
  exportMessage,
  exportExcel,
}: {
  metrics: ReturnType<typeof getMetrics>;
  exportOptions: ExportOptions;
  setExportOptions: (value: ExportOptions) => void;
  fileName: string;
  setFileName: (value: string) => void;
  isExporting: boolean;
  exportMessage: string;
  exportExcel: () => void;
}) {
  const options: Array<{
    key: keyof ExportOptions;
    label: string;
    detail: string;
  }> = [
    {
      key: 'summary',
      label: 'Resumen',
      detail: 'Indicadores y avance general',
    },
    { key: 'mentors', label: 'Mentores', detail: 'Perfiles y especialidades' },
    { key: 'mentees', label: 'Mentoreados', detail: 'Fichas de participantes' },
    { key: 'mentorships', label: 'Mentorías', detail: 'Estado, horas y SIR' },
    { key: 'sessions', label: 'Sesiones', detail: 'Detalle sesión por sesión' },
  ];

  return (
    <div className="grid gap-5">
      <PageHeading
        eyebrow="Salida"
        title="Exportación Excel"
        body="Elige qué incluir y descarga un informe listo para compartir."
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="surface-card p-5">
          <div className="grid gap-4">
            <FieldLabel label="Nombre del archivo">
              <Input
                value={fileName}
                onChange={(event) => setFileName(event.target.value)}
                placeholder="monitoreo-mentorias-2026"
              />
            </FieldLabel>

            <div className="grid gap-3 md:grid-cols-2">
              {options.map((option) => (
                <label
                  key={option.key}
                  aria-label={option.label}
                  className="flex min-h-20 cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/35 p-3 transition-colors hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={exportOptions[option.key]}
                    onChange={(event) =>
                      setExportOptions({
                        ...exportOptions,
                        [option.key]: event.target.checked,
                      })
                    }
                    className="mt-1 size-4 accent-primary"
                  />
                  <span>
                    <span className="block text-sm font-semibold">
                      {option.label}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {option.detail}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            {exportOptions.sessions && (
              <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-zinc-50 p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-primary"
                  checked={exportOptions.attachments}
                  onChange={(event) =>
                    setExportOptions({
                      ...exportOptions,
                      attachments: event.target.checked,
                    })
                  }
                />
                <span>
                  Incluir nombres de evidencias en Sesiones
                  <span className="block text-xs text-muted-foreground">
                    Añade las columnas Foto y Documento; no incluye los
                    archivos.
                  </span>
                </span>
              </label>
            )}
            {!['summary', 'mentors', 'mentees', 'mentorships', 'sessions'].some(
              (key) => exportOptions[key as keyof ExportOptions],
            ) && (
              <p className="text-sm text-muted-foreground">
                Selecciona al menos una hoja para descargar.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={exportExcel}
                disabled={
                  isExporting ||
                  ![
                    'summary',
                    'mentors',
                    'mentees',
                    'mentorships',
                    'sessions',
                  ].some((key) => exportOptions[key as keyof ExportOptions])
                }
              >
                <Download aria-hidden="true" />
                {isExporting ? 'Generando...' : 'Descargar Excel'}
              </Button>
              {exportMessage ? (
                <span className="text-sm font-medium text-muted-foreground">
                  {exportMessage}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="report-preview rounded-2xl bg-zinc-950 p-6 text-white">
          <div className="mb-6 flex items-center justify-between">
            <Image
              unoptimized
              width={96}
              height={96}
              src={LOGO_PATH}
              alt="INACAP"
              className="h-12 w-auto"
            />
            <Badge className="bg-white text-zinc-900">XLSX</Badge>
          </div>
          <h2 className="text-xl font-semibold">Monitoreo de mentorías 2026</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <ExcelPreviewMetric label="Mentorías" value={metrics.mentorships} />
            <ExcelPreviewMetric label="Mentores" value={metrics.mentors} />
            <ExcelPreviewMetric label="Mentoreados" value={metrics.mentees} />
            <ExcelPreviewMetric
              label="Evidencias"
              value={metrics.evidenceCount}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <article className="metric-card">
      <div className="metric-caption">
        <span>{label}</span>
        <span aria-hidden="true">{icon}</span>
      </div>
      <p className="metric-value">{value}</p>
      <p className="metric-helper">{helper}</p>
    </article>
  );
}

function PageHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="page-heading">
      <div className="relative z-10 min-w-0">
        <p className="page-eyebrow">
          <span />
          {eyebrow}
        </p>
        <h1 className="page-title">{title}</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
      <ProgramGraphic
        variant={
          title.includes('Excel')
            ? 'reports'
            : title.includes('sesiones') || title.includes('Mentorías')
              ? 'progress'
              : 'people'
        }
        compact
      />
    </div>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const Icon = /Nombre|Mentor/.test(label)
    ? User
    : /Correo/.test(label)
      ? Mail
      : /Teléfono/.test(label)
        ? Phone
        : /Fecha|Mes|SIR/.test(label)
          ? CalendarDays
          : /Horas/.test(label)
            ? Clock3
            : /Objetivo|apoyo/.test(label)
              ? Target
              : /Espacio/.test(label)
                ? MapPin
                : /Estado|Formalización/.test(label)
                  ? BadgeCheck
                  : /Especialidad|Profesión/.test(label)
                    ? Sparkles
                    : BriefcaseBusiness;
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="flex items-center gap-2 text-xs font-semibold text-zinc-600">
        <Icon className="size-3.5 text-zinc-400" aria-hidden="true" />
        {label}
      </span>
      {children}
    </label>
  );
}

function SummaryPanel({
  title,
  items,
  total,
}: {
  title: string;
  items: Array<{ label: string; count: number; tone: string }>;
  total: number;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border p-3">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="grid gap-3">
        {items.map((item) => {
          const percentage = Math.round((item.count / total) * 100);

          return (
            <div key={item.label} className="grid gap-1.5">
              <div className="flex items-center justify-between gap-3">
                <Badge
                  variant="outline"
                  className={cn('min-w-0 max-w-full shrink', item.tone)}
                  title={item.label}
                >
                  <span className="truncate">{item.label}</span>
                </Badge>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {item.count}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompactMentorshipCard({
  mentorship,
  mentor,
  mentee,
}: {
  mentorship: Mentorship;
  mentor?: Mentor;
  mentee?: Mentee;
}) {
  const completed = mentorship.sessions.filter(
    (session) => session.status === 'Realizada',
  ).length;

  return (
    <article className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Badge variant="outline" className={statusTones[mentorship.status]}>
          {mentorship.status}
        </Badge>
        <span className="text-sm font-semibold tabular-nums">
          {completed}/6
        </span>
      </div>
      <div className="grid gap-2">
        <PersonLine person={mentor} fallback="Mentor por asignar" small />
        <PersonLine person={mentee} fallback="Mentoreado por asignar" small />
      </div>
      {mentorship.goal ? (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {mentorship.goal}
        </p>
      ) : null}
    </article>
  );
}

function Avatar({
  name,
  photo,
  size = 'md',
}: {
  name: string;
  photo?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass = {
    sm: 'size-9 text-xs',
    md: 'size-12 text-sm',
    lg: 'size-24 text-2xl',
  }[size];

  const palettes = [
    ['#fae9ed', '#a3233b'],
    ['#e9f2ee', '#296457'],
    ['#f5eee2', '#886b34'],
    ['#edecf5', '#62577f'],
  ];
  const palette =
    palettes[
      Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0) %
        palettes.length
    ];
  return (
    <div
      style={photo ? undefined : { background: palette[0], color: palette[1] }}
      className={cn(
        'person-avatar grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-zinc-100 font-semibold ring-1 ring-inset ring-black/5',
        sizeClass,
      )}
    >
      {photo ? (
        <Image
          unoptimized
          width={96}
          height={96}
          src={photo}
          alt={name}
          className="h-full w-full object-cover"
        />
      ) : (
        <>
          <span className="avatar-pattern" aria-hidden="true" />
          <span className="relative">{initials(name)}</span>
        </>
      )}
    </div>
  );
}

function PersonLine({
  person,
  fallback,
  small = false,
}: {
  person?: Mentor | Mentee;
  fallback: string;
  small?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar
        name={person?.name ?? fallback}
        photo={person?.photo}
        size={small ? 'sm' : 'md'}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">
          {person?.name ?? fallback}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {'title' in (person ?? {})
            ? (person as Mentor).title
            : (person as Mentee | undefined)?.venture || 'Sin emprendimiento'}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/25 p-6 text-center">
      <FolderOpen className="mx-auto mb-2 size-8 text-muted-foreground" />
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function ExcelPreviewMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-white/10 p-3">
      <p className="text-xs font-semibold uppercase text-zinc-300">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
