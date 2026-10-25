import * as THREE from 'three'
import { gsap } from '../core/motion'
import { buildShapes } from './shapes'
import { coreVert, coreFrag } from './shaders/core.glsl'

/** The "core": GPU particle cloud that morphs between 4 shapes (see shapes.ts). */
export async function createCore(count: number) {
  const s = await buildShapes(count)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(s.blob, 3))
  geo.setAttribute('aS1', new THREE.BufferAttribute(s.knot, 3))
  geo.setAttribute('aS2', new THREE.BufferAttribute(s.text, 3))
  geo.setAttribute('aS3', new THREE.BufferAttribute(s.galaxy, 3))
  const rand = new Float32Array(count * 4)
  for (let i = 0; i < rand.length; i++) rand[i] = Math.random()
  geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 4))
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10)

  const uniforms = {
    uCurl: { value: 1 }, uTime: { value: 0 }, uFrom: { value: 0 }, uTo: { value: 0 }, uMix: { value: 1 },
    uPR: { value: 1 }, uSize: { value: 1.6 }, uOpacity: { value: 1 }, uIntensity: { value: 1 },
    uPulse: { value: 0 }, uVel: { value: 0 }, uGlitch: { value: 0 }, uHover: { value: 0 },
    uPointer: { value: new THREE.Vector3(99, 99, 0) }, uPointerR: { value: 1.4 }, uPointerK: { value: 1 },
    uAccent: { value: new THREE.Color('#ff3b3b') },
  }
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader: coreVert, fragmentShader: coreFrag,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geo, mat)
  points.frustumCulled = false

  let shape = 0
  let pending: number | null = null
  let busy = false
  const run = (to: number) => {
    busy = true
    uniforms.uFrom.value = shape
    uniforms.uTo.value = to
    uniforms.uMix.value = 0
    shape = to
    gsap.to(uniforms.uMix, {
      value: 1, duration: 2.4, ease: 'power1.inOut',
      onComplete: () => {
        busy = false
        if (pending !== null && pending !== shape) { const p = pending; pending = null; run(p) }
        pending = null
      },
    })
  }
  return {
    points, uniforms,
    /** Morph to shape 0..3; interrupted requests are queued so nothing pops mid-flight. */
    morphTo(to: number, instant = false) {
      if (instant) {
        gsap.killTweensOf(uniforms.uMix)
        busy = false; pending = null; shape = to
        uniforms.uFrom.value = to; uniforms.uTo.value = to; uniforms.uMix.value = 1
        return
      }
      if (busy) { pending = to; return }
      if (to !== shape) run(to)
    },
    get shape() { return pending ?? shape },
    setDrawFraction(f: number) { geo.setDrawRange(0, Math.floor(count * f)) },
  }
}
export type Core = Awaited<ReturnType<typeof createCore>>
