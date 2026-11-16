import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore, dlMonth, priceOf, edgeFloor } from './lib.js'
import { t, dispo } from './i18n.js'
import { Money } from './money.jsx'

const Ico = ({ d, ...p }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><path d={d} /></svg>
export const IcoX = p => <Ico d="M6 6l12 12M18 6 6 18" {...p} />
export const IcoPrev = p => <Ico d="M15 5l-7 7 7 7" {...p} />
export const IcoNext = p => <Ico d="M9 5l7 7-7 7" {...p} />
export const IcoChev = p => <Ico d="M6 9l6 6 6-6" {...p} />

export const Pill = ({ tone = 'neu', children, title }) => <span className={`pill ${tone}`} title={title}>{children}</span>

// Адреса, которые уже не загрузились: не запрашиваем их повторно в других карточках
const BAD = new Set()
/* src используется как есть. fallback: запасной адрес (или массив), если основной не загрузился.
   Если не загрузилось ничего, рисуется нейтральная заглушка без текста. */
export const Img = ({ src, fallback, alt = '', className = '', onClick }) => {
  const [, bump] = useState(0)
  const url = [src].concat(fallback || []).find(u => u && !BAD.has(u))
  if (!url) return <div className={`img ph ${className}`} role="img" aria-label={t('Нет изображения')} title={t('Нет изображения')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15.5 9.5h.01" /></svg></div>
  return <img className={`img ${className}`} src={url} alt={alt} loading="lazy" decoding="async" onError={() => { BAD.add(url); bump(n => n + 1) }} onClick={onClick} />
}
export function Lightbox({ images, index, onClose, onIndex }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') onIndex((index + 1) % images.length); if (e.key === 'ArrowLeft') onIndex((index - 1 + images.length) % images.length) }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [index, images, onClose, onIndex])
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={t('Просмотр изображения')} onClick={onClose}>
      <button className="lb-x" onClick={onClose} aria-label={t('Закрыть')}><IcoX /></button>
      {images.length > 1 && <button className="lb-nav prev" onClick={e => { e.stopPropagation(); onIndex((index - 1 + images.length) % images.length) }} aria-label={t('Назад')}><IcoPrev /></button>}
      <img src={images[index]} alt="" onClick={e => e.stopPropagation()} />
      {images.length > 1 && <button className="lb-nav next" onClick={e => { e.stopPropagation(); onIndex((index + 1) % images.length) }} aria-label={t('Вперёд')}><IcoNext /></button>}
      {images.length > 1 && <div className="lb-count">{index + 1} / {images.length}</div>}
    </div>
  )
}
export function Gallery({ images, variant = 'grid', max = 12 }) {
  const [i, setI] = useState(null)
  const list = (images || []).filter(Boolean)
  if (!list.length) return null
  return (
    <>
      <div className={`gallery ${variant}`} data-n={Math.min(list.length, max)}>
        {list.slice(0, max).map((src, k) => (
          <button key={src + k} className="g-item" onClick={() => setI(k)} aria-label={t('Открыть фото {n}', { n: k + 1 })}>
            <Img src={src} />
            {k === max - 1 && list.length > max && <span className="g-more">+{list.length - max}</span>}
          </button>
        ))}
      </div>
      {i != null && <Lightbox images={list} index={i} onClose={() => setI(null)} onIndex={setI} />}
    </>
  )
}
export const Section = ({ id, title, sub, right, children }) => (
  <section className="sec" id={id}>
    <div className="sec-h"><div><h2>{title}</h2>{sub && <p className="muted">{sub}</p>}</div>{right}</div>
    {children}
  </section>
)
export function PriceMode() {
  const st = useStore()
  return (
    <div className="seg" role="group" aria-label={t('Какая цена')}>
      <button aria-pressed={st.mode === 'list'} onClick={() => st.set({ mode: 'list' })}>{t('Прайс')}</button>
      <button aria-pressed={st.mode === 'best'} onClick={() => st.set({ mode: 'best' })} title={t('Оценка: к прайсу применён коэффициент «лучшей цены» ЖК из каталога BI (скидка при 100% оплате)')}>{t('Со скидкой')}</button>
    </div>
  )
}
export function FavBtn({ slug, id }) {
  const st = useStore(); const on = st.favs.includes(slug + '|' + id)
  return (
    <button className={`fav ${on ? 'on' : ''}`} onClick={e => { e.preventDefault(); e.stopPropagation(); st.toggleFav(slug, id) }} aria-pressed={on} aria-label={on ? t('Убрать из избранного') : t('В избранное')} title={on ? t('Убрать из избранного') : t('В избранное')}>
      <svg viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" /></svg>
    </button>
  )
}
// Изображение квартиры: чертёж планировки, запасной вариант: картинка квартиры
export const planOf = a => [a.plan, a.img].filter(Boolean)
export function PlanThumb({ a, className = 'thumb' }) {
  const [z, setZ] = useState(null)
  const srcs = planOf(a)
  if (!srcs.length) return <span className={className} aria-hidden="true"><Img /></span>
  return (
    <>
      <button className={className} onClick={e => { const el = e.currentTarget.querySelector('img'); setZ(el?.currentSrc || el?.src || srcs[srcs.length - 1]) }} aria-label={t('Увеличить планировку')}><Img src={srcs[0]} fallback={srcs.slice(1)} alt={t('План квартиры')} /></button>
      {z && <Lightbox images={[z]} index={0} onClose={() => setZ(null)} onIndex={() => {}} />}
    </>
  )
}
export function AptRow({ p, a, role, showProject = true, thumb = false }) {
  const st = useStore()
  return (
    <div className={`aptrow ${thumb ? 'has-thumb' : ''}`}>
      {thumb && <PlanThumb a={a} />}
      <div>
        {role && <span className="aptrow-role">{role}</span>}
        <div className="aptrow-t">{showProject && <Link to={`/p/${p.slug}`}>{p.name}</Link>}{showProject ? ' · ' : ''}{dispo(a)}, {String(a.s).replace('.', ',')}{'\u00a0'}{t('м²')}</div>
        <div className="muted small">{t('этаж {f} из {fm}', { f: a.f, fm: a.fm })}{edgeFloor(a) ? ` (${t('крайний')})` : ''} · {dlMonth(a.dl)}{a.rep ? ' · ' + t('с ремонтом') : ''}{a.lt ? ' · ' + t(a.lt).toLowerCase() : ''}</div>
      </div>
      <div className="aptrow-p num"><Money v={priceOf(a, p, st.mode)} precise /></div>
    </div>
  )
}
export const Stat = ({ label, value, unit, hint, children }) => <div className="stat"><span className="muted small">{label}</span><b className="num">{value}{unit && <i> {unit}</i>}</b>{hint && <span className="muted small">{hint}</span>}{children}</div>
