// Fitcal server: hosting lokal + proxy aman ke Gemini API.
// Jalankan: node server.js  (butuh Node.js 18+)
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');

// Baca .env sederhana (opsional)
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/).forEach(l => {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  });
} catch (e) {}

const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.MODEL || 'gemini-flash-latest';
const PORT = +process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';   // 0.0.0.0 = bisa dibuka dari HP/laptop lain di WiFi yang sama
const LIMIT = +process.env.SCAN_LIMIT || 20;  // maks scan per perangkat per 10 menit
if (!KEY) { console.error('GEMINI_API_KEY belum diisi di file .env'); process.exit(1); }

const PROMPT = 'Kamu ahli gizi Indonesia. Estimasi kalori makanan/minuman pada foto dan/atau teks pengguna. ' +
  'Balas HANYA JSON: {"items":[{"nama":string,"porsi":string,"kal":number}],"catatan":string singkat Bahasa Indonesia}. ' +
  'Gunakan porsi umum Indonesia jika tidak disebut. Jika bukan makanan/minuman, items kosong.';

const hits = new Map();
function limited(ip) {
  const now = Date.now(), a = (hits.get(ip) || []).filter(t => now - t < 6e5);
  a.push(now); hits.set(ip, a);
  return a.length > LIMIT;
}

function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

async function scan(req, res) {
  if (limited(req.socket.remoteAddress)) return send(res, 429, { error: 'terlalu sering' });
  let raw = '', size = 0;
  for await (const c of req) { size += c.length; if (size > 8e6) return send(res, 413, { error: 'terlalu besar' }); raw += c; }
  let b; try { b = JSON.parse(raw); } catch (e) { return send(res, 400, { error: 'JSON salah' }); }
  const parts = [];
  if (b.image) parts.push({ inlineData: { mimeType: 'image/jpeg', data: b.image } });
  parts.push({ text: b.text ? 'Teks pengguna: ' + String(b.text).slice(0, 300) : 'Estimasi kalori dari foto ini.' });
  try {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(MODEL) + ':generateContent';
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'x-goog-api-key': KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: PROMPT }] },
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 4096 }
      })
    });
    const d = await r.json();
    if (!r.ok) { console.error('Gemini error:', JSON.stringify(d)); return send(res, 502, { error: 'api' }); }
    const t = ((d.candidates || [])[0]?.content?.parts || []).map(x => x.text || '').join('');
    const j = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
    send(res, 200, { items: Array.isArray(j.items) ? j.items : [], catatan: j.catatan || '' });
  } catch (e) { console.error(e.message); send(res, 502, { error: 'gagal' }); }
}

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/scan') return scan(req, res);
  fs.readFile(path.join(__dirname, 'index.html'), (e, d) => {
    if (e) { res.writeHead(500); return res.end('index.html tidak ditemukan'); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(d);
  });
}).on('error', e => {
  console.error(e.code === 'EADDRINUSE' ? 'Port ' + PORT + ' sudah dipakai. Ganti PORT di .env (mis. PORT=3001).' : e.message);
  process.exit(1);
}).listen(PORT, HOST, () => {
  console.log('\n  FITCAL jalan (model: ' + MODEL + ')\n');
  console.log('  Di komputer ini : http://localhost:' + PORT);
  Object.values(os.networkInterfaces()).flat().filter(i => i.family === 'IPv4' && !i.internal)
    .forEach(i => console.log('  Dari HP/laptop lain (WiFi sama): http://' + i.address + ':' + PORT));
  console.log('\n  Tekan Ctrl+C untuk berhenti.\n');
});
