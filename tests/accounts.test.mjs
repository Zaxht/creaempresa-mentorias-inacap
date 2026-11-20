import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createPerson } from '../supabase/functions/create-person/index.ts';

test('cuentas: solo admin, vínculo atómico, duplicados y contraseña propia', async () => {
  const db = new PGlite();
  const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
      create table auth.users(id uuid primary key,email text,encrypted_password text,raw_app_meta_data jsonb default '{}',raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public,storage to authenticated,anon;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
      alter table storage.objects enable row level security;grant select,insert on storage.objects to authenticated;`);
    for (const file of [
      '202611180001_mentorias.sql',
      '202611200001_person_accounts.sql',
    ])
      await db.exec(
        await readFile(
          new URL(`../supabase/migrations/${file}`, import.meta.url),
          'utf8',
        ),
      );
    await db.exec(`insert into auth.users(id,email,encrypted_password) values('${uid(1)}','admin@example.test','hash');
      insert into app_profiles(id,role) values('${uid(1)}','Administrador');`);
    const as = async (id) =>
      db.exec(
        `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${uid(id)}',false)`,
      );
    const prepare = async (id, kind, email) =>
      (
        await db.query('select prepare_person_account($1,$2,$3) result', [
          uid(id),
          kind,
          JSON.stringify({
            name: 'Persona de prueba',
            email,
            phone: '',
            expertise: 'Finanzas, Ventas',
          }),
        ])
      ).rows[0].result;
    await as(1);
    const mentor = await prepare(10, 'mentors', 'mentor@example.test');
    await assert.rejects(
      prepare(10, 'mentors', 'mentor@example.test'),
      /procesando/,
    );
    await db.exec('reset role');
    // User metadata cannot provision a profile, even if it copies a request ID.
    await db.query(
      'insert into auth.users(id,email,encrypted_password,raw_user_meta_data) values($1,$2,$3,$4)',
      [
        uid(99),
        'attacker@example.test',
        'hash',
        JSON.stringify({ program_request: mentor.id, role: 'Administrador' }),
      ],
    );
    assert.equal(
      (await db.query('select * from app_profiles where id=$1', [uid(99)])).rows
        .length,
      0,
    );
    await db.query(
      'insert into auth.users(id,email,encrypted_password) values($1,$2,$3)',
      [uid(2), 'mentor@example.test', 'initial-hash'],
    );
    await db.query('update auth.users set raw_app_meta_data=$1 where id=$2', [
      JSON.stringify({ program_request: mentor.id }),
      uid(2),
    ]);
    assert.equal(
      (await db.query('select user_id from mentors where id=$1', [mentor.id]))
        .rows[0].user_id,
      uid(2),
    );
    await as(2);
    const access = (await db.query('select get_account_access() result'))
      .rows[0].result;
    assert.deepEqual(access, { role: 'Mentor', mustChangePassword: true });
    await assert.rejects(db.query('select get_workspace()'), /sin acceso/);
    await assert.rejects(
      prepare(11, 'mentees', 'other@example.test'),
      /Solo administración/,
    );
    await db.exec(
      `reset role;update auth.users set encrypted_password='own-hash' where id='${uid(2)}'`,
    );
    await as(2);
    assert.equal(
      (await db.query('select get_workspace() result')).rows[0].result.mentorId,
      mentor.id,
    );
    await assert.rejects(
      prepare(11, 'mentees', 'other@example.test'),
      /Solo administración/,
    );
    await as(1);
    assert.equal(
      (await prepare(10, 'mentors', 'mentor@example.test')).complete,
      true,
    );
    await assert.rejects(
      prepare(12, 'mentors', 'MENTOR@example.test'),
      /ya tiene una cuenta/,
    );
    const mentee = await prepare(20, 'mentees', 'mentoreado@example.test');
    await db.exec('reset role');
    await db.query(
      'insert into auth.users(id,email,encrypted_password,raw_app_meta_data) values($1,$2,$3,$4)',
      [
        uid(3),
        'mentoreado@example.test',
        'initial-hash',
        JSON.stringify({ program_request: mentee.id }),
      ],
    );
    assert.equal(
      (await db.query('select user_id from mentees where id=$1', [mentee.id]))
        .rows[0].user_id,
      uid(3),
    );
    await as(3);
    await assert.rejects(
      prepare(21, 'mentors', 'bad@example.test'),
      /Solo administración/,
    );
    await db.exec('reset role;set role anon');
    await assert.rejects(
      prepare(22, 'mentors', 'anon@example.test'),
      /permission denied/,
    );
    await as(1);
    await assert.rejects(
      prepare(23, 'Administrador', 'bad@example.test'),
      /inválidos/,
    );
    const retry = await prepare(30, 'mentees', 'retry@example.test');
    await db.query('select finish_person_account($1)', [retry.id]);
    assert.equal(
      (await prepare(31, 'mentees', 'retry@example.test')).id,
      retry.id,
    );
    await db.exec('reset role');
    await assert.rejects(
      db.query(
        'insert into auth.users(id,email,encrypted_password,raw_app_meta_data) values($1,$2,$3,$4)',
        [
          uid(4),
          'wrong@example.test',
          'hash',
          JSON.stringify({ program_request: retry.id }),
        ],
      ),
      /no disponible/,
    );
    assert.equal(
      (await db.query('select * from auth.users where id=$1', [uid(4)])).rows
        .length,
      0,
    );
  } finally {
    await db.close();
  }
});

test('endpoint: nunca llama Auth Admin si el rol o los datos no son válidos', async () => {
  const env = {
    url: 'https://project.supabase.co',
    anonKey: 'public',
    serviceKey: 'server-only',
  };
  const body = {
    id: '00000000-0000-4000-8000-000000000010',
    kind: 'mentors',
    password: 'Initial-test-82',
    details: { name: 'Prueba', email: 'test@example.test' },
  };
  const req = (payload = body, token = 'user-token') =>
    new Request('https://project.supabase.co/functions/v1/create-person', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  const calls = [];
  const denied = async (url) => {
    calls.push(url);
    return Response.json({ code: '42501' }, { status: 403 });
  };
  assert.equal((await createPerson(req(), env, denied)).status, 403);
  assert.equal(calls.length, 1);
  assert.equal(
    (await createPerson(req({ ...body, kind: 'Administrador' }), env, denied))
      .status,
    400,
  );
  assert.equal(calls.length, 1);
  const transport = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('prepare_person_account'))
      return Response.json({ id: body.id, email: body.details.email });
    if (url.endsWith('/admin/users')) {
      const user = JSON.parse(options.body);
      assert.equal(user.email_confirm, true);
      assert.deepEqual(user.app_metadata, { program_request: body.id });
      assert.equal(user.password, body.password);
      return Response.json({ id: 'auth-id' });
    }
    return Response.json(null);
  };
  const response = await createPerson(req(), env, transport);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: body.id });
  const rpcCalls = calls.filter(
    (c) => typeof c === 'object' && c.url.includes('/rpc/'),
  );
  assert.ok(rpcCalls.every((c) => !c.options.body.includes(body.password)));
});
