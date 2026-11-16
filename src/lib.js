import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { t, mon, tp } from './i18n.js'

// Сокращения месяцев на текущем языке: MON[i]
export const MON = new Proxy([], { get: (_, k) => k === 'length' ? 12 : mon(+k) })
export const fmtM = (v, d = 1) => v == null || isNaN(v) ? '—' : (v / 1e6).toFixed(d).replace('.', ',')
export const fmtK = v => v == null || isNaN(v) ? '—' : Math.round(v / 1000).toLocaleString('ru-RU')
export const fmtN = (v, d = 0) => v == null || isNaN(v) ? '—' : Number(v).toLocaleString('ru-RU', { maximumFractionDigits: d, minimumFractionDigits: d })
export const km = (a, b) => { const R = 6371, r = Math.PI / 180, dl = (b.lat - a.lat) * r, dn = (b.lon - a.lon) * r, x = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)) }
export const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
const SOON = 45 * 864e5
export const isReady = d => !!d && new Date(d).getTime() <= Date.now() + SOON
export const dlLabel = d => { if (!d) return '—'; const x = new Date(d); if (x.getTime() <= Date.now() + SOON) return t('сдан'); return `${Math.floor(x.getMonth() / 3) + 1} ${t('кв.')} ${x.getFullYear()}` }
export const dlMonth = d => { if (!d) return '—'; const x = new Date(d); return isReady(d) ? t('дом сдан') : `${mon(x.getMonth())} ${x.getFullYear()}` }
export const plural = (n, a, b, c) => { const m = Math.abs(n) % 100, k = m % 10; return m > 10 && m < 20 ? c : k === 1 ? a : k > 1 && k < 5 ? b : c }

// Русло Есиля, приблизительно: [lon, lat]
const RIVER = [[71.335, 51.176], [71.355, 51.170], [71.385, 51.163], [71.410, 51.158], [71.432, 51.152], [71.447, 51.142], [71.460, 51.130]]
export function isLeftBank(p) {
  if (p.lon >= 71.46) return p.lat < 51.105
  let la = RIVER[0][1]
  for (let i = 0; i < RIVER.length - 1; i++) { const [x1, y1] = RIVER[i], [x2, y2] = RIVER[i + 1]; if (p.lon >= x1 && p.lon <= x2) { la = y1 + (y2 - y1) * (p.lon - x1) / (x2 - x1); break } if (p.lon > x2) la = y2 }
  return p.lat < la
}
export const LANDMARKS = [
  { id: 'bot', n: 'Ботанический сад', lat: 51.1065, lon: 71.4160 },
  { id: 'ice', n: 'Барыс Арена', lat: 51.1080, lon: 71.4010 },
  { id: 'mega', n: 'MEGA Silk Way', lat: 51.0886, lon: 71.4087 },
  { id: 'bai', n: 'Байтерек', lat: 51.1283, lon: 71.4305 },
  { id: 'air', n: 'Аэропорт', lat: 51.0222, lon: 71.4669 },
]
// Станции LRT: запасная приблизительная схема на случай, если в OSM их нет
export const LRT_FALLBACK = [['Аэропорт', 51.027, 71.461], ['Атамекен', 51.045, 71.452], ['Есиль', 51.058, 71.444], ['Мәңгілік Ел', 51.068, 71.432], ['Астана жұлдызы', 51.075, 71.420], ['Нура', 51.083, 71.410], ['Университет', 51.090, 71.402], ['Ұлы дала', 51.098, 71.402], ['Астана Арена', 51.108, 71.403], ['Дворец единоборств', 51.115, 71.408], ['Сығанақ', 51.122, 71.412], ['Байтерек', 51.128, 71.428], ['Дом министерств', 51.127, 71.445], ['Нац. музей', 51.119, 71.468], ['Аллея тысячелетия', 51.117, 71.485], ['Театр', 51.115, 71.500], ['Жібек жолы', 51.113, 71.515], ['Нұрлы жол', 51.112, 71.532]].map(a => ({ c: 'lrt', n: a[0], lat: a[1], lon: a[2], approx: true }))
export const POI_CATS = {
  lrt: { n: 'LRT', color: '#e8590c' }, school: { n: 'Школы', color: '#2563eb' }, kindergarten: { n: 'Детсады', color: '#7c3aed' }, medical: { n: 'Медицина', color: '#dc2626' },
  park: { n: 'Парки', color: '#16a34a' }, sport: { n: 'Спорт', color: '#0891b2' }, mall: { n: 'ТРЦ', color: '#c026d3' }, supermarket: { n: 'Супермаркеты', color: '#ca8a04' }, university: { n: 'Вузы', color: '#475569' },
}

const DataCtx = createContext(null)
export const useData = () => useContext(DataCtx)
const getJson = async (f, d) => { try { const r = await fetch(`${import.meta.env.BASE_URL}data/${f}`, { cache: 'no-cache' }); if (!r.ok) return d; return await r.json() } catch { return d } }

