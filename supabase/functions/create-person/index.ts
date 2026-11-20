type Environment = { url: string; anonKey: string; serviceKey: string };
const allowedOrigins = new Set([
  'https://creaempresa-mentorias-inacap.netlify.app',
  'http://localhost:3001',
  'http://localhost:4173',
]);

export async function createPerson(
  request: Request,
  env: Environment,
  transport: typeof fetch = fetch,
): Promise<Response> {
  const origin = request.headers.get('origin');
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin':
      origin && allowedOrigins.has(origin)
        ? origin
        : 'https://creaempresa-mentorias-inacap.netlify.app',
    'Access-Control-Allow-Headers':
      'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  const reply = (status: number, body: object) =>
    new Response(JSON.stringify(body), { status, headers });
  if (origin && !allowedOrigins.has(origin))
    return reply(403, { error: 'Origen no permitido.' });
  if (request.method === 'OPTIONS')
    return new Response(null, { status: 204, headers });
  if (request.method !== 'POST')
    return reply(405, { error: 'Método no permitido.' });
  const authorization = request.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer '))
    return reply(401, { error: 'Inicia sesión para continuar.' });
  if (!env.url || !env.anonKey || !env.serviceKey)
    return reply(503, {
      error: 'No se pudo conectar con el servicio de cuentas.',
    });
  const rpc = (name: string, body: object) =>
    transport(`${env.url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        authorization,
        apikey: env.anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  let accountId: string | undefined;
  try {
    if (Number(request.headers.get('content-length') ?? 0) > 16384)
      return reply(413, { error: 'Solicitud demasiado grande.' });
    const raw = await request.text();
    if (raw.length > 16384)
      return reply(413, { error: 'Solicitud demasiado grande.' });
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return reply(400, { error: 'Datos inválidos.' });
    }
    if (
      !body ||
      !['mentors', 'mentees'].includes(body.kind) ||
      typeof body.id !== 'string' ||
      !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
        body.id,
      ) ||
      typeof body.password !== 'string' ||
      body.password.length < 8 ||
      new TextEncoder().encode(body.password).length > 72 ||
      !body.details ||
      typeof body.details !== 'object' ||
      Array.isArray(body.details)
    )
      return reply(400, {
        error:
          'Completa los datos y una contraseña de 8 a 72 caracteres (máx. 72 bytes).',
      });
    // PostgREST verifies the JWT; the RPC checks the current administrator role.
    const prepared = await rpc('prepare_person_account', {
      request_id: body.id,
      person_kind: body.kind,
      details: body.details,
    });
    const reservation = (await prepared.json()) as {
      id: string;
      email: string;
      complete?: boolean;
      code?: string;
      message?: string;
    };
    if (!prepared.ok)
      return reply(
        prepared.status === 401 ? 401 : prepared.status === 403 ? 403 : 400,
        {
          error:
            reservation.code === 'P0001'
              ? reservation.message
              : prepared.status === 403
                ? 'Solo el administrador puede crear cuentas.'
                : 'No se pudo crear la cuenta. Revisa los datos o vuelve a iniciar sesión.',
        },
      );
    if (reservation.complete) return reply(200, { id: reservation.id });
    accountId = reservation.id;
    const created = await transport(`${env.url}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.serviceKey}`,
        apikey: env.serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: reservation.email,
        password: body.password,
        email_confirm: true,
        app_metadata: { program_request: accountId },
      }),
    });
    if (!created.ok) {
      const failure = (await created.json()) as {
        code?: string;
        error_code?: string;
      };
      const code = failure.code ?? failure.error_code;
      return reply(created.status === 429 ? 429 : 400, {
        error:
          code === 'email_exists' || code === 'user_already_exists'
            ? 'Este correo ya tiene una cuenta.'
            : code === 'weak_password'
              ? 'Usa una contraseña más segura; evita claves comunes.'
              : created.status === 429
                ? 'Demasiados intentos. Espera un minuto.'
                : 'No se pudo crear la cuenta y su ficha. Revisa los datos e inténtalo nuevamente.',
      });
    }
    return reply(200, { id: accountId });
  } catch {
    return reply(503, {
      error:
        'No se pudo confirmar la operación. Reintenta con el mismo correo; no se duplicará la cuenta.',
    });
  } finally {
    if (accountId) {
      try {
        await rpc('finish_person_account', { request_id: accountId });
      } catch {
        /* Lease expires automatically. */
      }
    }
  }
}

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};
if (typeof Deno !== 'undefined')
  Deno.serve((request) =>
    createPerson(request, {
      url: Deno.env.get('SUPABASE_URL') ?? '',
      anonKey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    }),
  );
