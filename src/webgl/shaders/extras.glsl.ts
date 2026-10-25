/** Shell, rings, pulse ring. */
export const shellVert = /* glsl */ `
uniform float uTime;
varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){
  vec3 p = position;
  p *= 1. + .012 * sin(uTime * .8 + position.y * 3.);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  vN = normalize(normalMatrix * normal);
  vV = -mv.xyz;
  vP = position;
  gl_Position = projectionMatrix * mv;
}`
export const shellFrag = /* glsl */ `
uniform float uTime, uOpacity, uHover;
varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){
  float fr = pow(1. - abs(dot(normalize(vN), normalize(vV))), 2.4);
  float band = pow(.5 + .5 * sin(vP.y * 5. - uTime * 1.6), 6.);
  vec3 col = mix(vec3(.9, .1, .12), vec3(1., .38, .3), fr);
  float a = (.04 + fr * .85 + band * .35) * uOpacity * (1. + uHover * .8);
  gl_FragColor = vec4(col, a);
}`

export const ringLineVert = /* glsl */ `
attribute float aAng; varying float vAng;
void main(){ vAng = aAng; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`
export const ringLineFrag = /* glsl */ `
uniform float uTime, uOpacity, uDash, uSpeed; varying float vAng;
void main(){
  float u = vAng / 6.2831853;
  float m = fract(u * uDash - uTime * uSpeed);
  if (m > .55) discard;
  gl_FragColor = vec4(1., .22, .2, uOpacity * (.35 + .65 * smoothstep(0., .1, m) * smoothstep(.55, .45, m)));
}`
export const ringDotVert = /* glsl */ `
attribute float aAng; uniform float uTime, uSpeed, uPR; varying float vB;
void main(){
  float u = fract(aAng / 6.2831853 - uTime * uSpeed * .06);
  vB = pow(1. - u, 7.);
  vec4 mv = modelViewMatrix * vec4(position, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1. + vB * 7.) * uPR * (7. / -mv.z);
}`
export const ringDotFrag = /* glsl */ `
uniform float uOpacity; varying float vB;
void main(){
  float d = length(gl_PointCoord - .5); if (d > .5) discard;
  float a = pow(smoothstep(.5, 0., d), 2.);
  gl_FragColor = vec4(mix(vec3(1., .2, .18), vec3(1., .85, .78), vB), a * uOpacity * (.05 + vB));
}`

export const pulseVert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`
export const pulseFrag = /* glsl */ `
uniform float uT, uStrength; varying vec2 vUv;
void main(){
  float r = length(vUv - .5) * 12.;
  float R = mix(1.6, 5.6, 1. - pow(1. - uT, 3.));
  float w = mix(.05, .5, uT);
  float a = exp(-pow((r - R) / w, 2.)) * (1. - uT) * uStrength;
  gl_FragColor = vec4(1., .25, .22, a);
}`
