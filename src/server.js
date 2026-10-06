import { createServer } from 'node:http';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST || '127.0.0.1';
if (!['127.0.0.1', '::1', 'localhost'].includes(host) && (process.env.AWB_ADMIN_TOKEN || '').length < 24) throw new Error('Set an AWB_ADMIN_TOKEN of at least 24 characters before binding beyond localhost.');
const app = createApp({ adminToken: process.env.AWB_ADMIN_TOKEN });

const server = createServer(async (req, res) => {
  const response = await app.route(req);
  res.writeHead(response.status, response.headers);
  res.end(response.body);
});

server.listen(port, host, () => {
  console.log(`answer-with-books listening on http://${host}:${server.address().port}`);
});
