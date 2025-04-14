import * as THREE from 'three'

let scene, camera, renderer
let particles = []
let simulationRunning = true
let renderTarget, finalQuad, finalScene, finalCamera
let metaballMaterial
let particlePositionsUniform
let particleSizesUniform

// Default simulation parameters
let defaultParams = {
  particleAmount: 50,
  particleSize: 15.0,
  particleSpeed: 0.01,
  particleForce: 0.5,
  particleColorHex: '#FF3d23',
  backgroundColorHex: '#edf7ee',
  boundaryRadius: 0.4,
  metaballThreshold: 0.6,
  canvasSize: 800,
}

// Active parameters, potentially overridden by data attributes
let params = { ...defaultParams }

// --- Global Configuration for Initialization ---
const energySimDefaultConfig = {
  containerSelector: '#container', // Default for energy.html
  createCanvas: false, // Default for energy.html (canvas exists)
}

// Flag to prevent multiple initializations FOR THE SAME CONTAINER
window.energySimulationContexts = {} // Store initialized containers

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

// --- Initialization ---
// Accepts a configuration object
function init(config = {}) {
  // Check if already initialized for this specific container
  if (window.energySimulationContexts[config.containerSelector]) {
    console.warn(
      `Energy simulation already initialized for ${config.containerSelector}. Skipping.`
    )
    return
  }

  // Merge provided config with defaults
  const currentConfig = { ...energySimDefaultConfig, ...config }

  // Find the container using the selector
  const container = document.querySelector(currentConfig.containerSelector)
  if (!container) {
    // Log error but don't stop script execution entirely, might be called multiple times
    console.error(
      `Energy Sim Init Error: Container element "${currentConfig.containerSelector}" not found.`
    )
    return
  }

  // Find or create the canvas
  let canvas
  if (currentConfig.createCanvas) {
    // Check if canvas already exists (e.g., from previous failed attempt)
    canvas = container.querySelector('canvas.energy-simulation-canvas')
    if (!canvas) {
      canvas = document.createElement('canvas')
      canvas.classList.add('energy-simulation-canvas') // Add class for identification
      container.appendChild(canvas)
      console.log(`Created canvas inside: ${currentConfig.containerSelector}`)
    } else {
      console.log(
        `Reusing existing canvas in: ${currentConfig.containerSelector}`
      )
    }
  } else {
    // Try to find an existing canvas within the container first
    canvas = container.querySelector('canvas')
    if (!canvas) {
      // Fallback to the original ID search if not found inside container
      canvas = document.getElementById('simulationCanvas')
    }
    if (!canvas) {
      console.error(
        `Energy Sim Init Error: Canvas element not found for ${currentConfig.containerSelector}, and createCanvas is false.`
      )
      return
    }
    console.log(
      `Using existing canvas found for: ${currentConfig.containerSelector}`
    )
  }

  // Read parameters from the *selected* container's data attributes
  // We store the read parameters globally in `params`
  let instanceParams = readParametersFromDOM(container)

  // Apply CSS to the container and the found/created canvas
  setupCanvasCSS(container, canvas)

  // Initialize dynamic arrays based on actual particleAmount AFTER reading attributes
  const maxParticles = instanceParams.particleAmount
  // REMOVE: const instanceParticlePositions = new Float32Array(maxParticles * 2)
  // REMOVE: const instanceParticleSizes = new Float32Array(maxParticles)
  // INSTEAD: Initialize the global arrays
  particlePositionsUniform = new Float32Array(maxParticles * 2)
  particleSizesUniform = new Float32Array(maxParticles)

  // Create THREE.Color objects *after* reading potential overrides
  const instanceParticleColor = new THREE.Color(instanceParams.particleColorHex)
  const instanceBackgroundColor = new THREE.Color(
    instanceParams.backgroundColorHex
  )

  // --- Rest of the Three.js setup ---
  renderTarget = new THREE.WebGLRenderTarget(
    instanceParams.canvasSize,
    instanceParams.canvasSize,
    {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    }
  )

  scene = new THREE.Scene()
  scene.background = instanceBackgroundColor

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

  finalScene = new THREE.Scene()
  finalCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
  finalCamera.position.z = 1

  // Use the specific canvas element found/created earlier
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true })
  renderer.setSize(instanceParams.canvasSize, instanceParams.canvasSize, false) // Render at fixed internal size
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // Create Particles - modify to use global arrays implicitly or pass them
  // Let's simplify createParticles to just use the globals for now.
  particles = createParticles(instanceParams) // Remove array arguments

  // Create Metaball Plane Shader Material
  const finalFragmentShader = fragmentShader.replace(
    /MAX_PARTICLES/g,
    `${instanceParams.particleAmount}` // Use the actual amount read/defaulted
  )
  const geometry = new THREE.PlaneGeometry(2, 2)
  metaballMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: finalFragmentShader,
    uniforms: {
      resolution: {
        value: new THREE.Vector2(
          instanceParams.canvasSize,
          instanceParams.canvasSize
        ),
      },
      particleColor: { value: instanceParticleColor },
      backgroundColor: { value: instanceBackgroundColor },
      // Use the GLOBAL arrays for the shader uniform
      particlePositions: { value: particlePositionsUniform },
      particleSizes: { value: particleSizesUniform },
      particleCount: { value: instanceParams.particleAmount },
      boundaryRadius: { value: instanceParams.boundaryRadius },
      threshold: { value: instanceParams.metaballThreshold },
    },
    defines: {
      MAX_PARTICLES: instanceParams.particleAmount,
    },
  })
  const quad = new THREE.Mesh(geometry, metaballMaterial)
  scene.add(quad)

  // Final Quad to display render target
  const finalMaterial = new THREE.MeshBasicMaterial({
    map: renderTarget.texture,
  })
  finalQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), finalMaterial)
  finalScene.add(finalQuad)

  // Setup Controls (optional, checks for elements internally)
  setupControls(instanceParams)

  // Handle Window Resize (adjusts CSS container size, renderer size is fixed)
  window.addEventListener('resize', () => onWindowResize(container), false) // Pass container

  // Start Animation Loop
  animate()

  // Mark this container as initialized
  window.energySimulationContexts[currentConfig.containerSelector] = true
  console.log(
    `Energy simulation initialized successfully for: ${currentConfig.containerSelector}`
  )
}

