/* Opening splash — a drop, its wake, and a fisheye lens closing over the page.

   Five beats, all on non-linear curves:
     0.10s   the drop lands; crests race outward through the field
     0.58s   the wake loses energy and its envelope retracts toward the middle
     0.88s   a fisheye disc grows out of the centre until it covers the screen
     1.66s   the page enters through the middle while the lens is still alive
     +0.48s  the lens (water, grid and rim) is sucked into the centre and gone

   The scene lives on a canvas so it can be pushed through a real barrel
   projection. A concentric gradient cannot show distortion (a radial warp
   maps circles to circles), so the water carries a faint notebook grid and
   a caustic net: those straight lines are the ruler the eye reads the lens
   against. The homepage itself is bent by an SVG displacement filter while
   it comes in, so the real headings/cards are seen through the same lens.

   Rendering is one WebGL draw call: the fragment shader inverse-projects
   every pixel through the lens and paints the field, grid, caustics, motes
   and the page window in a single pass. That keeps Edge's compositor out of
   the old path (several full-screen gradients + `lighter` composites per
   frame). On machines without usable WebGL a 2D fallback draws the same
   grid as warped polylines, so the fisheye still reads; a lost WebGL
   context swaps to that painter mid-animation instead of ending the intro.

   Cold-start hardening:
     - an inline loader in index.html dynamic-imports this module before the
       app's script/module stack, so the water is already moving while a cold
       browser is still fetching marked/Prism/the page modules;
     - shader compile/link is asynchronous when KHR_parallel_shader_compile
       exists, so a cold GPU process cannot block the page boot;
     - frame gaps caused by startup long tasks are excluded from the scene
       clock (see STALL_KEEP), so a stutter stretches the intro instead of
       skipping the drop, the lens or the collapse.

   Only armed by the inline head script (first home visit of a session, or
   ?splash=1), so inner navigation never replays it. */

const LENS_START = 880; // ms: the fisheye starts growing out of the middle
const LENS_SPAN = 720; // ms until it reaches the corners
const ENTER_LEAD = 1780; // ms: page entry; leaves a beat of full fisheye first
const ENTER_SPAN = 480; // ms of page entering under the lens
const COLLAPSE_SPAN = 340; // ms for the lens to shrink into the centre
const MAX_WAIT = 2300; // ms after app start: never hold the reader hostage on a slow fetch
const BOOT_MAX_WAIT = 6000; // ms: page still loading if the app never signalled
const APEX = 1.55; // fisheye strength at full growth (barrel limit is π/2)
const DROP_AT = 0.10; // s: the drop lands

/* A cold browser can freeze the main thread for hundreds of ms (GPU process
   start, script parse, first paint). Wall-clock time would then skip whole
   beats of the intro; instead, only the part of a frame gap above
   STALL_KEEP counts, and the timeline is stretched by the rest. */
const STALL_MS = 100; // frame gaps up to this are ordinary low frame rate
const STALL_KEEP = 80; // ms of the gap that still advances the intro
const MAX_LAG = 2600; // ms: cap, so a pathologically slow machine still ends

const TAU = Math.PI * 2;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const smoothstep = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function palette() {
  const light = document.documentElement.dataset.theme !== 'dark';
  return light
    ? {
        gl: {
          core: [0.94, 0.97, 1.0],
          mid: [0.78, 0.87, 0.97],
          edge: [0.43, 0.59, 0.82],
          wash: [0.2, 0.36, 0.6],
          glow: [1.0, 1.0, 1.0],
          line: [0.09, 0.29, 0.75],
          caustic: [0.12, 0.36, 0.8],
          mote: [0.09, 0.24, 0.48],
          shade: [0.2, 0.37, 0.63],
          glowK: 0.05,
          washK: 0.38,
          lineK: 1.15,
          causticK: 0.18,
          moteK: 0.4,
          shadeK: 1.0,
        },
        flat: {
          bg: '#c6daf6',
          field: [
            [0, '#f8fbff'],
            [0.24, '#e8f1fe'],
            [0.56, '#d2e2fa'],
            [1, '#a8c4ec'],
          ],
          wash: '20, 52, 104',
          glow: '255, 255, 255',
          line: '37, 99, 235',
          caustic: '37, 99, 235',
          mote: '29, 78, 156',
          moteCore: '24, 58, 132',
          shade: '20, 48, 92',
          additive: false,
          washK: 0.45,
          lineK: 0.95,
          causticK: 0.4,
          moteA: 0.65,
        },
      }
    : {
        gl: {
          core: [0.106, 0.247, 0.463],
          mid: [0.035, 0.1, 0.2],
          edge: [0.008, 0.02, 0.045],
          wash: [0.002, 0.008, 0.02],
          glow: [0.66, 0.82, 1.0],
          line: [0.5, 0.68, 0.95],
          caustic: [0.48, 0.73, 1.0],
          mote: [0.85, 0.93, 1.0],
          shade: [0.004, 0.016, 0.04],
          glowK: 0.22,
          washK: 0.62,
          lineK: 1.0,
          causticK: 0.22,
          moteK: 0.65,
          shadeK: 1.0,
        },
        flat: {
          bg: '#04080f',
          field: [
            [0, '#1b3f76'],
            [0.22, '#112b53'],
            [0.54, '#08182c'],
            [1, '#03060c'],
          ],
          wash: '2, 7, 18',
          glow: '59, 130, 246',
          line: '147, 197, 253',
          caustic: '147, 197, 253',
          mote: '214, 234, 255',
          moteCore: '255, 255, 255',
          shade: '2, 8, 20',
          additive: true,
          washK: 0.7,
          lineK: 0.8,
          causticK: 0.5,
          moteA: 0.8,
        },
      };
}

function makeMoteSprite(pal) {
  const S = 24;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  const [r, gg, b] = pal.flat.mote.split(',').map(Number);
  g.addColorStop(0, `rgba(${pal.flat.moteCore},0.95)`);
  g.addColorStop(0.22, `rgba(${r},${gg},${b},0.7)`);
  g.addColorStop(0.5, `rgba(${r},${gg},${b},0.18)`);
  g.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2, 0, TAU);
  ctx.fill();
  return cv;
}

/* -------------------------------------------- page lens (pure SVG filter)

   A canvas can bend water, but the homepage is DOM. feDisplacementMap lets
   the browser sample the real page through a radial displacement field, so
   headings, cards and the header bulge with the same lens as the water.
   The map only covers the visible top of the page (plus a fade below the
   fold), which keeps the filter cheap and avoids seams when it is removed. */

const SVG_NS = 'http://www.w3.org/2000/svg';

