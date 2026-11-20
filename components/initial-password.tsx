'use client';
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { KeyRound, ShieldCheck, ArrowRight, LoaderCircle } from 'lucide-react';
import type {
  MentoriasRepository,
  Workspace,
} from '@/lib/mentorias/repository';

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
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50 p-5">
      <section className="w-full max-w-md rounded-2xl border bg-white p-7 shadow-sm">
        <div className="dialog-symbol mb-5">
          <KeyRound size={25} />
        </div>
        <p className="text-sm font-semibold text-red-700">
          Crea Empresa · INACAP
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Define tu contraseña</h1>
        <p className="my-4 text-sm leading-relaxed text-muted-foreground">
          Cambia la contraseña inicial por una que solo tú conozcas. Tu ficha y
          tu rol ya están vinculados.
        </p>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            const data = new FormData(event.currentTarget);
            const rawPassword = data.get('password');
            const password = typeof rawPassword === 'string' ? rawPassword : '';
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
              <label
                htmlFor="own-password"
                className="grid gap-2 text-sm font-medium"
              >
                Nueva contraseña
                <Input
                  id="own-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                  disabled={busy}
                  placeholder="Al menos 8 caracteres"
                />
              </label>
              <label
                htmlFor="confirm-own-password"
                className="grid gap-2 text-sm font-medium"
              >
                Repetir contraseña
                <Input
                  id="confirm-own-password"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                  disabled={busy}
                />
              </label>
            </>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <ShieldCheck size={16} />
            )}
            {busy
              ? 'Guardando…'
              : saved
                ? 'Entrar al programa'
                : 'Guardar y entrar'}
            {!busy && <ArrowRight size={16} />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={onExit}
          >
            Cerrar sesión
          </Button>
        </form>
      </section>
    </main>
  );
}
