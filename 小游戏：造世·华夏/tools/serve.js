const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json', '.md': 'text/plain; charset=utf-8' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (req.method === 'POST' && p.startsWith('/__shot/')) {
    const name = path.basename(p).replace(/[^a-zA-Z0-9._-]/g, '');
    let body = '';
    req.on('data', c => { body += c; if (body.length > 8e6) req.destroy(); });
    req.on('end', () => {
      const b64 = body.replace(/^data:image\/png;base64,/, '');
      fs.writeFile(path.join(ROOT, 'tools', 'shots', name + '.png'), Buffer.from(b64, 'base64'),
        e => { res.writeHead(e ? 500 : 200).end(e ? String(e) : 'ok'); });
    });
    return;
  }
  if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(f, (err, buf) => {
    if (err) { res.writeHead(404).end('404 ' + p); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  });
}).listen(8712, '127.0.0.1', () => console.log('http://127.0.0.1:8712/'));