function createPageWarp(stage) {
  const rect = stage.getBoundingClientRect();
  const vw = Math.max(1, window.innerWidth);
  const vh = Math.max(1, window.innerHeight);
  const width = Math.max(1, Math.round(rect.width || vw));
  const fieldTop = Math.max(0, -rect.top);
  const fieldH = Math.round(vh * 1.35);
  const mapW = 224;
  const mapH = Math.max(160, Math.min(1200, Math.round((mapW * fieldH) / width)));
  const cv = document.createElement('canvas');
  cv.width = mapW;
  cv.height = mapH;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;

  const data = ctx.createImageData(mapW, mapH);
  const px = data.data;
  const cx = width * 0.5;
  const cy = vh * 0.5;
  const maxR = Math.sqrt(cx * cx + cy * cy);
  const DMAX = Math.min(vw, vh) * 0.18;
  const scaleMax = DMAX * 2;
  const fadeStart = vh * 1.02;
  const fadeEnd = vh * 1.3;
  let i = 0;
  for (let y = 0; y < mapH; y++) {
    const fy = ((y + 0.5) / mapH) * fieldH;
    const fade = 1 - smoothstep(fadeStart, fadeEnd, fy);
    for (let x = 0; x < mapW; x++) {
      const fx = ((x + 0.5) / mapW) * width;
      const ox = fx - cx;
      const oy = fy - cy;
      const r = Math.sqrt(ox * ox + oy * oy);
      let dx = 0;
      let dy = 0;
      if (r > 0.001 && fade > 0) {
        const amp = DMAX * Math.pow(Math.min(1, r / maxR), 2.2) * fade;
        /* sample inward: the page bulges through the lens like the water */
        dx = (amp * ox) / r;
        dy = (amp * oy) / r;
      }
      px[i++] = Math.max(0, Math.min(255, Math.round(128 + (dx / scaleMax) * 255)));
      px[i++] = Math.max(0, Math.min(255, Math.round(128 + (dy / scaleMax) * 255)));
      px[i++] = 128;
      px[i++] = 255;
    }
  }
  ctx.putImageData(data, 0, 0);
  const href = cv.toDataURL('image/png');

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  const defs = document.createElementNS(SVG_NS, 'defs');
  const filter = document.createElementNS(SVG_NS, 'filter');
  filter.setAttribute('id', 'splash-page-fisheye');
  filter.setAttribute('filterUnits', 'userSpaceOnUse');
  filter.setAttribute('primitiveUnits', 'userSpaceOnUse');
  filter.setAttribute('x', '0');
  filter.setAttribute('y', String(fieldTop));
  filter.setAttribute('width', String(width));
  filter.setAttribute('height', String(fieldH));
  filter.setAttribute('color-interpolation-filters', 'sRGB');

  const img = document.createElementNS(SVG_NS, 'feImage');
  img.setAttribute('href', href);
  img.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', href);
  img.setAttribute('x', '0');
  img.setAttribute('y', String(fieldTop));
  img.setAttribute('width', String(width));
  img.setAttribute('height', String(fieldH));
  img.setAttribute('preserveAspectRatio', 'none');
  img.setAttribute('result', 'warp');

  const disp = document.createElementNS(SVG_NS, 'feDisplacementMap');
  disp.setAttribute('in', 'SourceGraphic');
  disp.setAttribute('in2', 'warp');
  disp.setAttribute('scale', '0');
  disp.setAttribute('xChannelSelector', 'R');
  disp.setAttribute('yChannelSelector', 'G');

  filter.append(img, disp);
  defs.append(filter);
  svg.append(defs);
  document.body.append(svg);
  return { stage, svg, disp, scaleMax, active: false, last: -1 };
}

/* ------------------------------------------------------------------ shaders */

