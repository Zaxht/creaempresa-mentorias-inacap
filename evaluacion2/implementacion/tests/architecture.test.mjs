import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { MentoriasService } from '../application/mentorias-service.mjs';
import { MemoryRepository } from '../infrastructure/memory-repository.mjs';
import { createHandler } from '../interface/http-handler.mjs';
import { SqliteRepository } from '../infrastructure/sqlite-repository.mjs';
import { createHttpServer } from '../interface/node-server.mjs';

const mentor = { userId: 'u-mentor-1', role: 'Mentor' };
const other = { userId: 'u-mentor-2', role: 'Mentor' };
const mentee = { userId: 'u-mentee-1', role: 'Mentoreado' };
const admin = { userId: 'u-admin', role: 'Administrador' };
const session = { number: 1, date: '2026-10-01', status: 'Realizada', summary: 'Revisión del flujo de caja.' };
function fixture() {
  const repository = new MemoryRepository([
    { id: 'm1', mentorUserId: mentor.userId, menteeUserId: mentee.userId, status: 'En proceso', sessions: [], version: 0 },
    { id: 'm2', mentorUserId: other.userId, menteeUserId: 'u-mentee-2', status: 'En proceso', sessions: [], version: 0 },
  ]);
  return { repository, service: new MentoriasService(repository) };
}
function request(body, options = {}) {
  return new Request('https://example.test/api/mentorias/m1/sesiones', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), ...options,
  });
}

