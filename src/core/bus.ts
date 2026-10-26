/**
 * Tiny typed event bus so the module groups (pen / sections / case) never import each other.
 */
export type Theme = 'light' | 'night'

export interface BusEvents {
  /** Intro finished playing (or was skipped). The scroll-driven line is live after this. */
  'intro:done': { skipped: boolean }
  /** The pen reached a stop on the line (data-pen-stop id). Fired again after a rewind past it. */
  'pen:reach': { id: string }
  /** The pen moved back above a stop it had reached (scrolling up). Sections may reverse their reveal. */
  'pen:leave': { id: string }
  /** Overall journey progress 0..1 (after the intro). */
  'pen:progress': { p: number }
  /** Theme changed (after data-theme is set on <html>). */
  'theme:change': { theme: Theme }
  /** Open a case study. `from` is the element to expand from and return focus to. */
  'case:open': { id: string; from?: HTMLElement | null }
  'case:close': void
  /** Layout changed in a way that moves anchors (fonts loaded, images loaded, filter changed). Pen rebuilds its path. */
  'layout:change': void
  /** Progress 0..1 of the journey line around one traced shape (data-pen-shape id). Fires while it changes, incl. rewinds. */
  'pen:shape': { id: string; p: number }
  /** A section asks the pen to fade (on) or restore (off) the traced outlines of a stop, e.g. a carousel swiped away. */
  'pen:dim': { id: string; on: boolean }
  /** A section has taken over the drawing (e.g. a pinned horizontal chapter). While on, the pen hides its tip and ink. */
  'pen:hold': { on: boolean }
}

type Handler<T> = (payload: T) => void
const handlers = new Map<keyof BusEvents, Set<Handler<any>>>()

export function on<K extends keyof BusEvents>(event: K, fn: Handler<BusEvents[K]>): () => void {
  if (!handlers.has(event)) handlers.set(event, new Set())
  handlers.get(event)!.add(fn)
  return () => handlers.get(event)!.delete(fn)
}

export function emit<K extends keyof BusEvents>(
  event: K,
  ...payload: BusEvents[K] extends void ? [] : [BusEvents[K]]
): void {
  handlers.get(event)?.forEach((fn) => fn(payload[0]))
}