// Apply CSS directly to container and canvas
function setupCanvasCSS(targetContainer, targetCanvas) {
  if (!targetContainer || !targetCanvas) return

  // Make canvas display as block to eliminate inline spacing
  targetCanvas.style.display = 'block'

  // Ensure container has relative positioning if not already set
  // Needed if we were absolutely positioning canvas inside, but less critical now.
  // Still good practice for containing elements.
  const currentPosition = window.getComputedStyle(targetContainer).position
  if (currentPosition === 'static') {
    targetContainer.style.position = 'relative'
  }

  // Apply styles to the container to control aspect ratio and sizing
  targetContainer.style.aspectRatio = '1 / 1'
  targetContainer.style.maxWidth = targetContainer.style.maxWidth || '100%' // Respect existing max-width if set
  targetContainer.style.maxHeight = targetContainer.style.maxHeight || '100%' // Respect existing max-height
  targetContainer.style.margin = targetContainer.style.margin || '0 auto' // Respect existing margin
  targetContainer.style.overflow = 'hidden' // Crucial

  // Style canvas to fill the container
  targetCanvas.style.width = '100%'
  targetCanvas.style.height = '100%'
  targetCanvas.style.objectFit = 'contain' // Or 'cover'
  // Remove the old wrapperDiv logic entirely
}

