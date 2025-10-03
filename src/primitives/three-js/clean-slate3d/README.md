# Clean Slate 3D Primitive

A production-ready Three.js scene template designed for displaying 3D models with professional lighting, responsive design, and smooth user interaction.

## Features

- **GLTF Model Loading**: Automatically loads and displays 3D models from URLs
- **Auto-centering & Scaling**: Models are automatically centered and scaled to fit the camera view
- **Orbit Controls**: Smooth mouse/touch controls for rotating the view
- **Responsive Design**: Automatically adapts to container size changes using ResizeObserver
- **Professional Lighting**: Ambient and directional lighting setup for optimal model visibility
- **WebGL Best Practices**: Proper color space, tone mapping, and renderer configuration
- **Error Handling**: Graceful handling of loading failures and missing containers

## Usage

### Basic Implementation

```javascript
import initCleanSlate3d from './clean-slate3d/cleanSlate3d.js'

// Initialize with a DOM container
const container = document.querySelector('.my-3d-container')
initCleanSlate3d(container)
```

### HTML Setup

```html
<div class="my-3d-container" style="width: 100%; height: 400px;">
  <!-- Three.js canvas will be inserted here -->
</div>
```

### Advanced Configuration

The primitive accepts a container element and will:

1. Create a Three.js scene with the container as the canvas
2. Load a GLTF model from a URL (currently hardcoded)
3. Set up camera, lighting, and controls
4. Handle responsive resizing automatically

## Customization Options

To customize this primitive for your specific needs:

1. **Model URL**: Modify the loader URL in `cleanSlate3d.js` (line 67)
2. **Camera Settings**: Adjust FOV, position, and controls in the camera setup section
3. **Lighting**: Modify light intensity and position for different model requirements
4. **Controls**: Enable/disable zoom, pan, or damping in the OrbitControls setup

## Dependencies

- Three.js (latest version recommended)
- GLTFLoader from three/addons
- OrbitControls from three/addons

## Performance Considerations

- The animation loop runs continuously but is optimized for performance
- Models are automatically scaled to prevent excessive draw calls
- Consider using `requestIdleCallback` for non-critical 3D content
- The renderer uses `Math.min(window.devicePixelRatio || 1, 2)` to balance quality and performance

## Browser Support

- Modern browsers with WebGL support
- Graceful degradation: Logs warnings if WebGL context fails
- Mobile-friendly with touch controls

## Integration with Webflow

This primitive is designed to work seamlessly with Webflow:

1. Add a div with your desired class name to your Webflow page
2. Set CSS dimensions (width/height) on the container
3. Import and initialize the primitive in your JavaScript
4. The canvas will automatically fill the container dimensions

## Troubleshooting

**Canvas not appearing:**

- Check that the container element exists and has dimensions
- Verify WebGL support in the browser
- Check console for loading errors

**Model not loading:**

- Verify the GLTF URL is accessible
- Check network tab for loading errors
- Ensure the model is in GLTF/GLB format

**Poor performance:**

- Reduce model complexity if needed
- Consider lowering the pixel ratio limit
- Check for memory leaks in custom modifications


