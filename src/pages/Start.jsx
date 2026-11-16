// Анкета: один вопрос на экран. Ответы превращаются в настройки движка подбора (src/profile.js → src/scenarios.js).
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData, useStore } from '../lib.js'
import { t, tp, roomsLabel, moneyAlt } from '../i18n.js'
import { Money, LangSwitch, CurSwitch } from '../money.jsx'
import { ANSWERS_DEFAULT, answersToStore, splitBudget } from '../profile.js'
import { buildScenarios, unitLabel } from '../scenarios.js'

const I = ({ d, fill }) => <svg className="q-ico" viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
const ICO = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', key: 'M14.5 9.5a4 4 0 1 0-3.9 4.9L9 16H7v2H5v2H2v-3l6.6-6.6A4 4 0 0 0 14.5 9.5zM16 8h.01',
  coins: 'M9 14a6 3 0 1 0 12 0 6 3 0 1 0-12 0M9 14v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4M3 6a6 3 0 1 0 12 0A6 3 0 1 0 3 6M3 6v10c0 1.3 1.6 2.4 4 2.8M3 11c0 1.3 1.6 2.4 4 2.8',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.200 9.5l6.1-.9z', clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2', ruler: 'M4 20V4M4 4l-2 2M4 4l2 2M4 20l-2-2M4 20l2-2M10 6h10M10 12h10M10 18h10',
  brush: 'M9 11l8-8 4 4-8 8M9 11l4 4M9 11c-3 0-5 2-5 5 0 2-1 3-2 3 2 2 9 2 11-4', balcony: 'M4 21V11M20 21V11M4 15h16M9 15v6M15 15v6M7 11V5h10v6', floors: 'M4 21V7l8-4 8 4v14M4 12h16M4 17h16M9 21v-4M15 21v-4',
  kk: 'M3 20V6h18v14M3 13h18M12 6v14M6 16h3', window: 'M5 3h14v18H5zM12 3v18M5 12h14', pin: 'M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.800 7 12 7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  blocks: 'M3 21V9h7v12M14 21V3h7v18M6 13h1M6 17h1M17 7h1M17 11h1M17 15h1', split: 'M6 3v6a6 6 0 0 0 6 6h6M18 15l-3-3M18 15l-3 3M6 21v-4', river: 'M2 8c3-3 5 3 8 0s5 3 8 0 3-1 4 0M2 14c3-3 5 3 8 0s5 3 8 0 3-1 4 0M2 20c3-3 5 3 8 0s5 3 8 0 3-1 4 0', city: 'M3 21h18M5 21V8l5-3v16M14 21V11l5 2v8M8 10v1M8 14v1M17 15v1',
  train: 'M7 3h10a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2zM5 10h14M9 14h.01M15 14h.01M8 17l-2 4M16 17l2 4', tree: 'M12 22v-7M12 15c-4 0-6-2.500-6-5a4 4 0 0 1 2.500-3.700A4 4 0 0 1 12 2a4 4 0 0 1 3.500 4.300A4 4 0 0 1 18 10c0 2.500-2 5-6 5z',
  sport: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.500 9h17M3.500 15h17M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18', school: 'M2 9l10-5 10 5-10 5zM6 11.500V17c2 1.500 4 2 6 2s4-.500 6-2v-5.500M22 9v6', bag: 'M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2',
  chart: 'M4 19V5M4 19h16M8 15l3-4 3 2 5-7', gem: 'M6 3h12l4 6-10 12L2 9zM2 9h20M9 3l-3 6 6 12 6-12-3-6', tag: 'M3 12V4h8l10 10-8 8zM7.500 8.500h.01', percent: 'M19 5L5 19M7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6', check: 'M5 12l5 5 9-10',
}
const clean = d => d.replace(/(\d)\.(\d)00/g, '$1.$2')

function Card({ on, onClick, icon, title, sub, multi }) {
  return (
    <button type="button" className={`q-card ${on ? 'on' : ''}`} aria-pressed={on} onClick={onClick}>
      {icon && <I d={clean(ICO[icon])} />}
      <span className="q-card-t">{title}</span>
      {sub && <span className="q-card-s">{sub}</span>}
      <span className={`q-mark ${multi ? 'sq' : ''}`}>{on && <I d={ICO.check} />}</span>
    </button>
  )
}

