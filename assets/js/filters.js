// Chip filters over a list, without a page load.
//   <div data-filter-group="blog"> <button data-filter="all"> <button data-filter="newsletter"> </div>
//   items: [data-filter-item="blog"][data-kind="newsletter"]
// Groups (e.g. year headings) with [data-filter-section] hide when all their items are hidden.
export function initFilters() {
  document.querySelectorAll('[data-filter-group]').forEach((group) => {
    const name = group.dataset.filterGroup
    const buttons = group.querySelectorAll('[data-filter]')
    const items = document.querySelectorAll(`[data-filter-item="${name}"]`)
    const sections = document.querySelectorAll(`[data-filter-section="${name}"]`)
    const apply = (value) => {
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === value)))
      items.forEach((item) => {
        const kinds = (item.dataset.kind || '').split(' ')
        item.hidden = !(value === 'all' || kinds.includes(value))
      })
      sections.forEach((section) => {
        section.hidden = !section.querySelector(`[data-filter-item="${name}"]:not([hidden])`)
      })
    }
    buttons.forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); apply(b.dataset.filter) }))
  })
}
