'use client';
import Image from 'next/image';
import { CreateRecordDialog } from '@/components/create-record-dialog';
import { PersonFields } from '@/components/person-fields';
import { ProgramGraphic } from '@/components/program-graphic';
import { MentorshipWorkspace } from '@/components/mentorship-workspace';
import { PeopleWorkspace, PersonProfile } from '@/components/people-workspace';
import { ExportWorkspace } from '@/components/export-workspace';
import { DashboardWorkspace } from '@/components/dashboard-workspace';

import { useEffect, useState, type ReactNode } from 'react';
import {
  CalendarDays,
  ClipboardCheck,
  Clock3,
  FileSpreadsheet,
  LayoutDashboard,
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

import { Button } from '@/components/ui/button';
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
  MONTHS,
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
} from '@/lib/mentorias/domain';

const STORAGE_KEY = 'creaempresa-mentorias-app-v2';
const LOGO_PATH = '/logoinacap.png';

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

  const browseMentorships = (status?: MentorshipStatus) => {
    setMentorshipToOpen(null);
    setSearch('');
    setStatusFilter(status ?? 'Todos');
    setActiveView('mentorships');
    window.scrollTo({ top: 0 });
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
              <DashboardWorkspace
                state={state}
                onOpenMentorship={openMentorship}
                onBrowseMentorships={browseMentorships}
                createAction={
                  <NewMentorshipForm
                    state={state}
                    newMentorship={newMentorship}
                    setNewMentorship={setNewMentorship}
                    addMentorship={addMentorship}
                  />
                }
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

            {activeView === 'export' && role !== 'Mentoreado' ? (
              <ExportWorkspace
                state={scopedState}
                hasUnsavedChanges={hasChanges}
                heading={
                  <PageHeading
                    eyebrow="Informes"
                    title="Excel a tu medida"
                    body="Elige qué compartir, revisa el resultado y llévalo contigo."
                  />
                }
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
