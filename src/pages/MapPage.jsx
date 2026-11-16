import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useData, useStore, fitInfo, fmtN, POI_CATS, dlLabel, LANDMARKS, km } from '../lib.js'
import { t, tn, tp, isCs, money, moneyParts } from '../i18n.js'
import { Money } from '../money.jsx'
import { td, tc, hLabel, PriceCell } from './Catalog.jsx'
import { locOf, traitsOf } from '../scenarios.js'
import { Img, Pill, IcoX, IcoChev } from '../ui.jsx'

const STYLE = 'https://tiles.openfreemap.org/styles/liberty'
const fc = (list, props) => ({ type: 'FeatureCollection', features: list.map(x => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [x.lon, x.lat] }, properties: props(x) })) })
const RENT_SCALE = [[3000, '#1a9850'], [4500, '#a6d96a'], [6000, '#fee08b'], [7500, '#f46d43'], [9500, '#a50026']]
// Режим «выгоды локации»: до чего от дома рукой подать. Пешком 5 км/ч, на велосипеде 15 км/ч.
// Подписи в FX, FX_LM, TITLES и LOC_PARTS переводятся при отрисовке. У FX по-чешски единственное число: tc(label, '1') берёт ключ «ТРЦ|1»
const FX = [['lrt', 'LRT', 3], ['park', 'Парк', 2.5], ['sport', 'Спорт', 2.5], ['mall', 'ТРЦ', 3], ['school', 'Школа', 1.5], ['kindergarten', 'Детсад', 1.5], ['supermarket', 'Супермаркет', 1.2], ['medical', 'Медицина', 2]]
const FX_LM = [['bot', 'Ботанический сад', 4.5], ['ice', 'Барыс Арена', 5], ['mega', 'MEGA Silk Way', 4]]
// Время в пути: расстояние по прямой × 1,3 (поправка на реальный маршрут); пешком 5 км/ч, велосипед 15 км/ч, машина 25 км/ч по городу плюс 2 минуты на выезд и парковку
const mins = m => { m = Math.max(1, Math.round(m)); return m < 60 ? `${m} ${t('мин')}` : `${Math.floor(m / 60)} ${t('ч')}${m % 60 ? ' ' + (m % 60) + ' ' + t('мин') : ''}` }
const times = d => ({ walk: mins(d * 1.3 / 5 * 60), bike: mins(d * 1.3 / 15 * 60), car: mins(d * 1.3 / 25 * 60 + 2) })
const ICO = {
  walk: '<circle cx="13" cy="4" r="2"/><path d="M13 7.5l-3 5 3 3v6M10.5 12l-3.5 2M13 10l4 2.5M10 15.5l-2 6"/>',
  bike: '<circle cx="6" cy="17" r="3.5"/><circle cx="18" cy="17" r="3.5"/><path d="M6 17l4-8h5l3 8M10 9l4 8M9 6h3"/>',
  car: '<path d="M4 16v-3l2-5h12l2 5v3zM4 16v2.5M20 16v2.5M6 12.5h12"/><circle cx="8" cy="15" r=".6"/><circle cx="16" cy="15" r=".6"/>',
}
const TITLES = { walk: 'пешком', bike: 'на велосипеде', car: 'на машине' }
const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[k]}</svg>`
const timesHtml = d => { const tm = times(d); return `<span class="tt">${['walk', 'bike', 'car'].map(k => `<span title="${t(TITLES[k])}">${svg(k)}${tm[k]}</span>`).join('')}</span>` }
const Times = ({ d }) => { const tm = times(d); return <span className="tt">{['walk', 'bike', 'car'].map(k => <span key={k} title={t(TITLES[k])}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-label={t(TITLES[k])} dangerouslySetInnerHTML={{ __html: ICO[k] }} />{tm[k]}</span>)}</span> }
const dist = d => d < 1 ? `${Math.round(d * 100) * 10} ${t('м')}` : `${fmtN(d, 1)} ${t('км')}`
// Особенности дома из scenarios.js: «окна 2,4 м», «закрытый двор»
const traitLabel = s => isCs() ? String(td(s)).replace(/^окна (.+) м$/, 'okna $1 m') : s
// Подписи на карте: названия ориентиров и категорий на текущем языке
const lmData = () => fc(LANDMARKS, l => ({ n: t(l.n) }))
const poiData = (pois, c) => fc(pois.filter(p => p.c === c), p => ({ n: p.n || t(POI_CATS[c].n) }))
const ring = (p, r) => { const pts = []; for (let i = 0; i <= 72; i++) { const a = i / 72 * 2 * Math.PI; pts.push([p.lon + r / (111.32 * Math.cos(p.lat * Math.PI / 180)) * Math.cos(a), p.lat + r / 111.32 * Math.sin(a)]) } return pts }
const LOC_PARTS = [['lrt', 'LRT', 25], ['daily', 'Школы, сады, магазины, медицина', 20], ['green', 'Парки и зелень', 15], ['sport', 'Спорт', 15], ['lived', 'Обжитость района', 15], ['mall', 'ТРЦ', 10]]
const SALE_SCALE = [[450000, '#1a9850'], [600000, '#a6d96a'], [750000, '#fee08b'], [950000, '#f46d43'], [1300000, '#a50026']]

export default function MapPage() {
  const { projects, pois, krisha, bySlug, lrtApprox } = useData(); const st = useStore()
  const [sp, setSp] = useSearchParams()
  const el = useRef(null); const map = useRef(null); const markers = useRef([]); const [ready, setReady] = useState(false)
  const [cats, setCats] = useState({ lrt: true, park: true, school: false, kindergarten: false, medical: false, sport: true, mall: true, supermarket: false, university: false })
  const [ads, setAds] = useState('rent'); const [rooms, setRooms] = useState(2); const [three, setThree] = useState(true)
  // На узких экранах панель слоёв свёрнута, чтобы не закрывать карту и карточку ЖК
  const [panel, setPanel] = useState(() => window.innerWidth > 1180 || (window.innerWidth > 900 && !sp.get('p')))
  const sel = null // отдельной карточки ЖК больше нет: клик по метке сразу открывает инфографику
  const focusKey = sp.get('focus') || sp.get('p') || ''
  const focus = useMemo(() => focusKey.split(',').map(s => bySlug[s]).filter(Boolean), [focusKey, bySlug])
  const fx = useMemo(() => {
    const main = focus[0]; if (!main) return null
    const targets = []
    for (const [c, label, max] of FX) { let best = null; for (const x of pois) if (x.c === c) { const d = km(main, x); if (d <= max && (!best || d < best.d)) best = { d, x } } if (best) targets.push({ c, label, n: best.x.n, d: best.d, lat: best.x.lat, lon: best.x.lon, color: POI_CATS[c].color }) }
    for (const [id, label, max] of FX_LM) { const l = LANDMARKS.find(x => x.id === id), d = l ? km(main, l) : 99; if (d <= max && !targets.some(x => km(x, l) < 0.25)) targets.push({ c: 'lm', label, n: '', d, lat: l.lat, lon: l.lon, color: '#101a17' }) }
    targets.sort((a, b) => a.d - b.d)
    return { main, targets, loc: locOf(main, pois), traits: traitsOf(main) }
  }, [focus, pois])
  const fxMarkers = useRef([])
  const live = useRef({}); const prev = useRef(null)
  const close = () => setSp({})
  useEffect(() => { const h = e => { if (e.key === 'Escape' && focusKey) close() }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [focusKey])
  // Метки ЖК не должны наезжать друг на друга: тем, кому не хватило места, оставляем точку.
  // Приоритет: выбранный ЖК, затем подходящие по лимитам, затем остальные.
  const place = () => {
    const m = map.current; if (!m) return
    const boxes = []
    const items = markers.current.map(x => ({ x, pt: m.project(x.mk.getLngLat()) })).sort((a, b) => a.x.prio - b.x.prio || b.pt.y - a.pt.y)
    for (const { x, pt } of items) {
      const b = [pt.x - x.w / 2 - 3, pt.y - 29, pt.x + x.w / 2 + 3, pt.y + 3]
      const hit = x.prio > 0 && boxes.some(o => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])
      x.el.classList.toggle('mini', hit); x.el.style.zIndex = hit ? 0 : 3 - x.prio
      boxes.push(hit ? [pt.x - 8, pt.y - 16, pt.x + 8, pt.y + 2] : b)
    }
  }
  const placeRef = useRef(place); placeRef.current = place
  const scope = useMemo(() => projects.filter(p => !st.leftOnly || p.left), [projects, st.leftOnly])

  useEffect(() => {
    const m = new maplibregl.Map({ container: el.current, style: STYLE, center: [71.415, 51.103], zoom: 12.1, pitch: 55, bearing: -12, antialias: true, attributionControl: { compact: true } })
    map.current = m
    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right')
    m.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')
    let raf = 0
    m.on('move', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; placeRef.current() }) })
    m.on('load', () => {
      for (const kind of ['rent', 'sale']) {
        m.addSource(kind, { type: 'geojson', data: fc(krisha[kind], a => ({ id: a.id, m2: a.p / a.s, p: a.p, s: a.s, r: a.r, t: a.t, a: a.a || '' })) })
        const sc = kind === 'rent' ? RENT_SCALE : SALE_SCALE
        m.addLayer({ id: kind, type: 'circle', source: kind, layout: { visibility: 'none' }, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 2.5, 14, 5.5, 16, 8], 'circle-color': ['interpolate', ['linear'], ['get', 'm2'], ...sc.flat()], 'circle-opacity': .85, 'circle-stroke-width': 1, 'circle-stroke-color': '#fff' } })
        m.on('click', kind, e => { const f = e.features[0].properties; new maplibregl.Popup({ offset: 8 }).setLngLat(e.lngLat).setHTML(`<b>${kind === 'rent' ? money(Number(f.p), { precise: true }) + t('/мес') : money(Number(f.p), { precise: true })}</b><br>${f.t}<br><span style="color:#5d6b66">${f.a}</span><br>${money(Number(f.m2))}${t('/м²')}<br><a href="https://krisha.kz/a/show/${f.id}" target="_blank" rel="noreferrer">${t('Открыть на Крыше')} ↗</a>`).addTo(m) })
        m.on('mouseenter', kind, () => { m.getCanvas().style.cursor = 'pointer' }); m.on('mouseleave', kind, () => { m.getCanvas().style.cursor = '' })
      }
      for (const [c, v] of Object.entries(POI_CATS)) {
        m.addSource('poi-' + c, { type: 'geojson', data: poiData(pois, c) })
        m.addLayer({ id: 'poi-' + c, type: 'circle', source: 'poi-' + c, layout: { visibility: 'none' }, paint: { 'circle-radius': c === 'lrt' ? 7 : ['interpolate', ['linear'], ['zoom'], 10, 2.5, 15, 6], 'circle-color': c === 'lrt' ? '#fff' : v.color, 'circle-stroke-width': c === 'lrt' ? 3.5 : 1.2, 'circle-stroke-color': c === 'lrt' ? v.color : '#fff' } })
        m.addLayer({ id: 'poi-' + c + '-t', type: 'symbol', source: 'poi-' + c, minzoom: c === 'lrt' || c === 'park' || c === 'mall' ? 11.5 : 14, layout: { visibility: 'none', 'text-field': ['get', 'n'], 'text-font': ['Noto Sans Regular'], 'text-size': c === 'lrt' ? 12 : 11, 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-optional': true }, paint: { 'text-color': v.color, 'text-halo-color': '#fff', 'text-halo-width': 1.4 } })
      }
      m.addSource('fx-ring', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      m.addLayer({ id: 'fx-ring-f', type: 'fill', source: 'fx-ring', paint: { 'fill-color': '#0f7a63', 'fill-opacity': .07 } })
      m.addLayer({ id: 'fx-ring-l', type: 'line', source: 'fx-ring', paint: { 'line-color': '#0f7a63', 'line-width': 1.5, 'line-dasharray': [3, 3], 'line-opacity': .8 } })
      m.addSource('fx-lines', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      m.addLayer({ id: 'fx-lines-c', type: 'line', source: 'fx-lines', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#fff', 'line-width': 6, 'line-opacity': .9 } })
      m.addLayer({ id: 'fx-lines', type: 'line', source: 'fx-lines', layout: { 'line-cap': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 3 } })
      m.addSource('lm', { type: 'geojson', data: lmData() })
      m.addLayer({ id: 'lm', type: 'symbol', source: 'lm', layout: { 'text-field': ['get', 'n'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-allow-overlap': false }, paint: { 'text-color': '#101a17', 'text-halo-color': '#fff', 'text-halo-width': 1.6 } })
      setReady(true)
    })
    // контейнер может получить окончательный размер уже после создания карты: без resize подложка остаётся пустой до первого движения
    const ro = new ResizeObserver(() => { m.resize(); m.triggerRepaint() }); ro.observe(el.current)
    return () => { ro.disconnect(); m.remove(); map.current = null }
  }, [])

  useEffect(() => {
    const m = map.current; if (!m || !ready || !m.style || !m.getLayer('rent')) return
    for (const c of Object.keys(POI_CATS)) for (const id of ['poi-' + c, 'poi-' + c + '-t']) if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', cats[c] && !(fx && id.endsWith('-t')) ? 'visible' : 'none')
    for (const kind of ['rent', 'sale']) { m.setLayoutProperty(kind, 'visibility', ads === kind ? 'visible' : 'none'); m.setFilter(kind, rooms ? ['==', ['get', 'r'], rooms] : null) }
  }, [cats, ads, rooms, ready, fx])
  useEffect(() => { map.current?.easeTo({ pitch: three ? 55 : 0, bearing: three ? -12 : 0, duration: 600 }) }, [three])
  // Смена языка: подписи ориентиров и безымянных объектов на карте
  useEffect(() => {
    const m = map.current; if (!m || !ready || !m.style || !m.getSource('lm')) return
    m.getSource('lm').setData(lmData())
    for (const c of Object.keys(POI_CATS)) m.getSource('poi-' + c)?.setData(poiData(pois, c))
  }, [st.lang, ready])

  // Режим «выгоды локации»: радиусы, линии до ближайших объектов и подписи с расстоянием
  useEffect(() => {
    const m = map.current; if (!m || !ready || !m.style || !m.getSource('fx-ring')) return
    const empty = { type: 'FeatureCollection', features: [] }
    if (!fx) {
      m.getSource('fx-ring').setData(empty); m.getSource('fx-lines').setData(empty)
      // вышли из режима: возвращаем слои и наклон карты как были
      if (prev.current) { setAds(prev.current.ads); setCats(prev.current.cats); m.easeTo({ pitch: live.current.three ? 55 : 0, bearing: live.current.three ? -12 : 0, duration: 600 }); prev.current = null }
      return
    }
    if (!prev.current) prev.current = { ads: live.current.ads, cats: live.current.cats }
    const { main, targets } = fx
    m.getSource('fx-ring').setData({ type: 'FeatureCollection', features: [1, 0.5].map(r => ({ type: 'Feature', properties: { r }, geometry: { type: 'Polygon', coordinates: [ring(main, r)] } })) })
    m.getSource('fx-lines').setData({ type: 'FeatureCollection', features: targets.map(x => ({ type: 'Feature', properties: { color: x.color }, geometry: { type: 'LineString', coordinates: [[main.lon, main.lat], [x.lon, x.lat]] } })) })
    setCats(c => ({ ...c, lrt: true, park: true, sport: true, mall: true, school: true, supermarket: true })); setAds('none')
    if (window.innerWidth <= 1180) setPanel(false)
    const b = new maplibregl.LngLatBounds(); b.extend([main.lon, main.lat]); for (const p of focus) b.extend([p.lon, p.lat]); for (const x of targets) b.extend([x.lon, x.lat]); for (const pt of ring(main, 1)) b.extend(pt)
    // отступы под панель справа (или снизу на телефоне); на узкой карте их приходится ужимать, иначе fitBounds не срабатывает
    const wide = window.innerWidth > 900, W = el.current.clientWidth, H = el.current.clientHeight
    m.fitBounds(b, { padding: wide ? { top: 80, bottom: 60, left: W > 1000 ? 150 : 50, right: Math.min(400, W * 0.52) } : { top: 80, bottom: H * 0.5, left: 40, right: 40 }, pitch: 35, bearing: 0, maxZoom: 15, duration: 900 })
  }, [fx, ready])
  // Подписи режима «выгоды локации» вынесены отдельно: при смене языка они перерисовываются, а карта не двигается
  useEffect(() => {
    const m = map.current; if (!m || !ready || !fx) return
    const { main, targets } = fx
    const add = (html, cls, lngLat, anchor = 'top') => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; fxMarkers.current.push(new maplibregl.Marker({ element: d, anchor }).setLngLat(lngLat).addTo(m)) }
    // у каждого объекта номер, как в списке справа; подпись с расстоянием только у дальних, чтобы возле дома не было каши
    targets.forEach((x, i) => add(`<i style="background:${x.color}">${i + 1}</i>${x.d > 0.9 ? `<span><b>${tc(x.label, '1')} · ${dist(x.d)}</b>${timesHtml(x.d)}</span>` : ''}`, 'fxl' + (x.d > 0.9 ? '' : ' dot'), [x.lon, x.lat], 'center'))
    for (const r of [0.5, 1]) add(`${r === 1 ? '1 ' + t('км') : '500 ' + t('м')} · ${svg('walk')}${times(r).walk}`, 'fxr', [main.lon, main.lat + r / 111.32], 'bottom')
    return () => { fxMarkers.current.forEach(x => x.remove()); fxMarkers.current = [] }
  }, [fx, ready, st.lang])

  useEffect(() => {
    const m = map.current; if (!m) return
    markers.current.forEach(x => x.mk.remove()); markers.current = []
    for (const p of scope) {
      const f = fitInfo(p, st); const d = document.createElement('button')
      const inF = focus.includes(p)
      d.className = `mk ${f.fit2 && f.fit3 ? 'fit' : ''} ${sel?.slug === p.slug || inF ? 'sel' : ''} ${!f.fit2 && !f.fit3 ? 'dim' : ''} ${focus.length && !inF ? 'off' : ''}`
      d.innerHTML = `${p.name}${f.p2 ? ` · <b>${moneyParts(f.p2).num}</b>` : ''}`; d.title = t('{name}: двушки от {a}, трёшки от {b}', { name: p.name, a: money(f.p2), b: money(f.p3) })
      d.addEventListener('click', e => { e.stopPropagation(); if (window.innerWidth <= 1180) setPanel(false); setSp({ focus: p.slug }) })
      const mk = new maplibregl.Marker({ element: d, anchor: 'bottom' }).setLngLat([p.lon, p.lat]).addTo(m)
      markers.current.push({ mk, el: d, w: d.offsetWidth || 110, prio: sel?.slug === p.slug || inF ? 0 : focus.length ? 3 : f.fit2 && f.fit3 ? 1 : f.fit2 || f.fit3 ? 2 : 3 })
    }
    place()
  }, [scope, st.b2, st.b3, st.mode, st.lang, st.cur, sel?.slug, focusKey])
  useEffect(() => { if (sel && map.current) map.current.flyTo({ center: [sel.lon, sel.lat], zoom: Math.max(map.current.getZoom(), 14.6), speed: 1.1, offset: window.innerWidth <= 900 ? [0, -el.current.clientHeight * 0.22] : [el.current.clientWidth < 900 ? -150 : 0, 0] }) }, [sel?.slug])

  live.current = { ads, cats, three }
  const sf = fx ? fitInfo(fx.main, st) : null; const scale = ads === 'sale' ? SALE_SCALE : RENT_SCALE
  return (
    <div className="mapwrap">
      <div className="map" ref={el} />
      <div className={`map-panel ${panel ? '' : 'closed'}`}>
        <button className="mp-h" onClick={() => setPanel(v => !v)} aria-expanded={panel}>
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 3 8l9 5 9-5zM3 12.5l9 5 9-5M3 17l9 5 9-5" /></svg>{t('Слои карты')}</span>
          <IcoChev className="chev" />
        </button>
        {panel && <div className="mp-b">
          <div><h3>{t('Вид')}</h3><div className="seg"><button aria-pressed={three} onClick={() => setThree(true)}>3D</button><button aria-pressed={!three} onClick={() => setThree(false)}>{t('Сверху')}</button></div></div>
          <div><h3>{t('Объявления Крыши')}</h3>
            <div className="seg">{[['none', tc('нет', 'ads')], ['rent', t('аренда')], ['sale', t('продажа')]].map(([k, l]) => <button key={k} aria-pressed={ads === k} onClick={() => setAds(k)}>{l}</button>)}</div>
            {ads !== 'none' && <>
              <div className="seg">{[[0, t('все')], [1, t('{n}-к', { n: 1 })], [2, t('{n}-к', { n: 2 })], [3, t('{n}-к', { n: 3 })]].map(([k, l]) => <button key={k} aria-pressed={rooms === k} onClick={() => setRooms(k)}>{l}</button>)}</div>
              <div className="legend-scale">{scale.map(s => <span key={s[0]} style={{ background: s[1] }} />)}</div>
              <div className="legend-t"><span>{money(scale[0][0])}</span><span>{ads === 'rent' ? t('за м² в месяц') : t('за м²')}</span><span>{money(scale[4][0])}+</span></div>
            </>}
          </div>
          <div><h3>{t('Инфраструктура')}</h3><div className="lay">{Object.entries(POI_CATS).map(([c, v]) => <label key={c}><input type="checkbox" checked={!!cats[c]} onChange={e => setCats(s => ({ ...s, [c]: e.target.checked }))} /><i style={{ background: v.color }} />{t(v.n)}{c === 'lrt' && lrtApprox ? ' ' + t('(схема)') : ''}</label>)}</div></div>
          <div className="mp-key">
            <div><span className="k fit" />{t('двушка и трёшка в ваших лимитах')}</div>
            <div><span className="k" />{t('в лимит проходит не всё')}</div>
            <p>{t('Число на метке: двушки от, {u}. Точка вместо метки: не хватило места, приблизьте карту.', { u: moneyParts(st.b2 * 1e6).unit })}</p>
          </div>
        </div>}
      </div>
      {fx && <div className="map-side fx-side">
        <div className="ph-wrap"><Img src={fx.main.cover} /><button className="fx-close" onClick={close}><IcoX />{t('Закрыть')}</button></div>
        <div className="body">
          <div><span className="eyebrow">{t('Что рядом')}</span><h2>{[...new Set(focus.map(p => p.name))].join(' + ')}</h2><div className="muted small">{fx.main.address}{focus.length > 1 ? ' · ' + t('расстояния от {name}', { name: fx.main.name }) : ''}</div></div>
          <div className="pills"><Pill tone={fx.main.biz ? 'acc' : 'neu'}>{td(fx.main.cls)}</Pill><Pill>{t('потолки {h}', { h: hLabel(fx.main.ceilTxt) })}</Pill><Pill tone={fx.main.ready ? 'good' : 'neu'}>{fx.main.ready ? t('есть сданные дома') : dlLabel(fx.main.firstDl)}</Pill>{fx.traits.list.slice(0, 3).map(x => <Pill key={x}>{traitLabel(x)}</Pill>)}</div>
          <div className="prices"><PriceCell r={1} v={sf.p1} /><PriceCell r={2} v={sf.p2} ok={sf.fit2} /><PriceCell r={3} v={sf.p3} ok={sf.fit3} /></div>
          <div className="fx-score"><b className="num">{fx.loc.score}</b><span>{t('оценка локации')}<br />{t('из 100')}</span></div>
          <div className="bars one">{LOC_PARTS.map(([k, l, mx]) => <div key={k}><span>{t(l)}</span><i><b style={{ width: `${fx.loc.parts[k] / mx * 100}%` }} /></i><em className="num">{fmtN(fx.loc.parts[k], 0)}/{mx}</em></div>)}</div>
          <ul className="fx-list">{fx.targets.map((x, i) => <li key={x.c + x.label + x.n}><i style={{ background: x.color }}>{i + 1}</i><div><span><b>{tc(x.label, '1')}</b>{x.n ? ` «${x.c === 'lrt' ? tn(x.n) : x.n}»` : ''}</span><Times d={x.d} /></div><em className="num">{dist(x.d)}</em></li>)}</ul>
          <div className="kv two-col">
            <span>{t('Парков в 1,5 км')} <b>{fx.loc.parks}</b></span><span>{t('Спорт в 2 км')} <b>{fx.loc.sport}</b></span>
            <span>{t('Школ в 1 км')} <b>{fx.loc.school}</b></span><span>{t('Детсадов в 1 км')} <b>{fx.loc.kinder}</b></span>
            <span>{t('Магазинов в 800 м')} <b>{fx.loc.market}</b></span><span>{t('ТРЦ в 2 км')} <b>{fx.loc.mall}</b></span>
            <span>{t('Аренда рядом')} <b>{fx.loc.rentN} {tp(fx.loc.rentN, ['объявл.', 'объявл.', 'объявл.'], ['inzerát', 'inzeráty', 'inzerátů'])}</b></span><span>{t('Двушка')} <b>{fx.main.rs?.rent?.[2] ? <Money v={fx.main.rs.rent[2].med} suffix={t('/мес')} /> : '—'}</b></span>
          </div>
          {fx.loc.score < 25 && <div className="note">{t('По картам вокруг почти ничего нет: район ещё застраивается. Возможно, часть объектов просто не отмечена в OpenStreetMap.')}</div>}
          <p className="muted small">{t('Время оценочное: расстояние по прямой с поправкой 1,3 на маршрут, пешком 5 км/ч, велосипед 15 км/ч, машина 25 км/ч плюс 2 минуты. Пробки не учтены. Нажмите на другой ЖК на карте, чтобы увидеть его окружение.')}</p>
          <div className="pills" style={{ gap: 8 }}><Link className="btn pri" to={`/p/${fx.main.slug}`}>{t('Страница ЖК')}</Link><button className="btn" onClick={close}>{t('Обычная карта')}</button></div>
        </div>
      </div>}
    </div>
  )
}
