/** Target point clouds for the core. Every shape has exactly `n` points, radius roughly 2. */
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Shapes { blob: Float32Array; knot: Float32Array; text: Float32Array; galaxy: Float32Array }

export async function buildShapes(n: number): Promise<Shapes> {
  const rnd = mulberry32(1337)
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5

  // 0: brain-like noise blob — sphere shell, folded by sine ridges, split by a central fissure
  const blob = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u)
    const x = s * Math.cos(th), y = u, z = s * Math.sin(th)
    const fold = Math.sin(5 * x + 2 * y) * Math.sin(4 * y + 3 * z) * Math.sin(5 * z + x)
    const core = rnd() < 0.22
    let r = (core ? 1.9 * 0.85 * Math.cbrt(rnd()) : 1.9 * (1 - 0.25 * Math.pow(rnd(), 3.5))) * (1 + 0.045 * fold)
    r *= 1 - 0.07 * Math.exp(-x * x * 30) * Math.max(0, y + 0.3)
    blob[i * 3] = x * r; blob[i * 3 + 1] = y * r * 0.95; blob[i * 3 + 2] = z * r * 1.08
  }

  // 1: (2,3) torus knot tube
  const knot = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const u = rnd() * Math.PI * 2
    const r = Math.cos(3 * u) + 2
    const cx = r * Math.cos(2 * u), cy = r * Math.sin(2 * u), cz = -Math.sin(3 * u)
    const a = rnd() * Math.PI * 2, rr = 0.34 * Math.sqrt(rnd())
    knot[i * 3] = (cx + Math.cos(a) * rr * 1.6) * 0.62
    knot[i * 3 + 1] = (cy + Math.sin(a) * rr * 1.6) * 0.62
    knot[i * 3 + 2] = (cz * 0.9 + gauss() * rr) * 0.62 * 1.3
  }

  // 2: "CB" sampled from a 2D canvas
  const text = new Float32Array(n * 3)
  try {
    await Promise.race([document.fonts.load('700 200px "Space Grotesk"'), new Promise((r) => setTimeout(r, 900))])
  } catch { /* fall back to system font */ }
  const W = 560, H = 280
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const g = cv.getContext('2d', { willReadFrequently: true })!
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.font = '700 250px "Space Grotesk", "Helvetica Neue", Arial, sans-serif'
  g.fillText('CB', W / 2, H / 2 + 12)
  const data = g.getImageData(0, 0, W, H).data
  const px: number[] = []
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 128) px.push(x, y)
  const cnt = px.length / 2
  for (let i = 0; i < n; i++) {
    if (cnt) {
      const k = Math.floor(rnd() * cnt) * 2
      text[i * 3] = ((px[k] + rnd() - 0.5) / W - 0.5) * 6.0
      text[i * 3 + 1] = -((px[k + 1] + rnd() - 0.5) / H - 0.5) * 3.0
    } else {
      const a = rnd() * 6.283; text[i * 3] = Math.cos(a) * 1.8; text[i * 3 + 1] = Math.sin(a) * 1.8
    }
    text[i * 3 + 2] = gauss() * 0.28
  }

  // 3: spiral galaxy disc
  const galaxy = new Float32Array(n * 3)
  const arms = 3
  for (let i = 0; i < n; i++) {
    const r = 3.0 * Math.pow(rnd(), 0.62)
    const arm = Math.floor(rnd() * arms)
    const ang = r * 1.5 + (arm * Math.PI * 2) / arms + gauss() * (0.55 / (r * 0.8 + 0.5))
    const bulge = Math.exp(-r * 1.1)
    galaxy[i * 3] = Math.cos(ang) * r
    galaxy[i * 3 + 1] = gauss() * (0.1 + bulge * 0.7)
    galaxy[i * 3 + 2] = Math.sin(ang) * r
  }
  return { blob, knot, text, galaxy }
}
