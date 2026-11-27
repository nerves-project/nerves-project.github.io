// The header menu on narrow screens.
export function initNav() {
  const header = document.querySelector('[data-site-header]')
  const toggle = header?.querySelector('[data-nav-toggle]')
  if (!toggle) return
  const set = (open) => {
    header.classList.toggle('is-open', open)
    toggle.setAttribute('aria-expanded', String(open))
  }
  toggle.addEventListener('click', () => set(!header.classList.contains('is-open')))
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false) })
  document.addEventListener('click', (e) => { if (!header.contains(e.target)) set(false) })
}
