/**
 * Local dev server for the static FurniAI site + the /api/chat serverless
 * function, since `python -m http.server` can't run the function and Vercel
 * isn't required for local testing.
 *
 * Usage: node scripts/dev-server.js   (reads ANTHROPIC_API_KEY from .env.local if present)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

function loadEnvLocal(){
  const p = path.join(__dirname, '..', '.env.local');
  if(!fs.existsSync(p)) return;
  for(const line of fs.readFileSync(p, 'utf8').split('\n')){
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if(m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnvLocal();

const chatHandler = require('../api/chat.js');

const MIME = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml' };
const root = path.join(__dirname, '..');
const PORT = process.env.PORT || 8000;

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, 'http://localhost');

  if(req.method === 'POST' && parsed.pathname === '/api/chat'){
    let raw = '';
    req.on('data', c => raw += c);
    req.on('end', async () => {
      try{ req.body = JSON.parse(raw || '{}'); } catch { req.body = {}; }
      const fakeRes = {
        statusCode: 200,
        status(code){ this.statusCode = code; return this; },
        json(obj){ res.writeHead(this.statusCode, {'Content-Type':'application/json'}); res.end(JSON.stringify(obj)); },
      };
      try{ await chatHandler(req, fakeRes); }
      catch(e){ console.error(e); res.writeHead(500,{'Content-Type':'application/json'}); res.end(JSON.stringify({error:'Internal error'})); }
    });
    return;
  }

  const safePath = path.normalize(parsed.pathname === '/' ? '/index.html' : parsed.pathname);
  const filePath = path.join(root, safePath);
  if(!filePath.startsWith(root)){ res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if(err){ res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, {'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream'});
    res.end(data);
  });
});

server.listen(PORT, () => console.log('FurniAI dev server (with /api/chat): http://localhost:' + PORT));
