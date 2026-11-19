'use client';
import Image from 'next/image';
import { useEffect, useState, type ReactNode } from 'react';
import {
  MentoriasRepository,
  type Workspace,
} from '@/lib/mentorias/repository';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, ShieldCheck, Users, ClipboardCheck } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="access-screen min-h-screen bg-zinc-50 p-4 sm:p-8 lg:p-12">
      <div className="mx-auto grid min-h-[calc(100svh-6rem)] max-w-6xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl shadow-zinc-200/40 lg:grid-cols-2">
        <aside className="access-story relative flex flex-col justify-between overflow-hidden bg-zinc-950 p-8 text-white sm:p-12">
          <div className="relative z-10">
            <span className="text-sm font-semibold tracking-[.18em] text-red-300">
              CREA EMPRESA / INACAP
            </span>
            <h2 className="mt-10 max-w-md text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Acompañar ideas.
              <br />
              <span className="text-red-400">Impulsar proyectos.</span>
            </h2>
            <p className="mt-5 max-w-sm text-base leading-relaxed text-zinc-300">
              Un espacio para conectar personas, registrar avances y dar
              continuidad a cada mentoría.
            </p>
          </div>
          <div className="relative z-10 mt-10 grid gap-4 border-t border-white/15 pt-6 text-sm text-zinc-200">
            <p className="flex items-center gap-3">
              <Users className="size-5 text-red-400" /> Personas y mentorías en
              un mismo lugar
            </p>
            <p className="flex items-center gap-3">
              <ClipboardCheck className="size-5 text-red-400" /> Sesiones,
              acuerdos y evidencias
            </p>
          </div>
        </aside>
        <section className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-14">
          <Image
            unoptimized
            width={96}
            height={96}
            src="/logoinacap.png"
            alt="INACAP"
            className="mb-6 h-16 w-auto max-w-32 self-start object-contain"
          />
          <p className="text-sm font-semibold text-red-700">Crea Empresa</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Bienvenido a tu espacio
          </h1>
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
                    e instanceof Error
                      ? e.message
                      : 'No se pudo iniciar sesión.',
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
                <div className="relative">
                  <Input
                    id="login-password"
                    className="mt-1 pr-12"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    maxLength={128}
                    disabled={busy}
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center text-zinc-500 hover:text-zinc-900"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
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
          <p className="mt-5 flex items-start gap-2 text-sm leading-relaxed text-zinc-500">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            La demostración usa datos de ejemplo y no accede a las cuentas del
            programa.
          </p>
        </section>
      </div>
    </main>
  );
}
