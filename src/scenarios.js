// Сценарии покупки трёх квартир: подбор связок под фильтры, оценка каждой связки и выбор вариантов для показа.
// Всё считается по собранным данным (каталог BI, объявления Крыши, OSM). Допущения о росте цен задаёт пользователь.
import { km, isReady, priceOf, edgeFloor, fmtM, fmtK, fmtN, dlMonth, MON } from './lib.js'
import { t, tn, isCs, money, roomsLabel } from './i18n.js'

// Названия классов и типов планировок приходят из каталога BI по-русски и служат ключами данных; на экран выводятся через t(название)
export const CLASS_ORDER = ['Стандарт', 'Комфорт lite', 'Комфорт', 'Комфорт+', 'Бизнес', 'Бизнес+', 'Премиум']
const CLASS_W = { 'Стандарт': 0, 'Комфорт lite': .15, 'Комфорт': .3, 'Комфорт+': .55, 'Бизнес': .85, 'Бизнес+': 1, 'Премиум': 1 }
// Подписи отдаются функциями, чтобы перевод брался в момент отрисовки, а не при загрузке модуля
export const READY_OPTS = () => [['any', t('любой срок')], ['ready', t('дом сдан')], ['h1', t('до июля 2027')], ['y27', t('до конца 2027')]]
export const TOGETHER_OPTS = () => [['project', t('один ЖК')], ['bigville', t('один бигвилль или ЖК')], ['near', t('остальные в 1,5 км от первой')], ['any', t('остальные где угодно')]]
// Состав покупки: сколько квартир, какая для жизни, какие под аренду. По умолчанию — одна 3-комнатная для жизни и две 2-комнатные под аренду.
export const defaultUnits = st => [{ role: 'live', rooms: 3, bud: st.b3 }, { role: 'rent', rooms: 2, bud: st.b2 }, { role: 'rent', rooms: 2, bud: st.b2 }]
export const unitsOf = (ov, st) => ov?.units?.length ? [...ov.units].sort((a, b) => (a.role === 'live' ? 0 : 1) - (b.role === 'live' ? 0 : 1)) : defaultUnits(st)
export const unitLabel = u => t(u.role === 'live' ? '{r} для жизни' : '{r} под аренду', { r: roomsLabel(u.rooms) })
export const SLOT_NAMES = units => units.map((u, i) => unitLabel(u) + (units.filter(x => x.role === u.role && x.rooms === u.rooms).length > 1 ? ' №' + (units.slice(0, i + 1).filter(x => x.role === u.role && x.rooms === u.rooms).length) : ''))
export const SLOT_SHORT = units => units.map(u => u.role === 'live' ? t('Жить') : t('Сдавать'))
// Вес критериев в оценке (сумма 100) и важность, которую задаёт пользователь: 0 — не важно, 1 — обычно, 2 — важно, 3 — очень важно
export const BASE_W = { ready: 18, loc: 20, ppm: 14, quality: 14, yld: 12, cls: 12, together: 8, budget: 5, disc: 3 }
const PPM_LO = 560000, PPM_HI = 950000 // ₸ за м²: ниже — лучше
const IMP_MULT = [0, 1, 1.8, 2.8]
export function weightsOf(ov) {
  const imp = ov?.imp || {}, raw = {}; let sum = 0
  for (const [k, w] of Object.entries(BASE_W)) { raw[k] = w * IMP_MULT[imp[k] ?? 1]; sum += raw[k] }
  const W = {}; for (const k of Object.keys(raw)) W[k] = sum ? raw[k] / sum * 100 : 0
  return W
}
// Что важно рядом с домом: множители для частей оценки локации
export const LOC_KEYS = ['lrt', 'green', 'sport', 'daily', 'mall', 'lived']
export function locScore(loc, near) {
  if (!near || !Object.keys(near).length) return loc.score
  const MAX = { lrt: 25, green: 15, sport: 15, daily: 20, mall: 10, lived: 15 }; let a = 0, b = 0
  for (const k of LOC_KEYS) { const w = near[k] ?? 1; a += loc.parts[k] * w; b += MAX[k] * w }
  return b ? Math.round(a / b * 100) : loc.score
}
// Типы планировок в каталоге BI и что они значат. Описание читается на текущем языке при каждом обращении.
export const LAYOUTS = {
  get 'Бабочка'() { return t('окна на две стороны, сквозное проветривание') },
  get 'Уголок'() { return t('угловая, окна на две стороны') },
  get 'Пистолет'() { return t('Г-образная') },
  get 'Расческа'() { return t('все комнаты в ряд, окна на одну сторону') },
}
// Значения из лендингов BI («Предчистовая и чистовая», «до 2,4 м») для чешского интерфейса
export const finishLabel = s => !s || !isCs() ? s : String(s).toLowerCase().replace(/предчистовая/g, 'shell & core').replace(/чистовая/g, 's povrchovými úpravami').replace(/черновая/g, 'hrubá stavba').replace(/\s+и\s+/g, ' a ')
export const dataUnits = s => !s || !isCs() ? s : String(s).replace(/до/i, 'do').replace(/от/i, 'od').replace(/\s*м/g, '\u00a0m')
export const pctSign = () => isCs() ? '\u00a0%' : '%'
const LAY_W = { 'Бабочка': 1, 'Уголок': .9, 'Пистолет': .6, 'Расческа': .4 }

