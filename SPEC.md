# Portfolio build spec — Clayton Banks

A single-page, WebGL-heavy developer portfolio. The vibe: **Claude Code in a dark terminal,
but the accent is red, and the whole page is alive.** Think: boot sequence, monospace prompts,
`✻` spinners, red bloom, glitch, particles that assemble into things. Ambitious, but it must
still read cleanly and hit 60fps on an M-series laptop and stay usable on a phone.

## Stack (installed — do not add frameworks)
- Vite 8 + **vanilla TypeScript** (strict). No React.
- `three@0.186` (+ `three/examples/jsm/*` for EffectComposer, UnrealBloomPass, ShaderPass, OutputPass, FontLoader/TextGeometry if needed)
- `gsap@3.15` + ScrollTrigger (import from `src/core/motion.ts`, which registers it)
- `lenis` smooth scroll (already wired in `src/core/motion.ts` — don't create another)
- `animejs@4` — v4 API: `import { animate, stagger, createTimeline, svg, utils } from 'animejs'`.
  Use it for SVG line-drawing (`svg.createDrawable`), staggered grid/char effects, and the boot sequence.
  Check `node_modules/animejs/types` or `node_modules/animejs/dist` if unsure about a signature.
- You may add small, dependency-free packages only if truly needed (ask yourself first). Borrowing
  well-known open-source effects (Codrops-style shaders, text scramble, etc.) is encouraged — reimplement
  them in this codebase, credit in a comment.

## Hard rules (all agents)
1. **Stay in your lane.** Only create/edit files in the directories you own (listed per agent).
   Shared files you may READ but not edit: `index.html`, `src/main.ts`, `src/core/*`, `src/data/*`,
   `src/styles/base.css`. If you genuinely need a change in a shared file, write it in your final
   report instead of making it.
2. Your entry function signature in your `index.ts` must stay exactly as stubbed.
3. Each module group imports its own CSS (`import './projects.css'`) — use the tokens in
   `src/styles/base.css` (`var(--red)`, `var(--font-mono)` …). No raw hex in CSS except inside shaders/three colors.
4. Cross-module communication only via `src/core/bus.ts` events. Read the `BusEvents` interface.
5. `prefers-reduced-motion`: use `reducedMotion` from `src/core/motion.ts`. When true: no scroll-scrub,
   no continuous camera motion, no glitch; static or very gentle fades only. Content must be fully visible.
6. Mobile (`isMobile`, `isTouch`): everything works at 375px wide, no horizontal scroll, touch targets ≥ 44px,
   no hover-only information. Lower particle counts / DPR on mobile.
7. Accessibility: semantic HTML, real `<a>`/`<button>`, visible `:focus-visible`, alt text, `aria-*` where
   needed, the modal traps focus and closes on Escape. Text contrast ≥ 4.5:1 (`--text-dim` on `--bg` is fine;
   `--text-faint` is for decoration only).
8. No emoji as icons. Inline SVG icons (Lucide-style, 24×24 viewBox, 1.75 stroke). For GitHub/LinkedIn use
   the Simple Icons paths.
9. `npm run build` must pass (tsc strict, `noUnusedLocals`). Run it before you finish.
10. Don't commit. The lead will review and commit.

## Visual language
- Background `--bg #0a0a0b`, panels are translucent terminal windows (`.term` in base.css) floating over the 3D.
- Accent red `#ff3b3b`, hot `#ff5a4a`, deep `#c4161c`. Red is the ONLY chroma. Everything else is greys.
- Type: **Space Grotesk** for display (big, tight tracking, −0.035em), **JetBrains Mono** for everything UI-ish
  (prompts, labels, chips, nav, metadata).
- Motifs: shell prompts (`clayton@harare ~/work $`), blinking block cursor `▍`, Claude Code `✻` asterisk spinner
  (cycles `· ✢ ✳ ✶ ✻ ✽`) in red, `[ok]` / `[..]` log lines, ASCII box-drawing, scanlines, subtle RGB split on
  fast scroll, red bloom glow.
- Motion: ease-out `cubic-bezier(.16,1,.3,1)`, micro-interactions 150–300ms, reveals 600–1200ms, staggered.

## Page structure (mount points already in index.html)
| Mount | Owner | Content |
|---|---|---|
| `#boot` | UI | Full-screen boot: fake kernel/log lines typing fast (`[ok] mounting /dev/creativity` …), `✻` spinner, a progress bar, then the name in big type glitches in, then the overlay splits/wipes away (clip-path) revealing the site. ~2.8s total, **skippable** (click/any key), skipped entirely on reduced motion and on repeat visits in the same session (`sessionStorage`). |
| `#cursor` | UI | Desktop only: small red dot + lagging ring; grows/labels on `cursor:state` events ("VIEW", "OPEN", "DRAG"). Blend mode difference. Hidden on touch. |
| `.fx-overlay` | UI | CSS scanlines + vignette + animated film grain (SVG noise / canvas), pointer-events none, very subtle. |
| `#nav` | UI | Floating mono nav (inset from edges): logo `~/clayton`, links to sections with numbered labels (`01 about`), active-section indicator, live Harare clock (`Africa/Harare`), "available" pulse dot, mobile menu as full-screen terminal overlay. Hides on scroll down, shows on scroll up. |
| `#hero` | UI (DOM) + WebGL (3D) | 100vh. Left-aligned huge name `CLAYTON BANKS` with per-char reveal + scramble, role line typed out, tagline, two CTAs (`View work →` scrolls to #work, `Get in touch`), a small terminal widget showing `$ whoami` output. Scroll hint. The 3D core sits behind/right. |
| `#about` | UI | Section head `~/about $ cat README.md`. Terminal window that types the about paragraphs when scrolled into view, plus animated stat counters (`profile.stats`) and location chip. |
| `#work` | Projects | Flagship + featured projects (tier `flagship` / `featured`). See Projects agent. |
| `#archive` | Projects | `tier: 'more'` projects as a dense terminal `ls -la` style table/grid. |
| `#stack` | UI | Skills from `profile.skills`. Section head `~/stack $ tree`. Animated `tree`-style listing with anime.js stagger + an interactive skills visual (e.g. a draggable 3D tag sphere rendered with CSS 3D transforms, or a periodic-table grid that ripples from the pointer). |
| `#contact` | UI | Giant `LET'S BUILD` / `something.` headline with hover-distort, interactive terminal: user can type commands (`help`, `email`, `github`, `linkedin`, `projects`, `clear`, `sudo hire clayton`, `whoami`) with tab-complete + history; email copy-to-clipboard button with toast; social links. Must also have plain visible links so it works without typing. |
| `#footer` | UI | Mono line: `© 2026 Clayton Banks — built with three.js, gsap, anime.js — Harare, ZW`, back-to-top. |
| `#project-modal` | Projects | Project detail dialog. |
| `#webgl` canvas | WebGL | Fixed full-screen, behind everything. |

## WebGL agent — owns `src/webgl/**`
`initWebGL(canvas)` builds the persistent background world and resolves after first render.
- Renderer: antialias off when composer used, DPR `min(devicePixelRatio, isMobile ? 1.25 : 1.75)`,
  ACES tone mapping, transparent=false with clear color = `--bg`.
- Post: EffectComposer → RenderPass → **UnrealBloomPass** (red glows) → custom ShaderPass for
  **chromatic aberration** (strength driven by scroll velocity + `glitch` bus events) + **film grain** +
  subtle **scanline** + vignette → OutputPass. Adaptive: drop bloom resolution if frame time is high.
- **Hero centerpiece — "the core"**: a GPU particle system (custom ShaderMaterial, ~60–120k points desktop,
  ~20k mobile) that **morphs between target shapes** stored as extra attributes: (1) a dense sphere/brain-like
  noise blob, (2) a torus knot / DNA helix, (3) a point cloud spelling `CB` or `</>` (sample text via 2D canvas →
  points), (4) a flat grid/galaxy. Curl-noise drift in the vertex shader, red/white palette with additive blending,
  pointer repulsion (mouse pushes particles away), size attenuation, soft round sprites. Also a wireframe
  icosahedron shell with fresnel red glow rotating slowly around it, and orbiting rings with dashed lines.
- **Scroll choreography** (use `section:change` and `scroll` events, lerp everything):
  hero → core big on the right, shape 1; about → core moves left, morphs to shape 2;
  work → core shrinks/moves away, background becomes a perspective **red grid floor** (synthwave/terminal
  style, shader-drawn, scrolling) with data-stream particles; archive → shape 4 galaxy; stack → shape 3;
  contact → core returns center, pulses, morph to sphere, everything intensifies.
- `project:hover` → briefly tint/brighten particles with the accent, add a pulse ring.
- Ambient: starfield of tiny distant points with parallax, occasional "data packets" streaking along curves.
- Pointer parallax on camera (lerped). Resize handling. Pause rendering when tab hidden.
- `reducedMotion`: render a single still frame of the core (no animation loop beyond resize) or very slow.
- Organise as `stage.ts` (renderer/composer/loop), `core.ts` (particles), `shaders/*.glsl.ts` (as TS string exports),
  `grid.ts`, `stars.ts`, `post.ts`. Keep a frame budget: all of it should be ≲ 6ms GPU on an M3.

## Projects agent — owns `src/projects/**`
`initProjects()` renders `#work`, `#archive`, `#project-modal` from `src/data/projects.ts`.
- `#work` section head: `~/work $ ls --featured` / `Selected work`.
- **Flagship showcase** (3 flagship projects): each gets a large, cinematic block. Pinned scroll sequence
  (ScrollTrigger pin) where each project slides in: big index number `01`, title with split-char reveal
  (anime.js stagger), tagline, highlights rendered as `[ok]` log lines that type in, stack chips, links.
  Next to it, the project's screenshot on a **WebGL plane in its own small three.js canvas** (or one shared
  overlay canvas for the section) with a shader: RGB-shift + wave distortion driven by scroll velocity,
  hover ripple from the pointer, and a scanline/CRT reveal transition when the project changes.
  Screenshots are at `project.image` (`/shots/<id>.webp`) — **they may not exist**; if the image fails to load,
  generate procedural art instead (a canvas texture: terminal-styled title card with the project name, grid,
  noise and the accent color) so it never looks broken.
- **Featured grid** (tier `featured`): bento-style cards in terminal windows with 3D tilt on pointer
  (perspective + rotateX/Y, glare highlight following cursor), animated red border-trace on hover
  (SVG rect with anime.js stroke-dashoffset), image/procedural thumb, title, tagline, chips. Emits
  `project:hover` and `cursor:state` (`view`/"VIEW"). Click or Enter opens the modal.
- **`#archive`** (tier `more`): section head `~/archive $ ls -la`. Render like `ls -la` output: permissions
  string, year, size-ish column, name, tagline; rows reveal with a typed/stagger effect; hover row highlights red
  with a scramble on the name; click opens modal. On mobile, collapse to stacked rows.
- **Modal** (`#project-modal`): a `role="dialog"` terminal window that expands from the clicked card
  (FLIP animation), with image, description, highlights, stack, live/repo links (only if present), close button,
  focus trap, Escape to close, `lockScroll(true/false)` from motion.ts, emits `project:open`/`project:close`.
  Prev/next project navigation.
- Category filter chips above the featured grid (`All / AI / Web App / Simulation / Tool / Website`) with
  animated layout change (FLIP via anime.js or GSAP Flip — GSAP Flip plugin is included in gsap).

## UI agent — owns `src/ui/**`
`initUI()` renders nav, hero DOM, about, stack, contact, footer, cursor, fx-overlay and wires their effects.
`runBoot()` plays the boot overlay. See the table above for each section. Also build reusable helpers in
`src/ui/fx/`: `scramble.ts` (text scramble/decode effect), `split.ts` (split text into chars/words spans,
accessible: keep `aria-label` with the full text, `aria-hidden` on spans), `magnetic.ts` (magnetic buttons),
`reveal.ts` (ScrollTrigger-based reveal utility), `typewriter.ts`. The Projects agent will build its own copies
if needed — don't worry about sharing.
Hero DOM must leave the right ~45% visually open on desktop so the 3D core shows through; on mobile the core sits
behind the text at lower opacity (WebGL handles that).

## Screenshots agent — owns `public/shots/**` and `scripts/**`
Capture a 1600×1000 screenshot of each project and save as `public/shots/<id>.webp` (quality ~82, also a
`<id>-sm.webp` at 800×500). Sources:
- Live URLs: sabine https://getsabine.com, simon https://www.asksimon.co.zw, sjet-rm https://sjet-rm.vercel.app,
  gym https://clayton-gym.vercel.app, mentormatch https://hackerthon-six.vercel.app,
  stop-mildew https://stopmildew.co.za, sjet-lp https://sjet-lp.vercel.app
- Local static (serve with `python3 -m http.server` from the folder, or file://): site19
  `../SCP/site19-breach-monitor.html` (let the sim run ~6s first), seed `../seed/` (enter a seed), circuit-vault
  `../arduino/index.html`, mysmartschool `../MySmartSchool/index.html` (landing page only).
- Build-able local apps (only if quick; otherwise skip — the site falls back to procedural art): lapel (`../lapel`),
  cook-a-levels (`../exams`, has a `dist/`), yearbook (`../voting`, has a `dist/`). Use `vite preview`/static
  serve of existing `dist/` folders; don't install deps in those repos, don't modify them.
- Use Playwright via `npx playwright` (install chromium into the default cache) or any headless browser you can
  get working. Use `sharp` or `cwebp` for WebP conversion — install tools globally/temporarily, NOT into this
  project's package.json. Put your capture script in `scripts/shoot.mjs` (it may be run again later).
- Login-walled apps will show the login/landing page — that's fine as long as it looks presentable. If a page
  looks broken/blank, delete that screenshot so the procedural fallback is used, and say so in your report.
