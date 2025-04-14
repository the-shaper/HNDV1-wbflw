import * as THREE from 'three'

let scene, camera, renderer
let particles = []
let simulationRunning = true
let container, canvas
let renderTarget, finalQuad, finalScene, finalCamera

// --- Simulation Parameters ---
// Default parameters
let defaultParams = {
  particleAmount: 50,
  particleSize: 15.0,
  particleSpeed: 0.1,
  particleForce: 0.5,
  particleColorHex: '#FF3d23', // Store as hex string initially
  backgroundColorHex: '#251818', // Add the '#' prefix
  boundaryRadius: 0.4,
  metaballThreshold: 0.6,
  canvasSize: 800, // Fixed internal canvas size
}

// Final parameters, potentially overridden by data attributes
let params = { ...defaultParams }

// --- Metaball Shader ---
const vertexShader = `
      varying vec2 vUv;
      void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
  `

// Adjusted fragment shader to accept dynamic max particles
const fragmentShader = `
      uniform vec3 particleColor;
      uniform vec3 backgroundColor;
      uniform vec2 resolution;
      uniform vec2 particlePositions[MAX_PARTICLES]; // Use placeholder
      uniform float particleSizes[MAX_PARTICLES];    // Use placeholder
      uniform int particleCount;
      uniform float boundaryRadius;
      uniform float threshold;

      varying vec2 vUv;

      void main() {
          vec2 center = vec2(0.5);
          vec2 uv = gl_FragCoord.xy / resolution.xy; // Use screen coordinates

          // Calculate distance from center for boundary
          float distFromCenter = distance(uv, center);

          // Discard fragments outside the circular boundary visually
          if (distFromCenter > boundaryRadius + 0.05) {
              gl_FragColor = vec4(backgroundColor, 1.0);
              return;
          }

          float totalInfluence = 0.0;
          for (int i = 0; i < MAX_PARTICLES; ++i) { // Loop up to MAX_PARTICLES
              if (i >= particleCount) break; // Only process active particles

              vec2 particleScreenPos = (particlePositions[i] * 0.5) + 0.5;
              float distSq = dot(uv - particleScreenPos, uv - particleScreenPos);
              float radius = particleSizes[i] / resolution.y;
              float radiusSq = radius * radius;

              totalInfluence += exp(-distSq / (radiusSq * 0.5));
          }

          float intensity = smoothstep(threshold - 0.01, threshold + 0.01, totalInfluence);
          vec3 color = mix(backgroundColor, particleColor, intensity);
          gl_FragColor = vec4(color, 1.0);
      }
  `

let metaballMaterial
// Dynamically sized arrays based on particleAmount after reading attributes
let particlePositionsUniform
let particleSizesUniform

// --- Initialization ---
function init() {
  container = document.getElementById('container')
  if (!container) {
    console.error('Error: Container element #container not found.')
    return
  }
  canvas = document.getElementById('simulationCanvas')
  if (!canvas) {
    console.error('Error: Canvas element #simulationCanvas not found.')
    return
  }

  // Read parameters from data attributes
  readParametersFromDOM()

  // Apply CSS to handle aspect ratio through container
  setupCanvasCSS()

  // Initialize dynamic arrays based on actual particleAmount
  const maxParticles = params.particleAmount // Use the determined amount
  particlePositionsUniform = new Float32Array(maxParticles * 2)
  particleSizesUniform = new Float32Array(maxParticles)

  // Create THREE.Color objects *after* reading potential overrides
  params.particleColor = new THREE.Color(params.particleColorHex)
  params.backgroundColor = new THREE.Color(params.backgroundColorHex)

  // Create fixed-size render target
  renderTarget = new THREE.WebGLRenderTarget(
    params.canvasSize,
    params.canvasSize,
    {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    }
  )

  // Main simulation scene (renders to the render target)
  scene = new THREE.Scene()
  scene.background = params.backgroundColor

  // Camera - always use square aspect ratio (1.0)
  const frustumSize = 1.0
  camera = new THREE.OrthographicCamera(
    frustumSize / -2,
    frustumSize / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    100
  )
  camera.position.z = 1

  // Set up the final scene to display the render target
  finalScene = new THREE.Scene()
  finalCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
  finalCamera.position.z = 1

  // Renderer - always render at the fixed square size
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true })
  renderer.setSize(params.canvasSize, params.canvasSize, false)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // Create Particles
  createParticles()

  // Create Metaball Plane
  const finalFragmentShader = fragmentShader.replace(
    /MAX_PARTICLES/g,
    `${params.particleAmount}`
  )

  const geometry = new THREE.PlaneGeometry(2, 2)
  metaballMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: finalFragmentShader,
    uniforms: {
      resolution: {
        value: new THREE.Vector2(params.canvasSize, params.canvasSize),
      },
      particleColor: { value: params.particleColor },
      backgroundColor: { value: params.backgroundColor },
      particlePositions: { value: particlePositionsUniform },
      particleSizes: { value: particleSizesUniform },
      particleCount: { value: params.particleAmount },
      boundaryRadius: { value: params.boundaryRadius },
      threshold: { value: params.metaballThreshold },
    },
    defines: {
      MAX_PARTICLES: params.particleAmount,
    },
  })
  const quad = new THREE.Mesh(geometry, metaballMaterial)
  scene.add(quad)

  // Fixed resolution for shader
  metaballMaterial.uniforms.resolution.value.set(
    params.canvasSize,
    params.canvasSize
  )

  // Create a quad to display the render target in the final scene
  const finalMaterial = new THREE.MeshBasicMaterial({
    map: renderTarget.texture,
  })
  finalQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), finalMaterial)
  finalScene.add(finalQuad)

  // Setup Controls (if they exist)
  setupControls()

  // Handle Window Resize - only needed for container resizing
  window.addEventListener('resize', onWindowResize, false)

  // Start Animation Loop
  animate()
}

