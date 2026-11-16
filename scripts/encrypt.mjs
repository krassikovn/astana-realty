#!/usr/bin/env node
// Шифрует данные собранного сайта паролем: dist/data/*.json → *.enc (gzip + AES-256-GCM, ключ из пароля через PBKDF2).
// Без пароля файлы не прочитать, даже скачав их напрямую. Пароль берётся из переменной SITE_PASSWORD или из файла .site-password в корне проекта.
import fs from 'node:fs/promises'
import path from 'node:path'
import zlib from 'node:zlib'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), DIR = path.join(ROOT, 'dist/data'), ITER = 310000
let pw = process.env.SITE_PASSWORD
if (!pw) { try { pw = (await fs.readFile(path.join(ROOT, '.site-password'), 'utf8')).trim() } catch {} }
if (!pw) { console.error('Нет пароля: задайте SITE_PASSWORD или создайте файл .site-password'); process.exit(1) }
if (pw.length < 8) { console.error('Пароль короче 8 символов: его легко подобрать'); process.exit(1) }
const salt = crypto.randomBytes(16), key = crypto.pbkdf2Sync(pw.normalize('NFKC'), salt, ITER, 32, 'sha256')
const seal = buf => { const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key, iv); return Buffer.concat([iv, c.update(buf), c.final(), c.getAuthTag()]) }
let n = 0, before = 0, after = 0
for (const f of await fs.readdir(DIR)) {
  if (!f.endsWith('.json') || f === 'lock.json') continue
  const raw = await fs.readFile(path.join(DIR, f)), out = seal(zlib.gzipSync(raw, { level: 9 }))
  await fs.writeFile(path.join(DIR, f.replace(/\.json$/, '.enc')), out); await fs.unlink(path.join(DIR, f))
  n++; before += raw.length; after += out.length
}
await fs.writeFile(path.join(DIR, 'lock.json'), JSON.stringify({ v: 1, kdf: 'PBKDF2-SHA256', iter: ITER, salt: salt.toString('base64'), check: seal(Buffer.from('astana-realty')).toString('base64') }))
console.log(`Зашифровано файлов: ${n}, ${(before / 1e6).toFixed(1)} МБ → ${(after / 1e6).toFixed(1)} МБ`)
