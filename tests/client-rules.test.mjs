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
