import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData, useStore, fmtN, priceOf, dlMonth, isReady, km, edgeFloor } from '../lib.js'
import { t, money } from '../i18n.js'
import { Money, statMoney } from '../money.jsx'
import { Pill, Stat, PlanThumb } from '../ui.jsx'
import { BudgetPill } from './Overview.jsx'
import { td, hLabel } from './Catalog.jsx'

// Подписи переводятся при отрисовке: t(ROLES[i][0])
const ROLES = [['Трёшка, в которой жить', 3], ['Двушка под аренду, первая', 2], ['Двушка под аренду, вторая', 2]]
function Slot({ i }) {
  const { projects, bySlug } = useData(); const st = useStore(); const [label, rooms] = ROLES[i]
  const cur = st.slots[i]; const p = cur ? bySlug[cur.slug] : null; const a = p?.all.find(x => x.id === cur.id)
  const options = useMemo(() => projects.filter(x => (!st.leftOnly || x.left) && x.apts.some(y => y.r === rooms)).sort((x, y) => x.name.localeCompare(y.name)), [projects, st.leftOnly, rooms])
  const apts = p ? p.apts.filter(x => x.r === rooms).sort((x, y) => priceOf(x, p, st.mode) - priceOf(y, p, st.mode)) : []
  const lim = (rooms === 3 ? st.b3 : st.b2) * 1e6
  return (
    <div className={`card slot ${a ? 'filled' : ''}`}>
      <div className="slot-n">{t('Квартира {i} из 3', { i: i + 1 })}</div>
      <h3>{t(label)}</h3>
      <div className="pick">
      <select aria-label={t('ЖК')} value={p?.slug || ''} onChange={e => { const np = bySlug[e.target.value]; const first = np?.apts.filter(x => x.r === rooms).sort((x, y) => x.p - y.p)[0]; st.setSlot(i, first ? { slug: np.slug, id: first.id } : null) }}>
        <option value="">{t('Выберите ЖК')}</option>{options.map(o => <option key={o.slug} value={o.slug}>{o.name} · {td(o.cls)}</option>)}
      </select>
      {p && <select aria-label={t('Квартира')} value={a?.id || ''} onChange={e => st.setSlot(i, { slug: p.slug, id: e.target.value })}>
        {!a && <option value="">{t('Квартира продана или в брони')}</option>}
        {apts.map(x => <option key={x.id} value={x.id}>{fmtN(x.s, 1)} {t('м²')}, {t('эт. {f}/{fm}', { f: x.f, fm: x.fm })}, {dlMonth(x.dl)}{x.rep ? ', ' + t('ремонт') : ''} — {money(priceOf(x, p, st.mode), { precise: true })}</option>)}
      </select>}
      {a && <PlanThumb a={a} className="plan" />}
      </div>
      {a ? <div className="pick">
        <div className="total"><b className="num"><Money v={priceOf(a, p, st.mode)} precise /></b><Pill tone={priceOf(a, p, st.mode) <= lim ? 'good' : 'bad'}>{priceOf(a, p, st.mode) <= lim ? t('в лимите') : t('выше лимита')}</Pill></div>
        <div className="kv two-col">
          <span>{t('Площадь')} <b>{fmtN(a.s, 1)} {t('м²')}</b></span><span>{t('Этаж')} <b>{t('{f} из {fm}', { f: a.f, fm: a.fm })}</b></span><span>{t('Сдача')} <b>{dlMonth(a.dl)}</b></span><span>{t('Отделка')} <b>{a.rep ? t('с ремонтом') : t('предчистовая')}</b></span>
          <span>{t('Потолок')} <b>{hLabel(a.h && a.h !== '0' ? a.h : p.ceilTxt)}</b></span><span>{t('Цена за м²')} <b><Money v={priceOf(a, p, st.mode) / a.s} /></b></span>{a.k && <span>{t('Кухня')} <b>{fmtN(a.k, 1)} {t('м²')}</b></span>}{a.lt && <span>{t('Тип')} <b>{td(a.lt)}</b></span>}
        </div>
        <Link className="btn sm" to={`/p/${p.slug}`} style={{ marginTop: 6 }}>{t('Страница {name}', { name: p.name })}</Link>
      </div> : <div className="empty">{t('Выберите ЖК и квартиру или нажмите «в подбор» на странице ЖК.')}</div>}
    </div>
  )
}
export default function Builder() {
  const { bySlug } = useData(); const st = useStore()
  const picks = st.slots.map(s => { const p = s && bySlug[s.slug]; const a = p?.all.find(x => x.id === s.id); return a ? { p, a } : null })
  const full = picks.every(Boolean); const some = picks.filter(Boolean)
  const sum = some.reduce((s, x) => s + priceOf(x.a, x.p, st.mode), 0)
  const warn = []
  if (full) {
    if (picks[1].a.id === picks[2].a.id) warn.push(t('Одна и та же двушка выбрана дважды.'))
    const far = Math.max(km(picks[0].p, picks[1].p), km(picks[0].p, picks[2].p), km(picks[1].p, picks[2].p))
    if (far > 0.05) warn.push(far < 1.2 ? t('Дома рядом: между самыми дальними {d} км.', { d: fmtN(far, 1) }) : t('Дома в разных районах: между самыми дальними {d} км.', { d: fmtN(far, 1) }))
    if (!isReady(picks[0].a.dl)) warn.push(t('Трёшка сдаётся {d}: в начале 2027 года в неё не заехать.', { d: dlMonth(picks[0].a.dl) }))
    if (!picks[0].a.rep) warn.push(t('Трёшка с предчистовой отделкой: до заселения 2–4 месяца ремонта.'))
    if (picks.some(x => !x.p.biz)) warn.push(t('Не все дома бизнес-класса по классификации BI.'))
    if (picks.some(x => edgeFloor(x.a))) warn.push(t('Есть квартиры на первом или последнем этаже.'))
    if (picks.some(x => (x.p.ceilMin ?? 3) < 3)) warn.push(t('В одном из домов потолки ниже 3 м.'))
  }
  const rentYear = picks.slice(1).filter(Boolean).reduce((s, x) => s + (x.p.rs?.rent?.[2]?.m2 ? x.p.rs.rent[2].m2 * x.a.s * 12 : 0), 0)
  const two = picks.slice(1).filter(Boolean).reduce((s, x) => s + priceOf(x.a, x.p, st.mode), 0)
  return (
    <>
      <div className="page-h"><div><h1>{t('Подбор тройки')}</h1><p className="muted">{t('Три конкретные квартиры с планировками. Выбор сохраняется в браузере. Заполнить можно со страницы ЖК кнопкой «в подбор» или из готовых связок на обзоре.')}</p></div>
        <button className="btn" onClick={() => st.set({ slots: [null, null, null] })}>{t('Очистить')}</button></div>
      <div className="slots">{[0, 1, 2].map(i => <Slot key={i} i={i} />)}</div>
      <div className="stats" style={{ marginTop: 20 }}>
        <div className="stat"><span className="muted small">{t('Сумма за {n} из 3', { n: some.length })}</span><b className="num"><Money v={sum} sub /></b>{full && <BudgetPill sum={sum} />}</div>
        <Stat label={t('Общая площадь')} value={fmtN(some.reduce((s, x) => s + x.a.s, 0), 1)} unit={t('м²')} />
        <Stat label={t('Аренда двух двушек в год')} {...statMoney(rentYear || null)} hint={t('по ставке за м² рядом с ЖК на Крыше')} />
        <Stat label={t('Доходность двушек')} value={rentYear && two ? fmtN(rentYear / two * 100, 1) : '—'} unit={t('% в год')} hint={t('до ремонта, простоя и налогов')} />
      </div>
      {warn.length > 0 && <div className="note" style={{ marginTop: 20 }}><ul>{warn.map(w => <li key={w}>{w}</li>)}</ul></div>}
    </>
  )
}
