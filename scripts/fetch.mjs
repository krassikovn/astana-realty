#!/usr/bin/env node
// Сбор данных: BI Group (каталог, квартиры, лендинги), Krisha (аренда/продажа рядом, индекс цен), OSM (инфраструктура).
// Запуск: npm run fetch            — всё
//         npm run fetch:bi|krisha|osm — по частям
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public/data')
const argv = process.argv.slice(2)
const FORCE = argv.includes('--force')
const args = new Set(argv.filter(a => !a.startsWith('--')))
// Без аргументов собираем только то, чего ещё нет. Названная часть или --force собирает заново.
const want = k => args.has(k) || (args.size === 0 && FORCE)
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const log = []
const say = (...a) => { const s = a.join(' '); console.log(s); log.push(new Date().toISOString().slice(11, 19) + ' ' + s) }
const sleep = ms => new Promise(r => setTimeout(r, ms))
const errors = []

async function req(url, opt = {}, { tries = 3, type = 'json', timeout = 40000 } = {}) {
  let err
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { ...opt, signal: AbortSignal.timeout(timeout), headers: { 'user-agent': UA, 'accept-language': 'ru,en;q=0.8', ...(opt.headers || {}) } })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      return type === 'json' ? await r.json() : await r.text()
    } catch (e) { err = e; if (e.message === 'HTTP 403') break; await sleep(900 * (i + 1)) }
  }
  throw new Error(url.slice(0, 110) + ' → ' + err.message)
}
async function pool(items, n, fn) {
  const res = []; let i = 0
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; try { res[k] = await fn(items[k], k) } catch (e) { say('  ! ' + e.message); errors.push(e.message); res[k] = null } }
  }))
  return res
}
const readJson = async (f, d) => { try { return JSON.parse(await fs.readFile(path.join(OUT, f), 'utf8')) } catch { return d } }
const writeJson = (f, o) => fs.writeFile(path.join(OUT, f), JSON.stringify(o))
const km = (a, b) => { const R = 6371, r = Math.PI / 180, dl = (b.lat - a.lat) * r, dn = (b.lon - a.lon) * r, x = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)) }
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
const quant = (a, q) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))] }

