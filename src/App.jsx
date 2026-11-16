import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { DataProvider, StoreProvider, useLoadData, useStoreState, fmtN } from './lib.js'
import { PriceMode, IcoX } from './ui.jsx'
import { setLocale, t, getRates, isCs } from './i18n.js'
import { MoneyTip, CurSwitch, LangSwitch, MoneyAlt, Money } from './money.jsx'
import Overview from './pages/Overview.jsx'
import MapPage from './pages/MapPage.jsx'
import Catalog from './pages/Catalog.jsx'
import Project from './pages/Project.jsx'
import Builder from './pages/Builder.jsx'
import Rent from './pages/Rent.jsx'
import Market from './pages/Market.jsx'
import Start from './pages/Start.jsx'
import { decodeCfg } from './profile.js'
import { unitsOf, unitLabel } from './scenarios.js'

// Подписи переводятся при каждой отрисовке: язык можно сменить на ходу
const NAV = () => [
  ['/', t('Обзор'), 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  ['/start', t('Анкета'), 'M9 4h6l1 2h3v15H5V6h3zM9 11h6M9 15h6M9 7.5h6'],
  ['/map', t('Карта'), 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14'],
  ['/catalog', t('Каталог ЖК'), 'M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z'],
  ['/builder', t('Подбор тройки'), 'M4 7h16M4 12h10M4 17h7M17 14v6M14 17h6'],
  ['/rent', t('Аренда и доходность'), 'M4 19V5M4 19h16M8 15l3-4 3 2 5-7'],
  ['/market', t('Рынок и чек-лист'), 'M5 4h11l3 3v13H5zM9 9h6M9 13h6M9 17h4'],
]
// Строка под полем бюджета: та же сумма в двух других валютах
const ALT = { fontSize: 11.5, lineHeight: 1.3, textAlign: 'right', color: 'var(--side-muted)', marginTop: -5 }
const fmtDate = s => s ? new Date(s).toLocaleString(isCs() ? 'cs-CZ' : 'ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : t('нет данных')

// Экран входа: данные сайта зашифрованы, без пароля их не прочитать
function Gate({ unlock, lang, setLang }) {
  const [pw, setPw] = useState(''); const [bad, setBad] = useState(false); const [busy, setBusy] = useState(false)
  const submit = async e => { e.preventDefault(); if (!pw || busy) return; setBusy(true); setBad(false); const ok = await unlock(pw); if (!ok) { setBad(true); setBusy(false) } }
  return (
    <div className="boot gate">
      <form className="card setup" onSubmit={submit}>
        <span className="logo">A</span>
        <h1>{t('Квартиры в Астане')}</h1>
        <p className="muted">{t('Сайт закрыт паролем. Введите пароль, который вам прислали вместе со ссылкой.')}</p>
        <label className="q-label" htmlFor="gate-pw">{t('Пароль')}<input id="gate-pw" className="q-input" type="password" autoFocus autoComplete="current-password" value={pw} onChange={e => { setPw(e.target.value); setBad(false) }} aria-invalid={bad} /></label>
        {bad && <div className="note" role="alert">{t('Пароль не подошёл. Проверьте раскладку и регистр.')}</div>}
        <button className="btn pri" type="submit" disabled={busy || !pw}>{busy ? t('Проверяю…') : t('Войти')}</button>
        <p className="muted small">{t('На этом устройстве пароль спросят один раз.')}</p>
        <div className="q-loc"><LangSwitch value={lang} onChange={setLang} /></div>
      </form>
    </div>
  )
}

export default function App() {
  const data = useLoadData(); const store = useStoreState(); const loc = useLocation()
  const [menu, setMenu] = useState(false)
  const go = useNavigate()
  // Ссылка «Поделиться моим подбором»: #/?cfg=… применяет чужие настройки подбора и открывает обзор
  useEffect(() => { const c = new URLSearchParams(loc.search).get('cfg'); if (!c) return; const cfg = decodeCfg(c); if (cfg) store.set({ ...cfg, view: 'mine' }); go('/', { replace: true }) }, [loc.search])
  // язык и валюта задаются до отрисовки: все t() и Money ниже по дереву берут их отсюда
  setLocale({ lang: store.lang, cur: store.cur, rates: data?.rates })
  useEffect(() => { document.documentElement.lang = store.lang }, [store.lang])
  useEffect(() => { if (!loc.pathname.startsWith('/map')) window.scrollTo({ top: 0, behavior: 'instant' }) }, [loc.pathname])
  useEffect(() => { setMenu(false) }, [loc.pathname, loc.search])
  useEffect(() => {
    if (!menu) return
    const h = e => { if (e.key === 'Escape') setMenu(false) }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [menu])
  // если пройдена анкета, бюджет задаётся по каждой квартире из неё; иначе действует исходный состав: одна 3-комнатная и две 2-комнатные
  const custom = !!store.ov?.units?.length, units = unitsOf(store.ov, store)
  const setBud = (i, v) => store.set(s => { const u = s.ov.units.map((x, k) => k === i ? { ...x, bud: v } : x); const mx = f => Math.max(0, ...u.filter(f).map(x => x.bud)); return { ov: { ...s.ov, units: u }, b3: mx(x => x.rooms >= 3) || s.b3, b2: mx(x => x.rooms <= 2) || s.b2 } })
  const nav = NAV(), rates = getRates(), limit = units.reduce((s, u) => s + u.bud, 0) * 1e6
  const title = (nav.find(([to]) => to === loc.pathname) || (loc.pathname.startsWith('/p/') ? [0, t('Каталог ЖК')] : [0, t('Астана')]))[1]
  if (!data) return <div className="boot">{t('Загружаю данные…')}</div>
  if (data.locked) return <Gate unlock={data.unlock} lang={store.lang} setLang={lang => store.set({ lang })} />
  if (data.missing) return (
    <div className="boot"><div className="card setup">
      <h1>{t('Данных пока нет')}</h1>
      <p>{t('Запустите сбор в терминале из папки проекта. Скрипт скачает каталог BI Group, квартиры, визуалы, объявления Крыши и инфраструктуру.')}</p>
      <pre>npm run fetch</pre>
      <p className="muted">{t('После завершения обновите страницу.')}</p>
    </div></div>
  )
  if (loc.pathname === '/start') return <DataProvider value={data}><StoreProvider value={store}><MoneyTip /><Start /></StoreProvider></DataProvider>
  return (
    <DataProvider value={data}><StoreProvider value={store}>
      <div className={`shell ${loc.pathname.startsWith('/map') ? 'is-map' : ''}`}>
        <header className="topbar">
          <button className="burger" onClick={() => setMenu(true)} aria-label={t('Открыть меню')} aria-expanded={menu}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <b>{title}</b>
          <span className="sum">{t('лимит')} <b><Money v={limit} /></b></span>
        </header>
        <button className={`side-back ${menu ? 'open' : ''}`} onClick={() => setMenu(false)} aria-label={t('Закрыть меню')} tabIndex={-1} />
        <aside className={`side ${menu ? 'open' : ''}`}>
          <button className="side-x" onClick={() => setMenu(false)} aria-label={t('Закрыть меню')}><IcoX width="20" height="20" /></button>
          <Link className="brand" to="/"><span className="logo">A</span><div><b>{t('Астана')}</b><span>{t('три квартиры · BI Group')}</span></div></Link>
          <nav aria-label={t('Разделы')}>{nav.map(([to, label, d]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'on' : ''}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>{label}
            </NavLink>))}
          </nav>
          <div className="side-loc">
            <div className="ctl-t">{t('Язык и валюта')}</div>
            <LangSwitch value={store.lang} onChange={lang => store.set({ lang })} />
            <CurSwitch value={store.cur} onChange={cur => store.set({ cur })} />
            {rates.date && <div className="rate">{t('Курс Нацбанка Казахстана на {d}', { d: rates.date.split('-').reverse().join('.') })}: 1{'\u00a0'}€ = {fmtN(rates.EUR, 1)}{'\u00a0'}₸, 1{'\u00a0'}Kč = {fmtN(rates.CZK, 2)}{'\u00a0'}₸</div>}
          </div>
          <div className="side-ctl">
            <div className="ctl-t">{t('Бюджет, млн ₸')}</div>
            {custom ? units.map((u, i) => <div key={i}>
              <label htmlFor={'bu' + i}>{unitLabel(u)}<input id={'bu' + i} type="number" min="10" max="400" value={u.bud} onChange={e => setBud(i, +e.target.value || 0)} /></label>
              <div style={ALT}><MoneyAlt v={u.bud * 1e6} className="" /></div>
            </div>) : <>
              <label htmlFor="b3">{t('Трёшка до')}<input id="b3" type="number" min="20" max="300" value={store.b3} onChange={e => store.set({ b3: +e.target.value || 0 })} /></label>
              <div style={ALT}><MoneyAlt v={store.b3 * 1e6} className="" /></div>
              <label htmlFor="b2">{t('Двушка до')}<input id="b2" type="number" min="15" max="200" value={store.b2} onChange={e => store.set({ b2: +e.target.value || 0 })} /></label>
              <div style={ALT}><MoneyAlt v={store.b2 * 1e6} className="" /></div>
            </>}
            <div className="ctl-sum"><span>{t('Итого')}</span><b className="num"><Money v={limit} sub /></b></div>
            <PriceMode />
            <label className="chk" htmlFor="left"><input id="left" type="checkbox" checked={store.leftOnly} onChange={e => store.set({ leftOnly: e.target.checked })} />{t('Только левый берег')}</label>
          </div>
          <div className="side-foot">
            <span>BI Group</span><span>{fmtDate(data.meta.bi)}</span><span>{t('Крыша')}</span><span>{fmtDate(data.meta.krisha)}</span><span>OSM</span><span>{fmtDate(data.meta.osm)}</span>
            <div className="wide">{t('Обновить:')} <code>npm run fetch</code></div>
          </div>
        </aside>
        <MoneyTip />
        <main className="main">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/p/:slug" element={<Project />} />
            <Route path="/builder" element={<Builder />} />
            <Route path="/rent" element={<Rent />} />
            <Route path="/market" element={<Market />} />
          </Routes>
        </main>
      </div>
    </StoreProvider></DataProvider>
  )
}
