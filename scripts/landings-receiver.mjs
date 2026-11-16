#!/usr/bin/env node
// Временный локальный приёмник: вкладка bi.group в браузере присылает сюда данные лендингов (bi.group отдаёт их только настоящему браузеру).
// Сырые ответы складываются в data-raw/landings/<slug>.json, затем `node scripts/fetch.mjs landings` собирает из них public/data/landings.json.
import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data-raw/landings')
await fs.mkdir(DIR, { recursive: true })
const cors = { 'access-control-allow-origin': 'https://bi.group', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-allow-private-network': 'true' }
http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end() }
  // Вся пачка одной отправкой формы (enctype text/plain, поле data): {slug: landing.data, ...}
  if (req.method === 'POST' && req.url === '/bulk') {
    const chunks = []; let size = 0
    for await (const c of req) { size += c.length; if (size > 4e7) { res.writeHead(413); return res.end('too big') } chunks.push(c) }
    try {
      const all = JSON.parse(Buffer.concat(chunks).toString('utf8').replace(/^data=/, '').trim()); let n = 0
      for (const [slug, d] of Object.entries(all)) if (/^[a-z0-9-]{1,80}$/.test(slug) && d && typeof d === 'object') { await fs.writeFile(path.join(DIR, slug + '.json'), JSON.stringify(d)); n++ }
      console.log('bulk saved', n, size); res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('saved ' + n)
    } catch (e) { res.writeHead(400); return res.end(String(e.message)) }
  }
  const m = req.url.match(/^\/landing\/([a-z0-9-]{1,80})$/)
  if (req.method !== 'POST' || !m) { res.writeHead(404, cors); return res.end() }
  const chunks = []; let size = 0
  for await (const c of req) { size += c.length; if (size > 5e6) { res.writeHead(413, cors); return res.end() } chunks.push(c) }
  try { const j = JSON.parse(Buffer.concat(chunks).toString('utf8')); await fs.writeFile(path.join(DIR, m[1] + '.json'), JSON.stringify(j)); console.log('saved', m[1], size); res.writeHead(200, cors); res.end('ok') }
  catch (e) { res.writeHead(400, cors); res.end(String(e.message)) }
}).listen(5178, '127.0.0.1', () => console.log('receiver on http://127.0.0.1:5178'))
