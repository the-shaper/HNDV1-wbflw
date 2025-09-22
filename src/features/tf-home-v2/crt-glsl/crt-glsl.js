import * as THREE from 'three'

// Default CRT parameters matching the original
const DEFAULT_PARAMS = {
  // Timing parameters (ms)
  dotDuration: 120,
  squishDuration: 160,
  lineHoldDuration: 0,
  horizontalDuration: 260,
  verticalDuration: 111,
  anticipationDuration: 140,
  anticipationRecoilDuration: 120,
  finalFadeDuration: 420,

  // Visual parameters
  finalPaddingPx: 0,
  anticipationStretchPx: 6,
  glowStrength: 1.0,
  minRy: 1,
  flashOpacity: 0.9,
  glowOpacity: 0.45,

  // Easing and animation
  easing: 'easeOutQuad',
  easeIntensity: 0.8,

  // Display settings
  canvasSize: 800,
  canvasScale: 1.0,

  // Position controls (for debugging)
  centerX: 0.5,
  centerY: 0.5,
}

// GLSL Fragment Shader for CRT reveal effect
const fragmentShader = `
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_progress; // 0-1 overall progress

// Timing parameters (converted to 0-1 ranges)
uniform float u_dotDuration;
uniform float u_squishDuration;
uniform float u_lineHoldDuration;
uniform float u_horizontalDuration;
uniform float u_verticalDuration;
uniform float u_anticipationDuration;
uniform float u_anticipationRecoilDuration;
uniform float u_finalFadeDuration;

// Visual parameters
uniform float u_anticipationStretchPx;
uniform float u_minRy;
uniform float u_flashOpacity;
uniform float u_glowOpacity;
uniform float u_glowStrength;
uniform float u_canvasScale;
uniform float u_centerX;
uniform float u_centerY;
uniform vec3 u_bgColor;

varying vec2 vUv;

float easeOutQuad(float t) {
  return 1.0 - (1.0 - t) * (1.0 - t);
}

float easeInOutQuad(float t) {
  return t < 0.5 ? 2.0 * t * t : 1.0 - pow(-2.0 * t + 2.0, 2.0) / 2.0;
}

float easeOutCubic(float t) {
  return 1.0 - pow(1.0 - t, 3.0);
}

vec2 getEllipseSize(float progress, float totalDuration, float stretch) {
  // Convert pixel stretch to normalized coordinates (relative to half resolution)
  // Account for canvas scaling in stretch calculation
  float stretchNorm = stretch / (u_resolution.x * 0.5 * u_canvasScale);

  float phase1 = min(progress / u_dotDuration, 1.0);
  float phase2 = max(0.0, min((progress - u_dotDuration) / u_squishDuration, 1.0));
  float phase3 = max(0.0, min((progress - u_dotDuration - u_squishDuration) / u_lineHoldDuration, 1.0));
  float phase4 = max(0.0, min((progress - u_dotDuration - u_squishDuration - u_lineHoldDuration) / u_anticipationDuration, 1.0));
  float phase5 = max(0.0, min((progress - u_dotDuration - u_squishDuration - u_lineHoldDuration - u_anticipationDuration) / u_anticipationRecoilDuration, 1.0));
  float phase6 = max(0.0, min((progress - u_dotDuration - u_squishDuration - u_lineHoldDuration - u_anticipationDuration - u_anticipationRecoilDuration) / u_horizontalDuration, 1.0));
  float phase7 = max(0.0, min((progress - u_dotDuration - u_squishDuration - u_lineHoldDuration - u_anticipationDuration - u_anticipationRecoilDuration - u_horizontalDuration) / u_verticalDuration, 1.0));

  float rx = 0.0;
  float ry = 0.0;

  // Phase 1: Dot to circle (small initial size, grow to medium circle)
  if (phase1 < 1.0) {
    float size = mix(0.02, 0.08, easeOutQuad(phase1)); // Start smaller, end at 8% of screen
    rx = size;
    ry = size;
  }
  // Phase 2: Squish to line
  else if (phase2 < 1.0) {
    rx = 0.08; // Keep horizontal size
    ry = mix(0.08, u_minRy * 0.002, easeOutQuad(phase2)); // Squish vertically
  }
  // Phase 3: Hold line
  else if (phase3 < 1.0) {
    rx = 0.08;
    ry = u_minRy * 0.002;
  }
  // Phase 4: Anticipation stretch
  else if (phase4 < 1.0) {
    rx = mix(0.08, 0.08 + stretchNorm, easeOutQuad(phase4));
    ry = u_minRy * 0.002;
  }
  // Phase 5: Recoil
  else if (phase5 < 1.0) {
    rx = mix(0.08 + stretchNorm, 0.08, easeOutQuad(phase5));
    ry = u_minRy * 0.002;
  }
  // Phase 6: Horizontal expansion (expand to 90% of screen width)
  else if (phase6 < 1.0) {
    rx = mix(0.08, 0.9, easeOutQuad(phase6)); // Expand to 90% of screen width
    ry = u_minRy * 0.002;
  }
  // Phase 7: Vertical expansion (expand to full screen height)
  else if (phase7 < 1.0) {
    rx = 0.9; // Keep horizontal at 90%
    ry = mix(u_minRy * 0.002, 1.0, easeOutQuad(phase7)); // Expand vertically to full screen
  }
  // Final state - full screen
  else {
    rx = 1.0; // Full width
    ry = 1.0; // Full height
  }

  return vec2(rx, ry);
}

void main() {
  vec2 st = vUv;

  // Dynamic center position from controls
  vec2 center = vec2(u_centerX, u_centerY);

  // Apply canvas scaling - this zooms in/out around the center
  st = (st - center) / u_canvasScale + center;

  float dist = distance(st, center);
  vec2 ellipseSize = getEllipseSize(u_progress, 1.0, u_anticipationStretchPx);

  // Create elliptical mask (ellipse equation: ((x-cx)/rx)^2 + ((y-cy)/ry)^2 <= 1)
  float ellipse = pow((st.x - center.x) / ellipseSize.x, 2.0) +
                  pow((st.y - center.y) / ellipseSize.y, 2.0);

  // Use step function for sharp edge, smoothstep for softer edge
  float mask = 1.0 - smoothstep(0.9, 1.1, ellipse); // 1 inside ellipse (reveal), 0 outside

  // Dark area color (opaque), reveal area is transparent
  vec3 color = u_bgColor;

  // Fade out in final phase (optional), multiplies overall opacity
  float fadePhase = max(0.0, (u_progress - 0.85) / 0.15);
  float fade = 1.0 - smoothstep(0.0, 1.0, fadePhase);

  // Alpha is 1 outside ellipse (dark overlay), 0 inside ellipse (reveal)
  float alpha = (1.0 - mask) * fade;

  gl_FragColor = vec4(color, alpha);
}
`