// Apply CSS to maintain aspect ratio through the container
function setupCanvasCSS() {
  // Make canvas display as block to eliminate inline spacing
  canvas.style.display = 'block'

  // Make container position relative for absolute positioning
  container.style.position = 'relative'

  // Apply styles to maintain aspect ratio through container size
  const containerStyle = `
    aspect-ratio: 1 / 1;
    max-width: 100%;
    max-height: 100%;
    margin: 0 auto;
    overflow: hidden;
  `

  // Apply these styles to container or parent element
  const wrapperDiv = document.createElement('div')
  wrapperDiv.style.cssText = containerStyle

  // Insert wrapper before canvas in the DOM
  canvas.parentNode.insertBefore(wrapperDiv, canvas)

  // Move canvas into the wrapper
  wrapperDiv.appendChild(canvas)

  // Style canvas to fit wrapper properly
  canvas.style.cssText = `
    width: 100%;
    height: 100%;
    object-fit: contain;
  `
}

// --- Read Parameters from DOM ---
function readParametersFromDOM() {
  if (!container) return // Should have been checked in init

  const data = container.dataset // Get all data attributes

  // Helper to get attribute value or default
  const getParam = (key, defaultValue, parser = parseFloat) => {
    return data[key] !== undefined ? parser(data[key]) : defaultValue
  }
  const getIntParam = (key, defaultValue) =>
    getParam(key, defaultValue, parseInt)
  const getStringParam = (key, defaultValue) =>
    getParam(key, defaultValue, String)

  // Override default params with values from data attributes if present
  params.particleAmount = getIntParam(
    'particleAmount',
    defaultParams.particleAmount
  )
  params.particleSize = getParam('particleSize', defaultParams.particleSize)
  params.particleSpeed = getParam('particleSpeed', defaultParams.particleSpeed)
  params.particleForce = getParam('particleForce', defaultParams.particleForce)
  params.particleColorHex = getStringParam(
    'particleColor',
    defaultParams.particleColorHex
  )
  params.backgroundColorHex = getStringParam(
    'backgroundColor',
    defaultParams.backgroundColorHex
  )
  params.boundaryRadius = getParam(
    'boundaryRadius',
    defaultParams.boundaryRadius
  )
  params.metaballThreshold = getParam(
    'metaballThreshold',
    defaultParams.metaballThreshold
  )

  // --- Important Validation ---
  // Ensure particleAmount is reasonable if read from DOM, prevent shader issues
  params.particleAmount = Math.max(1, Math.min(params.particleAmount, 1000)) // Example: Clamp between 1 and 1000

  // Log the final parameters being used
  console.log('Using simulation parameters:', params)
}

