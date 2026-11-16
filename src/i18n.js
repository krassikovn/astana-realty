// Язык и валюта интерфейса. Тексты в коде остаются на русском и служат ключами: t('Каталог ЖК') вернёт чешский перевод из src/i18n/*.js, если выбран чешский.
// Цены в данных всегда в тенге; пересчёт в евро и кроны по курсу Нацбанка Казахстана (public/data/rates.json).
import CS from './i18n/index.js'

let LANG = 'ru', CUR = 'KZT', RATES = { EUR: 490.91, CZK: 20.12, date: null }
export const setLocale = ({ lang, cur, rates }) => { if (lang) LANG = lang; if (cur) CUR = cur; if (rates?.EUR && rates?.CZK) RATES = rates }
export const getLang = () => LANG
export const getCur = () => CUR
export const getRates = () => RATES
export const isCs = () => LANG === 'cs'
// Названия из данных (станции LRT): переводим, если есть в словаре, иначе оставляем как есть
export const tn = s => LANG === 'cs' && s != null && CS[s] != null ? CS[s] : s

// t('Двушки от {n}', { n: 5 }) — подстановка в фигурных скобках. Непереведённые строки в чешском режиме копятся в window.__i18nMissing.
export function t(ru, vars) {
  let s = ru
  if (LANG === 'cs') { const c = CS[ru]; if (c != null) s = c; else if (typeof window !== 'undefined' && /[а-яё]/i.test(ru)) (window.__i18nMissing ||= new Set()).add(ru) }
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '') : s
}
// Множественное число: tp(n, ['квартира', 'квартиры', 'квартир'], ['byt', 'byty', 'bytů'])
export function tp(n, ru, cs) {
  if (LANG === 'cs' && cs) { const a = Math.abs(n); return a === 1 ? cs[0] : a >= 2 && a <= 4 ? cs[1] : cs[2] }
  const m = Math.abs(n) % 100, k = m % 10; return m > 10 && m < 20 ? ru[2] : k === 1 ? ru[0] : k > 1 && k < 5 ? ru[1] : ru[2]
}
const MON_RU = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const MON_CS = ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro']
export const mon = i => (LANG === 'cs' ? MON_CS : MON_RU)[i]
// Комнатность. По-чешски принята запись «2+kk» (спальня и кухня-гостиная) и «2+1» (две комнаты и отдельная кухня).
export const dispo = a => LANG === 'cs' ? `${a.r}+${a.studio ? 'kk' : '1'}` : `${a.r}-комн.`
export const roomsLabel = r => LANG === 'cs' ? `${r} ${r === 1 ? 'pokoj' : r < 5 ? 'pokoje' : 'pokojů'}` : `${r}-комн.`

// ───── деньги
export const CURS = { KZT: { sym: '₸', flag: 'kz', ru: 'тенге', cs: 'tenge' }, EUR: { sym: '€', flag: 'eu', ru: 'евро', cs: 'euro' }, CZK: { sym: 'Kč', flag: 'cz', ru: 'чешские кроны', cs: 'české koruny' } }
export const CUR_ORDER = ['KZT', 'EUR', 'CZK']
export const conv = (v, c = CUR) => c === 'KZT' ? v : v / RATES[c]
const nf = (x, d) => Number(x).toLocaleString('ru-RU', { maximumFractionDigits: d, minimumFractionDigits: d })
// Разбирает сумму в тенге на число и единицу в нужной валюте с разумным масштабом: 64,3 млн ₸ · 131 тыс. € · 3,19 млн Kč
export function moneyParts(v, { cur = CUR, precise = false } = {}) {
  if (v == null || isNaN(v)) return { num: '—', unit: '', text: '—', cur }
  const x = conv(v, cur), a = Math.abs(x), sym = CURS[cur].sym, cs = LANG === 'cs'
  let num, word = ''
  if (a >= 1e6) { num = nf(x / 1e6, (a < 1e7 ? 2 : a < 1e8 ? 1 : 0) + (precise && a >= 1e7 ? 1 : 0)); word = cs ? 'mil.' : 'млн' }
  else if (a >= 1e4) { num = nf(x / 1e3, (a < 1e5 ? 1 : 0) + (precise && a >= 1e5 ? 1 : 0)); word = cs ? 'tis.' : 'тыс' + (cur === 'KZT' ? '' : '.') }
  else num = nf(x, a < 100 ? 1 : 0)
  const unit = (word ? word + ' ' : '') + sym
  return { num, unit, text: num + ' ' + unit, cur }
}
export const money = (v, o) => moneyParts(v, o).text
export const others = () => CUR_ORDER.filter(c => c !== CUR)
// «≈ 131 тыс. € · 3,19 млн Kč» — две дополнительные валюты одной строкой
export const moneyAlt = v => v == null || isNaN(v) ? '' : '≈ ' + others().map(c => money(v, { cur: c })).join(' · ')
// Диапазон в одной единице: «25,1–103,5 млн ₸»
export function moneyRange(a, b, o) { const pa = moneyParts(a, o), pb = moneyParts(b, o); return pa.unit === pb.unit ? `${pa.num}–${pb.num} ${pb.unit}` : `${pa.text} – ${pb.text}` }
