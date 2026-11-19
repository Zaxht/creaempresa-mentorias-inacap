export function GET() {
  const url = process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? '';
  // Nunca usar una clave service_role aquí: la respuesta es pública.
  const configured =
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) &&
    key.startsWith('sb_publishable_');
  return Response.json(
    { configured, url: configured ? url : '', key: configured ? key : '' },
    {
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