function enrich(raw) {
  const { projects, apartments, landings, rentstats } = raw
  const lrt = raw.pois.filter(p => p.c === 'lrt')
  raw.lrt = lrt.length >= 8 ? lrt : LRT_FALLBACK
  raw.lrtApprox = lrt.length < 8
  raw.pois = [...raw.pois.filter(p => p.c !== 'lrt'), ...raw.lrt]
  for (const p of projects) {
    p.left = isLeftBank(p)
    p.cls = (p.classes || [])[0] || '—'
    p.biz = (p.classes || []).some(c => /Бизнес|Премиум/i.test(c))
    p.all = apartments[p.slug] || []
    p.apts = p.all.filter(a => a.st !== 'Бронирование')
    p.land = landings[p.slug] || null
    p.rs = rentstats[p.slug] || null
    p.ratio = {}
    for (const [r, b] of Object.entries(p.rooms || {})) p.ratio[r] = b.minPrice > 0 && b.minBest > 0 ? Math.min(1, b.minBest / b.minPrice) : 1
    p.maxDisc = Math.round((1 - Math.min(1, ...Object.values(p.ratio))) * 100)
    const hs = (p.ceilings || []).map(h => parseFloat(String(h).replace(/[^\d,.]/g, '').replace(',', '.'))).filter(x => x > 2 && x < 6)
    p.ceilMin = hs.length ? Math.min(...hs) : null; p.ceilMax = hs.length ? Math.max(...hs) : null
    p.ceilTxt = p.land?.factors?.find(f => /потолк/i.test(f.label))?.value || (p.ceilMin ? (p.ceilMin === p.ceilMax ? `от ${String(p.ceilMin).replace('.', ',')} м` : `${String(p.ceilMin).replace('.', ',')}–${String(p.ceilMax).replace('.', ',')} м`) : '—')
    const aptBlocks = (p.blocks || []).filter(b => b.kind === 'apt')
    p.firstDl = aptBlocks.map(b => b.deadline).sort()[0] || p.deadline
    p.lastDl = aptBlocks.map(b => b.deadline).sort().pop() || p.deadline
    p.ready = p.apts.some(a => isReady(a.dl))
    // локальная копия главного фото (скачана при сборе), иначе ссылка на CDN BI
    const main = p.photoLocal ? import.meta.env.BASE_URL + p.photoLocal : p.photo
    p.photos = [...new Set([main, ...(p.land?.hero || []).filter(u => u !== p.photo)].filter(Boolean))]
    p.cover = p.photos[0] || null
    p.dist = Object.fromEntries(LANDMARKS.map(l => [l.id, km(p, l)]))
    let best = null; for (const s of raw.lrt) { const d = km(p, s); if (!best || d < best.d) best = { d, n: s.n } }
    p.lrt = best
  }
  raw.bySlug = Object.fromEntries(projects.map(p => [p.slug, p]))
  return raw
}

