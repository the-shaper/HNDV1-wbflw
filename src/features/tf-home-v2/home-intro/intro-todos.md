# CRT Intro TODOs / Notes

- [x] Single-file `crt-intro.html` scaffolded
- [x] SVG mask + glow filter implemented
- [x] Anime.js timeline for dot → line → expand → fade-out
- [x] Logo blending during flash
- [x] Responsive viewBox sizing + center; reduced-motion fallback
- [x] Integrate into Webflow: place overlay container with custom code embed (partial: SVG embedded in code block, animation loads but flickers)
- [x] Swap inline logo with CMS image or Webflow Asset link (auto-detects `#tf-logo-intro`/`.tf-logo-intro`)
- [ ] Optionally persist skip-once (localStorage) after first visit

**Flicker Issue (Current)**:

- [ ] SVG loads before script, causing initial flash. Fix: Set initial CSS `#crt-overlay { opacity: 0 !important; }` in Webflow. Script sets `opacity: 1` before animation start (in createCrtIntro, after query).
- [ ] Transparent CSS hides animation: Add visibility control—script activates opacity 1 on ready, optional fade-in (Anime.js tween opacity [0→1], 200-300ms easeOutQuad, data-fade-in="true").
- [ ] No initial black pop: Ensure script sets opacity 1 immediately after query, before timeline—test with log 'Visibility activated'.

## Visibility & Timing Controls (New)

- [ ] Start delay param: Add data-start-delay="500" (ms) to container—use setTimeout in createCrtIntro before executeAnimation. Default 0; allows page settle or sync with other loads (e.g., Rive).
- [ ] Fade-in activation: Optional data-fade-in-duration="300" for smooth overlay appear (Anime.js {targets: overlay, opacity: [0,1], duration, easing: 'easeOutQuad'} before main timeline).

## Hybrid Approach: Static SVG Embed + JS Animation (New Plan)

To avoid JS DOM creation issues in Webflow, embed SVG statically and let script animate existing elements. Focus: Black block → mask grow → flash reveal → fade uncover content → post-shaders.

### Core Elements

- `.tf-home-intro-content` (Webflow Div, Outer Wrapper): Full-viewport, position relative, z=9999 (tops page).
  - `#crt-overlay` (Nested Div): Absolute inset 0, z=10, initial opacity 0 (for no flicker), background #000.
    - `#crt-svg` (Static SVG Embed): Inside overlay, 100% width/height. Paste from crt-intro.html (lines 143-222).
  - `.revealed-content` (Test Div Behind): Absolute inset 0, z=5 (under overlay), e.g., background white + text/logo.
  - `#shader-canvas` (Appended Post-Fade, JS): Absolute inset 0, z=15, for bloom/noise.

### Webflow Setup Steps

1. Add `.tf-home-intro-content` div: position: relative; width: 100vw; height: 100vh; overflow: hidden; z-index: 9999.
2. Inside: Add `#crt-overlay` div: position: absolute; inset: 0; z-index: 10; background: #000; opacity: 0 !important; (hides initial flicker).
3. Inside overlay: Embed code block with static SVG HTML from crt-intro.html (lines 143-222: <svg id="crt-svg">...).
4. Inside container (sibling to overlay): Add `.revealed-content` div: position: absolute; inset: 0; z-index: 5; background: white; display: grid; place-items: center; <h1>Test Reveal</h1>.
5. Custom code before </body>: <script src="dist/main.js" defer></script>.

### Script Rework (Minimal, Keep Animation Values)

- createCrtIntro: Query existing #crt-overlay/#crt-svg in container; if missing, warn. Set overlay opacity=1, apply styles (!important). Read data attrs for tuning.
- executeAnimation: Unchanged timeline (dot 120ms rx/ry 2→8; squish 160ms ry=minRy; horizontal 260ms rx frames w/anticipation; vertical 111ms ry=maxRy; fade 420ms opacity [1→0]). In complete: Append shader canvas, start post-processing.
- initializeCrtIntro: Scan .tf-home-intro-content with #crt-svg; animate if present.
- Cleanup: Fade/remove overlay.
- Flicker Fix: CSS initial opacity 0; script sets 1 pre-animation.

### Post-Processing (Bloom + Noise After Fade)

- In fade complete: Append <canvas id="shader-canvas" style="position: absolute; inset: 0; z-index: 15; pointer-events: none;"> to container.
- Bloom: ctx.drawImage(containerEl, 0,0); multi-pass blur (ctx.filter='blur(3px) brightness(1.2)'); blend 'screen'. Animate intensity (Anime.js: value [0,1.5], 800ms easeOutQuad).
- Noise: Generate grayscale texture (random pixels, 1% density, alpha 0.03); overlay 'multiply'. Animate offset (timeline loop: value [0,10], 2000ms).
- Control: Data attrs (data-bloom="true" data-noise-strength="0.05"). Fade shaders after 3s.

## Recent Updates (Done)

- [x] Programmatic SVG creation with createElementNS (bypasses innerHTML parsing in Webflow).
- [x] Selector fixes: Explicit '#' + id in queries (e.g., '#crt-svg')—no more "not found" warns.
- [x] ViewBox dynamic set to container dims (e.g., 1708x1059); ResizeObserver for responsive.
- [x] Timeline simplification: Direct sequential adds for seamless horizontal-to-vertical (no overlap param).
- [x] Logo fallback to testinglogofringe-4.png if no Webflow logo.
- [x] Control UI panel with localStorage (durations, anticipation, glow, easing).
- [x] Contiguous rx keyframes (hold/stretch/recoil/full) for fluid line expand.

**Recent updates (new hybrid plan)**:

- [ ] Embed static SVG in #crt-overlay (Webflow code block) for reliable render—no JS creation.
- [ ] Script queries/animates existing elements (mask grow, fade)—keeps all durations/easing.
- [ ] Initial opacity 0 on overlay (CSS) + script set to 1—eliminates flicker.
- [ ] Z-structure: Container z=9999 > overlay/SVG z=10 > content z=5 > shaders z=15.
- [ ] Post-fade: Canvas append + bloom (blur/brightness blend) + noise (grain texture, animated offset).

## Integration Tips (Webflow, Updated for Hybrid)

1. Embed static SVG in #crt-overlay code block (copy crt-intro.html lines 143-222)—black + white rects visible immediately.
2. Add CSS: #crt-overlay { opacity: 0 !important; } (no flicker); script sets opacity 1 on init.
3. Place content/logo in .revealed-content (z=5 inside container)—revealed by mask/fade.
4. For logo on top: Add absolute div z=20 inside container (post-reveal).
5. Script auto-runs on .tf-home-intro-content with #crt-svg; tune via data attrs (e.g., data-glow-strength="2", data-start-delay="200").
6. Shaders: Post-fade canvas (z=15); vanilla 2D for bloom/noise—no libs needed.
7. Skip after first: localStorage + .skip-crt-intro class to hide overlay.
8. If flash subtle, increase data-flash-opacity="1" data-glow-opacity="0.8".
9. Mobile: Add JS to force container height (vh bar issue): containerEl.style.height = window.innerHeight + 'px'.
10. Visibility test: After CSS opacity 0, script log 'Opacity set to 1'—confirm black appears before animation.
