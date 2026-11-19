import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('PostgreSQL: migración, RLS, rutinas, concurrencia y transacciones', async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
   create schema auth; create schema storage;
   create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth,public,storage to authenticated,anon;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
   alter table storage.objects enable row level security;
   grant select,insert on storage.objects to authenticated;`);
    await db.exec(
      await readFile(
        new URL(
          '../supabase/migrations/202611180001_mentorias.sql',
          import.meta.url,
        ),
        'utf8',
      ),
    );
    const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
    await db.exec(`insert into auth.users select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,5)n;
   insert into app_profiles values('${uid(1)}','Administrador',true),('${uid(2)}','Mentor',true),('${uid(3)}','Mentor',true),('${uid(4)}','Mentoreado',true),('${uid(5)}','Mentor',false);`);
    const as = async (n) => {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        uid(n),
      ]);
      await db.exec('set role authenticated');
    };
    const save = (commands) =>
      db.query('select save_changes($1::jsonb)', [JSON.stringify(commands)]);
    const create = (entity, id, patch) => ({
      entity,
      id: uid(id),
      patch,
      version: null,
    });
    await as(1);
    await save([
      create('mentors', 10, { name: 'Mentor A' }),
      create('mentors', 11, { name: 'Mentor B' }),
      create('mentees', 20, { name: 'Participante A' }),
      create('mentees', 21, { name: 'Participante B' }),
    ]);
    await db.exec(
      `reset role;update mentors set user_id='${uid(2)}' where id='${uid(10)}';update mentors set user_id='${uid(3)}' where id='${uid(11)}';update mentees set user_id='${uid(4)}' where id='${uid(20)}';`,
    );
    await as(1);
    await save([
      create('mentorships', 30, { mentorId: uid(10), menteeId: uid(20) }),
      create('mentorships', 31, { mentorId: uid(11), menteeId: uid(21) }),
    ]);
    await t.test(
      'crea seis sesiones por mentoría y resumen desde SQL',
      async () => {
        assert.equal(
          (await db.query('select * from sessions')).rows.length,
          12,
        );
        assert.equal(
          (await db.query('select dashboard_summary() result')).rows[0].result
            .mentorships,
          2,
        );
      },
    );
    await t.test(
      'mentor solo extrae su mentoría, personas y sesiones',
      async () => {
        await as(2);
        const result = (await db.query('select get_workspace() result')).rows[0]
          .result;
        assert.equal(result.state.mentorships.length, 1);
        assert.equal(result.state.mentors.length, 1);
        assert.equal(result.state.mentees.length, 1);
        assert.equal(result.state.mentorships[0].sessions.length, 6);
        assert.equal(
          (await db.query('select * from mentorships')).rows.length,
          1,
        );
        await assert.rejects(
          save([
            {
              entity: 'mentorships',
              id: uid(31),
              version: 0,
              patch: { goal: 'Intrusión' },
            },
          ]),
          /ajena/,
        );
        await assert.rejects(
          save([
            {
              entity: 'mentorships',
              id: uid(30),
              version: 0,
              patch: { mentorId: uid(11) },
            },
          ]),
          /reservado/,
        );
      },
    );
    await t.test('no permite escritura directa ni elevar el rol', async () => {
      await assert.rejects(
        db.query("update app_profiles set role='Administrador' where id=$1", [
          uid(2),
        ]),
        /permission denied/,
      );
      await assert.rejects(
        db.query("update mentorships set goal='ataque'"),
        /permission denied/,
      );
      await assert.rejects(
        save([
          {
            entity: 'mentors',
            id: uid(10),
            version: 0,
            patch: { user_id: uid(3) },
          },
        ]),
        /no permitido/,
      );
    });
    const sid = (
      await db.query(
        'select id from sessions where "mentorshipId"=$1 and number=1',
        [uid(30)],
      )
    ).rows[0].id;
    await t.test('valida sesiones y detecta versiones obsoletas', async () => {
      await assert.rejects(
        save([
          {
            entity: 'sessions',
            id: sid,
            version: 0,
            patch: { status: 'Realizada' },
          },
        ]),
        /check constraint/,
      );
      await save([
        {
          entity: 'sessions',
          id: sid,
          version: 0,
          patch: {
            status: 'Realizada',
            date: '2026-11-18',
            summary: 'Se revisó el plan comercial.',
          },
        },
      ]);
      await assert.rejects(
        save([
          {
            entity: 'sessions',
            id: sid,
            version: 0,
            patch: { summary: 'Cambio antiguo' },
          },
        ]),
        /CONFLICT/,
      );
    });
    await t.test('revierte todo el lote si una operación falla', async () => {
      await assert.rejects(
        save([
          {
            entity: 'mentors',
            id: uid(10),
            version: 0,
            patch: { name: 'No debe persistir' },
          },
          { entity: 'sessions', id: sid, version: 1, patch: { number: 7 } },
        ]),
      );
      assert.equal(
        (await db.query('select name from mentors where id=$1', [uid(10)]))
          .rows[0].name,
        'Mentor A',
      );
    });
    await t.test('evidencias privadas y bloqueo de rutas ajenas', async () => {
      assert.equal(
        (
          await db.query('select can_access_file($1,true) allowed', [
            `sessions/${uid(31)}/1/a.pdf`,
          ])
        ).rows[0].allowed,
        false,
      );
      await assert.rejects(
        save([
          {
            entity: 'sessions',
            id: sid,
            version: 1,
            patch: {
              document: {
                path: `sessions/${uid(30)}/1/no-existe.pdf`,
                name: 'a.pdf',
                type: 'application/pdf',
                size: 10,
              },
            },
          },
        ]),
        /no disponible/,
      );
      await db.query(
        'insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)',
        [
          'mentorias-private',
          `sessions/${uid(30)}/1/a.pdf`,
          { size: 10, mimetype: 'application/pdf' },
        ],
      );
      await save([
        {
          entity: 'sessions',
          id: sid,
          version: 1,
          patch: {
            document: {
              path: `sessions/${uid(30)}/1/a.pdf`,
              name: 'a.pdf',
              type: 'application/pdf',
              size: 10,
            },
          },
        },
      ]);
      await as(3);
      assert.equal((await db.query('select * from evidence')).rows.length, 0);
      assert.equal(
        (await db.query('select * from storage.objects')).rows.length,
        0,
      );
    });
    await t.test(
      'mentoreado no modifica sesiones; cuenta inactiva no accede',
      async () => {
        await as(4);
        await assert.rejects(
          save([
            {
              entity: 'sessions',
              id: sid,
              version: 2,
              patch: { summary: 'No autorizado' },
            },
          ]),
          /ajena/,
        );
        await as(5);
        await assert.rejects(db.query('select get_workspace()'), /sin acceso/);
      },
    );
    await t.test('mentorías cerradas bloquean sesiones', async () => {
      await as(1);
      await save([
        {
          entity: 'mentorships',
          id: uid(30),
          version: 0,
          patch: { status: 'Terminada' },
        },
      ]);
      await as(2);
      await assert.rejects(
        save([
          {
            entity: 'sessions',
            id: sid,
            version: 2,
            patch: { summary: 'Cerrada' },
          },
        ]),
        /en proceso/,
      );
    });
    await t.test('anónimo no ejecuta rutinas ni lee datos', async () => {
      await db.exec('reset role;set role anon');
      await assert.rejects(
        db.query('select get_workspace()'),
        /permission denied/,
      );
      await assert.rejects(
        db.query('select * from mentors'),
        /permission denied/,
      );
    });
  } finally {
    await db.close();
  }
});
