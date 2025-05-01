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
let metaballQuad

// --- Maximum Particles Constant ---
const MAX_PARTICLES = 333 // Define the pre-allocated maximum

// Default simulation parameters (Add new liquid params)
let defaultParams = {
  simulationType: 'metaball',
  particleAmount: 111,
  particleSize: 25.0,
  particleSpeed: 0.01,
  particleColorHex: '#FF3d23',
  backgroundColorHex: '#edf7ee',
  boundaryRadius: 0.44,
  canvasSize: 800,
  canvasScale: 1.0, // Default scale of 100%
  // --- Type Specific ---
  particleForce: 0.5,
  metaballThreshold: 0.6,
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
    savedModes = modesDataFromFile
    console.log('Successfully loaded modes from import:', savedModes)
    const ensureModeDefaults = (modeKey) => {
      if (!savedModes[modeKey]) {
        savedModes[modeKey] = { ...defaultParams }
        return
      }
      for (const key in defaultParams) {
        if (savedModes[modeKey][key] === undefined) {
          savedModes[modeKey][key] = defaultParams[key]
        }
      }
      const currentType = savedModes[modeKey].simulationType
      if (!['metaball', 'liquid repel'].includes(currentType)) {
        savedModes[modeKey].simulationType = defaultParams.simulationType
      }
    }
    ensureModeDefaults('A')
    ensureModeDefaults('B')
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
      uniform float canvasScale; // Add this new uniform

      varying vec2 vUv;

      void main() {
          vec2 center = vec2(0.5);
          vec2 uv = gl_FragCoord.xy / resolution.xy; // Screen coordinates
          
          // Apply scaling: Transform UV to be centered and scaled
          vec2 scaledUV = (uv - center) / canvasScale + center;
          
          // Check if scaled coordinates are outside the canvas (0-1 range)
          if(scaledUV.x < 0.0 || scaledUV.x > 1.0 || scaledUV.y < 0.0 || scaledUV.y > 1.0) {
              gl_FragColor = vec4(backgroundColor, 1.0);
              return;
          }
          
          // Calculate distance from center for boundary using scaled UV
          float distFromCenter = distance(scaledUV, center);

          // Discard fragments outside the circular boundary visually
          // Note: This visual clipping might need adjustment for the 'liquid' mode if particles
          // settle below the 0.5 center but are still within the intended play area.
          // However, the actual physics boundary is handled in JS.
          if (distFromCenter > boundaryRadius + 0.05) {
              gl_FragColor = vec4(backgroundColor, 1.0);
              return;
          }

          float totalInfluence = 0.0;
          // Loop up to MAX_PARTICLES
          for (int i = 0; i < ${MAX_PARTICLES}; ++i) {
              if (i >= particleCount) break; // Only process active particles

              vec2 particleScreenPos = (particlePositions[i] * 0.5) + 0.5;
              float distSq = dot(scaledUV - particleScreenPos, scaledUV - particleScreenPos);
              float radius = particleSizes[i] / resolution.y; // Use resolution.y assuming square canvas
              float radiusSq = radius * radius;

              // Avoid division by zero or extreme influence at very close distances
              if (radiusSq < 0.00001) continue;

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
    // Merge mode settings over defaults, ensuring type safety
    instanceParams = { ...instanceParams, ...savedModes[modeAttribute] }
    // Ensure simulationType is valid if loaded from mode
    if (
      instanceParams.simulationType !== 'metaball' &&
      instanceParams.simulationType !== 'liquid repel'
    ) {
      console.warn(
        `Invalid simulationType '${instanceParams.simulationType}' in Mode ${modeAttribute}. Defaulting to '${defaultParams.simulationType}'.`
      )
      instanceParams.simulationType = defaultParams.simulationType
    }
  } else {
    // No valid mode attribute found, fall back to reading individual attributes
    console.log(
      `Container ${currentConfig.containerSelector} using individual attributes or defaults.`
    )
    let attributeParams = readParametersFromDOM(container)
    // Merge attribute settings over defaults
    instanceParams = { ...instanceParams, ...attributeParams }
    // Ensure simulationType is valid if loaded from attributes
    if (
      instanceParams.simulationType !== 'metaball' &&
      instanceParams.simulationType !== 'liquid repel'
    ) {
      console.warn(
        `Invalid simulationType '${instanceParams.simulationType}' from data attributes. Defaulting to '${defaultParams.simulationType}'.`
      )
      instanceParams.simulationType = defaultParams.simulationType
    }
  }

  // Re-validate type and ensure all params exist
  const type = instanceParams.simulationType
  if (!['metaball', 'liquid repel'].includes(type)) {
    instanceParams.simulationType = defaultParams.simulationType
  }
  for (const key in defaultParams) {
    // Ensure all default keys exist after merges
    if (instanceParams[key] === undefined) {
      instanceParams[key] = defaultParams[key]
    }
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
  console.log(
    `Instance ${currentConfig.containerSelector} - Initial simulation type: ${instanceParams.simulationType}`
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
  particles = createParticles(instanceParams)

  // --- Create Metaball Plane Shader Material ---
  const metaballGeometry = new THREE.PlaneGeometry(2, 2) // Use the existing 'geometry' variable name if preferred
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
      canvasScale: { value: instanceParams.canvasScale },
    },
    defines: {
      MAX_PARTICLES: MAX_PARTICLES,
    },
  })
  metaballQuad = new THREE.Mesh(metaballGeometry, metaballMaterial) // Assign to global
  scene.add(metaballQuad) // Add the quad unconditionally

  // --- Final Quad to display render target ---
  const finalMaterial = new THREE.MeshBasicMaterial({
    map: renderTarget.texture,
  })
  finalQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), finalMaterial)
  finalScene.add(finalQuad) // This is always added to finalScene

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
  attributeParams.simulationType = getStringParam('simulationType') // Reads the attribute
  attributeParams.particleAmount = getIntParam('particleAmount')
  attributeParams.particleSize = getParam('particleSize')
  attributeParams.particleSpeed = getParam('particleSpeed')
  attributeParams.particleForce = getParam('particleForce') // Metaball/Repel
  attributeParams.metaballThreshold = getParam('metaballThreshold') // Metaball/Repel Visual
  attributeParams.particleColorHex = getStringParam('particleColor')
  attributeParams.backgroundColorHex = getStringParam('backgroundColor')
  attributeParams.boundaryRadius = getParam('boundaryRadius')

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

  // Fill remaining uniform slots with zeros? Optional.
  for (let i = numParticles; i < MAX_PARTICLES; i++) {
    particlePositionsUniform[i * 2] = 0
    particlePositionsUniform[i * 2 + 1] = 0
    particleSizesUniform[i] = 0
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
  const settings = { ...activeParams } // Start with current state to preserve inactive params
  const getValue = (id, parser = parseFloat) => {
    const element = document.getElementById(id)
    // Ensure control exists before trying to read value
    return element ? parser(element.value) : undefined
  }
  const getIntValue = (id) => getValue(id, parseInt)
  const getStringValue = (id) => getValue(id, String)
  // Helper to get selected radio button value
  const getRadioValue = (name) => {
    const checkedRadio = document.querySelector(`input[name="${name}"]:checked`)
    return checkedRadio ? checkedRadio.value : undefined
  }

  // Read directly from controls
  const simTypeFromControl = getRadioValue('simulationType')
  const amountFromControl = getIntValue('particleAmount')
  const sizeFromControl = getValue('particleSize')
  const speedFromControl = getValue('particleSpeed')
  const forceFromControl = getValue('particleForce')
  const particleColorFromControl = getStringValue('particleColor')
  const backgroundColorFromControl = getStringValue('backgroundColor')

  // Use control value if available, otherwise fallback to the current activeParams
  settings.simulationType = simTypeFromControl ?? activeParams.simulationType
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

// Helper to update value display spans
function updateValueDisplay(spanId, value) {
  const display = document.getElementById(spanId)
  if (display && value !== undefined && value !== null) {
    const num = parseFloat(value)
    if (!isNaN(num)) {
      // Determine step attribute from the associated input range (if possible)
      const input = document.getElementById(spanId.replace('Value', ''))
      const step = input ? parseFloat(input.step) : null
      let decimals = 1 // Default decimals
      if (step && step < 1) {
        // Crude way to estimate decimals needed based on step
        if (step <= 0.0001) decimals = 4
        else if (step <= 0.001) decimals = 3
        else if (step <= 0.01) decimals = 2
        else decimals = 1
      } else if (Number.isInteger(num)) {
        decimals = 0
      }
      display.textContent = num.toFixed(decimals)
    } else {
      display.textContent = value // Fallback for non-numeric
    }
  } else if (display) {
    display.textContent = '?' // Default if value missing
  }
}

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
  // Ensure simulationType is captured and valid (allow all 3 types)
  if (
    !currentSettings.simulationType ||
    (currentSettings.simulationType !== 'metaball' &&
      currentSettings.simulationType !== 'liquid repel')
  ) {
    currentSettings.simulationType =
      activeParams.simulationType || defaultParams.simulationType
    console.warn(
      `Simulation type missing from controls, using active/default: ${currentSettings.simulationType}`
    )
  }
  savedModes[modeId] = currentSettings // Update the mode in memory
  console.log(`Mode ${modeId} set in session memory:`, savedModes[modeId])
  alert(`Mode ${modeId} configuration updated for this session.`)
  // Optional: Update activeParams to reflect the saved state
  // window.updateEnergySimulation(currentSettings); // Could call API to ensure consistency
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
  const modeSettings = { ...defaultParams, ...savedModes[modeId] }

  // Call API first
  window.updateEnergySimulation(modeSettings)

  // --- Update UI controls AFTER API call ---
  const updateControl = (id, value) => {
    const control = document.getElementById(id)
    if (control) {
      control.value = value
    }
  }
  const updateRadioControl = (name, value) => {
    const radioToCheck = document.querySelector(
      `input[name="${name}"][value="${value}"]`
    )
    if (radioToCheck) {
      radioToCheck.checked = true
    } else {
      console.warn(
        `Could not find radio button for name "${name}" with value "${value}"`
      )
    }
  }
  const getVal = (key) => modeSettings[key] // Use merged settings

  // Update type radio
  updateRadioControl('simulationType', getVal('simulationType'))

  // Update SHARED controls & displays
  updateControl('particleAmount', getVal('particleAmount'))
  updateValueDisplay('particleAmountValue', getVal('particleAmount'))
  updateControl('particleSize', getVal('particleSize'))
  updateValueDisplay('particleSizeValue', getVal('particleSize'))
  updateControl('particleSpeed', getVal('particleSpeed'))
  updateValueDisplay('particleSpeedValue', getVal('particleSpeed'))
  updateControl('particleColor', getVal('particleColorHex'))
  updateControl('backgroundColor', getVal('backgroundColorHex'))
  updateControl('boundaryRadius', getVal('boundaryRadius'))
  updateValueDisplay('boundaryRadiusValue', getVal('boundaryRadius'))

  // Update TYPE-SPECIFIC controls & displays
  updateControl('particleForce', getVal('particleForce'))
  updateValueDisplay('particleForceValue', getVal('particleForce'))
  updateControl('metaballThreshold', getVal('metaballThreshold'))
  updateValueDisplay('metaballThresholdValue', getVal('metaballThreshold'))

  console.log(`Mode ${modeId} loaded into controls.`)
}

