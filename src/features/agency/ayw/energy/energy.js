import * as THREE from 'three'
// --- Import JSON data directly ---
// Vite will handle loading this JSON during the build/module load
import modesDataFromFile from './energyModes.json'

let scene, camera, renderer
let particles = []
let simulationRunning = true
let renderTarget, finalQuad, finalScene, finalCamera
let metaballMaterial
let particlePositionsUniform
let particleSizesUniform

// --- Maximum Particles Constant ---
const MAX_PARTICLES = 333 // Define the pre-allocated maximum

// Default simulation parameters (used as a fallback)
let defaultParams = {
  particleAmount: 111,
  particleSize: 25.0,
  particleSpeed: 0.01,
  particleForce: 0.5,
  particleColorHex: '#FF3d23',
  backgroundColorHex: '#edf7ee',
  boundaryRadius: 0.44,
  metaballThreshold: 0.6,
  canvasSize: 800,
}

// Active parameters for the *currently controlled/previewed* instance (e.g., on energy.html)
// This will be updated by controls or loading modes.
let activeParams = { ...defaultParams }

// Object to hold the loaded modes. Initialize with data from the import.
let savedModes = {} // Will be populated by loadModes sync function now

// --- Global Configuration for Initialization ---
const energySimDefaultConfig = {
  containerSelector: '#container', // Default for energy.html
  createCanvas: false, // Default for energy.html (canvas exists)
}

// Flag to prevent multiple initializations FOR THE SAME CONTAINER
window.energySimulationContexts = {} // Store initialized containers

// --- Load Modes Function (Simplified and Synchronous) ---
function loadModes() {
  try {
    // Directly use the imported data
    savedModes = modesDataFromFile
    console.log('Successfully loaded modes from import:', savedModes)

    // Ensure A and B exist, applying defaults if the imported JSON lacks them
    if (!savedModes.A) {
      console.warn('Mode A missing in energyModes.json, using defaults.')
      savedModes.A = { ...defaultParams }
    }
    if (!savedModes.B) {
      console.warn('Mode B missing in energyModes.json, using defaults.')
      savedModes.B = { ...defaultParams }
    }
  } catch (error) {
    // This catch block is less likely to be hit for basic import issues,
    // but good practice to keep for potential JSON parsing errors if file is malformed.
    // Vite usually catches syntax errors during build.
    console.error('Failed to process imported energyModes.json:', error)
    console.warn(
      'Using default values for modes A and B as fallback due to processing error.'
    )
    // Ensure A and B exist even if import processing failed somehow
    if (!savedModes.A) savedModes.A = { ...defaultParams }
    if (!savedModes.B) savedModes.B = { ...defaultParams }
  }
}

// --- Metaball Shader ---
const vertexShader = `
      varying vec2 vUv;
      void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
  `

