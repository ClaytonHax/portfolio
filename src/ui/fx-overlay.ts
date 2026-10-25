/** Scanlines + vignette + grain live in CSS on .fx-overlay; this just injects the layers. */
export function initFxOverlay(): void {
  const o = document.querySelector<HTMLElement>('.fx-overlay')
  if (!o) return
  o.innerHTML = '<i class="fx-scan"></i><i class="fx-vig"></i><i class="fx-grain"></i>'
}
