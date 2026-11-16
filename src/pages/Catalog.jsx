import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData, useStore, fitInfo, dlLabel, fmtN } from '../lib.js'
import { t, tp, isCs, roomsLabel } from '../i18n.js'
import CS from '../i18n/index.js'
import { Money } from '../money.jsx'
import { Pill, Img } from '../ui.jsx'

// Значения из данных с небольшим фиксированным набором (класс жилья, тип планировки, банк, месяц): переводим, если есть в словаре, иначе оставляем как есть
export const td = s => isCs() && s != null && CS[s] != null ? CS[s] : s
// Одно русское слово с разным смыслом по-чешски: tc('нет', 'ads') ищет ключ «нет|ads», иначе обычный перевод
export const tc = (ru, ctx) => isCs() ? CS[ru + '|' + ctx] ?? t(ru) : ru
// Высота из данных: «Не менее 3,0 м», «от 3 м», «2.7-3 м»
export const hLabel = s => !isCs() || s == null ? s : String(s).replace(/не менее/i, 'min.').replace(/(^|\s)от (?=\d)/i, '$1od ').replace(/(^|\s)до (?=\d)/i, '$1až ').replace(/(\d)\s*м(?![а-яё])/gi, '$1 m')
// Ячейка «от 25,1 млн ₸» в карточке ЖК и на карте
export const PriceCell = ({ r, v, ok }) => <div className={ok ? 'ok' : v == null ? 'none' : ''}><span>{roomsLabel(r)}</span><b className="num">{v == null ? t('нет') : <>{t('от')} <Money v={v} /></>}</b></div>

export function ProjectCard({ p }) {
  const st = useStore(); const f = fitInfo(p, st)
  return (
    <Link className="card pcard" to={`/p/${p.slug}`}>
      <div className="ph-wrap"><Img src={p.cover} alt={p.name} />
        <div className="over"><Pill tone="dark">{td(p.cls)}</Pill><Pill tone="dark">{p.ready ? t('есть сданные дома') : dlLabel(p.firstDl)}</Pill></div>
      </div>
      <div className="body">
        <div><h3>{p.name}</h3><div className="addr">{p.bigville ? t('бигвилль {n}', { n: p.bigville }) + ' · ' : ''}{String(p.address || '').replace(/^г\.?\s*Астана,?\s*/i, '')}</div></div>
        <div className="prices"><PriceCell r={1} v={f.p1} /><PriceCell r={2} v={f.p2} ok={f.fit2} /><PriceCell r={3} v={f.p3} ok={f.fit3} /></div>
        <div className="kv">
          <span>{t('Потолки')} <b>{hLabel(p.ceilTxt)}</b></span><span>{t('Этажность')} <b>{t('до {n}', { n: p.floorMax })}</b></span><span>{t('Свободно')} <b>{p.apts.length}</b></span>
          <span>{t('Аренда 2-к')} <b>{p.rs?.rent?.[2] ? <Money v={p.rs.rent[2].med} /> : '—'}</b></span><span>{t('Ботсад')} <b>{fmtN(p.dist.bot, 1)} {t('км')}</b></span><span>LRT <b>{p.lrt ? fmtN(p.lrt.d, 1) + ' ' + t('км') : '—'}</b></span>
        </div>
        <div className="pills foot">{f.fit2 && f.fit3 && <Pill tone="good">{t('проходит по лимитам')}</Pill>}{p.maxDisc > 0 && <Pill tone="warn">{t('скидка до {n}%', { n: p.maxDisc })}</Pill>}{!p.left && <Pill>{t('правый берег')}</Pill>}</div>
      </div>
    </Link>
  )
}
// Подписи переводятся при отрисовке: t(SORT[k][0])
const SORT = {
  fit: ['сначала подходящие', (p, f) => (f.fit2 && f.fit3 ? 0 : 1) * 1e12 + (p.biz ? 0 : 1) * 1e11 + (f.p3 ?? 9e10)],
  p3: ['по цене трёшки', (p, f) => f.p3 ?? 9e12], p2: ['по цене двушки', (p, f) => f.p2 ?? 9e12],
  dl: ['по сроку сдачи', p => new Date(p.firstDl || '2999').getTime()], bot: ['ближе к Ботсаду', p => p.dist.bot], ice: ['ближе к Барыс Арене', p => p.dist.ice],
  lrt: ['ближе к LRT', p => p.lrt?.d ?? 99], rent: ['по аренде двушки', p => -(p.rs?.rent?.[2]?.med ?? 0)],
}
export default function Catalog() {
  const { projects } = useData(); const st = useStore()
  const [f, setF] = useState({ biz: false, fit: false, ready: false, c3: false }); const [sort, setSort] = useState('fit'); const [q, setQ] = useState('')
  const list = useMemo(() => {
    const rows = projects.filter(p => !st.leftOnly || p.left).map(p => ({ p, f: fitInfo(p, st) }))
      .filter(({ p, f: x }) => (!f.biz || p.biz) && (!f.fit || (x.fit2 && x.fit3)) && (!f.ready || p.ready) && (!f.c3 || (p.ceilMin ?? 0) >= 3) && (!q || (p.name + ' ' + (p.bigville || '') + ' ' + p.address).toLowerCase().includes(q.toLowerCase())))
    return rows.sort((a, b) => SORT[sort][1](a.p, a.f) - SORT[sort][1](b.p, b.f))
  }, [projects, st, f, sort, q])
  const chip = (k, label) => <button className="chip" aria-pressed={f[k]} onClick={() => setF(s => ({ ...s, [k]: !s[k] }))}>{label}</button>
  return (
    <>
      <div className="page-h"><div><h1>{t('Каталог ЖК')}</h1><p className="muted">{t('Все проекты BI Group в Астане, где сейчас продаются квартиры. Цены «от» считаются по свободным квартирам, без броней.')}</p></div></div>
      <div className="filters">
        <input className="grow" type="text" placeholder={t('Поиск по названию или улице')} value={q} onChange={e => setQ(e.target.value)} aria-label={t('Поиск')} />
        {chip('biz', t('Бизнес и выше'))}{chip('fit', t('Проходит по лимитам'))}{chip('ready', t('Есть сданные дома'))}{chip('c3', t('Потолки от 3 м'))}
        <div className="push"><span className="muted small num">{list.length} {tp(list.length, ['ЖК', 'ЖК', 'ЖК'], ['projekt', 'projekty', 'projektů'])}</span>
          <select value={sort} onChange={e => setSort(e.target.value)} aria-label={t('Сортировка')}>{Object.entries(SORT).map(([k, v]) => <option key={k} value={k}>{t(v[0])}</option>)}</select></div>
      </div>
      {list.length === 0 ? <div className="note">{t('Под такие фильтры ничего не подходит. Снимите один из них.')}</div> :
        <div className="grid">{list.map(({ p }) => <ProjectCard key={p.slug} p={p} />)}</div>}
    </>
  )
}
