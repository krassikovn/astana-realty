import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, BarChart, Bar, LabelList, ReferenceLine } from 'recharts'
import { useData, useStore, fmtN, yieldOf, median, priceOf, MON } from '../lib.js'
import { Section, Stat } from '../ui.jsx'
import { t, roomsLabel, money, moneyParts, conv, getCur, getRates, isCs } from '../i18n.js'
import { Money, MoneyAlt, statMoney } from '../money.jsx'

const COLORS = ['#0f7a63', '#e8590c', '#2563eb', '#a21caf', '#ca8a04', '#475569']
// Единое оформление графиков
const GRID = '#e3e8e6'
const TICK = { fontSize: 12, fill: '#586661' }
const AX = { tick: TICK, axisLine: false, tickLine: false }
const TIP = { contentStyle: { border: '1px solid #dbe1de', borderRadius: 12, boxShadow: '0 12px 36px rgba(16,26,23,.18)', padding: '10px 12px', fontSize: 13 }, labelStyle: { fontWeight: 700, marginBottom: 4, color: '#101a17' }, itemStyle: { padding: 0 }, cursor: { stroke: '#b9c6c1', fill: 'rgba(16,26,23,.04)' } }
const ym = d => { const [y, m] = String(d).split('-'); return m && MON[+m - 1] ? `${MON[+m - 1]} ${y}` : d }
// Данные графиков пересчитаны в выбранную валюту (conv), чтобы деления оси были круглыми. back возвращает значение в тенге для форматирования через money.
const back = x => getCur() === 'KZT' ? x : x * getRates()[getCur()]
const cv = v => v == null ? null : conv(v)
const tick = x => { const p = moneyParts(back(x)); return p.num.replace(/,0+$/, '') + ' ' + p.unit }
const tipMoney = (x, suffix) => money(back(x), { precise: true }) + suffix
const pct = (v, d = 1) => fmtN(v, d) + (isCs() ? ' %' : '%')
export default function Rent() {
  const { projects, priceindex, history, krisha, meta, renthistory } = useData(); const st = useStore()
  const [sort, setSort] = useState(['y', -1]); const [rooms, setRooms] = useState(2); const [ir, setIr] = useState(0)
  const [calc, setCalc] = useState({ fit: 6, occ: 11, g: 7, gr: 5 })
  const rows = useMemo(() => projects.filter(p => !st.leftOnly || p.left).map(p => {
    const y = yieldOf(p, rooms, st.mode), x = p.rs?.rent?.[rooms]
    const ap = p.apts.filter(a => a.r === rooms)
    return { p, n: x?.n ?? 0, med: x?.med ?? null, m2: x?.m2 ?? null, sq: x?.sq ?? null, bi: ap.length ? Math.min(...ap.map(a => priceOf(a, p, st.mode))) : null, biM2: y?.priceM2 ?? null, sec: p.rs?.saleM2 ?? null, y: y?.y ?? null, own: p.rs?.own?.rent?.[rooms]?.med ?? null, ownN: p.rs?.own?.rent?.[rooms]?.n ?? 0 }
  }), [projects, st.leftOnly, st.mode, rooms])
  const sorted = [...rows].sort((a, b) => { const k = sort[0]; const va = k === 'name' ? a.p.name : a[k], vb = k === 'name' ? b.p.name : b[k]; if (va == null) return 1; if (vb == null) return -1; return (va > vb ? 1 : va < vb ? -1 : 0) * sort[1] })
  const th = (k, label, unit, r = true) => <th className={`s ${r ? 'r' : ''}`} aria-sort={sort[0] === k ? (sort[1] > 0 ? 'ascending' : 'descending') : undefined} tabIndex={0} onClick={() => setSort(s => [k, s[0] === k ? -s[1] : -1])} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSort(s => [k, s[0] === k ? -s[1] : -1]) } }}>{label}<span className="arr">{sort[0] === k ? (sort[1] > 0 ? '↑' : '↓') : ''}</span>{unit && <small>{unit}</small>}</th>
  const ymax = Math.max(0, ...rows.map(r => r.y ?? 0))
  const idx = priceindex[ir] || {}
  const series = Object.keys(idx)
  const chart = useMemo(() => { const m = {}; for (const s of series) for (const [d, v] of idx[s]) (m[d] ||= { d })[s] = cv(v); return Object.values(m).sort((a, b) => a.d.localeCompare(b.d)) }, [idx, st.cur])
  const growth = series.map(s => { const a = idx[s]; if (a.length < 13) return null; const last = a[a.length - 1], y1 = a[a.length - 13], first = a[0]; const yrs = (new Date(last[0]) - new Date(first[0])) / 31557600000; return { s, yoy: (last[1] / y1[1] - 1) * 100, cagr: (Math.pow(last[1] / first[1], 1 / yrs) - 1) * 100, from: first[0], last: last[1] } }).filter(Boolean)
  const top = sorted.filter(r => r.y != null).slice(0, 14).map(r => ({ name: r.p.name, y: +r.y.toFixed(1) }))
  const cityRent = median(krisha.rent.filter(a => a.r === rooms).map(a => a.p))
  const histRows = history.length > 1
  // Официальный ряд Бюро нацстатистики и медианы из обзоров Крыши (public/data/renthistory.json)
  const off = renthistory?.official_m2 || []
  const offChart = off.map(x => ({ d: x.month, a: cv(x.value), k: cv(x.kazakhstan_value) }))
  const offLast = off[off.length - 1], offBase = off.find(x => x.month === '2024-01')
  const yoyOf = scope => (renthistory?.yoy || []).filter(x => x.scope === scope).pop()
  const yA = yoyOf('Astana'), yK = yoyOf('Kazakhstan')
  const kr = useMemo(() => { const m = {}; for (const x of renthistory?.krisha_asking || []) (m[x.month] ||= { d: x.month })['r' + x.rooms] = cv(x.value); return Object.values(m).sort((a, b) => a.d.localeCompare(b.d)) }, [renthistory, st.cur])
  const mLabel = d => { const [y, m] = String(d).split('-'); return `${MON[+m - 1]} ${y}` }
  const kzt = st.cur === 'KZT'
  const sel = sorted.find(r => r.y != null)
  const [cs, setCs] = useState('')
  const cp = rows.find(r => r.p.slug === cs) || sel
  let cres = null
  if (cp?.med && cp?.bi) { const year = cp.med * calc.occ, inv = cp.bi + calc.fit * 1e6; let total = 0; for (let i = 0; i < 10; i++) total += year * Math.pow(1 + calc.gr / 100, i); cres = { year, y: year / inv * 100, pay: inv / year, total, val: cp.bi * Math.pow(1 + calc.g / 100, 10) } }
  return (
    <>
      <div className="page-h"><div><h1>{t('Аренда и доходность')}</h1><p className="muted">{t('Ставки считаются по объявлениям Крыши о долгосрочной аренде в радиусе 800 м от каждого ЖК. Столбец «В самом ЖК» берёт только объявления из домов в 200 м от точки ЖК, по привязке Крыши к жилому комплексу. Доходность нормирована на метр: аренда за м² в год к цене м² в этом ЖК у BI.')}</p></div>
        <div className="seg">{[1, 2, 3].map(r => <button key={r} aria-pressed={rooms === r} onClick={() => setRooms(r)}>{roomsLabel(r)}</button>)}</div></div>
      <div className="stats">
        <Stat label={t('Объявлений аренды собрано')} value={fmtN(krisha.rent.length)} hint={t('продажа: {n}', { n: fmtN(krisha.sale.length) })} />
        <Stat label={t('Медиана аренды {n}-комн. по собранным', { n: rooms })} {...statMoney(cityRent, t('/мес'))} />
        <Stat label={t('Медианная доходность по ЖК')} value={fmtN(median(rows.map(r => r.y).filter(v => v != null)), 1)} unit={t('% в год')} hint={t('до расходов и налогов')} />
        <Stat label={t('ЖК с арендой в самом доме')} value={projects.filter(p => p.rs?.own?.rentN > 0).length} hint={t('из {n}, по привязке объявлений к комплексу', { n: projects.length })} />
      </div>

      <Section title={t('По каждому ЖК')} sub={t('Нажмите на заголовок столбца, чтобы отсортировать.')}>
        <div className="tw pin" style={{ maxHeight: 600 }}><table>
          <thead><tr>{th('name', t('ЖК'), null, false)}{th('n', t('Объявлений'), t('рядом'))}{th('med', t('Аренда'), t('в месяц'))}{th('own', t('В самом ЖК'), t('в месяц'))}{th('m2', t('Аренда'), t('за м² в месяц'))}{th('bi', t('Цена BI от'))}{th('biM2', t('Цена BI'), t('за м²'))}{th('sec', t('Вторичка рядом'), t('за м²'))}{th('y', t('Доходность'), t('% в год'))}</tr></thead>
          <tbody>{sorted.map(r => <tr key={r.p.slug}><td><Link to={`/p/${r.p.slug}`}><b>{r.p.name}</b></Link><span className="sub">{t(r.p.cls)}</span></td><td className="r num">{r.n || '—'}</td><td className="r num"><Money v={r.med} /></td><td className="r num">{r.own ? <><Money v={r.own} /><span className="sub">{t('{n} объявл.', { n: r.ownN })}</span></> : '—'}</td><td className="r num"><Money v={r.m2} /></td><td className="r num"><Money v={r.bi} /></td><td className="r num"><Money v={r.biM2} /></td><td className="r num"><Money v={r.sec} /></td><td className="r num">{r.y == null ? '—' : <span className={`ybar ${r.y >= ymax * .8 ? 'hi' : r.y >= ymax * .6 ? 'mid' : ''}`}>{fmtN(r.y, 1)}</span>}</td></tr>)}</tbody>
        </table></div>
        <p className="muted small" style={{ marginTop: 10 }}>{t('Если объявлений меньше пяти, медиана ненадёжна. В новых районах объявлений мало, потому что дома ещё не сданы.')}</p>
      </Section>

      {top.length > 0 && <Section title={t('Где {n}-комнатная окупается быстрее', { n: rooms })}>
        <div className="card chart" style={{ height: top.length * 30 + 56 }}><ResponsiveContainer><BarChart data={top} layout="vertical" barCategoryGap={7} margin={{ left: 0, right: 48, top: 0, bottom: 0 }}><CartesianGrid horizontal={false} stroke={GRID} /><XAxis type="number" unit="%" {...AX} domain={[0, 'auto']} /><YAxis type="category" dataKey="name" width={132} interval={0} {...AX} tick={{ ...TICK, fill: '#101a17' }} /><Tooltip {...TIP} formatter={v => [t('{v}% в год', { v: fmtN(v, 1) }), t('Доходность')]} /><Bar dataKey="y" fill="#0f7a63" radius={[0, 5, 5, 0]} maxBarSize={20} isAnimationActive={false}><LabelList dataKey="y" position="right" formatter={v => pct(v)} /></Bar></BarChart></ResponsiveContainer></div>
      </Section>}

      <Section title={t('Цена метра по районам Астаны')} sub={t('Индекс Крыши: средняя цена предложения на вторичном рынке за м², по месяцам.')} right={<div className="seg">{[[0, t('все')], [1, t('1-к')], [2, t('2-к')], [3, t('3-к')]].map(([r, l]) => <button key={r} aria-pressed={ir === r} onClick={() => setIr(r)}>{l}</button>)}</div>}>
        {chart.length ? <>
          <div className="card chart" style={{ height: 380 }}><ResponsiveContainer><LineChart data={chart} margin={{ left: 0, right: 12, top: 4, bottom: 0 }}><CartesianGrid stroke={GRID} vertical={false} /><XAxis dataKey="d" {...AX} tickFormatter={d => String(d).slice(0, 4)} minTickGap={48} tickMargin={8} /><YAxis {...AX} tickFormatter={tick} domain={['auto', 'auto']} width={78} /><Tooltip {...TIP} labelFormatter={ym} formatter={(v, n) => [tipMoney(v, t('/м²')), n]} /><Legend verticalAlign="top" align="left" height={36} iconType="circle" iconSize={9} />{series.map((s, i) => <Line key={s} dataKey={s} name={t(s)} stroke={COLORS[i % COLORS.length]} dot={false} activeDot={{ r: 4 }} strokeWidth={2.25} connectNulls isAnimationActive={false} />)}</LineChart></ResponsiveContainer></div>
          <div className="stats" style={{ marginTop: 16 }}>{growth.map(g => <Stat key={g.s} label={t(g.s)} value={(g.yoy >= 0 ? '+' : '') + fmtN(g.yoy, 1)} unit={t('% за год')} hint={t('в среднем {c}% в год с {from} · сейчас {p}/м²', { c: fmtN(g.cagr, 1), from: ym(g.from), p: money(g.last) })} />)}</div>
        </> : <div className="note">{t('Индекс цен не загрузился. Запустите')} <code>npm run fetch:krisha</code>.</div>}
      </Section>

      {off.length > 0 && <Section title={t('Аренда в Астане за три года')} sub={t('Официальный ряд Бюро национальной статистики: арендная плата за благоустроенное жильё за м² в месяц. Цены регистрируют 20-го числа по постоянной выборке 1-3-комнатных квартир.')}>
        <div className="stats">
          <Stat label={t('Астана, {m}', { m: mLabel(offLast.month) })} {...statMoney(offLast.value, t('/м² в мес'))} hint={t('по стране {v}', { v: money(offLast.kazakhstan_value) })} />
          {yA && <Stat label={t('Рост за год, Астана')} value={(yA.value_pct >= 0 ? '+' : '') + fmtN(yA.value_pct, 1)} unit="%" hint={yK ? t('по стране {v}', { v: (yK.value_pct >= 0 ? '+' : '') + pct(yK.value_pct) }) : ''} />}
          {offBase && <Stat label={t('Рост с января 2024')} value={'+' + fmtN((offLast.value / offBase.value - 1) * 100, 0)} unit="%" hint={t('с {a} до {b} за м²', { a: money(offBase.value), b: money(offLast.value) })} />}
          <Stat label={t('Двушка 55 м² по этой ставке')} {...statMoney(offLast.value * 55, t('/мес'))} hint={t('для сравнения с объявлениями')} />
        </div>
        <div className="card chart" style={{ height: 340, marginTop: 16 }}><ResponsiveContainer><LineChart data={offChart} margin={{ left: 0, right: 12, top: 26, bottom: 0 }}><CartesianGrid stroke={GRID} vertical={false} /><XAxis dataKey="d" {...AX} tickFormatter={mLabel} tickMargin={8} minTickGap={48} /><YAxis {...AX} tickFormatter={tick} width={78} domain={kzt ? [3500, 'auto'] : ['auto', 'auto']} /><Tooltip {...TIP} labelFormatter={mLabel} formatter={(v, n) => [tipMoney(v, t('/м² в мес')), n]} /><Legend /><ReferenceLine x="2024-01" stroke="#9aa5a1" strokeDasharray="4 4" label={{ value: t('смена выборки'), position: 'top', fontSize: 12, fill: '#5f6b67' }} /><Line name={t('Астана')} dataKey="a" stroke="#0f7a63" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} isAnimationActive={false} /><Line name={t('Казахстан')} dataKey="k" stroke="#9aa5a1" strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>
        <p className="muted small" style={{ marginTop: 8 }}>{t('В январе 2024 года уровень упал с {a} до {b} за м² из-за ежегодной смены выборки, а не из-за цен: официальный индекс за этот месяц равен 100. Сравнивать уровни корректно начиная с января 2024. Источник:', { a: money(4815), b: money(4140) })} <a href="https://stat.gov.kz/ru/industries/economy/prices/spreadsheets/?name=19521&year=2026" target="_blank" rel="noreferrer">{t('бюллетени «Индексы цен и цены на рынке жилья»')} ↗</a>{t(', ссылка на файл каждого месяца лежит в')} <code>public/data/renthistory.json</code>.</p>
        {kr.length > 0 && <>
          <h3 style={{ margin: '24px 0 10px' }}>{t('Запрашиваемая аренда по обзорам Крыши')}</h3>
          <div className="card chart" style={{ height: 300 }}><ResponsiveContainer><LineChart data={kr} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}><CartesianGrid stroke={GRID} vertical={false} /><XAxis dataKey="d" {...AX} tickFormatter={mLabel} tickMargin={8} minTickGap={32} /><YAxis {...AX} tickFormatter={tick} width={78} domain={kzt ? [100000, 'auto'] : ['auto', 'auto']} /><Tooltip {...TIP} labelFormatter={mLabel} formatter={(v, n) => [tipMoney(v, t('/мес')), n]} /><Legend />{[[1, '#2563eb'], [2, '#0f7a63'], [3, '#e8590c']].map(([r, c]) => <Line key={r} name={roomsLabel(r)} dataKey={'r' + r} stroke={c} strokeWidth={r === rooms ? 2.75 : 1.5} dot={{ r: 3 }} connectNulls isAnimationActive={false} />)}</LineChart></ResponsiveContainer></div>
          <p className="muted small" style={{ marginTop: 8 }}>{t('Медиана цен в объявлениях по Астане, округлённая Крышей до 10 тыс ₸. Обзоры выходят нерегулярно: точек {n}, между сентябрём 2024 и октябрём 2025 их нет, линия там просто соединяет соседние точки.', { n: kr.length })}</p>
        </>}
      </Section>}

      <Section title={t('Своя история по ЖК')} sub={t('Архива ставок по отдельным домам нет ни у Крыши, ни у статистики, поэтому сайт копит его сам: каждый запуск npm run fetch:krisha добавляет снимок.')}>
        {histRows ? <div className="card chart" style={{ height: 300 }}><ResponsiveContainer><LineChart data={history.map(h => ({ d: h.date, v: cv(median(Object.values(h.rent).map(x => x[rooms]?.[0]).filter(Boolean))) }))} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}><CartesianGrid stroke={GRID} vertical={false} /><XAxis dataKey="d" {...AX} tickMargin={8} minTickGap={32} /><YAxis {...AX} tickFormatter={tick} width={78} domain={['auto', 'auto']} /><Tooltip {...TIP} formatter={v => [tipMoney(v, t('/мес')), t('Медиана {n}-комн. по ЖК', { n: rooms })]} /><Line dataKey="v" stroke="#0f7a63" strokeWidth={2.25} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>
          : <div className="info">{t('Пока один снимок ({d}). Запускайте', { d: history[0]?.date || '—' })} <code>npm run fetch:krisha</code> {t('раз в месяц, и здесь появится динамика по каждому ЖК.')}</div>}
      </Section>

      <Section title={t('Калькулятор на 10 лет')} sub={t('Арифметика с вашими допущениями, не прогноз.')}>
        <div className="fields">
          <label className="field" htmlFor="ccs">{t('ЖК')}<select id="ccs" value={cp?.p.slug || ''} onChange={e => setCs(e.target.value)}>{rows.filter(r => r.med && r.bi).map(r => <option key={r.p.slug} value={r.p.slug}>{r.p.name}</option>)}</select></label>
          {[['fit', t('Ремонт и мебель, млн ₸'), 0.5], ['occ', t('Месяцев в году сдаётся'), 1], ['gr', t('Рост аренды, % в год'), 1], ['g', t('Рост цены жилья, % в год'), 1]].map(([k, l, s]) => <label key={k} className="field" htmlFor={'c' + k}>{l}<input id={'c' + k} type="number" step={s} value={calc[k]} onChange={e => setCalc(c => ({ ...c, [k]: +e.target.value || 0 }))} />{k === 'fit' && <MoneyAlt v={calc.fit * 1e6} />}</label>)}
        </div>
        {cres ? <div className="stats">
          <Stat label={t('{n}-комн. в {name} от', { n: rooms, name: cp.p.name })} {...statMoney(cp.bi)} /><Stat label={t('Аренда в первый год')} {...statMoney(cres.year)} /><Stat label={t('Доходность с учётом ремонта')} value={fmtN(cres.y, 1)} unit={t('% в год')} />
          <Stat label={t('Окупаемость арендой')} value={fmtN(cres.pay, 1)} unit={t('лет')} hint={t('без роста ставки')} /><Stat label={t('Аренда за 10 лет')} {...statMoney(cres.total)} /><Stat label={t('Цена квартиры через 10 лет')} {...statMoney(cres.val)} />
        </div> : <div className="note">{t('Для расчёта нужен ЖК, рядом с которым есть объявления аренды.')}</div>}
      </Section>
    </>
  )
}
