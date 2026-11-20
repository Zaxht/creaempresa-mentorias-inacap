'use client';
import Image from 'next/image';
import { useEffect, useState, type ReactNode } from 'react';
import {
  MentoriasRepository,
  type Workspace,
} from '@/lib/mentorias/repository';
import { InitialPassword } from './initial-password';
import { MentoringArt } from './mentoring-art';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import './access-editorial.css';

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
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
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
          setMustChangePassword(false);
        }
      },
    );
    return () => data.subscription.unsubscribe();
  }, [repository]);
  const exit = () => {
    setError('');
    setWorkspace(null);
    setShowPassword(false);
    setMustChangePassword(false);
    if (repository) void repository.client.auth.signOut({ scope: 'local' });
  };
  if (workspace) return children(repository, workspace, exit);
  if (mustChangePassword && repository)
    return (
      <InitialPassword
        repository={repository}
        onComplete={(value) => {
          setMustChangePassword(false);
          setWorkspace(value);
        }}
        onExit={exit}
      />
    );
  return (
    <main className="auth-editorial">
      <header className="auth-topbar">
        <div className="auth-brand">
          <Image
            unoptimized
            width={48}
            height={48}
            src="/logoinacap.png"
            alt=""
            className="auth-brand-logo"
          />
          <span className="auth-brand-institution">INACAP</span>
          <span className="auth-brand-program">Crea Empresa</span>
        </div>
        <p className="auth-topbar-caption">Programa de mentorías</p>
      </header>

      <div className="auth-layout">
        <aside className="auth-poster" aria-labelledby="auth-poster-title">
          <div className="auth-poster-copy">
            <p className="auth-eyebrow auth-poster-eyebrow">
              Personas que impulsan ideas
            </p>
            <h2 id="auth-poster-title" className="auth-poster-title">
              Las ideas crecen en compañía.
            </h2>
          </div>
          <div className="auth-poster-art">
            <MentoringArt className="auth-illustration" />
          </div>
          <div className="auth-poster-footer">
            <p>
              Una conversación abre caminos.
              <br />
              Una mentoría te ayuda a recorrerlos.
            </p>
            <ArrowRight size={24} aria-hidden="true" />
          </div>
        </aside>
        <section className="auth-access" aria-labelledby="auth-title">
          <div className="auth-access-heading">
            <p className="auth-eyebrow auth-access-eyebrow">
              Tu espacio de mentorías
            </p>
            <h1 id="auth-title" className="auth-title">
              Tu próximo paso empieza aquí.
            </h1>
            <p className="auth-description">
              Ingresa a tu cuenta y continúa con tus mentorías.
            </p>
          </div>
          {loading ? (
            <output className="auth-notice">Cargando conexión…</output>
          ) : repository ? (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (busy) return;
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
                  const { data: access, error: accessError } =
                    await repository.client.rpc('get_account_access');
                  if (accessError || !access)
                    throw new Error(
                      'Tu cuenta no tiene acceso al programa. Contacta al administrador.',
                    );
                  if (access.mustChangePassword) setMustChangePassword(true);
                  else setWorkspace(await repository.load());
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
              className="auth-form"
              aria-busy={busy}
              aria-describedby={error ? 'auth-error' : undefined}
            >
              <div className="auth-field">
                <label htmlFor="login-email" className="auth-label">
                  Correo electrónico
                </label>
                <div className="auth-input-wrap">
                  <Mail
                    className="auth-field-icon"
                    size={19}
                    aria-hidden="true"
                  />
                  <input
                    id="login-email"
                    className="auth-input"
                    name="email"
                    type="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="nombre@correo.cl"
                    required
                    maxLength={254}
                    disabled={busy}
                  />
                </div>
              </div>
              <div className="auth-field">
                <label htmlFor="login-password" className="auth-label">
                  Contraseña
                </label>
                <div className="auth-input-wrap">
                  <LockKeyhole
                    className="auth-field-icon"
                    size={19}
                    aria-hidden="true"
                  />
                  <input
                    id="login-password"
                    className="auth-input auth-input-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    maxLength={128}
                    disabled={busy}
                    placeholder="Tu contraseña"
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                    aria-pressed={showPassword}
                    aria-controls="login-password"
                    disabled={busy}
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="auth-password-toggle"
                  >
                    {showPassword ? (
                      <EyeOff size={19} aria-hidden="true" />
                    ) : (
                      <Eye size={19} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
              <button type="submit" className="auth-submit" disabled={busy}>
                <span aria-live="polite">
                  {busy ? 'Ingresando…' : 'Ingresar'}
                </span>
                <ArrowRight
                  className="auth-submit-arrow"
                  size={21}
                  aria-hidden="true"
                />
              </button>
            </form>
          ) : (
            <output className="auth-notice">
              La conexión del programa todavía no está activada. Contacta al
              administrador para acceder.
            </output>
          )}
          {error && (
            <p id="auth-error" role="alert" className="auth-error">
              {error}
            </p>
          )}
          <p className="auth-account-note">
            Tu cuenta es creada por el administrador del programa.
            <span>Si necesitas ayuda para ingresar, contáctalo.</span>
          </p>
        </section>
      </div>
    </main>
  );
}
