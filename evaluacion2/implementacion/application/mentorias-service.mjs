import {
  assertActor, assertCanWrite, canRead, DomainError,
  MENTORSHIP_STATUSES, validateSession,
} from '../domain/rules.mjs';

export class MentoriasService {
  constructor(repository) {
    this.repository = repository;
  }

  async list(actor) {
    assertActor(actor);
    return (await this.repository.list()).filter((item) => canRead(actor, item));
  }

  async recordSession(actor, id, input) {
    assertActor(actor);
    const current = await this.repository.get(id);
    if (!current) throw new DomainError('NOT_FOUND', 'Mentoría no encontrada.', 404);
    assertCanWrite(actor, current);
    if (current.status !== 'En proceso') {
      throw new DomainError('MENTORSHIP_CLOSED', 'Solo se registran sesiones en mentorías en proceso.', 409);
    }
    const session = validateSession(input);
    if (current.sessions.some((item) => item.number === session.number)) {
      throw new DomainError('DUPLICATE_SESSION', 'Ese número de sesión ya existe.', 409);
    }
    const next = { ...current, sessions: [...current.sessions, session], version: current.version + 1 };
    await this.repository.save(next, current.version);
    return session;
  }

  async changeStatus(actor, id, status) {
    assertActor(actor);
    const current = await this.repository.get(id);
    if (!current) throw new DomainError('NOT_FOUND', 'Mentoría no encontrada.', 404);
    assertCanWrite(actor, current);
    if (!MENTORSHIP_STATUSES.includes(status)) {
      throw new DomainError('INVALID_STATUS', 'El estado de mentoría no es válido.');
    }
    const next = { ...current, status, version: current.version + 1 };
    await this.repository.save(next, current.version);
    return next;
  }
}
