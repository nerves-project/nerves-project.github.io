// Copy buttons: <div class="cmd"><code>…</code><button data-copy>…</button></div>
export function initCopy() {
  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const box = button.closest('.cmd')
      const text = button.dataset.copy || box?.querySelector('code')?.textContent || ''
      try {
        await navigator.clipboard.writeText(text.trim())
        box?.classList.add('is-copied')
        button.setAttribute('aria-label', 'Copied')
        setTimeout(() => { box?.classList.remove('is-copied'); button.setAttribute('aria-label', 'Copy') }, 1600)
      } catch { /* clipboard not available: the text is still selectable */ }
    })
  })
}