// Что известно о доме из лендинга BI: высота окон, отделка, остекление, двор и прочее
const traitCache = new WeakMap()
export function traitsOf(p) {
  if (traitCache.has(p)) return traitCache.get(p)
  const L = p.land || {}, fac = l => (L.factors || []).find(f => l.test(f.label))?.value || null
  const txt = [L.slogan, L.about?.text, ...(L.tags || []), ...(L.factors || []).map(f => f.label + ' ' + f.value), ...(L.benefits || []).map(b => b.title + ' ' + b.text), ...(L.features || []).map(f => f.title + ' ' + f.text), L.architecture?.text, ...(L.architecture?.marks || []), ...(L.spaces || []).map(s => s.title + ' ' + s.text + ' ' + (s.benefits || []).join(' '))].filter(Boolean).join(' ').toLowerCase()
  const winTxt = fac(/высота ок/i), winH = winTxt ? parseFloat((String(winTxt).match(/\d+(?:[.,]\d+)?/) || [''])[0].replace(',', '.')) || null : null
  const has = re => re.test(txt)
  const T = {
    winTxt, winH, finish: fac(/^отделка/i), ceilTxt: fac(/потолк/i),
    pano: (winH != null && winH >= 2) || has(/панорам|окна в пол|французск/), vitrage: has(/витраж/),
    yard: has(/закрытый двор|двор без машин/), terrace: has(/террас/), fitness: has(/фитнес|workout|тренаж/), smart: has(/умный дом/), video: has(/видеонабл/), brick: has(/кирпич/), concierge: has(/консьерж/), known: !!p.land,
  }
  // список собирается при обращении: результат traitsOf кэшируется, а язык может смениться
  Object.defineProperty(T, 'list', { enumerable: true, get: () => [T.pano && (T.winH ? t('окна {h} м', { h: String(T.winH).replace('.', ',') }) : t('панорамные окна')), T.yard && t('закрытый двор'), T.terrace && t('террасы'), T.fitness && t('спортзоны'), T.smart && t('умный дом'), T.concierge && t('консьерж'), T.brick && t('кирпичный фасад')].filter(Boolean) })
  traitCache.set(p, T); return T
}
// Качество самой квартиры, 0..1: потолки, тип планировки, балкон, окна дома, этаж
export function aptQuality(a, p) {
  const h = ceilOf(a, p) || 2.7, T = traitsOf(p)
  const parts = { ceil: clamp((h - 2.65) / 0.65), lay: LAY_W[a.lt] ?? .5, balc: a.bal ? clamp(.5 + a.bal / 12) : 0, win: T.pano ? 1 : T.vitrage ? .6 : .3, floor: edgeFloor(a) ? 0 : a.fm && a.f / a.fm >= .35 ? 1 : .6 }
  return { q: .34 * parts.ceil + .22 * parts.lay + .12 * parts.balc + .17 * parts.win + .15 * parts.floor, parts, h }
}

