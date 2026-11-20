'use client';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  ArrowDown,
  CalendarDays,
  Check,
  CheckCheck,
  Clock3,
  CircleAlert,
  Info,
  MoveUpRight,
  Sprout,
  UsersRound,
  Waypoints,
} from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { getDashboard, dashboardDate } from '@/lib/mentorias/dashboard';
import { programDate } from '@/lib/mentorias/access';
import { hasExampleData } from '@/lib/mentorias/report-model';
import type {
  AppState,
  Mentorship,
  MentorshipStatus,
} from '@/lib/mentorias/domain';
import './dashboard-workspace.css';

export function DashboardWorkspace({
  state,
  createAction,
  onOpenMentorship,
  onBrowseMentorships,
}: {
  state: AppState;
  createAction: ReactNode;
  onOpenMentorship: (id: string) => void;
  onBrowseMentorships: (status?: MentorshipStatus) => void;
}) {
  const [today, setToday] = useState(programDate);
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [allAttention, setAllAttention] = useState(false);
  const [allUpcoming, setAllUpcoming] = useState(false);
  useEffect(() => {
    const refreshDay = () => setToday(programDate());
    const timer = window.setInterval(refreshDay, 60_000);
    window.addEventListener('focus', refreshDay);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshDay);
    };
  }, []);
  const model = getDashboard(state, today);
  const person = (record: Mentorship) => {
    const mentee = state.mentees.find((p) => p.id === record.menteeId);
    const mentor = state.mentors.find((p) => p.id === record.mentorId);
    return {
      project:
        mentee?.venture || mentee?.name || `Mentoría ${record.sourceNumber}`,
      mentee: mentee?.name || 'Mentoreado por asignar',
      mentor: mentor?.name || 'Mentor por asignar',
    };
  };
  const statusItems = model.states.filter(
    (item) => item.count || ['En proceso', 'Terminada'].includes(item.status),
  );
  const maxWeek = Math.max(
    2,
    Math.ceil(Math.max(...model.weeks.map((week) => week.count)) / 2) * 2,
  );
  const closure = model.total
    ? Math.round((model.finished / model.total) * 100)
    : 0;
  return (
    <div className="dashboard-workspace">
      <header className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">
            <span /> Tu programa, de un vistazo
          </p>
          <h1>Así va el programa.</h1>
          <p className="dashboard-lead">
            {!model.total
              ? 'El primer acompañamiento empieza con una conexión.'
              : model.attention.length
                ? `${model.attention.length} ${model.attention.length === 1 ? 'mentoría necesita' : 'mentorías necesitan'} una revisión. Estos son los próximos pasos.`
                : 'El seguimiento está al día. Sigue acompañando los próximos pasos.'}
          </p>
        </div>
        <div className="dashboard-heading-actions">
          <time dateTime={today}>
            <CalendarDays size={13} aria-hidden="true" />
            {dashboardDate(today, true)}
          </time>
          {createAction}
        </div>
      </header>

      <section
        className="dashboard-numbers"
        aria-label="Indicadores del programa"
      >
        <div>
          <span className="dashboard-stat-label">
            En proceso <Waypoints size={16} aria-hidden="true" />
          </span>
          <strong>{model.inProgress.toString().padStart(2, '0')}</strong>
          <span className="dashboard-stat-note">
            de {model.total} {model.total === 1 ? 'mentoría' : 'mentorías'} en
            el programa
          </span>
        </div>
        <div>
          <span className="dashboard-stat-label">
            Avance de sesiones <CheckCheck size={16} aria-hidden="true" />
          </span>
          <strong>
            {model.sessionProgress}
            <small>%</small>
          </strong>
          <span className="dashboard-stat-note">
            {model.completedSessions} de {model.plannedSessions} sesiones
            realizadas
          </span>
          <span className="dashboard-stat-progress" aria-hidden="true">
            <i style={{ width: `${model.sessionProgress}%` }} />
          </span>
        </div>
        <a
          className="dashboard-attention-stat"
          href="#dashboard-attention"
          data-alert={model.attention.length > 0}
        >
          <span className="dashboard-stat-label">
            Por revisar <CircleAlert size={16} aria-hidden="true" />
          </span>
          <strong>{model.attention.length.toString().padStart(2, '0')}</strong>
          <span className="dashboard-stat-note">
            {model.attention.length
              ? 'Ver mentorías y motivos'
              : 'Sin pendientes detectados'}
            <ArrowDown size={13} aria-hidden="true" />
          </span>
        </a>
        <div>
          <span className="dashboard-stat-label">
            Acompañamiento <Clock3 size={16} aria-hidden="true" />
          </span>
          <strong>
            {model.hours.toLocaleString('es-CL', { maximumFractionDigits: 1 })}
            <small> h</small>
          </strong>
          <span className="dashboard-stat-note">
            horas registradas en el programa
          </span>
        </div>
      </section>

      <div className="dashboard-grid">
        <section
          id="dashboard-attention"
          className="dashboard-panel dashboard-attention"
        >
          <div className="dashboard-panel-heading">
            <div>
              <p className="dashboard-kicker">Dónde enfocarse</p>
              <h2>
                Necesitan atención{' '}
                <span
                  className="dashboard-count"
                  data-alert={model.attention.length > 0}
                >
                  {model.attention.length}
                </span>
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Ver criterios de atención"
              onClick={() => setCriteriaOpen(true)}
            >
              <Info size={17} />
            </Button>
          </div>
          {model.attention.length ? (
            <>
              <p className="dashboard-panel-intro">
                Primero, las fechas vencidas. Cada mentoría aparece una sola
                vez.
              </p>
              <div className="dashboard-attention-list">
                {model.attention
                  .slice(0, allAttention ? undefined : 3)
                  .map((item) => {
                    const identity = person(item.mentorship);
                    return (
                      <button
                        type="button"
                        key={item.mentorship.id}
                        className="dashboard-alert-row"
                        data-kind={item.reasons[0].kind}
                        onClick={() => onOpenMentorship(item.mentorship.id)}
                        aria-label={`Revisar ${identity.project}: ${item.reasons.map((reason) => reason.label).join(', ')}`}
                      >
                        <span className="dashboard-alert-symbol">
                          <CircleAlert size={17} aria-hidden="true" />
                        </span>
                        <span className="dashboard-alert-copy">
                          <span className="dashboard-alert-label">
                            {item.reasons[0].label}
                          </span>
                          <strong>{identity.project}</strong>
                          <span>
                            {identity.mentee} · {identity.mentor}
                          </span>
                          <small>{item.reasons[0].detail}</small>
                          {item.reasons.length > 1 && (
                            <em>
                              {item.reasons
                                .slice(1)
                                .map((reason) => reason.label)
                                .join(' · ')}
                            </em>
                          )}
                        </span>
                        <ArrowRight size={17} aria-hidden="true" />
                      </button>
                    );
                  })}
              </div>
              {model.attention.length > 3 && (
                <Button
                  className="dashboard-more"
                  variant="ghost"
                  onClick={() => setAllAttention(!allAttention)}
                >
                  {allAttention
                    ? 'Mostrar menos'
                    : `Ver las ${model.attention.length} mentorías pendientes`}
                  <ArrowDown size={14} />
                </Button>
              )}
            </>
          ) : (
            <div className="dashboard-clear">
              <span>
                {model.total ? (
                  <Check size={25} strokeWidth={1.5} />
                ) : (
                  <Sprout size={25} strokeWidth={1.5} />
                )}
              </span>
              <div>
                <h3>
                  {model.total
                    ? 'Todo al día por aquí.'
                    : 'Listos para comenzar.'}
                </h3>
                <p>
                  {model.total
                    ? 'No hay fechas vencidas ni gestiones pendientes según los registros actuales.'
                    : 'Los pendientes aparecerán aquí cuando inicies las mentorías.'}
                </p>
              </div>
            </div>
          )}
          <p className="dashboard-attention-note">
            Señales calculadas con las fechas y estados registrados.
          </p>
        </section>

        <section
          className="dashboard-panel dashboard-status"
          aria-labelledby="dashboard-status-title"
        >
          <div className="dashboard-panel-heading">
            <div>
              <p className="dashboard-kicker">Vista general</p>
              <h2 id="dashboard-status-title">Estado de las mentorías</h2>
            </div>
            <span className="dashboard-total">
              {model.total} <small>en total</small>
            </span>
          </div>
          {model.total ? (
            <>
              <figure
                className="dashboard-status-bar"
                aria-label={model.states
                  .filter((item) => item.count)
                  .map((item) => `${item.label}: ${item.count}`)
                  .join('. ')}
              >
                {model.states
                  .filter((item) => item.count)
                  .map((item) => (
                    <span
                      key={item.status}
                      style={{
                        width: `${(item.count / model.total) * 100}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  ))}
              </figure>
              <div className="dashboard-status-legend">
                {statusItems.map((item) => (
                  <button
                    key={item.status}
                    type="button"
                    disabled={!item.count}
                    onClick={() => onBrowseMentorships(item.status)}
                    aria-label={`Ver ${item.count} ${item.label.toLocaleLowerCase('es')}`}
                  >
                    <span
                      className="dashboard-state-dot"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                    <MoveUpRight size={12} aria-hidden="true" />
                  </button>
                ))}
              </div>
              <div className="dashboard-closure">
                <span>
                  <CheckCheck size={16} aria-hidden="true" />
                  {model.finished} de {model.total}{' '}
                  {model.total === 1
                    ? 'mentoría terminada'
                    : 'mentorías terminadas'}
                </span>
                <strong>{closure}%</strong>
              </div>
            </>
          ) : (
            <div className="dashboard-chart-empty">
              <Waypoints size={28} strokeWidth={1.3} />
              <p>Aún no hay mentorías para graficar.</p>
            </div>
          )}
        </section>

        <section className="dashboard-panel dashboard-agenda">
          <div className="dashboard-panel-heading">
            <div>
              <p className="dashboard-kicker">Lo que viene</p>
              <h2>Próximas sesiones</h2>
            </div>
            <CalendarDays
              size={20}
              className="dashboard-muted-icon"
              aria-hidden="true"
            />
          </div>
          <p className="dashboard-panel-intro">
            Fechas registradas en mentorías en proceso.
          </p>
          {model.upcoming.length ? (
            <>
              <div className="dashboard-agenda-list">
                {model.upcoming
                  .slice(0, allUpcoming ? undefined : 3)
                  .map(({ mentorship, session, daysAway }) => {
                    const identity = person(mentorship);
                    const date = new Date(`${session.date}T00:00:00Z`);
                    return (
                      <button
                        type="button"
                        className="dashboard-agenda-row"
                        key={`${mentorship.id}-${session.number}`}
                        onClick={() => onOpenMentorship(mentorship.id)}
                        aria-label={`Abrir ${identity.project}, sesión ${session.number}, ${dashboardDate(session.date, true)}`}
                      >
                        <time dateTime={session.date}>
                          <strong>{session.date.slice(8)}</strong>
                          <span>
                            {date
                              .toLocaleDateString('es-CL', {
                                timeZone: 'UTC',
                                month: 'short',
                              })
                              .replace('.', '')}
                          </span>
                        </time>
                        <span className="dashboard-agenda-copy">
                          <span>
                            {daysAway === 0
                              ? 'Hoy'
                              : daysAway === 1
                                ? 'Mañana'
                                : `En ${daysAway} días`}{' '}
                            · Sesión {session.number}
                          </span>
                          <strong>{identity.project}</strong>
                          <small>
                            {identity.mentee} · {identity.mentor}
                          </small>
                          <em data-status={session.status}>
                            {session.status === 'Pendiente'
                              ? 'Por confirmar'
                              : session.status}
                          </em>
                        </span>
                        <ArrowRight size={16} aria-hidden="true" />
                      </button>
                    );
                  })}
              </div>
              {model.upcoming.length > 3 && (
                <Button
                  className="dashboard-more"
                  variant="ghost"
                  onClick={() => setAllUpcoming(!allUpcoming)}
                >
                  {allUpcoming
                    ? 'Mostrar menos'
                    : `Ver las ${model.upcoming.length} próximas fechas`}
                  <ArrowDown size={14} />
                </Button>
              )}
            </>
          ) : (
            <div className="dashboard-agenda-empty">
              <CalendarDays size={25} strokeWidth={1.4} />
              <p>No hay próximas fechas registradas.</p>
              <span>
                {model.inProgress
                  ? 'Revisa las mentorías en proceso para coordinar el siguiente encuentro.'
                  : 'Las sesiones aparecerán aquí al programar los próximos encuentros.'}
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            className="dashboard-browse"
            onClick={() => onBrowseMentorships()}
          >
            Ver todas las mentorías <ArrowRight size={15} />
          </Button>
        </section>

        <section
          className="dashboard-panel dashboard-trend"
          aria-labelledby="dashboard-trend-title"
        >
          <div className="dashboard-panel-heading">
            <div>
              <p className="dashboard-kicker">Ritmo de acompañamiento</p>
              <h2 id="dashboard-trend-title">Sesiones realizadas</h2>
            </div>
            <span className="dashboard-total">
              {model.weeklyTotal}
              <small> en 6 semanas</small>
            </span>
          </div>
          <p className="dashboard-panel-intro">
            Del {dashboardDate(model.weeks[0].start)} al {dashboardDate(today)}.
          </p>
          <figure
            aria-label="Sesiones realizadas por semana"
            className="dashboard-week-figure"
          >
            <div className="dashboard-week-axis" aria-hidden="true">
              <span>{maxWeek}</span>
              <span>{maxWeek / 2}</span>
              <span>0</span>
            </div>
            <ol className="dashboard-week-chart">
              {model.weeks.map((week) => (
                <li key={week.start} data-current={week.current}>
                  <span className="dashboard-week-count">{week.count}</span>
                  <span className="dashboard-week-track" aria-hidden="true">
                    <i style={{ height: `${(week.count / maxWeek) * 100}%` }} />
                  </span>
                  <time dateTime={week.start}>{dashboardDate(week.start)}</time>
                  <span className="dashboard-week-current">
                    {week.current ? 'En curso' : ''}
                  </span>
                </li>
              ))}
            </ol>
            <figcaption>
              Semanas desde el lunes. La última aún está en curso.
              {model.weeklyTotal === 0 &&
                ' No hay sesiones realizadas en este periodo.'}
            </figcaption>
          </figure>
        </section>
      </div>
      <footer className="dashboard-footer">
        <span>
          <UsersRound size={15} aria-hidden="true" />
          {state.mentors.length}{' '}
          {state.mentors.length === 1 ? 'mentor' : 'mentores'} ·{' '}
          {state.mentees.length}{' '}
          {state.mentees.length === 1 ? 'mentoreado' : 'mentoreados'}
        </span>
        {hasExampleData(state) && <span>Datos de ejemplo · uso académico</span>}
        {model.excluded > 0 && (
          <p>
            El avance de sesiones excluye las mentorías marcadas como «No
            corresponde».
          </p>
        )}
      </footer>
      <Dialog open={criteriaOpen} onOpenChange={setCriteriaOpen}>
        <DialogContent className="dashboard-criteria">
          <DialogTitle>Cómo se detectan los pendientes</DialogTitle>
          <DialogDescription>
            Se usa la fecha de Chile y la información registrada en el programa.
          </DialogDescription>
          <dl>
            <div>
              <dt>Sesiones por actualizar</dt>
              <dd>
                En una mentoría en proceso, su fecha ya pasó y aún no están
                marcadas como realizadas.
              </dd>
            </div>
            <div>
              <dt>Sin próxima fecha</dt>
              <dd>
                La mentoría está en proceso, tiene sesiones por realizar y
                ninguna tiene fecha de hoy o posterior.
              </dd>
            </div>
            <div>
              <dt>Gestión por revisar</dt>
              <dd>
                La mentoría figura como suspendida, derivada o esperando
                derivación.
              </dd>
            </div>
            <div>
              <dt>Lista para cerrar</dt>
              <dd>
                Las seis sesiones están realizadas, pero la mentoría sigue en
                proceso.
              </dd>
            </div>
          </dl>
          <Button variant="outline" onClick={() => setCriteriaOpen(false)}>
            Entendido
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
