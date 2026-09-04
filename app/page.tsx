'use client';

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Download,
  File,
  FileSpreadsheet,
  FolderOpen,
  LayoutDashboard,
  Mail,
  Paperclip,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  User,
  UserCheck,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'creaempresa-mentorias-app-v2';
const LOGO_PATH = '/logoinacap.png';

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

const MENTORSHIP_STATUSES = [
  'Suspendida',
  'En proceso',
  'Terminada',
  'No corresponde',
  'Esperando derivación',
  'Derivada',
] as const;

const SERVICES = [
  'Mentoría administrativa y financiera',
  'Mentoría en gestión comercial',
  'Mentoría en informática y ciberseguridad',
] as const;

const CHECK_OPTIONS = ['Pendiente', 'Sí', 'No', 'No corresponde'] as const;
const SESSION_STATUSES = [
  'Pendiente',
  'Agendada',
  'Realizada',
  'Reprogramada',
] as const;
const ROLES = ['Administrador', 'Mentor', 'Mentoreado'] as const;

type Role = (typeof ROLES)[number];
type View = 'dashboard' | 'mentors' | 'mentees' | 'mentorships' | 'profile' | 'export';
type MentorshipStatus = (typeof MENTORSHIP_STATUSES)[number];
type SessionStatus = (typeof SESSION_STATUSES)[number];
type CheckValue = (typeof CHECK_OPTIONS)[number];

type Attachment = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

type SessionRecord = {
  number: number;
  date: string;
  status: SessionStatus;
  summary: string;
  photo?: Attachment;
  document?: Attachment;
};

type Mentor = {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  expertise: string[];
  bio: string;
  photo?: string;
};

type Mentee = {
  id: string;
  name: string;
  venture: string;
  stage: string;
  email: string;
  phone: string;
  need: string;
  photo?: string;
};

type Mentorship = {
  id: string;
  sourceNumber: number;
  mentorId: string;
  menteeId: string;
  month: string;
  hours: number;
  space: string;
  status: MentorshipStatus;
  service: string;
  formalization: CheckValue;
  planningSir: CheckValue;
  executionSir: CheckValue;
  paidAt: string;
  goal: string;
  sessions: SessionRecord[];
};

type AppState = {
  mentors: Mentor[];
  mentees: Mentee[];
  mentorships: Mentorship[];
};

type ExportOptions = {
  summary: boolean;
  mentors: boolean;
  mentees: boolean;
  mentorships: boolean;
  sessions: boolean;
  attachments: boolean;
};

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

