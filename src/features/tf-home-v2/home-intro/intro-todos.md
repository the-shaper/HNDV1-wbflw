CRT Intro TODOs / Notes

- [x] Single-file `crt-intro.html` scaffolded
- [x] SVG mask + glow filter implemented
- [x] Anime.js timeline for dot → line → expand → fade-out
- [x] Logo blending during flash
- [x] Responsive viewBox sizing + center; reduced-motion fallback
- [ ] Integrate into Webflow: place overlay container with custom code embed
- [x] Swap inline logo with CMS image or Webflow Asset link (auto-detects `#tf-logo-intro`/`.tf-logo-intro`)
- [x] Gate body scroll via `overflow: hidden` until overlay is gone
- [ ] Optionally persist skip-once (localStorage) after first visit

Recent updates (done):

- [x] Webflow logo auto-detection and temporary clone for blend
- [x] Control UI panel added with persistence (localStorage):
  - dotDuration, squishDuration, lineHoldDuration
  - anticipationStretchPx, anticipationDuration, anticipationRecoilDuration
  - horizontalDuration, verticalDuration, verticalOverlapMs
  - finalPaddingPx, glowStrength, minRy, flashOpacity, glowOpacity, scanOpacity, logoBlendOpacity
  - easing (easeOutCubic, easeInOutCubic, easeOutQuad, easeInOutQuad, linear, custom) and easeIntensity
- [x] Contiguous horizontal rx keyframes (hold → stretch → recoil → full) to remove pauses
- [x] Vertical expand scheduled with absolute overlap (verticalOverlapMs)
- [x] **Timeline Simplification for Seamless Horizontal-to-Vertical Handoff**:
  - Removed verticalOverlapMs param, UI row, and related clamping/offset logic to simplify—no more overlap tuning needed.
  - Direct sequential .add() after rx frames for ry (verticalDuration): Thin line reaches full width, then immediately stretches vertically—continuous like dot-to-line.
  - Default easing changed to 'easeOutQuad' for snappier rx end, reducing perceived pause from deceleration.
  - Simplified logo opacities: logoFlash/introLogo fade up during squish/rx start (relative offset '-=squishDuration'), fade out during vertical mid-point (offset '-=verticalDuration/2').
  - Result: Fluid "L" expansion (horizontal then vertical), minimal code (~20 lines subtracted), DRY/readable, zero pause at handoff.
- [x] **Logo Fallback Placeholder**: If no Webflow logo detected (#tf-logo-intro or .tf-logo-intro), auto-use './testinglogofringe-4.png' as src for temporary intro-logo img and SVG logo-flash image. Ensures animation runs even without site logo; supports img/SVG/background-image detection as before.

Integration tips (Webflow):

1. Add an HTML Embed at the end of `body` and paste the overlay + script from `crt-intro.html` (omit duplicate `<html/head>`). Keep the Anime.js CDN include once on the page.
2. Place your actual logo in the page with either id `tf-logo-intro` or class `tf-logo-intro`. It can be an `<img>`, an inline `<svg>`, or an element with a CSS `background-image`.
3. The script will detect the logo, clone it temporarily as a fixed element for blending, and feed its source into the SVG `<image>` for glow. No manual edits to the logo are required.
4. If the site header is fixed, no change needed; the overlay sits above content until it fades.
5. To skip animation after first view, add:

```html
<script>
  try {
    const seen = localStorage.getItem('crtIntroSeen')
    if (seen === '1') {
      document.documentElement.classList.add('skip-crt-intro')
    } else {
      localStorage.setItem('crtIntroSeen', '1')
    }
  } catch (e) {}
</script>
```

and in CSS:

```css
.skip-crt-intro #crt-overlay {
  display: none !important;
}
.skip-crt-intro #intro-logo {
  opacity: 0 !important;
}
```

6. If you need a lighter glow, reduce `stdDeviation` in `#crtGlow`.
7. If your logo aspect is tall, you can increase `--logo-max-width` or add `max-height`.
