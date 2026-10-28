// Local preview only. Never exposes source files, storage, user code execution, or LAN interfaces.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
function createServer() {
  return http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    if (req.method !== 'GET' || !['/', '/index.html', '/algo-memory.html', '/neon-provider.js'].includes(pathname)) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const filename = pathname === '/neon-provider.js' ? 'neon-provider.js' : (pathname === '/algo-memory.html' ? 'algo-memory.html' : 'index.html');
    const file = path.join(__dirname, '..', 'dist', filename);
    fs.readFile(file, (err, content) => {
      if (err) { res.writeHead(503); res.end('Run npm run build first'); return; }
      res.writeHead(200, { 'Content-Type': filename.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(content);
    });
  });
}
if (require.main === module) {
  const server = createServer();
  server.listen(8080, '127.0.0.1', () => console.log('Local preview: http://127.0.0.1:8080/#commute'));
}
module.exports = { createServer };
