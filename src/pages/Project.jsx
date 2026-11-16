import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useData, useStore, fmtN, dlMonth, dlLabel, priceOf, nearestPois, POI_CATS, yieldOf, isReady, km } from '../lib.js'
import { t, tn, tp, isCs, dispo, roomsLabel, money, moneyRange } from '../i18n.js'
import { Money, statMoney } from '../money.jsx'
import { Pill, Img, Gallery, Section, Stat, FavBtn, Lightbox } from '../ui.jsx'
import { td, hLabel } from './Catalog.jsx'

const FIRST = 12
// «12 объявл.» / «12 inzerátů»
const adsN = n => `${n} ${tp(n, ['объявл.', 'объявл.', 'объявл.'], ['inzerát', 'inzeráty', 'inzerátů'])}`
// Тип планировки из данных: по-русски строчными, по-чешски как в словаре
const ltLabel = lt => isCs() ? td(lt) : lt.toLowerCase()
const distLabel = d => d < 1 ? `${Math.round(d * 1000)} ${t('м')}` : `${fmtN(d, 1)} ${t('км')}`
// Короткие подписи из данных BI: «3 очередь», «Февраль 2026», «5 минут»
const camLabel = s => isCs() ? String(s).replace(/(\d+) очередь/i, '$1. etapa').replace(/^Очередь /i, 'Etapa ').replace(/^Блок /i, 'Budova ') : s
const monthLabel = s => isCs() ? String(s).replace(/^[А-Яа-яЁё]+/, m => td(m)) : s
const nearTime = s => isCs() ? String(s).replace(/мин(ут[аы]?)?\.?/i, 'min') : s
const factorValue = v => { const x = td(v); return x !== v ? x : hLabel(v) }