test('UT01 mentor registra su sesión y conserva la asociación', async () => {
  const { service, repository } = fixture();
  await service.recordSession(mentor, 'm1', session);
  assert.equal((await repository.get('m1')).sessions[0].summary, session.summary);
  assert.equal((await repository.get('m2')).sessions.length, 0);
});
test('UT02 mentor ajeno no modifica datos', async () => {
  const { service, repository } = fixture();
  await assert.rejects(service.recordSession(other, 'm1', session), { code: 'FORBIDDEN' });
  assert.equal((await repository.get('m1')).version, 0);
});
test('UT03 mentoreado es solo lectura', async () => {
  await assert.rejects(fixture().service.recordSession(mentee, 'm1', session), { code: 'FORBIDDEN' });
});
test('UT04 sesión 7 se rechaza', async () => {
  await assert.rejects(fixture().service.recordSession(mentor, 'm1', { ...session, number: 7 }), { code: 'SESSION_LIMIT' });
});
test('UT05 duplicado de número no genera dos sesiones', async () => {
  const { service, repository } = fixture();
  await service.recordSession(mentor, 'm1', session);
  await assert.rejects(service.recordSession(mentor, 'm1', session), { code: 'DUPLICATE_SESSION' });
  assert.equal((await repository.get('m1')).sessions.length, 1);
});
test('UT06 fecha imposible se rechaza', async () => {
  await assert.rejects(fixture().service.recordSession(mentor, 'm1', { ...session, date: '2026-02-30' }), { code: 'INVALID_DATE' });
});
test('UT07 resumen vacío y excesivo se rechazan', async () => {
  const { service } = fixture();
  for (const summary of ['  ', 'a'.repeat(2001)]) {
    await assert.rejects(service.recordSession(mentor, 'm1', { ...session, summary }), { code: 'INVALID_SUMMARY' });
  }
});
test('UT08 estados fuera del catálogo se rechazan', async () => {
  await assert.rejects(fixture().service.recordSession(mentor, 'm1', { ...session, status: 'Hack' }), { code: 'INVALID_STATUS' });
});
test('UT09 lista por propietario y administrador', async () => {
  const { service } = fixture();
  assert.deepEqual((await service.list(mentor)).map((x) => x.id), ['m1']);
  assert.deepEqual((await service.list(mentee)).map((x) => x.id), ['m1']);
  assert.equal((await service.list(admin)).length, 2);
});
test('UT10 control de concurrencia impide perder escrituras', async () => {
  const { service, repository } = fixture();
  const result = await Promise.allSettled([
    service.recordSession(mentor, 'm1', session),
    service.recordSession(mentor, 'm1', { ...session, number: 2 }),
  ]);
  assert.equal(result.filter((x) => x.status === 'fulfilled').length, 1);
  assert.equal(result.find((x) => x.status === 'rejected').reason.code, 'CONFLICT');
  assert.equal((await repository.get('m1')).sessions.length, 1);
});
test('UT11 identidad ausente produce 401', async () => {
  const handler = createHandler({ service: fixture().service, identityProvider: { verify: async () => null } });
  assert.equal((await handler(request(session))).status, 401);
});
test('UT12 rol falsificado en el cuerpo no concede acceso', async () => {
  const handler = createHandler({ service: fixture().service, identityProvider: { verify: async () => mentee } });
  assert.equal((await handler(request({ ...session, role: 'Administrador' }))).status, 403);
});
test('UT13 campos no permitidos se rechazan', async () => {
  await assert.rejects(fixture().service.recordSession(mentor, 'm1', { ...session, mentorUserId: other.userId }), { code: 'UNKNOWN_FIELD' });
});
test('UT14 HTTP real integra capas, permisos y persistencia SQLite', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'crea-empresa-'));
  const path = join(directory, 'mentorias.sqlite');
  let repository;
  let server = null;
  t.after(async () => {
    if (server?.listening) await new Promise((resolve) => server.close(resolve));
    repository?.close();
    await rm(directory, { recursive: true, force: true });
  });
  repository = new SqliteRepository(path, await fixture().repository.list());
  // Tokens y actores ficticios: se prueba autorizacion, no un inicio de sesion real.
  const identities = new Map([['Bearer mentor-test', mentor], ['Bearer other-test', other], ['Bearer mentee-test', mentee]]);
  server = createHttpServer(createHandler({
    service: new MentoriasService(repository),
    identityProvider: { verify: async (req) => identities.get(req.headers.get('authorization')) },
  }));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/api/mentorias`;
  const post = (body, token = 'mentor-test', raw = false) => fetch(`${url}/m1/sesiones`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: raw ? body : JSON.stringify(body),
  });
  assert.equal((await post(session, 'invalid')).status, 401);
  assert.equal((await post(session, 'other-test')).status, 403);
  assert.equal((await post({ ...session, role: 'Administrador' }, 'mentee-test')).status, 403);
  assert.equal((await post('{', 'mentor-test', true)).status, 400);
  assert.equal((await post({ ...session, date: '2026-02-30' })).status, 422);
  assert.equal((await post('x'.repeat(16385), 'mentor-test', true)).status, 413);
  assert.equal((await repository.get('m1')).sessions.length, 0);
  const saved = await post(session);
  assert.equal(saved.status, 201);
  assert.equal(saved.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await saved.json(), session);
  assert.equal((await post(session)).status, 409);
  const listing = await fetch(url, { headers: { Authorization: 'Bearer mentor-test' } });
  const records = await listing.json();
  assert.deepEqual(records.map((record) => record.id), ['m1']);
  assert.deepEqual(records[0].sessions, [session]);

  const stale = await repository.get('m1');
  const changed = { ...stale, version: stale.version + 1, status: 'Suspendida' };
  await repository.save(changed, stale.version);
  await assert.rejects(repository.save(changed, stale.version), { code: 'CONFLICT' });
  await assert.rejects(repository.save({ ...changed, version: changed.version + 1, sessions: [session, session] }, changed.version));
  assert.equal((await repository.get('m1')).version, changed.version);
  assert.deepEqual((await repository.get('m1')).sessions, [session]);

  await new Promise((resolve) => server.close(resolve));
  repository.close();
  repository = undefined;
  repository = new SqliteRepository(path);
  assert.deepEqual((await repository.get('m1')).sessions, [session]);
  assert.equal((await repository.get('m1')).status, 'Suspendida');
  assert.equal((await repository.get('m2')).sessions.length, 0);
});
test('UT15 una mentoría terminada impide nuevas sesiones', async () => {
  const { service } = fixture();
  await service.changeStatus(mentor, 'm1', 'Terminada');
  await assert.rejects(service.recordSession(mentor, 'm1', session), { code: 'MENTORSHIP_CLOSED' });
});
test('UT16 repositorio no expone referencias mutables', async () => {
  const { repository } = fixture();
  const record = await repository.get('m1');
  record.status = 'Terminada';
  assert.equal((await repository.get('m1')).status, 'En proceso');
});
test('UT17 errores internos no exponen detalles', async () => {
  const handler = createHandler({ service: fixture().service, identityProvider: { verify: async () => { throw new Error('secret'); } } });
  const response = await handler(request(session));
  assert.equal(response.status, 500);
  assert.ok(!(await response.text()).includes('secret'));
});
test('UT18 dominio no depende de HTTP ni infraestructura', async () => {
  const domain = await readFile(new URL('../domain/rules.mjs', import.meta.url), 'utf8');
  assert.ok(!/from\s+['"][^'"]*(infrastructure|interface|react|supabase)/.test(domain));
  const application = await readFile(new URL('../application/mentorias-service.mjs', import.meta.url), 'utf8');
  assert.ok(!/from\s+['"][^'"]*(infrastructure|interface|react)/.test(application));
});
