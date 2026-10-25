import { NOISE } from './noise.glsl'

/** Perspective red grid floor, shader-drawn (derivative-based AA lines, after Ben Golus / bgolus grid). */
export const gridVert = /* glsl */ `
varying vec3 vWorld;
void main(){ vec4 w = modelMatrix * vec4(position, 1.); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`
export const gridFrag = /* glsl */ `
${NOISE}
uniform float uTime, uOpacity, uScroll, uPx;
varying vec3 vWorld;
float gridLine(vec2 c, float cell){
  vec2 g = c / cell; vec2 w = fwidth(g) * 1.2;
  vec2 gr = abs(fract(g - .5) - .5) / max(w, 1e-4);
  float l = 1. - min(min(gr.x, gr.y), 1.);
  return l * (1. - smoothstep(.25, .8, max(w.x, w.y)));
}
void main(){
  vec2 c = vWorld.xz; c.y += uScroll;
  float minor = gridLine(c, 1.5);
  float major = gridLine(c, 7.5);
  vec3 toP = vWorld - cameraPosition;
  float dist = length(toP);
  float fade = exp(-dist * .05) * smoothstep(0., 3., dist);
  fade *= exp(-abs(vWorld.x) * .028);
  // travelling bright wave along z + pointer-side glow
  float wave = pow(.5 + .5 * sin(c.y * .22 - uTime * .9), 10.);
  float side = exp(-pow((vWorld.x - uPx * 6.) / 5., 2.)) * .5;
  float lines = minor * (.32 + wave * .8 + side) + major * (.7 + wave);
  float haze = exp(toP.y / dist * 26.) * .35;     // horizon glow (toP.y/dist = dir.y, negative below horizon)
  vec3 col = mix(vec3(.85, .06, .09), vec3(1., .3, .25), clamp(lines, 0., 1.));
  float a = (lines * fade + haze * exp(-abs(vWorld.x) * .02)) * uOpacity;
  gl_FragColor = vec4(col, a);
}`

export const starVert = /* glsl */ `
attribute vec4 aRand; uniform float uTime, uPR; uniform vec3 uOff; varying float vA; varying float vR;
void main(){
  float depth = .15 + aRand.x * .85;
  vec3 p = position + uOff * depth;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  float tw = .6 + .4 * sin(uTime * (.6 + aRand.y * 2.) + aRand.z * 50.);
  vA = (.25 + .75 * aRand.w * aRand.w) * tw;
  vR = step(.86, aRand.y);
  gl_PointSize = (.8 + 1.6 * aRand.w * aRand.w) * uPR;
}`
export const starFrag = /* glsl */ `
uniform float uOpacity; varying float vA; varying float vR;
void main(){
  float d = length(gl_PointCoord - .5); if (d > .5) discard;
  float a = smoothstep(.5, .05, d);
  vec3 col = mix(vec3(.62, .62, .68), vec3(1., .3, .27), vR);
  gl_FragColor = vec4(col, a * vA * uOpacity);
}`

/** Data packets: bright heads with fading trails flying along bent curves. */
export const packetVert = /* glsl */ `
attribute float aTrail; attribute vec4 aSeed; attribute vec3 aDir;
uniform float uTime, uPR, uAmount; varying float vA; varying float vHead;
void main(){
  float h = fract(uTime * (.05 + aSeed.x * .09) + aSeed.y);
  float tt = h - aTrail * .09;
  vec3 perp = normalize(cross(aDir, vec3(0., 1., .3)));
  vec3 p = position + aDir * tt + perp * sin(tt * 3.14159) * (aSeed.z - .5) * 7.
         + vec3(0., sin(tt * 6.28 + aSeed.w * 6.) * .5, 0.);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  float k = 1. - aTrail;
  float vis = step(0., tt) * step(tt, 1.) * step(aSeed.w, uAmount);
  vA = k * k * vis * sin(h * 3.14159) * (.35 + .65 * step(.6, aSeed.x));
  vHead = pow(k, 6.);
  gl_PointSize = (1.2 + 4. * k * k) * uPR * (8. / -mv.z);
}`
export const packetFrag = /* glsl */ `
varying float vA; varying float vHead;
void main(){
  float d = length(gl_PointCoord - .5); if (d > .5) discard;
  float a = pow(smoothstep(.5, 0., d), 1.5);
  gl_FragColor = vec4(mix(vec3(1., .2, .18), vec3(1., .88, .8), vHead), a * vA);
}`