export const OV_DEFAULT = {
  common: { cls: [], ready: 'any', ceil: 0, noEdge: false, rep: false, noEuro: false, lrt: 0, lay: [], pano: false, balc: false },
  per: false,
  slots: [{}, {}, {}],
  units: null, // null = состав по умолчанию с бюджетами из левой панели
  imp: {}, near: {}, flex: 10,
  together: 'bigville',
  assume: { growth: 7, rentGrowth: 5, occ: 11, fit: 6 },
  sort: 'score',
  allVariants: false,
}
export const mergeOv = ov => ({ ...OV_DEFAULT, ...(ov || {}), common: { ...OV_DEFAULT.common, ...(ov?.common || {}) }, assume: { ...OV_DEFAULT.assume, ...(ov?.assume || {}) }, slots: Array.from({ length: Math.max(3, ov?.units?.length || 0) }, (_, i) => ({ ...(ov?.slots?.[i] || {}) })) })
export const slotCfg = (ov, st, i) => { const u = unitsOf(ov, st)[i] || { role: 'rent', rooms: 2, bud: st.b2 }; return { rooms: u.rooms, bud: u.bud, role: u.role, smin: u.smin || 0, ...ov.common, ...(ov.per ? ov.slots[i] : {}) } }

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x))
const NOW = Date.now(), MONTH = 30.44 * 864e5
export const ceilOf = (a, p) => { const x = parseFloat(String(a.h || '').replace(/[^\d,.]/g, '').replace(',', '.')); return x > 2 && x < 6 ? x : (p.ceilMin || null) }
const readyOk = (a, mode) => mode === 'any' ? true : mode === 'ready' ? isReady(a.dl) : mode === 'h1' ? new Date(a.dl) <= new Date('2027-07-01') : new Date(a.dl) <= new Date('2027-12-31')

function passes(a, p, c, mode, limit) {
  if (a.r !== c.rooms) return false
  if (c.cls.length && !(p.classes || []).some(x => c.cls.includes(x))) return false
  if (!readyOk(a, c.ready)) return false
  if (c.ceil && !((ceilOf(a, p) || 0) >= c.ceil - 0.001)) return false
  if (c.noEdge && edgeFloor(a)) return false
  if (c.rep && !a.rep) return false
  if (c.noEuro && a.studio) return false
  if (c.smin && a.s < c.smin) return false
  if (c.lrt && !(p.lrt && p.lrt.d <= c.lrt)) return false
  if (c.lay?.length && !c.lay.includes(a.lt)) return false
  if (c.pano && !traitsOf(p).pano) return false
  if (c.balc && !a.bal) return false
  return priceOf(a, p, mode) <= c.bud * 1e6 * limit
}

// Оценка аренды конкретной квартиры: ставка ₸/м² по объявлениям в самом ЖК (если их хотя бы три), иначе в радиусе 800 м.
export function rentEst(p, a) {
  const pick = (src, tag) => { const x = src?.rent?.[a.r]; return x && x.n >= 3 ? { ...x, tag } : null }
  const x = pick(p.rs?.own, 'own') || pick(p.rs, 'near')
  if (!x) return p.rs?.rentM2 ? { v: p.rs.rentM2 * a.s, n: p.rs.rentN, tag: 'area', low: true } : null
  return { v: Math.min(x.p75, Math.max(x.p25, x.m2 * a.s)), n: x.n, tag: x.tag, low: x.n < 5 }
}

// Локация ЖК: 0..100 по LRT, паркам, спорту, повседневной инфраструктуре, ТРЦ и обжитости района.
const locCache = new WeakMap()
export function locOf(p, pois) {
  if (locCache.has(p)) return locCache.get(p)
  const cnt = (c, r) => pois.reduce((n, x) => n + (x.c === c && km(p, x) <= r ? 1 : 0), 0)
  const L = { lrt: p.lrt?.d ?? 9, lrtName: p.lrt?.n, parks: cnt('park', 1.5), sport: cnt('sport', 2), school: cnt('school', 1), kinder: cnt('kindergarten', 1), med: cnt('medical', 1.5), mall: cnt('mall', 2), market: cnt('supermarket', 0.8), ice: p.dist?.ice ?? 9, bot: p.dist?.bot ?? 9, rentN: p.rs?.rentN || 0, saleN: p.rs?.saleN || 0 }
  L.parts = {
    lrt: 25 * clamp(1 - (L.lrt - 0.4) / 2.1),
    green: 15 * Math.max(clamp(L.parks / 2), clamp(1 - (L.bot - 0.5) / 3)),
    sport: 15 * Math.max(clamp(L.sport / 3), clamp(1 - (L.ice - 0.5) / 3.5)),
    daily: 20 * (clamp(L.market / 3) + clamp(L.school / 2) + clamp(L.kinder / 2) + clamp(L.med / 3)) / 4,
    mall: 10 * clamp(L.mall / 2),
    lived: 15 * clamp(L.rentN / 150),
  }
  L.score = Math.round(Object.values(L.parts).reduce((s, v) => s + v, 0))
  locCache.set(p, L); return L
}

