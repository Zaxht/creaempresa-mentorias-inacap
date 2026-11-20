import type {
  AppState,
  Mentorship,
  MentorshipStatus,
  SessionRecord,
} from './domain';

const DAY = 86_400_000;
export type AttentionKind =
  | 'overdue'
  | 'suspended'
  | 'referral'
  | 'close'
  | 'schedule';
export type AttentionReason = {
  kind: AttentionKind;
  label: string;
  detail: string;
};
export type AttentionItem = {
  mentorship: Mentorship;
  reasons: AttentionReason[];
  priority: number;
  oldestDate: string;
};
export type UpcomingSession = {
  mentorship: Mentorship;
  session: SessionRecord;
  daysAway: number;
};

// Calendar-day arithmetic is independent of the browser's timezone and DST.
function dayNumber(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(date) &&
    new Date(date).toISOString().slice(0, 10) === value
    ? date / DAY
    : null;
}
const isoDay = (day: number) => new Date(day * DAY).toISOString().slice(0, 10);
export function dashboardDate(value: string, long = false) {
  if (dayNumber(value) === null) return 'Sin fecha';
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('es-CL', {
    timeZone: 'UTC',
    day: 'numeric',
    month: long ? 'long' : 'short',
    ...(long ? { year: 'numeric' } : {}),
  });
}
export const DASHBOARD_STATES: {
  status: MentorshipStatus;
  label: string;
  color: string;
}[] = [
  { status: 'En proceso', label: 'En proceso', color: '#c51c35' },
  { status: 'Terminada', label: 'Terminadas', color: '#74865c' },
  {
    status: 'Esperando derivación',
    label: 'Esperando derivación',
    color: '#b88a45',
  },
  { status: 'Derivada', label: 'Derivadas', color: '#b4a282' },
  { status: 'Suspendida', label: 'Suspendidas', color: '#8e746d' },
  { status: 'No corresponde', label: 'No corresponde', color: '#c9c9bb' },
];

export function getDashboard(state: AppState, today: string) {
  const todayNumber = dayNumber(today);
  if (todayNumber === null)
    throw new Error('La fecha de referencia no es válida.');
  const attention: AttentionItem[] = [];
  const upcoming: UpcomingSession[] = [];
  for (const mentorship of state.mentorships) {
    if (['Terminada', 'No corresponde'].includes(mentorship.status)) continue;
    const reasons: AttentionReason[] = [];
    let priority = 5;
    let oldestDate = '';
    if (mentorship.status === 'Suspendida') {
      reasons.push({
        kind: 'suspended',
        label: 'Suspendida',
        detail: 'Revisar la continuidad del acompañamiento.',
      });
      priority = 1;
    } else if (
      ['Esperando derivación', 'Derivada'].includes(mentorship.status)
    ) {
      reasons.push({
        kind: 'referral',
        label: 'Derivación por revisar',
        detail: 'Confirmar la asignación y el siguiente paso.',
      });
      priority = 2;
    } else if (mentorship.status === 'En proceso') {
      const pending = mentorship.sessions.filter(
        (session) => session.status !== 'Realizada',
      );
      const overdue = pending
        .filter((session) => {
          const date = dayNumber(session.date);
          return date !== null && date < todayNumber;
        })
        .sort((a, b) => a.date.localeCompare(b.date) || a.number - b.number);
      if (overdue.length) {
        oldestDate = overdue[0].date;
        const days = todayNumber - dayNumber(oldestDate)!;
        reasons.push({
          kind: 'overdue',
          label:
            overdue.length === 1
              ? 'Sesión por actualizar'
              : `${overdue.length} sesiones por actualizar`,
          detail: `Sesión ${overdue[0].number} · fecha vencida hace ${days} ${days === 1 ? 'día' : 'días'}.`,
        });
        priority = 0;
      }
      const next = pending.filter((session) => {
        const date = dayNumber(session.date);
        return date !== null && date >= todayNumber;
      });
      for (const session of next)
        upcoming.push({
          mentorship,
          session,
          daysAway: dayNumber(session.date)! - todayNumber,
        });
      const completed = mentorship.sessions.filter(
        (session) => session.status === 'Realizada',
      ).length;
      if (completed >= 6) {
        reasons.push({
          kind: 'close',
          label: 'Lista para cerrar',
          detail: 'Las seis sesiones están realizadas. Revisar el cierre.',
        });
        priority = Math.min(priority, 3);
      } else if (!next.length) {
        reasons.push({
          kind: 'schedule',
          label: 'Sin próxima fecha',
          detail: 'Coordinar la siguiente sesión del acompañamiento.',
        });
        priority = Math.min(priority, 4);
      }
    }
    if (reasons.length)
      attention.push({ mentorship, reasons, priority, oldestDate });
  }
  attention.sort(
    (a, b) =>
      a.priority - b.priority ||
      a.oldestDate.localeCompare(b.oldestDate) ||
      a.mentorship.sourceNumber - b.mentorship.sourceNumber,
  );
  upcoming.sort(
    (a, b) =>
      a.session.date.localeCompare(b.session.date) ||
      a.mentorship.sourceNumber - b.mentorship.sourceNumber ||
      a.session.number - b.session.number,
  );

  const included = state.mentorships.filter(
    (m) => m.status !== 'No corresponde',
  );
  const sessions = included.flatMap((m) => m.sessions);
  const completedSessions = sessions.filter(
    (s) => s.status === 'Realizada',
  ).length;
  const plannedSessions = included.length * 6;
  const weekDay = new Date(todayNumber * DAY).getUTCDay();
  const monday = todayNumber - ((weekDay + 6) % 7);
  const weeks = Array.from({ length: 6 }, (_, index) => {
    const start = monday - (5 - index) * 7;
    const end = start + 6;
    return {
      start: isoDay(start),
      end: isoDay(end),
      current: index === 5,
      count: sessions.filter((s) => {
        const day = dayNumber(s.date);
        return (
          s.status === 'Realizada' &&
          day !== null &&
          day >= start &&
          day <= Math.min(end, todayNumber)
        );
      }).length,
    };
  });
  return {
    total: state.mentorships.length,
    inProgress: state.mentorships.filter((m) => m.status === 'En proceso')
      .length,
    finished: state.mentorships.filter((m) => m.status === 'Terminada').length,
    hours: state.mentorships.reduce((sum, m) => sum + m.hours, 0),
    completedSessions,
    plannedSessions,
    sessionProgress: plannedSessions
      ? Math.round((completedSessions / plannedSessions) * 100)
      : 0,
    excluded: state.mentorships.length - included.length,
    attention,
    upcoming,
    weeks,
    weeklyTotal: weeks.reduce((sum, week) => sum + week.count, 0),
    states: DASHBOARD_STATES.map((item) => ({
      ...item,
      count: state.mentorships.filter((m) => m.status === item.status).length,
    })),
  };
}
