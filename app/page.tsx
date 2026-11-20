'use client';
import Image from 'next/image';
import { CreateRecordDialog } from '@/components/create-record-dialog';
import { PersonFields } from '@/components/person-fields';
import { ProgramGraphic } from '@/components/program-graphic';

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import {
  CalendarDays,
  Camera,
  ClipboardCheck,
  Clock3,
  Download,
  File,
  FileSpreadsheet,
  FolderOpen,
  LayoutDashboard,
  Paperclip,
  Search,
  Upload,
  User,
  UserCheck,
  Users,
  Mail,
  Phone,
  BriefcaseBusiness,
  Target,
  MapPin,
  BadgeCheck,
  ChevronRight,
  LogOut,
  RefreshCw,
  Save,
  PencilLine,
  Sparkles,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ProgramSelect as NativeSelect,
  ProgramOption as NativeSelectOption,
} from '@/components/program-select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { MentoriasAccess } from '@/components/mentorias-access';
import {
  MentoriasRepository,
  type Workspace,
} from '@/lib/mentorias/repository';
import { scopeState, validateFile, programDate } from '@/lib/mentorias/access';
import { collectChanges } from '@/lib/mentorias/changes';
import {
  getMetrics,
  getMentorStats,
  getMenteeStats,
} from '@/lib/mentorias/metrics';
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
  CHECK_OPTIONS,
  SESSION_STATUSES,
  ROLES,
  type Role,
  type View,
  type MentorshipStatus,
  type SessionStatus,
  type CheckValue,
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