function Layouts({ p }) {
  const st = useStore(); const [rooms, setRooms] = useState(0); const [open, setOpen] = useState(null); const [all, setAll] = useState(false); const [zoom, setZoom] = useState(null)
  const groups = useMemo(() => {
    const g = {}
    for (const a of p.apts) { const k = a.r + '|' + (a.plan || a.img || Math.round(a.s)); (g[k] ||= { r: a.r, plan: a.plan || a.img, list: [] }).list.push(a) }
    return Object.entries(g).map(([k, v]) => { const pr = v.list.map(a => priceOf(a, p, st.mode)); return { k, ...v, min: Math.min(...pr), max: Math.max(...pr), s1: Math.min(...v.list.map(a => a.s)), s2: Math.max(...v.list.map(a => a.s)) } }).sort((a, b) => a.r - b.r || a.min - b.min)
  }, [p, st.mode])
  const grid = useRef(null)
  // раскрытая карточка занимает всю строку и может уехать ниже: держим её в поле зрения
  useEffect(() => { if (open) grid.current?.querySelector('.layout.open')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [open])
  const rs = [...new Set(groups.map(g => g.r))]
  const shown = groups.filter(g => !rooms || g.r === rooms)
  const lim = r => r === 2 ? st.b2 : r === 3 ? st.b3 : null
  const nApts = shown.reduce((s, g) => s + g.list.length, 0)
  return (
    <>
      <div className="filters scroll">
        <button className="chip" aria-pressed={rooms === 0} onClick={() => setRooms(0)}>{t('Все')}</button>
        {rs.map(r => <button key={r} className="chip" aria-pressed={rooms === r} onClick={() => setRooms(r)}>{roomsLabel(r)}</button>)}
        <span className="muted small">{shown.length} {tp(shown.length, ['планировка', 'планировки', 'планировок'], ['dispozice', 'dispozice', 'dispozic'])}, {nApts} {tp(nApts, ['квартира', 'квартиры', 'квартир'], ['byt', 'byty', 'bytů'])}</span>
      </div>
      <div className="grid sm keep2" ref={grid}>
        {shown.slice(0, all ? 999 : FIRST).map(g => { const f1 = Math.min(...g.list.map(a => a.f)), f2 = Math.max(...g.list.map(a => a.f)); return (
          <div className={`card layout ${open === g.k ? 'open' : ''}`} key={g.k}>
            <button className="plan" onClick={e => { const im = e.currentTarget.querySelector('img'); if (im) setZoom(im.currentSrc || im.src) }} aria-label={t('Увеличить планировку')}>
              <Img src={g.plan} fallback={g.list[0].img} alt={t('Планировка {r}-комнатной квартиры', { r: g.r, d: dispo(g.list[0]) })} />
              {lim(g.r) && g.min <= lim(g.r) * 1e6 && <span className="tag"><Pill tone="good">{t('в лимите')}</Pill></span>}
            </button>
            <div className="body">
              <h3>{dispo(g.list[0])}, {g.s1 === g.s2 ? fmtN(g.s1, 1) : `${fmtN(g.s1, 1)}–${fmtN(g.s2, 1)}`} {t('м²')}</h3>
              <div className="muted small">{g.list.length} {tp(g.list.length, ['квартира', 'квартиры', 'квартир'], ['byt', 'byty', 'bytů'])} · {f1 === f2 ? t('этаж {f}', { f: f1 }) : t('этажи {a}–{b}', { a: f1, b: f2 })}{g.list[0].lt ? ' · ' + ltLabel(g.list[0].lt) : ''}</div>
              <div className="price num">{g.max > g.min ? moneyRange(g.min, g.max) : <Money v={g.min} />}</div>
              <button className="btn sm" aria-expanded={open === g.k} onClick={() => setOpen(open === g.k ? null : g.k)}>{open === g.k ? t('Скрыть квартиры') : t('Показать квартиры')}</button>
            </div>
            {open === g.k && <AptTable p={p} list={g.list} compact />}
          </div>
        ) })}
      </div>
      {shown.length > FIRST && !all && <div className="more"><button className="btn" onClick={() => setAll(true)}>{t('Показать все {n}', { n: shown.length })}</button></div>}
      {zoom && <Lightbox images={[zoom]} index={0} onClose={() => setZoom(null)} onIndex={() => {}} />}
    </>
  )
}
function AptTable({ p, list, compact }) {
  const st = useStore()
  const rows = [...list].sort((a, b) => priceOf(a, p, st.mode) - priceOf(b, p, st.mode))
  const add = a => { const i = a.r === 3 ? 0 : (st.slots[1] ? 2 : 1); st.setSlot(i, { slug: p.slug, id: a.id }) }
  const inSlots = a => st.slots.some(x => x && x.slug === p.slug && x.id === a.id)
  return (
    <div className="tw" style={{ maxHeight: compact ? 320 : 640 }}><table>
      <thead><tr><th className="fit"><span className="sr">{t('Избранное')}</span></th>{!compact && <th className="r">{t('Комн.')}</th>}<th className="r">{t('Площадь, м²')}</th><th className="r">{t('Этаж')}</th><th>{t('Сдача')}</th>{!compact && <><th>{t('Блок')}</th><th>{t('Потолок')}</th><th>{t('Отделка')}</th></>}<th className="r">{t('Цена')}</th><th className="fit"><span className="sr">{t('Подбор')}</span></th></tr></thead>
      <tbody>{rows.length === 0 && <tr><td colSpan={compact ? 6 : 10} className="muted">{t('Свободных квартир такого типа нет.')}</td></tr>}{rows.map(a => (
        <tr key={a.id}>
          <td className="fit"><FavBtn slug={p.slug} id={a.id} /></td>{!compact && <td className="r num">{isCs() ? dispo(a) : a.r}</td>}<td className="r num">{fmtN(a.s, 1)}</td><td className="r num">{t('{f} из {fm}', { f: a.f, fm: a.fm })}</td><td>{dlMonth(a.dl)}</td>
          {!compact && <><td>{String(a.b || '').replace(p.name, '').replace(/^[\s.\-–]+/, '') || '—'}</td><td>{a.h && a.h !== '0' ? hLabel(a.h) : '—'}</td><td>{a.rep ? t('ремонт') : t('предчистовая')}</td></>}
          <td className="r num"><b><Money v={priceOf(a, p, st.mode)} precise /></b></td>
          <td className="fit r">{(a.r === 2 || a.r === 3) && (inSlots(a) ? <Pill tone="acc">{t('в подборе')}</Pill> : <button className="btn sm" onClick={() => add(a)} title={t('Добавить в подбор тройки')}>{t('в подбор')}</button>)}</td>
        </tr>))}</tbody>
    </table></div>
  )
}

// Якоря разделов: прокрутка вручную, потому что адресная строка занята HashRouter
function SubNav({ items }) {
  const [cur, setCur] = useState(items[0][0]); const ref = useRef(null)
  // на узком экране активный пункт должен оставаться в видимой части ленты
  useEffect(() => { const n = ref.current, a = n?.querySelector('.on'); if (!a) return; const l = a.offsetLeft - 16, r = a.offsetLeft + a.offsetWidth + 16; if (l < n.scrollLeft) n.scrollLeft = l; else if (r > n.scrollLeft + n.clientWidth) n.scrollLeft = r - n.clientWidth }, [cur])
  const key = items.map(x => x[0]).join()
  useEffect(() => {
    const on = () => { let c = items[0][0]; for (const [id] of items) { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top < 140) c = id } setCur(c) }
    on(); window.addEventListener('scroll', on, { passive: true }); return () => window.removeEventListener('scroll', on)
  }, [key])
  const go = (e, id) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  return <nav className="subnav" ref={ref} aria-label={t('Разделы ЖК')}>{items.map(([id, label]) => <a key={id} href={'#' + id} className={cur === id ? 'on' : ''} aria-current={cur === id ? 'true' : undefined} onClick={e => go(e, id)}>{label}</a>)}</nav>
}

