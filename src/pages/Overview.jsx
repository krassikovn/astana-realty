import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useData, useStore, fmtN, dlMonth, edgeFloor, isReady } from '../lib.js'
import { t, tp, dispo, money } from '../i18n.js'
import { Money, MoneyAlt } from '../money.jsx'
import { Pill, Img, Section, AptRow, FavBtn, PlanThumb } from '../ui.jsx'
import { encodeCfg } from '../profile.js'
import { buildScenarios, mergeOv, slotCfg, OV_DEFAULT, READY_OPTS, TOGETHER_OPTS, SLOT_NAMES, SLOT_SHORT, LAYOUTS, ceilOf, fmtPct, finishLabel, dataUnits, pctSign } from '../scenarios.js'

export function BudgetPill({ sum, budget }) {
  const st = useStore(); const lim = budget ?? (st.b3 + 2 * st.b2) * 1e6, d = (sum - lim) / 1e6
  if (d <= -10) return <Pill tone="good">{t('на {x} ниже лимита', { x: money(lim - sum) })}</Pill>
  if (d <= 0) return <Pill tone="good">{t('в лимите')}</Pill>
  return <Pill tone={d <= 5 ? 'warn' : 'bad'}>{t('+{x} к лимиту', { x: money(sum - lim) })}</Pill>
}

// Подписи отдаются функциями: перевод берётся в момент отрисовки
const KIND = () => ({ base: t('сбалансированный набор'), cheap: t('самые дешёвые квартиры'), roomy: t('первая квартира побольше') })
const PARTS = W => [['ready', t('Срок сдачи жилья')], ['loc', t('Локация')], ['quality', t('Качество квартир')], ['yld', t('Доходность аренды')], ['cls', t('Класс жилья')], ['together', t('Всё рядом')], ['disc', t('Запас к вторичке')], ['budget', t('Бюджет')]].map(([k, l]) => [k, l, W[k]]).filter(x => x[2] > 0.5).sort((a, b) => b[2] - a[2])
const TOGETHER = () => ({ project: t('один ЖК'), bigville: t('один бигвилль'), near: t('рядом, до 1,5 км'), far: t('разные районы') })
const h1 = v => v == null ? '—' : String(v).replace('.', ',') + '\u00a0' + t('м')
const clsList = c => [...new Set(c.picks.map(x => t(x.p.cls)))].join(', ')
const years = v => t('{n} лет', { n: fmtN(v, 1) })

