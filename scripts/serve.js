import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const file = resolve(root, relative);
    if (!file.startsWith(resolve(root) + sep) || !types[extname(file)] || !/^(index\.html|app\.html|css\/|js\/|assets\/)/.test(relative)) {
      response.writeHead(404).end();
      return;
    }
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] }).end(content);
  } catch {
    if (!response.headersSent) response.writeHead(404);
    response.end();
  }
}).listen(Number(process.env.MOODMIX_PORT || 4173), '127.0.0.1', () => {
  console.log('MoodMix http://127.0.0.1:' + (process.env.MOODMIX_PORT || 4173));
});