function todayIso() {
  return programDate();
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
  const [role, setRole] = useState<Role>(workspace?.role ?? 'Administrador');
  const [activeView, setActiveView] = useState<View>(
    defaultViewForRole(workspace?.role ?? 'Administrador'),
  );
  const [activeMentorId, setActiveMentorId] = useState(
    workspace?.mentorId ?? DEFAULT_MENTORS[0].id,
  );
  const [activeMenteeId, setActiveMenteeId] = useState(
    workspace?.menteeId ?? DEFAULT_MENTEES[0].id,
  );
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

  const scopedState = scopeState(
    state,
    role,
    activeMentor?.id,
    activeMentee?.id,
  );
  const metrics = getMetrics(scopedState);
  const navigation = getNavigation(role);

  const updateMentor = (mentorId: string, patch: Partial<Mentor>) => {
    if (
      role !== 'Administrador' &&
      (role !== 'Mentor' || mentorId !== activeMentor?.id)
    )
      return;
    setState((current) => ({
      ...current,
      mentors: current.mentors.map((mentor) =>
        mentor.id === mentorId ? { ...mentor, ...patch } : mentor,
      ),
    }));
  };

  const updateMentee = (menteeId: string, patch: Partial<Mentee>) => {
    if (
      role !== 'Administrador' &&
      (role !== 'Mentoreado' || menteeId !== activeMentee?.id)
    )
      return;
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
    const target = mentorships.find((m) => m.id === mentorshipId);
    if (
      !target ||
      role === 'Mentoreado' ||
      (role === 'Mentor' && target.mentorId !== activeMentor?.id)
    )
      return;
    if (
      role !== 'Administrador' &&
      [
        'mentorId',
        'menteeId',
        'paidAt',
        'formalization',
        'planningSir',
        'executionSir',
      ].some((k) => k in patch)
    )
      return;
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
    const target = mentorships.find((m) => m.id === mentorshipId);
    if (
      !target ||
      target.status !== 'En proceso' ||
      role === 'Mentoreado' ||
      (role === 'Mentor' && target.mentorId !== activeMentor?.id)
    )
      return;
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
    if (repository) return;
    setRole(nextRole);
    setActiveView(defaultViewForRole(nextRole));
    setSearch('');
    setStatusFilter('Todos');
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

  const upload = async (
    event: ChangeEvent<HTMLInputElement>,
    kind: 'photo' | 'document',
    prefix: string,
    commit: (attachment: Attachment) => void,
  ) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setSaveWarning('');
    try {
      await validateFile(file, kind);
      const attachment = repository
        ? await repository.upload(file, kind, prefix)
        : await readFile(file);
      commit(attachment);
    } catch (error) {
      setSaveWarning(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar el archivo. Guarda primero el registro y vuelve a intentar.',
      );
    } finally {
      input.value = '';
    }
  };
  const handleMentorPhoto = (
    id: string,
    event: ChangeEvent<HTMLInputElement>,
  ) =>
    upload(event, 'photo', `mentors/${id}`, (a) =>
      updateMentor(id, { photo: a.dataUrl, photoPath: a.path }),
    );
  const handleMenteePhoto = (
    id: string,
    event: ChangeEvent<HTMLInputElement>,
  ) =>
    upload(event, 'photo', `mentees/${id}`, (a) =>
      updateMentee(id, { photo: a.dataUrl, photoPath: a.path }),
    );
  const handleSessionAttachment = (
    id: string,
    number: number,
    event: ChangeEvent<HTMLInputElement>,
    field: 'photo' | 'document',
  ) =>
    upload(event, field, `sessions/${id}/${number}`, (a) =>
      updateSession(id, number, { [field]: a }),
    );

  const resetDemo = () => {
    if (repository) return;
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
      <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white/95 px-5 py-3 text-sm backdrop-blur">
        <div aria-live="polite">
          <strong>
            {repository
              ? 'Cuenta del programa'
              : 'Demostración · datos de este navegador'}
          </strong>
          <span className="ml-3">
            {saving
              ? 'Guardando…'
              : hasChanges
                ? 'Cambios sin guardar'
                : repository
                  ? 'Todo guardado'
                  : 'Guardado en este navegador'}
          </span>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          {repository && (
            <>
              <Button
                onClick={() => void saveChanges()}
                disabled={saving || !hasChanges}
              >
                <Save size={15} /> Guardar cambios
              </Button>
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
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-lg border border-red-100 bg-white shadow-sm">
                <Image
                  unoptimized
                  width={96}
                  height={96}
                  src={LOGO_PATH}
                  alt="INACAP"
                  className="h-9 w-auto object-contain"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">
                  Crea Empresa
                </p>
                <h1 className="text-xl font-semibold sm:text-2xl">
                  Gestión de mentorías
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {repository ? (
                <Badge
                  variant="outline"
                  className="gap-2 rounded-full px-4 py-2"
                >
                  <User className="size-4" />
                  {role}
                </Badge>
              ) : (
                <NativeSelect
                  value={role}
                  onChange={(event) =>
                    handleRoleChange(event.target.value as Role)
                  }
                  aria-label="Rol activo"
                  disabled={repository !== null}
                  className="w-44"
                >
                  {ROLES.map((item) => (
                    <NativeSelectOption key={item} value={item}>
                      {item}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}

              {!repository && role === 'Mentor' && activeMentor ? (
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

              {!repository && role === 'Mentoreado' && activeMentee ? (
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

              {!repository && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetDemo}
                  disabled={repository !== null}
                >
                  <RefreshCw size={15} /> Reiniciar demo
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-[1500px] gap-7 px-4 py-7 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8">
          <aside className="workspace-sidebar min-w-0 rounded-2xl border border-zinc-200 bg-white p-3 lg:sticky lg:top-24 lg:self-start">
            <nav
              className="flex gap-1 overflow-x-auto lg:grid"
              aria-label="Secciones"
            >
              {navigation.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
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
                </button>
              ))}
            </nav>

            <div className="mt-6 hidden rounded-xl bg-zinc-950 p-4 text-white lg:block">
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

            {activeView === 'profile' &&
            role === 'Mentoreado' &&
            activeMentee ? (
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
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <h2 className="text-lg font-semibold">Panel administrador</h2>
              <p className="text-sm text-muted-foreground">
                Vista general por estado, servicio y avance de sesiones.
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-red-200 bg-red-50 text-red-700"
            >
              Admin
            </Badge>
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
  newMentor: {
    name: string;
    expertise: string;
    email: string;
    password: string;
    phone: string;
  };
  setNewMentor: (value: {
    name: string;
    expertise: string;
    email: string;
    password: string;
    phone: string;
  }) => void;
  addMentor: () => Promise<void>;
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
        body="Las personas que acompañan cada proyecto. Gestiona sus perfiles y áreas de experiencia."
      />

      <div className="flex justify-end">
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
            onChange={(patch) => setNewMentor({ ...newMentor, ...patch })}
          />
        </CreateRecordDialog>
      </div>

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
  newMentee: {
    name: string;
    venture: string;
    email: string;
    password: string;
    phone: string;
  };
  setNewMentee: (value: {
    name: string;
    venture: string;
    email: string;
    password: string;
    phone: string;
  }) => void;
  addMentee: () => Promise<void>;
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

      <div className="flex justify-end">
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
            onChange={(patch) => setNewMentee({ ...newMentee, ...patch })}
          />
        </CreateRecordDialog>
      </div>

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
  const myMentorships = mentorships.filter(
    (item) => item.mentorId === mentor.id,
  );
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
  const myMentorships = mentorships.filter(
    (item) => item.menteeId === mentee.id,
  );

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
  createAction,
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
  createAction: ReactNode;
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
        body="Cada encuentro cuenta. Revisa avances, registra acuerdos y conserva las evidencias."
      />

      <div className="flex justify-end">{createAction}</div>
      <section className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_220px]">
          <label htmlFor="mentorship-search" className="relative block">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="mentorship-search"
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
            <NativeSelectOption value="Todos">
              Todos los estados
            </NativeSelectOption>
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
              canManage={role === 'Administrador'}
              updateMentorship={updateMentorship}
              updateSession={updateSession}
              handleSessionAttachment={handleSessionAttachment}
            />
          ))
        ) : (
          <EmptyState
            title="Sin resultados"
            body="No hay mentorías para los filtros seleccionados."
          />
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
    <article className="surface-card p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span className="grid size-10 place-items-center rounded-xl bg-red-50 text-red-700 [&_svg]:size-4">
          {icon}
        </span>
        {label}
      </div>
      <p className="text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
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
    <div className="page-heading">
      <div className="relative z-10 min-w-0">
        <p className="page-eyebrow">
          <span />
          {eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-[2.1rem]">
          {title}
        </h2>
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

function SpecialtiesInput({
  expertise,
  onChange,
}: {
  expertise: string[];
  onChange: (value: string[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  return (
    <Input
      value={editing ? draft : expertise.join(', ')}
      placeholder="Ej. Finanzas, ventas, gestión"
      maxLength={150}
      onFocus={() => {
        setDraft(expertise.join(', '));
        setEditing(true);
      }}
      onBlur={() => setEditing(false)}
      onChange={(event) => {
        setDraft(event.target.value);
        onChange(
          event.target.value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        );
      }}
    />
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
    <article className="surface-card p-5">
      <div className="mb-5 flex items-center gap-4">
        <Avatar name={mentor.name} photo={mentor.photo} size="lg" />
        <div className="min-w-0">
          <h3 className="break-words text-lg font-semibold tracking-tight">
            {mentor.name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {mentor.title || 'Perfil del programa'}
          </p>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {mentor.expertise.map((item) => (
          <span key={item} className="expertise-chip">
            <Sparkles size={11} />
            {item}
          </span>
        ))}
      </div>
      {mentor.email && (
        <p className="mb-4 flex items-center gap-2 break-all text-xs text-muted-foreground">
          <Mail size={14} className="shrink-0" />
          {mentor.email}
        </p>
      )}
      <details className="group">
        <summary className="profile-edit-toggle">
          <PencilLine size={15} className="inline mr-2" aria-hidden="true" />
          Editar ficha
          <ChevronRight size={15} className="float-right" aria-hidden="true" />
        </summary>
        <p className="mt-3 text-xs text-muted-foreground">
          Al terminar, pulsa Guardar cambios en la barra superior. En
          demostración, los cambios se conservan solo en este navegador.
        </p>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row">
          <div className="flex shrink-0 flex-col items-start gap-3">
            <UploadLabel
              icon={<Camera />}
              label={mentor.photo ? 'Cambiar foto' : 'Añadir foto'}
            >
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="sr-only"
                onChange={(event) => handleMentorPhoto(mentor.id, event)}
              />
            </UploadLabel>
          </div>
          <div className="grid min-w-0 flex-1 gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <FieldLabel label="Nombre completo">
                <Input
                  maxLength={100}
                  value={mentor.name}
                  onChange={(event) =>
                    updateMentor(mentor.id, { name: event.target.value })
                  }
                />
              </FieldLabel>
              <FieldLabel label="Profesión (opcional)">
                <Input
                  maxLength={150}
                  placeholder="Ej. Contador auditor"
                  value={mentor.title}
                  onChange={(event) =>
                    updateMentor(mentor.id, { title: event.target.value })
                  }
                />
              </FieldLabel>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <FieldLabel label="Correo de contacto">
                <Input
                  type="email"
                  maxLength={254}
                  value={mentor.email}
                  onChange={(event) =>
                    updateMentor(mentor.id, { email: event.target.value })
                  }
                  placeholder="correo@dominio.cl"
                />
              </FieldLabel>
              <FieldLabel label="Teléfono">
                <Input
                  type="tel"
                  maxLength={30}
                  value={mentor.phone}
                  onChange={(event) =>
                    updateMentor(mentor.id, { phone: event.target.value })
                  }
                  placeholder="Ej. +56 9 1234 5678"
                />
              </FieldLabel>
            </div>
            <FieldLabel label="Especialidades">
              <SpecialtiesInput
                expertise={mentor.expertise}
                onChange={(expertise) => updateMentor(mentor.id, { expertise })}
              />
            </FieldLabel>
            <FieldLabel label="Sobre mí">
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
      </details>
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
    <article className="surface-card p-5">
      <div className="mb-5 flex items-center gap-4">
        <Avatar name={mentee.name} photo={mentee.photo} size="lg" />
        <div className="min-w-0">
          <h3 className="break-words text-lg font-semibold tracking-tight">
            {mentee.name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {mentee.venture || 'Perfil del programa'}
          </p>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {mentee.stage && (
          <span className="expertise-chip">
            <BriefcaseBusiness size={12} />
            {mentee.stage}
          </span>
        )}
        {mentee.need && (
          <p className="w-full text-xs leading-relaxed text-muted-foreground line-clamp-2">
            {mentee.need}
          </p>
        )}
      </div>
      {mentee.email && (
        <p className="mb-4 flex items-center gap-2 break-all text-xs text-muted-foreground">
          <Mail size={14} className="shrink-0" />
          {mentee.email}
        </p>
      )}
      <details className="group">
        <summary className="profile-edit-toggle">
          <PencilLine size={15} className="inline mr-2" aria-hidden="true" />
          Editar ficha
          <ChevronRight size={15} className="float-right" aria-hidden="true" />
        </summary>
        <p className="mt-3 text-xs text-muted-foreground">
          Al terminar, pulsa Guardar cambios en la barra superior. En
          demostración, los cambios se conservan solo en este navegador.
        </p>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row">
          <div className="flex shrink-0 flex-col items-start gap-3">
            <UploadLabel
              icon={<Camera />}
              label={mentee.photo ? 'Cambiar foto' : 'Añadir foto'}
            >
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="sr-only"
                onChange={(event) => handleMenteePhoto(mentee.id, event)}
              />
            </UploadLabel>
          </div>
          <div className="grid min-w-0 flex-1 gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <FieldLabel label="Nombre completo">
                <Input
                  maxLength={100}
                  value={mentee.name}
                  onChange={(event) =>
                    updateMentee(mentee.id, { name: event.target.value })
                  }
                />
              </FieldLabel>
              <FieldLabel label="Emprendimiento">
                <Input
                  maxLength={150}
                  value={mentee.venture}
                  onChange={(event) =>
                    updateMentee(mentee.id, { venture: event.target.value })
                  }
                />
              </FieldLabel>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <FieldLabel label="Etapa del emprendimiento">
                <Input
                  placeholder="Ej. Idea, en marcha o crecimiento"
                  maxLength={100}
                  value={mentee.stage}
                  onChange={(event) =>
                    updateMentee(mentee.id, { stage: event.target.value })
                  }
                />
              </FieldLabel>
              <FieldLabel label="Correo de contacto">
                <Input
                  type="email"
                  maxLength={254}
                  value={mentee.email}
                  onChange={(event) =>
                    updateMentee(mentee.id, { email: event.target.value })
                  }
                  placeholder="correo@dominio.cl"
                />
              </FieldLabel>
              <FieldLabel label="Teléfono">
                <Input
                  type="tel"
                  maxLength={30}
                  value={mentee.phone}
                  onChange={(event) =>
                    updateMentee(mentee.id, { phone: event.target.value })
                  }
                  placeholder="Ej. +56 9 1234 5678"
                />
              </FieldLabel>
            </div>
            <FieldLabel label="¿En qué necesita apoyo?">
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
      </details>
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
  canManage,
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
  canManage: boolean;
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
    <article className="surface-card p-5">
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
          {mentorship.service && (
            <p className="mb-3 text-sm text-muted-foreground">
              {mentorship.service}
            </p>
          )}
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

      {canEdit ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
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
            <FieldLabel label="Horas acumuladas">
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
          <div className="mt-3">
            <FieldLabel label="Objetivo de esta mentoría">
              <Textarea
                placeholder="Ej. Preparar un presupuesto mensual"
                value={mentorship.goal}
                disabled={!canEdit}
                onChange={(event) =>
                  updateMentorship(mentorship.id, { goal: event.target.value })
                }
              />
            </FieldLabel>
          </div>
          <details className="detail-panel mt-4 p-4">
            <summary className="cursor-pointer text-sm font-medium text-primary">
              Datos de la mentoría
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldLabel label="Servicio">
                  <NativeSelect
                    value={mentorship.service}
                    onChange={(event) =>
                      updateMentorship(mentorship.id, {
                        service: event.target.value,
                      })
                    }
                    disabled={!canEdit}
                    className="w-full"
                    aria-label="Servicio entregado"
                  >
                    <NativeSelectOption value="">
                      Sin servicio
                    </NativeSelectOption>
                    {SERVICES.map((service) => (
                      <NativeSelectOption key={service} value={service}>
                        {service}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </FieldLabel>
              </div>
              <FieldLabel label="Mes de inicio">
                <NativeSelect
                  value={mentorship.month}
                  disabled={!canEdit}
                  className="w-full"
                  onChange={(event) =>
                    updateMentorship(mentorship.id, {
                      month: event.target.value,
                    })
                  }
                >
                  <NativeSelectOption value="">Sin definir</NativeSelectOption>
                  {MONTHS.map((month) => (
                    <NativeSelectOption key={month} value={month}>
                      {month}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FieldLabel>
              <FieldLabel label="Espacio utilizado">
                <Input
                  value={mentorship.space}
                  disabled={!canEdit}
                  onChange={(event) =>
                    updateMentorship(mentorship.id, {
                      space: event.target.value,
                    })
                  }
                />
              </FieldLabel>
              {canManage && (
                <>
                  <FieldLabel label="Mentor">
                    <NativeSelect
                      value={mentorship.mentorId}
                      onChange={(event) =>
                        updateMentorship(mentorship.id, {
                          mentorId: event.target.value,
                        })
                      }
                      disabled={!canManage}
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
                        updateMentorship(mentorship.id, {
                          menteeId: event.target.value,
                        })
                      }
                      disabled={!canManage}
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
                </>
              )}
            </div>
          </details>
        </>
      ) : (
        <div className="mt-5 space-y-2 rounded-xl bg-zinc-50 p-4 text-sm">
          <p>
            <span className="font-medium">Objetivo: </span>
            {mentorship.goal || 'Aún no se ha definido.'}
          </p>
          <p className="text-muted-foreground">
            {formatHours(mentorship.hours)} horas acumuladas
            {mentorship.space ? ` · ${mentorship.space}` : ''}
          </p>
        </div>
      )}
      {canManage && (
        <details className="detail-panel mt-3 p-4">
          <summary className="cursor-pointer text-sm font-medium text-primary">
            Seguimiento administrativo
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <FieldLabel label="Formalización">
              <CheckSelect
                value={mentorship.formalization}
                disabled={!canManage}
                onChange={(value) =>
                  updateMentorship(mentorship.id, { formalization: value })
                }
              />
            </FieldLabel>
            <FieldLabel label="Planificación SIR">
              <CheckSelect
                value={mentorship.planningSir}
                disabled={!canManage}
                onChange={(value) =>
                  updateMentorship(mentorship.id, { planningSir: value })
                }
              />
            </FieldLabel>
            <FieldLabel label="Ejecución SIR">
              <CheckSelect
                value={mentorship.executionSir}
                disabled={!canManage}
                onChange={(value) =>
                  updateMentorship(mentorship.id, { executionSir: value })
                }
              />
            </FieldLabel>
            <FieldLabel label="Fecha de pago">
              <Input
                type="date"
                value={mentorship.paidAt}
                disabled={!canManage}
                onChange={(event) =>
                  updateMentorship(mentorship.id, {
                    paidAt: event.target.value,
                  })
                }
              />
            </FieldLabel>
          </div>
        </details>
      )}
      <div className="mt-6 border-t pt-5">
        <h3 className="font-semibold">Sesiones</h3>
        {canEdit && mentorship.status !== 'En proceso' && (
          <p className="mt-1 text-sm text-muted-foreground">
            Las sesiones están en modo consulta. Para actualizarlas, cambia el
            estado de la mentoría a En proceso.
          </p>
        )}
      </div>
      {mentorship.sessions.length === 0 && (
        <p className="mt-4 text-sm text-amber-800">
          No se pudieron cargar las sesiones. Pulsa Actualizar en la barra
          superior.
        </p>
      )}
      <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {mentorship.sessions.map((session) => (
          <SessionTile
            key={session.number}
            session={session}
            mentorshipId={mentorship.id}
            canEdit={canEdit && mentorship.status === 'En proceso'}
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
    <details
      className="session-card self-start rounded-xl border border-border bg-white p-4"
      open={session.number === 1}
    >
      <summary className="cursor-pointer text-sm font-semibold">
        Sesión {session.number}
        <Badge
          variant="outline"
          className={cn('ml-3', sessionTones[session.status])}
        >
          {session.status}
        </Badge>
        <p className="mt-1 text-sm font-normal text-muted-foreground">
          {session.date
            ? new Date(`${session.date}T12:00:00`).toLocaleDateString('es-CL', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : 'Sin fecha'}{' '}
          ·{' '}
          {session.photo || session.document
            ? 'Con evidencias'
            : 'Sin evidencias'}
        </p>
      </summary>
      <div className="mt-4 border-t pt-4">
        {canEdit ? (
          <>
            <div className="mb-3">
              <FieldLabel label="Estado de la sesión">
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
                  className="w-full"
                  size="sm"
                >
                  {SESSION_STATUSES.map((status) => (
                    <NativeSelectOption key={status} value={status}>
                      {status}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FieldLabel>
            </div>

            <div className="grid gap-2">
              <FieldLabel label="Fecha de la sesión">
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
              </FieldLabel>
              <FieldLabel label="Acuerdos y próximos pasos">
                <Textarea
                  value={session.summary}
                  disabled={!canEdit}
                  onChange={(event) =>
                    updateSession(mentorshipId, session.number, {
                      summary: event.target.value,
                    })
                  }
                  placeholder="¿Qué se trabajó y qué queda pendiente?"
                  className="min-h-20"
                  aria-label={`Resumen sesión ${session.number}`}
                />
              </FieldLabel>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <UploadLabel
                icon={<Camera />}
                label={session.photo ? 'Cambiar foto' : 'Añadir foto'}
                disabled={!canEdit}
              >
                <input
                  type="file"
                  accept="image/png,image/jpeg"
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
              <UploadLabel
                icon={<Upload />}
                label={session.document ? 'Cambiar PDF' : 'Añadir PDF'}
                disabled={!canEdit}
              >
                <input
                  type="file"
                  accept="application/pdf"
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

            <p className="mt-2 text-xs text-muted-foreground">
              Foto JPG o PNG (máx. 2 MB) · PDF (máx. 5 MB).
            </p>
          </>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {session.summary || 'Aún no hay acuerdos registrados.'}
          </p>
        )}

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
    </details>
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
        'grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-zinc-100 font-semibold ring-1 ring-inset ring-black/5',
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
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
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
