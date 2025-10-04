# Marquee Implementation Plan

## Overview

This document outlines the implementation of a seamless scrolling marquee using JavaScript for the agency section.

## File Location

Create the JavaScript file at: `src/features/agency/marquee.js`

## Implementation Details

### HTML Structure (Pre-implementation)

```html
<div id="marquee-content">
  <div id="marquee-track">
    <div id="marquee-txt" class="marquee-text">
      storytellers&nbsp;&nbsp;software makers&nbsp;&nbsp;network
      states&nbsp;&nbsp;musicians&nbsp;&nbsp;decentralized
      visionnaires&nbsp;&nbsp;gaming&nbsp;&nbsp;AR/VR/XR&nbsp;&nbsp;world
      builders&nbsp;&nbsp;alien chasers&nbsp;&nbsp;animators&nbsp;&nbsp;fringe
      journalism&nbsp;&nbsp;open sourcerers&nbsp;&nbsp;books and
      publishing&nbsp;&nbsp;blockchain builders&nbsp;&nbsp;space
      explorers&nbsp;&nbsp;engineers&nbsp;&nbsp;independent
      media&nbsp;&nbsp;architects&nbsp;&nbsp;fashion savants
    </div>
  </div>
</div>
```

### JavaScript Implementation

#### Core Functionality

1. **Initialization**: Find the marquee elements and set up initial state
2. **Content Duplication**: Clone the original marquee text to create seamless loop
3. **Animation Loop**: Use requestAnimationFrame for smooth scrolling
4. **Resize Handling**: Recalculate dimensions on window resize

#### Key Functions

- `initMarquee()`: Main initialization function
- `duplicateContent()`: Clone the marquee text element
- `calculateWidth()`: Calculate total width needed for seamless scrolling
- `animate()`: Animation loop using requestAnimationFrame
- `handleResize()`: Recalculate on window resize

#### Configuration Options

- Scroll speed (pixels per frame)
- Direction (left/right)
- Pause on hover (optional)

### CSS Requirements

The existing CSS in style.css should work with minimal changes:

- Ensure `#marquee-track` has `display: flex`
- Set `white-space: nowrap` on `.marquee-text` (already present)
- Keep the existing gradient mask on `#marquee-content`

### Integration

1. Import the marquee module in the main.js file
2. Call `initMarquee()` when the DOM is ready
3. Ensure the marquee elements exist before initialization

### Performance Considerations

- Use `transform: translateX()` for hardware acceleration
- Throttle resize events to prevent excessive calculations
- Use requestAnimationFrame for smooth 60fps animation
- Clean up animation frame on page unload

### Browser Compatibility

- Works in all modern browsers
- No external dependencies required
- Fallback to static text if JavaScript is disabled

## Next Steps

1. Switch to Code mode to implement the JavaScript file
2. Update the main.js file to import and initialize the marquee
3. Test the implementation
4. Make any necessary CSS adjustments