// --- Read Parameters from DOM ---
// Accept the container element as an argument
function readParametersFromDOM(targetContainer) {
  let instanceParams = { ...defaultParams }

  if (!targetContainer) {
    console.warn('No container provided to readParametersFromDOM')
    return instanceParams // Return defaults
  }

  const data = targetContainer.dataset // Get all data attributes

  // Helper functions remain the same
  const getParam = (key, defaultValue, parser = parseFloat) => {
    // Convert camelCase key (from dataset) to kebab-case (for attribute name)
    const kebabKey = key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
    // Check dataset first, then fall back to getAttribute for broader compatibility if needed
    const value =
      data[key] !== undefined
        ? data[key]
        : targetContainer.getAttribute(`data-${kebabKey}`)
    return value !== null ? parser(value) : defaultValue
  }
  const getIntParam = (key, defaultValue) =>
    getParam(key, defaultValue, parseInt)
  const getStringParam = (key, defaultValue) =>
    getParam(key, defaultValue, String)

  // Override default params with values from data attributes if present
  instanceParams.particleAmount = getIntParam(
    'particleAmount',
    defaultParams.particleAmount
  )
  instanceParams.particleSize = getParam(
    'particleSize',
    defaultParams.particleSize
  )
  instanceParams.particleSpeed = getParam(
    'particleSpeed',
    defaultParams.particleSpeed
  )
  instanceParams.particleForce = getParam(
    'particleForce',
    defaultParams.particleForce
  )
  instanceParams.particleColorHex = getStringParam(
    'particleColor',
    defaultParams.particleColorHex
  )
  instanceParams.backgroundColorHex = getStringParam(
    'backgroundColor',
    defaultParams.backgroundColorHex
  )
  instanceParams.boundaryRadius = getParam(
    'boundaryRadius',
    defaultParams.boundaryRadius
  )
  instanceParams.metaballThreshold = getParam(
    'metaballThreshold',
    defaultParams.metaballThreshold
  )

  // Validation
  instanceParams.particleAmount = Math.max(
    1,
    Math.min(instanceParams.particleAmount, 1000)
  )

  console.log(
    `Parameters read from [${targetContainer.tagName}${
      targetContainer.id ? '#' + targetContainer.id : ''
    }${
      targetContainer.className
        ? '.' + targetContainer.className.split(' ').join('.')
        : ''
    }]:`,
    instanceParams
  )
  return instanceParams // Return the specific params for this container
}

// --- Particle Creation ---
// Modify to remove array parameters and use globals
function createParticles(currentParams) {
  let instanceParticles = [] // Keep this local for particle data
  const boundary = currentParams.boundaryRadius * 0.95
  const maxParticles = currentParams.particleAmount

  // Check if global arrays are sized correctly (they should be from init)
  if (
    !particlePositionsUniform ||
    particlePositionsUniform.length / 2 !== maxParticles ||
    !particleSizesUniform ||
    particleSizesUniform.length !== maxParticles
  ) {
    console.error(
      'Global uniform arrays not initialized correctly before createParticles!'
    )
    return [] // Return empty to prevent further errors
  }

  for (let i = 0; i < maxParticles; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = Math.random() * boundary
    const position = new THREE.Vector2(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius
    )
    const velocity = new THREE.Vector2(
      (Math.random() - 0.5) * 0.0005,
      (Math.random() - 0.5) * 0.0005
    )

    instanceParticles.push({
      position: position,
      velocity: velocity,
      size: currentParams.particleSize,
    })

    // Initialize the GLOBAL uniform arrays directly
    particlePositionsUniform[i * 2] = position.x
    particlePositionsUniform[i * 2 + 1] = position.y
    particleSizesUniform[i] = instanceParticles[i].size
  }

  // Update uniforms IF the material exists
  if (metaballMaterial) {
    metaballMaterial.uniforms.particleCount.value = maxParticles
    // The uniforms already point to the global arrays, just need to mark for update
    metaballMaterial.uniforms.particlePositions.needsUpdate = true
    metaballMaterial.uniforms.particleSizes.needsUpdate = true
  }
  return instanceParticles // Return the simulation particle data
}

