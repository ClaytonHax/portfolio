import * as THREE from 'three'
import { gsap } from '../core/motion'
import {
  shellVert, shellFrag, ringLineVert, ringLineFrag, ringDotVert, ringDotFrag, pulseVert, pulseFrag,
} from './shaders/extras.glsl'

/** Fresnel wireframe icosahedron shell. */
export function createShell() {
  const uniforms = { uTime: { value: 0 }, uOpacity: { value: 1 }, uHover: { value: 0 } }
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.55, 2),
    new THREE.ShaderMaterial({
      uniforms, vertexShader: shellVert, fragmentShader: shellFrag, wireframe: true,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }),
  )
  return { mesh, uniforms }
}

/** Dashed orbit rings with a comet running along each. */
export function createRings(pr: () => number) {
  const group = new THREE.Group()
  const mats: THREE.ShaderMaterial[] = []
  const defs = [
    { r: 3.05, tx: 1.15, tz: 0.2, dash: 36, speed: 0.05, spin: 0.09 },
    { r: 3.55, tx: 0.35, tz: -0.9, dash: 60, speed: -0.035, spin: -0.06 },
    { r: 2.75, tx: -0.8, tz: 0.6, dash: 24, speed: 0.07, spin: 0.12 },
  ]
  const segs = 240
  const rings = defs.map((d) => {
    const pos = new Float32Array(segs * 3), ang = new Float32Array(segs)
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2
      pos.set([Math.cos(a) * d.r, 0, Math.sin(a) * d.r], i * 3); ang[i] = a
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aAng', new THREE.BufferAttribute(ang, 1))
    const base = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }
    const lineMat = new THREE.ShaderMaterial({
      ...base, vertexShader: ringLineVert, fragmentShader: ringLineFrag,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0.5 }, uDash: { value: d.dash }, uSpeed: { value: d.speed * 4 } },
    })
    const dotMat = new THREE.ShaderMaterial({
      ...base, vertexShader: ringDotVert, fragmentShader: ringDotFrag,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 }, uSpeed: { value: d.speed * 16 }, uPR: { value: 1 } },
    })
    mats.push(lineMat, dotMat)
    const holder = new THREE.Group()
    holder.rotation.set(d.tx, 0, d.tz)
    const spinner = new THREE.Group()
    spinner.add(new THREE.LineLoop(g, lineMat), new THREE.Points(g, dotMat))
    holder.add(spinner)
    group.add(holder)
    return { spinner, spin: d.spin }
  })
  return {
    group,
    update(t: number, opacity: number) {
      for (const m of mats) {
        m.uniforms.uTime.value = t; m.uniforms.uOpacity.value = opacity * (m.uniforms.uPR ? 1 : 0.5)
        if (m.uniforms.uPR) m.uniforms.uPR.value = pr()
      }
      rings.forEach((r) => (r.spinner.rotation.y = t * r.spin))
    },
  }
}

/** Expanding shock ring (project hover, contact heartbeat). Lives in the anchor, faces the camera. */
export function createPulse() {
  const uniforms = { uT: { value: 1 }, uStrength: { value: 1 } }
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.ShaderMaterial({
      uniforms, vertexShader: pulseVert, fragmentShader: pulseFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }),
  )
  mesh.visible = false
  return {
    mesh,
    fire(strength = 0.8) {
      mesh.visible = true
      uniforms.uStrength.value = strength
      gsap.killTweensOf(uniforms.uT)
      gsap.fromTo(uniforms.uT, { value: 0 }, { value: 1, duration: 1.6, ease: 'power1.out', onComplete: () => (mesh.visible = false) })
    },
  }
}