const VERT = `#version 300 es
in vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;

out vec4 outColor;

uniform vec2  uRes;
uniform vec2  uCenter;
uniform float uPixelScale;
uniform float uR0;
uniform float uInvR0;
uniform float uTime;
uniform float uA;
uniform float uLensSin;
uniform float uLensInvA;
uniform float uZoom;
uniform float uLens;      // lens growth 0..1
uniform float uLensR;     // lens rim radius in screen px
uniform float uLensRim;   // rim highlight 0..1
uniform float uRipple;    // ambient wake strength
uniform float uRipR;      // wake envelope radius in scene px
uniform float uRipInv;    // 1 / (R0 * 1.05)
uniform float uInvWl;     // 1 / (R0 * 0.085)
uniform float uPage;      // page-entry progress 0..1
uniform float uPageR;     // clear window radius in screen px
uniform float uPageSoft;
uniform float uCollapse;  // final lens collapse 0..1

/* per-frame quantities that used to be recomputed for every pixel */
uniform vec4  uCrestR;    // crest ring radius, 0 when that crest is not born yet
uniform vec4  uCrestW;    // crest ring width
uniform vec4  uCrestFade; // crest energy (0 when not born)
uniform vec4  uCrestWob;  // crest angular wobble amplitude
uniform float uDropFlash; // exp(-dropAge*15) while the drop has landed, else 0
uniform float uBeadAmp;   // pre-impact bead strength, 0 when not gathering
uniform float uBeadInvR2; // 1 / bead radius^2
uniform float uFlashK;    // 1 / (R0 * 0.05)^2
uniform float uCollapseEdge;
uniform float uShrinkR;
uniform float uGlass;

uniform vec3 uCore;
uniform vec3 uMid;
uniform vec3 uEdge;
uniform vec3 uWash;
uniform vec3 uGlow;
uniform vec3 uLine;
uniform vec3 uCaustic;
uniform vec3 uMote;
uniform vec3 uShade;

uniform float uGlowK;
uniform float uWashK;
uniform float uLineK;
uniform float uCausticK;
uniform float uMoteK;
uniform float uShadeK;

const float PI = 3.14159265;
const float IMPACT = 0.10;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
  return vec2(hash21(p), hash21(p + 17.17));
}

/* one jittered glint per cell; evaluated in scene space, so the lens turns
   each dot into the same ellipse a real lens would */
float motes(vec2 q, float t) {
  const float CELL = 152.0;
  vec2 p = q / CELL;
  p.y -= t * 0.012;
  p.x += t * 0.004;
  vec2 id = floor(p);
  vec2 local = fract(p);
  vec2 rnd = hash22(id);
  vec2 pos = 0.2 + rnd * 0.6;
  float pick = hash21(id + 41.7);
  float present = step(0.32, pick);
  float twinkle = 0.58 + 0.42 * sin(t * (0.7 + rnd.x * 1.6) + pick * 6.2831);
  float d = length((local - pos) * CELL);
  float r = 0.8 + rnd.y * 1.9;
  float core = 1.0 - smoothstep(r, r + 1.4, d);
  float halo = (1.0 - smoothstep(r, r * 4.5, d)) * 0.16;
  return (core + halo) * present * twinkle;
}

/* analytic inverse of the barrel projection below. sceneR -> screenR is
   R0 * Z * sin(x*A)/sin(A), so screenR -> sceneR is the asin branch. */
float lensSceneR(float screenR) {
  float z = max(uZoom, 0.001);
  float s = screenR / z;
  if (uA < 1e-4) return s;
  if (s <= uR0) {
    float u = clamp(s * uInvR0, 0.0, 1.0);
    float x = asin(clamp(u * uLensSin, 0.0, 1.0)) * uLensInvA;
    return x * uR0;
  }
  return uR0 + (s - uR0);
}

/* distance to the nearest line, antialiased in screen space; fades when the
   lens squeezes the far rim so the compressed grid never shimmers. The
   derivative is computed once by the caller and shared by both layers. */
float gridLayer(vec2 q, float spacing, float aaFade, vec2 fw) {
  vec2 cell = abs(fract(q / spacing + 0.5) - 0.5) * spacing;
  vec2 line = 1.0 - smoothstep(fw * 0.35, fw * 1.15, cell);
  return max(line.x, line.y) * aaFade;
}

float causticNet(vec2 q, float t) {
  vec2 p = q * 0.017;
  float a = sin(p.x * 2.2 + sin(p.y * 1.8 + t * 0.75) * 1.7 + t * 0.35);
  float b = sin(p.y * 2.0 + sin(p.x * 2.4 - t * 0.58) * 1.5 - t * 0.3);
  float c = sin((p.x + p.y) * 1.6 + sin((p.x - p.y) * 1.8 + t * 0.5) * 1.4 + t * 0.2);
  float ridge = 1.0 - clamp(abs(a + b + c * 0.7) / 2.2, 0.0, 1.0);
  float r2 = ridge * ridge;
  float r4 = r2 * r2;
  return r4 * r4 * r4;
}

/* one crest of the wake. The phase is a literal at each call site, so the
   sin/cos of the four angular offsets fold at compile time. */
void addCrest(float rr, float w, float fade, float wobAmp, float ph,
              float sin4a, float cos4a, float sceneR, float ripR,
              inout float crest, inout float slope) {
  if (fade <= 0.0) return;
  float wob = (sin4a * cos(ph) + cos4a * sin(ph)) * wobAmp;
  float d = (sceneR - (rr + wob)) / w;
  float g = exp(-d * d);
  float edge = 1.0 - smoothstep(ripR * 0.62, ripR, sceneR);
  crest += g * fade * edge;
  slope += -d * g * fade * edge;
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uRes.y * uPixelScale - gl_FragCoord.y) / uPixelScale;
  vec2 p = frag - uCenter;
  float s = length(p);

  /* The angle is only consumed as sin/cos, so it is never materialised:
     sin(4a)/cos(4a) come straight from the normalised offset, and the tiny
     ripple rotation is a first-order direction rotation. This replaces
     atan() + six trig calls with multiplies. */
  float invS = s > 1e-4 ? 1.0 / s : 0.0;
  vec2 dir = vec2(p.x * invS, p.y * invS);
  if (s <= 1e-4) dir = vec2(1.0, 0.0);
  float dx2 = dir.x * dir.x;
  float dy2 = dir.y * dir.y;
  float sin4a = 4.0 * dir.x * dir.y * (dx2 - dy2);
  float cos4a = (dx2 - dy2) * (dx2 - dy2) - 4.0 * dx2 * dy2;

  /* the lens is a disc: inside it the water is projected through the
     barrel mapping, outside it stays flat until the rim sweeps past */
  float lensSoft = 14.0 + 34.0 * uLens;
  float lensMask = 1.0 - smoothstep(uLensR - lensSoft, uLensR + lensSoft, s);
  float sceneR = mix(s / uZoom, lensSceneR(s), lensMask);

  /* --- the drop launches a ring train; the wake retracts later ----------
     The per-crest age is resolved on the CPU and arrives as uniforms, so
     the four exp()/smoothstep() terms are no longer per-pixel work. */
  float crest = 0.0;
  float slope = 0.0;
  addCrest(uCrestR.x, uCrestW.x, uCrestFade.x, uCrestWob.x, 0.0,
           sin4a, cos4a, sceneR, uRipR, crest, slope);
  addCrest(uCrestR.y, uCrestW.y, uCrestFade.y, uCrestWob.y, 1.9,
           sin4a, cos4a, sceneR, uRipR, crest, slope);
  addCrest(uCrestR.z, uCrestW.z, uCrestFade.z, uCrestWob.z, 3.8,
           sin4a, cos4a, sceneR, uRipR, crest, slope);
  addCrest(uCrestR.w, uCrestW.w, uCrestFade.w, uCrestWob.w, 5.7,
           sin4a, cos4a, sceneR, uRipR, crest, slope);

  float ripEnv = exp(-sceneR * uRipInv) *
                 (1.0 - smoothstep(uRipR * 0.72, uRipR, sceneR));
  float phase = sceneR * uInvWl - uTime * 5.2;
  float wave = sin(phase) * ripEnv * uRipple;
  float sc = 0.5 + 0.5 * sin(phase + 0.7);
  float sc2 = sc * sc;
  float softCrest = sc2 * sc2 * ripEnv * uRipple;
  float disp = slope * uR0 * 0.030 + wave * uR0 * 0.013;
  float dispA = slope * 0.003 + wave * 0.004;
  float warpR = sceneR + disp;
  /* |dispA| stays in the milliradian range; the 5th-order Taylor tail is
     far below one 8-bit channel step, so this is visually exact. */
  float da2 = dispA * dispA;
  float cosD = 1.0 - 0.5 * da2 + da2 * da2 * (1.0 / 24.0);
  float sinD = dispA - dispA * da2 * (1.0 / 6.0);
  vec2 q = vec2(dir.x * cosD - dir.y * sinD,
                dir.y * cosD + dir.x * sinD) * warpR;
  float undulate = 0.4 + 0.6 * uRipple;
  q += vec2(
    sin(q.y * 0.0075 + uTime * 0.55) * 3.2 + sin(q.y * 0.021 - uTime * 0.3) * 1.1,
    cos(q.x * 0.0085 - uTime * 0.48) * 3.0 + cos(q.x * 0.023 + uTime * 0.26) * 0.9
  ) * undulate;

  /* --- water body ------------------------------------------------------- */
  float depth = clamp(s * uInvR0, 0.0, 1.0);
  vec3 col = mix(uCore, uMid, smoothstep(0.0, 0.62, depth));
  col = mix(col, uEdge, smoothstep(0.4, 1.03, depth));
  col = mix(col, uWash, uLens * uWashK);

  float glow = exp(-depth * depth * 5.2);
  col += uGlow * uGlowK * glow * (1.0 - 0.25 * uLens);

  float flash = uDropFlash * exp(-s * s * uFlashK);
  col += uGlow * flash * 0.6;

  if (uBeadAmp > 0.0) {
    float bead = exp(-s * s * uBeadInvR2);
    col += uGlow * bead * uBeadAmp;
  }

  /* --- caustics, ripple crests and the grid ----------------------------- */
  float pool = exp(-depth * depth * 4.0);
  float blotch = 0.55 + 0.45 * sin(q.x * 0.0042 + uTime * 0.25 +
                                    sin(q.y * 0.0037 - uTime * 0.18) * 2.0);
  float caus = causticNet(q, uTime) * (0.12 + 0.88 * pool) *
               (0.55 + 0.45 * blotch) * (0.7 + 0.3 * (1.0 - depth));
  col = mix(col, uCaustic, clamp(caus * uCausticK, 0.0, 0.35));

  col = mix(col, uCaustic,
            clamp(crest * (0.30 + 0.14 * uLens) + softCrest * 0.34, 0.0, 0.66));
  col += uGlow * (crest * 0.03 + softCrest * 0.02);

  vec2 fw = max(fwidth(q), vec2(1e-4));
  float aaFade = 1.0 - 0.38 * smoothstep(4.0, 10.0, max(fw.x, fw.y));
  float minor = gridLayer(q, 56.0, aaFade, fw);
  float major = gridLayer(q, 56.0 * 5.0, aaFade, fw);
  float grid = (minor * 0.085 + major * 0.18) * uLineK *
               (0.9 + 0.95 * uLens + 0.8 * uCollapse);
  col = mix(col, uLine, clamp(grid, 0.0, 0.6));
  col += uLine * major * (0.035 * uLens + 0.05 * uCollapse);

  float mot = motes(q, uTime);
  col = mix(col, uMote, clamp(mot * uMoteK, 0.0, 0.9));

  /* --- the glass rim sweeping outward ---------------------------------- */
  float rbA = (s - uLensR) / max(1.0, lensSoft * 0.42);
  float rcA = (s - uLensR) / max(0.8, lensSoft * 0.11);
  float rimBand = exp(-rbA * rbA) * uLensRim;
  float rimCore = exp(-rcA * rcA) * uLensRim;
  col = mix(col, uCaustic, clamp(rimBand * 0.7, 0.0, 0.78));
  col += uGlow * (rimBand * 0.1 + rimCore * 0.14);

  float edge = smoothstep(0.56, 1.02, depth);
  col = mix(col, uShade, edge * (0.08 + 0.18 * uLens) * uShadeK);
  col.r += edge * 0.02 * uLens;
  col.b += edge * 0.035 * uLens;
  col += uLine * edge * 0.03 * uLens;
  col = clamp(col, 0.0, 1.0);

  /* --- the page grows in through the middle; glass stays on the rim ----- */
  float win = 1.0 - smoothstep(uPageR - uPageSoft, uPageR + uPageSoft, s);
  float alpha = clamp(1.0 - uPage * mix(0.46, 0.9, win), 0.0, 1.0);

  /* --- the whole lens is sucked into the centre -------------------------
     A circular aperture closes on the water; a bright edge rides that
     aperture inward so the collapse reads as one lens, not a fade. */
  float aperture = 1.0 - smoothstep(uShrinkR - 7.0, uShrinkR + 7.0, s);
  float lrA = (s - uShrinkR) / (2.5 + 11.0 * uCollapse);
  float rcB = (s - uShrinkR) / 1.25;
  float lensRing = exp(-lrA * lrA) * uCollapseEdge;
  float ringCore = exp(-rcB * rcB) * uCollapseEdge;
  col = mix(col, uCaustic, clamp(lensRing * 0.8, 0.0, 0.85));
  col += uGlow * ringCore * 0.18;
  alpha = max(alpha, uGlass) * aperture;
  alpha = max(alpha, lensRing * 0.62 * aperture);
  alpha = max(alpha, ringCore * 0.55 * aperture);

  outColor = vec4(col * alpha, alpha);
}
`;

