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
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return
        links.forEach((a) => a.classList.toggle('is-current', a.hash === `#${e.target.id}`))
      })
    }, { rootMargin: '0px 0px -70% 0px' })
    headings.forEach((h) => io.observe(h))
  })
}
