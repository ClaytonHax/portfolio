import * as THREE from 'three'
import { starVert, starFrag, packetVert, packetFrag } from './shaders/world.glsl'

const add = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const

/** Distant starfield with parallax (offset driven by pointer + scroll). */
export function createStars(count: number) {
  const pos = new Float32Array(count * 3), rnd = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) {
    pos.set([(Math.random() - 0.5) * 90, (Math.random() - 0.5) * 55, -8 - Math.random() * 55], i * 3)
    for (let k = 0; k < 4; k++) rnd[i * 4 + k] = Math.random()
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 4))
  const uniforms = { uTime: { value: 0 }, uPR: { value: 1 }, uOpacity: { value: 1 }, uOff: { value: new THREE.Vector3() } }
  const points = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms, vertexShader: starVert, fragmentShader: starFrag, ...add }))
  points.frustumCulled = false
  return { points, uniforms }
}

/** Data packets: bright heads with fading trails along bent curves. */
export function createPackets(packets: number, trail = 34) {
  const n = packets * trail
  const pos = new Float32Array(n * 3), dir = new Float32Array(n * 3), seed = new Float32Array(n * 4), tr = new Float32Array(n)
  for (let p = 0; p < packets; p++) {
    const sx = (Math.random() - 0.5) * 30, sy = (Math.random() - 0.5) * 12, sz = -14 + Math.random() * 12
    const fromLeft = Math.random() < 0.5 ? 1 : -1
    const d = [fromLeft * (14 + Math.random() * 16), (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 8]
    const s = [Math.random(), Math.random(), Math.random(), (p + 0.5) / packets]
    for (let k = 0; k < trail; k++) {
      const i = p * trail + k
      pos.set([sx - d[0] * 0.5, sy, sz], i * 3); dir.set(d, i * 3); seed.set(s, i * 4); tr[i] = k / (trail - 1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aDir', new THREE.BufferAttribute(dir, 3))
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4))
  g.setAttribute('aTrail', new THREE.BufferAttribute(tr, 1))
  const uniforms = { uTime: { value: 0 }, uPR: { value: 1 }, uAmount: { value: 0.5 } }
  const points = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms, vertexShader: packetVert, fragmentShader: packetFrag, ...add }))
  points.frustumCulled = false
  return { points, uniforms }
}
