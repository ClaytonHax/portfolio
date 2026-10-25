import { NOISE } from './noise.glsl'

export const postVert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`
/** Radial chromatic aberration + block glitch + grain + scanlines + vignette. */
export const postFrag = /* glsl */ `
${NOISE}
uniform sampler2D tDiffuse;
uniform float uTime, uAberration, uGrain, uScan, uVignette, uGlitch;
uniform vec2 uRes;
varying vec2 vUv;
void main(){
  vec2 uv = vUv;
  if (uGlitch > .001) {
    float tk = floor(uTime * 16.);
    float band = floor(uv.y * 26. + tk);
    if (hash12(vec2(band, tk)) > 1. - uGlitch * .4) uv.x += (hash12(vec2(band, 3.7)) - .5) * .07 * uGlitch;
  }
  vec2 dir = uv - .5;
  float dl = length(dir);
  float ab = uAberration * (.35 + dl * 1.8);
  vec3 col;
  col.r = texture2D(tDiffuse, uv + dir * ab).r;
  col.g = texture2D(tDiffuse, uv).g;
  col.b = texture2D(tDiffuse, uv - dir * ab).b;
  float sl = .5 + .5 * sin(gl_FragCoord.y * 1.9);
  float roll = smoothstep(.0, .02, abs(fract(uv.y - uTime * .05) - .5) - .47) ;
  col *= 1. - uScan * sl;
  col *= 1. + uScan * .6 * (1. - roll);
  col *= mix(1., smoothstep(.95, .28, dl * 1.25), uVignette);
  col += (hash12(gl_FragCoord.xy + fract(uTime) * 91.7) - .5) * uGrain * (.4 + length(col));
  gl_FragColor = vec4(max(col, 0.), 1.);
}`
