import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { postVert, postFrag } from './shaders/post.glsl'

/** RenderPass -> UnrealBloom -> custom (aberration / glitch / grain / scanline / vignette) -> OutputPass */
export function createPost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, w: number, h: number) {
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.9, 0.75, 0.3)
  composer.addPass(bloom)
  const fx = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null }, uTime: { value: 0 }, uAberration: { value: 0.0006 }, uGrain: { value: 0.035 },
      uScan: { value: 0.035 }, uVignette: { value: 0.85 }, uGlitch: { value: 0 }, uRes: { value: new THREE.Vector2(w, h) },
    },
    vertexShader: postVert, fragmentShader: postFrag,
  })
  composer.addPass(fx)
  composer.addPass(new OutputPass())
  return { composer, bloom, fx }
}
