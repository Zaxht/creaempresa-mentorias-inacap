'use client';
import Image from 'next/image';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CalendarDays,
  Clock3,
  Camera,
  FileText,
  PencilLine,
  SlidersHorizontal,
  Search,
  X,
  LoaderCircle,
  Paperclip,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { ProgramSelect, ProgramOption } from './program-select';
import { validateFile, programDate } from '@/lib/mentorias/access';
import {
  MONTHS,
  SERVICES,
  MENTORSHIP_STATUSES,
  SESSION_STATUSES,
  CHECK_OPTIONS,
  type Role,
  type Mentorship,
  type Mentor,
  type Mentee,
  type Attachment,
  type SessionRecord,
} from '@/lib/mentorias/domain';
import './mentorship-workspace.css';

type Props = {
  initialId?: string | null;
  role: Role;
  mentorships: Mentorship[];
  mentors: Mentor[];
  mentees: Mentee[];
  search: string;
  setSearch: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  createAction: ReactNode;
  heading: ReactNode;
  onSave: (value: Mentorship) => Promise<void>;
  onUpload: (
    file: File,
    kind: 'photo' | 'document',
    prefix: string,
  ) => Promise<Attachment>;
};
type Editor = 'details' | 'admin' | number;
const dateLabel = (value: string) =>
  value
    ? new Date(`${value}T12:00:00`).toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Sin fecha';
const completed = (record: Mentorship) =>
  record.sessions.filter((s) => s.status === 'Realizada').length;

function StateTag({ value }: { value: string }) {
  return (
    <span className="journey-state" data-state={value}>
      <i />
      {value}
    </span>
  );
}
function Person({
  person,
  caption,
}: {
  person?: Mentor | Mentee;
  caption: string;
}) {
  return (
    <div className="journey-person">
      <span className="journey-avatar" aria-hidden="true">
        {person?.photo ? (
          <Image
            unoptimized
            width={640}
            height={360}
            src={person.photo}
            alt=""
          />
        ) : (
          (person?.name ?? '?')
            .split(/\s+/)
            .slice(0, 2)
            .map((v) => v[0])
            .join('')
        )}
      </span>
      <span>
        <small>{caption}</small>
        <strong>{person?.name || 'Por asignar'}</strong>
      </span>
    </div>
  );
}
function SessionProgress({ record }: { record: Mentorship }) {
  return (
    <div
      className="journey-progress"
      aria-label={`${completed(record)} de 6 sesiones realizadas`}
    >
      <div>
        {Array.from({ length: 6 }, (_, i) => (
          <span
            key={i}
            data-state={
              record.sessions.find((s) => s.number === i + 1)?.status ??
              'Pendiente'
            }
          />
        ))}
      </div>
      <span>
        {completed(record)} <span>/ 6 sesiones</span>
      </span>
    </div>
  );
}

