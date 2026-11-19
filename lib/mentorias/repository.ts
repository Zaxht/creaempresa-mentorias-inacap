import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AppState, Attachment, Role } from './domain';
import { collectChanges } from './changes';
import { validateFile } from './access';

export type Workspace = {
  role: Role;
  mentorId?: string;
  menteeId?: string;
  state: AppState;
};
export class MentoriasRepository {
  readonly client: SupabaseClient;
  constructor(url: string, key: string) {
    this.client = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  async load(): Promise<Workspace> {
    const { data, error } = await this.client.rpc('get_workspace');
    if (error) throw new Error(error.message);
    const workspace = data as Workspace;
    if (
      (workspace.role === 'Mentor' && !workspace.mentorId) ||
      (workspace.role === 'Mentoreado' && !workspace.menteeId)
    ) {
      throw new Error(
        'Tu cuenta aún no tiene una ficha vinculada. Solicita la asociación al administrador.',
      );
    }
    const sign = async (path: string) => {
      const { data: signed, error: signingError } = await this.client.storage
        .from('mentorias-private')
        .createSignedUrl(path, 900);
      if (signingError)
        throw new Error(
          'No se pudo abrir un archivo privado. Vuelve a cargar los datos.',
        );
      return signed.signedUrl;
    };
    for (const person of [
      ...workspace.state.mentors,
      ...workspace.state.mentees,
    ]) {
      if (person.photo) {
        person.photoPath = person.photo;
        person.photo = await sign(person.photo);
      }
    }
    for (const mentorship of workspace.state.mentorships) {
      for (const session of mentorship.sessions) {
        for (const attachment of [session.photo, session.document]) {
          if (attachment?.path)
            attachment.dataUrl = await sign(attachment.path);
        }
      }
    }
    return workspace;
  }
  async save(original: AppState, current: AppState) {
    const commands = collectChanges(original, current);
    if (!commands.length) return;
    for (const mentorship of current.mentorships) {
      for (const session of mentorship.sessions) {
        if (
          !commands.some(
            (command) =>
              command.entity === 'sessions' && command.id === session.id,
          )
        )
          continue;
        if (session.status !== 'Pendiente' && !session.date)
          throw new Error(
            `Sesión ${session.number}: indica la fecha antes de guardar.`,
          );
        if (session.status === 'Realizada' && !session.summary.trim())
          throw new Error(
            `Sesión ${session.number}: escribe el resumen de acuerdos antes de marcarla realizada.`,
          );
      }
    }
    const { error } = await this.client.rpc('save_changes', { commands });
    if (error) {
      const messages: Record<string, string> = {
        '23514':
          'Revisa los datos: hay un campo vacío, demasiado largo o fuera de los valores permitidos.',
        '23503':
          'Uno de los registros relacionados ya no está disponible. Actualiza los datos.',
        '23505': 'Ya existe un registro con esos datos.',
        '40001':
          'Otro usuario modificó el registro. Actualiza los datos antes de volver a guardar.',
        '42501': 'Tu cuenta no tiene permiso para realizar esta operación.',
      };
      throw new Error(
        messages[error.code] ??
          (error.code === 'P0001'
            ? error.message
            : 'No se pudo guardar. Tus cambios siguen en pantalla; vuelve a intentar.'),
      );
    }
  }
  async upload(
    file: File,
    kind: 'photo' | 'document',
    prefix: string,
  ): Promise<Attachment> {
    await validateFile(file, kind);
    const extension =
      file.type === 'image/png'
        ? 'png'
        : file.type === 'image/jpeg'
          ? 'jpg'
          : 'pdf';
    const path = `${prefix}/${crypto.randomUUID()}.${extension}`;
    const bucket = this.client.storage.from('mentorias-private');
    const { error } = await bucket.upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    const { data, error: signError } = await bucket.createSignedUrl(path, 900);
    if (signError) throw new Error(signError.message);
    return {
      path,
      name: file.name,
      type: file.type,
      size: file.size,
      dataUrl: data.signedUrl,
    };
  }
}
