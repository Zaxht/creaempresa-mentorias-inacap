'use client';
import Image from 'next/image';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  Phone,
  Search,
  PencilLine,
  Camera,
  BriefcaseBusiness,
  Sparkles,
  Check,
  LoaderCircle,
  Users,
  X,
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
import { validateFile } from '@/lib/mentorias/access';
import type {
  Mentor,
  Mentee,
  Mentorship,
  Attachment,
} from '@/lib/mentorias/domain';
import './people-workspace.css';

type Person = Mentor | Mentee;
type PeopleKind = 'mentors' | 'mentees';
type SharedProps = {
  mentors: Mentor[];
  mentees: Mentee[];
  mentorships: Mentorship[];
  onSave: (person: Person) => Promise<void>;
  onUpload: (
    file: File,
    kind: 'photo' | 'document',
    prefix: string,
  ) => Promise<Attachment>;
  onOpenMentorship: (id: string) => void;
};
const isMentor = (person: Person): person is Mentor => 'expertise' in person;
const assignedTo = (person: Person, records: Mentorship[]) =>
  records.filter((record) =>
    isMentor(person)
      ? record.mentorId === person.id
      : record.menteeId === person.id,
  );
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');

function Portrait({
  person,
  large = false,
}: {
  person: Person;
  large?: boolean;
}) {
  return (
    <span
      className={`people-portrait${large ? ' people-portrait-large' : ''}`}
      aria-hidden="true"
    >
      {person.photo ? (
        <Image unoptimized width={240} height={240} src={person.photo} alt="" />
      ) : (
        person.name
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0])
          .join('')
      )}
    </span>
  );
}