export function MentorshipWorkspace(props: Props) {
  const {
    role,
    mentorships,
    mentors,
    mentees,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    createAction,
    heading,
    onSave,
    onUpload,
  } = props;
  const [selectedId, setSelectedId] = useState<string | null>(
    props.initialId ?? null,
  );
  const [editor, setEditor] = useState<Editor | null>(null);
  const [message, setMessage] = useState('');
  const detailTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (selectedId) {
      detailTitle.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [selectedId]);
  const record = mentorships.find((m) => m.id === selectedId);
  const mentor = record && mentors.find((p) => p.id === record.mentorId);
  const mentee = record && mentees.find((p) => p.id === record.menteeId);
  const canEdit = role !== 'Mentoreado';
  const filtered = mentorships.filter((m) => {
    const person = mentees.find((p) => p.id === m.menteeId);
    return (
      (statusFilter === 'Todos' || m.status === statusFilter) &&
      [
        person?.name,
        person?.venture,
        mentors.find((p) => p.id === m.mentorId)?.name,
        m.service,
        m.goal,
      ].some((v) =>
        (v ?? '')
          .toLocaleLowerCase('es')
          .includes(search.trim().toLocaleLowerCase('es')),
      )
    );
  });
  if (!record)
    return (
      <div className="journey-workspace">
        {heading}
        <div className="journey-toolbar">
          <p>
            <strong>{filtered.length}</strong>{' '}
            {filtered.length === 1 ? 'acompañamiento' : 'acompañamientos'}
          </p>
          {createAction}
        </div>
        <div className="journey-filters">
          <label className="journey-search" htmlFor="journey-search">
            <Search size={17} aria-hidden="true" />
            <Input
              id="journey-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar persona, emprendimiento o servicio"
              aria-label="Buscar mentoría"
            />
          </label>
          <SelectField
            label="Filtrar por estado"
            hidden
            value={statusFilter}
            onChange={setStatusFilter}
            options={['Todos', ...MENTORSHIP_STATUSES]}
          />
        </div>
        <div className="journey-grid">
          {filtered.map((m) => {
            const person = mentees.find((p) => p.id === m.menteeId);
            return (
              <article className="journey-card" key={m.id}>
                <div className="journey-card-top">
                  <span className="journey-number">
                    MENTORÍA / {String(m.sourceNumber).padStart(2, '0')}
                  </span>
                  <StateTag value={m.status} />
                </div>
                <h3>{person?.venture || person?.name || 'Acompañamiento'}</h3>
                <p className="journey-service">
                  {m.service || 'Servicio por definir'}
                </p>
                <div className="journey-pair">
                  <Person
                    person={mentors.find((p) => p.id === m.mentorId)}
                    caption="Mentor"
                  />
                  <Person person={person} caption="Mentoreado" />
                </div>
                <p className="journey-goal-preview">
                  {m.goal || 'El objetivo se definirá junto al mentor.'}
                </p>
                <div className="journey-card-bottom">
                  <SessionProgress record={m} />
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedId(m.id);
                      setMessage('');
                    }}
                  >
                    Ver mentoría <ArrowRight size={15} />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
        {!filtered.length && (
          <div className="journey-empty">
            <Search size={26} />
            <h3>No hay mentorías para esta búsqueda</h3>
            <p>Prueba con otro nombre o cambia el estado.</p>
          </div>
        )}
      </div>
    );

  return (
    <div className="journey-workspace">
      <div className="journey-back-row">
        <Button
          variant="ghost"
          onClick={() => {
            setSelectedId(null);
            setMessage('');
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
        >
          <ArrowLeft size={16} />
          Volver a mentorías
        </Button>
        <span className="journey-number">
          MENTORÍA / {String(record.sourceNumber).padStart(2, '0')}
        </span>
      </div>
      {message && (
        <output className="journey-feedback">
          <Check size={16} />
          {message}
        </output>
      )}
      <section className="journey-detail-heading">
        <div>
          <StateTag value={record.status} />
          <h1 ref={detailTitle} tabIndex={-1}>
            {mentee?.venture || mentee?.name || 'Tu mentoría'}
          </h1>
          <p>{record.service || 'Servicio por definir'}</p>
        </div>
        {canEdit && (
          <Button variant="outline" onClick={() => setEditor('details')}>
            <PencilLine size={15} />
            Editar mentoría
          </Button>
        )}
      </section>
      <section className="journey-brief">
        <div className="journey-pair">
          <Person person={mentor} caption="Mentor" />
          <Person person={mentee} caption="Mentoreado" />
        </div>
        <div className="journey-objective">
          <span className="journey-number">OBJETIVO COMPARTIDO</span>
          <p>{record.goal || 'Aún no se ha definido el objetivo.'}</p>
        </div>
        <div className="journey-facts">
          <span>
            <Clock3 size={15} />
            {record.hours.toLocaleString('es-CL')} h acumuladas
          </span>
          <span>
            <CalendarDays size={15} />
            {record.month || 'Mes por definir'}
          </span>
          {record.space && <span>{record.space}</span>}
        </div>
        {role === 'Administrador' && (
          <button
            className="journey-admin-link"
            onClick={() => setEditor('admin')}
          >
            <SlidersHorizontal size={15} />
            Gestión administrativa
            <ChevronRight size={14} />
          </button>
        )}
      </section>
      <section className="journey-sessions">
        <div className="journey-sessions-heading">
          <div>
            <p className="journey-number">PASO A PASO</p>
            <h3>El recorrido de esta mentoría</h3>
          </div>
          <SessionProgress record={record} />
        </div>
        {canEdit && record.status !== 'En proceso' && (
          <p className="journey-read-note">
            Las sesiones están en consulta. Para registrar avances, cambia la
            mentoría a «En proceso» desde Editar mentoría.
          </p>
        )}
        <div className="journey-timeline">
          {record.sessions.map((session) => (
            <button
              className="journey-session"
              data-state={session.status}
              key={session.number}
              onClick={() => setEditor(session.number)}
            >
              <span className="journey-step">
                {session.status === 'Realizada' ? (
                  <Check size={19} />
                ) : (
                  String(session.number).padStart(2, '0')
                )}
              </span>
              <span className="journey-session-content">
                <span className="journey-session-title">
                  <strong>Sesión {session.number}</strong>
                  <StateTag value={session.status} />
                </span>
                <span className="journey-session-summary">
                  {session.summary ||
                    (session.date
                      ? 'Encuentro programado. Acuerdos por registrar.'
                      : 'Un nuevo espacio para conversar y avanzar.')}
                </span>
              </span>
              <span className="journey-session-meta">
                <span>{dateLabel(session.date)}</span>
                <span>
                  {session.photo && <Camera size={14} aria-label="Con foto" />}
                  {session.document && (
                    <FileText size={14} aria-label="Con documento" />
                  )}
                </span>
              </span>
              <ChevronRight size={18} className="journey-session-arrow" />
            </button>
          ))}
        </div>
        {!record.sessions.length && (
          <p className="journey-read-note">
            No se pudieron cargar las sesiones. Pulsa Actualizar para volver a
            consultarlas.
          </p>
        )}
      </section>
      {editor !== null && (
        <MentorshipEditor
          key={`${record.id}-${editor}`}
          record={record}
          editor={editor}
          role={role}
          mentors={mentors}
          mentees={mentees}
          onClose={() => setEditor(null)}
          onUpload={onUpload}
          onSave={async (value) => {
            await onSave(value);
            setEditor(null);
            setMessage(
              typeof editor === 'number'
                ? `Sesión ${editor} guardada.`
                : 'Mentoría actualizada.',
            );
          }}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="journey-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function SelectField({
  label,
  value,
  onChange,
  options,
  hidden = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  hidden?: boolean;
}) {
  return (
    <label className="journey-field">
      {!hidden && <span>{label}</span>}
      <ProgramSelect
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((v) => (
          <ProgramOption key={v} value={v}>
            {v === 'Todos' ? 'Todos los estados' : v || 'Sin definir'}
          </ProgramOption>
        ))}
      </ProgramSelect>
    </label>
  );
}
function AttachmentLink({ value }: { value: Attachment }) {
  return (
    <a
      className="journey-attachment"
      href={value.dataUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Paperclip size={15} />
      <span>{value.name}</span>
      <ArrowRight size={14} />
    </a>
  );
}

function MentorshipEditor({
  record,
  editor,
  role,
  mentors,
  mentees,
  onClose,
  onSave,
  onUpload,
}: {
  record: Mentorship;
  editor: Editor;
  role: Role;
  mentors: Mentor[];
  mentees: Mentee[];
  onClose: () => void;
  onSave: Props['onSave'];
  onUpload: Props['onUpload'];
}) {
  const [draft, setDraft] = useState(() => structuredClone(record));
  const [busy, setBusy] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<{ photo?: File; document?: File }>({});
  const [preview, setPreview] = useState('');
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const session =
    typeof editor === 'number'
      ? draft.sessions.find((s) => s.number === editor)
      : undefined;
  const canEdit =
    role !== 'Mentoreado' && (!session || record.status === 'En proceso');
  const patch = (value: Partial<Mentorship>) =>
    setDraft((current) => ({ ...current, ...value }));
  const patchSession = (value: Partial<SessionRecord>) =>
    setDraft((current) => ({
      ...current,
      sessions: current.sessions.map((s) =>
        s.number === editor ? { ...s, ...value } : s,
      ),
    }));
  const title = session
    ? `Sesión ${editor}`
    : editor === 'admin'
      ? 'Gestión administrativa'
      : 'Editar mentoría';
  const selectFile = async (
    file: File | undefined,
    kind: 'photo' | 'document',
  ) => {
    if (!file) return;
    setValidating(true);
    setError('');
    try {
      await validateFile(file, kind);
      setFiles((current) => ({ ...current, [kind]: file }));
      if (kind === 'photo') setPreview(URL.createObjectURL(file));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudo leer el archivo.',
      );
    } finally {
      setValidating(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy && !validating) onClose();
      }}
    >
      <DialogContent
        className="journey-editor sm:max-w-xl"
        showCloseButton={!busy && !validating}
      >
        <div className="journey-editor-header">
          <span className="journey-number">
            MENTORÍA {String(record.sourceNumber).padStart(2, '0')}
            {session ? ' / ENCUENTRO' : ' / SEGUIMIENTO'}
          </span>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {session
              ? canEdit
                ? 'Registra lo trabajado y el próximo paso. Guarda cuando esté listo.'
                : 'Acuerdos y evidencias de este encuentro.'
              : editor === 'admin'
                ? 'Formalización, registro SIR y pago del acompañamiento.'
                : 'Define el estado y el objetivo del acompañamiento.'}
          </DialogDescription>
        </div>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!canEdit || busy || validating) return;
            setError('');
            if (session?.status === 'Realizada' && !session.summary.trim()) {
              setError(
                'Escribe los acuerdos antes de marcar la sesión como realizada.',
              );
              return;
            }
            if (session && session.status !== 'Pendiente' && !session.date) {
              setError('Indica la fecha de la sesión.');
              return;
            }
            setBusy(true);
            let next = structuredClone(draft);
            try {
              if (session)
                for (const kind of ['photo', 'document'] as const) {
                  const file = files[kind];
                  if (!file) continue;
                  const attachment = await onUpload(
                    file,
                    kind,
                    `sessions/${record.id}/${session.number}`,
                  );
                  next = {
                    ...next,
                    sessions: next.sessions.map((s) =>
                      s.number === editor ? { ...s, [kind]: attachment } : s,
                    ),
                  };
                  setDraft(next);
                  setFiles((current) => ({ ...current, [kind]: undefined }));
                }
              await onSave(next);
            } catch (reason) {
              setError(
                reason instanceof Error
                  ? reason.message
                  : 'No se pudo guardar. Tus cambios siguen aquí.',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset
            disabled={busy || validating}
            className="journey-editor-fields"
          >
            {session ? (
              canEdit ? (
                <>
                  <div className="journey-field-pair">
                    <SelectField
                      label="Estado de la sesión"
                      value={session.status}
                      options={SESSION_STATUSES}
                      onChange={(value) =>
                        patchSession({
                          status: value as SessionRecord['status'],
                          date:
                            value === 'Realizada' && !session.date
                              ? programDate()
                              : session.date,
                        })
                      }
                    />
                    <Field label="Fecha">
                      <Input
                        type="date"
                        required={session.status !== 'Pendiente'}
                        value={session.date}
                        onChange={(e) => patchSession({ date: e.target.value })}
                      />
                    </Field>
                  </div>
                  <Field label="Acuerdos y próximo paso">
                    <Textarea
                      maxLength={2000}
                      required={session.status === 'Realizada'}
                      value={session.summary}
                      onChange={(e) =>
                        patchSession({ summary: e.target.value })
                      }
                      placeholder="¿Qué se trabajó y qué harán antes del próximo encuentro?"
                    />
                  </Field>
                  <div className="journey-evidence-heading">
                    <strong>Evidencias</strong>
                    <span>Opcionales · una de cada tipo</span>
                  </div>
                  <div className="journey-file-grid">
                    {(['photo', 'document'] as const).map((kind) => (
                      <label className="journey-file" key={kind}>
                        {kind === 'photo' ? (
                          <Camera size={21} />
                        ) : (
                          <FileText size={21} />
                        )}
                        <strong>
                          {files[kind]?.name ||
                            session[kind]?.name ||
                            (kind === 'photo'
                              ? 'Añadir foto'
                              : 'Añadir documento')}
                        </strong>
                        <span>
                          {kind === 'photo'
                            ? 'JPG o PNG · hasta 2 MB'
                            : 'PDF · hasta 5 MB'}
                        </span>
                        <input
                          type="file"
                          aria-label={
                            kind === 'photo'
                              ? 'Foto de la sesión'
                              : 'Documento de la sesión'
                          }
                          accept={
                            kind === 'photo'
                              ? 'image/png,image/jpeg'
                              : 'application/pdf'
                          }
                          onChange={(e) => {
                            void selectFile(e.target.files?.[0], kind);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  {(preview || session.photo) && (
                    <Image
                      unoptimized
                      width={640}
                      height={360}
                      className="journey-photo-preview"
                      src={preview || session.photo?.dataUrl || ''}
                      alt="Foto seleccionada para la sesión"
                    />
                  )}
                  {session.photo && !files.photo && (
                    <AttachmentLink value={session.photo} />
                  )}
                  {session.document && !files.document && (
                    <AttachmentLink value={session.document} />
                  )}
                  {Object.keys(files).some(
                    (key) => files[key as keyof typeof files],
                  ) && (
                    <button
                      type="button"
                      className="journey-clear-files"
                      onClick={() => {
                        setFiles({});
                        setPreview('');
                      }}
                    >
                      <X size={13} />
                      Descartar archivos seleccionados
                    </button>
                  )}
                </>
              ) : (
                <div className="journey-session-reading">
                  <div className="journey-reading-meta">
                    <StateTag value={session.status} />
                    <span>{dateLabel(session.date)}</span>
                  </div>
                  <p>{session.summary || 'Aún no hay acuerdos registrados.'}</p>
                  {session.photo && (
                    <>
                      <Image
                        unoptimized
                        width={640}
                        height={360}
                        className="journey-photo-preview"
                        src={session.photo.dataUrl}
                        alt="Evidencia de la sesión"
                      />
                      <AttachmentLink value={session.photo} />
                    </>
                  )}
                  {session.document && (
                    <AttachmentLink value={session.document} />
                  )}
                </div>
              )
            ) : editor === 'admin' ? (
              <>
                <SelectField
                  label="Formalización"
                  value={draft.formalization}
                  options={CHECK_OPTIONS}
                  onChange={(value) =>
                    patch({
                      formalization: value as Mentorship['formalization'],
                    })
                  }
                />
                <div className="journey-field-pair">
                  <SelectField
                    label="Planificación SIR"
                    value={draft.planningSir}
                    options={CHECK_OPTIONS}
                    onChange={(value) =>
                      patch({ planningSir: value as Mentorship['planningSir'] })
                    }
                  />
                  <SelectField
                    label="Ejecución SIR"
                    value={draft.executionSir}
                    options={CHECK_OPTIONS}
                    onChange={(value) =>
                      patch({
                        executionSir: value as Mentorship['executionSir'],
                      })
                    }
                  />
                </div>
                <Field label="Fecha de pago">
                  <Input
                    type="date"
                    value={draft.paidAt}
                    onChange={(e) => patch({ paidAt: e.target.value })}
                  />
                </Field>
              </>
            ) : (
              <>
                <div className="journey-field-pair">
                  <SelectField
                    label="Estado de la mentoría"
                    value={draft.status}
                    options={MENTORSHIP_STATUSES}
                    onChange={(value) =>
                      patch({ status: value as Mentorship['status'] })
                    }
                  />
                  <Field label="Horas acumuladas">
                    <Input
                      type="number"
                      min="0"
                      max="10000"
                      step="0.5"
                      required
                      value={draft.hours}
                      onChange={(e) => patch({ hours: Number(e.target.value) })}
                    />
                  </Field>
                </div>
                <Field label="Objetivo compartido">
                  <Textarea
                    maxLength={2000}
                    value={draft.goal}
                    onChange={(e) => patch({ goal: e.target.value })}
                    placeholder="¿Qué quieren lograr con este acompañamiento?"
                  />
                </Field>
                <details className="journey-more-fields">
                  <summary>
                    Servicio y datos del acompañamiento
                    <ChevronRight size={15} />
                  </summary>
                  <div>
                    <SelectField
                      label="Servicio"
                      value={draft.service}
                      options={['', ...SERVICES]}
                      onChange={(service) => patch({ service })}
                    />
                    <div className="journey-field-pair">
                      <SelectField
                        label="Mes de inicio"
                        value={draft.month}
                        options={['', ...MONTHS]}
                        onChange={(month) => patch({ month })}
                      />
                      <Field label="Espacio utilizado">
                        <Input
                          maxLength={150}
                          value={draft.space}
                          onChange={(e) => patch({ space: e.target.value })}
                        />
                      </Field>
                    </div>
                    {role === 'Administrador' && (
                      <div className="journey-field-pair">
                        <Field label="Mentor">
                          <ProgramSelect
                            aria-label="Mentor asignado"
                            value={draft.mentorId}
                            onChange={(e) =>
                              patch({ mentorId: e.target.value })
                            }
                          >
                            {mentors.map((p) => (
                              <ProgramOption key={p.id} value={p.id}>
                                {p.name}
                              </ProgramOption>
                            ))}
                          </ProgramSelect>
                        </Field>
                        <Field label="Mentoreado">
                          <ProgramSelect
                            aria-label="Mentoreado asignado"
                            value={draft.menteeId}
                            onChange={(e) =>
                              patch({ menteeId: e.target.value })
                            }
                          >
                            {mentees.map((p) => (
                              <ProgramOption key={p.id} value={p.id}>
                                {p.name}
                              </ProgramOption>
                            ))}
                          </ProgramSelect>
                        </Field>
                      </div>
                    )}
                  </div>
                </details>
              </>
            )}
            {error && (
              <p role="alert" className="journey-error">
                {error}
              </p>
            )}
          </fieldset>
          <div className="journey-editor-actions">
            <Button
              type="button"
              variant="outline"
              disabled={busy || validating}
              onClick={onClose}
            >
              {canEdit ? 'Cancelar' : 'Cerrar'}
            </Button>
            {canEdit && (
              <Button type="submit" disabled={busy || validating}>
                {busy || validating ? (
                  <LoaderCircle className="animate-spin" size={16} />
                ) : (
                  <Check size={16} />
                )}
                {busy
                  ? 'Guardando…'
                  : validating
                    ? 'Revisando archivo…'
                    : session
                      ? 'Guardar sesión'
                      : 'Guardar cambios'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
