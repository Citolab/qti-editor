import { createServer } from 'node:http';

const PORT = Number(process.env.MOCK_API_PORT ?? 4300);
const HOST = process.env.MOCK_API_HOST ?? '127.0.0.1';
const OK_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function sendJson(res, status, payload) {
  res.writeHead(status, OK_HEADERS);
  res.end(JSON.stringify(payload));
}

const server = createServer((req, res) => {
  if (!req.url) {
    sendJson(res, 400, { ok: false, message: 'Missing URL.' });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, OK_HEADERS);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/example/qti-item') {
    let body = '';
    req.setEncoding('utf8');

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      let parsed = null;
      try {
        parsed = body ? JSON.parse(body) : null;
      } catch {
        sendJson(res, 400, { ok: false, message: 'Invalid JSON body.' });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        message: 'Mock endpoint received QTI payload.',
        receivedAt: new Date().toISOString(),
        receivedFields: parsed ? Object.keys(parsed) : [],
      });
    });
    return;
  }

  sendJson(res, 404, { ok: false, message: 'Not found.' });
});

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`Mock API listening on http://${HOST}:${PORT}`);
});
