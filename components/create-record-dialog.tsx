'use client';
import { useState, type ReactNode } from 'react';
import {
  Plus,
  UserRoundPlus,
  UsersRound,
  Link2,
  ArrowRight,
  LoaderCircle,
} from 'lucide-react';
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
  const Icon =
    title === 'Nuevo mentor'
      ? UserRoundPlus
      : title === 'Nuevo mentoreado'
        ? UsersRound
        : Link2;
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
        className="record-dialog max-h-[90svh] overflow-hidden sm:max-w-xl p-0 gap-0 flex flex-col"
        showCloseButton={!busy}
      >
        <div className="record-dialog-header">
          <div className="dialog-symbol">
            <Icon size={25} strokeWidth={1.7} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary mb-1">
              Crea Empresa
            </p>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              {title}
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-sm leading-relaxed">
              {description}
            </DialogDescription>
          </div>
        </div>
        <form
          className="min-h-0 overflow-y-auto"
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
          <fieldset
            disabled={busy}
            className="record-dialog-fields grid min-w-0 gap-4 p-6"
          >
            {children}
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
              >
                {error}
              </p>
            )}
            <div className="dialog-actions sticky bottom-0 -mx-6 -mb-6 mt-2 flex justify-end gap-3 border-t px-6 py-4">
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
                {busy && <LoaderCircle size={16} className="animate-spin" />}
                {busy ? 'Creando…' : 'Crear'}
                {!busy && <ArrowRight size={16} />}
              </Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
