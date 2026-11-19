import type { AppState } from './domain';

export type Command = {
  entity: string;
  id: string;
  version: number | null;
  patch: Record<string, unknown>;
};
const fields = {
  mentors: ['name', 'title', 'email', 'phone', 'expertise', 'bio', 'photo'],
  mentees: ['name', 'venture', 'stage', 'email', 'phone', 'need', 'photo'],
  mentorships: [
    'mentorId',
    'menteeId',
    'month',
    'hours',
    'space',
    'status',
    'service',
    'formalization',
    'planningSir',
    'executionSir',
    'paidAt',
    'goal',
  ],
  sessions: ['date', 'status', 'summary', 'photo', 'document'],
};

function clean(
  record: object,
  entity: keyof typeof fields,
): Record<string, unknown> {
  const r = record as Record<string, unknown>;
  return Object.fromEntries(
    fields[entity]
      .map((key) => {
        let value = r[key];
        if (key === 'photo' && entity !== 'sessions')
          value = r.photoPath ?? null;
        if ((key === 'photo' || key === 'document') && entity === 'sessions') {
          const attachment = value as
            | { path?: string; name: string; type: string; size: number }
            | undefined;
          value = attachment?.path
            ? {
                path: attachment.path,
                name: attachment.name,
                type: attachment.type,
                size: attachment.size,
              }
            : undefined;
        }
        return [key, value];
      })
      .filter(([, value]) => value !== undefined),
  );
}

export function collectChanges(
  original: AppState,
  current: AppState,
): Command[] {
  const commands: Command[] = [];
  for (const entity of ['mentors', 'mentees', 'mentorships'] as const) {
    for (const record of current[entity]) {
      const old = original[entity].find((r) => r.id === record.id);
      const data = clean(record, entity);
      const before = old ? clean(old, entity) : {};
      const patch = Object.fromEntries(
        Object.entries(data).filter(
          ([key, value]) =>
            JSON.stringify(value) !== JSON.stringify(before[key]),
        ),
      );
      if (!old || Object.keys(patch).length)
        commands.push({
          entity,
          id: record.id,
          version: old?.version ?? null,
          patch,
        });
    }
  }
  for (const mentorship of current.mentorships) {
    const previous = original.mentorships.find((m) => m.id === mentorship.id);
    for (const session of mentorship.sessions) {
      const old = previous?.sessions.find((s) => s.id === session.id);
      if (!old || !session.id) continue; // Las seis sesiones se crean en la transacción de la mentoría.
      const data = clean(session, 'sessions');
      const before = clean(old, 'sessions');
      const patch = Object.fromEntries(
        Object.entries(data).filter(
          ([key, value]) =>
            JSON.stringify(value) !== JSON.stringify(before[key]),
        ),
      );
      if (Object.keys(patch).length)
        commands.push({
          entity: 'sessions',
          id: session.id,
          version: old.version ?? 0,
          patch,
        });
    }
  }
  return commands;
}
