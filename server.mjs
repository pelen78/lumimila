import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('dist');
// This directory is excluded from Git and the Cloudflare dist deployment.
const cardsRoot = path.resolve('.local/tarjetas');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.otf':'font/otf','.json':'application/json'};
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/_tarjetas') {res.writeHead(301, {Location: '/_tarjetas/'}); return res.end();}
    const isLocalCards = pathname.startsWith('/_tarjetas/');
    const activeRoot = isLocalCards ? cardsRoot : root;
    if (isLocalCards) pathname = pathname.slice('/_tarjetas'.length);
    if (pathname === '/estudio') {res.writeHead(301, {Location: '/estudio/'}); return res.end();}
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.resolve(activeRoot, '.' + pathname);
    if (!file.startsWith(activeRoot + path.sep)) {res.writeHead(403); return res.end();}
    const body = await readFile(file);
    res.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store'}); res.end(body);
  } catch {res.writeHead(404);res.end('No encontrado');}
}).listen(4173, '127.0.0.1', () => console.log('Portada: http://127.0.0.1:4173/  ·  Estudio: http://127.0.0.1:4173/estudio/'));
