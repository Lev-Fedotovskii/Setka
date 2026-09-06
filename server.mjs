import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const base = process.env.BASE_PATH || '/';
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
const port = Number(process.env.PORT || 4173);
http.createServer(async (req, res) => {
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(!pathname.startsWith(base)){res.writeHead(404);res.end();return;}
    const name='/'+pathname.slice(base.length);
    const allowed = name === '/' || name === '/index.html' || name === '/app.js' || name === '/preview.html' || name === '/sw.js' || name === '/manifest.webmanifest' || /^\/(src|assets|vendor|data)\/[\w./-]+$/.test(name) || name === '/fixtures/mipt/File.xlsx';
    const target = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
    if (!allowed || name.split('/').includes('..') || !target.startsWith(root + path.sep)) { res.writeHead(404); res.end(); return; }
    const data = await readFile(target);
    res.writeHead(200, {'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff'});
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Setka: http://localhost:${port}`));