const monthsTo = d => Math.max(0, (new Date(d).getTime() - NOW) / MONTH)
const monthLabel = m => { const d = new Date(NOW + m * MONTH); return `${MON[d.getMonth()]} ${d.getFullYear()}` }

function measure(picks, ctx) {
  const { st, ov, pois, budgets, units, W } = ctx, as = ov.assume
  const total = picks.reduce((s, x) => s + x.price, 0), area = picks.reduce((s, x) => s + x.a.s, 0)
  const budget = budgets.reduce((s, b) => s + b, 0) * 1e6
  const main = picks[0], isRent = picks.map((_, i) => units[i].role === 'rent'), rent = picks.filter((_, i) => isRent[i])
  const ests = rent.map(x => rentEst(x.p, x.a)), estBy = picks.map((x, i) => isRent[i] ? ests[rent.indexOf(x)] : null)
  const rentMonth = ests.reduce((s, e) => s + (e?.v || 0), 0), rentKnown = ests.every(Boolean)
  // ремонт и мебель для сдачи: полная сумма для предчистовой, около трети (только мебель и техника) для квартиры с ремонтом
  const fitOf = x => as.fit * 1e6 * (x.a.rep ? .35 : 1), fitSum = rent.reduce((s, x) => s + fitOf(x), 0)
  const invRent = rent.reduce((s, x) => s + x.price, 0) + fitSum
  const rentYear = rentMonth * as.occ
  const yld = rent.length && rentKnown && invRent ? rentYear / invRent * 100 : null
  // когда пойдёт аренда: сданный дом — через 2 месяца на мебель (1, если с ремонтом); строящийся — сдача + 3 месяца до ключей + 2 на ремонт
  const waits = rent.map(x => isReady(x.a.dl) ? (x.a.rep ? 1 : 2) : monthsTo(x.a.dl) + 3 + (x.a.rep ? 1 : 2))
  let rent10 = 0
  ests.forEach((e, i) => { if (!e) return; for (let m = Math.ceil(waits[i]); m < 120; m++) rent10 += e.v * Math.pow(1 + as.rentGrowth / 100, Math.floor(m / 12)) * as.occ / 12 })
  const value10 = total * Math.pow(1 + as.growth / 100, 10)
  const invested = total + fitSum
  const roi10 = rentKnown ? (rent10 + value10 - total) / invested * 100 : null
  // цена BI против вторички рядом: положительное значение = BI дешевле вторичного рынка
  let dw = 0, dsum = 0
  for (const x of picks) { const own = x.p.rs?.own?.sale?.[x.a.r], near = x.p.rs?.sale?.[x.a.r]; const sec = own && own.n >= 5 ? own.m2 : near && near.n >= 5 ? near.m2 : null; if (sec) { dsum += (1 - (x.price / x.a.s) / sec) * x.price; dw += x.price } }
  const disc = dw ? dsum / dw * 100 : null
  const loc = locOf(main.p, pois), locS = locScore(loc, ov.near)
  const slugs = [...new Set(picks.map(x => x.p.slug))], bvs = [...new Set(picks.map(x => x.p.bigville || x.p.slug))]
  const together = slugs.length === 1 ? 'project' : bvs.length === 1 ? 'bigville' : picks.every(x => km(x.p, main.p) <= 1.5) ? 'near' : 'far'
  const cls = picks.reduce((s, x) => s + Math.max(...(x.p.classes || []).map(c => CLASS_W[c] ?? .3), 0), 0) / picks.length
  const ceil3 = picks.every(x => (ceilOf(x.a, x.p) || 0) >= 2.99)
  const quals = picks.map(x => aptQuality(x.a, x.p)), quality = quals.reduce((s, q, i) => s + q.q * (isRent[i] ? 1 : 2), 0) / quals.reduce((s, _, i) => s + (isRent[i] ? 1 : 2), 0), ceilMin = Math.min(...quals.map(q => q.h))
  const ready3 = isReady(main.a.dl), readyAll = picks.every(x => isReady(x.a.dl))
  const over = (total - budget) / budget * 100
  const edges = picks.filter(x => edgeFloor(x.a)).length, lowConf = ests.some(e => !e || e.low)
  // доля от максимума по каждому критерию (0..1), затем умножается на вес критерия
  const frac = {
    ready: ready3 ? 1 : Math.min(.7, .8 * clamp(1 - monthsTo(main.a.dl) / 14)),
    cls, quality,
    together: picks.length === 1 ? 1 : together === 'project' ? 1 : together === 'bigville' ? .67 : together === 'near' ? .33 : 0,
    loc: locS / 100,
    yld: yld == null ? 0 : clamp((yld - 5) / 6),
    disc: disc == null ? .33 : clamp((disc + 5) / 25),
    budget: clamp(1 - Math.max(0, over) / 10),
  }
  const priceM2 = area ? total / area : null
  frac.ppm = priceM2 == null ? .5 : clamp((PPM_HI - priceM2) / (PPM_HI - PPM_LO))
  const parts = {}; for (const k of Object.keys(frac)) parts[k] = frac[k] * W[k]
  // штрафы: крайние этажи, ненадёжная ставка аренды, необжитое окружение («степь»)
  parts.pen = -2 * edges - (rent.length && lowConf ? 3 : 0) - (locS < 25 ? 8 * (25 - locS) / 25 : 0)
  const score = Math.round(Object.values(parts).reduce((s, v) => s + v, 0))
  return {
    total, area, priceM2, m2byPick: picks.map(x => x.price / x.a.s), budget, over, rentMonth, rentYear, rentKnown, ests, yld, payback: rentYear ? invRent / rentYear : null, rentStart: waits.length ? Math.max(...waits) : 0, rentStartLabel: waits.length ? monthLabel(Math.max(...waits)) : '', waits, estBy, rentN: rent.length, n: picks.length, locS, mainLabel: unitLabel(units[0]), W,
    fitSum, quality, quals, ceilMin, traits: traitsOf(main.p), rent10, value10, roi10, annual: roi10 == null ? null : (Math.pow(1 + roi10 / 100, 0.1) - 1) * 100, invested, disc, loc, together, cls, ceil3, ready3, readyAll, edges, lowConf,
    biz: picks.every(x => x.p.biz), keysLabel: ready3 ? null : monthLabel(monthsTo(main.a.dl) + 3), moveIn: ready3 ? t('сразу после ремонта') : t('ключи {d}', { d: monthLabel(monthsTo(main.a.dl) + 3) }), parts, score,
  }
}