// ───── фильтры одной квартиры (или общие для всех трёх)
function FilterSet({ cfg, set, classes, own }) {
  const tog = (k, v) => set({ [k]: cfg[k].includes(v) ? cfg[k].filter(x => x !== v) : [...cfg[k], v] })
  return (
    <div className="fset">
      {own && <div className="frow two-in">
        <label className="field">{t('Комнат')}<select value={cfg.rooms} onChange={e => set({ rooms: +e.target.value })}>{[1, 2, 3, 4].map(r => <option key={r} value={r}>{r}</option>)}</select></label>
        <label className="field">{t('Бюджет, млн ₸')}<input type="number" min="10" max="400" value={cfg.bud} onChange={e => set({ bud: +e.target.value || 0 })} /><MoneyAlt v={cfg.bud * 1e6} /></label>
        <label className="field">{t('Площадь от, м²')}<input type="number" min="0" max="300" value={cfg.smin || ''} placeholder={t('любая')} onChange={e => set({ smin: +e.target.value || 0 })} /></label>
      </div>}
      <div className="frow"><span className="fl">{t('Класс')}</span><div className="chips">
        <button className="chip" aria-pressed={!cfg.cls.length} onClick={() => set({ cls: [] })}>{t('любой')}</button>
        {classes.map(c => <button key={c} className="chip" aria-pressed={cfg.cls.includes(c)} onClick={() => tog('cls', c)}>{t(c)}</button>)}
      </div></div>
      <div className="frow"><span className="fl">{t('Срок сдачи')}</span><div className="chips">{READY_OPTS().map(([v, l]) => <button key={v} className="chip" aria-pressed={cfg.ready === v} onClick={() => set({ ready: v })}>{l}</button>)}</div></div>
      <div className="frow"><span className="fl">{t('Потолки')}</span><div className="chips">{[[0, t('любые')], [2.7, t('от 2,7 м')], [3, t('от 3 м')], [3.3, t('от 3,3 м')]].map(([v, l]) => <button key={v} className="chip" aria-pressed={cfg.ceil === v} onClick={() => set({ ceil: v })}>{l}</button>)}</div></div>
      <div className="frow"><span className="fl">{t('Тип планировки')}</span><div className="chips">
        <button className="chip" aria-pressed={!cfg.lay.length} onClick={() => set({ lay: [] })}>{t('любая')}</button>
        {Object.entries(LAYOUTS).map(([k, d]) => <button key={k} className="chip" title={d} aria-pressed={cfg.lay.includes(k)} onClick={() => tog('lay', k)}>{t(k).toLowerCase()}</button>)}
      </div></div>
      <div className="frow"><span className="fl">{t('Квартира')}</span><div className="chips">
        {[['rep', t('с ремонтом')], ['balc', t('с балконом')], ['noEdge', t('не крайний этаж')], ['noEuro', t('без евро-планировок')], ['pano', t('высокие или панорамные окна')]].map(([k, l]) => <button key={k} className="chip" aria-pressed={!!cfg[k]} onClick={() => set({ [k]: !cfg[k] })}>{l}</button>)}
      </div></div>
      <div className="frow"><span className="fl">{t('До LRT')}</span><div className="chips">{[[0, t('неважно')], [0.8, t('до 800 м')], [1.5, t('до 1,5 км')], [2.5, t('до 2,5 км')]].map(([v, l]) => <button key={v} className="chip" aria-pressed={cfg.lrt === v} onClick={() => set({ lrt: v })}>{l}</button>)}</div></div>
    </div>
  )
}

// ───── строка квартиры с подробностями, которые участвуют в оценке
function PickRow({ x, role, est }) {
  const { p, a } = x, h = ceilOf(a, p)
  return (
    <div className="pick">
      <PlanThumb a={a} />
      <div className="pick-b">
        <span className="aptrow-role">{role}</span>
        <div className="aptrow-t"><Link to={`/p/${p.slug}`}>{p.name}</Link> · {dispo(a)}, {String(a.s).replace('.', ',')}{'\u00a0'}{t('м²')}</div>
        <div className="tags">
          <span className={isReady(a.dl) ? 'ok' : ''}>{dlMonth(a.dl)}</span>
          <span className={edgeFloor(a) ? 'no' : ''}>{t('этаж {f} из {fm}', { f: a.f, fm: a.fm })}</span>
          {h && <span className={h >= 3 ? 'ok' : 'no'}>{t('потолок {h}', { h: h1(h) })}</span>}
          {a.lt && <span title={LAYOUTS[a.lt]}>{t(a.lt).toLowerCase()}</span>}
          <span className={a.rep ? 'ok' : ''}>{a.rep ? t('с ремонтом') : t('без ремонта')}</span>
          {a.bal ? <span>{t('балкон {s} м²', { s: fmtN(a.bal, 1) })}</span> : <span className="no">{t('без балкона')}</span>}
          {a.studio && a.r > 1 && <span>{t('евро-планировка')}</span>}
        </div>
      </div>
      <div className="aptrow-p num"><Money v={x.price} precise />{est && <small className="rentest" title={est.tag === 'own' ? t('по объявлениям в самом ЖК') : est.tag === 'near' ? t('по объявлениям в 800 м') : t('по средней ставке района')}>{t('аренда ~')}<Money v={est.v} suffix={t('/мес')} /></small>}</div>
    </div>
  )
}

