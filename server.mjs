import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('dist');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.json':'application/json'};
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/estudio') {res.writeHead(301, {Location: '/estudio/'}); return res.end();}
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep)) {res.writeHead(403); return res.end();}
    const body = await readFile(file);
    res.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-cache'}); res.end(body);
  } catch {res.writeHead(404);res.end('No encontrado');}
}).listen(4173, '127.0.0.1', () => console.log('Portada: http://127.0.0.1:4173/  ·  Estudio: http://127.0.0.1:4173/estudio/'));