function makeShader(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  return sh;
}

/* Always resolves to an engine or null; the caller may swap to the 2D path.
   With KHR_parallel_shader_compile the expensive GPU-side compile/link runs
   while the main thread keeps booting the page, instead of blocking it at
   exactly the moment a cold browser is still warming its GPU process up. */
function createGLEngine(canvas, pal) {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    /* 'default' lets a hybrid laptop keep the iGPU awake: asking for the
       discrete GPU on the first launch after boot can stall the whole GPU
       process while the driver powers it up, which reads as a dead splash */
    powerPreference: 'default',
    failIfMajorPerformanceCaveat: true,
  });
  if (!gl) return Promise.resolve(null);
  canvas.dataset.engine = 'webgl2';

  const vs = makeShader(gl, gl.VERTEX_SHADER, VERT);
  const fs = makeShader(gl, gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) return Promise.resolve(null);
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);

  let quality = 1;
  let geom = { w: 0, h: 0, cx: 0, cy: 0, R0: 1, scale: 1 };
  let lost = false;
  let disposed = false;
  let lostHandler = null;
  let buf = null;

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    lost = true;
    if (lostHandler) lostHandler();
  });

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    let scale = Math.min(window.devicePixelRatio || 1, 1.5) * quality;
    const budget = 2.2e6;
    const px = w * h * scale * scale;
    if (px > budget) scale *= Math.sqrt(budget / px);
    scale = Math.max(0.5, scale);

    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    gl.viewport(0, 0, canvas.width, canvas.height);

    /* the drop and the lens share the true centre of the screen; this also
       makes the circular collapse clip below exact */
    const cx = w * 0.5;
    const cy = h * 0.5;
    const R0 = Math.sqrt(w * w + h * h) * 0.5;
    geom = { w, h, cx, cy, R0, scale };
  }

  /* per-frame crest parameters, reused so the draw path allocates nothing */
  const crestR = new Float32Array(4);
  const crestW = new Float32Array(4);
  const crestFade = new Float32Array(4);
  const crestWob = new Float32Array(4);

  let U = null;

  function draw(st) {
    if (lost || gl.isContextLost()) return false;
    const { w, h, cx, cy, R0, scale } = geom;
    gl.uniform2f(U.uRes, w, h);
    gl.uniform2f(U.uCenter, cx, cy);
    gl.uniform1f(U.uPixelScale, scale);
    gl.uniform1f(U.uR0, R0);
    gl.uniform1f(U.uInvR0, 1 / R0);
    gl.uniform1f(U.uRipInv, 1 / (R0 * 1.05));
    gl.uniform1f(U.uInvWl, 1 / (R0 * 0.085));
    gl.uniform1f(U.uFlashK, 400 / (R0 * R0));
    gl.uniform1f(U.uTime, st.time);
    gl.uniform1f(U.uA, st.A);
    gl.uniform1f(U.uLensSin, st.A > 1e-4 ? Math.sin(st.A) : 0);
    gl.uniform1f(U.uLensInvA, st.A > 1e-4 ? 1 / st.A : 0);
    gl.uniform1f(U.uZoom, st.Z);
    gl.uniform1f(U.uLens, st.lens);
    gl.uniform1f(U.uLensR, st.lensR);
    gl.uniform1f(U.uLensRim, st.lensRim);
    gl.uniform1f(U.uRipple, st.ripple);
    gl.uniform1f(U.uRipR, st.ripR);
    gl.uniform1f(U.uPage, st.page);
    gl.uniform1f(U.uPageR, st.pageR);
    gl.uniform1f(U.uPageSoft, st.pageSoft);
    gl.uniform1f(U.uCollapse, st.collapse);

    /* the drop's ring train and bead are resolved here, once per frame,
       instead of paying four exp()/smoothstep() pairs on every pixel */
    const dropAge = st.time - DROP_AT;
    gl.uniform1f(U.uDropFlash, dropAge >= 0 ? Math.exp(-dropAge * 15) : 0);
    let beadAmp = 0;
    let beadInvR2 = 0;
    if (dropAge < 0) {
      const gather = clamp01(1 + dropAge / DROP_AT);
      const beadR = R0 * (0.006 + 0.011 * gather);
      beadAmp = gather * gather * 0.38;
      beadInvR2 = 1 / (beadR * beadR);
    }
    gl.uniform1f(U.uBeadAmp, beadAmp);
    gl.uniform1f(U.uBeadInvR2, beadInvR2);
    for (let i = 0; i < 4; i++) {
      const age = dropAge - i * 0.085;
      if (age > 0) {
        crestR[i] = age * R0 * 0.8;
        crestW[i] = 3.5 + age * 30;
        crestFade[i] = Math.exp(-age * 1.5) * smoothstep(0, 0.045, age);
        crestWob[i] = 1.2 + age * 5.5;
      } else {
        crestR[i] = 0;
        crestW[i] = 1;
        crestFade[i] = 0;
        crestWob[i] = 0;
      }
    }
    gl.uniform4fv(U.uCrestR, crestR);
    gl.uniform4fv(U.uCrestW, crestW);
    gl.uniform4fv(U.uCrestFade, crestFade);
    gl.uniform4fv(U.uCrestWob, crestWob);

    const collapseEdge = st.collapse > 0
      ? Math.pow(Math.max(0, Math.sin(Math.PI * st.collapse)), 0.7)
      : 0;
    gl.uniform1f(U.uCollapseEdge, collapseEdge);
    gl.uniform1f(U.uShrinkR, R0 * (1 - st.collapse * st.collapse));
    gl.uniform1f(U.uGlass, 0.24 * collapseEdge * smoothstep(0.12, 0.4, st.collapse));

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return true;
  }

  function degrade() {
    if (quality < 0.8) return;
    quality = 0.72;
    resize();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    gl.deleteBuffer(buf);
    gl.deleteProgram(prog);
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  }

  function onLost(fn) {
    lostHandler = fn;
  }

  function finishSetup() {
    if (lost || gl.isContextLost()) return null;
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.warn('[splash] shader compile failed:', gl.getShaderInfoLog(vs));
      return null;
    }
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.warn('[splash] shader compile failed:', gl.getShaderInfoLog(fs));
      return null;
    }
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[splash] program link failed:', gl.getProgramInfoLog(prog));
      return null;
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(prog);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0);

    const names = [
      'uRes', 'uCenter', 'uPixelScale', 'uR0', 'uInvR0', 'uTime',
      'uA', 'uLensSin', 'uLensInvA', 'uZoom',
      'uLens', 'uLensR', 'uLensRim', 'uRipple', 'uRipR', 'uRipInv', 'uInvWl',
      'uPage', 'uPageR', 'uPageSoft', 'uCollapse',
      'uCrestR', 'uCrestW', 'uCrestFade', 'uCrestWob',
      'uDropFlash', 'uBeadAmp', 'uBeadInvR2', 'uFlashK',
      'uCollapseEdge', 'uShrinkR', 'uGlass',
      'uCore', 'uMid', 'uEdge', 'uWash', 'uGlow', 'uLine', 'uCaustic', 'uMote', 'uShade',
      'uGlowK', 'uWashK', 'uLineK', 'uCausticK', 'uMoteK', 'uShadeK',
    ];
    U = {};
    for (const n of names) U[n] = gl.getUniformLocation(prog, n);
    gl.uniform3fv(U.uCore, pal.gl.core);
    gl.uniform3fv(U.uMid, pal.gl.mid);
    gl.uniform3fv(U.uEdge, pal.gl.edge);
    gl.uniform3fv(U.uWash, pal.gl.wash);
    gl.uniform3fv(U.uGlow, pal.gl.glow);
    gl.uniform3fv(U.uLine, pal.gl.line);
    gl.uniform3fv(U.uCaustic, pal.gl.caustic);
    gl.uniform3fv(U.uMote, pal.gl.mote);
    gl.uniform3fv(U.uShade, pal.gl.shade);
    gl.uniform1f(U.uGlowK, pal.gl.glowK);
    gl.uniform1f(U.uWashK, pal.gl.washK);
    gl.uniform1f(U.uLineK, pal.gl.lineK);
    gl.uniform1f(U.uCausticK, pal.gl.causticK);
    gl.uniform1f(U.uMoteK, pal.gl.moteK);
    gl.uniform1f(U.uShadeK, pal.gl.shadeK);

    resize();
    return { kind: 'gl', resize, draw, degrade, dispose, onLost };
  }

  /* older browsers compile synchronously, as before; modern ones hand the
     work to the GPU process and let us poll without blocking paint */
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  if (!parallel) return Promise.resolve(finishSetup());

  return new Promise((resolve) => {
    const started = performance.now();
    const poll = () => {
      if (lost || gl.isContextLost()) {
        resolve(null);
        return;
      }
      let done = false;
      try {
        done = gl.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR);
      } catch {
        done = true;
      }
      if (done) {
        resolve(finishSetup());
      } else if (performance.now() - started > 5000) {
        resolve(null);
      } else {
        setTimeout(poll, 24);
      }
    };
    poll();
  });
}