// Adjusted fragment shader to use hardcoded MAX_PARTICLES and particleCount uniform
const fragmentShader = `
      uniform vec3 particleColor;
      uniform vec3 backgroundColor;
      uniform vec2 resolution;
      // Use the hardcoded maximum size for arrays
      uniform vec2 particlePositions[${MAX_PARTICLES}];
      uniform float particleSizes[${MAX_PARTICLES}];
      uniform int particleCount; // Uniform to control the actual number used
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
          // Loop up to MAX_PARTICLES
          for (int i = 0; i < ${MAX_PARTICLES}; ++i) {
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
// Needs to be async now to wait for modes if necessary (though loadModes is called earlier)
async function init(config = {}) {
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

  // --- Determine Instance Parameters: Mode > Attributes > Defaults ---
  let instanceParams = { ...defaultParams } // Start with defaults
  const modeAttribute = container.dataset.mode?.toUpperCase() // Check for data-mode="A" or data-mode="B"

  if (modeAttribute && savedModes[modeAttribute]) {
    // Mode found: Load settings from the saved mode
    console.log(
      `Container ${currentConfig.containerSelector} uses Mode: ${modeAttribute}`
    )
    // Merge mode settings over defaults
    instanceParams = { ...instanceParams, ...savedModes[modeAttribute] }
  } else {
    // No valid mode attribute found, fall back to reading individual attributes
    console.log(
      `Container ${currentConfig.containerSelector} using individual attributes or defaults.`
    )
    let attributeParams = readParametersFromDOM(container)
    // Merge attribute settings over defaults
    instanceParams = { ...instanceParams, ...attributeParams }
  }

  // --- Clamp initial particle amount from the chosen source (mode or attributes) ---
  instanceParams.particleAmount = Math.max(
    1,
    Math.min(
      instanceParams.particleAmount || defaultParams.particleAmount,
      MAX_PARTICLES
    ) // Clamp to max, ensure value exists
  )
  console.log(
    `Instance ${currentConfig.containerSelector} - Initial particle amount set to: ${instanceParams.particleAmount} (clamped between 1 and ${MAX_PARTICLES})`
  )

  // --- Initialize Global Uniform Arrays based on MAX_PARTICLES ---
  particlePositionsUniform = new Float32Array(MAX_PARTICLES * 2)
  particleSizesUniform = new Float32Array(MAX_PARTICLES)

  // Apply CSS to the container and the found/created canvas
  setupCanvasCSS(container, canvas)

  // Create THREE.Color objects using the final instanceParams
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
  scene.background = instanceBackgroundColor // Use instance color

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

  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true })
  renderer.setSize(instanceParams.canvasSize, instanceParams.canvasSize, false) // Render at fixed internal size
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // Create Initial Particles using the final instanceParams
  // We pass instanceParams here, which might have come from a mode or attributes
  particles = createParticles(instanceParams)

  // Create Metaball Plane Shader Material
  const geometry = new THREE.PlaneGeometry(2, 2)
  metaballMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
      resolution: {
        value: new THREE.Vector2(
          instanceParams.canvasSize,
          instanceParams.canvasSize
        ),
      },
      // Use the instance-specific color objects
      particleColor: { value: instanceParticleColor },
      backgroundColor: { value: instanceBackgroundColor },
      // Use the GLOBAL arrays (sized to MAX_PARTICLES)
      particlePositions: { value: particlePositionsUniform },
      particleSizes: { value: particleSizesUniform },
      particleCount: { value: instanceParams.particleAmount }, // Use the correct initial count
      boundaryRadius: { value: instanceParams.boundaryRadius },
      threshold: { value: instanceParams.metaballThreshold },
    },
    defines: {
      MAX_PARTICLES: MAX_PARTICLES,
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

  // Setup Controls - Pass the final instanceParams to set initial control values
  // This is important for the energy.html configurator page
  setupControls(instanceParams)

  // Handle Window Resize
  window.addEventListener('resize', () => onWindowResize(container), false)

  // Start Animation Loop
  animate()

  // Mark this container as initialized
  window.energySimulationContexts[currentConfig.containerSelector] = true
  console.log(
    `Energy simulation initialized successfully for: ${currentConfig.containerSelector}`
  )

  // If this is the main configurator OR the first Webflow container, store its params in activeParams
  // This assumes the buttons target the first initialized instance if #container isn't the one being init'd
  // A more robust multi-instance setup would require tracking contexts separately.
  if (
    config.containerSelector === '#container' ||
    Object.keys(activeParams).length === Object.keys(defaultParams).length
  ) {
    // If activeParams still holds only defaults, update it with the first real instance params
    activeParams = { ...instanceParams }
    console.log(
      `Set activeParams based on initialization of: ${config.containerSelector}`
    )
  }
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

// --- Read Parameters from DOM (Fallback) ---
// Accept the container element as an argument
function readParametersFromDOM(targetContainer) {
  let attributeParams = {} // Read only attributes, don't start with defaults here

  if (!targetContainer) {
    console.warn('No container provided to readParametersFromDOM')
    return attributeParams
  }

  const data = targetContainer.dataset

  // Helper functions
  const getParam = (key, parser = parseFloat) => {
    const kebabKey = key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
    const value =
      data[key] !== undefined
        ? data[key]
        : targetContainer.getAttribute(`data-${kebabKey}`)
    // Return parsed value only if attribute exists, otherwise return undefined
    return value !== null ? parser(value) : undefined
  }
  const getIntParam = (key) => getParam(key, parseInt)
  const getStringParam = (key) => getParam(key, String)

  // Read attributes if they exist, otherwise they remain undefined
  attributeParams.particleAmount = getIntParam('particleAmount')
  attributeParams.particleSize = getParam('particleSize')
  attributeParams.particleSpeed = getParam('particleSpeed')
  attributeParams.particleForce = getParam('particleForce')
  // Use 'particleColor' and 'backgroundColor' for data attributes
  attributeParams.particleColorHex = getStringParam('particleColor')
  attributeParams.backgroundColorHex = getStringParam('backgroundColor')
  attributeParams.boundaryRadius = getParam('boundaryRadius')
  attributeParams.metaballThreshold = getParam('metaballThreshold')

  // Filter out undefined values so they don't overwrite defaults unnecessarily
  Object.keys(attributeParams).forEach(
    (key) => attributeParams[key] === undefined && delete attributeParams[key]
  )

  if (Object.keys(attributeParams).length > 0) {
    console.log(
      `Individual attributes read from [${targetContainer.tagName}${
        targetContainer.id ? '#' + targetContainer.id : ''
      }${
        targetContainer.className
          ? '.' + targetContainer.className.split(' ').join('.')
          : ''
      }]:`,
      attributeParams
    )
  }
  return attributeParams // Return only the params found in attributes
}

// --- Particle Creation (Refactored) ---
// Uses the parameters passed to it (instanceParams)
function createParticles(currentParams) {
  // Ensure currentParams.particleAmount is valid and clamped
  let numParticles = Math.max(
    1,
    Math.min(
      currentParams.particleAmount || defaultParams.particleAmount,
      MAX_PARTICLES
    )
  )

  let instanceParticles = [] // Local array to hold simulation data
  const boundary = currentParams.boundaryRadius * 0.95 // Use current boundary

  // Check if global arrays are available (should be from init)
  if (!particlePositionsUniform || !particleSizesUniform) {
    console.error(
      'Global uniform arrays not initialized before createParticles!'
    )
    return [] // Return empty to prevent errors
  }

  // Clamp numParticles again just in case
  numParticles = Math.min(numParticles, MAX_PARTICLES)

  for (let i = 0; i < numParticles; i++) {
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
      size: currentParams.particleSize, // Use size from current params
    })

    // Populate the GLOBAL uniform arrays
    particlePositionsUniform[i * 2] = position.x
    particlePositionsUniform[i * 2 + 1] = position.y
    particleSizesUniform[i] = instanceParticles[i].size
  }

  // Update the particle count uniform
  if (metaballMaterial) {
    metaballMaterial.uniforms.particleCount.value = numParticles
    metaballMaterial.uniforms.particlePositions.needsUpdate = true
    metaballMaterial.uniforms.particleSizes.needsUpdate = true
  } else {
    console.warn('Metaball material not ready during createParticles call.')
  }

  console.log(`Created/updated ${numParticles} particles.`)
  return instanceParticles // Return the new simulation particle data
}

// --- Configurator Helpers ---

// Gets the current settings from the UI controls
function getCurrentSettingsFromControls() {
  const settings = {}
  const getValue = (id, parser = parseFloat) => {
    const element = document.getElementById(id)
    // Ensure control exists before trying to read value
    return element ? parser(element.value) : undefined
  }
  const getIntValue = (id) => getValue(id, parseInt)
  const getStringValue = (id) => getValue(id, String)

  // Read directly from controls
  const amountFromControl = getIntValue('particleAmount')
  const sizeFromControl = getValue('particleSize')
  const speedFromControl = getValue('particleSpeed')
  const forceFromControl = getValue('particleForce')
  const particleColorFromControl = getStringValue('particleColor')
  const backgroundColorFromControl = getStringValue('backgroundColor')

  // Use control value if available, otherwise fallback to the current activeParams
  // This handles cases where controls might be missing but modes still exist
  settings.particleAmount = amountFromControl ?? activeParams.particleAmount
  settings.particleSize = sizeFromControl ?? activeParams.particleSize
  settings.particleSpeed = speedFromControl ?? activeParams.particleSpeed
  settings.particleForce = forceFromControl ?? activeParams.particleForce
  settings.particleColorHex =
    particleColorFromControl ?? activeParams.particleColorHex
  settings.backgroundColorHex =
    backgroundColorFromControl ?? activeParams.backgroundColorHex

  // Add boundaryRadius and metaballThreshold if controls exist for them, otherwise use activeParams
  const boundaryRadiusControl = getValue('boundaryRadius')
  const thresholdControl = getValue('metaballThreshold')
  settings.boundaryRadius = boundaryRadiusControl ?? activeParams.boundaryRadius
  settings.metaballThreshold =
    thresholdControl ?? activeParams.metaballThreshold

  // Clamp amount again
  settings.particleAmount = Math.max(
    1,
    Math.min(settings.particleAmount, MAX_PARTICLES)
  )
  // Add clamping/validation for other values if needed

  console.log('Got current settings from controls:', settings)
  return settings
}

// Triggers a download of the modes JSON
function triggerFileDownload(filename, content) {
  const blob = new Blob([content], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
  console.log(`Triggered download for ${filename}`)
}

// --- Mode Management Functions ---

// Sets the current UI control settings as a mode in the session (in memory)
function setCurrentSettingsAsMode(modeId) {
  if (!modeId || (modeId !== 'A' && modeId !== 'B')) {
    console.error(
      'Invalid modeId provided to setCurrentSettingsAsMode:',
      modeId
    )
    return
  }
  const currentSettings = getCurrentSettingsFromControls()
  savedModes[modeId] = currentSettings // Update the mode in memory
  console.log(`Mode ${modeId} set in session memory:`, savedModes[modeId])
  alert(`Mode ${modeId} configuration updated for this session.`)
  // Optional: Update activeParams to reflect the saved state, though UI already matches
  // activeParams = { ...currentSettings };
}

// Loads a mode from memory into the preview and UI controls
function loadModeToPreview(modeId) {
  if (!modeId || !savedModes[modeId]) {
    console.error(`Mode "${modeId}" not found in savedModes memory.`)
    alert(
      `Error: Mode "${modeId}" has not been set in this session or loaded from file.`
    )
    return
  }
  console.log(`Loading Mode ${modeId} to preview and controls...`)
  const modeSettings = savedModes[modeId]

  // --- CRITICAL FIX: Call API *before* updating controls ---
  // Let the API update activeParams and handle visual changes correctly
  window.updateEnergySimulation(modeSettings)

  // --- Update UI controls AFTER API call ---
  // Now update the controls to match the modeSettings that were just loaded
  const updateControl = (id, value, formatter) => {
    const control = document.getElementById(id)
    const displayId = id + 'Value'
    const display = document.getElementById(displayId)
    if (control) {
      // Check type for color pickers
      if (control.type === 'color') {
        control.value = value
      } else {
        control.value = value // For range sliders etc.
      }
    }
    if (display && formatter) {
      display.textContent = formatter(value)
    } else if (display) {
      display.textContent = value
    }
  }

  // Helper specifically for color (though combined logic above works)
  // const updateColorControl = (id, value) => {
  //   const control = document.getElementById(id);
  //   if (control) control.value = value;
  // };

  // Update controls, using fallbacks to defaultParams if a mode is somehow incomplete
  const getVal = (key, fallback) =>
    modeSettings[key] !== undefined ? modeSettings[key] : fallback

  updateControl(
    'particleAmount',
    getVal('particleAmount', defaultParams.particleAmount),
    (v) => v.toString()
  )
  updateControl(
    'particleSize',
    getVal('particleSize', defaultParams.particleSize),
    (v) => v.toFixed(1)
  )
  updateControl(
    'particleSpeed',
    getVal('particleSpeed', defaultParams.particleSpeed),
    (v) => v.toFixed(2)
  )
  updateControl(
    'particleForce',
    getVal('particleForce', defaultParams.particleForce),
    (v) => v.toFixed(1)
  )
  updateControl(
    'particleColor',
    getVal('particleColorHex', defaultParams.particleColorHex)
  )
  updateControl(
    'backgroundColor',
    getVal('backgroundColorHex', defaultParams.backgroundColorHex)
  )
  // Add updates for boundaryRadius, metaballThreshold if controls exist
  // updateControl('boundaryRadius', getVal('boundaryRadius', defaultParams.boundaryRadius), v => v.toFixed(2));
  // updateControl('metaballThreshold', getVal('metaballThreshold', defaultParams.metaballThreshold), v => v.toFixed(2));

  console.log(`Controls updated to reflect Mode ${modeId}.`)
}

// Saves the entire `savedModes` object (containing A & B from memory) to a file
function saveAllModes() {
  console.log('Saving all modes (A & B) from memory to file...')
  // Convert the *current* savedModes object (which was updated by 'Set Current as...')
  const jsonContent = JSON.stringify(savedModes, null, 2) // Pretty print

  // Trigger the download
  triggerFileDownload('energyModes.json', jsonContent)
  alert(
    `Saving current session's Mode A & B settings.\nPlease replace the existing 'energyModes.json' file in your project with the downloaded one to make them permanent.`
  )
}