// Global state
let scene, camera, renderer, material, mesh
let animationId = null
let startTime = 0
let isAnimating = false
let activeParams = { ...DEFAULT_PARAMS }

// Initialize the CRT GLSL system
export function initializeCrtGlsl(config = {}) {
  const containerSelector = config.containerSelector || '#crt-container'
  const container = document.querySelector(containerSelector)

  if (!container) {
    console.error(`CRT GLSL: Container ${containerSelector} not found`)
    return
  }

  // Create canvas if it doesn't exist
  let canvas = container.querySelector('canvas')
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    container.appendChild(canvas)
  }

  // Setup Three.js scene
  scene = new THREE.Scene()

  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
  camera.position.z = 1

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    clearColor: 0x000000,
    clearAlpha: 0, // Transparent background
  })

  // Get actual container dimensions
  const containerRect = container.getBoundingClientRect()
  console.log('Container size:', containerRect.width, 'x', containerRect.height)
  console.log('Canvas before sizing:', canvas.width, 'x', canvas.height)

  // Size renderer to the actual canvas area (flex sibling next to controls)
  const canvasRect = canvas.getBoundingClientRect()

  renderer.setSize(canvasRect.width, canvasRect.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // Transparent canvas background so page shows through reveal area
  try {
    renderer.setClearColor(new THREE.Color('#000000'), 0)
  } catch (e) {
    console.warn('Failed to set default clear color:', e)
  }

  console.log('Canvas after sizing:', canvas.width, 'x', canvas.height)
  console.log('Renderer size:', renderer.getSize(new THREE.Vector2()))
  console.log('Canvas render area:', canvasRect.width, 'x', canvasRect.height)

  // Create shader material
  material = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: fragmentShader,
    uniforms: {
      u_time: { value: 0 },
      u_resolution: {
        value: new THREE.Vector2(canvasRect.width, canvasRect.height),
      },
      u_progress: { value: 0 },
      u_dotDuration: { value: 0.12 },
      u_squishDuration: { value: 0.16 },
      u_lineHoldDuration: { value: 0.0 },
      u_horizontalDuration: { value: 0.26 },
      u_verticalDuration: { value: 0.111 },
      u_anticipationDuration: { value: 0.14 },
      u_anticipationRecoilDuration: { value: 0.12 },
      u_finalFadeDuration: { value: 0.42 },
      u_anticipationStretchPx: { value: 6 },
      u_minRy: { value: 1 },
      u_flashOpacity: { value: 0.9 },
      u_glowOpacity: { value: 0.45 },
      u_glowStrength: { value: 1.0 },
      u_canvasScale: { value: 1.0 },
      u_centerX: { value: 0.5 },
      u_centerY: { value: 0.5 },
      u_bgColor: { value: new THREE.Color('#1A1515') },
    },
    transparent: true,
  })

  mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
  scene.add(mesh)

  // Optional debug plane (disabled)

  console.log('Scene setup complete - plane should fill entire viewport')

  // Start animation
  startAnimation()

  // Add resize handler (observe container to recompute canvas rect)
  const resizeObserver = new ResizeObserver((entries) => {
    for (let entry of entries) {
      const newRect = entry.contentRect
      console.log('Container resized to:', newRect.width, 'x', newRect.height)

      // Measure canvas area next to controls
      const updatedCanvasRect = canvas.getBoundingClientRect()

      // Update renderer size to match canvas box
      renderer.setSize(updatedCanvasRect.width, updatedCanvasRect.height)

      // Update material uniforms
      if (material) {
        material.uniforms.u_resolution.value.set(
          updatedCanvasRect.width,
          updatedCanvasRect.height
        )
        material.needsUpdate = true
      }

      console.log('Updated canvas size to:', canvas.width, 'x', canvas.height)
      console.log(
        'Updated canvas render area to:',
        updatedCanvasRect.width,
        'x',
        updatedCanvasRect.height
      )
    }
  })

  resizeObserver.observe(container)

  console.log('CRT GLSL initialized successfully')

  // Remove viewport clipping; renderer matches canvas size
}