/* ------------------------------------------------- 2D fallback (no WebGL) */

function create2DEngine(canvas, pal) {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return null;
  canvas.dataset.engine = '2d';
  const f = pal.flat;
  const sprite = makeMoteSprite(pal);
  let geom = { w: 0, h: 0, cx: 0, cy: 0, R0: 1, dpr: 1 };
  let fieldGrad = null;
  let glowGrad = null;
  let motes = [];
  let lastPaint = 0;
  let flatGrid = null;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    const budget = 1.5e6;
    const px = w * h * dpr * dpr;
    if (px > budget) dpr *= Math.sqrt(budget / px);
    dpr = Math.max(0.4, dpr);

    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = w * 0.5;
    const cy = h * 0.5;
    const R0 = Math.sqrt(w * w + h * h) * 0.5;
    geom = { w, h, cx, cy, R0, dpr };
    flatGrid = null;

    fieldGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R0 * 1.04);
    for (const [p, c] of f.field) fieldGrad.addColorStop(p, c);
    glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R0 * 0.52);
    glowGrad.addColorStop(0, `rgba(${f.glow},0.3)`);
    glowGrad.addColorStop(0.42, `rgba(${f.glow},0.08)`);
    glowGrad.addColorStop(1, `rgba(${f.glow},0)`);

    const n = Math.round(Math.min(90, Math.max(36, (w * h) / 18000)));
    motes = [];
    for (let i = 0; i < n; i++) {
      motes.push({
        ang: Math.random() * TAU,
        rr: 0.05 + Math.sqrt(Math.random()) * 0.95,
        s: 0.5 + Math.random() * 1.4,
        a: 0.2 + Math.random() * 0.55,
        vr: 0.004 + Math.random() * 0.016,
        tw: 0.5 + Math.random() * 1.4,
        ph: Math.random() * TAU,
      });
    }
  }

  function warpR(r, A, Z, sinA) {
    if (A < 1e-4) return r * Z;
    const x = Math.min(1, r / geom.R0);
    const over = r > geom.R0 ? r - geom.R0 : 0;
    return (Math.sin(x * A) / (sinA || Math.sin(A))) * geom.R0 * Z + over * Z;
  }

  function project(sx, sy, A, Z, sinA) {
    const r = Math.sqrt(sx * sx + sy * sy);
    if (r < 1e-4) return [geom.cx, geom.cy];
    const R = warpR(r, A, Z, sinA);
    return [geom.cx + (sx / r) * R, geom.cy + (sy / r) * R];
  }

  /* Before the lens grows the projection is the identity; the straight
     notebook grid is then rasterised once per resize and blitted, instead
     of re-projecting ~1500 points on every frame (the Via/WebView path). */
  function buildFlatGrid() {
    const { w, h, cx, cy, R0, dpr } = geom;
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(w * dpr));
    cv.height = Math.max(1, Math.round(h * dpr));
    const g = cv.getContext('2d');
    if (!g) return null;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.lineWidth = 1;
    const half = R0 * 1.02;
    for (const [step, alpha] of [
      [280, 0.2],
      [56, 0.09],
    ]) {
      const count = Math.ceil(half / step);
      g.beginPath();
      for (let i = -count; i <= count; i++) {
        const off = i * step;
        g.moveTo(cx + off, cy - half);
        g.lineTo(cx + off, cy + half);
        g.moveTo(cx - half, cy + off);
        g.lineTo(cx + half, cy + off);
      }
      g.strokeStyle = `rgba(${f.line},${alpha * f.lineK})`;
      g.stroke();
    }
    return cv;
  }

  function drawShells(A, Z, lens, sinA) {
    const { cx, cy, R0 } = geom;
    ctx.beginPath();
    for (let i = 1; i <= 12; i++) {
      const r = (i / 12) * R0 * 0.98;
      const R = warpR(r, A, Z, sinA);
      ctx.moveTo(cx + R, cy);
      ctx.arc(cx, cy, Math.max(0.5, R), 0, TAU);
    }
    ctx.strokeStyle = `rgba(${f.caustic},${0.032 * f.causticK * (0.7 + 0.5 * lens)})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawGrid(st) {
    const { cx, cy, R0 } = geom;
    const A = st.A;
    const Z = st.Z;

    if (A < 1e-4) {
      if (!flatGrid) flatGrid = buildFlatGrid();
      if (flatGrid) {
        ctx.globalAlpha = 0.9 + 0.95 * st.lens;
        ctx.drawImage(flatGrid, 0, 0, geom.w, geom.h);
        ctx.globalAlpha = 1;
        drawShells(A, Z, st.lens, 0);
        return;
      }
    }

    const sinA = A < 1e-4 ? 0 : Math.sin(A);
    const half = R0 * 1.02;
    const steps = 20;
    const minor = 56;
    const major = 280;

    ctx.lineWidth = 1;
    for (const [step, alpha] of [
      [major, 0.2],
      [minor, 0.09],
    ]) {
      const count = Math.ceil(half / step);
      ctx.beginPath();
      for (let i = -count; i <= count; i++) {
        const off = i * step;
        for (let k = 0; k <= steps; k++) {
          const v = -half + (2 * half * k) / steps;
          const pt = project(off, v, A, Z, sinA);
          if (k === 0) ctx.moveTo(pt[0], pt[1]);
          else ctx.lineTo(pt[0], pt[1]);
        }
      }
      for (let i = -count; i <= count; i++) {
        const off = i * step;
        for (let k = 0; k <= steps; k++) {
          const v = -half + (2 * half * k) / steps;
          const pt = project(v, off, A, Z, sinA);
          if (k === 0) ctx.moveTo(pt[0], pt[1]);
          else ctx.lineTo(pt[0], pt[1]);
        }
      }
      ctx.strokeStyle = `rgba(${f.line},${alpha * f.lineK * (0.9 + 0.95 * st.lens)})`;
      ctx.stroke();
    }

    /* concentric shells bunch up under the lens — the second distortion cue */
    drawShells(A, Z, st.lens, sinA);
  }

  function drawCrests(st) {
    const { cx, cy, R0 } = geom;
    const sinA = st.A < 1e-4 ? 0 : Math.sin(st.A);
    for (let i = 0; i < 4; i++) {
      const age = st.time - 0.10 - i * 0.085;
      if (age <= 0) continue;
      const rr = age * R0 * 0.8;
      if (rr > st.ripR) continue;
      const R = warpR(rr, st.A, st.Z, sinA);
      const a = Math.exp(-age * 1.5) * 0.42;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.strokeStyle = `rgba(${f.caustic},${a * f.causticK})`;
      ctx.lineWidth = Math.max(1, 1 + age * 3.2);
      ctx.stroke();
    }

    if (st.lensRim > 0.01 && st.lensR < R0 * 1.04) {
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(0.5, st.lensR), 0, TAU);
      ctx.strokeStyle = `rgba(${f.caustic},${0.3 * st.lensRim})`;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
  }

  function drawMotes(st, dt) {
    const { cx, cy, R0 } = geom;
    const sinA = st.A < 1e-4 ? 0 : Math.sin(st.A);
    ctx.globalCompositeOperation = f.additive ? 'lighter' : 'source-over';
    for (const m of motes) {
      m.rr += m.vr * dt * (1 + 2.2 * st.lens);
      if (m.rr > 1.06) {
        m.rr -= 1.06;
        m.ang = Math.random() * TAU;
      }
      const sceneR = m.rr * R0;
      const R = warpR(sceneR, st.A, st.Z, sinA);
      const mag = st.A < 1e-4 ? st.Z : ((st.A * Math.cos(Math.min(1, sceneR / R0) * st.A)) / (sinA || Math.sin(st.A))) * st.Z;
      const twinkle = 0.62 + 0.38 * Math.sin(st.time * 1.7 * m.tw + m.ph);
      const a = Math.min(1, m.a * twinkle * f.moteA);
      if (a < 0.012) continue;
      const x = cx + Math.cos(m.ang) * R;
      const y = cy + Math.sin(m.ang) * R;
      const size = m.s * Math.max(0.3, mag) * 3.2;
      ctx.globalAlpha = a;
      ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function draw(st) {
    const { w, h, cx, cy } = geom;
    if (st.now - lastPaint < 32) return true;
    const dt = Math.min(0.08, (st.now - lastPaint) / 1000 || 0.016);
    lastPaint = st.now;
    ctx.setTransform(geom.dpr, 0, 0, geom.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const shrink = 1 - st.collapse * st.collapse;
    const shrinkR = geom.R0 * 1.06 * shrink;
    ctx.save();
    if (st.collapse > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(0.5, shrinkR), 0, TAU);
      ctx.clip();
    }

    ctx.fillStyle = f.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = fieldGrad;
    ctx.fillRect(0, 0, w, h);
    if (st.lens > 0.005) {
      ctx.fillStyle = `rgba(${f.wash},${0.32 * f.washK * st.lens})`;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.globalCompositeOperation = f.additive ? 'lighter' : 'source-over';
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';

    /* the drop itself: a bead gathering just before the impact, then a flash */
    const dropAge = st.time - 0.10;
    if (dropAge > -0.10 && dropAge < 1.1) {
      const rad = dropAge < 0
        ? geom.R0 * (0.018 + 0.03 * clamp01(1 + dropAge / 0.10))
        : geom.R0 * 0.2;
      const a = dropAge < 0
        ? 0.22 + 0.4 * clamp01(1 + dropAge / 0.10)
        : Math.exp(-dropAge * 10) * 0.75;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, `rgba(${f.mote},${a})`);
      g.addColorStop(0.35, `rgba(${f.glow},${a * 0.4})`);
      g.addColorStop(1, `rgba(${f.glow},0)`);
      ctx.globalCompositeOperation = f.additive ? 'lighter' : 'source-over';
      ctx.fillStyle = g;
      ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
      ctx.globalCompositeOperation = 'source-over';
    }

    drawGrid(st);
    drawCrests(st);
    drawMotes(st, dt);

    if (st.page > 0) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(0,0,0,${0.42 * st.page})`;
      ctx.fillRect(0, 0, w, h);

      const inner = Math.max(0, st.pageR - st.pageSoft);
      const g = ctx.createRadialGradient(cx, cy, inner, cx, cy, Math.max(inner + 1, st.pageR + st.pageSoft));
      g.addColorStop(0, `rgba(0,0,0,${0.9 * st.page})`);
      g.addColorStop(0.6, `rgba(0,0,0,${0.55 * st.page})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';

      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1, st.pageR), 0, TAU);
      ctx.strokeStyle = `rgba(${f.caustic},${0.16 * (1 - st.page)})`;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    if (st.collapse > 0) {
      const ringA = Math.pow(Math.max(0, Math.sin(Math.PI * st.collapse)), 0.7);
      const glass = 0.2 * ringA * smoothstep(0.12, 0.4, st.collapse);
      if (glass > 0.004) {
        ctx.fillStyle = `rgba(${f.caustic},${glass})`;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(0.5, shrinkR), 0, TAU);
        ctx.fill();
      }
    }

    ctx.restore();

    if (st.collapse > 0) {
      const ringA = Math.pow(Math.max(0, Math.sin(Math.PI * st.collapse)), 0.7);
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(0.5, shrinkR), 0, TAU);
      ctx.strokeStyle = `rgba(${f.caustic},${0.55 * ringA})`;
      ctx.lineWidth = 1.5 + 2.5 * st.collapse;
      ctx.stroke();
    }
    return true;
  }

  resize();
  return { kind: '2d', resize, draw, degrade() {}, dispose() {} };
}

/* ---------------------------------------------------------------- lifecycle */

export function isSplashPending() {
  return document.documentElement.classList.contains('splash-pending');
}

/** returns a `reveal()` callback (no-op when there is no splash) */
export function initSplash() {
  const root = document.documentElement;
  if (!root.classList.contains('splash-pending')) return () => {};
  const el = document.getElementById('splash');
  if (!el) {
    root.classList.remove('splash-pending');
    return () => {};
  }

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let canvas = el.querySelector('.splash-lens');
  if (reduced || !canvas) {
    /* No animation (reduced motion, or no canvas): keep the matching solid
       shell until the app has a first screen, then drop it. This also covers
       the early-boot case, where removing it now would expose an empty
       #page-stage while the app modules are still loading. */
    return () => {
      root.classList.remove('splash-pending');
      el.remove();
    };
  }

  const pal = palette();
  const force2D = /(?:^|[?&])splash2d=1/.test(location.search);

  let engine = null;
  let pageReady = false;
  let enterAt = 0;
  let collapseAt = 0;
  let lensMarked = false;
  let shrinkStyled = false;
  let pageLens = null;
  let pageLensPrepared = false;
  let finished = false;
  let started = false;
  let t0 = 0;
  let lag = 0;
  let lastFrame = 0;
  let firstFrame = true;
  let swapping = false;
  let raf = 0;
  let perfAcc = 0;
  let perfN = 0;
  let perfSlow = 0;
  let perfChecked = false;
  let maxWait = 0;
  let appStarted = false;
  let warpSteps = 24;
  let geo = null;

  if (window.__cyanoteSplashWatchdog) {
    clearTimeout(window.__cyanoteSplashWatchdog);
    window.__cyanoteSplashWatchdog = 0;
  }

  function geometry() {
    if (geo) return geo;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const R0 = Math.sqrt(w * w + h * h) * 0.5;
    return (geo = { w, h, cx, cy, R0 });
  }

  function preparePageLens() {
    if (pageLensPrepared) return;
    const stage = document.getElementById('page-stage');
    if (!stage) return;
    pageLensPrepared = true;
    pageLens = createPageWarp(stage);
  }

  function setPageWarp(k) {
    if (!pageLens) return;
    /* quantised steps below one displacement-map pixel; 24 is imperceptible
       on a capable machine. A machine that has shown real stalls drops to
       12 so the collapse does not re-raster the SVG filter every frame. */
    const q = Math.round(clamp01(k) * warpSteps) / warpSteps;
    const scale = Math.round(pageLens.scaleMax * q * 10) / 10;
    if (scale === pageLens.last) return;
    pageLens.last = scale;
    pageLens.disp.setAttribute('scale', String(scale));
  }

  function applyPageLens() {
    preparePageLens();
    if (!pageLens || pageLens.active) return;
    setPageWarp(1);
    pageLens.stage.style.filter = 'url(#splash-page-fisheye)';
    pageLens.active = true;
  }

  function clearPageLens() {
    if (!pageLens) return;
    pageLens.stage.style.filter = '';
    pageLens.svg.remove();
    pageLens = null;
  }

  /* Tear the canvas down in two steps. Mobile Chromium (Via/WebView) can
     paint a scaled WebGL layer as an opaque grey tile (cc's 0xB0B0B0
     "missing tile" fill) for one frame when the element and its context
     vanish in the same compositor commit — the single-frame flash the phone
     recording shows as the intro ends. Take the shell out of the frame
     first, then drop the element and lose the context only after the
     compositor has committed that state. */
  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    clearTimeout(maxWait);
    clearPageLens();
    root.classList.remove('splash-pending');
    el.style.display = 'none';
    const dying = engine;
    engine = null;
    const drop = () => {
      el.remove();
      if (dying) {
        try {
          dying.dispose();
        } catch {
          /* already gone */
        }
      }
    };
    if (document.hidden) {
      drop();
      return;
    }
    /* let the hidden state commit, then leave a short grace before the
       context goes away: a queued raster of the scaled canvas must never be
       able to land on screen after the layer was dropped */
    requestAnimationFrame(() => setTimeout(drop, 120));
  }

  /* WebGL can be reset by a driver under load; fall back to the 2D painter
     on a fresh canvas so the remaining beats still play instead of the
     splash vanishing and the page popping in. */
  function swapTo2D() {
    if (finished || swapping || (engine && engine.kind === '2d')) return;
    swapping = true;
    const old = engine;
    engine = null;
    if (old) {
      try {
        old.dispose();
      } catch {
        /* already gone */
      }
    }
    const fresh = document.createElement('canvas');
    fresh.className = canvas.className;
    canvas.replaceWith(fresh);
    canvas = fresh;
    const e2 = create2DEngine(canvas, pal);
    if (!e2) {
      swapping = false;
      finish();
      return;
    }
    engine = e2;
    swapping = false;
    if (!started) start();
    else drawOnce(performance.now());
  }

  function start() {
    if (finished || started) return;
    started = true;
    if (window.__cyanoteAppStarted) appStarted = true;
    t0 = performance.now();
    lastFrame = t0;
    if (!drawOnce(t0)) return;
    window.addEventListener('resize', onResize);
    if (!pageReady) {
      clearTimeout(maxWait);
      /* if the app has already booted, its 2.3s budget applies; if the
         splash started first (early boot), give the page a longer cap and
         let appStart() tighten it when the router actually begins */
      maxWait = setTimeout(reveal, appStarted ? MAX_WAIT : BOOT_MAX_WAIT);
    }
    raf = requestAnimationFrame(tick);
  }

  /* main.js calls this right before it starts routing: from here on the
     2.3s "slow fetch" budget is the only reason to open the lens early */
  function appStart() {
    appStarted = true;
    if (!started || pageReady || finished) return;
    clearTimeout(maxWait);
    maxWait = setTimeout(reveal, MAX_WAIT);
  }

  function beginEnter(vt) {
    if (enterAt) return;
    enterAt = vt;
    collapseAt = vt + ENTER_SPAN;
    /* the page becomes visible through the shader window; the shell's flat
       colour must be gone by then or it would block the page */
    el.classList.add('is-revealing');
    applyPageLens();
  }

  function frameState(now) {
    const R0 = geometry().R0;
    const vt = now - lag;
    const elapsed = (vt - t0) / 1000;

    /* lens: disc radius leads, optical power arrives slightly earlier so the
       rim carries the distortion outward as it sweeps */
    const grew = clamp01((vt - t0 - LENS_START) / LENS_SPAN);
    const grow = easeInOutCubic(grew);
    const A = APEX * easeOutCubic(grew);
    const lensR = grow * R0 * 1.06;
    const lensRim = smoothstep(0.02, 0.16, grew) *
                    (1 - smoothstep(0.84, 0.99, grew)) * 0.9;

    /* wake: energy drains while its envelope retracts toward the middle */
    const contract = easeInOutCubic(clamp01((vt - t0 - 580) / 500));
    const ripR = R0 * (1.22 - 0.64 * contract);
    const ripple = elapsed < 0.1 ? 0 : 0.22 + 0.78 * Math.exp(-(elapsed - 0.1) / 0.75);

    let page = 0;
    let pageR = 0;
    if (enterAt) {
      page = easeInOutCubic(clamp01((vt - enterAt) / ENTER_SPAN));
      pageR = R0 * (0.1 + 0.6 * page);
    }

    const collapse = collapseAt ? clamp01((vt - collapseAt) / COLLAPSE_SPAN) : 0;

    return {
      now,
      time: elapsed,
      A,
      Z: 1,
      lens: grow,
      lensR,
      lensRim,
      ripple,
      ripR,
      page,
      pageR,
      pageSoft: R0 * 0.16,
      collapse,
    };
  }

  function drawOnce(now) {
    if (finished || !started || !engine) return false;
    const vt = now - lag;

    if (vt - t0 >= LENS_START && !lensMarked) {
      lensMarked = true;
      el.classList.add('is-lensing');
    }
    if (pageReady && !enterAt && vt >= t0 + ENTER_LEAD) beginEnter(vt);

    const st = frameState(now);
    if (!engine.draw(st)) {
      if (engine.kind === 'gl') {
        swapTo2D();
        return !finished;
      }
      finish();
      return false;
    }

    if (collapseAt) {
      if (!shrinkStyled) {
        shrinkStyled = true;
        canvas.style.transformOrigin = '50% 50%';
        canvas.style.backfaceVisibility = 'hidden';
        canvas.style.willChange = 'transform';
      }
      /* the shader aperture supplies the circular cut; scaling the canvas
         pulls the water, grid and rim inward with it */
      canvas.style.transform = `scale(${1 - 0.45 * st.collapse * st.collapse})`;
      /* the page straightens as the water lens closes */
      setPageWarp(1 - st.collapse * st.collapse);
      if (st.collapse >= 1) {
        finish();
        return false;
      }
    }
    return true;
  }

  function onResize() {
    geo = null;
    if (engine) engine.resize();
    if (started) drawOnce(performance.now());
  }

  function tick(now) {
    if (!el.isConnected || finished) {
      raf = 0;
      return;
    }
    raf = requestAnimationFrame(tick);
    if (document.hidden) {
      lastFrame = now;
      return;
    }
    const gap = lastFrame ? now - lastFrame : 0;
    lastFrame = now;

    /* Startup long tasks and cold-browser stalls must not eat the intro:
       keep the first frame at ~16ms of scene time, and for later gaps only
       let STALL_KEEP ms of each stall advance the timeline. */
    if (gap > 0) {
      if (firstFrame) {
        firstFrame = false;
        if (gap > 50) lag += gap - 16;
        if (gap > 200) warpSteps = 12;
      } else if (gap > STALL_MS) {
        lag += Math.min(gap - STALL_KEEP, Math.max(0, MAX_LAG - lag));
        if (gap > 200) warpSteps = 12;
      }
    }

    if (!drawOnce(now)) return;

    /* Measure while the lens is growing, not during startup: page-load long
       tasks must not make a capable GPU drop its backing store. Sustained
       slowness (18 frames) is what triggers the resolution step. */
    const dt = Math.min(50, gap || 16);
    if (!perfChecked && !collapseAt && now - lag - t0 > 780) {
      perfAcc += dt;
      perfN++;
      if (dt > 26) perfSlow++;
      if (perfN >= 18) {
        perfChecked = true;
        if (perfSlow >= 8 || perfAcc / perfN > 26) {
          engine.degrade();
          warpSteps = 12;
        }
      }
    }
  }

  /* stored on the window so the tiny early-boot loader can hand the app's
     readiness back to a splash that started before the app modules ran */
  function reveal() {
    if (pageReady || finished) return;
    pageReady = true;
    clearTimeout(maxWait);
    maxWait = 0;
    preparePageLens();
    if (!started || finished) return;
    const vt = performance.now() - lag;
    if (vt >= t0 + ENTER_LEAD) beginEnter(vt);
  }

  /* the wordmark is CSS-only: show it as soon as the shell paints, so a cold
     GPU compiling the shader still sees a designed screen, not a blank one */
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (!finished && el.isConnected) el.classList.add('is-playing');
  }));

  let enginePromise;
  try {
    enginePromise = force2D ? Promise.resolve(null) : createGLEngine(canvas, pal);
  } catch {
    enginePromise = Promise.resolve(null);
  }
  Promise.resolve(enginePromise).then(
    (next) => {
      if (finished) {
        if (next) next.dispose();
        return;
      }
      if (next) {
        engine = next;
        if (next.onLost) next.onLost(swapTo2D);
        start();
      } else {
        swapTo2D();
      }
    },
    () => swapTo2D()
  );

  window.__cyanoteSplashReveal = reveal;
  window.__cyanoteSplashAppStart = appStart;
  return reveal;
}
