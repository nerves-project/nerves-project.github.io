// Small progressive enhancements. Every page works without them.
import { initNav } from './nav'
import { initCopy } from './copy'
import { initFilters } from './filters'
import { initToc } from './toc'

const ready = (fn) => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn())

ready(() => {
  initNav()
  initCopy()
  initFilters()
  initToc()
})