// --- Control Setup ---
function setupControls(currentParams) {
  // Check if controls container exists - makes controls optional
  const controlsContainer = document.getElementById('controls')
  if (!controlsContainer) {
    // console.log('Controls container #controls not found. Skipping setup.') // Optional: uncomment for debugging
    return // Exit function cleanly if controls don't exist
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

  // Set initial values from the PASSED params for this instance
  setupControl(
    particleAmountSlider,
    particleAmountValue,
    currentParams.particleAmount,
    (v) => v.toString()
  )
  setupControl(
    particleSizeSlider,
    particleSizeValue,
    currentParams.particleSize,
    (v) => v.toFixed(1)
  )
  setupControl(
    particleSpeedSlider,
    particleSpeedValue,
    currentParams.particleSpeed,
    (v) => v.toFixed(2)
  )
  setupControl(
    particleForceSlider,
    particleForceValue,
    currentParams.particleForce,
    (v) => v.toFixed(1)
  )
  setupColorControl(particleColorPicker, currentParams.particleColorHex)
  setupColorControl(backgroundColorPicker, currentParams.backgroundColorHex)

  // Event listeners will now call the global updateEnergySimulation
  // This means controls ONLY affect the LAST initialized simulation if multiple exist.
  // This needs refactoring if independent control of multiple instances is needed.
  if (particleAmountSlider) {
    particleAmountSlider.addEventListener('input', (e) => {
      const newAmount = parseInt(e.target.value)
      // Note: Changing amount after init with controls is tricky due to shader limits.
      // For now, we update the value display but don't recreate particles/shader.
      // Consider disabling this control or implementing full shader recompilation if needed.
      currentParams.particleAmount = newAmount // Update param for reference if needed elsewhere
      if (particleAmountValue) particleAmountValue.textContent = newAmount
      console.warn(
        'Changing particle amount via controls is limited. Reload page with new data-particle-amount for changes to take full effect.'
      )
      // createParticles(); // This would require shader adjustments/recompilation
    })
  }

  if (particleSizeSlider) {
    particleSizeSlider.addEventListener('input', (e) => {
      currentParams.particleSize = parseFloat(e.target.value)
      if (particleSizeValue)
        particleSizeValue.textContent = currentParams.particleSize.toFixed(1)
      // Update existing particle sizes and uniform array
      particles.forEach((p, i) => {
        if (i < metaballMaterial.uniforms.particleCount.value) {
          // Use the actual count in the shader
          p.size = currentParams.particleSize
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
      currentParams.particleSpeed = parseFloat(e.target.value)
      if (particleSpeedValue)
        particleSpeedValue.textContent = currentParams.particleSpeed.toFixed(2)
    })
  }

  if (particleForceSlider) {
    particleForceSlider.addEventListener('input', (e) => {
      currentParams.particleForce = parseFloat(e.target.value)
      if (particleForceValue)
        particleForceValue.textContent = currentParams.particleForce.toFixed(1)
    })
  }

  if (particleColorPicker) {
    particleColorPicker.addEventListener('input', (e) => {
      currentParams.particleColorHex = e.target.value // Store hex
      currentParams.particleColor.set(currentParams.particleColorHex) // Update THREE.Color
      if (metaballMaterial) {
        metaballMaterial.uniforms.particleColor.value =
          currentParams.particleColor
      }
    })
  }

  if (backgroundColorPicker) {
    backgroundColorPicker.addEventListener('input', (e) => {
      currentParams.backgroundColorHex = e.target.value // Store hex
      currentParams.backgroundColor.set(currentParams.backgroundColorHex) // Update THREE.Color
      if (scene) scene.background = currentParams.backgroundColor
      if (metaballMaterial) {
        metaballMaterial.uniforms.backgroundColor.value =
          currentParams.backgroundColor
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
  // ... forceFactor, speedFactor etc ...
  // This check should prevent the error if init failed somehow, but the root cause was the uninitialized global array
  if (!particlePositionsUniform || !particles || !metaballMaterial) {
    console.warn('updateParticles called before simulation fully initialized.')
    return
  }

  const forceFactor = params.particleForce * 0.0001
  const speedFactor = params.particleSpeed * deltaTime * 30
  const boundary = params.boundaryRadius
  const boundarySq = boundary * boundary
  const damping = 0.985
  const particleCount = metaballMaterial.uniforms.particleCount.value

  for (let i = 0; i < particleCount; i++) {
    // Add checks for p1 if needed, though particleCount should be reliable
    if (!particles[i]) continue
    const p1 = particles[i]

    // Apply forces (check p2 as well)
    for (let j = i + 1; j < particleCount; j++) {
      if (!particles[j]) continue
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

    // Update uniform array (This is the line that caused the error)
    // Should now work as particlePositionsUniform is initialized globally in init
    particlePositionsUniform[i * 2] = p1.position.x
    particlePositionsUniform[i * 2 + 1] = p1.position.y
  }

  // Mark position uniform for update
  if (metaballMaterial) {
    metaballMaterial.uniforms.particlePositions.needsUpdate = true
  }
}

// --- Window Resize ---
// Accept container, but current logic might be fine as it relies on CSS
function onWindowResize(targetContainer) {
  // Renderer size is fixed (params.canvasSize)
  // Camera aspect is fixed (1.0)
  // The CSS applied in setupCanvasCSS handles the container/canvas scaling.
  // No specific adjustments needed here unless complex layout changes occur.
  // console.log("Window resized, container:", targetContainer);
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

// --- Global Initialization Function (Assign to window) ---
// This allows manual initialization if needed.
window.initializeEnergySimulation = function (config = {}) {
  init(config)
}

// --- External API (Assign to window) ---
// NOTE: This API will affect the LAST initialized instance due to reliance on global variables like `metaballMaterial`, `scene`, `params`.
window.updateEnergySimulation = function (newParams) {
  if (!metaballMaterial || !scene) {
    console.warn('Simulation components not ready for update.')
    return
  }
  if (typeof newParams !== 'object' || newParams === null) {
    console.warn('updateEnergySimulation expects an object of parameters.')
    return
  }

  console.log('Attempting to update simulation with:', newParams)

  let needsUniformUpdate = false // Flag if any shader uniform needs needsUpdate = true
  let needsSceneUpdate = false // Flag if scene background changes

  // Update specific parameters based on what's provided in newParams
  if (newParams.particleColorHex !== undefined) {
    params.particleColorHex = newParams.particleColorHex
    params.particleColor.set(params.particleColorHex) // Update the THREE.Color object
    metaballMaterial.uniforms.particleColor.value = params.particleColor // Uniform already points to the THREE.Color object
    needsUniformUpdate = true // Although the object reference is the same, the color value changed. Let's keep it clean.
    console.log('Updated particle color to:', params.particleColorHex)
  }

  if (newParams.backgroundColorHex !== undefined) {
    params.backgroundColorHex = newParams.backgroundColorHex
    params.backgroundColor.set(params.backgroundColorHex) // Update the THREE.Color object
    scene.background = params.backgroundColor // Update scene background directly
    metaballMaterial.uniforms.backgroundColor.value = params.backgroundColor // Update shader uniform
    needsSceneUpdate = true // Scene background changed
    needsUniformUpdate = true // Shader uniform changed
    console.log('Updated background color to:', params.backgroundColorHex)
  }

  if (newParams.particleSpeed !== undefined) {
    const speed = parseFloat(newParams.particleSpeed)
    if (!isNaN(speed)) {
      params.particleSpeed = speed
      console.log('Updated particle speed to:', params.particleSpeed)
      // Update corresponding control display if it exists
      const control = document.getElementById('particleSpeed')
      const display = document.getElementById('particleSpeedValue')
      if (control) control.value = params.particleSpeed
      if (display) display.textContent = params.particleSpeed.toFixed(2)
    } else {
      console.warn('Invalid particleSpeed value:', newParams.particleSpeed)
    }
  }

  if (newParams.particleForce !== undefined) {
    const force = parseFloat(newParams.particleForce)
    if (!isNaN(force)) {
      params.particleForce = force
      console.log('Updated particle force to:', params.particleForce)
      // Update corresponding control display if it exists
      const control = document.getElementById('particleForce')
      const display = document.getElementById('particleForceValue')
      if (control) control.value = params.particleForce
      if (display) display.textContent = params.particleForce.toFixed(1)
    } else {
      console.warn('Invalid particleForce value:', newParams.particleForce)
    }
  }

  if (newParams.particleSize !== undefined) {
    const newSize = parseFloat(newParams.particleSize)
    if (!isNaN(newSize) && newSize > 0) {
      params.particleSize = newSize
      // Update existing particle sizes and uniform array
      const currentParticleCount = metaballMaterial.uniforms.particleCount.value
      particles.forEach((p, i) => {
        if (i < currentParticleCount) {
          p.size = params.particleSize
          particleSizesUniform[i] = p.size // Update the uniform array directly
        }
      })
      metaballMaterial.uniforms.particleSizes.needsUpdate = true // Tell THREE to update this uniform
      needsUniformUpdate = true
      console.log('Updated particle size to:', params.particleSize)
      // Update corresponding control display if it exists
      const control = document.getElementById('particleSize')
      const display = document.getElementById('particleSizeValue')
      if (control) control.value = params.particleSize
      if (display) display.textContent = params.particleSize.toFixed(1)
    } else {
      console.warn('Invalid particleSize value:', newParams.particleSize)
    }
  }

  // Example for updating threshold
  if (newParams.metaballThreshold !== undefined) {
    const threshold = parseFloat(newParams.metaballThreshold)
    if (!isNaN(threshold)) {
      params.metaballThreshold = threshold
      metaballMaterial.uniforms.threshold.value = params.metaballThreshold
      needsUniformUpdate = true
      console.log('Updated metaball threshold to:', params.metaballThreshold)
      // Add control update if a slider for threshold exists
    } else {
      console.warn(
        'Invalid metaballThreshold value:',
        newParams.metaballThreshold
      )
    }
  }

  // Example for updating boundaryRadius
  if (newParams.boundaryRadius !== undefined) {
    const radius = parseFloat(newParams.boundaryRadius)
    if (!isNaN(radius) && radius > 0) {
      params.boundaryRadius = radius
      metaballMaterial.uniforms.boundaryRadius.value = params.boundaryRadius
      needsUniformUpdate = true
      console.log('Updated boundary radius to:', params.boundaryRadius)
      // Add control update if a slider for boundaryRadius exists
      // Note: This only affects the *shader's* boundary check, not the particle physics boundary.
      // Updating the physics boundary dynamically would require more logic in updateParticles.
    } else {
      console.warn('Invalid boundaryRadius value:', newParams.boundaryRadius)
    }
  }

  // IMPORTANT: Changing particleAmount via this API is NOT supported
  if (newParams.particleAmount !== undefined) {
    console.warn(
      "Dynamically changing 'particleAmount' after initialization is not supported due to shader limitations. Please re-initialize with a new configuration if needed."
    )
  }

  // Note: needsUpdate flags aren't strictly necessary if the animate loop is always running,
  // but they don't hurt and can be useful if you add logic to pause rendering.
  if (needsUniformUpdate || needsSceneUpdate) {
    console.log('Applied updates.')
    // The animation loop will pick up the changes. No explicit re-render needed here unless debugging.
  } else if (Object.keys(newParams).length > 0) {
    // Log if parameters were updated that don't require immediate uniform/scene changes (like speed/force)
    console.log('Applied non-visual parameter updates (e.g., speed, force).')
  } else {
    console.log('No valid parameters found to update.')
  }
}

// --- Initialization Logic ---
// Runs when the script/module is loaded.
function initializeSimulations() {
  // 1. Attempt initialization for the testbed (energy.html)
  const testContainer = document.getElementById('container')
  const testCanvas = document.getElementById('simulationCanvas')
  if (testContainer && testCanvas) {
    console.log('Attempting initialization for HTML testbed (#container)')
    init({
      containerSelector: '#container',
      createCanvas: false,
    })
  }

  // 2. Attempt initialization for Webflow container(s)
  // Use querySelectorAll in case multiple exist, though current code only handles one well.
  const webflowContainers = document.querySelectorAll('.energy-container')
  if (webflowContainers.length > 0) {
    console.log(
      `Found ${webflowContainers.length} Webflow container(s) (.energy-container). Attempting initialization...`
    )
    webflowContainers.forEach((container) => {
      // We need a unique selector if there are multiple. Using ID is best.
      // For now, use the class selector but be aware only the last init will "stick" with current globals.
      const selector = '.energy-container' // This isn't ideal for multiple
      init({
        containerSelector: selector, // Problematic if multiple divs have this class
        createCanvas: true,
      })
    })
  }
}

// --- Execute Initialization ---
// Use DOMContentLoaded to ensure elements exist
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSimulations)
} else {
  initializeSimulations() // DOM already ready
}