// --- Control Setup ---
// Pass the initial parameters (could be from mode or attributes)
function setupControls(initialParams) {
  const controlsContainer = document.getElementById('controls')
  if (!controlsContainer) {
    return // Exit if controls don't exist (e.g., in Webflow deployment)
  }

  // --- Get references to ALL controls ---
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

  // New Mode Management Buttons
  const setCurrentAsModeAButton = document.getElementById('setCurrentAsModeA')
  const setCurrentAsModeBButton = document.getElementById('setCurrentAsModeB')
  const selectModeAButton = document.getElementById('selectModeA')
  const selectModeBButton = document.getElementById('selectModeB')
  const saveAllModesButton = document.getElementById('saveAllModes')

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

  // --- Set initial values from initialParams ---
  // ... (This section remains the same, setting up the initial state based on loaded params) ...
  if (particleAmountSlider) {
    particleAmountSlider.max = MAX_PARTICLES // Set the slider max dynamically
    const initialAmount = Math.max(
      1,
      Math.min(
        initialParams.particleAmount || defaultParams.particleAmount,
        MAX_PARTICLES
      )
    )
    setupControl(
      particleAmountSlider,
      particleAmountValue,
      initialAmount,
      (v) => v.toString()
    )
  } else if (particleAmountValue) {
    // Set display even if slider missing
    particleAmountValue.textContent = Math.max(
      1,
      Math.min(
        initialParams.particleAmount || defaultParams.particleAmount,
        MAX_PARTICLES
      )
    ).toString()
  }

  setupControl(
    particleSizeSlider,
    particleSizeValue,
    initialParams.particleSize ?? defaultParams.particleSize, // Use nullish coalescing
    (v) => v.toFixed(1)
  )
  setupControl(
    particleSpeedSlider,
    particleSpeedValue,
    initialParams.particleSpeed ?? defaultParams.particleSpeed,
    (v) => v.toFixed(2)
  )
  setupControl(
    particleForceSlider,
    particleForceValue,
    initialParams.particleForce ?? defaultParams.particleForce,
    (v) => v.toFixed(1)
  )
  setupColorControl(
    particleColorPicker,
    initialParams.particleColorHex ?? defaultParams.particleColorHex
  )
  setupColorControl(
    backgroundColorPicker,
    initialParams.backgroundColorHex ?? defaultParams.backgroundColorHex
  )
  // Add setup for boundaryRadius, metaballThreshold if controls exist

  // --- Event listeners for LIVE controls ---
  // (These remain largely the same, calling the API to update the preview)
  if (particleAmountSlider) {
    particleAmountSlider.addEventListener('input', (e) => {
      const newAmount = parseInt(e.target.value)
      if (particleAmountValue) particleAmountValue.textContent = newAmount // Keep UI updated
      // Directly call updateEnergySimulation to handle param update and particle recreation
      window.updateEnergySimulation({ particleAmount: newAmount })
    })
  }

  if (particleSizeSlider) {
    particleSizeSlider.addEventListener('input', (e) => {
      const newSize = parseFloat(e.target.value)
      if (particleSizeValue) particleSizeValue.textContent = newSize.toFixed(1) // Keep UI updated
      // Call update function
      window.updateEnergySimulation({ particleSize: newSize })
    })
  }

  if (particleSpeedSlider) {
    particleSpeedSlider.addEventListener('input', (e) => {
      const newSpeed = parseFloat(e.target.value)
      if (particleSpeedValue)
        particleSpeedValue.textContent = newSpeed.toFixed(2) // Keep UI updated
      // Call update function (it will update activeParams internally)
      window.updateEnergySimulation({ particleSpeed: newSpeed })
    })
  }

  if (particleForceSlider) {
    particleForceSlider.addEventListener('input', (e) => {
      const newForce = parseFloat(e.target.value)
      if (particleForceValue)
        particleForceValue.textContent = newForce.toFixed(1) // Keep UI updated
      // Call update function
      window.updateEnergySimulation({ particleForce: newForce })
    })
  }

  if (particleColorPicker) {
    particleColorPicker.addEventListener('input', (e) => {
      const newColor = e.target.value
      // Call update function
      window.updateEnergySimulation({ particleColorHex: newColor })
    })
  }

  if (backgroundColorPicker) {
    backgroundColorPicker.addEventListener('input', (e) => {
      const newColor = e.target.value
      // Call update function
      window.updateEnergySimulation({ backgroundColorHex: newColor })
    })
  }
  // Add listeners for boundaryRadius, metaballThreshold if controls exist

  if (playStopButton) {
    // ... existing listener ...
  }

  // --- Event listeners for Mode Management buttons ---
  if (setCurrentAsModeAButton) {
    setCurrentAsModeAButton.addEventListener('click', () =>
      setCurrentSettingsAsMode('A')
    )
  }
  if (setCurrentAsModeBButton) {
    setCurrentAsModeBButton.addEventListener('click', () =>
      setCurrentSettingsAsMode('B')
    )
  }
  if (selectModeAButton) {
    selectModeAButton.addEventListener('click', () => loadModeToPreview('A'))
  }
  if (selectModeBButton) {
    selectModeBButton.addEventListener('click', () => loadModeToPreview('B'))
  }
  if (saveAllModesButton) {
    saveAllModesButton.addEventListener('click', saveAllModes)
  }
}

