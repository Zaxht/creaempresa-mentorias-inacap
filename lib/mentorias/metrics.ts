import type { AppState, Mentorship } from './domain';

export function getMetrics(state: AppState) {
  const sessions = state.mentorships.flatMap(
    (mentorship) => mentorship.sessions,
  );
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
    hours: state.mentorships.reduce(
      (sum, mentorship) => sum + mentorship.hours,
      0,
    ),
    completedSessions: sessions.filter(
      (session) => session.status === 'Realizada',
    ).length,
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

export function getMentorStats(mentorId: string, mentorships: Mentorship[]) {
  const assigned = mentorships.filter(
    (mentorship) => mentorship.mentorId === mentorId,
  );

  return {
    total: assigned.length,
    finished: assigned.filter((mentorship) => mentorship.status === 'Terminada')
      .length,
    hours: assigned.reduce((sum, mentorship) => sum + mentorship.hours, 0),
  };
}

export function getMenteeStats(menteeId: string, mentorships: Mentorship[]) {
  const assigned = mentorships.filter(
    (mentorship) => mentorship.menteeId === menteeId,
  );

  return {
    total: assigned.length,
    finished: assigned.filter((mentorship) => mentorship.status === 'Terminada')
      .length,
    completedSessions: assigned.reduce(
      (sum, mentorship) =>
        sum +
        mentorship.sessions.filter((session) => session.status === 'Realizada')
          .length,
      0,
    ),
  };
}