// ───────────────────────── BI Group
const bi = (p, body) => req('https://apigw.bi.group/sales-picker/microfe-v3/' + p, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json', origin: 'https://bi.group', referer: 'https://bi.group/' }, body: JSON.stringify(body) }, { tries: 4 })
const strip = h => String(h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()
const img = o => (o && typeof o.url === 'string' && !/\.svg(\?|$)/i.test(o.url) && (!o.mime || o.mime.startsWith('image/'))) ? o.url : null
const imgs = a => (Array.isArray(a) ? a : []).map(img).filter(Boolean)
const kindOfBlock = n => /паркинг/i.test(n) ? 'parking' : /кладов/i.test(n) ? 'storage' : 'apt'

function normProject(x) {
  const slug = String(x.website || '').split('/').filter(Boolean).pop() || x.uuid
  const rooms = {}
  for (const b of x.roomBuckets || []) if (b.rooms > 0 && b.minSquare >= 20) rooms[b.rooms] = { minSquare: b.minSquare, minPrice: b.minPrice, minBest: b.minBestPrice }
  return {
    slug, uuid: x.uuid, name: String(x.name || '').trim(), classes: x.propertyClassName || [], address: x.address, lat: x.latitude, lon: x.longitude,
    bigville: x.bigVille ? String(x.bigVille.name || '').trim() : null, website: x.website, photo: x.photoURL1600 || x.photoURL400 || x.photoURL || null,
    floorMin: x.floorMin, floorMax: x.floorMax, deadline: x.deadline, docDate: x.docDate, installment: !!x.installment, banks: (x.mortgageBanks || []).map(b => b.bankName),
    layoutTypes: (x.placementLayoutTypes || []).map(t => t.name), rooms,
    blocks: (x.blocks || []).map(b => ({ name: b.name, kind: kindOfBlock(b.name), deadline: b.deadline, docDate: b.docDate, count: b.count, min: b.minSum, max: b.maxSum })),
  }
}
function normApt(x) {
  return {
    id: x.uuid, n: x.name, r: x.roomCount, s: x.square, f: x.floor, fm: x.maxFloor, e: x.entrance, p: x.totalPrice, pd: x.totalPriceWithDiscount, dp: x.discountPercent || null,
    dl: x.deadLine, b: x.blockName, st: x.placementStatusName, rep: !!x.isRepaired, h: x.heightOfWall, lt: x.layoutType ? x.layoutType.name : null,
    k: x.kitchenSquare || null, bal: x.balconySquare || null, c: !!x.isCorner, sd: x.numberSides || null, w: x.window || null, studio: !!x.isStudio,
    plan: x.floorPlanURL1600 || x.floorPlanURL400 || null, img: x.photoURL1600 || x.photoURL400 || null, tour: x.placement3dTour || null,
  }
}
function normLanding(d) {
  const re = d.real_estate || {}
  const L = { slogan: strip(re.slogan), startOfSales: re.start_of_sales || null, hero: [], tags: [], near: [], about: null, booklet: null, links: [], factors: [], panorama: null, infra: [], benefits: [], features: [], architecture: null, spaces: [], progress: [], cameras: [], legal: null }
  if (img(re.booklet_image)) L.hero.push(img(re.booklet_image))
  for (const b of d.blocks_20 || []) {
    if (b.is_active === false) continue
    const c = String(b.__component || '').split('.').pop()
    if (c === 'hero') {
      L.hero.push(...imgs(b.slides)); L.tags.push(...(b.add_tags || []).filter(t => t.is_active !== false).map(t => strip(t.label)))
      L.near.push(...(b.nearPlaces || []).filter(t => t.is_active !== false).map(t => ({ title: strip(t.title), time: strip(t.transitTime) })))
    } else if (c === 'about-project-with-media-slider') {
      L.about = { heading: strip(b.heading), text: strip(b.description) }; L.booklet = b.bookletUrl || null
      L.hero.push(...(b.media || []).map(m => img(m.image)).filter(Boolean))
      L.links.push(...(b.links || []).filter(l => l.url).map(l => ({ label: strip(l.label), url: l.url })))
    } else if (c === 'site-20-factors') {
      L.factors.push(...(b.factors || []).map(f => ({ value: strip(f.label), label: strip(f.description) })))
    } else if (c === 'pins') {
      L.panorama = b.panorama_link || L.panorama
      L.infra.push(...(b.infra_pins || []).filter(p => p.is_active !== false && img(p.image)).map(p => ({ title: strip(p.title), image: img(p.image) })))
    } else if (c === 'benefits') {
      L.benefits.push(...(b.benefits || []).map(x => ({ title: strip(x.label), text: strip(x.description), image: img(x.image) })))
    } else if (c === 'features') {
      for (const cl of b.classes || []) for (const f of cl.features || []) L.features.push({ category: strip(f.category), title: strip(f.title || f.present_title), text: strip(f.description), images: [...new Set([...imgs(f.images), img(f.present_landscape_image)].filter(Boolean))] })
    } else if (c === 'architecture-tag-slider') {
      const marks = [], pics = []
      for (const t of b.architecture_tags || []) for (const m of t.architecture_marks || []) { if (img(m.image)) pics.push(img(m.image)); for (const p of m.parts || []) if (p.title) marks.push(strip(p.title)) }
      L.architecture = { title: strip(b.title), text: strip(b.description), images: pics, marks }
    } else if (c === 'blok-holl-dvor') {
      for (const q of b.queue || []) L.spaces.push({ type: b.block_type, title: strip(q.title), text: strip(q.description), images: imgs(q.images), benefits: (q.benefits || []).map(x => strip(x.title_benefit)).filter(Boolean) })
    } else if (c === 'build-progress') {
      L.panorama = L.panorama || b.panorama_url || null
      for (const bl of b.blocks || []) {
        for (const r of (bl.report_items || []).slice(0, 4)) L.progress.push({ block: strip(bl.label), label: strip(r.label), images: imgs(r.images) })
        for (const cam of bl.cameras || []) if (cam.url) L.cameras.push({ label: strip(cam.label), url: cam.url })
      }
      if (img(b.panorama_image)) L.hero.push(img(b.panorama_image))
    } else if (c === 'info') { L.legal = strip(b.description) }
  }
  L.hero = [...new Set(L.hero)]
  return L
}
async function fetchLanding(p) {
  const html = await req(p.website, { headers: { accept: 'text/html' } }, { type: 'text' })
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!m) throw new Error('нет __NEXT_DATA__: ' + p.slug)
  const d = JSON.parse(m[1])?.props?.pageProps?.initialState?.landing?.data
  if (!d) throw new Error('нет landing.data: ' + p.slug)
  return normLanding(d)
}
async function mirrorPhotos(projects) {
  // Главное фото каждого ЖК кладём рядом с сайтом, чтобы каталог не зависел от CDN BI
  await fs.mkdir(path.join(ROOT, 'public/img/projects'), { recursive: true })
  let saved = 0
  await pool(projects, 4, async p => {
    if (!p.photo) return
    const ext = (p.photo.match(/\.(jpe?g|png|webp)(\?|$)/i) || [, 'jpg'])[1].toLowerCase(), rel = `img/projects/${p.slug}.${ext}`, file = path.join(ROOT, 'public', rel)
    try { await fs.access(file) } catch {
      const r = await fetch(p.photo, { signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error('фото ' + p.slug + ' → HTTP ' + r.status)
      await fs.writeFile(file, Buffer.from(await r.arrayBuffer())); saved++
    }
    p.photoLocal = rel
  })
  say(`BI: фото ЖК сохранено локально: новых ${saved}, всего ${projects.filter(p => p.photoLocal).length}`)
}
async function fetchBI() {
  say('BI: каталог…')
  let all = []
  for (let p = 1; p <= 6; p++) { const j = await bi('realEstateList', { pageSize: 100, pageNo: p }); const a = j.realEstates || []; all.push(...a); if (a.length < 100) break }
  const ast = all.filter(x => x.latitude > 50.9 && x.latitude < 51.4 && x.longitude > 71 && x.longitude < 71.9 && (x.propertyTypes || []).some(t => t.name === 'Квартира'))
  const projects = ast.map(normProject)
  say(`BI: всего ${all.length} проектов, Астана с квартирами: ${projects.length}`)
  const apartments = {}
  await pool(projects, 2, async p => {
    let pl = []
    for (let page = 1; page <= 60; page++) { const j = await bi('placementList', { pageSize: 100, pageNo: page, realEstateUUIDs: [p.uuid] }); const a = j.placements || []; pl.push(...a); if (a.length < 100) break; await sleep(120) }
    const apts = pl.filter(x => x.propertyType && x.propertyType.name === 'Квартира' && x.roomCount > 0 && x.square >= 20).map(normApt)
    apartments[p.slug] = apts
    p.aptCount = apts.length; p.freeCount = apts.filter(a => a.st !== 'Бронирование').length
    const hs = [...new Set(apts.map(a => a.h).filter(h => h && h !== '0'))]; p.ceilings = hs
    say(`  ${p.name}: ${apts.length} квартир`)
  })
  say('BI: лендинги…')
  // Лендинги bi.group закрыты Cloudflare: если сайт отвечает проверкой на бота, не долбим его и оставляем прошлые данные
  const landings = await readJson('landings.json', {})
  let fresh = 0, blocked = false
  await pool(projects, 2, async p => {
    if (blocked) return
    try { landings[p.slug] = await fetchLanding(p); fresh++ } catch (e) { if (/HTTP 403/.test(e.message)) { blocked = true; return } throw e }
    if (!p.photo && landings[p.slug].hero[0]) p.photo = landings[p.slug].hero[0]
  })
  if (blocked) { say('  ! лендинги: bi.group отвечает проверкой Cloudflare (403), визуалы не обновлены'); errors.push('landings: Cloudflare 403') }
  say(`BI: лендингов обновлено ${fresh}, всего в файле ${Object.keys(landings).length} из ${projects.length}`)
  await mirrorPhotos(projects)
  await writeJson('projects.json', projects); await writeJson('apartments.json', apartments); await writeJson('landings.json', landings)
  return projects
}

// ───────────────────────── Krisha
const KR = 'https://krisha.kz'
const krList = (cat, params) => req(`${KR}/a/ajax-map-list/map/${cat}/kvartiry/astana/?` + new URLSearchParams(params), { headers: { 'x-requested-with': 'XMLHttpRequest', accept: 'application/json, text/javascript, */*; q=0.01', referer: `${KR}/map/${cat}/kvartiry/astana/` } })
async function fetchKrisha(projects) {
  const R = 0.8, dLat = 0.012, dLon = 0.019
  const cells = new Map()
  for (const p of projects) for (const la of [p.lat - 0.0075, p.lat, p.lat + 0.0075]) for (const lo of [p.lon - 0.0115, p.lon, p.lon + 0.0115]) {
    const i = Math.floor(la / dLat), j = Math.floor(lo / dLon); cells.set(i + ':' + j, [i, j])
  }
  say(`Krisha: ${cells.size} ячеек карты вокруг ${projects.length} ЖК`)
  const out = { rent: {}, sale: {} }
  for (const [cat, key] of [['arenda', 'rent'], ['prodazha', 'sale']]) {
    let done = 0
    await pool([...cells.values()], 3, async ([i, j]) => {
      const bounds = [(i + 1) * dLat, j * dLon, i * dLat, (j + 1) * dLon].map(v => v.toFixed(6)).join(',')
      for (let page = 1; page <= 25; page++) {
        const r = await krList(cat, { bounds, page })
        const ads = Object.values(r.adverts || {}); let fresh = 0
        for (const a of ads) {
          if (!a.map || !a.price || !a.square || out[key][a.id]) continue
          fresh++
          out[key][a.id] = { id: a.id, p: a.price, s: a.square, r: a.rooms, lat: +a.map.lat, lon: +a.map.lon, t: a.title, a: a.addressTitle, cx: a.complexId || null, o: a.userType || null }
        }
        if (!ads.length || !fresh) break
        await sleep(200)
      }
      if (++done % 10 === 0) say(`  ${key}: ${done}/${cells.size} ячеек, объявлений ${Object.keys(out[key]).length}`)
    })
  }
  const rent = Object.values(out.rent).filter(a => a.p >= 60000 && a.p <= 3000000), sale = Object.values(out.sale).filter(a => a.p >= 5e6)
  say(`Krisha: аренда ${rent.length}, продажа ${sale.length}`)
  await writeJson('krisha.json', { rent, sale })
  const stats = await analyze(projects, { rent, sale })
  // индекс цен продажи по районам (Индекс Крыши)
  const index = {}
  for (const rooms of [0, 1, 2, 3]) {
    try {
      const j = await req(`${KR}/spa-api/content/analytics/sale?` + new URLSearchParams({ id: 105, rooms, buildingType: 0, mode: 'long' }), { headers: { accept: 'application/json', referer: `${KR}/content/analytics/` } })
      const g = {}
      for (const x of j) { const m = String(x.created_at || x.last_updated || '').slice(0, 7); if (!m || !x.average_kzt) continue; ((g[x.geo_title] ||= {})[m] ||= []).push(x.average_kzt) }
      index[rooms] = Object.fromEntries(Object.entries(g).map(([t, ms]) => [t, Object.entries(ms).sort().map(([m, a]) => [m, Math.round(a.reduce((s, v) => s + v, 0) / a.length)])]))
    } catch (e) { say('  ! индекс ' + e.message); errors.push(e.message) }
  }
  await writeJson('priceindex.json', index)
  // накапливаем собственную историю аренды: Крыша историю аренды не отдаёт
  const hist = await readJson('history.json', [])
  const today = new Date().toISOString().slice(0, 10)
  const snap = { date: today, rent: Object.fromEntries(Object.entries(stats).map(([s, v]) => [s, Object.fromEntries(Object.entries(v.rent).map(([r, x]) => [r, [x.med, x.n]]))])) }
  await writeJson('history.json', [...hist.filter(h => h.date !== today), snap])
}

// ───────────────────────── Аналитика по собранным объявлениям (без сети)
// Считает аренду и вторичку для каждого ЖК двумя способами:
//   own  — объявления из жилых комплексов Крыши, чьи дома стоят в 200 м от точки ЖК и ближе к нему, чем к другим ЖК BI («в самом ЖК»)
//   near — все объявления в радиусе 800 м («рядом»)
async function analyze(projects, kr) {
  kr ||= await readJson('krisha.json', null)
  if (!kr) throw new Error('нет krisha.json, сначала npm run fetch:krisha')
  const R = 0.8, OWN = 0.2
  const byRooms = (l, f) => { const o = {}; for (const r of [1, 2, 3, 4]) { const x = l.filter(a => a.r === r); if (x.length) o[r] = { n: x.length, med: median(x.map(f)), p25: quant(x.map(f), .25), p75: quant(x.map(f), .75), sq: median(x.map(a => a.s)), m2: median(x.map(a => f(a) / a.s)) } } return o }
  // комплекс Крыши → ближайший ЖК BI
  const cx = {}
  for (const a of [...kr.rent, ...kr.sale]) if (a.cx) { const c = cx[a.cx] ||= { lat: 0, lon: 0, n: 0 }; c.lat += a.lat; c.lon += a.lon; c.n++ }
  const owner = {}
  for (const [id, c] of Object.entries(cx)) {
    const pt = { lat: c.lat / c.n, lon: c.lon / c.n }; let best = null
    for (const p of projects) { const d = km(p, pt); if (!best || d < best.d) best = { d, slug: p.slug } }
    if (best && best.d <= OWN) owner[id] = best.slug
  }
  const stats = {}
  for (const p of projects) {
    const near = l => l.filter(a => km(p, a) <= R), own = l => l.filter(a => a.cx && owner[a.cx] === p.slug)
    const nr = near(kr.rent), ns = near(kr.sale), or = own(kr.rent), os = own(kr.sale)
    stats[p.slug] = {
      radiusKm: R, rent: byRooms(nr, a => a.p), sale: byRooms(ns, a => a.p), rentN: nr.length, saleN: ns.length, rentM2: median(nr.map(a => a.p / a.s)), saleM2: median(ns.map(a => a.p / a.s)),
      ownerShare: nr.length ? nr.filter(a => a.o === 'owner').length / nr.length : null,
      own: { radiusKm: OWN, complexes: new Set([...or, ...os].map(a => a.cx)).size, rent: byRooms(or, a => a.p), sale: byRooms(os, a => a.p), rentN: or.length, saleN: os.length, rentM2: median(or.map(a => a.p / a.s)), saleM2: median(os.map(a => a.p / a.s)) },
    }
  }
  await writeJson('rentstats.json', stats)
  say(`Аналитика: комплексов Крыши привязано к ЖК BI: ${Object.keys(owner).length}; ЖК с арендой в самом доме: ${Object.values(stats).filter(x => x.own.rentN > 0).length} из ${projects.length}`)
  return stats
}

// ───────────────────────── OSM
async function fetchOSM() {
  const bbox = '51.00,71.28,51.22,71.60'
  const q = `[out:json][timeout:90];(
  nwr["amenity"~"^(school|kindergarten|hospital|clinic|university|college)$"](${bbox});
  nwr["shop"~"^(mall|supermarket)$"](${bbox});
  nwr["leisure"~"^(park|sports_centre|ice_rink|stadium|fitness_centre|swimming_pool)$"]["name"](${bbox});
  nwr["railway"~"^(station|stop|halt)$"](${bbox});
  nwr["station"="light_rail"](${bbox});
  nwr["public_transport"="station"](${bbox});
  );out center tags;`
  let j
  for (const ep of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter']) {
    // Overpass отклоняет браузерный user-agent (406), поэтому представляемся честно; запрос тяжёлый, ждём до 2 минут
    try { say('OSM: ' + ep); j = await req(ep, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'astana-realty-fetch/1.0 (personal apartment research)' }, body: 'data=' + encodeURIComponent(q) }, { tries: 3, timeout: 120000 }); break } catch (e) { say('  ! ' + e.message) }
  }
  if (!j) throw new Error('Overpass недоступен')
  const cat = t => t.station === 'light_rail' || t.railway === 'light_rail' || (/station|stop|halt/.test(t.railway || '') && /LRT|ЛРТ|light/i.test((t.network || '') + (t.operator || '') + (t.station || '') + (t.name || ''))) ? 'lrt'
    : /station/.test(t.railway || '') || t.public_transport === 'station' ? 'station'
    : t.amenity === 'school' ? 'school' : t.amenity === 'kindergarten' ? 'kindergarten' : /hospital|clinic/.test(t.amenity || '') ? 'medical' : /university|college/.test(t.amenity || '') ? 'university'
    : t.shop === 'mall' ? 'mall' : t.shop === 'supermarket' ? 'supermarket' : t.leisure === 'park' ? 'park' : t.leisure ? 'sport' : null
  const seen = new Set(), pois = []
  for (const e of j.elements || []) {
    const t = e.tags || {}, c = cat(t), lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon
    const name = t['name:ru'] || t.name || ''
    if (!c || lat == null || (!name && c !== 'kindergarten' && c !== 'school')) continue
    const k = c + '|' + name + '|' + lat.toFixed(3) + '|' + lon.toFixed(3); if (seen.has(k)) continue; seen.add(k)
    pois.push({ c, n: name, lat: +lat.toFixed(6), lon: +lon.toFixed(6), k: t.leisure || t.amenity || t.shop || t.railway || '' })
  }
  say(`OSM: ${pois.length} объектов`)
  await writeJson('pois.json', pois)
}

// ───────────────────────── запуск
await fs.mkdir(OUT, { recursive: true })
const t0 = Date.now()
let projects = await readJson('projects.json', null)
// ───────────────────────── Курсы валют (Национальный банк Казахстана): сколько тенге за 1 евро и 1 чешскую крону
async function fetchRates() {
  const xml = await req('https://nationalbank.kz/rss/rates_all.xml', { headers: { 'user-agent': 'astana-realty-fetch/1.0' } }, { type: 'text' })
  const out = {}; let date = null
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) { const g = k => (m[1].match(new RegExp('<' + k + '>([^<]*)')) || [])[1]; const c = g('title'); if (['EUR', 'CZK', 'USD'].includes(c)) { out[c] = +g('description') / (+g('quant') || 1); date = g('pubDate') } }
  if (!out.EUR || !out.CZK) throw new Error('в ответе Нацбанка нет EUR или CZK')
  await writeJson('rates.json', { ...out, date: date ? date.split('.').reverse().join('-') : null, source: 'Национальный банк Казахстана' })
  say(`Курсы на ${date}: 1 EUR = ${out.EUR} ₸, 1 CZK = ${out.CZK} ₸`)
}
const steps = [['bi', async () => { projects = await fetchBI() }], ['krisha', async () => { if (!projects) throw new Error('сначала npm run fetch:bi'); await fetchKrisha(projects) }], ['osm', fetchOSM], ['rates', fetchRates]]
const meta0 = await readJson('meta.json', {})
const ran = new Set()
for (const [k, fn] of steps) {
  const need = want(k) || (args.size === 0 && !meta0[k])
  if (!need) { if (args.size === 0) say(`${k}: уже собрано ${String(meta0[k]).slice(0, 10)}, пропускаю (обновить: npm run update)`); continue }
  ran.add(k)
  try { await fn() } catch (e) { say(`✗ ${k}: ${e.message}`); errors.push(k + ': ' + e.message) }
}
if (args.has('photos')) { try { await mirrorPhotos(projects); await writeJson('projects.json', projects) } catch (e) { say(`✗ photos: ${e.message}`); errors.push('photos: ' + e.message) } }
// Лендинги из сырых данных, которые прислала вкладка браузера (scripts/landings-receiver.mjs): без сети
if (args.has('landings')) {
  try {
    const dir = path.join(ROOT, 'data-raw/landings'), landings = await readJson('landings.json', {}); let n = 0
    for (const f of await fs.readdir(dir)) { if (!f.endsWith('.json')) continue; landings[f.slice(0, -5)] = normLanding(JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'))); n++ }
    await writeJson('landings.json', landings); say(`Лендинги: собрано из сырых данных ${n}, всего в файле ${Object.keys(landings).length}`)
  } catch (e) { say(`✗ landings: ${e.message}`); errors.push('landings: ' + e.message) }
}
if (args.has('analyze')) { try { await analyze(projects) } catch (e) { say(`✗ analyze: ${e.message}`); errors.push('analyze: ' + e.message) } }
const meta = await readJson('meta.json', {})
const now = new Date().toISOString()
for (const [k] of steps) if (ran.has(k) && !errors.some(e => e.startsWith(k + ':'))) meta[k] = now
if (ran.size) meta.errors = errors.slice(0, 40)
await writeJson('meta.json', meta)
say(`Готово за ${Math.round((Date.now() - t0) / 1000)} с. Ошибок: ${errors.length}`)
await fs.writeFile(path.join(ROOT, 'fetch.log'), log.join('\n') + '\n')
