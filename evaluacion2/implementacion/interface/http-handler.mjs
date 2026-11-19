import { assertActor, DomainError } from '../domain/rules.mjs';

export function createHandler({ service, identityProvider }) {
  return async (request) => {
    try {
      // El proveedor verifica la identidad; nunca se usa un rol enviado en el cuerpo.
      const actor = await identityProvider.verify(request);
      assertActor(actor);
      const path = new URL(request.url).pathname;
      if (request.method === 'GET' && path === '/api/mentorias') {
        return Response.json(await service.list(actor));
      }
      const match = /^\/api\/mentorias\/([^/]+)\/sesiones$/.exec(path);
      if (!match) return Response.json({ code: 'NOT_FOUND' }, { status: 404 });
      if (request.method !== 'POST') {
        return Response.json({ code: 'METHOD_NOT_ALLOWED' }, { status: 405, headers: { Allow: 'POST' } });
      }
      if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
        throw new DomainError('CONTENT_TYPE', 'Se requiere application/json.', 415);
      }
      const body = await request.text();
      if (new TextEncoder().encode(body).byteLength > 16384) {
        throw new DomainError('BODY_TOO_LARGE', 'Solicitud demasiado grande.', 413);
      }
      let input;
      try { input = JSON.parse(body); }
      catch { throw new DomainError('INVALID_JSON', 'JSON inválido.', 400); }
      return Response.json(await service.recordSession(actor, decodeURIComponent(match[1]), input), { status: 201 });
    } catch (error) {
      const known = error instanceof DomainError;
      return Response.json({ code: known ? error.code : 'INTERNAL_ERROR', message: known ? error.message : 'No fue posible completar la operación.' }, { status: known ? error.status : 500 });
    }
  };
}