// Saves the entire `savedModes` object (containing A & B from memory) to a file
function saveAllModes() {
  console.log('Saving all modes (A & B) from memory to file...')

  // Ensure both modes have a valid simulationType before saving
  const checkAndSetDefaultType = (mode) => {
    if (!mode) return
    if (
      mode.simulationType === undefined ||
      (mode.simulationType !== 'metaball' &&
        mode.simulationType !== 'liquid repel')
    ) {
      mode.simulationType = defaultParams.simulationType // Use global default
      console.warn(
        `Added/corrected missing/invalid simulationType to Mode during save.`
      )
    }
  }

  checkAndSetDefaultType(savedModes.A)
  checkAndSetDefaultType(savedModes.B)

  // Convert the *current* savedModes object
  const jsonContent = JSON.stringify(savedModes, null, 2) // Pretty print

  // Trigger the download
  triggerFileDownload('energyModes.json', jsonContent)
  alert(
    `Saving current session's Mode A & B settings.\nPlease replace the existing 'energyModes.json' file in your project with the downloaded one to make them permanent.`
  )
}

// --- Control Setup ---
function setupControls(initialParams) {
  const controlsContainer = document.getElementById('controls')
  if (!controlsContainer) {
    return // Exit if controls don't exist
  }

  // --- Get references to ALL controls ---
  // Shared
  const particleAmountSlider = document.getElementById('particleAmount')
  const particleAmountValue = document.getElementById('particleAmountValue')
  const particleSizeSlider = document.getElementById('particleSize')
  const particleSizeValue = document.getElementById('particleSizeValue')
  const particleSpeedSlider = document.getElementById('particleSpeed')
  const particleSpeedValue = document.getElementById('particleSpeedValue')
  const particleColorPicker = document.getElementById('particleColor')
  const backgroundColorPicker = document.getElementById('backgroundColor')
  const boundaryRadiusSlider = document.getElementById('boundaryRadius')
  const boundaryRadiusValue = document.getElementById('boundaryRadiusValue')
  // Metaball/Repel
  const particleForceSlider = document.getElementById('particleForce')
  const particleForceValue = document.getElementById('particleForceValue')
  const metaballThresholdSlider = document.getElementById('metaballThreshold')
  const metaballThresholdValue = document.getElementById(
    'metaballThresholdValue'
  )
  // Other
  const simTypeRadios = document.querySelectorAll(
    'input[name="simulationType"]'
  )
  const playStopButton = document.getElementById('playStopButton')
  const setCurrentAsModeAButton = document.getElementById('setCurrentAsModeA')
  const setCurrentAsModeBButton = document.getElementById('setCurrentAsModeB')
  const selectModeAButton = document.getElementById('selectModeA')
  const selectModeBButton = document.getElementById('selectModeB')
  const saveAllModesButton = document.getElementById('saveAllModes')
  // Get reference to new control
  const canvasScaleSlider = document.getElementById('canvasScale')
  const canvasScaleValue = document.getElementById('canvasScaleValue')

  // Helper function to safely set control value and display
  const setupControl = (slider, valueDisplay, value) => {
    if (slider && value !== undefined) slider.value = value
    // Call updateValueDisplay here to ensure initial format is correct
    if (valueDisplay) updateValueDisplay(valueDisplay.id, value)
  }
  const setupColorControl = (picker, colorHex) => {
    if (picker && colorHex) picker.value = colorHex
  }
  const setupRadioControl = (radios, value) => {
    radios.forEach((radio) => {
      radio.checked = radio.value === value
    })
  }

  // --- Set initial values from initialParams ---
  const params = initialParams
  setupRadioControl(simTypeRadios, params.simulationType)
  // Shared
  if (particleAmountSlider) particleAmountSlider.max = MAX_PARTICLES
  setupControl(particleAmountSlider, particleAmountValue, params.particleAmount)
  setupControl(particleSizeSlider, particleSizeValue, params.particleSize)
  setupControl(particleSpeedSlider, particleSpeedValue, params.particleSpeed)
  setupColorControl(particleColorPicker, params.particleColorHex)
  setupColorControl(backgroundColorPicker, params.backgroundColorHex)
  setupControl(boundaryRadiusSlider, boundaryRadiusValue, params.boundaryRadius)
  // Metaball/Repel
  setupControl(particleForceSlider, particleForceValue, params.particleForce)
  setupControl(
    metaballThresholdSlider,
    metaballThresholdValue,
    params.metaballThreshold
  )
  // Get reference to new control
  setupControl(canvasScaleSlider, canvasScaleValue, params.canvasScale)

  // --- Event listeners for LIVE controls ---
  // Shared listeners
  if (particleAmountSlider)
    particleAmountSlider.addEventListener('input', (e) => {
      const v = parseInt(e.target.value)
      updateValueDisplay('particleAmountValue', v)
      window.updateEnergySimulation({ particleAmount: v })
    })
  if (particleSizeSlider)
    particleSizeSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value)
      updateValueDisplay('particleSizeValue', v)
      window.updateEnergySimulation({ particleSize: v })
    })
  if (particleSpeedSlider)
    particleSpeedSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value)
      updateValueDisplay('particleSpeedValue', v)
      window.updateEnergySimulation({ particleSpeed: v })
    })
  if (particleColorPicker)
    particleColorPicker.addEventListener('input', (e) =>
      window.updateEnergySimulation({ particleColorHex: e.target.value })
    )
  if (backgroundColorPicker)
    backgroundColorPicker.addEventListener('input', (e) =>
      window.updateEnergySimulation({ backgroundColorHex: e.target.value })
    )
  // Boundary Radius Listener (Now correctly referenced)
  if (boundaryRadiusSlider)
    boundaryRadiusSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value)
      updateValueDisplay('boundaryRadiusValue', v)
      window.updateEnergySimulation({ boundaryRadius: v })
    })
  // Metaball/Repel listeners
  if (particleForceSlider)
    particleForceSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value)
      updateValueDisplay('particleForceValue', v)
      window.updateEnergySimulation({ particleForce: v })
    })
  // Metaball Threshold Listener (Now correctly referenced)
  if (metaballThresholdSlider)
    metaballThresholdSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value)
      updateValueDisplay('metaballThresholdValue', v)
      window.updateEnergySimulation({ metaballThreshold: v })
    })
  // Get reference to new control
  if (canvasScaleSlider)
    canvasScaleSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value)
      updateValueDisplay('canvasScaleValue', v)
      window.updateEnergySimulation({ canvasScale: v })
    })

  // Simulation Type Change Listener
  if (simTypeRadios.length > 0) {
    simTypeRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          const newType = e.target.value
          if (['metaball', 'liquid repel'].includes(newType)) {
            console.log(`UI: Simulation type changed to: ${newType}`)
            window.updateEnergySimulation({ simulationType: newType })
          }
        }
      })
    })
  }
  // Play/Stop Button
  if (playStopButton)
    playStopButton.addEventListener('click', () => {
      simulationRunning = !simulationRunning
      playStopButton.textContent = simulationRunning ? 'Stop' : 'Play'
    })
  // Mode Management Buttons
  if (setCurrentAsModeAButton)
    setCurrentAsModeAButton.addEventListener('click', () =>
      setCurrentSettingsAsMode('A')
    )
  if (setCurrentAsModeBButton)
    setCurrentAsModeBButton.addEventListener('click', () =>
      setCurrentSettingsAsMode('B')
    )
  if (selectModeAButton)
    selectModeAButton.addEventListener('click', () => loadModeToPreview('A'))
  if (selectModeBButton)
    selectModeBButton.addEventListener('click', () => loadModeToPreview('B'))
  if (saveAllModesButton)
    saveAllModesButton.addEventListener('click', saveAllModes)
}

