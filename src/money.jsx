// Цена в выбранной валюте. Две другие валюты показываются во всплывающей подсказке (наведение, фокус или касание), а при sub — строкой под ценой.
import { useEffect, useState } from 'react'
import { moneyParts, moneyAlt, money, t, getCur, getLang, getRates, CURS, CUR_ORDER } from './i18n.js'

const FLAGS = {
  kz: <><rect width="20" height="14" fill="#00AFCA" /><circle cx="10" cy="6.2" r="2.6" fill="#FEC50C" /><path d="M5.5 10.2c3 1.6 6 1.6 9 0" stroke="#FEC50C" strokeWidth="1.1" fill="none" strokeLinecap="round" /><rect x="1.2" width="1.3" height="14" fill="#FEC50C" opacity=".85" /></>,
  eu: <><rect width="20" height="14" fill="#003399" />{Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return <circle key={i} cx={10 + 4.3 * Math.sin(a)} cy={7 - 4.3 * Math.cos(a)} r=".75" fill="#FFCC00" /> })}</>,
  cz: <><rect width="20" height="7" fill="#fff" /><rect y="7" width="20" height="7" fill="#D7141A" /><path d="M0 0l10 7L0 14z" fill="#11457E" /></>,
  ru: <><rect width="20" height="14" fill="#fff" /><rect y="4.67" width="20" height="4.67" fill="#0039A6" /><rect y="9.33" width="20" height="4.67" fill="#D52B1E" /></>,
}
export const Flag = ({ c, className = '' }) => <svg className={`flag ${className}`} viewBox="0 0 20 14" aria-hidden="true">{FLAGS[c]}</svg>

// suffix — что идёт после единицы: «/мес», «/м²». precise — на один знак точнее.
export function Money({ v, suffix = '', sub = false, precise = false, className = '' }) {
  const p = moneyParts(v, { precise })
  if (v == null || isNaN(v)) return <span className={className}>—</span>
  return (
    <span className={`mny ${sub ? 'has-sub' : ''} ${className}`} data-mny={v} data-suf={suffix} tabIndex={0}>
      <span className="mny-n">{p.num}</span><span className="mny-u">{' '}{p.unit}{suffix}</span>
      {sub && <span className="mny-sub">{moneyAlt(v)}</span>}
    </span>
  )
}
// Для плиток Stat: {...statMoney(v, '/мес')} даёт value и unit, а подсказка с другими валютами сохраняется
export const statMoney = (v, suffix = '') => { const p = moneyParts(v); return { value: v == null || isNaN(v) ? '—' : <span className="mny" data-mny={v} data-suf={suffix} tabIndex={0}>{p.num}</span>, unit: v == null || isNaN(v) ? undefined : p.unit + suffix } }
export const MoneyAlt = ({ v, className = 'muted small' }) => v == null || isNaN(v) ? null : <span className={className}>{moneyAlt(v)}</span>

// Одна подсказка на весь сайт: показывает сумму во всех трёх валютах с флагами
export function MoneyTip() {
  const [tip, setTip] = useState(null)
  useEffect(() => {
    const show = e => { const el = e.target.closest?.('[data-mny]'); if (!el) return setTip(null); const r = el.getBoundingClientRect(); setTip({ v: +el.dataset.mny, suf: el.dataset.suf || '', x: Math.min(window.innerWidth - 130, Math.max(130, r.left + r.width / 2)), y: r.top, below: r.top < 150, b: r.bottom }) }
    const hide = () => setTip(null)
    document.addEventListener('pointerover', show); document.addEventListener('focusin', show); document.addEventListener('focusout', hide); window.addEventListener('scroll', hide, true)
    return () => { document.removeEventListener('pointerover', show); document.removeEventListener('focusin', show); document.removeEventListener('focusout', hide); window.removeEventListener('scroll', hide, true) }
  }, [])
  if (!tip) return null
  const r = getRates()
  return (
    <div className={`mny-tip ${tip.below ? 'below' : ''}`} role="tooltip" style={{ left: tip.x, top: tip.below ? tip.b + 8 : tip.y - 8 }}>
      {CUR_ORDER.map(c => <div key={c} className={c === getCur() ? 'on' : ''}><Flag c={CURS[c].flag} /><b>{money(tip.v, { cur: c, precise: true })}{tip.suf}</b></div>)}
      {r.date && <small>{t('Курс Нацбанка Казахстана на {d}', { d: r.date.split('-').reverse().join('.') })}</small>}
    </div>
  )
}

export function CurSwitch({ value, onChange }) {
  return <div className="seg cur-seg" role="group" aria-label={t('Валюта')}>{CUR_ORDER.map(c => <button key={c} aria-pressed={value === c} onClick={() => onChange(c)} title={CURS[c][getLang() === 'cs' ? 'cs' : 'ru']}><Flag c={CURS[c].flag} />{CURS[c].sym}</button>)}</div>
}
export function LangSwitch({ value, onChange }) {
  return <div className="seg cur-seg" role="group" aria-label={t('Язык')}>{[['ru', 'ru', 'Русский'], ['cs', 'cz', 'Čeština']].map(([l, f, n]) => <button key={l} aria-pressed={value === l} onClick={() => onChange(l)} lang={l}><Flag c={f} />{n}</button>)}</div>
}
