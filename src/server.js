import { createServer } from 'node:http';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 8787);
const app = createApp();

const server = createServer(async (req, res) => {
  const response = await app.route(req);
  res.writeHead(response.status, response.headers);
  res.end(response.body);
});

server.listen(port, () => {
  console.log(`answer-with-books listening on http://127.0.0.1:${port}`);
});
