'use client';
import Image from 'next/image';
import { useEffect, useState, type ReactNode } from 'react';
import {
  MentoriasRepository,
  type Workspace,
} from '@/lib/mentorias/repository';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function MentoriasAccess({
  children,
}: {
  children: (
    repository: MentoriasRepository | null,
    workspace: Workspace | null,
    exit: () => void,
  ) => ReactNode;
}) {
  const [repository, setRepository] = useState<MentoriasRepository | null>(
    null,
  );
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void fetch('/api/config')
      .then((r) => {
        if (!r.ok) throw new Error('Configuración no disponible.');
        return r.json();
      })
      .then((value) => {
        const config = value as {
          configured: boolean;
          url: string;
          key: string;
        };
        if (active && config.configured)
          setRepository(new MentoriasRepository(config.url, config.key));
      })
      .catch(() => {
        if (active)
          setError('No se pudo comprobar la conexión. Recarga la página.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!repository) return;
    const { data } = repository.client.auth.onAuthStateChange(
      (event, session) => {
        if (
          event === 'SIGNED_OUT' ||
          (event === 'INITIAL_SESSION' && !session)
        ) {
          setWorkspace(null);
          if (event === 'SIGNED_OUT') setError('Sesión cerrada.');
        }
      },
    );
    return () => data.subscription.unsubscribe();
  }, [repository]);
  const exit = () => {
    setWorkspace(null);
    setDemo(false);
    if (repository) void repository.client.auth.signOut({ scope: 'local' });
  };
  if (demo || workspace)
    return children(demo ? null : repository, demo ? null : workspace, exit);
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50 px-4 py-10">
      <section className="w-full max-w-md rounded-xl border bg-white p-8 shadow-sm">
        <Image
          unoptimized
          width={96}
          height={96}
          src="/logoinacap.png"
          alt="INACAP"
          className="mb-6 h-16 w-auto"
        />
        <p className="text-sm font-semibold text-red-700">Crea Empresa</p>
        <h1 className="mt-2 text-2xl font-semibold">Gestión de mentorías</h1>
        <p className="my-4 text-sm text-zinc-600">
          Ingresa con tu cuenta del programa para acceder a tus mentorías.
        </p>
        {loading ? (
          <p>Cargando conexión…</p>
        ) : repository ? (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError('');
              const form = new FormData(event.currentTarget);
              try {
                const email = form.get('email');
                const password = form.get('password');
                if (typeof email !== 'string' || typeof password !== 'string')
                  throw new Error('Completa tus credenciales.');
                const { error: authError } =
                  await repository.client.auth.signInWithPassword({
                    email: email.trim(),
                    password,
                  });
                if (authError)
                  throw new Error(
                    'No se pudo iniciar sesión. Revisa tus datos o espera antes de reintentar.',
                  );
                setWorkspace(await repository.load());
              } catch (e) {
                await repository.client.auth.signOut({ scope: 'local' });
                setError(
                  e instanceof Error ? e.message : 'No se pudo iniciar sesión.',
                );
              } finally {
                setBusy(false);
              }
            }}
            className="space-y-4"
          >
            <label htmlFor="login-email" className="block text-sm">
              Correo
              <Input
                id="login-email"
                className="mt-1"
                name="email"
                type="email"
                autoComplete="username"
                required
                maxLength={254}
                disabled={busy}
              />
            </label>
            <label htmlFor="login-password" className="block text-sm">
              Contraseña
              <Input
                id="login-password"
                className="mt-1"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
                disabled={busy}
              />
            </label>
            <Button
              type="submit"
              className="w-full bg-red-700 hover:bg-red-800"
              disabled={busy}
            >
              {busy ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>
        ) : (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            La conexión del programa todavía no está activada. Puedes explorar
            la demostración con datos de ejemplo.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}
        {!loading && (
          <Button
            variant="outline"
            disabled={busy}
            className="mt-5 w-full"
            onClick={() => setDemo(true)}
          >
            Abrir demostración
          </Button>
        )}
        <p className="mt-5 text-xs text-zinc-500">
          La demostración guarda datos solo en este navegador y no permite
          acceder a las cuentas del programa.
        </p>
      </section>
    </main>
  );
}
