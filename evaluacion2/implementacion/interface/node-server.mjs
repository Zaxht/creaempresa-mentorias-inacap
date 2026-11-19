import { createServer } from 'node:http';

export function createHttpServer(handler) {
  return createServer({ requestTimeout: 15000, headersTimeout: 10000 }, async (incoming, outgoing) => {
    try {
      const chunks = [];
      let bytes = 0;
      for await (const chunk of incoming) {
        bytes += chunk.length;
        if (bytes <= 16384) chunks.push(chunk);
      }
      if (bytes > 16384) {
        outgoing.writeHead(413, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        outgoing.end(JSON.stringify({ code: 'BODY_TOO_LARGE' }));
        return;
      }
      const request = new Request(new URL(incoming.url, 'http://127.0.0.1'), {
        method: incoming.method,
        headers: incoming.headers,
        ...(!['GET', 'HEAD'].includes(incoming.method) ? { body: Buffer.concat(chunks) } : {}),
      });
      const response = await handler(request);
      response.headers.set('Cache-Control', 'no-store');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      if (!outgoing.headersSent) outgoing.writeHead(500, { 'Content-Type': 'application/json' });
      outgoing.end(JSON.stringify({ code: 'INTERNAL_ERROR' }));
    }
  });
}
