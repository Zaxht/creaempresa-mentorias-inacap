import type { AppState, Role } from './domain';

export function programDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function scopeState(
  state: AppState,
  role: Role,
  mentorId?: string,
  menteeId?: string,
): AppState {
  if (role === 'Administrador') return state;
  const mentorships = state.mentorships.filter((m) =>
    role === 'Mentor' ? m.mentorId === mentorId : m.menteeId === menteeId,
  );
  return {
    mentors: state.mentors.filter(
      (m) =>
        (role === 'Mentor' && m.id === mentorId) ||
        mentorships.some((x) => x.mentorId === m.id),
    ),
    mentees: state.mentees.filter(
      (m) =>
        (role === 'Mentoreado' && m.id === menteeId) ||
        mentorships.some((x) => x.menteeId === m.id),
    ),
    mentorships,
  };
}

export async function validateFile(file: File, kind: 'photo' | 'document') {
  const max = kind === 'photo' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
  if (!file.size || file.size > max)
    throw new Error(
      `El archivo debe pesar entre 1 byte y ${max / 1024 / 1024} MB.`,
    );
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const pdf = [37, 80, 68, 70, 45].every((b, i) => bytes[i] === b);
  const valid =
    kind === 'photo'
      ? (png && file.type === 'image/png') ||
        (jpeg && file.type === 'image/jpeg')
      : pdf && file.type === 'application/pdf';
  if (!valid)
    throw new Error(
      kind === 'photo'
        ? 'Selecciona una imagen PNG o JPEG válida.'
        : 'Selecciona un documento PDF válido.',
    );
}