function Kpis({ m }) {
  return (
    <div className="kpis">
      <div><span>{t('Все квартиры')}</span><b className="num"><Money v={m.total} sub /></b><BudgetPill sum={m.total} budget={m.budget} /></div>
      <div><span>{t('Аренда сдаваемых квартир')}</span><b className="num">{m.rentKnown && m.rentN ? <Money v={m.rentMonth} suffix={t('/мес')} /> : '—'}</b>{m.rentN > 0 && <small>{t('старт: {d}', { d: m.rentStart <= 2.5 ? t('через 1-2 месяца') : m.rentStartLabel })}</small>}</div>
      <div><span>{t('Доходность аренды')}</span><b className="num">{fmtPct(m.yld)} <i>{t('в год')}</i></b><small>{t('окупаемость')} {m.payback ? years(m.payback) : '—'}</small></div>
      <div><span>{t('Итог за 10 лет')}</span><b className="num">{m.roi10 == null ? '—' : '+' + fmtN(m.roi10, 0) + pctSign()}</b><small>{m.rentN > 0 && <>{t('аренда')} <Money v={m.rent10} /> + </>}{t('рост цены')} <Money v={m.value10 - m.total} /></small></div>
    </div>
  )
}

function ProsCons({ c, max = 9 }) {
  return (
    <div className="pc">
      <ul className="pro">{c.pro.slice(0, max).map(x => <li key={x}>{x}</li>)}</ul>
      <ul className="con">{c.con.slice(0, max).map(x => <li key={x}>{x}</li>)}{!c.con.length && <li className="none">{t('существенных минусов по данным нет')}</li>}</ul>
    </div>
  )
}

function ScoreBars({ m }) {
  return <div className="bars">{PARTS(m.W).map(([k, l, mx]) => <div key={k} title={t('{a} из {b}', { a: fmtN(m.parts[k], 1), b: fmtN(mx, 1) })}><span>{l}</span><i><b style={{ width: `${Math.max(0, m.parts[k]) / mx * 100}%` }} /></i><em className="num">{fmtN(m.parts[k], 0)}/{fmtN(mx, 0)}</em></div>)}{m.parts.pen < 0 && <div><span>{t('Штрафы')}</span><i /><em className="num">{fmtN(m.parts.pen, 0)}</em></div>}</div>
}

function Scenario({ card, hero, onUse, base, units }) {
  const { c } = card, m = c.m
  const dT = base && base !== c ? m.total - base.m.total : null
  return (
    <article className={`card scn ${hero ? 'hero-scn' : ''}`}>
      {c.projects.some(p => p.cover) && <div className="cv">
        {c.projects.filter(p => p.cover).slice(0, 3).map(p => <Link key={p.slug} to={`/p/${p.slug}`} aria-label={p.name}><Img src={p.cover} alt={p.name} /><Pill tone="dark">{p.name}</Pill></Link>)}
      </div>}
      <div className="body">
        <div className="scn-h">
          <div><span className="eyebrow">{card.title}</span><h3>{c.title}</h3><p className="muted small">{card.why}</p></div>
          <div className="score" title={t('Оценка по сумме требований, из 100')}><b className="num">{m.score}</b><span>{t('из 100')}</span></div>
        </div>
        <div className="pills">
          <Pill tone={m.ready3 ? 'good' : 'warn'}>{t('жильё: {d}', { d: dlMonth(c.picks[0].a.dl) })}</Pill>
          <Pill tone={m.together === 'project' ? 'acc' : 'neu'}>{TOGETHER()[m.together]}</Pill>
          <Pill tone={m.biz ? 'acc' : 'neu'}>{clsList(c)}</Pill>
          <Pill tone={m.loc.lrt <= 1 ? 'good' : 'neu'}>LRT {m.loc.lrt < 1 ? fmtN(m.loc.lrt * 1000) + '\u00a0' + t('м') : fmtN(m.loc.lrt, 1) + '\u00a0' + t('км')}</Pill>
          {m.traits.list.slice(0, hero ? 4 : 2).map(x => <Pill key={x}>{x}</Pill>)}
          {dT != null && Math.abs(dT) >= 5e5 && <Pill tone={dT < 0 ? 'good' : 'warn'}>{dT < 0 ? t('дешевле лучшего на {x}', { x: money(-dT) }) : t('дороже лучшего на {x}', { x: money(dT) })}</Pill>}
        </div>
        <Kpis m={m} />
        <div className="rows">{c.picks.map((x, i) => <PickRow key={x.a.id} x={x} role={SLOT_SHORT(units)[i]} est={m.estBy[i]} />)}</div>
        <ProsCons c={c} max={hero ? 12 : 5} />
        {hero && <ScoreBars m={m} />}
        <div className="foot"><button className="btn pri" onClick={() => onUse(c)}>{t('Открыть в подборе')}</button><Link className="btn" to={`/map?focus=${[...new Set(c.picks.map(x => x.p.slug))].join(',')}`}>{t('Что рядом на карте')}</Link><Link className="btn" to={`/p/${c.picks[0].p.slug}`}>{t('Страница ЖК')}</Link></div>
      </div>
    </article>
  )
}

