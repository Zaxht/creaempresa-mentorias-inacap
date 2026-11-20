import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scopeState,
  validateFile,
  programDate,
} from '../lib/mentorias/access.ts';

test('la fecha del programa conserva el día de Chile cuando UTC ya cambió', () => {
  assert.equal(programDate(new Date('2026-11-19T02:30:00Z')), '2026-11-18');
  assert.equal(programDate(new Date('2026-11-19T04:00:00Z')), '2026-11-19');
});
import { collectChanges } from '../lib/mentorias/changes.ts';

test('la exportación de mentor excluye las personas y mentorías ajenas', () => {
  const state = {
    mentors: [{ id: 'a' }, { id: 'b' }],
    mentees: [{ id: 'x' }, { id: 'y' }],
    mentorships: [
      { id: '1', mentorId: 'a', menteeId: 'x' },
      { id: '2', mentorId: 'b', menteeId: 'y' },
    ],
  };
  const result = scopeState(state, 'Mentor', 'a');
  assert.deepEqual(result.mentors, [{ id: 'a' }]);
  assert.deepEqual(result.mentees, [{ id: 'x' }]);
  assert.equal(result.mentorships.length, 1);
  assert.equal(
    scopeState(state, 'Mentor', 'desconocido').mentorships.length,
    0,
  );
});
test('no persiste URLs firmadas ni versiones manipuladas como campos de usuario', () => {
  const original = {
    mentors: [
      {
        id: 'a',
        version: 2,
        name: 'A',
        photo: 'https://old',
        photoPath: 'mentors/a/photo.png',
      },
    ],
    mentees: [],
    mentorships: [],
  };
  const current = structuredClone(original);
  current.mentors[0].photo = 'https://new';
  current.mentors[0].version = 500;
  assert.deepEqual(collectChanges(original, current), []);
  current.mentors[0].name = 'Nuevo';
  assert.deepEqual(collectChanges(original, current), [
    { entity: 'mentors', id: 'a', version: 2, patch: { name: 'Nuevo' } },
  ]);
});
test('valida contenido, MIME y tamaño de evidencias', async () => {
  await validateFile(
    new File(['%PDF-1.7 prueba'], 'test.pdf', { type: 'application/pdf' }),
    'document',
  );
  await assert.rejects(
    validateFile(
      new File(['<script>'], 'test.pdf', { type: 'application/pdf' }),
      'document',
    ),
    /PDF válido/,
  );
  await assert.rejects(
    validateFile(
      new File(['%PDF-1.7'], 'foto.png', { type: 'image/png' }),
      'photo',
    ),
    /PNG o JPEG/,
  );
  await assert.rejects(
    validateFile(
      new File([new Uint8Array(5242881)], 'test.pdf', {
        type: 'application/pdf',
      }),
      'document',
    ),
    /5 MB/,
  );
});

// Saving one dialog must not persist unrelated drafts or touch other sessions.
import {
  mentorshipSaveState,
  acknowledgedMentorship,
} from '../lib/mentorias/changes.ts';
test('el guardado de una mentoría está aislado y conserva las versiones confirmadas', () => {
  const record = {
    id: 'm1',
    version: 2,
    goal: 'Inicial',
    sessions: [
      {
        id: 's1',
        version: 4,
        number: 1,
        status: 'Pendiente',
        date: '',
        summary: '',
      },
      {
        id: 's2',
        version: 7,
        number: 2,
        status: 'Pendiente',
        date: '',
        summary: '',
      },
    ],
  };
  const original = {
    mentors: [{ id: 'p1', version: 1, name: 'Persona' }],
    mentees: [],
    mentorships: [record, { id: 'm2', version: 5, goal: 'Otra', sessions: [] }],
  };
  const changed = structuredClone(record);
  changed.sessions[0] = {
    ...changed.sessions[0],
    status: 'Realizada',
    date: '2026-11-20',
    summary: 'Acuerdo registrado',
  };
  const target = mentorshipSaveState(original, changed);
  const commands = collectChanges(original, target);
  assert.equal(commands.length, 1);
  assert.equal(commands[0].entity, 'sessions');
  assert.equal(commands[0].id, 's1');
  assert.equal(commands[0].version, 4);
  assert.deepEqual(target.mentors, original.mentors);
  assert.deepEqual(target.mentorships[1], original.mentorships[1]);
  assert.equal(original.mentorships[0].sessions[0].status, 'Pendiente');
  const acknowledged = acknowledgedMentorship(changed, commands);
  assert.equal(acknowledged.version, 2);
  assert.equal(acknowledged.sessions[0].version, 5);
  assert.equal(acknowledged.sessions[1].version, 7);
  assert.deepEqual(
    collectChanges(
      { ...original, mentorships: [acknowledged] },
      { ...original, mentorships: [acknowledged] },
    ),
    [],
  );
  assert.throws(
    () => mentorshipSaveState(original, { ...record, id: 'missing' }),
    /ya no está disponible/,
  );
});