// ───── защита паролем
// На опубликованном сайте данные лежат зашифрованными (scripts/encrypt.mjs): data/lock.json описывает ключ, data/*.enc — сами файлы.
// Локально lock.json нет, и данные читаются как есть.
const KEY_LS = 'astana-realty-key'
const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0))
const importKey = raw => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt'])
const open = async (key, buf) => new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, key, buf.slice(12)))
async function keyFromPassword(pw, lock) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw.normalize('NFKC')), 'PBKDF2', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: b64d(lock.salt), iterations: lock.iter }, base, 256))
}
const checkKey = async (raw, lock) => { try { return new TextDecoder().decode(await open(await importKey(raw), b64d(lock.check))) === 'astana-realty' } catch { return false } }
const getEnc = key => async (f, d) => {
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}data/${f.replace(/\.json$/, '.enc')}`, { cache: 'no-cache' }); if (!r.ok) return d
    const gz = await open(key, new Uint8Array(await r.arrayBuffer()))
    return JSON.parse(await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text())
  } catch { return d }
}

export function useLoadData() {
  const [data, setData] = useState(null)
  useEffect(() => {
    const load = async get => {
      const [projects, apartments, landings, rentstats, krisha, priceindex, pois, meta, history, renthistory, rates] = await Promise.all([
        get('projects.json', null), get('apartments.json', {}), get('landings.json', {}), get('rentstats.json', {}),
        get('krisha.json', { rent: [], sale: [] }), get('priceindex.json', {}), get('pois.json', []), get('meta.json', {}), get('history.json', []), get('renthistory.json', null), get('rates.json', null),
      ])
      if (!projects) return setData({ missing: true })
      setData(enrich({ projects, apartments, landings, rentstats, krisha, priceindex, pois, meta, history, renthistory, rates }))
    }
    ;(async () => {
      const lock = await getJson('lock.json', null)
      if (!lock?.salt) return load(getJson)
      const start = async raw => { setData(null); await load(getEnc(await importKey(raw))) }
      // пароль вводится один раз: на этом устройстве запоминается ключ, а не сам пароль
      let saved = null; try { saved = b64d(localStorage.getItem(KEY_LS) || '') } catch {}
      if (saved?.length === 32 && await checkKey(saved, lock)) return start(saved)
      setData({ locked: true, unlock: async pw => { const raw = await keyFromPassword(pw, lock); if (!await checkKey(raw, lock)) return false; try { localStorage.setItem(KEY_LS, btoa(String.fromCharCode(...raw))) } catch {} await start(raw); return true } })
    })()
  }, [])
  return data
}
export const DataProvider = DataCtx.Provider

// ───── настройки пользователя
const StoreCtx = createContext(null)
export const useStore = () => useContext(StoreCtx)
const LS = 'astana-realty-v1'
const load = () => { try { return JSON.parse(localStorage.getItem(LS)) || {} } catch { return {} } }
export function useStoreState() {
  const [st, setSt] = useState(() => ({ lang: 'ru', cur: 'KZT', b2: 50, b3: 65, mode: 'list', leftOnly: true, favs: [], slots: [null, null, null], ...load() }))
  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify(st)) } catch {} }, [st])
  const set = useCallback(patch => setSt(s => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) })), [])
  const toggleFav = useCallback((slug, id) => setSt(s => { const k = slug + '|' + id; return { ...s, favs: s.favs.includes(k) ? s.favs.filter(x => x !== k) : [...s.favs, k] } }), [])
  const setSlot = useCallback((i, v) => setSt(s => { const slots = [...s.slots]; slots[i] = v; return { ...s, slots } }), [])
  return useMemo(() => ({ ...st, set, toggleFav, setSlot }), [st, set, toggleFav, setSlot])
}
export const StoreProvider = StoreCtx.Provider

export const priceOf = (a, p, mode) => mode === 'best' ? (a.pd && a.pd < a.p ? a.pd : a.p * (p.ratio?.[a.r] ?? 1)) : a.p
export const edgeFloor = a => a.f <= 1 || (a.fm && a.f >= a.fm)

// Автоподбор: одна связка «трёшка + две двушки» на бигвилль или отдельный ЖК
export function buildCombos(projects, st) {
  const groups = {}
  for (const p of projects) { if (st.leftOnly && !p.left) continue; (groups[p.bigville || p.slug] ||= []).push(p) }
  const out = []
  for (const [g, ps] of Object.entries(groups)) {
    const all = ps.flatMap(p => p.apts.map(a => ({ p, a, price: priceOf(a, p, st.mode) })))
    const three = all.filter(x => x.a.r === 3 && x.price <= st.b3 * 1e6)
    const two = all.filter(x => x.a.r === 2 && x.price <= st.b2 * 1e6)
    if (!three.length || two.length < 2) continue
    const s3 = x => (isReady(x.a.dl) ? 0 : 4e8) + (edgeFloor(x.a) ? 3e6 : 0) + x.price
    const t = [...three].sort((a, b) => s3(a) - s3(b))[0]
    const s2 = x => (edgeFloor(x.a) ? 1.5e6 : 0) + (x.p === t.p ? 0 : 5e5) + x.price
    const tw = [...two].sort((a, b) => s2(a) - s2(b)).slice(0, 2)
    const picks = [t, ...tw]
    out.push({
      key: g, title: ps.length > 1 ? `Бигвилль ${g}` : ps[0].name, projects: [...new Set(picks.map(x => x.p))], picks,
      total: picks.reduce((s, x) => s + x.price, 0), area: picks.reduce((s, x) => s + x.a.s, 0),
      ready3: isReady(t.a.dl), readyAll: picks.every(x => isReady(x.a.dl)), biz: picks.every(x => x.p.biz), oneHouse: new Set(picks.map(x => x.p.slug)).size === 1,
    })
  }
  return out.sort((a, b) => (b.ready3 - a.ready3) || (b.biz - a.biz) || (a.total - b.total))
}
export function fitInfo(p, st) {
  const m = r => { const x = p.apts.filter(a => a.r === r).map(a => priceOf(a, p, st.mode)); return x.length ? Math.min(...x) : null }
  const p2 = m(2), p3 = m(3)
  return { p1: m(1), p2, p3, fit2: p2 != null && p2 <= st.b2 * 1e6, fit3: p3 != null && p3 <= st.b3 * 1e6 }
}
export function nearestPois(p, pois, cat, n = 3, maxKm = 3) {
  return pois.filter(x => x.c === cat).map(x => ({ ...x, d: km(p, x) })).filter(x => x.d <= maxKm).sort((a, b) => a.d - b.d).slice(0, n)
}
// Доходность аренды, нормированная на метр: (аренда ₸/м² в мес × 12) / (цена BI ₸/м²)
export function yieldOf(p, rooms = 2, mode = 'list') {
  const rs = p.rs?.rent?.[rooms]; const ap = p.apts.filter(a => a.r === rooms)
  if (!rs || !ap.length || !rs.m2) return null
  const m2 = median(ap.map(a => priceOf(a, p, mode) / a.s))
  return { y: rs.m2 * 12 / m2 * 100, rentM2: rs.m2, priceM2: m2, n: rs.n, med: rs.med }
}
