import { NOISE } from './noise.glsl'

export const coreVert = /* glsl */ `
${NOISE}
attribute vec3 aS1; attribute vec3 aS2; attribute vec3 aS3; attribute vec4 aRand;
uniform float uCurl, uTime, uFrom, uTo, uMix, uPR, uSize, uOpacity, uIntensity, uPulse, uVel, uGlitch, uHover;
uniform vec3 uPointer; uniform float uPointerR; uniform float uPointerK;
uniform vec3 uAccent;
varying vec3 vColor; varying float vAlpha;

vec3 shapeAt(float i){ if (i < .5) return position; if (i < 1.5) return aS1; if (i < 2.5) return aS2; return aS3; }

void main(){
  // staggered morph (Codrops-style): each particle departs at its own time
  float delay = aRand.x * .5;
  float t = smoothstep(delay, delay + .5, uMix);
  t = t*t*(3.-2.*t);
  vec3 p = mix(shapeAt(uFrom), shapeAt(uTo), t);
  float travel = sin(t * 3.14159265);
  p += normalize(p + 1e-4) * travel * (.4 + aRand.z * 1.4);

  // curl-noise drift
  vec3 c = curl(p * 1.15 + vec3(0., 0., uTime * .12));
  float amp = .04 + travel * .5 + uGlitch * .35 + uVel * .45 + uPulse * .3;
  p += c * amp * .32 * uCurl;
  p *= 1. + .018 * sin(uTime * 1.2 + aRand.w * 6.28) + uPulse * .07;

  vec4 wp = modelMatrix * vec4(p, 1.);

  // pointer repulsion
  vec2 d = wp.xy - uPointer.xy;
  float dist = length(d);
  float f = exp(-dist * dist / (uPointerR * uPointerR)) * uPointerK;
  wp.xy += normalize(d + 1e-4) * f * (.55 + aRand.z * .7);
  wp.z += f * (aRand.w - .5) * 1.6;

  vec4 mv = viewMatrix * wp;
  gl_Position = projectionMatrix * mv;

  // palette: deep -> red -> hot, rare white-hot sparks; accent tint on project hover
  vec3 deep = vec3(.62, .045, .06), red = vec3(1., .16, .15), hot = vec3(1., .34, .26);
  vec3 col = mix(deep, red, smoothstep(0., .6, aRand.y));
  col = mix(col, hot, smoothstep(.6, 1., aRand.y) * .8);
  col = mix(col, vec3(1., .82, .74), step(.985, aRand.w));
  float flare = clamp(length(c) * amp * .35, 0., 1.);
  col += hot * flare * .6;
  col = mix(col, uAccent * 1.3, uHover * .55);
  vColor = col * (1. + uHover * .6) * uIntensity;

  float tw = .75 + .25 * sin(uTime * (1. + aRand.x * 2.) + aRand.y * 40.);
  vec3 nrm = normalize(mat3(viewMatrix * modelMatrix) * normalize(p + 1e-4));
  float rim = 1. - abs(nrm.z);
  vAlpha = uOpacity * tw * (.3 + .7 * aRand.y) * .36 * (.45 + 2.2 * rim * rim);
  float sz = (.9 + 2.3 * aRand.w * aRand.w) * uSize * (1. + travel * .6 + f * .5);
  gl_PointSize = max(sz * uPR * (7. / -mv.z), 1.);
}`

export const coreFrag = /* glsl */ `
varying vec3 vColor; varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - .5);
  if (d > .5) discard;
  float a = smoothstep(.5, 0., d);
  a *= a;
  gl_FragColor = vec4(vColor, a * vAlpha);
}`
