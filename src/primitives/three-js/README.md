# Three.js Primitives & Templates

This folder contains reusable Three.js implementations that serve as foundations for 3D web experiences. These primitives are designed to be easily adaptable and reusable across different projects.

## Available Primitives

### Clean Slate 3D (`clean-slate3d/`)

A complete Three.js scene setup with:

- GLTF model loading and auto-centering
- Orbit controls for user interaction
- Responsive design with ResizeObserver
- Professional lighting and camera setup
- WebGL renderer with proper color space and tone mapping

**Features:**

- Auto-scales and centers loaded 3D models
- Responsive to container size changes
- Orbit controls (zoom and pan disabled by default)
- Professional lighting setup
- Ready for production use

**Usage:**

```javascript
import initCleanSlate3d from './primitives/three-js/clean-slate3d/cleanSlate3d.js'

// Initialize with a container element
const container = document.querySelector('.your-3d-container')
initCleanSlate3d(container)
```

## Folder Structure Guidelines

When adding new primitives:

```
three-js/
├── README.md                    # This file
├── [primitive-name]/
│   ├── [primitive-name].js      # Main implementation
│   ├── [primitive-name].gltf    # 3D model assets (if needed)
│   ├── README.md                # Primitive-specific documentation
│   └── assets/                  # Additional assets (textures, etc.)
```

## Development Guidelines

1. **Modularity**: Each primitive should be self-contained and export a single initialization function
2. **Responsive**: All primitives should handle container resizing gracefully
3. **Performance**: Include proper cleanup functions and consider performance optimizations
4. **Documentation**: Each primitive should have its own README with usage examples
5. **Error Handling**: Include proper error handling for WebGL context loss, missing assets, etc.

## Future Primitives Ideas

- Basic geometry primitives (cube, sphere, plane)
- Particle systems
- Shader-based materials
- Post-processing effects
- Animation controllers
- Physics integration
- VR/AR ready scenes

## Integration with Main Application

To use a primitive in your main application:

1. Import the primitive: `import initPrimitive from './primitives/three-js/[primitive-name]/[primitive-name].js'`
2. Call it with the appropriate container: `initPrimitive(document.querySelector('.container'))`
3. Consider lazy loading for better performance: Use dynamic imports when the 3D content isn't immediately needed

Example in main.js:

```javascript
// Check if container exists before loading
const container = document.querySelector('.three-js-container')
if (container) {
  import('./primitives/three-js/clean-slate3d/cleanSlate3d.js')
    .then(({ default: initCleanSlate3d }) => {
      initCleanSlate3d(container)
    })
    .catch((error) => console.error('Failed to load 3D primitive:', error))
}
```


