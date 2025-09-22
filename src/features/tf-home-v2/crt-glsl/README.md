# CRT GLSL Animation System

A GLSL-based CRT intro animation that replicates the original SVG/Anime.js version using modern WebGL shaders.

## Features

- **GLSL Fragment Shader**: Real-time CRT reveal animation
- **Embeddable**: Easy integration into any webpage
- **Configurable**: 15+ parameters for timing and visual effects
- **Mode Presets**: 6 built-in animation styles (A-F)
- **Real-time Controls**: Live parameter adjustment
- **Performance Optimized**: Hardware-accelerated rendering

## Usage

### Basic Integration

```html
<div id="my-crt-container" style="width: 800px; height: 600px;">
  <!-- Canvas will be auto-created here -->
</div>

<script type="module">
  import { initializeCrtGlsl } from './crt-glsl/crt-glsl.js'

  initializeCrtGlsl({
    containerSelector: '#my-crt-container',
  })
</script>
```

### Advanced Usage with Parameters

```javascript
import { initializeCrtGlsl, updateCrtGlsl } from './crt-glsl/crt-glsl.js'

initializeCrtGlsl({
  containerSelector: '#my-container',
  // Optional: custom parameters
  params: {
    dotDuration: 200,
    squishDuration: 300,
    glowStrength: 1.5,
  },
})

// Live parameter updates
updateCrtGlsl({
  flashOpacity: 0.8,
  anticipationStretchPx: 12,
})
```

### Mode Presets

Load predefined animation styles:

```javascript
// This would be added to the system - not yet implemented
loadCrtMode('B') // Slow and dramatic
loadCrtMode('C') // Fast and punchy
```

## Parameters

| Parameter                    | Range      | Description             |
| ---------------------------- | ---------- | ----------------------- |
| `dotDuration`                | 10-2000ms  | Initial dot expansion   |
| `squishDuration`             | 10-2000ms  | Vertical squish to line |
| `lineHoldDuration`           | 0-1500ms   | Pause in line state     |
| `anticipationDuration`       | 0-2000ms   | Stretch anticipation    |
| `anticipationRecoilDuration` | 0-2000ms   | Recoil from stretch     |
| `horizontalDuration`         | 10-4000ms  | Horizontal expansion    |
| `verticalDuration`           | 10-4000ms  | Vertical expansion      |
| `finalFadeDuration`          | 100-2000ms | Final fade out          |
| `anticipationStretchPx`      | 0-200px    | Stretch amount          |
| `minRy`                      | 0-24       | Line thinness           |
| `flashOpacity`               | 0-1        | Flash brightness        |
| `glowOpacity`                | 0-1        | Glow effect             |
| `glowStrength`               | 0-3        | Glow intensity          |
| `canvasScale`                | 0.5-2.0    | Zoom level              |

## Animation Sequence

1. **Dot Phase**: Small dot appears and expands to circle
2. **Squish Phase**: Circle squishes vertically into thin line
3. **Hold Phase**: Optional pause in line state
4. **Anticipation Phase**: Line stretches horizontally
5. **Recoil Phase**: Line recoils back
6. **Expansion Phase**: Line expands to full screen
7. **Fade Phase**: Animation fades out

## Files

- `crt-glsl.js` - Main module with GLSL shader
- `crt-glsl.html` - Standalone test environment
- `crtModes.json` - Animation presets (A-F)
- `style.css` - Canvas and control styling

## Testing

Test using your existing Vite dev server:

```bash
npm run dev
# Navigate to:
# http://localhost:your-vite-port/src/features/tf-home-v2/crt-glsl/crt-glsl.html
# or
# http://localhost:your-vite-port/src/features/tf-home-v2/tfhome2.html (for integration test)
```

## Fixes Applied

- **Fixed positioning**: Animation now grows from center instead of bottom-left corner
- **Fixed scaling**: Ellipse now expands to full screen (90% width, 100% height)
- **Improved center calculation**: Hardcoded center at (0.5, 0.5) for consistency
- **Better ellipse equation**: Proper elliptical mask calculation
- **Enhanced glow effect**: Radial gradient from center point
- **Smoother transitions**: Adjusted smoothstep values for better blending
- **Dynamic sizing**: Canvas automatically resizes with container
- **Debug features**: Visual debugging with center markers and phase info
- **Canvas scaling fix**: Properly accounts for canvas scaling in ellipse calculations
- **Coordinate system fix**: Correct scaling math to maintain center positioning
- **UI interference fix**: GLSL shader now only renders to right portion of canvas, leaving control panel area clear
- **Viewport management**: Uses scissor testing to restrict rendering area
- **Transparent canvas**: Canvas background made transparent so controls show through

## Debug Features

The test file includes debugging elements to help identify positioning issues:

- **Console logging**: Detailed size and position information
- **Position controls**: Manual center adjustment for troubleshooting

If the animation still appears in the bottom-left, check:

1. **Console logs**: Look for container dimensions and render area information
2. **Canvas size**: Should match container dimensions
3. **Position controls**: Use Center X/Y sliders to manually move the animation
4. **Canvas Scale**: Keep at 1.0 for proper positioning (values > 1.0 zoom in and may cause offset)

## Canvas Scaling Note

The Canvas Scale parameter is designed to zoom in/out of the effect. However, values other than 1.0 can cause positioning issues because:

- Scaling happens around the center point in normalized coordinates
- The ellipse size calculations must account for the scaling factor
- Complex interactions between scaling and ellipse positioning can cause offsets

**Recommendation**: Keep Canvas Scale at 1.0 for the intended full-screen effect. Values > 1.0 will zoom in (making the effect smaller and potentially offset), values < 1.0 will zoom out.

## Position Controls (Debug Feature)

Added X/Y position controls to help troubleshoot positioning issues:

- **Center X**: Adjust horizontal position (0.0 = left, 1.0 = right)
- **Center Y**: Adjust vertical position (0.0 = top, 1.0 = bottom)
- **Reset Position**: Button to reset to center (0.5, 0.5)

These controls allow you to manually move the animation center point to see where it should be positioned, which helps identify coordinate system issues.

## UI Architecture

The system uses a split layout with:

- **Left side (300px)**: Control panel with all parameters
- **Right side**: Canvas where GLSL animation renders

The GLSL shader only renders to the right portion of the canvas using:

- **Viewport management**: Restricts rendering to specific canvas area
- **Scissor testing**: Clips rendering to control panel area
- **Transparent canvas**: Allows controls to show through left portion

This prevents the GLSL shader from interfering with the UI controls while maintaining the full-screen animation effect.

**Note**: Visual debug overlays have been removed to prevent UI interference. Use the position controls and console logging for debugging.

## Performance Notes

- Uses WebGL for hardware acceleration
- Single fullscreen quad rendering
- Optimized GLSL with minimal calculations
- Auto-restarts animation loop
- Memory efficient with shared uniforms

## Browser Support

- Modern browsers with WebGL support
- ES6 modules required
- Three.js dependency (loaded via CDN in test file)
