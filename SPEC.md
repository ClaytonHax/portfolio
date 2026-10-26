# SPEC v2 — "The Unbroken Line"

Clayton Banks' portfolio. One ink line that never lifts: it writes **"Clayton"**, carries on into
cursive **"I build AI products"**, draws a hand-drawn **circle** around the phrase, **flicks** out,
and then — tied to scroll — runs down the page past every section, ending by underlining his email.
Everything sits on soft **liquid glass** over drifting colour, with a **Light / Night** theme.

**The approved prototype is `prototype/pen-prototype.html`** (also live at
https://claude.ai/artifact/D6G1yjvfcieAUb5F8a8zqA). Read it in full before writing code. It contains
the proven handwriting technique, the segment engine, the circle maths, ink particles, glass styles and
both themes. The production build must look at least as good as the prototype and behave the same way —
only now it's responsive, scroll-driven, accessible and production quality.

## Stack (installed — do not add frameworks)
- Vite 8 + vanilla TypeScript (strict, `noUnusedLocals`). No React.
- `gsap@3` with ScrollTrigger and Flip, `lenis` — import from `src/core/motion.ts` (already registered and wired; don't create another Lenis).
- No three.js, no anime.js (removed). Canvas 2D + SVG only.
- Fonts: Geist + Geist Mono (loaded in index.html). Handwriting = Sacramento glyph outlines in `src/data/glyphs.json`.

## Shared files — READ, never edit
`index.html`, `src/main.ts`, `src/core/*` (`bus.ts`, `motion.ts`, `theme.ts`), `src/styles/tokens.css`,
`src/styles/base.css`, `src/data/profile.ts`, `src/data/projects.ts`, `src/data/glyphs.json`, this file.
If you need a change in a shared file, say so in your final report instead.

## Global rules
1. Stay in your own directory. Keep the entry function signature in your `index.ts` exactly as stubbed.
2. Import your own CSS from your module. Use the tokens in `tokens.css` (`var(--ink)`, `var(--glass-bg)`,
   `var(--text)`…) — no raw colours in CSS except inside canvas code (read tokens with `getComputedStyle`).
   Use the shared `.glass`, `.chip`, `.container`, `.sr-only` classes from `base.css`.
3. Cross-module talk only via `src/core/bus.ts` events (read `BusEvents`). Never import another agent's module.
4. **Reduced motion** (`reducedMotion` from motion.ts): no autoplay, no scrub. The line is shown fully drawn,
   all content visible immediately, no particle animation.
5. **Mobile first**: must be great at 375px wide (no horizontal scroll, 44px touch targets, readable text ≥ 16px
   body). Use `isMobile()` / `lowPower` to lower particle counts.
6. **Accessibility**: semantic HTML, real `<a>`/`<button>`, visible focus (base.css provides it), alt text,
   contrast ≥ 4.5:1 in BOTH themes (glass text uses `--glass-text` / `--glass-dim`; open-background text uses
   `--text` / `--text-dim`). Decorative SVG/canvas is `aria-hidden`. No emoji as icons; inline SVG icons
   (Lucide style, 24×24, 1.75 stroke). GitHub/LinkedIn icons from Simple Icons paths.
7. **Performance**: animate transform/opacity only. No `filter: blur()` on large animated layers. Pause rAF loops
   when nothing moves or the tab is hidden. Lazy-load images with explicit width/height.
8. **Works without the pen**: if `html.no-pen` is set (pen failed) or JS is off, content must still be visible.
   Elements hidden for a reveal must only be hidden under `html.js` and must have a fallback reveal (see Sections).
9. `npm run build` must pass before you finish. Don't commit. Don't touch other projects in `../`.
10. Verify visually: run `npx vite --port <yours>` in the background, take Playwright screenshots
    (playwright + chromium are installed at
    `/private/tmp/claude-501/-Users-claytonbanks-Documents-coders-portfollio/8346c189-cab0-4e98-bf19-832f20e14fff/scratchpad/node_modules`;
    put your scripts in that scratchpad, launch with `--use-angle=metal --enable-gpu --ignore-gpu-blocklist`),
    at 1440×900 and 390×844, light and night (`localStorage['cb-theme']='night'` or click the toggle), and
    LOOK at them. Kill your dev server when done. Other agents work in parallel, so their areas may still be stubs.

## Page structure & ownership

```
#bg            sections  fixed background: three soft radial-gradient blobs drifting (transform only), --bg colour
#nav           sections  floating glass pill
main#main
  #pen-layer   pen       absolutely positioned over <main>, full height. Holds the ONE svg with intro + line.
  #intro       —         section; contains sr-only <h1>, #intro-stage (pen), #intro-meta (sections)
  #about       sections
  #work        sections  flagship projects
  #more        sections  the rest of the work
  #stack       sections
  #contact     sections
#footer        sections
#ink           pen       fixed full-viewport canvas: pen glow + ink flecks
#case-root     case      dialog
```

`#intro` must be at least `100svh` tall (sections owns its CSS via `#intro-meta`? — no: **pen owns
`#intro` and `#intro-stage` layout CSS**, sections owns only `#intro-meta` content and styles).

## The anchor contract (pen ⇄ sections)
Sections place waypoints; the pen draws through them. Sections never draw lines.

- Any element with **`data-pen-stop="<id>"`** is a waypoint. Ids are unique, e.g. `about`, `work-sabine`,
  `work-simon`, `work-pathway`, `work-lapel`, `more`, `stack`, `contact`.
- **`data-pen-side`** tells the pen how to approach it:
  - `left` — the line passes along the element's left edge (vertical middle), just outside it.
  - `right` — same on the right edge.
  - `through` — the line passes behind the element through its centre (use for small tiles / clusters; glass
    cards blur the line behind them, which looks great).
  - `end` — the final stop. The line ends by underlining this element (its bottom edge, left→right, with a
    small closing flourish). Exactly one, on the email address in `#contact`.
- Optional **`data-pen-gap="<px>"`** — distance outside the edge for left/right (default 28).
- Sections should alternate `left` / `right` so the line weaves. On mobile (single column) cards are near full
  width, so use `data-pen-side` values that work at that width too (the pen may pass `through` small tiles on
  mobile; it can read `data-pen-side-mobile` if present).
- Anchors can be added/moved at any time; emit `layout:change` after anything that changes layout (filter,
  images, accordion). The pen rebuilds the path (keeping the current progress) on `layout:change` and resize.

## Bus events (see `src/core/bus.ts`)
| Event | Emitted by | Meaning |
|---|---|---|
| `intro:done {skipped}` | pen | intro finished or was skipped; scroll-driven line is live |
| `pen:reach {id}` | pen | pen tip passed stop `id` going down |
| `pen:leave {id}` | pen | pen tip went back above stop `id` (scroll up) |
| `pen:progress {p}` | pen | journey progress 0..1 |
| `theme:change {theme}` | core/theme | after `data-theme` changes |
| `case:open {id, from}` | sections (cards/buttons), case (deep link, prev/next) | open project case study |
| `case:close` | case | dialog closed |
| `layout:change` | anyone | anchors moved |

---

## Agent A — Pen (`src/pen/**`, `scripts/glyphs.mjs`)
`initPen()` lays out #intro, plays the intro, builds the journey line. Port the prototype engine faithfully.

**Glyphs.** Write `scripts/glyphs.mjs` (Node, uses devDep `opentype.js`, reads `scripts/fonts/Sacramento-Regular.ttf`)
that regenerates `src/data/glyphs.json` with keys `Clayton`, `phrase` (`I build AI products`, each path tagged with
its word index `w`, exactly the format already in the file) and add `CB` (monogram for nav/favicon, same format).
Add an npm script `"glyphs": "node scripts/glyphs.mjs"` — you may edit package.json **scripts only**. Run it and keep
the format backwards compatible. Also write `public/favicon.svg` as a cursive "CB" drawn from those glyphs (dark ink
on a rounded light-glass square, legible at 16px).

**One SVG.** Create a single `<svg>` inside `#pen-layer` sized to `<main>` in CSS px (viewBox = main's width × height,
updated on resize). The intro words, connectors, circle, flick and the whole journey path all live in it, so the line is
literally continuous. Ink colour = `var(--ink)` via CSS classes, glow = `filter: var(--ink-glow)` on the line group.

**Intro layout.** `#intro` is `min-height: 100svh`. Inside it, lay out "Clayton" (large, centred, ~40–48% of viewport
width on desktop, ~78% on mobile) and the phrase below (~60% width desktop; on mobile split the phrase over two lines:
"I build" / "AI products" — the glyph data is per word so you can place words on two rows; connectors between rows must
still be continuous). Keep room under the circle for `#intro-meta` (sections), roughly the bottom 22% of the intro.
The circle wraps the phrase (both rows on mobile). Use the prototype's connector, gap, circle (`cpt`, `T0`, `T1`, wobble,
tilt) and flick maths.

**Intro playback (~8s).** name 2.5s → swoop .75s → phrase 3s → circle 1.5s → flick burst → `intro:done`.
Plays automatically once per session (`sessionStorage['cb-intro']`). On repeat visits, or on any wheel/touchmove/key/
click during playback, **skip**: jump straight to the finished drawing (quick 300ms catch-up is nicer than a hard cut)
and emit `intro:done {skipped:true}`. While the intro plays, lock scrolling with `lockScroll(true)` and release it on
done/skip (skip must also release). Reduced motion: no playback, draw finished state, `intro:done {skipped:true}`.

**Journey line.** After the flick, build the path: start exactly at the flick's end point, then pass every
`[data-pen-stop]` in document order according to its `data-pen-side`, ending with the `end` stop's underline flourish.
Smooth it (Catmull-Rom → cubic Bézier, or hand-built cubic curves with tangents per side) so it looks hand-drawn and
graceful: wide S-curves between left/right stops, never kinks, never crossing text on the open background (it may pass
behind glass cards). Then drive it with ONE ScrollTrigger (`scrub: true` or a small number like 0.6) from the bottom of
the intro to the bottom of the page: dash offset = progress. The pen tip should sit around 60–65% down the viewport as
you scroll (so the line draws just ahead of what you're reading). Emit `pen:reach` / `pen:leave` when the tip crosses each
stop's point along the path, and `pen:progress`. Rebuild on resize/`layout:change`/`ScrollTrigger refresh`, preserving
progress. Reduced motion: whole line drawn, emit `pen:reach` for every stop immediately.

**Ink (`#ink` canvas).** Fixed full-viewport canvas (`z-index: var(--z-ink)`, pointer-events none). Draw the glowing pen
tip (radial gradient, colour from `--pen-glow`) while the line is being drawn (intro or scrolling), and emit ink flecks from
the tip while it moves (prototype `emit` with drag + slight gravity, ~2/frame, more on fast scroll velocity), plus a
burst (~60) on the flick and a small burst (~40) when reaching each stop. Pause the rAF loop when there are no live
particles and the pen is idle. Particle colour from `--ink-particle`. Night theme uses `lighter` compositing. Cap DPR at 2,
halve counts on `lowPower`.

**Polish.** Pen tip glow fades in/out smoothly; the line's leading 40px can be slightly brighter (optional). Make sure
the intro words stay crisp at all sizes (vector) and re-layout on resize without replaying.

## Agent B — Sections (`src/sections/**`)
`initSections()` renders every DOM area it owns synchronously (so the pen can measure anchors), wires interactions,
and reveals content when the pen reaches it.

**Reveal rule.** Content that animates in is hidden only under `html.js:not(.no-pen)` and revealed on `pen:reach`
for its stop. Reverse (subtly) on `pen:leave`. **Safety net:** also reveal when the element scrolls to 75% of the
viewport via its own ScrollTrigger if `pen:reach` hasn't arrived, and reveal everything if `intro:done` hasn't fired
within 12s. Reduced motion: everything visible, no reveal animation.

**#bg** — fixed full-viewport layer, `background: var(--bg)`, three large radial-gradient blobs using `--blob-1..3`
and `--blob-opacity`, drifting slowly with transform-only CSS keyframes (prototype colours; NO `filter: blur` on these —
use soft radial-gradients with transparent edges instead). Crossfades on theme change.

**#nav** — floating glass pill, inset from the top (`top: max(12px, env(safe-area-inset-top))`), centred, max ~720px.
Left: the cursive "CB" monogram (render from `glyphs.json` key `CB` if present, else `Clayton` scaled down — pen agent is
adding `CB`; code defensively) linking to top. Middle: links About · Work · Stack · Contact (smooth `scrollTo`). Right: theme
toggle (sun/moon icon button with `aria-label` + `aria-pressed`, calls `setTheme` from core/theme.ts) and an "Email me"
button (`mailto:`). Hidden during the intro, slides in on `intro:done`. Active-section highlight via ScrollTrigger. Mobile:
monogram + theme toggle + menu button opening a full-screen glass sheet with the links (focus-trapped, Escape closes).
Shows a thin progress hairline along the pill's bottom edge from `pen:progress`.

**#intro-meta** — under the circle: a small role line "Full-stack developer · Harare, Zimbabwe", an "Open to work" pill
with a soft pulsing dot, and a scroll cue ("Scroll" + a small animated line). Fades up on `intro:done`.

**#about** (`data-pen-stop="about"`) — section title "About" (visible h2, e.g. `id="about-title"`) plus a glass panel with
`profile.about` paragraphs (rewrite lightly in Clayton's direct voice if you like — keep it truthful), and the four
`profile.stats` as count-up numbers (the "1st" stat counts 0→1 then shows the suffix). Location chip.

**#work** (`id="work-title"`, "Selected work") — the four `tier: 'flagship'` projects as large glass cards, alternating
left/right on desktop (each card ~58% width, offset so the line weaves), stacked on mobile. Each card: screenshot
(`image`, with `-sm` srcset), category · year, title, tagline, badge if present (Pathway "1st place" — make it special,
e.g. a gold-ish glass medal chip), stack chips, and actions: "Read case study" (button → `emit('case:open', {id, from})`),
"Visit site ↗" / "Code ↗" when `url`/`repo` exist. Pointer-following shine (`--mx/--my`) and a gentle 3D tilt on desktop.
The whole card is clickable to open the case study but nested links still work. Each card has
`data-pen-stop="work-<id>"` and alternating `data-pen-side`.

**#more** (`id="more-title"`, "More work") — every non-flagship project as compact glass tiles in a responsive grid
(title, tagline, year, category chip, small thumb). Clicking opens the case study. One `data-pen-stop="more"` on the grid
container with `data-pen-side="through"`. Optional category filter chips (All / Web App / Simulation / Tool / Website /
AI) with GSAP Flip — emit `layout:change` after filtering.

**#stack** (`data-pen-stop="stack"`) — `profile.skills` grouped; chips light up in a quick stagger on reach. Keep it
compact and elegant (not a giant wall).

**#contact** (`id="contact-title"`) — big heading "Let's talk." (large Geist, maybe the period in accent), a line of copy,
the email address as large text `claytbzim@gmail.com` with **`data-pen-stop="contact" data-pen-side="end"`** on the email
element (the line underlines it), buttons: Copy email (clipboard + toast "Copied"), GitHub, LinkedIn (from profile.ts).

**#footer** — small: "© 2026 Clayton Banks · Built by hand in Harare" + back to top.

## Agent C — Case studies (`src/case/**`, `src/data/cases.ts`)
`initCase()` renders the dialog into `#case-root`, listens for `case:open`, handles deep links.

**Content (`src/data/cases.ts`).** Export `cases: Record<string, CaseStudy>` keyed by project id from `projects.ts`.
For **sabine, simon, pathway, lapel** write full case studies; for every other project a short one (summary +
highlights). Research each by reading its README / CLAUDE.md / source in `../<folder>` (read-only):
sabine → `../ai` (README.md is long: read the intro, "Use it", "The app", skills/memory/sandbox sections),
simon → `../Simon` (src/pages, api/, docs/), pathway → `../Hackerthon` (it won 1st place at a hackathon; the app is branded
"Pathway"; read goal.md, src), lapel → `../lapel` (README, CLAUDE.md, app/api), sjet-rm → `../SJET-Estate`,
gym → `../gym`, cook-a-levels → `../exams`, seed → `../seed`, stop-mildew → `../stop-mildew`,
sjet-lp → `../SJET-LP`, circuit-vault → `../arduino`.
**Never** mention or read anything about LayerZim, 3D printing or Zim3D. Don't invent numbers/users/metrics — only state
what the code and READMEs show. Plain, direct, first-person voice ("I built…"), short paragraphs, no buzzwords.

```ts
export interface CaseStudy {
  summary: string            // 1–2 sentences
  problem?: string           // full only
  built?: string[]           // what I built — 4–6 concrete bullets
  decision?: { title: string; body: string }  // one hard technical decision and why
  result?: string            // where it stands now (live, used by…, won…) — truthful
  role?: string              // e.g. "Solo — design, frontend, backend, prompts"
}
```

**Dialog.** Accessible modal (`role="dialog"`, `aria-modal`, labelled by its title), glass panel, max ~980px, scrollable
inside. Opens with a FLIP-style expand from the `from` element's rect (clip-path or transform from the card), closes back
into it; fades/scales if no `from`. Layout: hero screenshot, title + badge + category/year, tagline, links (Visit / Code),
role + stack chips, then sections Problem / What I built / The hard part / Result. Prev / Next project buttons, close
button (top-right, 44px), Escape closes, focus trap, focus returns to the opener, `lockScroll(true/false)`. Backdrop dims
and blurs the page (static blur on the backdrop is fine). Deep links: open on load if `location.hash` is `#case-<id>`, update
the hash on open (`history.replaceState`), clear on close; respond to `hashchange`. Both themes. Mobile: full-screen sheet
sliding up. Reduced motion: simple fade.

## Done means
- Build passes, no console errors, no horizontal scroll at 375/768/1024/1440, both themes look intentional.
- Final report (short): files created, what you implemented, anything you need changed in shared files, anything unfinished.
