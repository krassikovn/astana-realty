// Личные настройки подбора: что сохраняется, как передаётся ссылкой и как из ответов анкеты получается конфигурация движка.
// Ссылка вида #/?cfg=... содержит только настройки подбора (состав, бюджеты, фильтры, приоритеты, имя профиля), без каких-либо данных о людях.
const KEYS = ['name', 'ov', 'b2', 'b3', 'leftOnly', 'mode']
const b64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64 = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))
export const encodeCfg = st => b64(JSON.stringify(Object.fromEntries(KEYS.filter(k => st[k] != null).map(k => [k, st[k]]))))
export function decodeCfg(s) {
  try { const o = JSON.parse(unb64(s)); if (!o || typeof o !== 'object') return null; const out = {}; for (const k of KEYS) if (k in o) out[k] = o[k]; return out } catch { return null }
}

// Доля общего бюджета на квартиру по числу комнат: чем больше комнат, тем больше доля
const ROOM_SHARE = { 1: .75, 2: 1, 3: 1.3, 4: 1.6 }
export const splitBudget = (units, total) => { const sum = units.reduce((s, u) => s + ROOM_SHARE[u.rooms], 0); return units.map(u => Math.round(total * ROOM_SHARE[u.rooms] / sum)) }

export const CLASS_FROM = { any: [], comfort: ['Комфорт', 'Комфорт+', 'Бизнес', 'Бизнес+', 'Премиум'], comfortPlus: ['Комфорт+', 'Бизнес', 'Бизнес+', 'Премиум'], biz: ['Бизнес', 'Бизнес+', 'Премиум'], prem: ['Бизнес+', 'Премиум'] }

export const ANSWERS_DEFAULT = {
  name: '', units: [{ role: 'live', rooms: 3 }, { role: 'rent', rooms: 2 }, { role: 'rent', rooms: 2 }], total: 165, buds: null, flex: 10,
  clsMode: 'all', cls: 'any', clsPer: [], ready: 'any', ceil: 3, extras: [], together: 'bigville', bank: 'left',
  imp: { ready: 2, loc: 2, quality: 1, yld: 1, cls: 1, together: 1, budget: 1, disc: 1 }, near: ['lrt', 'green', 'sport'],
}
// Ответы анкеты → настройки магазина (ov, бюджеты, берег)
export function answersToStore(a) {
  const buds = a.buds && a.buds.length === a.units.length ? a.buds : splitBudget(a.units, a.total)
  const units = a.units.map((u, i) => ({ ...u, bud: buds[i] }))
  // движок ставит квартиры для жизни первыми: сортируем здесь же, чтобы фильтры по квартирам совпали по номерам
  const order = units.map((u, i) => i).sort((x, y) => (units[x].role === 'live' ? 0 : 1) - (units[y].role === 'live' ? 0 : 1) || x - y)
  const sorted = order.map(i => units[i])
  const common = { cls: a.clsMode === 'all' ? CLASS_FROM[a.cls] : [], ready: 'any', ceil: a.ceil, lrt: 0, lay: [], rep: a.extras.includes('rep'), balc: a.extras.includes('balc'), noEdge: a.extras.includes('noEdge'), noEuro: a.extras.includes('noEuro'), pano: a.extras.includes('pano') }
  // срок сдачи важен только для квартир, в которых будут жить; класс может быть своим у каждой квартиры
  const slots = order.map(i => ({ ...(sorted[order.indexOf(i)].role === 'live' && a.ready !== 'any' ? { ready: a.ready } : {}), ...(a.clsMode === 'per' ? { cls: CLASS_FROM[a.clsPer[i] || 'any'] } : {}) }))
  const near = Object.fromEntries(['lrt', 'green', 'sport', 'daily', 'mall', 'lived'].map(k => [k, a.near.includes(k) ? 2 : k === 'lived' ? 1 : .6]))
  const bud = r => Math.max(0, ...sorted.filter(u => (r === 3 ? u.rooms >= 3 : u.rooms <= 2)).map(u => u.bud))
  return {
    name: a.name.trim(), view: 'mine', answers: a, leftOnly: a.bank === 'left',
    b3: bud(3) || 65, b2: bud(2) || 50,
    ov: { common, per: slots.some(s => Object.keys(s).length > 0), slots, units: sorted, together: a.together, imp: a.imp, near, flex: a.flex },
  }
}
