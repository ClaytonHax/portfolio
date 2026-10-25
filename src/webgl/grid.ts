import * as THREE from 'three'
import { gridVert, gridFrag } from './shaders/world.glsl'

/** Shader-drawn perspective red grid floor for the work section. */
export function createGrid() {
  const uniforms = { uTime: { value: 0 }, uOpacity: { value: 0 }, uScroll: { value: 0 }, uPx: { value: 0 } }
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 90),
    new THREE.ShaderMaterial({
      uniforms, vertexShader: gridVert, fragmentShader: gridFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }),
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(0, -2.7, -32)
  mesh.visible = false
  mesh.frustumCulled = false
  return { mesh, uniforms }
}