const sessionTones: Record<SessionStatus, string> = {
  Pendiente: 'border-zinc-200 bg-zinc-50 text-zinc-600',
  Agendada: 'border-sky-200 bg-sky-50 text-sky-700',
  Realizada: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Reprogramada: 'border-amber-200 bg-amber-50 text-amber-700',
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
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
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
      ...(mentorship.sessions?.[sessionIndex] ?? {}),
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

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatHours(value: number) {
  return value.toLocaleString('es-CL', { maximumFractionDigits: 1 });
}

function fileSizeLabel(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function readFile(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: String(reader.result),
      });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function sanitizeFilename(name: string) {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .toLowerCase();

  return cleaned || 'monitoreo-mentorias-2026';
}

export default function Home() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [role, setRole] = useState<Role>('Administrador');
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [activeMentorId, setActiveMentorId] = useState(DEFAULT_MENTORS[0].id);
  const [activeMenteeId, setActiveMenteeId] = useState(DEFAULT_MENTEES[0].id);
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
    title: '',
    expertise: '',
  });
  const [newMentee, setNewMentee] = useState({
    name: '',
    venture: '',
    need: '',
  });
  const [newMentorship, setNewMentorship] = useState({
    mentorId: DEFAULT_MENTORS[0].id,
    menteeId: DEFAULT_MENTEES[0].id,
    month: MONTHS[new Date().getMonth()],
    service: SERVICES[0],
  });

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored) {
      try {
        setState(normalizeState(JSON.parse(stored) as Partial<AppState>));
      } catch {
        setState(DEFAULT_STATE);
      }
    }

    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSaveWarning('');
    } catch {
      setSaveWarning('Algunos archivos son grandes y no pudieron guardarse.');
    }
  }, [hasLoaded, state]);

  const { mentors, mentees, mentorships } = state;
  const activeMentor = mentors.find((mentor) => mentor.id === activeMentorId) ?? mentors[0];
  const activeMentee = mentees.find((mentee) => mentee.id === activeMenteeId) ?? mentees[0];

  const visibleMentorships = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return mentorships.filter((mentorship) => {
      const mentor = mentors.find((item) => item.id === mentorship.mentorId);
      const mentee = mentees.find((item) => item.id === mentorship.menteeId);
      const roleMatch =
        role === 'Administrador' ||
        (role === 'Mentor' && mentorship.mentorId === activeMentor?.id) ||
        (role === 'Mentoreado' && mentorship.menteeId === activeMentee?.id);
      const statusMatch =
        statusFilter === 'Todos' || mentorship.status === statusFilter;
      const searchMatch =
        !normalizedSearch ||
        [
          mentor?.name,
          mentee?.name,
          mentee?.venture,
          mentorship.service,
          mentorship.goal,
        ].some((value) => value?.toLowerCase().includes(normalizedSearch));

      return roleMatch && statusMatch && searchMatch;
    });
  }, [
    activeMentee?.id,
    activeMentor?.id,
    mentees,
    mentors,
    mentorships,
    role,
    search,
    statusFilter,
  ]);

  const metrics = useMemo(() => getMetrics(state), [state]);
  const navigation = getNavigation(role);

  const updateMentor = (mentorId: string, patch: Partial<Mentor>) => {
    setState((current) => ({
      ...current,
      mentors: current.mentors.map((mentor) =>
        mentor.id === mentorId ? { ...mentor, ...patch } : mentor,
      ),
    }));
  };

  const updateMentee = (menteeId: string, patch: Partial<Mentee>) => {
    setState((current) => ({
      ...current,
      mentees: current.mentees.map((mentee) =>
        mentee.id === menteeId ? { ...mentee, ...patch } : mentee,
      ),
    }));
  };

  const updateMentorship = (
    mentorshipId: string,
    patch: Partial<Mentorship>,
  ) => {
    setState((current) => ({
      ...current,
      mentorships: current.mentorships.map((mentorship) =>
        mentorship.id === mentorshipId
          ? { ...mentorship, ...patch }
          : mentorship,
      ),
    }));
  };

  const updateSession = (
    mentorshipId: string,
    sessionNumber: number,
    patch: Partial<SessionRecord>,
  ) => {
    setState((current) => ({
      ...current,
      mentorships: current.mentorships.map((mentorship) =>
        mentorship.id === mentorshipId
          ? {
              ...mentorship,
              sessions: mentorship.sessions.map((session) =>
                session.number === sessionNumber
                  ? { ...session, ...patch }
                  : session,
              ),
            }
          : mentorship,
      ),
    }));
  };

  const handleRoleChange = (nextRole: Role) => {
    setRole(nextRole);
    setActiveView(defaultViewForRole(nextRole));
    setSearch('');
    setStatusFilter('Todos');
  };

  const addMentor = () => {
    const name = newMentor.name.trim();

    if (!name) {
      return;
    }

    const mentor: Mentor = {
      id: makeId('mentor'),
      name,
      title: newMentor.title.trim() || 'Mentor/a',
      email: '',
      phone: '',
      expertise: newMentor.expertise
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      bio: '',
    };

    setState((current) => ({ ...current, mentors: [...current.mentors, mentor] }));
    setActiveMentorId(mentor.id);
    setNewMentor({ name: '', title: '', expertise: '' });
  };

  const addMentee = () => {
    const name = newMentee.name.trim();

    if (!name) {
      return;
    }

    const mentee: Mentee = {
      id: makeId('mentee'),
      name,
      venture: newMentee.venture.trim(),
      stage: 'Por registrar',
      email: '',
      phone: '',
      need: newMentee.need.trim(),
    };

    setState((current) => ({ ...current, mentees: [...current.mentees, mentee] }));
    setActiveMenteeId(mentee.id);
    setNewMentee({ name: '', venture: '', need: '' });
  };

  const addMentorship = () => {
    if (!newMentorship.mentorId || !newMentorship.menteeId) {
      return;
    }

    const mentorship: Mentorship = {
      id: makeId('mentoria'),
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
      sessions: createSessions(),
    };

    setState((current) => ({
      ...current,
      mentorships: [...current.mentorships, mentorship],
    }));
    setActiveView('mentorships');
  };

  const handleMentorPhoto = async (
    mentorId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    const attachment = await readFile(file);
    updateMentor(mentorId, { photo: attachment.dataUrl });
    event.currentTarget.value = '';
  };

  const handleMenteePhoto = async (
    menteeId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    const attachment = await readFile(file);
    updateMentee(menteeId, { photo: attachment.dataUrl });
    event.currentTarget.value = '';
  };

  const handleSessionAttachment = async (
    mentorshipId: string,
    sessionNumber: number,
    event: ChangeEvent<HTMLInputElement>,
    field: 'photo' | 'document',
  ) => {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    const attachment = await readFile(file);
    updateSession(mentorshipId, sessionNumber, { [field]: attachment });
    event.currentTarget.value = '';
  };

  const resetDemo = () => {
    const shouldReset = window.confirm(
      'Se restaurarán los datos iniciales del monitoreo.',
    );

    if (shouldReset) {
      setState(DEFAULT_STATE);
      setRole('Administrador');
      setActiveView('dashboard');
      setActiveMentorId(DEFAULT_MENTORS[0].id);
      setActiveMenteeId(DEFAULT_MENTEES[0].id);
    }
  };

  const exportExcel = async () => {
    setIsExporting(true);
    setExportMessage('');

    try {
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
        addSummarySheet(workbook, logoId, state);
      }

      if (exportOptions.mentors) {
        addMentorsSheet(workbook, logoId, state);
      }

      if (exportOptions.mentees) {
        addMenteesSheet(workbook, logoId, state);
      }

      if (exportOptions.mentorships) {
        addMentorshipsSheet(workbook, logoId, state);
      }

      if (exportOptions.sessions) {
        addSessionsSheet(workbook, logoId, state, exportOptions.attachments);
      }

      if (workbook.worksheets.length === 0) {
        addSummarySheet(workbook, logoId, state);
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5f9f6_0%,#eef6f3_42%,#f8fafc_100%)] text-foreground">
      <header className="sticky top-0 z-30 border-b border-emerald-950/10 bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-lg border border-red-100 bg-white shadow-sm">
              <img
                src={LOGO_PATH}
                alt="INACAP"
                className="h-9 w-auto object-contain"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">Crea Empresa</p>
              <h1 className="text-xl font-semibold sm:text-2xl">
                Gestión de mentorías 2026
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <NativeSelect
              value={role}
              onChange={(event) => handleRoleChange(event.target.value as Role)}
              aria-label="Rol activo"
              className="w-44"
            >
              {ROLES.map((item) => (
                <NativeSelectOption key={item} value={item}>
                  {item}
                </NativeSelectOption>
              ))}
            </NativeSelect>

            {role === 'Mentor' && activeMentor ? (
              <NativeSelect
                value={activeMentor.id}
                onChange={(event) => setActiveMentorId(event.target.value)}
                aria-label="Mentor activo"
                className="w-56"
              >
                {mentors.map((mentor) => (
                  <NativeSelectOption key={mentor.id} value={mentor.id}>
                    {mentor.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            ) : null}

            {role === 'Mentoreado' && activeMentee ? (
              <NativeSelect
                value={activeMentee.id}
                onChange={(event) => setActiveMenteeId(event.target.value)}
                aria-label="Mentoreado activo"
                className="w-56"
              >
                {mentees.map((mentee) => (
                  <NativeSelectOption key={mentee.id} value={mentee.id}>
                    {mentee.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            ) : null}

            <Button type="button" variant="outline" onClick={resetDemo}>
              Restaurar
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[248px_minmax(0,1fr)] lg:px-8">
        <aside className="rounded-lg border border-emerald-950/10 bg-white p-3 shadow-sm lg:sticky lg:top-24 lg:self-start">
          <nav className="grid gap-1" aria-label="Secciones">
            {navigation.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                aria-current={activeView === item.id ? 'page' : undefined}
                className={cn(
                  'flex h-10 items-center gap-2 rounded-lg px-3 text-left text-sm font-medium transition-colors',
                  activeView === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span className="[&_svg]:size-4">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-4 rounded-lg bg-[#0f322e] p-3 text-white">
            <p className="text-xs font-semibold uppercase text-emerald-100">
              Estado general
            </p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-3xl font-semibold">
                {metrics.completionRate}%
              </span>
              <span className="pb-1 text-sm text-emerald-100">
                cierre
              </span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-[#f4c542]"
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

        <section className="min-w-0">
          {activeView === 'dashboard' ? (
            <DashboardView
              metrics={metrics}
              state={state}
              newMentorship={newMentorship}
              setNewMentorship={setNewMentorship}
              addMentorship={addMentorship}
            />
          ) : null}

          {activeView === 'mentors' ? (
            <MentorsView
              mentors={mentors}
              mentorships={mentorships}
              newMentor={newMentor}
              setNewMentor={setNewMentor}
              addMentor={addMentor}
              updateMentor={updateMentor}
              handleMentorPhoto={handleMentorPhoto}
            />
          ) : null}

          {activeView === 'mentees' ? (
            <MenteesView
              mentees={mentees}
              mentorships={mentorships}
              newMentee={newMentee}
              setNewMentee={setNewMentee}
              addMentee={addMentee}
              updateMentee={updateMentee}
              handleMenteePhoto={handleMenteePhoto}
            />
          ) : null}

          {activeView === 'profile' && role === 'Mentor' && activeMentor ? (
            <MentorProfileView
              mentor={activeMentor}
              mentorships={mentorships}
              mentees={mentees}
              updateMentor={updateMentor}
              handleMentorPhoto={handleMentorPhoto}
            />
          ) : null}

          {activeView === 'profile' && role === 'Mentoreado' && activeMentee ? (
            <MenteeProfileView
              mentee={activeMentee}
              mentorships={mentorships}
              mentors={mentors}
              updateMentee={updateMentee}
              handleMenteePhoto={handleMenteePhoto}
            />
          ) : null}

          {activeView === 'mentorships' ? (
            <MentorshipsView
              role={role}
              search={search}
              setSearch={setSearch}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              mentorships={visibleMentorships}
              mentors={mentors}
              mentees={mentees}
              updateMentorship={updateMentorship}
              updateSession={updateSession}
              handleSessionAttachment={handleSessionAttachment}
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
    </main>
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
  addMentorship: () => void;
}) {
  const attentionItems = state.mentorships.filter((mentorship) =>
    ['Suspendida', 'Esperando derivación', 'Derivada'].includes(
      mentorship.status,
    ),
  );

  return (
    <div className="grid gap-5">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
        <div className="rounded-lg border border-emerald-950/10 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Panel administrador</h2>
              <p className="text-sm text-muted-foreground">
                Vista general por estado, servicio y avance de sesiones.
              </p>
            </div>
            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
              Admin
            </Badge>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SummaryPanel
              title="Estados"
              items={MENTORSHIP_STATUSES.map((status) => ({
                label: status,
                count: state.mentorships.filter((item) => item.status === status).length,
                tone: statusTones[status],
              }))}
              total={Math.max(1, state.mentorships.length)}
            />
            <SummaryPanel
              title="Servicios"
              items={SERVICES.map((service) => ({
                label: service,
                count: state.mentorships.filter((item) => item.service === service).length,
                tone: 'border-teal-200 bg-teal-50 text-teal-700',
              }))}
              total={Math.max(1, state.mentorships.length)}
            />
          </div>
        </div>

        <div className="rounded-lg border border-emerald-950/10 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Plus className="size-4 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Nueva mentoría</h2>
          </div>
          <div className="grid gap-3">
            <FieldLabel label="Mentor">
              <NativeSelect
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
                {state.mentors.map((mentor) => (
                  <NativeSelectOption key={mentor.id} value={mentor.id}>
                    {mentor.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FieldLabel>
            <FieldLabel label="Mentoreado">
              <NativeSelect
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
                {state.mentees.map((mentee) => (
                  <NativeSelectOption key={mentee.id} value={mentee.id}>
                    {mentee.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FieldLabel>
            <div className="grid grid-cols-2 gap-3">
              <FieldLabel label="Mes">
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
                  {SERVICES.map((service) => (
                    <NativeSelectOption key={service} value={service}>
                      {service}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FieldLabel>
            </div>
            <Button type="button" onClick={addMentorship}>
              <Plus aria-hidden="true" />
              Crear mentoría
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-emerald-950/10 bg-white p-4 shadow-sm">
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
                mentor={state.mentors.find((mentor) => mentor.id === mentorship.mentorId)}
                mentee={state.mentees.find((mentee) => mentee.id === mentorship.menteeId)}
              />
            ))
          ) : (
            <EmptyState title="Sin alertas" body="Todas las mentorías están avanzando sin estados críticos." />
          )}
        </div>
      </section>
    </div>
  );
}

function MentorsView({
  mentors,
  mentorships,
  newMentor,
  setNewMentor,
  addMentor,
  updateMentor,
  handleMentorPhoto,
}: {
  mentors: Mentor[];
  mentorships: Mentorship[];
  newMentor: { name: string; title: string; expertise: string };
  setNewMentor: (value: { name: string; title: string; expertise: string }) => void;
  addMentor: () => void;
  updateMentor: (mentorId: string, patch: Partial<Mentor>) => void;
  handleMentorPhoto: (
    mentorId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
}) {
  return (
    <div className="grid gap-5">
      <PageHeading
        eyebrow="Equipo"
        title="Mentores"
        body="Perfiles, especialidades y datos de contacto en formato de tarjetas."
      />

      <section className="rounded-lg border border-emerald-950/10 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_1fr_auto] lg:items-end">
          <FieldLabel label="Nombre">
            <Input
              value={newMentor.name}
              onChange={(event) =>
                setNewMentor({ ...newMentor, name: event.target.value })
              }
              placeholder="Nuevo mentor"
            />
          </FieldLabel>
          <FieldLabel label="Rol">
            <Input
              value={newMentor.title}
              onChange={(event) =>
                setNewMentor({ ...newMentor, title: event.target.value })
              }
              placeholder="Mentor/a"
            />
          </FieldLabel>
          <FieldLabel label="Especialidades">
            <Input
              value={newMentor.expertise}
              onChange={(event) =>
                setNewMentor({ ...newMentor, expertise: event.target.value })
              }
              placeholder="Finanzas, ventas, gestión"
            />
          </FieldLabel>
          <Button type="button" onClick={addMentor}>
            <Plus aria-hidden="true" />
            Agregar
          </Button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {mentors.map((mentor) => (
          <MentorCard
            key={mentor.id}
            mentor={mentor}
            stats={getMentorStats(mentor.id, mentorships)}
            updateMentor={updateMentor}
            handleMentorPhoto={handleMentorPhoto}
          />
        ))}
      </section>
    </div>
  );
}

function MenteesView({
  mentees,
  mentorships,
  newMentee,
  setNewMentee,
  addMentee,
  updateMentee,
  handleMenteePhoto,
}: {
  mentees: Mentee[];
  mentorships: Mentorship[];
  newMentee: { name: string; venture: string; need: string };
  setNewMentee: (value: { name: string; venture: string; need: string }) => void;
  addMentee: () => void;
  updateMentee: (menteeId: string, patch: Partial<Mentee>) => void;
  handleMenteePhoto: (
    menteeId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
}) {
  return (
    <div className="grid gap-5">
      <PageHeading
        eyebrow="Participantes"
        title="Mentoreados"
        body="Información del emprendimiento, etapa y necesidad principal."
      />

      <section className="rounded-lg border border-emerald-950/10 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <FieldLabel label="Nombre">
            <Input
              value={newMentee.name}
              onChange={(event) =>
                setNewMentee({ ...newMentee, name: event.target.value })
              }
              placeholder="Nuevo mentoreado"
            />
          </FieldLabel>
          <FieldLabel label="Emprendimiento">
            <Input
              value={newMentee.venture}
              onChange={(event) =>
                setNewMentee({ ...newMentee, venture: event.target.value })
              }
              placeholder="Nombre del proyecto"
            />
          </FieldLabel>
          <FieldLabel label="Necesidad">
            <Input
              value={newMentee.need}
              onChange={(event) =>
                setNewMentee({ ...newMentee, need: event.target.value })
              }
              placeholder="Foco de apoyo"
            />
          </FieldLabel>
          <Button type="button" onClick={addMentee}>
            <Plus aria-hidden="true" />
            Agregar
          </Button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {mentees.map((mentee) => (
          <MenteeCard
            key={mentee.id}
            mentee={mentee}
            stats={getMenteeStats(mentee.id, mentorships)}
            updateMentee={updateMentee}
            handleMenteePhoto={handleMenteePhoto}
          />
        ))}
      </section>
    </div>
  );
}

function MentorProfileView({
  mentor,
  mentorships,
  mentees,
  updateMentor,
  handleMentorPhoto,
}: {
  mentor: Mentor;
  mentorships: Mentorship[];
  mentees: Mentee[];
  updateMentor: (mentorId: string, patch: Partial<Mentor>) => void;
  handleMentorPhoto: (
    mentorId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
}) {
  const myMentorships = mentorships.filter((item) => item.mentorId === mentor.id);
  const stats = getMentorStats(mentor.id, mentorships);

  return (
    <div className="grid gap-5">
      <PageHeading
        eyebrow="Perfil mentor"
        title={mentor.name}
        body="Ficha personal y seguimiento de mentorías asignadas."
      />
      <MentorCard
        mentor={mentor}
        stats={stats}
        updateMentor={updateMentor}
        handleMentorPhoto={handleMentorPhoto}
      />
      <section className="grid gap-3 lg:grid-cols-2">
        {myMentorships.map((mentorship) => (
          <CompactMentorshipCard
            key={mentorship.id}
            mentorship={mentorship}
            mentor={mentor}
            mentee={mentees.find((mentee) => mentee.id === mentorship.menteeId)}
          />
        ))}
      </section>
    </div>
  );
}

function MenteeProfileView({
  mentee,
  mentorships,
  mentors,
  updateMentee,
  handleMenteePhoto,
}: {
  mentee: Mentee;
  mentorships: Mentorship[];
  mentors: Mentor[];
  updateMentee: (menteeId: string, patch: Partial<Mentee>) => void;
  handleMenteePhoto: (
    menteeId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
}) {
  const myMentorships = mentorships.filter((item) => item.menteeId === mentee.id);

  return (
    <div className="grid gap-5">
      <PageHeading
        eyebrow="Perfil mentoreado"
        title={mentee.name}
        body="Ficha del emprendimiento y avance de sesiones asociadas."
      />
      <MenteeCard
        mentee={mentee}
        stats={getMenteeStats(mentee.id, mentorships)}
        updateMentee={updateMentee}
        handleMenteePhoto={handleMenteePhoto}
      />
      <section className="grid gap-3 lg:grid-cols-2">
        {myMentorships.map((mentorship) => (
          <CompactMentorshipCard
            key={mentorship.id}
            mentorship={mentorship}
            mentor={mentors.find((mentor) => mentor.id === mentorship.mentorId)}
            mentee={mentee}
          />
        ))}
      </section>
    </div>
  );
}

function MentorshipsView({
  role,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  mentorships,
  mentors,
  mentees,
  updateMentorship,
  updateSession,
  handleSessionAttachment,
}: {
  role: Role;
  search: string;
  setSearch: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  mentorships: Mentorship[];
  mentors: Mentor[];
  mentees: Mentee[];
  updateMentorship: (mentorshipId: string, patch: Partial<Mentorship>) => void;
  updateSession: (
    mentorshipId: string,
    sessionNumber: number,
    patch: Partial<SessionRecord>,
  ) => void;
  handleSessionAttachment: (
    mentorshipId: string,
    sessionNumber: number,
    event: ChangeEvent<HTMLInputElement>,
    field: 'photo' | 'document',
  ) => void;
}) {
  const canEdit = role !== 'Mentoreado';

  return (
    <div className="grid gap-5">
      <PageHeading
        eyebrow={role === 'Administrador' ? 'Seguimiento' : 'Trabajo asignado'}
        title={role === 'Mentoreado' ? 'Mis sesiones' : 'Mentorías'}
        body="Estados, avances, sesiones y evidencias en tarjetas de trabajo."
      />

      <section className="rounded-lg border border-emerald-950/10 bg-white p-3 shadow-sm">
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_220px]">
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-8"
              placeholder="Buscar por persona, servicio o foco"
              aria-label="Buscar mentoría"
            />
          </label>
          <NativeSelect
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full"
            aria-label="Filtrar por estado"
          >
            <NativeSelectOption value="Todos">Todos los estados</NativeSelectOption>
            {MENTORSHIP_STATUSES.map((status) => (
              <NativeSelectOption key={status} value={status}>
                {status}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </section>

      <section className="grid gap-4">
        {mentorships.length ? (
          mentorships.map((mentorship) => (
            <MentorshipCard
              key={mentorship.id}
              mentorship={mentorship}
              mentor={mentors.find((item) => item.id === mentorship.mentorId)}
              mentee={mentees.find((item) => item.id === mentorship.menteeId)}
              mentors={mentors}
              mentees={mentees}
              canEdit={canEdit}
              updateMentorship={updateMentorship}
              updateSession={updateSession}
              handleSessionAttachment={handleSessionAttachment}
            />
          ))
        ) : (
          <EmptyState title="Sin resultados" body="No hay mentorías para los filtros seleccionados." />
        )}
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
  const options: Array<{ key: keyof ExportOptions; label: string; detail: string }> = [
    { key: 'summary', label: 'Resumen', detail: 'KPIs y avance general' },
    { key: 'mentors', label: 'Mentores', detail: 'Perfiles y especialidades' },
    { key: 'mentees', label: 'Mentoreados', detail: 'Fichas de participantes' },
    { key: 'mentorships', label: 'Mentorías', detail: 'Estado, horas y SIR' },
    { key: 'sessions', label: 'Sesiones', detail: 'Detalle sesión por sesión' },
    { key: 'attachments', label: 'Evidencias', detail: 'Nombres de archivos adjuntos' },
  ];

  return (
    <div className="grid gap-5">
      <PageHeading
        eyebrow="Salida"
        title="Exportación Excel"
        body="El archivo se arma con hojas seleccionables, estilos y logo INACAP."
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-emerald-950/10 bg-white p-4 shadow-sm">
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

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={exportExcel} disabled={isExporting}>
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

        <div className="rounded-lg border border-emerald-950/10 bg-[#0f322e] p-4 text-white shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <img src={LOGO_PATH} alt="INACAP" className="h-12 w-auto" />
            <Badge className="bg-white text-[#0f322e]">XLSX</Badge>
          </div>
          <h2 className="text-xl font-semibold">Monitoreo de mentorías 2026</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <ExcelPreviewMetric label="Mentorías" value={metrics.mentorships} />
            <ExcelPreviewMetric label="Mentores" value={metrics.mentors} />
            <ExcelPreviewMetric label="Mentoreados" value={metrics.mentees} />
            <ExcelPreviewMetric label="Evidencias" value={metrics.evidenceCount} />
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
    <article className="rounded-lg border border-emerald-950/10 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-foreground [&_svg]:size-4">
          {icon}
        </span>
        {label}
      </div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
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
    <div className="flex flex-col gap-1">
      <p className="text-sm font-semibold text-primary">{eyebrow}</p>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h2>
      <p className="max-w-3xl text-sm text-muted-foreground">{body}</p>
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
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase text-muted-foreground">
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
    <div className="rounded-lg border border-border p-3">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="grid gap-3">
        {items.map((item) => {
          const percentage = Math.round((item.count / total) * 100);

          return (
            <div key={item.label} className="grid gap-1.5">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="outline" className={cn('max-w-[260px]', item.tone)}>
                  <span className="truncate">{item.label}</span>
                </Badge>
                <span className="text-sm font-semibold tabular-nums">
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

function MentorCard({
  mentor,
  stats,
  updateMentor,
  handleMentorPhoto,
}: {
  mentor: Mentor;
  stats: ReturnType<typeof getMentorStats>;
  updateMentor: (mentorId: string, patch: Partial<Mentor>) => void;
  handleMentorPhoto: (
    mentorId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
}) {
  return (
    <article className="rounded-lg border border-emerald-950/10 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex shrink-0 flex-col items-start gap-3">
          <Avatar name={mentor.name} photo={mentor.photo} size="lg" />
          <UploadLabel icon={<Camera />} label="Foto">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => handleMentorPhoto(mentor.id, event)}
            />
          </UploadLabel>
        </div>
        <div className="grid min-w-0 flex-1 gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <FieldLabel label="Nombre">
              <Input
                value={mentor.name}
                onChange={(event) =>
                  updateMentor(mentor.id, { name: event.target.value })
                }
              />
            </FieldLabel>
            <FieldLabel label="Perfil">
              <Input
                value={mentor.title}
                onChange={(event) =>
                  updateMentor(mentor.id, { title: event.target.value })
                }
              />
            </FieldLabel>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <FieldLabel label="Correo">
              <Input
                value={mentor.email}
                onChange={(event) =>
                  updateMentor(mentor.id, { email: event.target.value })
                }
                placeholder="correo@dominio.cl"
              />
            </FieldLabel>
            <FieldLabel label="Teléfono">
              <Input
                value={mentor.phone}
                onChange={(event) =>
                  updateMentor(mentor.id, { phone: event.target.value })
                }
                placeholder="+56"
              />
            </FieldLabel>
          </div>
          <FieldLabel label="Especialidades">
            <Input
              value={mentor.expertise.join(', ')}
              onChange={(event) =>
                updateMentor(mentor.id, {
                  expertise: event.target.value
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
          </FieldLabel>
          <FieldLabel label="Bio">
            <Textarea
              value={mentor.bio}
              onChange={(event) =>
                updateMentor(mentor.id, { bio: event.target.value })
              }
              className="min-h-20"
            />
          </FieldLabel>
        </div>
      </div>
      <div className="mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-3">
        <MiniStat label="Mentorías" value={stats.total} />
        <MiniStat label="Terminadas" value={stats.finished} />
        <MiniStat label="Horas" value={formatHours(stats.hours)} />
      </div>
    </article>
  );
}

function MenteeCard({
  mentee,
  stats,
  updateMentee,
  handleMenteePhoto,
}: {
  mentee: Mentee;
  stats: ReturnType<typeof getMenteeStats>;
  updateMentee: (menteeId: string, patch: Partial<Mentee>) => void;
  handleMenteePhoto: (
    menteeId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
}) {
  return (
    <article className="rounded-lg border border-emerald-950/10 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex shrink-0 flex-col items-start gap-3">
          <Avatar name={mentee.name} photo={mentee.photo} size="lg" />
          <UploadLabel icon={<Camera />} label="Foto">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => handleMenteePhoto(mentee.id, event)}
            />
          </UploadLabel>
        </div>
        <div className="grid min-w-0 flex-1 gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <FieldLabel label="Nombre">
              <Input
                value={mentee.name}
                onChange={(event) =>
                  updateMentee(mentee.id, { name: event.target.value })
                }
              />
            </FieldLabel>
            <FieldLabel label="Emprendimiento">
              <Input
                value={mentee.venture}
                onChange={(event) =>
                  updateMentee(mentee.id, { venture: event.target.value })
                }
              />
            </FieldLabel>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <FieldLabel label="Etapa">
              <Input
                value={mentee.stage}
                onChange={(event) =>
                  updateMentee(mentee.id, { stage: event.target.value })
                }
              />
            </FieldLabel>
            <FieldLabel label="Correo">
              <Input
                value={mentee.email}
                onChange={(event) =>
                  updateMentee(mentee.id, { email: event.target.value })
                }
                placeholder="correo@dominio.cl"
              />
            </FieldLabel>
            <FieldLabel label="Teléfono">
              <Input
                value={mentee.phone}
                onChange={(event) =>
                  updateMentee(mentee.id, { phone: event.target.value })
                }
                placeholder="+56"
              />
            </FieldLabel>
          </div>
          <FieldLabel label="Necesidad principal">
            <Textarea
              value={mentee.need}
              onChange={(event) =>
                updateMentee(mentee.id, { need: event.target.value })
              }
              className="min-h-20"
            />
          </FieldLabel>
        </div>
      </div>
      <div className="mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-3">
        <MiniStat label="Mentorías" value={stats.total} />
        <MiniStat label="Terminadas" value={stats.finished} />
        <MiniStat label="Sesiones" value={stats.completedSessions} />
      </div>
    </article>
  );
}

function MentorshipCard({
  mentorship,
  mentor,
  mentee,
  mentors,
  mentees,
  canEdit,
  updateMentorship,
  updateSession,
  handleSessionAttachment,
}: {
  mentorship: Mentorship;
  mentor?: Mentor;
  mentee?: Mentee;
  mentors: Mentor[];
  mentees: Mentee[];
  canEdit: boolean;
  updateMentorship: (mentorshipId: string, patch: Partial<Mentorship>) => void;
  updateSession: (
    mentorshipId: string,
    sessionNumber: number,
    patch: Partial<SessionRecord>,
  ) => void;
  handleSessionAttachment: (
    mentorshipId: string,
    sessionNumber: number,
    event: ChangeEvent<HTMLInputElement>,
    field: 'photo' | 'document',
  ) => void;
}) {
  const completed = mentorship.sessions.filter(
    (session) => session.status === 'Realizada',
  ).length;
  const progress = Math.round((completed / 6) * 100);

  return (
    <article className="rounded-lg border border-emerald-950/10 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={statusTones[mentorship.status]}>
              {mentorship.status}
            </Badge>
            <Badge variant="outline">N° {mentorship.sourceNumber}</Badge>
            <span className="text-sm text-muted-foreground">
              {mentorship.month || 'Mes pendiente'}
            </span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <PersonLine person={mentor} fallback="Mentor por asignar" />
            <span className="hidden text-muted-foreground sm:block">→</span>
            <PersonLine person={mentee} fallback="Mentoreado por asignar" />
          </div>
        </div>
        <div className="min-w-[220px]">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Avance sesiones</span>
            <span className="tabular-nums text-muted-foreground">
              {completed}/6
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-4">
        <FieldLabel label="Mentor">
          <NativeSelect
            value={mentorship.mentorId}
            onChange={(event) =>
              updateMentorship(mentorship.id, { mentorId: event.target.value })
            }
            disabled={!canEdit}
            className="w-full"
            aria-label="Mentor asignado"
          >
            {mentors.map((item) => (
              <NativeSelectOption key={item.id} value={item.id}>
                {item.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FieldLabel>
        <FieldLabel label="Mentoreado">
          <NativeSelect
            value={mentorship.menteeId}
            onChange={(event) =>
              updateMentorship(mentorship.id, { menteeId: event.target.value })
            }
            disabled={!canEdit}
            className="w-full"
            aria-label="Mentoreado asignado"
          >
            {mentees.map((item) => (
              <NativeSelectOption key={item.id} value={item.id}>
                {item.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FieldLabel>
        <FieldLabel label="Estado">
          <NativeSelect
            value={mentorship.status}
            onChange={(event) =>
              updateMentorship(mentorship.id, {
                status: event.target.value as MentorshipStatus,
              })
            }
            disabled={!canEdit}
            className="w-full"
            aria-label="Estado"
          >
            {MENTORSHIP_STATUSES.map((status) => (
              <NativeSelectOption key={status} value={status}>
                {status}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FieldLabel>
        <FieldLabel label="Horas">
          <Input
            type="number"
            min="0"
            step="0.5"
            value={mentorship.hours}
            disabled={!canEdit}
            onChange={(event) =>
              updateMentorship(mentorship.id, {
                hours: Number(event.target.value),
              })
            }
          />
        </FieldLabel>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <FieldLabel label="Servicio">
          <NativeSelect
            value={mentorship.service}
            onChange={(event) =>
              updateMentorship(mentorship.id, { service: event.target.value })
            }
            disabled={!canEdit}
            className="w-full"
            aria-label="Servicio entregado"
          >
            <NativeSelectOption value="">Sin servicio</NativeSelectOption>
            {SERVICES.map((service) => (
              <NativeSelectOption key={service} value={service}>
                {service}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FieldLabel>
        <FieldLabel label="Formalización">
          <CheckSelect
            value={mentorship.formalization}
            disabled={!canEdit}
            onChange={(value) =>
              updateMentorship(mentorship.id, { formalization: value })
            }
          />
        </FieldLabel>
        <FieldLabel label="Planificación SIR">
          <CheckSelect
            value={mentorship.planningSir}
            disabled={!canEdit}
            onChange={(value) =>
              updateMentorship(mentorship.id, { planningSir: value })
            }
          />
        </FieldLabel>
        <FieldLabel label="Ejecución SIR">
          <CheckSelect
            value={mentorship.executionSir}
            disabled={!canEdit}
            onChange={(value) =>
              updateMentorship(mentorship.id, { executionSir: value })
            }
          />
        </FieldLabel>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_1fr_2fr]">
        <FieldLabel label="Espacio utilizado">
          <Input
            value={mentorship.space}
            disabled={!canEdit}
            onChange={(event) =>
              updateMentorship(mentorship.id, { space: event.target.value })
            }
          />
        </FieldLabel>
        <FieldLabel label="Pagada en">
          <Input
            type="date"
            value={mentorship.paidAt}
            disabled={!canEdit}
            onChange={(event) =>
              updateMentorship(mentorship.id, { paidAt: event.target.value })
            }
          />
        </FieldLabel>
        <FieldLabel label="Objetivo / foco">
          <Input
            value={mentorship.goal}
            disabled={!canEdit}
            onChange={(event) =>
              updateMentorship(mentorship.id, { goal: event.target.value })
            }
          />
        </FieldLabel>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {mentorship.sessions.map((session) => (
          <SessionTile
            key={session.number}
            session={session}
            mentorshipId={mentorship.id}
            canEdit={canEdit}
            updateSession={updateSession}
            handleSessionAttachment={handleSessionAttachment}
          />
        ))}
      </div>
    </article>
  );
}

function SessionTile({
  session,
  mentorshipId,
  canEdit,
  updateSession,
  handleSessionAttachment,
}: {
  session: SessionRecord;
  mentorshipId: string;
  canEdit: boolean;
  updateSession: (
    mentorshipId: string,
    sessionNumber: number,
    patch: Partial<SessionRecord>,
  ) => void;
  handleSessionAttachment: (
    mentorshipId: string,
    sessionNumber: number,
    event: ChangeEvent<HTMLInputElement>,
    field: 'photo' | 'document',
  ) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/25 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Badge variant="outline" className={sessionTones[session.status]}>
          Sesión {session.number}
        </Badge>
        <NativeSelect
          value={session.status}
          onChange={(event) => {
            const nextStatus = event.target.value as SessionStatus;
            updateSession(mentorshipId, session.number, {
              status: nextStatus,
              date:
                nextStatus === 'Realizada' && !session.date
                  ? todayIso()
                  : session.date,
            });
          }}
          disabled={!canEdit}
          aria-label={`Estado sesión ${session.number}`}
          className="w-36"
          size="sm"
        >
          {SESSION_STATUSES.map((status) => (
            <NativeSelectOption key={status} value={status}>
              {status}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <div className="grid gap-2">
        <Input
          type="date"
          value={session.date}
          disabled={!canEdit}
          onChange={(event) =>
            updateSession(mentorshipId, session.number, {
              date: event.target.value,
            })
          }
          aria-label={`Fecha sesión ${session.number}`}
        />
        <Textarea
          value={session.summary}
          disabled={!canEdit}
          onChange={(event) =>
            updateSession(mentorshipId, session.number, {
              summary: event.target.value,
            })
          }
          placeholder="Resumen de acuerdos"
          className="min-h-20"
          aria-label={`Resumen sesión ${session.number}`}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <UploadLabel icon={<Camera />} label="Foto" disabled={!canEdit}>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={!canEdit}
            onChange={(event) =>
              handleSessionAttachment(
                mentorshipId,
                session.number,
                event,
                'photo',
              )
            }
          />
        </UploadLabel>
        <UploadLabel icon={<Upload />} label="Documento" disabled={!canEdit}>
          <input
            type="file"
            className="sr-only"
            disabled={!canEdit}
            onChange={(event) =>
              handleSessionAttachment(
                mentorshipId,
                session.number,
                event,
                'document',
              )
            }
          />
        </UploadLabel>
      </div>

      {session.photo || session.document ? (
        <div className="mt-3 grid gap-2">
          {session.photo ? (
            <AttachmentPill attachment={session.photo} icon={<Camera />} />
          ) : null}
          {session.document ? (
            <AttachmentPill attachment={session.document} icon={<File />} />
          ) : null}
        </div>
      ) : null}
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

  return (
    <div
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-lg bg-[#0f322e] font-semibold text-white',
        sizeClass,
      )}
    >
      {photo ? (
        <img src={photo} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials(name)
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
      <Avatar name={person?.name ?? fallback} photo={person?.photo} size={small ? 'sm' : 'md'} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">
          {person?.name ?? fallback}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {'title' in (person ?? {}) ? (person as Mentor).title : (person as Mentee | undefined)?.venture || 'Sin emprendimiento'}
        </p>
      </div>
    </div>
  );
}

function UploadLabel({
  icon,
  label,
  disabled,
  children,
}: {
  icon: ReactNode;
  label: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-2.5 text-sm font-medium transition-colors hover:bg-muted [&_svg]:size-4',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      {icon}
      {label}
      {children}
    </label>
  );
}

function AttachmentPill({
  attachment,
  icon,
}: {
  attachment: Attachment;
  icon: ReactNode;
}) {
  return (
    <a
      href={attachment.dataUrl}
      download={attachment.name}
      className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-white px-2.5 py-2 text-xs font-medium hover:bg-muted"
    >
      <span className="shrink-0 text-primary [&_svg]:size-3.5">{icon}</span>
      <span className="truncate">{attachment.name}</span>
      <span className="ml-auto shrink-0 text-muted-foreground">
        {fileSizeLabel(attachment.size)}
      </span>
    </a>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-muted/45 px-3 py-2">
      <p className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function CheckSelect({
  value,
  disabled,
  onChange,
}: {
  value: CheckValue;
  disabled?: boolean;
  onChange: (value: CheckValue) => void;
}) {
  return (
    <NativeSelect
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as CheckValue)}
      className="w-full"
      aria-label="Estado de control"
    >
      {CHECK_OPTIONS.map((option) => (
        <NativeSelectOption key={option} value={option}>
          {option}
        </NativeSelectOption>
      ))}
    </NativeSelect>
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

function ExcelPreviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/10 p-3">
      <p className="text-xs font-semibold uppercase text-emerald-100">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function getMetrics(state: AppState) {
  const sessions = state.mentorships.flatMap((mentorship) => mentorship.sessions);
  const finished = state.mentorships.filter(
    (mentorship) => mentorship.status === 'Terminada',
  ).length;

  return {
    mentors: state.mentors.length,
    mentees: state.mentees.length,
    mentorships: state.mentorships.length,
    activeMentorships: state.mentorships.filter((mentorship) =>
      ['En proceso', 'Derivada', 'Esperando derivación'].includes(
        mentorship.status,
      ),
    ).length,
    finished,
    hours: state.mentorships.reduce((sum, mentorship) => sum + mentorship.hours, 0),
    completedSessions: sessions.filter((session) => session.status === 'Realizada').length,
    evidenceCount: sessions.reduce(
      (sum, session) =>
        sum + (session.photo ? 1 : 0) + (session.document ? 1 : 0),
      0,
    ),
    completionRate:
      state.mentorships.length === 0
        ? 0
        : Math.round((finished / state.mentorships.length) * 100),
  };
}

function getMentorStats(mentorId: string, mentorships: Mentorship[]) {
  const assigned = mentorships.filter((mentorship) => mentorship.mentorId === mentorId);

  return {
    total: assigned.length,
    finished: assigned.filter((mentorship) => mentorship.status === 'Terminada').length,
    hours: assigned.reduce((sum, mentorship) => sum + mentorship.hours, 0),
  };
}

function getMenteeStats(menteeId: string, mentorships: Mentorship[]) {
  const assigned = mentorships.filter((mentorship) => mentorship.menteeId === menteeId);

  return {
    total: assigned.length,
    finished: assigned.filter((mentorship) => mentorship.status === 'Terminada').length,
    completedSessions: assigned.reduce(
      (sum, mentorship) =>
        sum +
        mentorship.sessions.filter((session) => session.status === 'Realizada').length,
      0,
    ),
  };
}

async function imageToBase64(path: string) {
  try {
    const response = await fetch(path);
    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function addWorkbookHeader(
  worksheet: any,
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
  worksheet: any,
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
  headerRow.eachCell((cell: any) => {
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
    dataRow.eachCell((cell: any) => {
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

function excelBorder() {
  return {
    top: { style: 'thin', color: { argb: 'FFDDE5E1' } },
    left: { style: 'thin', color: { argb: 'FFDDE5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFDDE5E1' } },
    right: { style: 'thin', color: { argb: 'FFDDE5E1' } },
  };
}

function addSummarySheet(workbook: any, logoId: number | undefined, state: AppState) {
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
      state.mentorships.filter((mentorship) => mentorship.status === status).length,
    ]),
    [32, 18],
  );
}

function addMentorsSheet(workbook: any, logoId: number | undefined, state: AppState) {
  const worksheet = workbook.addWorksheet('Mentores');
  addWorkbookHeader(worksheet, logoId, 'Mentores', 'Perfiles y carga asignada');
  addStyledTable(
    worksheet,
    ['Nombre', 'Perfil', 'Correo', 'Teléfono', 'Especialidades', 'Mentorías', 'Terminadas', 'Horas'],
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

function addMenteesSheet(workbook: any, logoId: number | undefined, state: AppState) {
  const worksheet = workbook.addWorksheet('Mentoreados');
  addWorkbookHeader(
    worksheet,
    logoId,
    'Mentoreados',
    'Fichas de participantes y emprendimientos',
  );
  addStyledTable(
    worksheet,
    ['Nombre', 'Emprendimiento', 'Etapa', 'Correo', 'Teléfono', 'Necesidad', 'Mentorías', 'Sesiones realizadas'],
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

function addMentorshipsSheet(
  workbook: any,
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
      const mentor = state.mentors.find((item) => item.id === mentorship.mentorId);
      const mentee = state.mentees.find((item) => item.id === mentorship.menteeId);

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
        mentorship.sessions.filter((session) => session.status === 'Realizada').length,
        mentorship.goal,
      ];
    }),
    [10, 28, 28, 16, 12, 22, 22, 36, 18, 20, 18, 16, 18, 44],
  );
}

function addSessionsSheet(
  workbook: any,
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
    const mentor = state.mentors.find((item) => item.id === mentorship.mentorId);
    const mentee = state.mentees.find((item) => item.id === mentorship.menteeId);

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
