export const MENTORSHIP_STATUSES = Object.freeze([
  'Suspendida', 'En proceso', 'Terminada', 'No corresponde',
  'Esperando derivación', 'Derivada',
]);
export const SESSION_STATUSES = Object.freeze([
  'Pendiente', 'Agendada', 'Realizada', 'Reprogramada',
]);

export class DomainError extends Error {
  constructor(code, message, status = 422) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function assertActor(actor) {
  if (!actor?.userId || !['Administrador', 'Mentor', 'Mentoreado'].includes(actor.role)) {
    throw new DomainError('UNAUTHENTICATED', 'Se requiere una identidad verificada.', 401);
  }
}

export function canRead(actor, mentorship) {
  assertActor(actor);
  return actor.role === 'Administrador'
    || (actor.role === 'Mentor' && mentorship.mentorUserId === actor.userId)
    || (actor.role === 'Mentoreado' && mentorship.menteeUserId === actor.userId);
}

export function assertCanWrite(actor, mentorship) {
  if (!canRead(actor, mentorship) || actor.role === 'Mentoreado') {
    throw new DomainError('FORBIDDEN', 'Sin permiso para modificar esta mentoría.', 403);
  }
}

export function validateSession(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new DomainError('INVALID_SESSION', 'La sesión debe ser un objeto.');
  }
  const allowed = ['number', 'date', 'status', 'summary'];
  if (Object.keys(input).some((key) => !allowed.includes(key))) {
    throw new DomainError('UNKNOWN_FIELD', 'La solicitud contiene campos no permitidos.');
  }
  if (!Number.isInteger(input.number) || input.number < 1 || input.number > 6) {
    throw new DomainError('SESSION_LIMIT', 'El número de sesión debe estar entre 1 y 6.');
  }
  if (typeof input.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)
    || !Number.isFinite(Date.parse(input.date + 'T00:00:00Z'))
    || new Date(input.date + 'T00:00:00Z').toISOString().slice(0, 10) !== input.date) {
    throw new DomainError('INVALID_DATE', 'La fecha debe ser una fecha real en formato AAAA-MM-DD.');
  }
  if (!SESSION_STATUSES.includes(input.status)) {
    throw new DomainError('INVALID_STATUS', 'El estado de sesión no es válido.');
  }
  if (typeof input.summary !== 'string' || !input.summary.trim() || input.summary.length > 2000) {
    throw new DomainError('INVALID_SUMMARY', 'El resumen es obligatorio y admite hasta 2000 caracteres.');
  }
  return { ...input, summary: input.summary.trim() };
}