function proscons(c, ctx) {
  const m = c.m, pro = [], con = [], main = c.picks[0], classes = () => [...new Set(c.picks.map(x => t(x.p.cls)))].join(', ')
  const apt = m.mainLabel.charAt(0).toUpperCase() + m.mainLabel.slice(1), many = m.n > 1
  const rentPicks = c.picks.filter((_, i) => ctx.units[i].role === 'rent')
  if (m.ready3) pro.push(t('{apt}: дом сдан, можно заезжать после ремонта', { apt })); else con.push(t('{apt}: дом сдаётся {d}, ключи примерно {k}', { apt, d: dlMonth(main.a.dl), k: m.keysLabel }))
  if (many) { if (m.together === 'project') pro.push(t('все квартиры в одном ЖК')); else if (m.together === 'bigville') pro.push(t('все квартиры в одном бигвилле, соседние дома')); else con.push(t('квартиры в разных местах: сложнее управлять арендой')) }
  if (m.biz) pro.push(t('бизнес-класс во всех квартирах')); else if (m.cls < .6) con.push(t('класс ниже бизнеса: {l}', { l: classes() }))
  if (m.ceilMin >= 3.25) pro.push(t('потолки от {h} м во всех квартирах', { h: fmtN(m.ceilMin, 1) })); else if (m.ceil3) pro.push(t('потолки от 3 м во всех квартирах')); else con.push(t('потолки {h} м хотя бы в одной квартире', { h: fmtN(m.ceilMin, 2) }))
  const T = m.traits, lt = main.a.lt
  if (T.pano) pro.push(T.winH ? t('высокие окна: {h} м по описанию ЖК', { h: fmtN(T.winH, 1) }) : t('панорамное остекление по описанию ЖК'))
  if (lt === 'Бабочка' || lt === 'Уголок') pro.push(t('{apt}, планировка «{lt}»: {d}', { apt, lt: t(lt).toLowerCase(), d: LAYOUTS[lt] })); else if (lt === 'Расческа') con.push(t('{apt}, планировка «расчёска»: все окна на одну сторону', { apt }))
  if (main.a.rep) pro.push(t('{apt}: с ремонтом от застройщика', { apt })); else if (T.finish) con.push(t('{apt}: без ремонта (отделка в ЖК: {f}), заложите 2-4 месяца', { apt, f: finishLabel(T.finish).toLowerCase() }))
  const repN = rentPicks.filter(x => x.a.rep).length
  if (repN) pro.push(t('квартир под аренду с ремонтом: {n} из {k}, до сдачи нужна только мебель', { n: repN, k: rentPicks.length }))
  if (!main.a.bal) con.push(t('{apt}: нет балкона', { apt })); else if (main.a.bal >= 5) pro.push(t('{apt}: балкон {s} м²', { apt, s: fmtN(main.a.bal, 1) }))
  const extra = [T.yard && t('закрытый двор'), T.terrace && t('террасы'), T.fitness && t('спортзоны'), T.smart && t('умный дом')].filter(Boolean)
  if (extra.length >= 2) pro.push(t('в ЖК: {l}', { l: extra.join(', ') }))
  if (m.loc.lrt <= 0.8) pro.push(t('LRT «{n}» в {d} м', { n: tn(m.loc.lrtName), d: fmtN(m.loc.lrt * 1000) })); else if (m.loc.lrt > 2) con.push(t('до LRT {d} км', { d: fmtN(m.loc.lrt, 1) }))
  if (m.loc.ice <= 2) pro.push(t('Барыс Арена в {d} км', { d: fmtN(m.loc.ice, 1) }))
  if (m.loc.bot <= 1.5) pro.push(t('Ботанический сад в {d} км', { d: fmtN(m.loc.bot, 1) }))
  if (m.loc.score >= 70) pro.push(t('обжитой район: парки, спорт, школы и магазины рядом')); else if (m.loc.score < 25) con.push(t('вокруг почти ничего нет: по картам рядом мало парков, школ, магазинов и спорта')); else if (m.loc.score < 40) con.push(t('инфраструктура вокруг пока слабая'))
  if (m.yld != null && m.yld >= 9) pro.push(t('аренда даёт {y}% годовых на вложенное в сдаваемые квартиры', { y: fmtN(m.yld, 1) })); else if (m.yld != null && m.yld < 7) con.push(t('доходность аренды всего {y}%', { y: fmtN(m.yld, 1) }))
  if (m.disc != null && m.disc >= 8) pro.push(t('цена BI на {n}% ниже вторички рядом', { n: fmtN(m.disc) })); else if (m.disc != null && m.disc <= -5) con.push(t('цена BI на {n}% выше вторички рядом', { n: fmtN(-m.disc) }))
  if (m.rentN) { if (m.rentStart > 9) con.push(t('аренда пойдёт только с {d}', { d: m.rentStartLabel })); else if (rentPicks.every(x => isReady(x.a.dl))) pro.push(t('квартиры под аренду тоже сданы: аренда через пару месяцев')) }
  if (c.stretch) con.push(t('хотя бы одна квартира дороже своего лимита, до {n}%', { n: ctx.ov.flex }))
  if (m.over > 0.5) con.push(t('выше бюджета на {x}', { x: money(m.total - m.budget) })); else if (m.over < -8) pro.push(t('на {x} ниже бюджета', { x: money(m.budget - m.total) }))
  if (m.edges) con.push(m.edges === 1 ? t('одна квартира на крайнем этаже') : t('{n} квартиры на крайнем этаже', { n: m.edges }))
  if (m.rentN && m.lowConf) con.push(t('мало объявлений аренды рядом: ставка ориентировочная'))
  if (rentPicks.some(x => x.a.studio && x.a.r >= 2)) con.push(t('среди квартир под аренду есть евро-планировка: кухня-гостиная вместо отдельной кухни'))
  return { pro, con }
}