function Compare({ cards, units }) {
  const rentP = c => c.picks.filter((_, i) => units[i].role === 'rent'), hasRent = units.some(u => u.role === 'rent')
  const main = c => c.picks[0], km = v => fmtN(v, 1) + '\u00a0' + t('км')
  const rows = [
    [t('Общая сумма'), c => <Money v={c.m.total} />], [t('К бюджету'), c => (c.m.over > 0 ? '+' : '') + fmtN(c.m.over, 0) + pctSign()], [t('Общая площадь, м²'), c => fmtN(c.m.area, 0)],
    [t('Класс'), clsList], [t('Вместе'), c => TOGETHER()[c.m.together]],
    [t('Жильё: срок'), c => dlMonth(main(c).a.dl)], [t('Жильё: площадь и этаж'), c => `${fmtN(main(c).a.s, 1)}\u00a0${t('м²')}, ${t('этаж {f} из {fm}', { f: main(c).a.f, fm: main(c).a.fm })}`], [t('Жильё: потолок'), c => h1(ceilOf(main(c).a, main(c).p))],
    [t('Жильё: планировка'), c => main(c).a.lt ? t(main(c).a.lt).toLowerCase() : '—'], [t('Жильё: отделка'), c => main(c).a.rep ? t('с ремонтом') : c.m.traits.finish ? finishLabel(c.m.traits.finish).toLowerCase() : t('без ремонта')], [t('Окна в ЖК'), c => c.m.traits.winTxt ? t('высота {h}', { h: dataUnits(c.m.traits.winTxt).toLowerCase() }) : c.m.traits.pano ? t('панорамные') : '—'],
    ...(hasRent ? [[t('Под аренду: срок'), c => [...new Set(rentP(c).map(x => dlMonth(x.a.dl)))].join(', ')], [t('Под аренду: с ремонтом'), c => t('{n} из {k}', { n: rentP(c).filter(x => x.a.rep).length, k: rentP(c).length })]] : []),
    [t('Аренда пойдёт'), c => c.m.rentStart <= 2.5 ? t('через 1-2 мес') : c.m.rentStartLabel], [t('Аренда сдаваемых квартир'), c => c.m.rentKnown && c.m.rentN ? <Money v={c.m.rentMonth} suffix={t('/мес')} /> : '—'], [t('Объявлений аренды рядом'), c => fmtN(c.m.loc.rentN)],
    [t('Доходность аренды'), c => fmtPct(c.m.yld)], [t('Окупаемость сдаваемых квартир'), c => c.m.payback ? years(c.m.payback) : '—'],
    [t('Аренда за 10 лет'), c => <Money v={c.m.rent10} />], [t('Цена всех квартир через 10 лет'), c => <Money v={c.m.value10} />], [t('Итог за 10 лет'), c => c.m.roi10 == null ? '—' : '+' + fmtN(c.m.roi10, 0) + pctSign() + ' (' + fmtPct(c.m.annual) + ' ' + t('в год') + ')'],
    [t('Цена BI к вторичке рядом'), c => c.m.disc == null ? '—' : c.m.disc >= 0 ? t('ниже на {n}%', { n: fmtN(c.m.disc, 0) }) : t('выше на {n}%', { n: fmtN(-c.m.disc, 0) })],
    [t('До LRT'), c => km(c.m.loc.lrt)], [t('До Барыс Арены'), c => km(c.m.loc.ice)], [t('До Ботанического сада'), c => km(c.m.loc.bot)], [t('Локация, из 100'), c => c.m.locS], [t('Оценка, из 100'), c => <b>{c.m.score}</b>],
  ]
  return (
    <div className="tw pin cmp"><table>
      <thead><tr><th></th>{cards.map(k => <th key={k.id} className="r"><span className="eyebrow">{k.title}</span>{k.c.title}</th>)}</tr></thead>
      <tbody>{rows.map(([l, f]) => <tr key={l}><td>{l}</td>{cards.map(k => <td key={k.id} className="r num">{f(k.c)}</td>)}</tr>)}</tbody>
    </table></div>
  )
}

