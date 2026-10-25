/**
 * Shared GLSL chunks.
 * hash13: Dave Hoskins' sine-free hash. Curl noise follows Robert Bridson's
 * "Curl-noise for procedural fluid flow" (divergence-free field from a vector potential),
 * evaluated here with forward differences over a cheap value-noise potential.
 */
export const NOISE = /* glsl */ `
float hash13(vec3 p3){ p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec3 p){
  vec3 i = floor(p), f = fract(p);
  f = f*f*f*(f*(f*6.-15.)+10.);
  float a = mix(mix(hash13(i), hash13(i+vec3(1,0,0)), f.x), mix(hash13(i+vec3(0,1,0)), hash13(i+vec3(1,1,0)), f.x), f.y);
  float b = mix(mix(hash13(i+vec3(0,0,1)), hash13(i+vec3(1,0,1)), f.x), mix(hash13(i+vec3(0,1,1)), hash13(i+vec3(1,1,1)), f.x), f.y);
  return mix(a, b, f.z) * 2. - 1.;
}
vec3 potential(vec3 p){ return vec3(vnoise(p), vnoise(p + vec3(31.4, 17.1, 5.3)), vnoise(p + vec3(-12.7, 43.1, 9.2))); }
vec3 curl(vec3 p){
  const float e = 0.2;
  vec3 b = potential(p);
  vec3 dx = potential(p + vec3(e,0,0)) - b;
  vec3 dy = potential(p + vec3(0,e,0)) - b;
  vec3 dz = potential(p + vec3(0,0,e)) - b;
  return vec3(dy.z - dz.y, dz.x - dx.z, dx.y - dy.x) / e;
}
`
