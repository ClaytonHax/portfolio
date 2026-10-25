/**
 * Tiny typed event bus so the three module groups (webgl / projects / ui)
 * never import each other directly.
 */
export interface BusEvents {
  /** Boot overlay finished; hero intro animations may start. */
  'boot:done': void
  /** Active section changed (id matches data-section in index.html). */
  'section:change': { id: string }
  /** Whole-page scroll, 0..1, plus signed velocity (px/frame-ish, from Lenis). */
  scroll: { progress: number; velocity: number; scrollY: number }
  /** Pointer in normalised device coords (-1..1), y up. */
  pointer: { x: number; y: number; clientX: number; clientY: number }
  /** A project card is hovered (null when hover ends) — WebGL may react. */
  'project:hover': { id: string | null; accent?: string }
  /** Project modal opened / closed. */
  'project:open': { id: string }
  'project:close': void
  /** Ask the cursor to change state. */
  'cursor:state': { state: 'default' | 'link' | 'view' | 'drag' | 'text'; label?: string }
  /** Short global "glitch" pulse — WebGL bumps chromatic aberration, UI may flicker. */
  glitch: { strength: number }
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
