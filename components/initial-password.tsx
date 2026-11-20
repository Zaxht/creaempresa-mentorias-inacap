'use client';
import Image from 'next/image';
import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole } from 'lucide-react';
import type {
  MentoriasRepository,
  Workspace,
} from '@/lib/mentorias/repository';
import { MentoringArt } from './mentoring-art';
import './access-editorial.css';

export function InitialPassword({
  repository,
  onComplete,
  onExit,
}: {
  repository: MentoriasRepository;
  onComplete: (workspace: Workspace) => void;
  onExit: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
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
        <aside
          className="auth-poster"
          aria-labelledby="initial-password-poster-title"
        >
          <div className="auth-poster-copy">
            <p className="auth-eyebrow auth-poster-eyebrow">
              Personas que impulsan ideas
            </p>
            <h2
              id="initial-password-poster-title"
              className="auth-poster-title"
            >
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

        <section
          className="auth-access"
          aria-labelledby="initial-password-title"
        >
          <div className="auth-access-heading">
            <p className="auth-eyebrow auth-access-eyebrow">Tu primer acceso</p>
            <h1 id="initial-password-title" className="auth-title">
              {saved ? 'Tu contraseña está lista.' : 'Haz tuyo este espacio.'}
            </h1>
            <p className="auth-description">
              {saved
                ? 'Tu nueva contraseña ya está guardada. Continúa para entrar a tus mentorías.'
                : 'Cambia la contraseña inicial por una que solo tú conozcas.'}
            </p>
          </div>
          <form
            className="auth-form"
            aria-busy={busy}
            aria-describedby={error ? 'initial-password-error' : undefined}
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy) return;
              const data = new FormData(event.currentTarget);
              const rawPassword = data.get('password');
              const password =
                typeof rawPassword === 'string' ? rawPassword : '';
              if (!saved && password !== data.get('confirm')) {
                setError('Las contraseñas no coinciden.');
                return;
              }
              if (!saved && new TextEncoder().encode(password).length > 72) {
                setError('Usa una contraseña más corta (máximo 72 bytes).');
                return;
              }
              setBusy(true);
              setError('');
              try {
                if (!saved) {
                  const { error: changeError } =
                    await repository.client.auth.updateUser({ password });
                  if (changeError)
                    throw new Error(
                      changeError.code === 'same_password'
                        ? 'Elige una contraseña distinta de la inicial.'
                        : 'No se pudo cambiar la contraseña. Usa una distinta y evita claves comunes.',
                    );
                  setSaved(true);
                }
                onComplete(await repository.load());
              } catch (reason) {
                setError(
                  reason instanceof Error
                    ? reason.message
                    : 'No se pudo continuar. Intenta nuevamente.',
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {!saved && (
              <>
                <div className="auth-field">
                  <label htmlFor="own-password" className="auth-label">
                    Nueva contraseña
                  </label>
                  <div className="auth-input-wrap">
                    <KeyRound
                      className="auth-field-icon"
                      size={19}
                      aria-hidden="true"
                    />
                    <input
                      id="own-password"
                      className="auth-input auth-input-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={72}
                      disabled={busy}
                      placeholder="Al menos 8 caracteres"
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      aria-label={
                        showPassword
                          ? 'Ocultar nueva contraseña'
                          : 'Mostrar nueva contraseña'
                      }
                      aria-pressed={showPassword}
                      aria-controls="own-password"
                      disabled={busy}
                      onClick={() => setShowPassword((visible) => !visible)}
                    >
                      {showPassword ? (
                        <EyeOff size={19} aria-hidden="true" />
                      ) : (
                        <Eye size={19} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="auth-field">
                  <label htmlFor="confirm-own-password" className="auth-label">
                    Confirmar contraseña
                  </label>
                  <div className="auth-input-wrap">
                    <LockKeyhole
                      className="auth-field-icon"
                      size={19}
                      aria-hidden="true"
                    />
                    <input
                      id="confirm-own-password"
                      className="auth-input auth-input-password"
                      name="confirm"
                      type={showConfirmation ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={72}
                      disabled={busy}
                      placeholder="Repite tu nueva contraseña"
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      aria-label={
                        showConfirmation
                          ? 'Ocultar confirmación de contraseña'
                          : 'Mostrar confirmación de contraseña'
                      }
                      aria-pressed={showConfirmation}
                      aria-controls="confirm-own-password"
                      disabled={busy}
                      onClick={() => setShowConfirmation((visible) => !visible)}
                    >
                      {showConfirmation ? (
                        <EyeOff size={19} aria-hidden="true" />
                      ) : (
                        <Eye size={19} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
            {error && (
              <p
                id="initial-password-error"
                role="alert"
                className="auth-error"
              >
                {error}
              </p>
            )}
            <button type="submit" className="auth-submit" disabled={busy}>
              <span aria-live="polite">
                {busy
                  ? saved
                    ? 'Entrando…'
                    : 'Guardando…'
                  : saved
                    ? 'Entrar al programa'
                    : 'Guardar y entrar'}
              </span>
              <ArrowRight
                className="auth-submit-arrow"
                size={21}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              className="auth-label min-h-11 cursor-pointer justify-self-start underline underline-offset-4 disabled:cursor-wait disabled:opacity-60"
              disabled={busy}
              onClick={onExit}
            >
              Cerrar sesión
            </button>
          </form>
          <p className="auth-account-note">
            Tu ficha y tu rol ya están vinculados a esta cuenta.
          </p>
        </section>
      </div>
    </main>
  );
}