// Тексты (названия, пояснения, плюсы и минусы) создаются здесь на текущем языке и в текущей валюте: при их смене сценарии нужно пересобрать
export function buildScenarios(data, st, ovRaw) {
  const ov = mergeOv(ovRaw), { projects, pois } = data
  const scope = projects.filter(p => !st.leftOnly || p.left)
  const units = unitsOf(ov, st), N = units.length, W = weightsOf(ov)
  const cfgs = units.map((_, i) => slotCfg(ov, st, i))
  const ctx = { st, ov, pois, budgets: cfgs.map(c => c.bud), units, W }
  const cand = (pool, cfg, limit) => pool.flatMap(p => p.apts.filter(a => passes(a, p, cfg, st.mode, limit)).map(a => ({ p, a, price: priceOf(a, p, st.mode) })))
  // группы: откуда брать трёшку и откуда двушки
  const groups = []
  if (ov.together === 'project') for (const p of scope) groups.push({ key: p.slug, p0: [p], pr: [p] })
  else if (ov.together === 'bigville') {
    // каждый ЖК сам по себе, плюс смешанные связки внутри бигвилля (трёшка в одном доме, двушки в соседних)
    for (const p of scope) groups.push({ key: p.slug, p0: [p], pr: [p] })
    const g = {}; for (const p of scope) if (p.bigville) (g[p.bigville] ||= []).push(p)
    for (const [k, ps] of Object.entries(g)) if (ps.length > 1) for (const p of ps) groups.push({ key: 'bv:' + k + ':' + p.slug, p0: [p], pr: ps, mixed: true })
  }
  else for (const p of scope) groups.push({ key: p.slug, p0: [p], pr: ov.together === 'near' ? scope.filter(q => km(p, q) <= 1.5) : scope })
  const combos = [], seenAll = new Set()
  for (const g of groups) {
    for (const limit of ov.flex > 0 ? [1, 1 + ov.flex / 100] : [1]) {
      const cs = cfgs.map((cfg, i) => cand(i === 0 ? g.p0 : g.pr, cfg, limit))
      if (cs.some(l => !l.length)) continue
      const yv = x => { const e = rentEst(x.p, x.a); return e ? e.v / x.price : 0 }
      const sBase = x => (isReady(x.a.dl) ? 0 : 4e8) + (edgeFloor(x.a) ? 3e6 : 0) + x.price
      const sRoomy = x => (isReady(x.a.dl) ? 0 : 4e8) + (edgeFloor(x.a) ? 3e6 : 0) - x.a.s * 1e6
      const min = (l, f, skip = []) => l.filter(x => !skip.includes(x.a.id)).sort((a, b) => f(a) - f(b))[0]
      const byYield = x => -yv(x) * (edgeFloor(x.a) ? .93 : 1), byPrice = x => x.price // крайний этаж берём, только если доходность выше на 7% и более
      // остальные квартиры: под аренду — по доходности (или цене), для жизни — как первая
      const rest = (rf, lf, m) => { const out = [m]; for (let i = 1; i < N; i++) { const x = min(cs[i], units[i].role === 'rent' ? rf : lf, out.map(o => o.a.id)); if (!x) return null; out.push(x) } return out }
      const variants = [['base', min(cs[0], sBase), byYield, sBase], ['cheap', min(cs[0], byPrice), byPrice, byPrice], ['roomy', min(cs[0], sRoomy), byYield, sBase]]
      const seen = new Set(); let any = false
      for (const [kind, m, rf, lf] of variants) {
        if (!m) continue; const picks = rest(rf, lf, m); if (!picks) continue
        const id = picks.map(x => x.a.id).sort().join('|'); if (seen.has(id)) continue; seen.add(id); any = true
        if (seenAll.has(id) || (g.mixed && new Set(picks.map(x => x.p.slug)).size === 1)) continue; seenAll.add(id)
        const ps = [...new Set(picks.map(x => x.p))]
        const c = { key: g.key + ':' + kind + (limit > 1 ? ':x' : ''), group: g.key, sig: [...new Set(picks.map(x => x.p.slug))].sort().join('+'), kind, stretch: limit > 1, picks, projects: ps, title: ps.length > 1 && ps.every(p => p.bigville && p.bigville === ps[0].bigville) ? t('Бигвилль {n}', { n: ps[0].bigville }) : ps.map(p => p.name).join(' + ') }
        c.m = measure(picks, ctx); Object.assign(c, proscons(c, ctx)); combos.push(c)
      }
      if (any) break // в бюджет уложились: вариант «с доплатой» для этой группы не нужен
    }
  }
  // лучший вариант на группу
  const bestOf = {}
  for (const c of combos) if (!bestOf[c.sig] || c.m.score > bestOf[c.sig].m.score) bestOf[c.sig] = c
  const tops = Object.values(bestOf).sort((a, b) => b.m.score - a.m.score)
  // сценарии для показа
  const inB = combos.filter(c => !c.stretch), used = new Set(), cards = []
  const take = (id, title, why, list, cmp) => { const c = [...list].sort(cmp).find(x => !used.has(x.sig)); if (!c) return; used.add(c.sig); cards.push({ id, title, why, c }) }
  take('best', t('Лучший по сумме требований'), t('Максимум баллов по вашим приоритетам: срок сдачи, класс, один ЖК, локация, доходность и цена.'), inB, (a, b) => b.m.score - a.m.score)
  take('now', t('Всё сдано, аренда сразу'), t('Все квартиры в сданных домах: заезд и аренда без ожидания стройки.'), inB.filter(c => c.m.readyAll), (a, b) => b.m.score - a.m.score)
  take('cheap', t('Самый дешёвый'), t('Минимальная общая сумма при тех же фильтрах.'), inB, (a, b) => a.m.total - b.m.total)
  take('ppm', t('Дешевле за метр'), t('Самая низкая средняя цена за квадратный метр — главное при покупке метров.'), inB.filter(c => c.m.priceM2 != null), (a, b) => a.m.priceM2 - b.m.priceM2)
  take('yield', t('Максимум от аренды'), t('Квартиры под аренду с лучшей доходностью; учитываются только ЖК, где ставка подтверждена объявлениями.'), inB.filter(c => c.m.yld != null && !c.m.lowConf), (a, b) => b.m.yld - a.m.yld)
  take('biz', t('Бизнес-класс в одном ЖК'), t('Все квартиры бизнес-класса и выше в одном комплексе.'), inB.filter(c => c.m.biz && c.m.together === 'project'), (a, b) => b.m.score - a.m.score)
  take('loc', t('Лучшая локация'), t('Максимальная оценка окружения: LRT, парки, спорт, школы, магазины.'), inB, (a, b) => b.m.locS - a.m.locS || b.m.score - a.m.score)
  take('quality', t('Лучшие сами квартиры'), t('Максимум по потолкам, планировке, окнам, балкону и этажу.'), inB, (a, b) => b.m.quality - a.m.quality || b.m.score - a.m.score)
  take('roomy', t('Самая просторная квартира для жизни'), t('Первая квартира максимальной площади в пределах бюджета, в сданном доме, если такой есть.'), inB.filter(c => c.kind === 'roomy' || c.kind === 'base'), (a, b) => (b.m.ready3 - a.m.ready3) || b.picks[0].a.s - a.picks[0].a.s)
  take('growth', t('Запас к вторичке'), t('BI продаёт заметно дешевле, чем вторичный рынок рядом: потенциал роста после сдачи.'), inB.filter(c => c.m.disc != null && c.m.disc > 0), (a, b) => b.m.disc - a.m.disc)
  take('stretch', t('Если добавить до {n}%', { n: ov.flex }), t('Не проходит в лимиты, но укладывается с доплатой до {n}% к бюджету каждой квартиры.', { n: ov.flex }), combos.filter(c => c.stretch), (a, b) => b.m.score - a.m.score)
  return { ov, cfgs, units, W, combos, tops, cards, scopeN: scope.length, classes: CLASS_ORDER.filter(c => projects.some(p => (p.classes || []).includes(c))) }
}

export const fmtPct = (v, d = 1) => v == null ? '—' : fmtN(v, d) + pctSign()
export { fmtM, fmtK, fmtN }