export default function Overview() {
  const data = useData(); const { bySlug, priceindex } = data; const st = useStore(); const nav = useNavigate()
  const [slotTab, setSlotTab] = useState(0)
  // «Базовый подбор» — зафиксированный исходный запрос (3-комн. для жизни и две 2-комн. под аренду, 65 и 50 млн ₸, левый берег); «Мой подбор» — настройки из анкеты и фильтров
  const mine = st.view === 'mine'
  const S = useMemo(() => mine ? buildScenarios(data, st, st.ov) : buildScenarios(data, { ...st, b3: 65, b2: 50, leftOnly: true, mode: 'list' }, null), [data, mine, st.b2, st.b3, st.mode, st.leftOnly, st.ov, st.lang, st.cur])
  const { ov, cards, tops, combos, classes, units } = S
  const [copied, setCopied] = useState(false)
  const [showF, setShowF] = useState(false) // тонкие фильтры свёрнуты: основное задаёт анкета
  const share = async () => { try { await navigator.clipboard.writeText(location.origin + location.pathname + '#/?cfg=' + encodeCfg(st)); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch {} }
  const setOv = fn => st.set(s => ({ ov: fn(mergeOv(s.ov)) }))
  const setCommon = patch => setOv(o => ({ ...o, common: { ...o.common, ...patch } }))
  const setSlot = (i, patch) => setOv(o => ({ ...o, slots: o.slots.map((x, k) => k === i ? { ...x, ...patch } : x) }))
  const setAssume = patch => setOv(o => ({ ...o, assume: { ...o.assume, ...patch } }))
  const use = c => { st.set({ slots: [0, 1, 2].map(i => c.picks[i] ? { slug: c.picks[i].p.slug, id: c.picks[i].a.id } : null) }); nav('/builder') }
  const favs = st.favs.map(k => { const [slug, id] = k.split('|'); const p = bySlug[slug]; const a = p?.all.find(x => x.id === id); return a ? { p, a } : null }).filter(Boolean)
  const best = cards[0], rest = cards.slice(1)
  const list = useMemo(() => { const l = [...(ov.allVariants ? combos : tops)]; const f = { score: c => -c.m.score, total: c => c.m.total, yld: c => -(c.m.yld ?? -1), roi: c => -(c.m.roi10 ?? -1), loc: c => -c.m.locS, disc: c => -(c.m.disc ?? -99), q: c => -c.m.quality }[ov.sort] || (c => -c.m.score); return l.sort((a, b) => f(a) - f(b)) }, [combos, tops, ov.sort, ov.allVariants])
  const idx = priceindex?.[0]?.['Есильский р-н'] || []
  const cagr = n => idx.length > n * 12 ? (Math.pow(idx[idx.length - 1][1] / idx[idx.length - 1 - n * 12][1], 1 / n) - 1) * 100 : null
  const dirty = JSON.stringify({ ...ov, sort: 0, allVariants: 0 }) !== JSON.stringify({ ...OV_DEFAULT, sort: 0, allVariants: 0 })
  return (
    <>
      <div className="page-h"><div>
        <h1>{t('Квартиры в Астане')}</h1>
        <p className="muted">{t('Сайт перебирает все свободные квартиры BI Group в Астане, собирает из них наборы под запрос и оценивает каждый: срок сдачи, класс, потолки, планировка, отделка, окна, окружение, аренда рядом и цена к вторичке.')}</p>
      </div></div>

      <section className="card viewbar" aria-label={t('Чей подбор показывать')}>
        <div className="seg" role="group">
          <button aria-pressed={!mine} onClick={() => st.set({ view: 'base' })}>{t('Базовый подбор')}</button>
          <button aria-pressed={mine} onClick={() => st.set({ view: 'mine' })}>{st.name ? t('Подбор: {n}', { n: st.name }) : t('Мой подбор')}</button>
        </div>
        <p className="muted small">{mine ? t('Состав: {l}. Всё пересчитывается от ваших ответов и фильтров ниже.', { l: SLOT_NAMES(units).join(', ') }) : t('Исходный запрос: одна 3-комнатная для жизни и две 2-комнатные под аренду, левый берег. Этот вариант зафиксирован и не зависит от ваших настроек.')}</p>
        <div className="viewbar-a">
          <Link className="btn pri" to="/start">{st.ov ? t('Изменить ответы в анкете') : t('Пройти анкету и получить свой подбор')}</Link>
          {mine && st.ov && <button className="btn" onClick={share}>{copied ? t('Ссылка скопирована') : t('Поделиться моим подбором')}</button>}
        </div>
      </section>

      {mine && <section className="card ovf" aria-label={t('Фильтры и допущения')}>
        <div className="ovf-h">
          <h2>{t('Тонкая настройка')}</h2>
          {showF && <div className="seg" role="group" aria-label={t('Как применять фильтры')}>
            <button aria-pressed={!ov.per} onClick={() => setOv(o => ({ ...o, per: false }))}>{t('Одни фильтры на все квартиры')}</button>
            <button aria-pressed={ov.per} onClick={() => setOv(o => ({ ...o, per: true }))}>{t('Свои для каждой квартиры')}</button>
          </div>}
          {dirty && <button className="btn sm ghost" onClick={() => st.set({ ov: null })}>{t('Сбросить')}</button>}
          <button className="btn sm" onClick={() => setShowF(v => !v)} aria-expanded={showF}>{showF ? t('Скрыть фильтры') : t('Показать фильтры')}</button>
        </div>
        {showF && <>
        {!ov.per ? <FilterSet cfg={{ ...slotCfg(ov, st, 0) }} set={setCommon} classes={classes} />
          : <>
            <div className="seg slot-tabs" role="tablist">{SLOT_NAMES(units).map((n, i) => <button key={n} role="tab" aria-pressed={slotTab === i} onClick={() => setSlotTab(i)}>{n}</button>)}</div>
            <div className="ovf-cols">{units.map((_, i) => <div key={i} className={`ovf-col ${slotTab === i ? 'on' : ''}`}>
              <div className="ovf-col-h"><h3>{SLOT_NAMES(units)[i]}</h3>{Object.keys(ov.slots[i] || {}).length > 0 && <button className="btn sm ghost" onClick={() => setOv(o => ({ ...o, slots: o.slots.map((x, k) => k === i ? {} : x) }))}>{t('как у всех')}</button>}</div>
              <FilterSet cfg={slotCfg(ov, st, i)} set={p => setSlot(i, p)} classes={classes} own />
            </div>)}</div>
          </>}
        <div className="ovf-b">
          <label className="field">{t('Где должны быть остальные квартиры')}<select value={ov.together} onChange={e => setOv(o => ({ ...o, together: e.target.value }))}>{TOGETHER_OPTS().map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="field">{t('Рост цены жилья, % в год')}<input type="number" step="0.5" value={ov.assume.growth} onChange={e => setAssume({ growth: +e.target.value || 0 })} /></label>
          <label className="field">{t('Рост аренды, % в год')}<input type="number" step="0.5" value={ov.assume.rentGrowth} onChange={e => setAssume({ rentGrowth: +e.target.value || 0 })} /></label>
          <label className="field">{t('Месяцев в году сдаётся')}<input type="number" min="1" max="12" value={ov.assume.occ} onChange={e => setAssume({ occ: +e.target.value || 0 })} /></label>
          <label className="field">{t('Ремонт и мебель сдаваемой квартиры, млн ₸')}<input type="number" step="0.5" value={ov.assume.fit} onChange={e => setAssume({ fit: +e.target.value || 0 })} /><MoneyAlt v={ov.assume.fit * 1e6} /></label>
        </div>
        <p className="muted small">{t('Рост цены и аренды — ваши допущения, а не прогноз. Для ориентира: вторичка в Есильском районе по Индексу Крыши росла в среднем на {a}% в год за 5 лет и на {b}% за 10 лет; официальная ставка аренды в Астане за последний год выросла на 20%. Бюджеты, цена со скидкой и берег задаются в левой панели.', { a: fmtN(cagr(5), 1), b: fmtN(cagr(10), 1) })}</p>
        </>}
      </section>}

      {!best ? <div className="note">{t('Под эти условия не собирается ни одного набора квартир. Ослабьте фильтры, поднимите бюджет или разрешите остальным квартирам быть в соседних ЖК.')}</div> : <>
        <Section title={t('Рекомендация')} sub={t('Лучший вариант из {n} {w} в {k} {s} ЖК, которые проходят фильтры.', { n: fmtN(combos.length), w: tp(combos.length, ['связки', 'связок', 'связок'], ['trojice bytů', 'trojic bytů', 'trojic bytů']), k: fmtN(tops.length), s: tp(tops.length, ['сочетании', 'сочетаниях', 'сочетаниях'], ['kombinaci', 'kombinacích', 'kombinacích']) })}>
          <Scenario card={best} hero onUse={use} units={units} />
        </Section>

        {rest.length > 0 && <Section title={t('Другие сценарии')} sub={t('Каждый отвечает на свой вопрос: что если дешевле, что если важнее аренда, локация или готовность. Один и тот же ЖК дважды не показывается.')}>
          <div className="grid scn-grid">{rest.map(k => <Scenario key={k.id} card={k} onUse={use} base={best.c} units={units} />)}</div>
        </Section>}

        {cards.length > 1 && <Section title={t('Сравнение сценариев')} sub={t('Все цифры рядом, чтобы обсуждать вслух.')}>
          <Compare cards={cards} units={units} />
        </Section>}

        <Section title={t('Все связки')} sub={t('По одной лучшей на каждое сочетание ЖК. Нажмите на строку, чтобы открыть её в подборе.')}
          right={<div className="filters" style={{ margin: 0 }}>
            <button className="chip" aria-pressed={ov.allVariants} onClick={() => setOv(o => ({ ...o, allVariants: !o.allVariants }))}>{t('все варианты набора')}</button>
            <select aria-label={t('Сортировка')} value={ov.sort} onChange={e => setOv(o => ({ ...o, sort: e.target.value }))}>
              <option value="score">{t('по оценке')}</option><option value="total">{t('сначала дешёвые')}</option><option value="yld">{t('по доходности аренды')}</option><option value="roi">{t('по итогу за 10 лет')}</option><option value="loc">{t('по локации')}</option><option value="q">{t('по качеству квартир')}</option><option value="disc">{t('по запасу к вторичке')}</option>
            </select></div>}>
          <div className="tw pin" style={{ maxHeight: 640 }}><table className="alltab">
            <thead><tr><th>{t('Связка')}</th><th className="r">{t('Оценка')}</th><th className="r">{t('Сумма')}</th><th className="r">{t('К бюджету')}</th><th>{t('Жильё')}</th><th className="r">{t('Потолок')}</th><th className="r">{t('Аренда в месяц')}</th><th className="r">{t('Доходность')}</th><th className="r">{t('Итог 10 лет')}</th><th className="r">{t('К вторичке')}</th><th className="r">LRT<small>{t('км')}</small></th><th className="r">{t('Локация')}</th></tr></thead>
            <tbody>{list.map(c => <tr key={c.key} className="click" tabIndex={0} onClick={() => use(c)} onKeyDown={e => { if (e.key === 'Enter') use(c) }}>
              <td><b>{c.title}</b> <Link className="maplink" to={`/map?focus=${[...new Set(c.picks.map(x => x.p.slug))].join(',')}`} onClick={e => e.stopPropagation()}>{t('на карте')}</Link><span className="sub">{clsList(c)}{ov.allVariants ? ' · ' + KIND()[c.kind] : ''}{c.stretch ? ' · ' + t('с доплатой') : ''}</span></td>
              <td className="r num"><span className={`ybar ${c.m.score >= 70 ? 'hi' : c.m.score >= 55 ? 'mid' : ''}`}>{c.m.score}</span></td>
              <td className="r num"><Money v={c.m.total} /></td><td className="r num">{(c.m.over > 0 ? '+' : '') + fmtN(c.m.over, 0) + pctSign()}</td>
              <td>{dlMonth(c.picks[0].a.dl)}<span className="sub">{fmtN(c.picks[0].a.s, 0)}{'\u00a0'}{t('м²')}{c.picks[0].a.lt ? ', ' + t(c.picks[0].a.lt).toLowerCase() : ''}{c.picks[0].a.rep ? ', ' + t('с ремонтом') : ''}</span></td>
              <td className="r num">{h1(c.m.ceilMin)}</td><td className="r num">{c.m.rentKnown && c.m.rentN ? <Money v={c.m.rentMonth} suffix={t('/мес')} /> : '—'}</td><td className="r num">{fmtPct(c.m.yld)}</td>
              <td className="r num">{c.m.roi10 == null ? '—' : '+' + fmtN(c.m.roi10, 0) + pctSign()}</td><td className="r num">{c.m.disc == null ? '—' : (c.m.disc >= 0 ? '−' : '+') + fmtN(Math.abs(c.m.disc), 0) + pctSign()}</td>
              <td className="r num">{fmtN(c.m.loc.lrt, 1)}</td><td className="r num">{c.m.locS}</td></tr>)}</tbody>
          </table></div>
        </Section>

        <Section title={t('Как считается оценка')}>
          <div className="card method"><ul>
            <li>{t('Каждый набор получает баллы по восьми критериям. Вес критерия зависит от того, насколько он важен вам по анкете; сейчас веса такие: {l}.', { l: PARTS(S.W).map(([, l, w]) => `${l.toLowerCase()} ${fmtN(w, 0)}`).join(', ') })}</li>
            <li><b>{t('Срок сдачи жилья.')}</b> {t('Сданный дом даёт максимум; чем позже сдача, тем меньше баллов, через 14 месяцев и дальше — ноль.')}</li>
            <li><b>{t('Локация.')}</b> {t('Расстояние до LRT, парки и Ботанический сад, спорт и Барыс Арена, школы, сады, медицина и магазины рядом, ТРЦ, обжитость района по числу объявлений.')}</li>
            <li><b>{t('Качество квартир.')}</b> {t('Высота потолков, тип планировки, балкон, высота окон и остекление по описанию ЖК, этаж. Квартира для жизни весит вдвое больше квартиры под аренду.')}</li>
            <li><b>{t('Доходность аренды.')}</b> {t('Годовая аренда сдаваемых квартир к их цене с ремонтом и мебелью. Ставка берётся по объявлениям Крыши в самом ЖК, а если их меньше трёх, то в радиусе 800 м. Квартире с ремонтом от застройщика закладывается треть суммы на обустройство.')}</li>
            <li><b>{t('Класс, всё рядом, бюджет, запас к вторичке.')}</b> {t('Запас к вторичке — насколько цена метра у BI ниже цен объявлений о продаже рядом. Крайние этажи, ненадёжная ставка аренды и необжитое окружение (локация ниже 25) снимают баллы.')}</li>
            <li><b>{t('Итог за 10 лет')}</b> {t('— аренда за 10 лет с вашим ростом ставки плюс прирост цены всех квартир, к вложенной сумме. Аренда начинается после сдачи дома, выдачи ключей и ремонта. Налоги, коммунальные платежи и простой сверх заданного не учтены.')}</li>
          </ul></div>
        </Section>
      </>}

      {favs.length > 0 && <Section title={t('Избранные квартиры')} sub={t('Отмеченные звёздочкой на страницах ЖК.')}>
        <div className="card" style={{ gap: 0, paddingTop: 8, paddingBottom: 8 }}>{favs.map(({ p, a }) => <div key={a.id} className="favrow"><FavBtn slug={p.slug} id={a.id} /><AptRow p={p} a={a} thumb /></div>)}</div>
      </Section>}
    </>
  )
}
