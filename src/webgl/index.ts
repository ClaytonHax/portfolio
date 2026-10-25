import { createStage } from './stage'

/** Persistent fixed background world. Resolves once the first frame is rendered. */
export async function initWebGL(canvas: HTMLCanvasElement): Promise<void> {
  await createStage(canvas)
}