// --- Particle Creation ---
function createParticles() {
  particles = [] // Clear existing particles
  const boundary = params.boundaryRadius * 0.95
  const maxParticles = params.particleAmount // Use the determined amount

  // Resize uniform arrays if necessary (e.g., if amount changed via controls)
  if (particlePositionsUniform.length / 2 !== maxParticles) {
    particlePositionsUniform = new Float32Array(maxParticles * 2)
    particleSizesUniform = new Float32Array(maxParticles)
    if (metaballMaterial) {
      // Update shader uniforms if material exists
      metaballMaterial.uniforms.particlePositions.value =
        particlePositionsUniform
      metaballMaterial.uniforms.particleSizes.value = particleSizesUniform
      // IMPORTANT: Also update the shader definition if MAX_PARTICLES changes
      // This requires recompiling the shader, which is complex.
      // For simplicity now, we assume particleAmount set via data-attribute is fixed.
      // If controls change particleAmount, we might need to recreate the material.
      console.warn(
        'Dynamically changing particleAmount via controls after init is not fully supported without shader recompilation. Initial data-attribute value is used for shader limits.'
      )
    }
  }

  for (let i = 0; i < maxParticles; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = Math.random() * boundary
    const position = new THREE.Vector2(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius
    )
    const velocity = new THREE.Vector2(
      (Math.random() - 0.5) * 0.005,
      (Math.random() - 0.5) * 0.005
    )

    particles.push({
      position: position,
      velocity: velocity,
      size: params.particleSize,
    })

    particlePositionsUniform[i * 2] = position.x
    particlePositionsUniform[i * 2 + 1] = position.y
    particleSizesUniform[i] = particles[i].size
  }

  if (metaballMaterial) {
    metaballMaterial.uniforms.particleCount.value = maxParticles
    metaballMaterial.uniforms.particlePositions.needsUpdate = true
    metaballMaterial.uniforms.particleSizes.needsUpdate = true
  }
}

// --- Control Setup ---
function setupControls() {
  // Check if controls container exists - makes controls optional
  const controlsContainer = document.getElementById('controls')
  if (!controlsContainer) {
    console.log('Controls container #controls not found. Skipping setup.')
    // Hide or disable the container logic if not found in Webflow
    if (container) container.style.paddingLeft = '0px' // Example adjustment
    return
  }

  const particleAmountSlider = document.getElementById('particleAmount')
  const particleAmountValue = document.getElementById('particleAmountValue')
  const particleSizeSlider = document.getElementById('particleSize')
  const particleSizeValue = document.getElementById('particleSizeValue')
  const particleSpeedSlider = document.getElementById('particleSpeed')
  const particleSpeedValue = document.getElementById('particleSpeedValue')
  const particleForceSlider = document.getElementById('particleForce')
  const particleForceValue = document.getElementById('particleForceValue')
  const particleColorPicker = document.getElementById('particleColor')
  const backgroundColorPicker = document.getElementById('backgroundColor')
  const playStopButton = document.getElementById('playStopButton')

  // Helper function to safely set control value and display
  const setupControl = (
    slider,
    valueDisplay,
    paramValue,
    formatter = (v) => v.toFixed(1)
  ) => {
    if (slider) {
      slider.value = paramValue
      if (valueDisplay) valueDisplay.textContent = formatter(paramValue)
    }
  }
  const setupColorControl = (picker, colorHex) => {
    if (picker) picker.value = colorHex
  }

  // Set initial values from potentially overridden params
  setupControl(
    particleAmountSlider,
    particleAmountValue,
    params.particleAmount,
    (v) => v.toString()
  )
  setupControl(
    particleSizeSlider,
    particleSizeValue,
    params.particleSize,
    (v) => v.toFixed(1)
  )
  setupControl(
    particleSpeedSlider,
    particleSpeedValue,
    params.particleSpeed,
    (v) => v.toFixed(2)
  )
  setupControl(
    particleForceSlider,
    particleForceValue,
    params.particleForce,
    (v) => v.toFixed(1)
  )
  setupColorControl(particleColorPicker, params.particleColorHex)
  setupColorControl(backgroundColorPicker, params.backgroundColorHex)

  // Add event listeners only if elements exist
  if (particleAmountSlider) {
    particleAmountSlider.addEventListener('input', (e) => {
      const newAmount = parseInt(e.target.value)
      // Note: Changing amount after init with controls is tricky due to shader limits.
      // For now, we update the value display but don't recreate particles/shader.
      // Consider disabling this control or implementing full shader recompilation if needed.
      params.particleAmount = newAmount // Update param for reference if needed elsewhere
      if (particleAmountValue) particleAmountValue.textContent = newAmount
      console.warn(
        'Changing particle amount via controls is limited. Reload page with new data-particle-amount for changes to take full effect.'
      )
      // createParticles(); // This would require shader adjustments/recompilation
    })
  }

  if (particleSizeSlider) {
    particleSizeSlider.addEventListener('input', (e) => {
      params.particleSize = parseFloat(e.target.value)
      if (particleSizeValue)
        particleSizeValue.textContent = params.particleSize.toFixed(1)
      // Update existing particle sizes and uniform array
      particles.forEach((p, i) => {
        if (i < metaballMaterial.uniforms.particleCount.value) {
          // Use the actual count in the shader
          p.size = params.particleSize
          particleSizesUniform[i] = p.size
        }
      })
      if (metaballMaterial) {
        metaballMaterial.uniforms.particleSizes.needsUpdate = true
      }
    })
  }

  if (particleSpeedSlider) {
    particleSpeedSlider.addEventListener('input', (e) => {
      params.particleSpeed = parseFloat(e.target.value)
      if (particleSpeedValue)
        particleSpeedValue.textContent = params.particleSpeed.toFixed(2)
    })
  }

  if (particleForceSlider) {
    particleForceSlider.addEventListener('input', (e) => {
      params.particleForce = parseFloat(e.target.value)
      if (particleForceValue)
        particleForceValue.textContent = params.particleForce.toFixed(1)
    })
  }

  if (particleColorPicker) {
    particleColorPicker.addEventListener('input', (e) => {
      params.particleColorHex = e.target.value // Store hex
      params.particleColor.set(params.particleColorHex) // Update THREE.Color
      if (metaballMaterial) {
        metaballMaterial.uniforms.particleColor.value = params.particleColor
      }
    })
  }

  if (backgroundColorPicker) {
    backgroundColorPicker.addEventListener('input', (e) => {
      params.backgroundColorHex = e.target.value // Store hex
      params.backgroundColor.set(params.backgroundColorHex) // Update THREE.Color
      if (scene) scene.background = params.backgroundColor
      if (metaballMaterial) {
        metaballMaterial.uniforms.backgroundColor.value = params.backgroundColor
      }
    })
  }

  if (playStopButton) {
    playStopButton.addEventListener('click', () => {
      simulationRunning = !simulationRunning
      playStopButton.textContent = simulationRunning ? 'Stop' : 'Play'
    })
    playStopButton.textContent = simulationRunning ? 'Stop' : 'Play' // Initial text
  }
}

