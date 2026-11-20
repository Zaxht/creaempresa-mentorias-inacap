import assert from 'node:assert/strict';
import test from 'node:test';
import { dashboardDate, getDashboard } from '../lib/mentorias/dashboard.ts';

function mentorship(id, status = 'En proceso', sessions = []) {
  return {
    id,
    sourceNumber: Number(id),
    status,
    hours: 1.5,
    sessions: Array.from({ length: 6 }, (_, index) => ({
      number: index + 1,
      status: 'Pendiente',
      date: '',
      summary: '',
      ...sessions[index],
    })),
  };
}
const state = (...mentorships) => ({ mentors: [], mentees: [], mentorships });
const session = (date, status = 'Agendada') => ({ date, status });

test('prioriza las fechas vencidas y no duplica mentorías con varios motivos', () => {
  const input = state(
    mentorship('1', 'En proceso', [
      session('2026-11-19'),
      session('2026-11-18', 'Pendiente'),
    ]),
    mentorship('2', 'Suspendida'),
    mentorship('3', 'Esperando derivación'),
    mentorship('4', 'En proceso'),
    mentorship('5', 'En proceso', [session('2026-11-16')]),
  );
  const before = structuredClone(input);
  const result = getDashboard(input, '2026-11-20');
  assert.deepEqual(
    result.attention.map((item) => item.mentorship.id),
    ['5', '1', '2', '3', '4'],
  );
  assert.deepEqual(
    result.attention[1].reasons.map((item) => item.kind),
    ['overdue', 'schedule'],
  );
  assert.match(result.attention[1].reasons[0].detail, /Sesión 2.*2 días/);
  assert.equal(
    result.attention[1].reasons[0].label,
    '2 sesiones por actualizar',
  );
  assert.deepEqual(input, before);
});

test('la agenda incluye hoy y fechas por confirmar, ordenadas, sin fechas de casos cerrados o suspendidos', () => {
  const result = getDashboard(
    state(
      mentorship('1', 'En proceso', [
        session('2026-11-27'),
        session('2026-11-20', 'Pendiente'),
      ]),
      mentorship('2', 'Terminada', [
        session('2026-11-19'),
        session('2026-11-21'),
      ]),
      mentorship('3', 'No corresponde', [
        session('2026-11-19'),
        session('2026-11-21'),
      ]),
      mentorship('4', 'Suspendida', [session('2026-11-21')]),
      mentorship('5', 'Derivada', [session('2026-11-21')]),
      mentorship('6', 'En proceso', [session('2026-11-25', 'Reprogramada')]),
    ),
    '2026-11-20',
  );
  assert.deepEqual(
    result.upcoming.map((item) => [
      item.mentorship.id,
      item.session.number,
      item.daysAway,
    ]),
    [
      ['1', 2, 0],
      ['6', 1, 5],
      ['1', 1, 7],
    ],
  );
  assert.deepEqual(
    result.attention.map((item) => item.mentorship.id),
    ['4', '5'],
  );
});

test('distingue cerrar seis sesiones realizadas de coordinar una próxima fecha', () => {
  const completed = Array.from({ length: 6 }, () =>
    session('2026-11-10', 'Realizada'),
  );
  const result = getDashboard(
    state(
      mentorship('1', 'En proceso', completed),
      mentorship('2', 'En proceso', completed.slice(0, 5)),
      mentorship('3', 'Terminada', completed),
    ),
    '2026-11-20',
  );
  assert.deepEqual(
    result.attention.map((item) => [
      item.mentorship.id,
      item.reasons.map((r) => r.kind),
    ]),
    [
      ['1', ['close']],
      ['2', ['schedule']],
    ],
  );
  assert.equal(result.completedSessions, 17);
  assert.equal(result.plannedSessions, 18);
  assert.equal(result.sessionProgress, 94);
  assert.equal(result.finished, 1);
  assert.equal(result.inProgress, 2);
  assert.equal(result.hours, 4.5);
});

test('agrupa por semanas desde el lunes cruzando el año y no cuenta fechas futuras ni inválidas', () => {
  const result = getDashboard(
    state(
      mentorship('1', 'Terminada', [
        session('2025-11-23', 'Realizada'), // outside the six-week window
        session('2025-11-24', 'Realizada'),
        session('2025-12-28', 'Realizada'),
        session('2025-12-29', 'Realizada'),
        session('2026-01-02', 'Realizada'),
        session('2026-01-03', 'Realizada'), // later than today
      ]),
    ),
    '2026-01-02',
  );
  assert.equal(result.weeks[0].start, '2025-11-24');
  assert.equal(result.weeks[5].start, '2025-12-29');
  assert.deepEqual(
    result.weeks.map((week) => week.count),
    [1, 0, 0, 0, 1, 2],
  );
  assert.equal(result.weeklyTotal, 4);
  const invalid = getDashboard(
    state(
      mentorship('1', 'En proceso', [session('2026-02-30'), session('bad')]),
    ),
    '2026-03-01',
  );
  assert.deepEqual(
    invalid.attention[0].reasons.map((reason) => reason.kind),
    ['schedule'],
  );
  assert.equal(invalid.upcoming.length, 0);
  assert.equal(dashboardDate('2026-02-30'), 'Sin fecha');
  assert.throws(() => getDashboard(state(), 'bad'), /fecha/);
});

test('el avance excluye No corresponde y un programa vacío nunca produce porcentajes inválidos', () => {
  const completed = Array.from({ length: 6 }, () =>
    session('2026-11-18', 'Realizada'),
  );
  const result = getDashboard(
    state(mentorship('1', 'No corresponde', completed), mentorship('2')),
    '2026-11-20',
  );
  assert.equal(result.total, 2);
  assert.equal(result.excluded, 1);
  assert.equal(result.plannedSessions, 6);
  assert.equal(result.completedSessions, 0);
  assert.equal(result.weeklyTotal, 0);
  assert.equal(
    result.states.reduce((sum, item) => sum + item.count, 0),
    2,
  );
  const empty = getDashboard(state(), '2026-11-20');
  for (const key of [
    'total',
    'finished',
    'inProgress',
    'hours',
    'completedSessions',
    'plannedSessions',
    'sessionProgress',
    'weeklyTotal',
  ])
    assert.equal(empty[key], 0, key);
  assert.deepEqual(empty.attention, []);
  assert.deepEqual(empty.upcoming, []);
  assert.equal(empty.weeks.length, 6);
});