export function PeopleWorkspace({
  kind,
  heading,
  createAction,
  ...props
}: SharedProps & {
  kind: PeopleKind;
  heading: ReactNode;
  createAction: ReactNode;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const people = kind === 'mentors' ? props.mentors : props.mentees;
  const person = people.find((record) => record.id === selectedId);
  const lastOpened = useRef<HTMLButtonElement | null>(null);
  const lastOpenedId = useRef<string | null>(null);
  if (person)
    return (
      <PersonProfile
        key={person.id}
        {...props}
        person={person}
        onBack={() => {
          setSelectedId(null);
          requestAnimationFrame(() => lastOpened.current?.focus());
        }}
      />
    );
  const filtered = people.filter((record) =>
    normalize(
      [
        record.name,
        record.email,
        isMentor(record) ? record.expertise.join(' ') : record.venture,
      ].join(' '),
    ).includes(normalize(search.trim())),
  );
  return (
    <div className="people-workspace">
      {heading}
      <div className="people-toolbar">
        <label className="people-search" htmlFor="people-search">
          <Search size={17} aria-hidden="true" />
          <Input
            id="people-search"
            aria-label={
              kind === 'mentors' ? 'Buscar mentores' : 'Buscar mentoreados'
            }
            placeholder={
              kind === 'mentors'
                ? 'Buscar por nombre o especialidad…'
                : 'Buscar por nombre o emprendimiento…'
            }
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        {createAction}
      </div>
      <output className="people-result-count">
        {filtered.length} {filtered.length === 1 ? 'perfil' : 'perfiles'}
        {search.trim() ? ' encontrados' : ' en el programa'}
      </output>
      <div className="people-grid">
        {filtered.map((record) => {
          const assigned = assignedTo(record, props.mentorships);
          const finished = assigned.filter(
            (m) => m.status === 'Terminada',
          ).length;
          return (
            <article className="people-card" key={record.id}>
              <div className="people-card-identity">
                <Portrait person={record} />
                <div>
                  <p className="people-kicker">
                    {isMentor(record) ? 'Mentor' : 'Mentoreado'}
                  </p>
                  <h2>{record.name}</h2>
                  <p className="people-subtitle">
                    {isMentor(record)
                      ? record.title || 'Acompañamiento a emprendedores'
                      : record.venture || 'Emprendimiento por definir'}
                  </p>
                </div>
              </div>
              <div className="people-card-description">
                {isMentor(record) ? (
                  <div className="people-tags">
                    {record.expertise.length ? (
                      record.expertise
                        .slice(0, 3)
                        .map((item, index) => (
                          <span key={`${index}-${item}`}>{item}</span>
                        ))
                    ) : (
                      <span>Especialidades por completar</span>
                    )}
                    {record.expertise.length > 3 && (
                      <span>+{record.expertise.length - 3}</span>
                    )}
                  </div>
                ) : (
                  <p>
                    <BriefcaseBusiness size={15} aria-hidden="true" />
                    {record.stage || 'Etapa por completar'}
                  </p>
                )}
              </div>
              <div className="people-card-footer">
                <span>
                  <strong>{assigned.length}</strong>{' '}
                  {assigned.length === 1 ? 'mentoría' : 'mentorías'}
                  <i />
                  {finished} terminadas
                </span>
                <Button
                  variant="ghost"
                  aria-label={`Ver perfil de ${record.name}`}
                  ref={(button) => {
                    if (lastOpenedId.current === record.id)
                      lastOpened.current = button;
                  }}
                  onClick={() => {
                    lastOpenedId.current = record.id;
                    setSelectedId(record.id);
                  }}
                >
                  Ver perfil <ArrowRight size={16} />
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      {!filtered.length && (
        <div className="people-empty">
          <Users size={28} aria-hidden="true" />
          <h2>
            {search
              ? 'No encontramos ese perfil'
              : 'El próximo acompañamiento empieza aquí'}
          </h2>
          <p>
            {search
              ? 'Prueba con otro nombre o borra la búsqueda.'
              : `Añade el primer ${kind === 'mentors' ? 'mentor' : 'mentoreado'} para comenzar.`}
          </p>
          {search && (
            <Button variant="outline" onClick={() => setSearch('')}>
              Limpiar búsqueda
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function PersonProfile({
  person,
  onBack,
  ...props
}: SharedProps & { person: Person; onBack?: () => void }) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const titleRef = useRef<HTMLHeadingElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [person.id]);
  const mentor = isMentor(person);
  const assigned = assignedTo(person, props.mentorships);
  const finished = assigned.filter((m) => m.status === 'Terminada').length;
  const sessions = assigned
    .flatMap((m) => m.sessions)
    .filter((s) => s.status === 'Realizada').length;
  const hours = assigned.reduce((sum, m) => sum + m.hours, 0);
  const closeEditor = () => {
    setEditing(false);
    editRef.current?.focus();
  };
  return (
    <div className="people-workspace people-profile">
      <div className="people-profile-nav">
        {onBack ? (
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft size={16} />
            {mentor ? 'Todos los mentores' : 'Todos los mentoreados'}
          </Button>
        ) : (
          <span className="people-kicker">Mi perfil</span>
        )}
        <span className="people-kicker">Crea Empresa / Personas</span>
      </div>
      {message && (
        <output className="people-saved">
          <Check size={16} />
          {message}
        </output>
      )}
      <section className="people-hero">
        <div className="people-hero-art" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="people-hero-body">
          <Portrait person={person} large />
          <div className="people-hero-copy">
            <p className="people-kicker">
              {mentor
                ? 'Mentor · Experiencia que acompaña'
                : 'Mentoreado · Un proyecto en crecimiento'}
            </p>
            <h1 ref={titleRef} tabIndex={-1}>
              {person.name}
            </h1>
            <p>
              {mentor
                ? person.title ||
                  'Parte de la red de acompañamiento Crea Empresa.'
                : person.venture || 'Su proyecto comienza a tomar forma.'}
            </p>
          </div>
          <Button
            ref={editRef}
            className="people-edit-button"
            onClick={() => {
              setMessage('');
              setEditing(true);
            }}
          >
            <PencilLine size={16} />
            Editar perfil
          </Button>
        </div>
        <dl className="people-stats">
          <div>
            <dt>Mentorías asignadas</dt>
            <dd>{assigned.length.toString().padStart(2, '0')}</dd>
          </div>
          <div>
            <dt>Mentorías terminadas</dt>
            <dd>{finished.toString().padStart(2, '0')}</dd>
          </div>
          <div>
            <dt>Sesiones realizadas</dt>
            <dd>{sessions.toString().padStart(2, '0')}</dd>
          </div>
          <div>
            <dt>Horas de acompañamiento</dt>
            <dd>
              {new Intl.NumberFormat('es-CL', {
                maximumFractionDigits: 1,
              }).format(hours)}
              <small> h</small>
            </dd>
          </div>
        </dl>
      </section>
      <div className="people-profile-columns">
        <div className="people-profile-main">
          <section className="people-about">
            <div className="people-section-heading">
              <span className="people-section-icon">
                {mentor ? (
                  <Sparkles size={18} />
                ) : (
                  <BriefcaseBusiness size={18} />
                )}
              </span>
              <h2>
                {mentor ? 'Experiencia y enfoque' : 'Sobre el emprendimiento'}
              </h2>
            </div>
            {mentor ? (
              <>
                <p className={!person.bio ? 'people-muted' : ''}>
                  {person.bio ||
                    'Todavía no hay una presentación. Puedes añadirla al editar el perfil.'}
                </p>
                <h3>Áreas de especialidad</h3>
                <div className="people-tags">
                  {person.expertise.length ? (
                    person.expertise.map((item, index) => (
                      <span key={`${index}-${item}`}>{item}</span>
                    ))
                  ) : (
                    <p className="people-muted">
                      Sin especialidades registradas.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="people-venture">
                  <strong>{person.venture || 'Sin nombre registrado'}</strong>
                  {person.stage && <span>{person.stage}</span>}
                </div>
                <h3>Apoyo que necesita</h3>
                <p className={!person.need ? 'people-muted' : ''}>
                  {person.need ||
                    'Las necesidades de apoyo todavía no se han registrado.'}
                </p>
              </>
            )}
          </section>
          <section className="people-activity">
            <div className="people-section-heading">
              <h2>Su recorrido en el programa</h2>
              <span className="people-count">{assigned.length}</span>
            </div>
            <p className="people-section-intro">
              Abre una mentoría para ver sus avances y sesiones.
            </p>
            {assigned.length ? (
              <div className="people-journeys">
                {assigned.map((record) => {
                  const partner = mentor
                    ? props.mentees.find((p) => p.id === record.menteeId)
                    : props.mentors.find((p) => p.id === record.mentorId);
                  const done = record.sessions.filter(
                    (s) => s.status === 'Realizada',
                  ).length;
                  return (
                    <button
                      type="button"
                      className="people-journey"
                      key={record.id}
                      onClick={() => props.onOpenMentorship(record.id)}
                    >
                      <span className="people-journey-top">
                        <span>
                          {record.month || 'Inicio por definir'} · #
                          {record.sourceNumber}
                        </span>
                        <span
                          className="people-status"
                          data-status={record.status}
                        >
                          {record.status}
                        </span>
                      </span>
                      <strong>{record.service || 'Acompañamiento'}</strong>
                      <span className="people-journey-partner">
                        {mentor ? 'Con el mentoreado' : 'Con el mentor'}{' '}
                        {partner?.name || 'por asignar'}
                      </span>
                      <span className="people-journey-bottom">
                        <span
                          className="people-progress"
                          aria-label={`${done} de 6 sesiones realizadas`}
                        >
                          {Array.from({ length: 6 }, (_, index) => (
                            <i
                              key={index}
                              data-done={
                                record.sessions.find(
                                  (s) => s.number === index + 1,
                                )?.status === 'Realizada'
                              }
                            />
                          ))}
                        </span>
                        <span>{done}/6 sesiones</span>
                        <ArrowRight size={18} aria-hidden="true" />
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="people-empty-activity">
                <Users size={22} aria-hidden="true" />
                <p>Aún no tiene mentorías asignadas.</p>
                <span>
                  Su recorrido aparecerá aquí cuando comience el acompañamiento.
                </span>
              </div>
            )}
          </section>
        </div>
        <aside className="people-contact">
          <p className="people-kicker">Conversemos</p>
          <h2>Contacto</h2>
          <div>
            <span className="people-contact-icon">
              <Mail size={18} />
            </span>
            <dl>
              <dt>Correo</dt>
              <dd>
                {person.email ? (
                  <a href={`mailto:${person.email}`}>{person.email}</a>
                ) : (
                  <span className="people-muted">Sin registrar</span>
                )}
              </dd>
            </dl>
          </div>
          <div>
            <span className="people-contact-icon">
              <Phone size={18} />
            </span>
            <dl>
              <dt>Teléfono</dt>
              <dd>
                {person.phone ? (
                  <a href={`tel:${person.phone.replace(/[^\d+]/g, '')}`}>
                    {person.phone}
                  </a>
                ) : (
                  <span className="people-muted">Sin registrar</span>
                )}
              </dd>
            </dl>
          </div>
          <p className="people-contact-note">
            {mentor
              ? 'El acompañamiento parte de una buena conversación.'
              : 'Un espacio para conectar, aprender y hacer crecer su proyecto.'}
          </p>
        </aside>
      </div>
      {editing && (
        <ProfileEditor
          person={person}
          onClose={closeEditor}
          onUpload={props.onUpload}
          onSave={async (record) => {
            await props.onSave(record);
            closeEditor();
            setMessage('Perfil actualizado.');
          }}
        />
      )}
    </div>
  );
}

function ProfileEditor({
  person,
  onSave,
  onUpload,
  onClose,
}: {
  person: Person;
  onSave: SharedProps['onSave'];
  onUpload: SharedProps['onUpload'];
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(person);
  const [expertise, setExpertise] = useState(
    isMentor(person) ? person.expertise.join(', ') : '',
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const pending = busy || validating;
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const patch = (value: Partial<Mentor & Mentee>) =>
    setDraft((current) => ({ ...current, ...value }));
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent className="people-editor" showCloseButton={!pending}>
        <div className="people-editor-heading">
          <span className="people-section-icon">
            <PencilLine size={20} />
          </span>
          <div>
            <DialogTitle>Editar perfil</DialogTitle>
            <DialogDescription>{person.name}</DialogDescription>
          </div>
        </div>
        <form
          className="people-editor-form"
          onSubmit={async (event) => {
            event.preventDefault();
            if (pending) return;
            setBusy(true);
            setError('');
            try {
              if (!draft.name.trim())
                throw new Error('Escribe el nombre de la persona.');
              let next = {
                ...draft,
                name: draft.name.trim(),
                email: draft.email.trim(),
                phone: draft.phone.trim(),
              };
              if (isMentor(next)) {
                const specialties = [
                  ...new Set(
                    expertise
                      .split(',')
                      .map((value) => value.trim())
                      .filter(Boolean),
                  ),
                ];
                if (specialties.length > 20)
                  throw new Error('Añade hasta 20 especialidades.');
                next = { ...next, expertise: specialties };
              }
              if (file) {
                const uploaded = await onUpload(
                  file,
                  'photo',
                  `${isMentor(person) ? 'mentors' : 'mentees'}/${person.id}`,
                );
                next = {
                  ...next,
                  photo: uploaded.dataUrl,
                  photoPath: uploaded.path,
                };
                setDraft(next);
                setFile(null);
                setPreview('');
              }
              await onSave(next);
            } catch (reason) {
              setError(
                reason instanceof Error
                  ? reason.message
                  : 'No se pudo guardar el perfil. Intenta nuevamente.',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={pending} className="people-editor-fields">
            <div className="people-photo-editor">
              <Portrait person={{ ...draft, photo: preview || draft.photo }} />
              <div>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => fileInput.current?.click()}
                >
                  <Camera size={16} />
                  {draft.photo || preview ? 'Cambiar foto' : 'Añadir foto'}
                </Button>
                <p>PNG o JPG · Máximo 2 MB</p>
              </div>
              {(draft.photo || preview) && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  type="button"
                  aria-label="Quitar foto"
                  onClick={() => {
                    setFile(null);
                    setPreview('');
                    patch({ photo: undefined, photoPath: undefined });
                  }}
                >
                  <X size={16} />
                </Button>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg"
                className="sr-only"
                aria-label="Seleccionar foto de perfil"
                onChange={async (event) => {
                  const selected = event.target.files?.[0];
                  event.target.value = '';
                  if (!selected) return;
                  setValidating(true);
                  setError('');
                  try {
                    await validateFile(selected, 'photo');
                    setFile(selected);
                    setPreview(URL.createObjectURL(selected));
                  } catch (reason) {
                    setError(
                      reason instanceof Error
                        ? reason.message
                        : 'No se pudo abrir la foto.',
                    );
                  } finally {
                    setValidating(false);
                  }
                }}
              />
            </div>
            <label className="people-field" htmlFor="profile-edit-name">
              Nombre completo
              <Input
                id="profile-edit-name"
                required
                maxLength={100}
                value={draft.name}
                onChange={(event) => patch({ name: event.target.value })}
              />
            </label>
            {isMentor(draft) ? (
              <>
                <label className="people-field" htmlFor="profile-edit-title">
                  Presentación breve <span>Opcional</span>
                  <Input
                    id="profile-edit-title"
                    maxLength={150}
                    placeholder="Ej. Asesoría financiera y comercial"
                    value={draft.title}
                    onChange={(event) => patch({ title: event.target.value })}
                  />
                </label>
                <label
                  className="people-field"
                  htmlFor="profile-edit-expertise"
                >
                  Especialidades <span>Separadas por comas</span>
                  <Input
                    id="profile-edit-expertise"
                    maxLength={1000}
                    placeholder="Finanzas, ventas, gestión"
                    value={expertise}
                    onChange={(event) => setExpertise(event.target.value)}
                  />
                </label>
                <label className="people-field" htmlFor="profile-edit-bio">
                  Experiencia y enfoque
                  <Textarea
                    id="profile-edit-bio"
                    maxLength={2000}
                    rows={3}
                    value={draft.bio}
                    placeholder="Cuenta cómo puedes apoyar a los emprendedores…"
                    onChange={(event) => patch({ bio: event.target.value })}
                  />
                </label>
              </>
            ) : (
              <>
                <div className="people-field-grid">
                  <label
                    className="people-field"
                    htmlFor="profile-edit-venture"
                  >
                    Emprendimiento
                    <Input
                      id="profile-edit-venture"
                      maxLength={150}
                      value={draft.venture}
                      placeholder="Nombre del proyecto"
                      onChange={(event) =>
                        patch({ venture: event.target.value })
                      }
                    />
                  </label>
                  <label className="people-field" htmlFor="profile-edit-stage">
                    Etapa
                    <Input
                      id="profile-edit-stage"
                      maxLength={100}
                      value={draft.stage}
                      placeholder="Ej. Idea o en marcha"
                      onChange={(event) => patch({ stage: event.target.value })}
                    />
                  </label>
                </div>
                <label className="people-field" htmlFor="profile-edit-need">
                  Apoyo que necesita
                  <Textarea
                    id="profile-edit-need"
                    maxLength={2000}
                    rows={3}
                    value={draft.need}
                    placeholder="¿En qué busca avanzar con la mentoría?"
                    onChange={(event) => patch({ need: event.target.value })}
                  />
                </label>
              </>
            )}
            <div className="people-editor-contact">
              <h3>Datos de contacto</h3>
              <div className="people-field-grid">
                <label className="people-field" htmlFor="profile-edit-email">
                  Correo de contacto
                  <Input
                    id="profile-edit-email"
                    type="email"
                    maxLength={254}
                    value={draft.email}
                    onChange={(event) => patch({ email: event.target.value })}
                  />
                </label>
                <label className="people-field" htmlFor="profile-edit-phone">
                  Teléfono
                  <Input
                    id="profile-edit-phone"
                    type="tel"
                    maxLength={30}
                    placeholder="+56 9 1234 5678"
                    value={draft.phone}
                    onChange={(event) => patch({ phone: event.target.value })}
                  />
                </label>
              </div>
              <p>
                Este correo es de contacto. El acceso a la cuenta no cambia.
              </p>
            </div>
          </fieldset>
          {error && (
            <p className="people-editor-error" role="alert">
              {error}
            </p>
          )}
          <div className="people-editor-actions">
            <Button
              variant="outline"
              type="button"
              disabled={pending}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              {busy
                ? 'Guardando…'
                : validating
                  ? 'Revisando foto…'
                  : 'Guardar perfil'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