// --- Update Simulation ---
function updateParticles(deltaTime) {
  const forceFactor = params.particleForce * 0.0001
  const speedFactor = params.particleSpeed * deltaTime * 30
  const boundary = params.boundaryRadius
  const boundarySq = boundary * boundary
  const damping = 0.985
  const particleCount = metaballMaterial.uniforms.particleCount.value // Use actual shader count

  for (let i = 0; i < particleCount; i++) {
    const p1 = particles[i]

    // Apply forces
    for (let j = i + 1; j < particleCount; j++) {
      const p2 = particles[j]
      const delta = p2.position.clone().sub(p1.position)
      const distSq = delta.lengthSq()

      if (distSq > 0.00001 && distSq < boundary * boundary * 4) {
        const forceMagnitude = forceFactor / distSq
        const forceVec = delta.normalize().multiplyScalar(forceMagnitude)
        p1.velocity.add(forceVec)
        p2.velocity.sub(forceVec)
      }
    }

    // Update position
    p1.position.add(p1.velocity.clone().multiplyScalar(speedFactor))

    // Apply damping
    p1.velocity.multiplyScalar(damping)

    // Boundary Collision
    const distFromCenterSq = p1.position.lengthSq()
    if (distFromCenterSq > boundarySq) {
      const normal = p1.position.clone().normalize()
      const dotProduct = p1.velocity.dot(normal)
      const reflection = normal.clone().multiplyScalar(2 * dotProduct)
      p1.velocity.sub(reflection)
      p1.position.normalize().multiplyScalar(boundary)
    }

    // Update uniform array
    particlePositionsUniform[i * 2] = p1.position.x
    particlePositionsUniform[i * 2 + 1] = p1.position.y
  }

  // Mark position uniform for update
  if (metaballMaterial) {
    metaballMaterial.uniforms.particlePositions.needsUpdate = true
  }
}

// --- Window Resize ---
function onWindowResize() {
  // No need to adjust renderer or camera since we're using CSS for aspect ratio
  // and fixed canvas size. Just update container if needed.
}

// --- Animation Loop ---
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const deltaTime = clock.getDelta()

  if (simulationRunning) {
    updateParticles(deltaTime)
  }

  if (renderer && scene && camera) {
    // First render the simulation to the render target
    renderer.setRenderTarget(renderTarget)
    renderer.render(scene, camera)

    // Then render the render target to the canvas
    renderer.setRenderTarget(null)
    renderer.render(finalScene, finalCamera)
  }
}

// --- Start ---
// Don't auto-start here. We'll call init from the HTML script tag
// to ensure the DOM is ready.
// init();

// Export init function if needed for more control later,
// but for simple loading, just calling it below is fine.
// export { init };

// Auto-initialize when the script is loaded as a module
init()