// --- Update Simulation ---
function updateParticles(deltaTime) {
  if (!particlePositionsUniform || !particles || !metaballMaterial) {
    console.warn('updateParticles called before simulation fully initialized.')
    return
  }

  // Use activeParams for simulation logic when controls are present
  // For instances initialized via data-mode/attributes without controls,
  // their parameters are baked into the uniforms/initial state.
  // The `activeParams` reflects the state driven by the UI controls panel.
  const currentParams = activeParams // Use the active parameters

  const forceFactor = currentParams.particleForce * 0.0001
  const speedFactor = currentParams.particleSpeed * deltaTime * 30
  const boundary = currentParams.boundaryRadius
  const boundarySq = boundary * boundary
  const damping = 0.985
  const particleCount = metaballMaterial.uniforms.particleCount.value

  for (let i = 0; i < particleCount; i++) {
    if (!particles[i]) continue
    const p1 = particles[i]

    // Apply forces from other ACTIVE particles
    for (let j = i + 1; j < particleCount; j++) {
      // Loop up to particleCount
      if (!particles[j]) continue // Safety check
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
      // Clamp position precisely to the boundary after reflection
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
// No longer needs to be async just because of loadModes
window.initializeEnergySimulation = function (config = {}) {
  // Modes are loaded synchronously now, no need to await here
  // loadModes(); // Ensure modes are loaded (called below before init)
  init(config) // init doesn't strictly need to be async anymore
}

// --- External API (Assign to window) ---
// This API primarily targets the instance being actively controlled by the UI (energy.html)
// It updates `activeParams` and applies changes to the *current* scene/material/particles.
window.updateEnergySimulation = function (newParams) {
  // Check if essential components are ready
  // Use activeParams as the base for updates triggered externally or by controls
  if (!metaballMaterial || !scene) {
    console.warn('Simulation components not ready for update via API.')
    return
  }
  if (typeof newParams !== 'object' || newParams === null) {
    console.warn('updateEnergySimulation expects an object of parameters.')
    return
  }

  console.log('Attempting to update simulation via API with:', newParams)

  let needsUniformUpdate = false
  let needsSceneUpdate = false
  let needsParticleRecreation = false
  let changeDetected = false // Flag to track if *any* relevant parameter changed

  // --- Handle Particle Amount Change ---
  if (newParams.particleAmount !== undefined) {
    const newAmount = parseInt(newParams.particleAmount)
    if (!isNaN(newAmount) && newAmount >= 1 && newAmount <= MAX_PARTICLES) {
      if (newAmount !== activeParams.particleAmount) {
        activeParams.particleAmount = newAmount
        console.log(
          `API: Set particle amount to ${activeParams.particleAmount}`
        )
        needsParticleRecreation = true
        changeDetected = true
        // Update display (already handled by input listener, but good practice)
        const display = document.getElementById('particleAmountValue')
        if (display)
          display.textContent = activeParams.particleAmount.toString()
      }
    } else {
      console.warn(
        `API: Invalid or out-of-range particleAmount value: ${newParams.particleAmount}. Must be between 1 and ${MAX_PARTICLES}.`
      )
    }
  }

  // --- Update other parameters in activeParams and apply ---
  if (newParams.particleColorHex !== undefined) {
    // Check if changed *before* updating activeParams
    if (newParams.particleColorHex !== activeParams.particleColorHex) {
      activeParams.particleColorHex = newParams.particleColorHex
      // Ensure the THREE.Color object exists and update it
      if (!activeParams.particleColor)
        activeParams.particleColor = new THREE.Color()
      activeParams.particleColor.set(activeParams.particleColorHex)
      // Update the uniform
      metaballMaterial.uniforms.particleColor.value.set(
        activeParams.particleColorHex
      ) // Directly update uniform color
      needsUniformUpdate = true
      console.log(
        'API: Updated particle color to:',
        activeParams.particleColorHex
      )
      // Update control (color picker updates automatically via its value binding)
    }
  }

  if (newParams.backgroundColorHex !== undefined) {
    // Check if changed *before* updating activeParams
    if (newParams.backgroundColorHex !== activeParams.backgroundColorHex) {
      activeParams.backgroundColorHex = newParams.backgroundColorHex
      // Ensure the THREE.Color object exists and update it
      if (!activeParams.backgroundColor)
        activeParams.backgroundColor = new THREE.Color()
      activeParams.backgroundColor.set(activeParams.backgroundColorHex)
      // Update scene background and uniform
      scene.background.set(activeParams.backgroundColorHex) // Directly update scene background color
      metaballMaterial.uniforms.backgroundColor.value.set(
        activeParams.backgroundColorHex
      ) // Directly update uniform color
      needsSceneUpdate = true
      needsUniformUpdate = true
      console.log(
        'API: Updated background color to:',
        activeParams.backgroundColorHex
      )
      // Update control (color picker updates automatically via its value binding)
    }
  }

  if (newParams.particleSpeed !== undefined) {
    const speed = parseFloat(newParams.particleSpeed)
    if (!isNaN(speed)) {
      // Check if changed *before* updating activeParams
      if (speed !== activeParams.particleSpeed) {
        activeParams.particleSpeed = speed // Update activeParams
        console.log(
          'API: Updated particle speed to:',
          activeParams.particleSpeed
        )
        // Call update function (it will update activeParams internally)
        // const display = document.getElementById('particleSpeedValue');
        // if (display) display.textContent = activeParams.particleSpeed.toFixed(2);
      }
    } else {
      console.warn('API: Invalid particleSpeed value:', newParams.particleSpeed)
    }
  }

  if (newParams.particleForce !== undefined) {
    const force = parseFloat(newParams.particleForce)
    if (!isNaN(force)) {
      // Check if changed *before* updating activeParams
      if (force !== activeParams.particleForce) {
        activeParams.particleForce = force // Update activeParams
        console.log(
          'API: Updated particle force to:',
          activeParams.particleForce
        )
        // Call update function (it will update activeParams internally)
        // const display = document.getElementById('particleForceValue');
        // if (display) display.textContent = activeParams.particleForce.toFixed(1);
      }
    } else {
      console.warn('API: Invalid particleForce value:', newParams.particleForce)
    }
  }

  if (newParams.particleSize !== undefined) {
    const newSize = parseFloat(newParams.particleSize)
    if (!isNaN(newSize) && newSize > 0) {
      // Check if changed *before* updating activeParams
      if (newSize !== activeParams.particleSize) {
        activeParams.particleSize = newSize // Update activeParams
        const currentParticleCount =
          metaballMaterial.uniforms.particleCount.value
        // Update existing particles and uniforms
        particles.forEach((p, i) => {
          if (i < currentParticleCount) {
            p.size = activeParams.particleSize // Use updated size
            particleSizesUniform[i] = p.size
          }
        })
        metaballMaterial.uniforms.particleSizes.needsUpdate = true
        needsUniformUpdate = true
        console.log('API: Updated particle size to:', activeParams.particleSize)
        // Update display (already handled by input listener)
        // const display = document.getElementById('particleSizeValue')
        // if (display) display.textContent = activeParams.particleSize.toFixed(1)
      }
    } else {
      console.warn('API: Invalid particleSize value:', newParams.particleSize)
    }
  }

  if (newParams.metaballThreshold !== undefined) {
    const threshold = parseFloat(newParams.metaballThreshold)
    if (!isNaN(threshold)) {
      // Check if changed *before* updating activeParams
      if (threshold !== activeParams.metaballThreshold) {
        activeParams.metaballThreshold = threshold // Update activeParams
        metaballMaterial.uniforms.threshold.value =
          activeParams.metaballThreshold
        needsUniformUpdate = true
        console.log(
          'API: Updated metaball threshold to:',
          activeParams.metaballThreshold
        )
      }
    } else {
      console.warn(
        'API: Invalid metaballThreshold value:',
        newParams.metaballThreshold
      )
    }
  }

  if (newParams.boundaryRadius !== undefined) {
    const radius = parseFloat(newParams.boundaryRadius)
    if (!isNaN(radius) && radius > 0) {
      // Check if changed *before* updating activeParams
      if (radius !== activeParams.boundaryRadius) {
        activeParams.boundaryRadius = radius // Update activeParams
        metaballMaterial.uniforms.boundaryRadius.value =
          activeParams.boundaryRadius
        needsUniformUpdate = true
        console.log(
          'API: Updated boundary radius to:',
          activeParams.boundaryRadius
        )
      }
    } else {
      console.warn(
        'API: Invalid boundaryRadius value:',
        newParams.boundaryRadius
      )
    }
  }

  // --- Perform Particle Recreation if needed ---
  if (needsParticleRecreation) {
    console.log('API: Recreating particles due to amount change.')
    particles = createParticles(activeParams) // This uses the updated activeParams
    needsUniformUpdate = true
  }

  // --- Final Logging ---
  if (changeDetected) {
    // Check if any relevant parameter actually changed
    console.log('API: Applied updates.')
  } else if (Object.keys(newParams).length > 0) {
    console.log('API: No change detected for provided parameters.')
  } else {
    console.log('API: No valid parameters found to update.')
  }
}

// --- Initialization Logic ---
// No longer needs to be async just because of loadModes
function initializeSimulations() {
  // 1. Load modes synchronously first
  loadModes() // Call the sync function

  // 2. Attempt initialization for the testbed (energy.html)
  const testContainer = document.getElementById('container')
  const testCanvas = document.getElementById('simulationCanvas')
  if (testContainer && testCanvas) {
    console.log('Attempting initialization for HTML testbed (#container)')
    // init doesn't need await if it has no other async operations
    init({
      containerSelector: '#container',
      createCanvas: false,
    })
  }

  // 3. Attempt initialization for Webflow container(s)
  const webflowContainers = document.querySelectorAll('.energy-container')
  if (webflowContainers.length > 0) {
    console.log(
      `Found ${webflowContainers.length} Webflow container(s) (.energy-container). Attempting initialization...`
    )
    // No need for async loop/await here anymore
    for (const container of webflowContainers) {
      // ... logic to determine stableSelector ...
      let stableSelector
      if (container.id) {
        stableSelector = `#${container.id}`
      } else {
        stableSelector = '.energy-container'
        console.warn(/* ... */)
      }

      // Call init directly
      init({
        containerSelector: stableSelector,
        createCanvas: true,
      })
    }
  }
}

// --- Event Listener for External Mode Buttons ---
function setupExternalModeButtons() {
  document.body.addEventListener('click', (event) => {
    // Find the clicked element or its ancestor that has the data-set-mode attribute
    const button = event.target.closest('[data-set-mode]')

    if (!button) {
      return // Click was not on a mode button or its descendant
    }

    const modeId = button.dataset.setMode?.toUpperCase() // Get 'A' or 'B'

    if (!modeId || (modeId !== 'A' && modeId !== 'B')) {
      console.warn(`Invalid mode specified on button: ${modeId}`)
      return
    }

    if (!savedModes[modeId]) {
      console.error(
        `Mode "${modeId}" not found in savedModes. Ensure energyModes.json is loaded and the mode exists.`
      )
      // Optionally provide user feedback, e.g., disable button?
      return
    }

    console.log(`External button clicked: Setting mode to ${modeId}`)
    const modeSettings = savedModes[modeId]

    // Call the existing API to update the simulation
    // This assumes the API targets the correct (likely the first/only) simulation instance
    window.updateEnergySimulation(modeSettings)

    // Optional: Add an 'active' class to the clicked button and remove from others
    document
      .querySelectorAll('[data-set-mode]')
      .forEach((btn) => btn.classList.remove('active-energy-mode'))
    button.classList.add('active-energy-mode')
  })
  console.log('Set up event listener for external [data-set-mode] buttons.')
}

// --- Execute Initialization ---
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeSimulations()
    setupExternalModeButtons() // Add the listener after initial simulations setup
  })
} else {
  initializeSimulations()
  setupExternalModeButtons() // Add the listener if DOM already ready
}