// --- Update Simulation ---
function updateParticles(deltaTime) {
  // Guard clause only needs metaballMaterial now
  if (!particles || !metaballMaterial) {
    return
  }

  const currentParams = activeParams
  const speedFactor = currentParams.particleSpeed * deltaTime * 60
  const boundary = currentParams.boundaryRadius
  const damping = 0.98
  const activeParticleCount = currentParams.particleAmount

  // Type specific parameters
  const forceFactor = currentParams.particleForce * 0.0001
  const repelGravity = new THREE.Vector2(0, -0.0018)
  const canvasSize = currentParams.canvasSize || defaultParams.canvasSize
  const particleRadiusFactor = 1 / (canvasSize * 2)

  // --- Main Physics Loop ---
  for (let i = 0; i < activeParticleCount; i++) {
    if (!particles[i]) continue
    const p1 = particles[i]
    const p1Radius = p1.size * particleRadiusFactor * 0.5

    let totalForce = new THREE.Vector2()

    // --- Apply Type-Specific Forces & Gravity ---
    if (
      currentParams.simulationType === 'metaball' ||
      currentParams.simulationType === 'liquid repel'
    ) {
      // Calculate Inter-Particle Forces
      for (let j = i + 1; j < activeParticleCount; j++) {
        if (!particles[j]) continue
        const p2 = particles[j]
        const delta = p2.position.clone().sub(p1.position)
        const distSq = delta.lengthSq()
        if (distSq > 0.00001 && distSq < boundary * 1.5 * (boundary * 1.5)) {
          const forceMagnitude = forceFactor / Math.max(distSq, 0.0001)
          const forceVec = delta.normalize().multiplyScalar(forceMagnitude)
          totalForce.add(forceVec)
          if (particles[j].velocity) particles[j].velocity.sub(forceVec)
        }
      }
      p1.velocity.add(totalForce) // Apply accumulated force

      // Apply Gravity (Only for Liquid Repel)
      if (currentParams.simulationType === 'liquid repel') {
        p1.velocity.add(repelGravity.clone().multiplyScalar(deltaTime * 60))

        // --- Simulate Boiling/Bubbling near bottom ---
        const floorY = -boundary + p1Radius // Floor position for this particle
        const nearBottomThreshold = floorY + p1Radius * 3 // How close to be considered 'near bottom'
        const velocitySq = p1.velocity.lengthSq()

        // Apply only if near the bottom and moving slowly or settled
        if (p1.position.y < nearBottomThreshold && velocitySq < 0.0001) {
          // Add upward 'buoyancy' force - make it slightly random
          const buoyancyStrength = 0.0005 + Math.random() * 0.0005 // Adjust strength range as needed
          p1.velocity.y += buoyancyStrength

          // Add random horizontal jitter
          const jitterStrength = 0.0002 // Adjust strength as needed
          p1.velocity.x += (Math.random() - 0.5) * jitterStrength
        }
      }
    }

    // --- Apply General Damping ---
    let effectiveDamping = damping
    p1.velocity.multiplyScalar(effectiveDamping)

    // --- Calculate tentative new position (BEFORE collision checks) ---
    const tentativePosition = p1.position
      .clone()
      .add(p1.velocity.clone().multiplyScalar(speedFactor))

    // --- Handle Collisions (using tentativePosition and updating p1.position/p1.velocity) ---
    const currentBoundary = boundary - p1Radius

    let collided = false
    if (
      currentParams.simulationType === 'metaball' ||
      currentParams.simulationType === 'liquid repel'
    ) {
      const currentBoundarySq = currentBoundary * currentBoundary
      const distSqFromCenter = tentativePosition.lengthSq()

      if (distSqFromCenter > currentBoundarySq) {
        collided = true
        const distFromCenter = Math.sqrt(distSqFromCenter)
        const normal = tentativePosition.clone().divideScalar(distFromCenter)
        // Clamp position to boundary
        p1.position.copy(normal.multiplyScalar(currentBoundary))

        // Apply reflection response to velocity
        const dotProduct = p1.velocity.dot(normal)
        if (dotProduct > 0) {
          // Moving outwards
          // Reflect velocity component normal to the boundary
          p1.velocity.sub(normal.clone().multiplyScalar(2 * dotProduct))
          // Apply damping based on type
          const boundaryDamping =
            currentParams.simulationType === 'metaball' ? 0.8 : 0.5 // Stronger damping for repel
          p1.velocity.multiplyScalar(boundaryDamping)
        }
      }
    }

    // --- Update Position ---
    // If no collision occurred, use the tentative position
    if (!collided) {
      p1.position.copy(tentativePosition)
    }
    // If a collision DID occur, p1.position was already clamped inside the collision logic.

    // --- Update Shared Uniform Arrays ---
    particlePositionsUniform[i * 2] = p1.position.x
    particlePositionsUniform[i * 2 + 1] = p1.position.y
  } // --- End of Main Physics Loop ---

  // --- Post-Loop Updates ---
  metaballMaterial.uniforms.particlePositions.needsUpdate = true
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

  if (renderer && scene && camera && finalScene && finalCamera) {
    // --- Simplified Rendering Path (Always Metaball Shader) ---
    // 1. Render main scene (containing metaballQuad) to the offscreen renderTarget
    renderer.setRenderTarget(renderTarget)
    renderer.render(scene, camera)

    // 2. Render finalScene (containing finalQuad with the renderTarget texture) to the screen
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
  // Guard clause
  if (!particles || !scene || !metaballMaterial) {
    return
  }
  if (typeof newParams !== 'object' || newParams === null) {
    return
  }

  console.log('API Update with:', newParams)
  let changeDetectedOverall = false // Track if any param actually changed
  const previousType = activeParams.simulationType
  const previousAmount = activeParams.particleAmount

  // --- Update activeParams safely ---
  for (const key in newParams) {
    if (activeParams.hasOwnProperty(key)) {
      const incomingValue = newParams[key]
      let processedValue = incomingValue

      // Coerce type if necessary (simple version)
      if (typeof activeParams[key] === 'number') {
        processedValue = parseFloat(incomingValue)
        if (isNaN(processedValue)) {
          console.warn(`API: Invalid number format for ${key}:`, incomingValue)
          continue // Skip update for this key
        }
      } else if (typeof activeParams[key] === 'string') {
        processedValue = String(incomingValue)
      } // Add boolean etc. if needed

      // Update if value is actually different
      if (processedValue !== activeParams[key]) {
        activeParams[key] = processedValue
        changeDetectedOverall = true
        // console.log(`API: Updated activeParams.${key} to ${processedValue}`);
      }
    }
  }

  // Re-clamp amount AFTER potential update
  activeParams.particleAmount = Math.max(
    1,
    Math.min(activeParams.particleAmount, MAX_PARTICLES)
  )
  const currentAmount = activeParams.particleAmount

  // --- Handle consequences of changes ---
  let needsParticleRecreation = currentAmount !== previousAmount // Recreate only if amount changed

  // --- Particle recreation ---
  if (needsParticleRecreation) {
    console.log(
      'API: Recreating particles for amount change to:',
      currentAmount
    )
    particles = createParticles(activeParams) // Resets uniforms/count internally
  }

  // --- Type Change effects ---
  if (activeParams.simulationType !== previousType) {
    console.log(
      'API: Type changed from',
      previousType,
      'to',
      activeParams.simulationType
    )
  }

  // --- Update Uniforms Directly Based on activeParams ---
  // Update uniforms regardless of changeDetected, as the state *might* need syncing
  // especially after type changes or particle recreation.
  let uniformsUpdated = false // Track if uniforms were actually modified

  // Background Color (Scene and Uniform)
  if (
    scene.background.getHexString() !==
    activeParams.backgroundColorHex.substring(1)
  ) {
    scene.background.set(activeParams.backgroundColorHex)
    metaballMaterial.uniforms.backgroundColor.value.set(
      activeParams.backgroundColorHex
    )
    uniformsUpdated = true
  }
  // Particle Color Uniform
  if (
    metaballMaterial.uniforms.particleColor.value.getHexString() !==
    activeParams.particleColorHex.substring(1)
  ) {
    metaballMaterial.uniforms.particleColor.value.set(
      activeParams.particleColorHex
    )
    uniformsUpdated = true
  }
  // Particle Count Uniform
  if (
    metaballMaterial.uniforms.particleCount.value !==
    activeParams.particleAmount
  ) {
    metaballMaterial.uniforms.particleCount.value = activeParams.particleAmount
    uniformsUpdated = true
  }
  // Boundary Radius Uniform
  if (
    metaballMaterial.uniforms.boundaryRadius.value !==
    activeParams.boundaryRadius
  ) {
    metaballMaterial.uniforms.boundaryRadius.value = activeParams.boundaryRadius
    uniformsUpdated = true
  }
  // Threshold Uniform
  if (
    metaballMaterial.uniforms.threshold.value !== activeParams.metaballThreshold
  ) {
    metaballMaterial.uniforms.threshold.value = activeParams.metaballThreshold
    uniformsUpdated = true
  }
  // Particle Sizes Uniform (update if size changed or particles recreated)
  // Check if any active particle's size differs from the uniform array's corresponding entry OR if recreated
  let sizeMismatch = false
  if (changeDetectedOverall && newParams.particleSize !== undefined) {
    // Check if size was explicitly passed and changed
    sizeMismatch = true
  } else if (needsParticleRecreation) {
    // Always update sizes if recreating
    sizeMismatch = true
  }

  if (sizeMismatch) {
    // Update particle data array (if size changed)
    if (newParams.particleSize !== undefined) {
      particles.forEach((p) => {
        if (p) p.size = activeParams.particleSize
      })
    }
    // Update uniform array (always sync after potential change/recreation)
    for (let i = 0; i < MAX_PARTICLES; ++i) {
      // Use size from particle data if it exists and is active, else 0
      particleSizesUniform[i] =
        i < currentAmount && particles[i] ? particles[i].size : 0
    }
    metaballMaterial.uniforms.particleSizes.needsUpdate = true
    uniformsUpdated = true
    // console.log("API: Updating size uniform array.");
  }

  // Position uniform is marked in updateParticles, but ensure flag is set if other uniforms change
  if (uniformsUpdated) {
    metaballMaterial.uniforms.particlePositions.needsUpdate = true // Ensure position updates render
  }

  // Add handling for canvasScale uniform
  if (
    metaballMaterial.uniforms.canvasScale.value !== activeParams.canvasScale
  ) {
    metaballMaterial.uniforms.canvasScale.value = activeParams.canvasScale
    uniformsUpdated = true
  }

  if (changeDetectedOverall) {
    console.log('API: Applied updates. Current activeParams:', activeParams)
  }
}

// --- Modify Initialization Logic ---
function initializeSimulations() {
  // 1. Load modes synchronously first
  loadModes() // Call the sync function
  window.savedModes = savedModes // Make loaded modes globally accessible for controller/API

  // 2. Attempt initialization for the testbed (energy.html)
  const testContainer = document.getElementById('container')
  const testCanvas = document.getElementById('simulationCanvas')
  if (testContainer && testCanvas) {
    console.log('Attempting initialization for HTML testbed (#container)')
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
    for (const container of webflowContainers) {
      let stableSelector
      if (container.id) {
        stableSelector = `#${container.id}`
      } else {
        const containers = document.querySelectorAll('.energy-container')
        let index = Array.prototype.indexOf.call(containers, container)
        stableSelector = `.energy-container:nth-of-type(${index + 1})`
        console.warn(
          `Webflow container lacks ID. Using potentially unstable selector: ${stableSelector}. Add a unique ID for reliability.`
        )
      }

      init({
        containerSelector: stableSelector,
        createCanvas: true,
      })
    }
  }
}

// --- Execute Initialization ---
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeSimulations()
  })
} else {
  initializeSimulations()
}