export default function Start() {
  const data = useData(); const st = useStore(); const nav = useNavigate()
  const [a, setA] = useState(() => ({ ...ANSWERS_DEFAULT, ...(st.answers || {}), name: st.answers?.name ?? st.name ?? '' }))
  const [step, setStep] = useState(0)
  const set = patch => setA(s => ({ ...s, ...patch }))
  const buds = a.buds && a.buds.length === a.units.length ? a.buds : splitBudget(a.units, a.total)
  const hasLive = a.units.some(u => u.role === 'live'), hasRent = a.units.some(u => u.role === 'rent')
  const tog = (k, v) => set({ [k]: a[k].includes(v) ? a[k].filter(x => x !== v) : [...a[k], v] })
  const setCount = n => { const units = Array.from({ length: n }, (_, i) => a.units[i] || { role: i === 0 && !a.units.some(u => u.role === 'live') ? 'live' : 'rent', rooms: 2 }); set({ units, buds: null, total: Math.round(a.total / a.units.length * n / 5) * 5 }) }
  const setUnit = (i, patch) => set({ units: a.units.map((u, k) => k === i ? { ...u, ...patch } : u), buds: null })
  const cfg = useMemo(() => answersToStore({ ...a, buds }), [a])
  // живой счётчик: сколько наборов проходит под текущие ответы
  const found = useMemo(() => { try { const S = buildScenarios(data, { ...st, ...cfg }, cfg.ov); return { n: S.tops.length, best: S.cards[0]?.c } } catch { return { n: 0 } } }, [data, cfg, st.mode, st.lang, st.cur])

  const CLS = [['any', 'star', t('Любой'), t('смотрим всё, от «Комфорт lite» до «Премиум»')], ['comfort', 'star', t('Комфорт и выше'), t('без самых простых домов')], ['comfortPlus', 'star', t('Комфорт+ и выше'), t('улучшенные дворы и холлы')], ['biz', 'gem', t('Бизнес и выше'), t('высокие потолки, закрытые дворы, меньше квартир на этаже')], ['prem', 'gem', t('Бизнес+ и Премиум'), t('только верхний сегмент')]]
  const IMP = [['ready', 'clock', t('Быстрее заехать'), t('дом сдан или сдаётся скоро')], ['ppm', 'ruler', t('Цена за метр'), t('меньше тенге за квадратный метр')], ['loc', 'pin', t('Обжитое место'), t('LRT, парки, школы, магазины рядом')], ['quality', 'ruler', t('Сами квартиры'), t('потолки, планировка, окна, балкон')], ['yld', 'chart', t('Доход от аренды'), t('сколько приносят сдаваемые квартиры')], ['cls', 'gem', t('Класс дома'), t('чем выше класс, тем лучше')], ['together', 'blocks', t('Всё в одном месте'), t('один ЖК или соседние дома')], ['budget', 'coins', t('Уложиться в бюджет'), t('без доплат сверх лимита')], ['disc', 'tag', t('Купить дешевле рынка'), t('цена BI ниже вторички рядом')]]
  const LV = [t('не важно'), t('обычно'), t('важно'), t('очень важно')]

  const steps = [
    { id: 'hello', icon: 'user', q: t('Подберём квартиры под вас'), hint: t('Десяток коротких вопросов. Сайт сам переберёт все свободные квартиры BI Group в Астане и покажет лучшие наборы именно под ваши ответы. Ответы хранятся только в этом браузере.'), body: (
      <div className="q-stack">
        <label className="q-label">{t('Как подписать ваш подбор?')}<input className="q-input" autoFocus value={a.name} maxLength={24} placeholder={t('Например, имя')} onChange={e => set({ name: e.target.value })} /></label>
        <div className="q-loc"><LangSwitch value={st.lang} onChange={lang => st.set({ lang })} /><CurSwitch value={st.cur} onChange={cur => st.set({ cur })} /></div>
      </div>) },
    { id: 'count', icon: 'blocks', q: t('Сколько квартир покупаем?'), body: <div className="q-grid c4">{[1, 2, 3, 4].map(n => <Card key={n} on={a.units.length === n} onClick={() => setCount(n)} icon="home" title={String(n)} sub={tp(n, ['квартира', 'квартиры', 'квартиры'], ['byt', 'byty', 'byty'])} />)}</div> },
    { id: 'units', icon: 'key', q: t('Для чего каждая и сколько в ней комнат?'), hint: t('Квартира «для жизни» должна быть готова раньше и оценивается строже. Квартиры «под аренду» подбираются по доходности.'), body: (
      <div className="q-units">{a.units.map((u, i) => <div className="q-unit" key={i}>
        <span className="q-unit-n">{i + 1}</span>
        <div className="seg">{[['live', t('Жить')], ['rent', t('Сдавать')]].map(([r, l]) => <button key={r} type="button" aria-pressed={u.role === r} onClick={() => setUnit(i, { role: r })}>{l}</button>)}</div>
        <div className="chips">{[1, 2, 3, 4].map(r => <button key={r} type="button" className="chip" aria-pressed={u.rooms === r} onClick={() => setUnit(i, { rooms: r })}>{roomsLabel(r)}</button>)}</div>
      </div>)}</div>) },
    { id: 'area', icon: 'ruler', q: t('Какая минимальная площадь?'), hint: t('Главное при покупке — метры. Задайте нижнюю границу по каждому типу квартир; меньше неё варианты не предлагаем.'), body: (
      <div className="q-units">{[...new Set(a.units.map(u => u.rooms))].sort((x, y) => x - y).map(r => <div className="q-unit" key={r}>
        <b className="q-unit-lbl">{roomsLabel(r)}</b>
        <div className="chips">{[[0, t('любая')], [50, '50'], [60, '60'], [72, '72'], [80, '80'], [90, '90'], [110, '110']].map(([v, l]) => <button key={v} type="button" className="chip" aria-pressed={(a.smin[r] || 0) === v} onClick={() => set({ smin: { ...a.smin, [r]: v } })}>{l}{v ? ' ' + t('м²') : ''}</button>)}</div>
        <span className="q-in sm"><input type="number" min="0" max="300" value={a.smin[r] || ''} placeholder={t('от, м²')} onChange={e => set({ smin: { ...a.smin, [r]: +e.target.value || 0 } })} /><em>{t('м²')}</em></span>
      </div>)}</div>) },
    { id: 'budget', icon: 'coins', q: t('Какой общий бюджет?'), hint: t('Двигайте ползунок. Сумма делится между квартирами по числу комнат, доли можно поправить вручную.'), body: (
      <div className="q-stack">
        <div className="q-big"><Money v={a.total * 1e6} sub /></div>
        <input className="q-range" type="range" min={20 * a.units.length} max={130 * a.units.length} step="5" value={a.total} onChange={e => set({ total: +e.target.value, buds: null })} aria-label={t('Общий бюджет')} />
        <div className="q-buds">{a.units.map((u, i) => <label key={i} className="q-label sm">{unitLabel(u)}<span className="q-in"><input type="number" min="10" max="400" value={buds[i]} onChange={e => { const b = [...buds]; b[i] = +e.target.value || 0; set({ buds: b, total: b.reduce((s, x) => s + x, 0) }) }} /><em>{t('млн ₸')}</em></span><small>{moneyAlt(buds[i] * 1e6)}</small></label>)}</div>
        <div><div className="q-sub">{t('Насколько можно выйти за бюджет, если вариант того стоит?')}</div><div className="chips">{[[0, t('нельзя')], [5, '+5%'], [10, '+10%'], [15, '+15%']].map(([v, l]) => <button key={v} type="button" className="chip" aria-pressed={a.flex === v} onClick={() => set({ flex: v })}>{l}</button>)}</div></div>
      </div>) },
    { id: 'cls', icon: 'gem', q: t('Какой уровень жилья нужен?'), body: (
      <div className="q-stack">
        {a.units.length > 1 && <div className="seg">{[['all', t('Одинаковый для всех квартир')], ['per', t('Свой для каждой')]].map(([v, l]) => <button key={v} type="button" aria-pressed={a.clsMode === v} onClick={() => set({ clsMode: v })}>{l}</button>)}</div>}
        {a.clsMode === 'all' || a.units.length === 1 ? <div className="q-grid c1">{CLS.map(([v, ic, ti, su]) => <Card key={v} on={a.cls === v} onClick={() => set({ cls: v })} icon={ic} title={ti} sub={su} />)}</div>
          : <div className="q-units">{a.units.map((u, i) => <div className="q-unit col" key={i}><b>{i + 1}. {unitLabel(u)}</b><div className="chips">{CLS.map(([v, , ti]) => <button key={v} type="button" className="chip" aria-pressed={(a.clsPer[i] || 'any') === v} onClick={() => { const c = [...a.clsPer]; c[i] = v; set({ clsPer: c }) }}>{ti}</button>)}</div></div>)}</div>}
      </div>) },
    hasLive && { id: 'ready', icon: 'clock', q: t('Когда нужно заехать?'), hint: t('Вопрос только про квартиру для жизни. Квартиры под аренду могут достраиваться.'), body: <div className="q-grid c2">{[['ready', 'key', t('Сейчас'), t('только сданные дома')], ['h1', 'clock', t('До лета 2027'), t('сдача до июля 2027')], ['y27', 'clock', t('До конца 2027'), t('готовы подождать год')], ['any', 'floors', t('Неважно'), t('подойдёт и долгая стройка')]].map(([v, ic, ti, su]) => <Card key={v} on={a.ready === v} onClick={() => set({ ready: v })} icon={ic} title={ti} sub={su} />)}</div> },
    { id: 'ceil', icon: 'ruler', q: t('Какие потолки?'), body: <div className="q-grid c4 ceil">{[[0, t('Любые'), 34], [2.7, t('от 2,7 м'), 44], [3, t('от 3 м'), 56], [3.3, t('от 3,3 м'), 68]].map(([v, l, h]) => <button key={v} type="button" className={`q-card ${a.ceil === v ? 'on' : ''}`} aria-pressed={a.ceil === v} onClick={() => set({ ceil: v })}><span className="q-room" style={{ height: h }}><i /></span><span className="q-card-t">{l}</span><span className="q-mark">{a.ceil === v && <I d={ICO.check} />}</span></button>)}</div> },
    { id: 'extras', icon: 'brush', q: t('Что ещё обязательно?'), hint: t('Можно выбрать несколько или ничего. Каждое условие сужает выбор.'), body: <div className="q-grid c2">{[['rep', 'brush', t('С ремонтом от застройщика'), t('заехать или сдать без отделочных работ')], ['balc', 'balcony', t('Балкон'), t('в каждой квартире')], ['noEdge', 'floors', t('Не первый и не последний этаж'), null], ['noEuro', 'kk', t('Отдельная кухня'), t('без евро-планировок с кухней-гостиной')], ['pano', 'window', t('Высокие или панорамные окна'), t('по описанию ЖК')]].map(([v, ic, ti, su]) => <Card key={v} multi on={a.extras.includes(v)} onClick={() => tog('extras', v)} icon={ic} title={ti} sub={su} />)}</div> },
    a.units.length > 1 && { id: 'together', icon: 'split', q: t('Насколько близко друг к другу?'), body: <div className="q-grid c2">{[['project', 'home', t('В одном ЖК'), t('проще управлять и присматривать')], ['bigville', 'blocks', t('В одном бигвилле'), t('соседние дома одного квартала')], ['near', 'pin', t('Рядом, до 1,5 км'), t('пешком друг от друга')], ['any', 'city', t('Неважно'), t('каждая там, где выгоднее')]].map(([v, ic, ti, su]) => <Card key={v} on={a.together === v} onClick={() => set({ together: v })} icon={ic} title={ti} sub={su} />)}</div> },
    { id: 'bank', icon: 'river', q: t('Какой берег Есиля?'), body: <div className="q-grid c2">{[['left', 'river', t('Только левый'), t('новый центр, Байтерек, EXPO, LRT')], ['any', 'city', t('Весь город'), t('включая правый берег')]].map(([v, ic, ti, su]) => <Card key={v} on={a.bank === v} onClick={() => set({ bank: v })} icon={ic} title={ti} sub={su} />)}</div> },
    { id: 'imp', icon: 'percent', q: t('Что для вас важнее?'), hint: t('От этого зависит, какие варианты окажутся наверху. Оцените каждый пункт.'), body: (
      <div className="q-imp">{IMP.filter(([k]) => (k !== 'yld' || hasRent) && (k !== 'together' || a.units.length > 1)).map(([k, ic, ti, su]) => <div className="q-imp-r" key={k}>
        <I d={clean(ICO[ic])} /><div><b>{ti}</b><small>{su}</small></div>
        <div className="q-lv" role="group" aria-label={ti}>{LV.map((l, v) => <button key={v} type="button" aria-pressed={(a.imp[k] ?? 1) === v} title={l} onClick={() => set({ imp: { ...a.imp, [k]: v } })}><i style={{ height: 6 + v * 5 }} /><span>{l}</span></button>)}</div>
      </div>)}</div>) },
    { id: 'near', icon: 'pin', q: t('Что должно быть рядом с домом?'), hint: t('Выберите главное. Остальное тоже учитывается, но слабее.'), body: <div className="q-grid c2">{[['lrt', 'train', 'LRT', t('станция в пешей доступности')], ['green', 'tree', t('Парки и зелень'), t('парки, набережная, Ботанический сад')], ['sport', 'sport', t('Спорт'), t('залы, ледовые арены, бассейны')], ['daily', 'school', t('Школы, сады, магазины'), t('повседневная инфраструктура, медицина')], ['mall', 'bag', t('ТРЦ'), t('крупные торговые центры')]].map(([v, ic, ti, su]) => <Card key={v} multi on={a.near.includes(v)} onClick={() => tog('near', v)} icon={ic} title={ti} sub={su} />)}</div> },
    { id: 'done', icon: 'check', q: found.n ? t('Готово: подобрано {n} {w}', { n: found.n, w: tp(found.n, ['набор', 'набора', 'наборов'], ['sestava', 'sestavy', 'sestav']) }) : t('Под такие условия ничего не нашлось'), hint: found.n ? t('Лучший вариант и альтернативы уже ждут в обзоре. Ответы можно поменять в любой момент.') : t('Вернитесь назад и ослабьте условия: поднимите бюджет, разрешите выход за лимит или снимите обязательные пункты.'), body: (
      <div className="q-stack">
        <ul className="q-sum">
          <li><b>{t('Состав')}</b>{a.units.map((u, i) => `${unitLabel(u)} (${buds[i]} ${t('млн ₸')})`).join(', ')}</li>
          <li><b>{t('Бюджет')}</b><span><Money v={a.total * 1e6} />{a.flex ? ` · ${t('можно выйти на {n}%', { n: a.flex })}` : ''}</span></li>
          {found.best && <li><b>{t('Лучший вариант')}</b><span>{found.best.title} · <Money v={found.best.m.total} /> · {t('оценка {n} из 100', { n: found.best.m.score })}</span></li>}
        </ul>
      </div>) },
  ].filter(Boolean)
  const cur = steps[Math.min(step, steps.length - 1)], last = step >= steps.length - 1
  const finish = () => { st.set(cfg); nav('/') }
  const next = () => last ? (found.n ? finish() : setStep(0)) : setStep(s => s + 1)
  useEffect(() => { const h = e => { if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'BUTTON') { e.preventDefault(); next() } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) })
  return (
    <div className="quiz">
      <div className="q-top">
        <button type="button" className="q-x" onClick={() => nav('/')}>{t('Закрыть')}</button>
        <div className="q-bar" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={steps.length}><i style={{ width: `${(step + 1) / steps.length * 100}%` }} /></div>
        <span className="q-n num">{step + 1} / {steps.length}</span>
      </div>
      <main className="q-main" key={cur.id}>
        <div className="q-head"><span className="q-badge"><I d={clean(ICO[cur.icon])} /></span><h1>{cur.q}</h1>{cur.hint && <p>{cur.hint}</p>}</div>
        {cur.body}
      </main>
      <div className="q-foot">
        <span className={`q-found ${found.n ? '' : 'zero'}`}>{found.n ? t('Подходит наборов: {n}', { n: found.n }) : t('Под эти ответы пока ничего не подходит')}</span>
        <div className="q-nav">
          {step > 0 && <button type="button" className="btn" onClick={() => setStep(s => s - 1)}>{t('Назад')}</button>}
          <button type="button" className="btn pri q-next" onClick={next}>{last ? (found.n ? t('Показать мой подбор') : t('Изменить ответы')) : t('Дальше')}<kbd>Enter ↵</kbd></button>
        </div>
      </div>
    </div>
  )
}