// Update parameters
export function updateCrtGlsl(params) {
  if (!material) return

  Object.assign(activeParams, params)

  // Non-shader UI params: (none)

  // Convert timing to normalized values (0-1)
  const totalDuration =
    activeParams.dotDuration +
    activeParams.squishDuration +
    activeParams.lineHoldDuration +
    activeParams.anticipationDuration +
    activeParams.anticipationRecoilDuration +
    activeParams.horizontalDuration +
    activeParams.verticalDuration +
    activeParams.finalFadeDuration

  material.uniforms.u_dotDuration.value = activeParams.dotDuration / 1000
  material.uniforms.u_squishDuration.value = activeParams.squishDuration / 1000
  material.uniforms.u_lineHoldDuration.value =
    activeParams.lineHoldDuration / 1000
  material.uniforms.u_horizontalDuration.value =
    activeParams.horizontalDuration / 1000
  material.uniforms.u_verticalDuration.value =
    activeParams.verticalDuration / 1000
  material.uniforms.u_anticipationDuration.value =
    activeParams.anticipationDuration / 1000
  material.uniforms.u_anticipationRecoilDuration.value =
    activeParams.anticipationRecoilDuration / 1000
  material.uniforms.u_finalFadeDuration.value =
    activeParams.finalFadeDuration / 1000

  material.uniforms.u_anticipationStretchPx.value =
    activeParams.anticipationStretchPx
  material.uniforms.u_minRy.value = activeParams.minRy
  material.uniforms.u_flashOpacity.value = activeParams.flashOpacity
  material.uniforms.u_glowOpacity.value = activeParams.glowOpacity
  material.uniforms.u_glowStrength.value = activeParams.glowStrength
  material.uniforms.u_canvasScale.value = activeParams.canvasScale
  material.uniforms.u_centerX.value = activeParams.centerX
  material.uniforms.u_centerY.value = activeParams.centerY

  // Update shader background color if provided
  if (params && typeof params.backgroundColorHex === 'string') {
    try {
      material.uniforms.u_bgColor.value = new THREE.Color(
        params.backgroundColorHex
      )
    } catch (e) {
      console.warn('Invalid bg hex for shader:', params.backgroundColorHex)
    }
  }

  // Restart animation if parameters changed
  if (isAnimating) {
    restartAnimation()
  }
}

// Animation functions
function startAnimation() {
  if (animationId) return

  startTime = performance.now() / 1000
  isAnimating = true

  function animate(currentTime) {
    if (!isAnimating) return

    const elapsed = currentTime / 1000 - startTime

    const totalDuration =
      activeParams.dotDuration +
      activeParams.squishDuration +
      activeParams.lineHoldDuration +
      activeParams.anticipationDuration +
      activeParams.anticipationRecoilDuration +
      activeParams.horizontalDuration +
      activeParams.verticalDuration +
      activeParams.finalFadeDuration

    const progress = Math.min(elapsed / (totalDuration / 1000), 1.0)

    if (material) {
      material.uniforms.u_time.value = elapsed
      material.uniforms.u_progress.value = progress

      // Debug info removed to avoid UI interference
    }

    // Render full canvas area (no viewport/scissor)
    renderer.render(scene, camera)

    if (progress < 1.0) {
      animationId = requestAnimationFrame(animate)
    } else {
      isAnimating = false
      // Auto-restart after delay
      setTimeout(() => {
        restartAnimation()
      }, 1000)
    }
  }

  animationId = requestAnimationFrame(animate)
}

function restartAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  startAnimation()
}

// Window API
window.initializeCrtGlsl = initializeCrtGlsl
window.updateCrtGlsl = updateCrtGlsl
window.restartCrtAnimation = restartAnimation
