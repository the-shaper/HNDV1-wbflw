## Method Dial: Responsive Refactor Plan

### Goals

- Keep ring and center content perfectly aligned at any viewport size.
- Remove reliance on pixel breakpoints; scale fluidly with container size.
- Prevent overflow and interference with neighboring sections.
- Minimize code surface area and complexity; reuse existing rotation/scroll logic.

### Constraints

- Parent container remains 100svh.
- CMS-driven content; labels can vary in length.
- Maintain current GSAP interactions (rotation, active/seen, blur).

### Core Idea: One Size Token Drives Everything

- Compute a single stage size D = min(containerWidth, containerHeight) − padding.
- Derive all dimensions from D (percentages + clamp):
  - svgSize = D
  - ringRadius = D \* r (e.g., 0.45), clamped to fit items
  - ringThickness = D \* t (e.g., 0.12)
  - contentDiameter = D \* c (e.g., 0.56)
  - item font-size/scale derived from D with clamp
- Use CSS variables to apply sizes; JS only computes D and updates variables.

### Unified Layout

- Introduce a single centered square “stage” wrapping the ring and content:
  - `method-stage` (position: relative; aspect-ratio: 1; centered)
  - Inside: `menuContainer` (ring) + `method-content` (center) absolutely centered
- Both elements derive size and position from the same variables tied to D.

### CSS Variables (set by JS)

- `--D`: stage size (px)
- `--ring-r`: ring radius (px)
- `--ring-thickness`: ring thickness (px)
- `--content-d`: content diameter (px)
- `--item-scale-active`: active scale
- Optional: `--font-size-base`, `--blur-base`, `--blur-step`

Example usage:

```css
.method-stage {
  width: min(100%, 100%); /* actual size managed from JS via --D if needed */
}
.svg-menu-container,
.menu-collection-list {
  width: var(--D);
  height: var(--D);
}
.method-content {
  width: var(--content-d);
  height: var(--content-d);
  /* radial mask remains; can reference --content-d if needed */
}
.method-menu-item.active .text-wrapper {
  transform: scale(var(--item-scale-active, 1.1618));
}
```

### JS Responsibilities (minimal)

- Use ResizeObserver on `method-container` (or `method-stage`) to compute D on any layout change (not just window resize).
- Compute derived measurements and clamp:
  - `D = clamp(min(w, h) - 2*padding, Dmin, Dmax)`
  - Measure an item’s half-size from DOM to ensure ring fits: `ringR <= D/2 - itemHalf - safety`
- Update CSS variables on the stage.
- Reposition items on the circle using current `ringR` and center = `(D/2, D/2)`.
- Keep current interaction logic (GSAP rotation, active/seen) unchanged; only read ring radius and center from the variables/tokens.

### Pseudocode

```pseudo
onReady:
  stage = .method-stage (inside .method-container)
  ro = new ResizeObserver(recomputeLayout)
  ro.observe(stage)

function recomputeLayout():
  rect = stage.getBoundingClientRect()
  D = clamp(min(rect.width, rect.height) - 2*padding, Dmin, Dmax)
  ringR = D * 0.45
  contentD = D * 0.56
  ringThickness = D * 0.12

  itemHalf = measureFirstItemHalfSize() // from a menu item box
  ringR = min(ringR, D/2 - itemHalf - safetyPadding)

  setVar(stage, '--D', D)
  setVar(stage, '--ring-r', ringR)
  setVar(stage, '--ring-thickness', ringThickness)
  setVar(stage, '--content-d', contentD)
  setVar(stage, '--item-scale-active', 1.1618)

  positionMenuItems(center = (D/2, D/2), radius = ringR)

  updateActiveMenuItem(currentActiveIndex)
  updateSeenMenuItems(currentActiveIndex)
```

### Overflow Guarantees

- Clamp `ringR` so items cannot exceed the stage boundary.
- Use `clamp()` on text size to preserve legibility and avoid wrap explosion.
- Optional: reduce `ringThickness` slightly in compact mode.

### Compact Mode (optional threshold)

- When `D < DCompact`:
  - Reduce `ringThickness`, blur intensity, and font-size slightly.
  - Optionally truncate/wrap labels.
  - Keep the same interaction; avoid changing UX affordances unless below a hard minimum.

### Migration Steps

1. Add inner `method-stage` wrapper and center it.
2. Add CSS variables and refactor sizes/masks to use them.
3. Add `ResizeObserver` and the compute function to set variables.
4. Update `positionMenuItemsOnPath()` to use `(D/2, D/2)` and `ringR` from variables.
5. Remove breakpoint-specific pixel offsets; keep only sensible clamps.
6. Test across edge heights (landscape phones, split-screen, small laptop heights).

### Open Questions

- Minimum acceptable content diameter before compact tweaks?
- Are labels allowed to wrap or should we enforce truncation at small sizes?
- Any strict tap target minimums we must maintain?