export default function Project() {
  const { slug } = useParams(); const { bySlug, pois, krisha, lrtApprox } = useData(); const st = useStore()
  const p = bySlug[slug]
  const [tab, setTab] = useState(3)
  if (!p) return <div className="note">{t('ЖК не найден.')} <Link to="/catalog">{t('В каталог')}</Link></div>
  const L = p.land || {}
  const aptBlocks = (p.blocks || []).filter(b => b.kind === 'apt')
  const parking = (p.blocks || []).filter(b => b.kind === 'parking')
  const y2 = yieldOf(p, 2, st.mode), y1 = yieldOf(p, 1, st.mode), y3 = yieldOf(p, 3, st.mode)
  const nearRent = krisha.rent.filter(a => km(p, a) <= 0.8).sort((a, b) => a.p - b.p)
  const cats = ['lrt', 'school', 'kindergarten', 'medical', 'park', 'sport', 'mall', 'supermarket']
  const has = { feat: L.features?.length > 0, arch: !!L.architecture, spaces: L.spaces?.length > 0, prog: L.progress?.length > 0 }
  const minOf = r => { const x = p.apts.filter(a => a.r === r).map(a => priceOf(a, p, st.mode)); return x.length ? Math.min(...x) : null }
  const floors = `${p.floorMin < 1 ? 1 : p.floorMin}–${p.floorMax}`
  const perMonth = t('/мес'), perM2 = t('/м²')
  return (
    <>
      <div className="crumbs"><Link to="/catalog">{t('Каталог')}</Link> / {p.bigville ? t('бигвилль {n}', { n: p.bigville }) + ' / ' : ''}{p.name}</div>
      <div className="hero">
        <Img src={p.cover} alt={p.name} />
        <div className="hero-c">
          <div className="pills"><Pill tone="dark">{p.classes.map(td).join(' · ')}</Pill><Pill tone="dark">{t('потолки {h}', { h: hLabel(p.ceilTxt) })}</Pill><Pill tone="dark">{p.ready ? t('есть сданные дома') : t('сдача {d}', { d: dlLabel(p.firstDl) })}</Pill>{!p.left && <Pill tone="dark">{t('правый берег')}</Pill>}</div>
          <h1>{p.name}</h1>
          <p>{L.slogan ? L.slogan + ' · ' : ''}{p.address}</p>
        </div>
      </div>
      <SubNav items={[['facts', t('Главное')], ['photos', t('Визуалы')], has.feat && ['features', t('Особенности')], has.arch && ['arch', t('Архитектура')], has.spaces && ['spaces', t('Двор и холлы')],
        ['around', t('Что рядом')], ['layouts', t('Планировки')], ['apts', t('Квартиры')], ['rent', t('Аренда')], has.prog && ['progress', t('Стройка')]].filter(Boolean)} />

      <Section id="facts" title={t('Главное')}>
        <div className="stats">
          <Stat label={t('Двушки от')} {...statMoney(minOf(2))} />
          <Stat label={t('Трёшки от')} {...statMoney(minOf(3))} />
          <Stat label={t('Свободных квартир')} value={p.apts.length} hint={t('в брони ещё {n}', { n: p.all.length - p.apts.length })} />
          <Stat label={t('Этажность')} value={floors} />
          <Stat label={t('Аренда двушки рядом')} {...statMoney(p.rs?.rent?.[2]?.med, perMonth)} hint={p.rs?.rent?.[2] ? `${adsN(p.rs.rent[2].n)} ${t('в радиусе 800 м')}` : t('нет объявлений рядом')} />
          <Stat label={t('Доходность двушки')} value={y2 ? fmtN(y2.y, 1) : '—'} unit={t('% в год')} hint={t('до расходов и налогов')} />
        </div>
        <div className="two" style={{ marginTop: 20 }}>
          <div className="card">
            {isCs() && <p className="muted small">{t('Описания застройщика приведены в оригинале, на русском языке.')}</p>}
            <h3>{L.about?.heading ? td(L.about.heading) : t('О проекте')}</h3>
            {L.about?.text ? <p className="prose">{L.about.text}</p> : <p className="muted small">{t('Описание на лендинге BI не найдено.')}</p>}
            {L.factors?.length > 0 ? <div className="kv">{L.factors.map((f, i) => <span key={i}>{td(f.label)} <b>{factorValue(f.value)}</b></span>)}</div> : <div className="kv">
              <span>{t('Класс')} <b>{p.classes.map(td).join(', ')}</b></span><span>{t('Потолки')} <b>{hLabel(p.ceilTxt)}</b></span><span>{t('Этажность')} <b>{floors}</b></span>
              <span>{t('Первая сдача')} <b>{dlLabel(p.firstDl)}</b></span><span>{t('Последняя сдача')} <b>{dlLabel(p.lastDl)}</b></span><span>{t('Берег')} <b>{p.left ? t('левый') : t('правый')}</b></span>
            </div>}
            {L.tags?.length > 0 && <div className="taglist">{L.tags.map(x => <span key={x}>{x}</span>)}</div>}
            {!L.tags?.length && p.layoutTypes?.length > 0 && <div><div className="muted small" style={{ marginBottom: 6 }}>{t('Типы планировок')}</div><div className="taglist">{p.layoutTypes.map(x => <span key={x}>{td(x)}</span>)}</div></div>}
            <div className="links">
              <a className="btn sm" href={p.website} target="_blank" rel="noreferrer">{t('Страница на bi.group')} ↗</a>
              {L.panorama && <a className="btn sm" href={L.panorama} target="_blank" rel="noreferrer">{t('Панорама 360°')} ↗</a>}
              {L.booklet && <a className="btn sm" href={L.booklet} target="_blank" rel="noreferrer">{t('Буклет')} ↗</a>}
              {(L.links || []).map(l => <a key={l.url} className="btn sm" href={l.url} target="_blank" rel="noreferrer">{td(l.label)} ↗</a>)}
              {(L.cameras || []).slice(0, 2).map(c => <a key={c.url} className="btn sm" href={c.url} target="_blank" rel="noreferrer">{t('Камера: {n}', { n: camLabel(c.label) })} ↗</a>)}
            </div>
          </div>
          <div className="card">
            <h3>{t('Дома и сроки')}</h3>
            <div className="tw"><table><thead><tr><th>{t('Блок')}</th><th>{t('Сдача дома')}</th><th>{t('Ключи')}</th><th className="r">{t('Квартир')}</th><th className="r">{t('Цены')}</th></tr></thead>
              <tbody>{aptBlocks.map(b => <tr key={b.name}><td>{b.name}</td><td>{isReady(b.deadline) ? <Pill tone="good">{t('сдан')}</Pill> : dlMonth(b.deadline)}</td><td>{b.docDate && isReady(b.docDate) ? t('выдают') : dlMonth(b.docDate)}</td><td className="r num">{b.count}</td><td className="r num">{moneyRange(b.min, b.max)}</td></tr>)}</tbody></table></div>
            <div className="notes">
            {parking.length > 0 && <p className="muted small">{t('Паркинг: {v} за место, в бюджет не входит.', { v: moneyRange(Math.min(...parking.map(b => b.min)), Math.max(...parking.map(b => Math.min(b.max, 2e7)))) })}</p>}
            {p.maxDisc > 0 && <p className="muted small">{t('В каталоге «лучшая цена» ниже прайса до {n}%: это скидка при 100% оплате или акция, на конкретную квартиру уточнять.', { n: p.maxDisc })}</p>}
            {p.banks?.length > 0 && <p className="muted small">{t('Ипотека')}: {p.banks.map(td).join(', ')}{p.installment ? ' · ' + t('есть рассрочка') : ''}.</p>}
            {L.legal && <p className="muted small">{L.legal}</p>}
            </div>
          </div>
        </div>
      </Section>

      <Section id="photos" title={t('Визуалы')} sub={t('Рендеры и фото с лендинга BI Group. Нажмите, чтобы открыть крупно.')}>
        <Gallery images={p.photos} variant="mosaic" max={9} />
        {L.infra?.length > 0 && <><h3 className="sub-h">{t('Генплан и окружение')}</h3><Gallery images={L.infra.map(i => i.image)} variant="wide" /></>}
      </Section>

      {has.feat && <Section id="features" title={t('Особенности')}>
        <div className="grid">{L.features.map((f, i) => (
          <div className="card" key={i}><div className="feat"><Gallery images={f.images.slice(0, 1)} /><div><div className="muted small">{f.category}</div><h3>{f.title}</h3><p className="small" style={{ marginTop: 6 }}>{f.text}</p></div></div>{f.images.length > 1 && <Gallery images={f.images.slice(1)} variant="strip" max={4} />}</div>))}</div>
      </Section>}

      {has.arch && <Section id="arch" title={L.architecture.title ? td(L.architecture.title) : t('Архитектура')}>
        <div className="two"><div className="card"><p className="prose">{L.architecture.text}</p>{L.architecture.marks.length > 0 && <div className="taglist">{L.architecture.marks.map(m => <span key={m}>{m}</span>)}</div>}</div><Gallery images={L.architecture.images} variant="wide" /></div>
      </Section>}

      {has.spaces && <Section id="spaces" title={t('Двор, холлы, квартиры')}>
        <div className="grid">{L.spaces.map((s, i) => (
          <div className="card" key={i}><Gallery images={s.images} variant="strip" max={4} /><h3>{s.title}</h3><p className="small">{s.text}</p>{s.benefits.length > 0 && <div className="taglist">{s.benefits.map(b => <span key={b}>{b}</span>)}</div>}</div>))}</div>
      </Section>}

      <Section id="around" title={t('Что рядом')} sub={t('Расстояния по прямой от дома. Объекты из OpenStreetMap') + (lrtApprox ? '; ' + t('станции LRT пока по приблизительной схеме') : '') + '.'}>
        <div className="stats" style={{ marginBottom: 20 }}>
          <Stat label={t('Ботанический сад')} value={fmtN(p.dist.bot, 1)} unit={t('км')} /><Stat label={t('Барыс Арена')} value={fmtN(p.dist.ice, 1)} unit={t('км')} /><Stat label={t('MEGA Silk Way')} value={fmtN(p.dist.mega, 1)} unit={t('км')} />
          <Stat label={t('Байтерек')} value={fmtN(p.dist.bai, 1)} unit={t('км')} /><Stat label={`LRT «${tn(p.lrt?.n) || '—'}»`} value={p.lrt ? fmtN(p.lrt.d, 1) : '—'} unit={t('км')} /><Stat label={t('Аэропорт')} value={fmtN(p.dist.air, 1)} unit={t('км')} />
        </div>
        <div className="poi-list">{cats.map(c => { const l = nearestPois(p, pois, c, 4, c === 'lrt' ? 6 : 2.5); return (
          <div className="card" key={c}><h3><i style={{ background: POI_CATS[c].color }} />{t(POI_CATS[c].n)}</h3>{l.length ? <ul>{l.map((x, i) => <li key={i}><span>{x.n || t('без названия')}</span><b className="num">{distLabel(x.d)}</b></li>)}</ul> : <p className="muted small">{t('В радиусе 2,5 км в OSM не отмечено.')}</p>}</div>) })}</div>
        {(L.near?.length > 0 || L.benefits?.length > 0) && <>
          <h3 className="sub-h">{t('Что отмечает сам застройщик')}</h3>
          {L.near?.length > 0 && <div className="taglist" style={{ marginBottom: 12 }}>{L.near.map(n => <span key={n.title}>{n.title}: {nearTime(n.time)}</span>)}</div>}
          <div className="grid sm">{(L.benefits || []).map((b, i) => <div className="card imgcard" key={i}>{b.image && <div className="pic"><Img src={b.image} /></div>}<div className="body"><h3>{b.title}</h3><p className="small muted" style={{ marginTop: 4 }}>{b.text}</p></div></div>)}</div>
        </>}
        <p style={{ marginTop: 20 }}><Link className="btn" to={`/map?focus=${p.slug}`}>{t('Что рядом: показать на карте')}</Link></p>
      </Section>

      <Section id="layouts" title={t('Планировочные решения')} sub={t('Сгруппировано по чертежу. Свободные квартиры, без броней.')}><Layouts p={p} /></Section>

      <Section id="apts" title={t('Все свободные квартиры')} right={<div className="seg">{[1, 2, 3, 4].filter(r => p.apts.some(a => a.r === r)).map(r => <button key={r} aria-pressed={tab === r} onClick={() => setTab(r)}>{roomsLabel(r)}</button>)}</div>}>
        <AptTable p={p} list={p.apts.filter(a => a.r === tab)} />
      </Section>

      <Section id="rent" title={t('Аренда рядом')} sub={t('Объявления Крыши о долгосрочной аренде в радиусе 800 м от дома на дату сбора. Это цены предложения, а не сделок.')}>
        <div className="stats">
          {[[1, y1], [2, y2], [3, y3]].map(([r, y]) => { const x = p.rs?.rent?.[r]; return <Stat key={r} label={t('{d}, медиана', { d: roomsLabel(r) })} {...statMoney(x?.med, perMonth)} hint={x ? `${adsN(x.n)} · ${moneyRange(x.p25, x.p75)} · ${t('доходность {y}', { y: y ? fmtN(y.y, 1) + '%' : '—' })}` : t('объявлений нет')} /> })}
          <Stat label={t('Вторичка рядом')} {...statMoney(p.rs?.saleM2 || null, perM2)} hint={p.rs ? `${adsN(p.rs.saleN)} ${t('о продаже')}` : ''} />
        </div>
        {p.rs?.own?.rentN > 0 && <>
          <h3 style={{ margin: '20px 0 10px' }}>{t('В самом ЖК')}</h3>
          <div className="stats">
            {[1, 2, 3].map(r => { const x = p.rs.own.rent?.[r]; return <Stat key={r} label={t('{d}, медиана', { d: roomsLabel(r) })} {...statMoney(x?.med, perMonth)} hint={x ? `${adsN(x.n)} · ${money(x.m2)}${perM2}` : t('объявлений нет')} /> })}
            <Stat label={t('Вторичка в самом ЖК')} {...statMoney(p.rs.own.saleM2 || null, perM2)} hint={`${adsN(p.rs.own.saleN)} ${t('о продаже')}`} />
          </div>
          <p className="muted small" style={{ marginTop: 8 }}>{t('Объявления, которые Крыша относит к жилым комплексам в 200 м от точки ЖК ({n}). Привязка по координатам, без сверки названий: рядом может оказаться соседний дом другого застройщика.', { n: `${p.rs.own.complexes} ${tp(p.rs.own.complexes, ['комплекс', 'комплекса', 'комплексов'], ['projekt', 'projekty', 'projektů'])}` })}</p>
        </>}
        {nearRent.length > 0 && <div className="tw" style={{ marginTop: 16, maxHeight: 420 }}><table><thead><tr><th>{t('Объявление')}</th><th>{t('Адрес')}</th><th className="r">{t('Площадь, м²')}</th><th className="r">{t('В месяц')}</th><th className="r">{t('За м²')}</th><th className="r">{t('До дома')}</th></tr></thead>
          <tbody>{nearRent.slice(0, 60).map(a => <tr key={a.id}><td><a href={`https://krisha.kz/a/show/${a.id}`} target="_blank" rel="noreferrer">{a.t}</a></td><td>{a.a}</td><td className="r num">{a.s}</td><td className="r num"><Money v={a.p} precise /></td><td className="r num"><Money v={a.p / a.s} /></td><td className="r num">{Math.round(km(p, a) * 1000)} {t('м')}</td></tr>)}</tbody></table></div>}
      </Section>

      {has.prog && <Section id="progress" title={t('Ход строительства')}>
        <div className="grid">{L.progress.map((r, i) => <div className="card" key={i}><div><h3>{monthLabel(r.label)}</h3><div className="muted small">{r.block}</div></div><Gallery images={r.images} variant="strip" max={4} /></div>)}</div>
      </Section>}
    </>
  )
}
