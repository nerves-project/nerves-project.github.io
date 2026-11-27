// "In this issue" / "On this page": built from the h2s of a post, so it works for the
// newsletter's HTML files as well as Markdown posts. The rail stays hidden if there are fewer
// than two headings.
export function initToc() {
  document.querySelectorAll('[data-toc]').forEach((list) => {
    const body = document.querySelector(list.dataset.toc)
    const rail = list.closest('[data-toc-rail]')
    const headings = body ? [...body.querySelectorAll('h2')].filter((h) => h.textContent.trim()) : []
    if (headings.length < 2) return
    const slug = (t) => t.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')
    const links = headings.map((h, i) => {
      if (!h.id) h.id = slug(h.textContent) || `section-${i + 1}`
      const li = document.createElement('li')
      const a = document.createElement('a')
      a.href = `#${h.id}`
      a.textContent = h.textContent.trim()
      li.append(a)
      list.append(li)
      return a
    })
    rail?.removeAttribute('hidden')
    // the current section is the last heading above the top quarter of the window, so jumps
    // (Page Down, a link, the scrollbar) update it as well as gentle scrolling
    let ticking = false
    const update = () => {
      ticking = false
      const line = innerHeight * 0.25
      let current = headings[0]
      for (const h of headings) {
        if (h.getBoundingClientRect().top <= line) current = h
        else break
      }
      links.forEach((a) => a.classList.toggle('is-current', a.hash === `#${current.id}`))
    }
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update) } }, { passive: true })
    update()
  })
}
