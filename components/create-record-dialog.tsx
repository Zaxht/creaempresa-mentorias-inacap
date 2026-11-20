'use client';
import { useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';

export function CreateRecordDialog({
  title,
  description,
  onCreate,
  onCancel,
  children,
  disabled = false,
}: {
  title: string;
  description: string;
  onCreate: () => Promise<void>;
  onCancel: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (busy) return;
        setOpen(value);
        setError('');
        if (!value) onCancel();
      }}
    >
      <Button type="button" disabled={disabled} onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" />
        {title}
      </Button>
      <DialogContent
        className="max-h-[85svh] overflow-y-auto sm:max-w-xl p-6"
        showCloseButton={!busy}
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            setError('');
            try {
              await onCreate();
              setOpen(false);
            } catch (reason) {
              setError(
                reason instanceof Error
                  ? reason.message
                  : 'No se pudo crear. Intenta nuevamente.',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy} className="grid min-w-0 gap-4">
            {children}
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
              >
                {error}
              </p>
            )}
            <div className="mt-2 flex justify-end gap-3 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onCancel();
                  setError('');
                  setOpen(false);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {busy ? 'Guardando…' : 'Crear y guardar'}
              </Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
