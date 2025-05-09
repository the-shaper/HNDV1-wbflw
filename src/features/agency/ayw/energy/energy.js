import * as THREE from 'three'
// --- Import JSON data directly ---
// Vite will handle loading this JSON during the build/module load
import modesDataFromFile from './energyModes.json'
// --- Import Orbit Functions ---
import {
  initializeOrbit,
  updateOrbitAnimation,
  renderOrbitScene,
  updateOrbitParameters as updateOrbitModuleParameters,
  calculateActualPlanetSpeed,
  calculatePlanetSliderValue,
  calculateActualMoonSpeed,
  calculateMoonSliderValue,
  // REMOVE THIS if getDaySegmentDurationMilliseconds is truly in orbit.js and imported
  // getDaySegmentDurationMilliseconds // Assuming this would be imported if it lived in orbit.js
} from './orbit.js'
import {
  updateCommsDotDuration,
  startWorkingHoursAnimation as startCommsAnimation,
} from './comms.js' // MODIFIED IMPORT

let scene, camera, renderer
let particles = []
let simulationRunning = true
let renderTarget, finalQuad, finalScene, finalCamera
let metaballMaterial
let particlePositionsUniform
let particleSizesUniform
let metaballQuad
// --- Add Orbit Visibility Flag ---
let isOrbitLayerVisible = false // Default to hidden

// --- Maximum Particles Constant ---
const MAX_PARTICLES = 333 // Define the pre-allocated maximum

// --- NEW: Define Day Segment Calculation (Revised for clarity) ---
const FULL_CIRCLE_RADIANS = 2 * Math.PI
const VISUAL_DAYS_IN_ORBIT = 6 // Matches the 6 day markers on the orbit visualization
const PLANET_EFFECTIVE_SPEED_MULTIPLIER = 2.5 // Empirically determined factor: planet visually moves ~2.5x faster
// than orbitSpeed parameter would suggest for a simple 2*PI cycle.

/**
 * Calculates the duration in milliseconds for the comms dot to match
 * the planet's traversal of one visual day segment, accounting for effective planet speed.
 * @param {number} orbitSpeedValue - The angular speed parameter for the planet.
 * @returns {number} Duration in milliseconds, or Infinity if orbitSpeedValue is 0.
 */
function getDaySegmentDurationMilliseconds(orbitSpeedValue) {
  if (typeof orbitSpeedValue !== 'number' || orbitSpeedValue === 0) {
    return Infinity // Avoid division by zero, effectively pausing
  }
  // Ensure orbitSpeed is positive if it represents magnitude of speed
  const speed = Math.abs(orbitSpeedValue)

  // Nominal time for a full orbit if 'speed' were a direct rad/s for a 2*PI cycle
  const nominalTimeForFullCircleSeconds = FULL_CIRCLE_RADIANS / speed

  // Actual visual time for a full orbit, is shorter due to effective speed multiplier
  const actualVisualTimeForFullCircleSeconds =
    nominalTimeForFullCircleSeconds / PLANET_EFFECTIVE_SPEED_MULTIPLIER

  // Time for the planet to traverse one of the visual day segments
  const timePerVisualDaySegmentSeconds =
    actualVisualTimeForFullCircleSeconds / VISUAL_DAYS_IN_ORBIT

  return timePerVisualDaySegmentSeconds * 1000
}
// --- END NEW CALCULATION ---

// Default simulation parameters (Add new liquid params)
let defaultParams = {
  // --- Energy Simulation ---
  simulationType: 'metaball',
  particleAmount: 111,
  particleSize: 25.0,
  particleSpeed: 0.01,
  particleColorHex: '#FF3d23',
  backgroundColorHex: '#edf7ee',
  boundaryRadius: 0.44,
  canvasSize: 800, // Note: canvasSize is shared, ensure consistency if needed
  canvasScale: 1.0, // Default scale of 100%
  // --- Type Specific ---
  particleForce: 0.5,
  metaballThreshold: 0.6,
  // --- Orbit Layer Visibility (Keep this separate for the toggle) ---
  orbitVisible: false, // Default visibility for the layer itself

  // --- NEW: Default Orbit Parameters ---
  showSun: true,
  sunColor: '#f6ff47', // Converted from 0xf6ff47
  planetColor: '#607d8b', // Converted from 0x607d8b
  showMoon1: true,
  moon1Color: '#ff3d23', // Converted from 0xff3d23
  showMoon2: true,
  moon2Color: '#0189d7', // Converted from 0x0189d7
  orbitSpeed: 0.1, // Planet speed
  moonOrbitSpeed: 0.4, // Moon speed
  mainOrbitColor: '#d1e7de', // Converted from 0xd1e7de
  mainOrbitThickness: 6,
  radarColor: '#a0a0a0', // Converted from 0xa0a0a0
  radarThickness: 1,
  activeDeliveryDays: {
    monday: false,
    tuesday: true,
    wednesday: false,
    thursday: false,
    friday: true,
    saturday: false,
  },
  planetActiveColor: '#eeff00', // Converted from 0xeeff00
  radarVisibilityMode: 'activeDays', // 'always' or 'activeDays'
  dayMarkColor: '#d1e7de', // Converted from 0xd1e7de
  radarFlowDirection: 'inward', // Default flow direction
  radarAnimationSpeed: 0.6, // Default radar animation speed
  radarSetsPerDay: 1, // Default sets per day
}

// Active parameters for the *currently controlled/previewed* instance (e.g., on energy.html)
// This will be updated by controls or loading modes.
// Initialize with the now extended defaults
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
      const modeData = savedModes[modeKey]
      if (!modeData) {
        // If mode doesn't exist at all, create it from the extended defaults
        savedModes[modeKey] = { ...defaultParams }
        console.log(
          `Mode ${modeKey} not found in JSON, created from extended defaults.`
        )
        return
      }
      // Merge extended defaultParams into the loaded mode, ensuring all keys exist
      for (const key in defaultParams) {
        if (modeData[key] === undefined) {
          modeData[key] = defaultParams[key]
          console.log(
            `Mode ${modeKey}: Added missing default for '${key}':`,
            modeData[key]
          )
        }
        // --- Specific Type/Value Validations ---
        else if (
          key === 'activeDeliveryDays' &&
          typeof modeData[key] !== 'object'
        ) {
          // Ensure activeDeliveryDays is an object
          console.warn(
            `Mode ${modeKey}: Correcting invalid 'activeDeliveryDays' to default object.`
          )
          modeData[key] = { ...defaultParams.activeDeliveryDays }
        } else if (
          (key === 'showSun' || key === 'showMoon1' || key === 'showMoon2') &&
          typeof modeData[key] !== 'boolean'
        ) {
          // Ensure boolean visibility flags are boolean
          console.warn(`Mode ${modeKey}: Correcting '${key}' to boolean.`)
          modeData[key] = !!modeData[key] // Coerce to boolean
        } else if (
          key === 'radarVisibilityMode' &&
          !['always', 'activeDays'].includes(modeData[key])
        ) {
          // Ensure valid radar visibility mode
          console.warn(
            `Mode ${modeKey}: Correcting invalid 'radarVisibilityMode' to default.`
          )
          modeData[key] = defaultParams.radarVisibilityMode
        } else if (
          // NEW: Add validation for radarFlowDirection
          key === 'radarFlowDirection' &&
          !['inward', 'outward'].includes(modeData[key])
        ) {
          console.warn(
            `Mode ${modeKey}: Correcting invalid 'radarFlowDirection' to default.`
          )
          modeData[key] = defaultParams.radarFlowDirection
        } else if (
          // NEW: Add validation for radarAnimationSpeed
          key === 'radarAnimationSpeed' &&
          (typeof modeData[key] !== 'number' || isNaN(modeData[key]))
        ) {
          console.warn(
            `Mode ${modeKey}: Correcting invalid 'radarAnimationSpeed' to default.`
          )
          modeData[key] = defaultParams.radarAnimationSpeed
        } else if (
          // NEW: Add validation for radarSetsPerDay
          key === 'radarSetsPerDay' &&
          (typeof modeData[key] !== 'number' ||
            isNaN(modeData[key]) ||
            modeData[key] < 0)
        ) {
          console.warn(
            `Mode ${modeKey}: Correcting invalid 'radarSetsPerDay' to default.`
          )
          modeData[key] = defaultParams.radarSetsPerDay
        }
        // Add more specific validations for numbers, strings (colors) if needed
      }

      // Ensure orbitVisible is a boolean (redundant check now handled above, but safe)
      if (typeof modeData.orbitVisible !== 'boolean') {
        modeData.orbitVisible = defaultParams.orbitVisible
        console.warn(
          `Mode ${modeKey}: Corrected 'orbitVisible' to boolean default:`,
          modeData.orbitVisible
        )
      }

      // Validate simulationType loaded from file
      const currentType = modeData.simulationType
      if (!['metaball', 'liquid repel'].includes(currentType)) {
        modeData.simulationType = defaultParams.simulationType
        console.warn(
          `Mode ${modeKey}: Corrected invalid simulationType to default:`,
          modeData.simulationType
        )
      }
    }
    ensureModeDefaults('A')
    ensureModeDefaults('B')
    console.log('Final loaded modes after ensuring defaults:', savedModes)
  } catch (error) {
    console.error('Failed to process imported energyModes.json:', error)
    console.warn(
      'Using default values for modes A and B as fallback due to processing error.'
    )
    // Ensure modes A and B exist, populated with extended defaults
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
              // Use backgroundColor uniform for consistency
              gl_FragColor = vec4(backgroundColor, 1.0);
              return;
          }
          
          // Calculate distance from center for boundary using scaled UV
          float distFromCenter = distance(scaledUV, center);

          // Discard fragments outside the circular boundary visually
          if (distFromCenter > boundaryRadius + 0.05) { // Add slight buffer
               gl_FragColor = vec4(backgroundColor, 1.0); // Use background color
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

  // --- Determine Instance Parameters ---
  let instanceParams = { ...defaultParams } // Start with defaults
  // --- CHANGE THIS LINE ---
  // const modeAttribute = container.dataset.mode?.toUpperCase(); // <<< OLD: Reads the "data-mode" attribute
  const modeAttribute = (
    container.dataset.setMode || container.dataset.mode
  )?.toUpperCase()
  console.log(
    `Container ${currentConfig.containerSelector} data-set-mode/data-mode attribute:`,
    modeAttribute
  )
  // --- END CHANGE ---

  if (modeAttribute && savedModes[modeAttribute]) {
    // Checks if data-set-mode was found AND matches a key in savedModes ('A' or 'B')
    console.log(
      `Container ${currentConfig.containerSelector} uses Mode: ${modeAttribute}`
    )
    // Load ALL params from the selected mode (including orbitVisible)
    // Ensure defaults are merged in loadModes, so all keys should exist here
    instanceParams = { ...savedModes[modeAttribute] } // Uses the mode from JSON if data-set-mode is valid
  } else {
    console.log(
      `Container ${currentConfig.containerSelector} using individual attributes or defaults.`
    )
    let attributeParams = readParametersFromDOM(container) // Read HTML attributes
    // Merge attribute settings over defaults (orbitVisible from defaultParams used if not in attributes)
    instanceParams = { ...defaultParams, ...attributeParams } // Uses defaults/other attributes if data-set-mode is missing/invalid

    // Re-validate simulationType if read from attributes
    if (!['metaball', 'liquid repel'].includes(instanceParams.simulationType)) {
      console.warn(
        `Invalid simulationType '${instanceParams.simulationType}' from attributes, using default.`
      )
      instanceParams.simulationType = defaultParams.simulationType
    }
    // Ensure orbitVisible is boolean if read from attributes (though unlikely)
    if (typeof instanceParams.orbitVisible !== 'boolean') {
      instanceParams.orbitVisible = defaultParams.orbitVisible
    }
  }

  // Clamp particle amount (already done in loadModes/attribute reading usually, but good to double check)
  instanceParams.particleAmount = Math.max(
    1,
    Math.min(
      instanceParams.particleAmount || defaultParams.particleAmount,
      MAX_PARTICLES
    )
  )

  // --- Set Initial Orbit Visibility based on determined instanceParams ---
  // The instanceParams.orbitVisible now comes either from the JSON mode or the defaultParams
  isOrbitLayerVisible = instanceParams.orbitVisible
  console.log(
    `Instance ${currentConfig.containerSelector} - Initial orbit visibility set to: ${isOrbitLayerVisible} (from instance params)`
  )
  // --- Remove the data-orbit-visible attribute reading logic ---

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

  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
  })
  renderer.setSize(instanceParams.canvasSize, instanceParams.canvasSize, false)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // --- Extract Initial Orbit Params FIRST ---
  const initialOrbitParams = {}
  Object.keys(defaultParams).forEach((key) => {
    // Exclude non-orbit keys
    if (
      ![
        'simulationType',
        'particleAmount',
        'particleSize',
        'particleSpeed',
        'particleColorHex',
        'backgroundColorHex',
        'boundaryRadius',
        'canvasSize',
        'canvasScale',
        'particleForce',
        'metaballThreshold',
        'orbitVisible',
      ].includes(key) &&
      instanceParams.hasOwnProperty(key)
    ) {
      // --- Convert colors back to numbers for orbit.js internal use ---
      if (
        [
          'sunColor',
          'planetColor',
          'moon1Color',
          'moon2Color',
          'mainOrbitColor',
          'radarColor',
          'planetActiveColor',
          'dayMarkColor',
        ].includes(key) &&
        typeof instanceParams[key] === 'string' &&
        instanceParams[key].startsWith('#')
      ) {
        try {
          initialOrbitParams[key] = new THREE.Color(
            instanceParams[key]
          ).getHex()
        } catch (e) {
          console.error(`Error converting color ${key}: ${instanceParams[key]}`)
          // Optionally fallback to a default number color if conversion fails
        }
      } else {
        initialOrbitParams[key] = instanceParams[key]
      }
    }
  })
  console.log(
    `Instance ${currentConfig.containerSelector}: Extracted initial orbit params to send:`,
    initialOrbitParams
  )

  // --- Initialize Orbit Module in Integration Mode ---
  try {
    // --- Pass initialOrbitParams to initializeOrbit ---
    initializeOrbit({ existingRenderer: renderer }, initialOrbitParams)
    console.log(
      'Orbit module initialized by energy.js in integration mode with params.'
    )

    // --- REMOVE the separate update call, it's handled by initializeOrbit now ---
    // if (Object.keys(initialOrbitParams).length > 0) {
    //   updateOrbitModuleParameters(initialOrbitParams);
    //   console.log(
    //     `Instance ${currentConfig.containerSelector}: Initial orbit parameters set:`,
    //     initialOrbitParams
    //   );
    // }
  } catch (error) {
    console.error('Failed to initialize orbit module:', error)
    // If orbit fails, ensure the layer isn't treated as visible
    isOrbitLayerVisible = false
    // Also update instanceParams to reflect this failure state for the UI toggle
    instanceParams.orbitVisible = false
    if (activeParams === instanceParams) {
      // If this instance was setting the activeParams, update it too
      activeParams.orbitVisible = false
    }
  }

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
    // --- Add Transparency Settings ---
    transparent: true, // Allow transparency
    blending: THREE.NormalBlending, // Standard alpha blending
    depthWrite: false, // Don't occlude things behind it
    depthTest: false, // Draw regardless of depth buffer
    // --- End Transparency Settings ---
  })
  finalQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), finalMaterial)
  finalScene.add(finalQuad)

  // Setup Controls - Pass the final instanceParams (now including full defaults/mode)
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

  // Add in the init function around line ~326-328:
  console.log(`Container ${currentConfig.containerSelector} attributes:`, {
    'data-set-mode': container.dataset.setMode,
    'data-mode': container.dataset.mode,
    'all-data-attributes': { ...container.dataset },
  })
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
  attributeParams.canvasScale = getParam('canvasScale') // Read canvasScale attribute

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
  const settings = {} // Start empty, will be populated

  // Helper to safely get element value
  const getElementValue = (id) => {
    const element = document.getElementById(id)
    return element ? element.value : undefined
  }
  // Helper to get value and parse
  const getValue = (id, parser = parseFloat) => {
    const val = getElementValue(id)
    return val !== undefined ? parser(val) : undefined
  }
  const getIntValue = (id) => getValue(id, parseInt)
  const getStringValue = (id) => getValue(id, String)
  const getBoolRadioValue = (name) => {
    const checkedRadio = document.querySelector(`input[name="${name}"]:checked`)
    return checkedRadio ? checkedRadio.value === 'true' : undefined
  }
  const getStringRadioValue = (name) => {
    const checkedRadio = document.querySelector(`input[name="${name}"]:checked`)
    return checkedRadio ? checkedRadio.value : undefined
  }
  const getCheckboxValue = (id) => {
    const element = document.getElementById(id)
    return element ? element.checked : undefined
  }

  // --- Read Energy Controls ---
  settings.simulationType = getStringRadioValue('simulationType')
  settings.particleAmount = getIntValue('particleAmount')
  settings.particleSize = getValue('particleSize')
  settings.particleSpeed = getValue('particleSpeed')
  settings.particleForce = getValue('particleForce')
  settings.metaballThreshold = getValue('metaballThreshold')
  settings.particleColorHex = getStringValue('particleColor')
  settings.backgroundColorHex = getStringValue('backgroundColor')
  settings.boundaryRadius = getValue('boundaryRadius')
  settings.canvasScale = getValue('canvasScale')
  settings.orbitVisible = getCheckboxValue('orbitLayerToggle')

  // --- Read Orbit Controls ---
  settings.showSun = getBoolRadioValue('sunVisible')
  settings.sunColor = getStringValue('sunColor')
  settings.planetColor = getStringValue('planetColor')
  settings.showMoon1 = getBoolRadioValue('moon1Visible')
  settings.moon1Color = getStringValue('moon1Color')
  settings.showMoon2 = getBoolRadioValue('moon2Visible')
  settings.moon2Color = getStringValue('moon2Color')

  // Orbit/Moon Speed: Read slider value (1-10) and convert to actual speed
  const orbitSliderVal = getIntValue('orbitSpeed')
  if (orbitSliderVal !== undefined) {
    settings.orbitSpeed = calculateActualPlanetSpeed(orbitSliderVal)
  }
  const moonSliderVal = getIntValue('moonSpeed')
  if (moonSliderVal !== undefined) {
    settings.moonOrbitSpeed = calculateActualMoonSpeed(moonSliderVal)
  }

  settings.mainOrbitColor = getStringValue('mainOrbitColor')
  settings.mainOrbitThickness = getIntValue('mainOrbitThickness')
  settings.radarColor = getStringValue('radarColor')
  settings.radarThickness = getIntValue('radarThickness')

  // Active Delivery Days: Construct object from checkboxes
  const activeDays = {}
  const dayCheckboxes = document.querySelectorAll('input[name="deliveryDay"]')
  if (dayCheckboxes) {
    dayCheckboxes.forEach((cb) => {
      if (cb.value) {
        activeDays[cb.value] = cb.checked
      }
    })
    settings.activeDeliveryDays = activeDays
  }

  settings.planetActiveColor = getStringValue('planetActiveColor')
  settings.dayMarkColor = getStringValue('dayMarkColor')
  settings.radarVisibilityMode = getStringRadioValue('radarVisibilityMode')
  settings.radarFlowDirection = getStringRadioValue('radarFlowDirection')
  settings.radarAnimationSpeed = getValue('radarAnimationSpeed')
  settings.radarSetsPerDay = getIntValue('radarSetsPerDay') // Read new control

  // --- Final Cleanup & Defaults ---
  // Start with defaults, then layer the direct control readings over them.
  // This avoids potential issues with stale activeParams for orbit values.
  const finalSettings = {
    ...defaultParams, // Load defaults first
    ...settings, // OVERWRITE with values read directly from controls
  }

  // Ensure required values that might not have controls exist (belt-and-suspenders)
  // (e.g., canvasSize if there's no direct control for it)
  finalSettings.canvasSize =
    finalSettings.canvasSize ?? defaultParams.canvasSize

  // Clamp amount again after potential reads/merges
  finalSettings.particleAmount = Math.max(
    1,
    Math.min(
      finalSettings.particleAmount ?? defaultParams.particleAmount, // Use nullish coalescing
      MAX_PARTICLES
    )
  )

  // Remove undefined values before returning? Optional.
  Object.keys(finalSettings).forEach(
    (key) => finalSettings[key] === undefined && delete finalSettings[key]
  )

  console.log('Got current settings from controls:', finalSettings)
  return finalSettings
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
  // Ensure simulationType is captured and valid
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
}

// Loads a mode from memory into the preview and UI controls
function loadModeToPreview(modeId) {
  if (!modeId || !savedModes[modeId]) {
    console.error(`Mode "${modeId}" not found in savedModes memory.`)
    return // Removed alert as console error is sufficient
  }
  console.log(`Loading Mode ${modeId} to preview and controls...`)

  // Ensure the mode data is fully populated with the extended defaults
  const modeSettings = { ...defaultParams, ...savedModes[modeId] }

  // Call API first to update the *energy* simulation state and orbit visibility flag
  window.updateEnergySimulation(modeSettings) // Pass the full settings

  // We need to force a direct update to orbit parameters
  console.log('Forcing explicit orbit parameter update from loaded mode...')
  const orbitSpecificParams = extractOrbitParams(modeSettings)
  if (Object.keys(orbitSpecificParams).length > 0) {
    // Add an immediate timeout to ensure this runs after the energy update
    setTimeout(() => {
      console.log(
        'Applying orbit parameters with forced update:',
        orbitSpecificParams
      )
      updateOrbitModuleParameters(orbitSpecificParams)
    }, 10)
  }

  // --- NEW: Call Orbit API to update the orbit simulation state ---
  // Extract only the orbit-specific parameters to pass to its update function
  const orbitParamsToUpdate = {}
  Object.keys(defaultParams).forEach((key) => {
    // Exclude energy-specific keys and the visibility toggle itself
    if (
      ![
        'simulationType',
        'particleAmount',
        'particleSize',
        'particleSpeed',
        'particleColorHex',
        'backgroundColorHex',
        'boundaryRadius',
        'canvasSize',
        'canvasScale',
        'particleForce',
        'metaballThreshold',
        'orbitVisible',
      ].includes(key)
    ) {
      // Check if the key exists in modeSettings (it should, due to ensureModeDefaults)
      if (modeSettings.hasOwnProperty(key)) {
        orbitParamsToUpdate[key] = modeSettings[key]
      }
    }
  })
  if (Object.keys(orbitParamsToUpdate).length > 0) {
    updateOrbitModuleParameters(orbitParamsToUpdate) // Use the imported function
    console.log(
      'Orbit parameters updated from loaded mode:',
      orbitParamsToUpdate
    )
  }
  // --- End Orbit API Call ---

  // --- Update UI controls AFTER API calls ---
  const orbitLayerToggle = document.getElementById('orbitLayerToggle') // Get toggle ref

  // --- Keep existing helper functions ---
  const updateControl = (id, value) => {
    const control = document.getElementById(id)
    if (control) {
      // Special handling for checkboxes (like delivery days)
      if (control.type === 'checkbox') {
        control.checked = !!value // Convert to boolean
      } else {
        control.value = value
      }
    } else {
      // console.warn(`UI Update: Control with ID '${id}' not found.`);
    }
  }
  const updateRadioControl = (name, value) => {
    const radioToCheck = document.querySelector(
      `input[name="${name}"][value="${value}"]`
    )
    if (radioToCheck) {
      radioToCheck.checked = true
    } else {
      // console.warn(`UI Update: Could not find radio button for name "${name}" with value "${value}"`);
    }
  }
  // Helper for setting range slider + value display
  const updateSliderAndDisplay = (sliderId, displayId, value) => {
    updateControl(sliderId, value)
    updateValueDisplay(displayId, value) // Use existing value display helper
  }
  // --- End Helpers ---

  const getVal = (key) => modeSettings[key] // Use the fully merged modeSettings

  // ... update energy simulation controls ...
  updateSliderAndDisplay(
    'particleAmount',
    'particleAmountValue',
    getVal('particleAmount')
  )
  updateSliderAndDisplay(
    'particleSize',
    'particleSizeValue',
    getVal('particleSize')
  )
  updateSliderAndDisplay(
    'particleSpeed',
    'particleSpeedValue',
    getVal('particleSpeed')
  )
  updateControl('particleColor', getVal('particleColorHex'))
  updateControl('backgroundColor', getVal('backgroundColorHex'))
  updateSliderAndDisplay(
    'boundaryRadius',
    'boundaryRadiusValue',
    getVal('boundaryRadius')
  )
  updateSliderAndDisplay(
    'canvasScale',
    'canvasScaleValue',
    getVal('canvasScale')
  )
  updateSliderAndDisplay(
    'particleForce',
    'particleForceValue',
    getVal('particleForce')
  )
  updateSliderAndDisplay(
    'metaballThreshold',
    'metaballThresholdValue',
    getVal('metaballThreshold')
  )

  // --- Update Orbit Layer Toggle UI ---
  if (orbitLayerToggle) {
    orbitLayerToggle.checked = getVal('orbitVisible')
  }

  // --- NEW: Update Orbit Controls UI ---
  updateControl('sunColor', getVal('sunColor'))
  updateRadioControl('sunVisible', String(getVal('showSun'))) // Convert boolean to string for radio value
  updateControl('planetColor', getVal('planetColor'))
  updateRadioControl('moon1Visible', String(getVal('showMoon1')))
  updateControl('moon1Color', getVal('moon1Color'))
  updateRadioControl('moon2Visible', String(getVal('showMoon2')))
  updateControl('moon2Color', getVal('moon2Color'))

  // --- CORRECTED: Update Orbit Speed Sliders & Displays ---
  const orbitSpeedSlider = document.getElementById('orbitSpeed')
  const orbitSpeedValueSpan = document.getElementById('orbitSpeedValue')
  if (orbitSpeedSlider && orbitSpeedValueSpan) {
    const actualOrbitSpeed = getVal('orbitSpeed')
    const sliderOrbitValue = calculatePlanetSliderValue(actualOrbitSpeed) // Calculate 1-10 value
    updateControl(orbitSpeedSlider.id, sliderOrbitValue) // Set slider value (1-10)
    updateValueDisplay(orbitSpeedValueSpan.id, actualOrbitSpeed, 3) // Set display text (actual speed)
  }

  const moonSpeedSlider = document.getElementById('moonSpeed')
  const moonSpeedValueSpan = document.getElementById('moonSpeedValue')
  if (moonSpeedSlider && moonSpeedValueSpan) {
    const actualMoonSpeed = getVal('moonOrbitSpeed')
    const sliderMoonValue = calculateMoonSliderValue(actualMoonSpeed) // Calculate 1-10 value
    updateControl(moonSpeedSlider.id, sliderMoonValue) // Set slider value (1-10)
    updateValueDisplay(moonSpeedValueSpan.id, actualMoonSpeed, 3) // Set display text (actual speed)
  }
  // --- End Corrected Speed Sliders ---

  updateControl('mainOrbitColor', getVal('mainOrbitColor'))
  updateSliderAndDisplay(
    'mainOrbitThickness',
    'mainOrbitThicknessValue',
    getVal('mainOrbitThickness')
  )
  updateControl('radarColor', getVal('radarColor'))
  updateSliderAndDisplay(
    'radarThickness',
    'radarThicknessValue',
    getVal('radarThickness')
  )

  // Update Delivery Day Checkboxes
  const deliveryDays = getVal('activeDeliveryDays') || {}
  Object.keys(deliveryDays).forEach((day) => {
    const checkboxId = `day${day.charAt(0).toUpperCase() + day.slice(1)}` // e.g., dayMonday
    updateControl(checkboxId, deliveryDays[day])
  })

  updateControl('planetActiveColor', getVal('planetActiveColor'))
  updateControl('dayMarkColor', getVal('dayMarkColor'))
  updateRadioControl('radarVisibilityMode', getVal('radarVisibilityMode'))
  // NEW: Update radar flow direction UI
  updateRadioControl('radarFlowDirection', getVal('radarFlowDirection'))
  // NEW: Update radar animation speed UI
  updateSliderAndDisplay(
    'radarAnimationSpeed',
    'radarAnimationSpeedValue',
    getVal('radarAnimationSpeed')
  )
  // NEW: Update radar sets per day UI
  updateSliderAndDisplay(
    'radarSetsPerDay',
    'radarSetsPerDayValue',
    getVal('radarSetsPerDay')
  )
  // --- End Orbit Controls UI Update ---

  console.log(`Mode ${modeId} loaded into controls and simulations.`)

  // Force orbit visibility if the mode has it enabled
  if (modeSettings.orbitVisible) {
    isOrbitLayerVisible = true
    console.log(`Forcing orbit layer visibility to true for mode ${modeId}`)
  }
}

// Saves the entire `savedModes` object (containing A & B from memory) to a file
function saveAllModes() {
  console.log('Saving all modes (A & B) from memory to file...')

  // Helper to ensure necessary properties exist before saving
  const ensureProperties = (mode) => {
    // Start with a fresh copy of extended defaults
    let validatedMode = { ...defaultParams }
    // Merge the potentially incomplete 'mode' data over the defaults
    if (mode) {
      validatedMode = { ...validatedMode, ...mode }
    }

    // Now, iterate through the combined object and perform specific validations
    for (const key in validatedMode) {
      if (!defaultParams.hasOwnProperty(key)) continue // Skip keys not in defaults

      const defaultValue = defaultParams[key]
      const currentValue = validatedMode[key]
      const defaultType = typeof defaultValue
      const currentType = typeof currentValue

      // Basic Type Check (if not undefined/null)
      if (
        currentValue !== undefined &&
        currentValue !== null &&
        defaultType !== 'object' && // Skip objects like activeDeliveryDays for this simple check
        currentType !== defaultType
      ) {
        console.warn(
          `Save Validation: Correcting type mismatch for '${key}'. Expected ${defaultType}, got ${currentType}. Resetting to default.`
        )
        validatedMode[key] = defaultValue
        continue // Move to next key after resetting
      }

      // Specific Validations (add more as needed)
      if (
        key === 'simulationType' &&
        !['metaball', 'liquid repel'].includes(currentValue)
      ) {
        validatedMode[key] = defaultValue
        console.warn('Save Validation: Corrected invalid simulationType.')
      } else if (key === 'orbitVisible' && currentType !== 'boolean') {
        validatedMode[key] = defaultValue
        console.warn('Save Validation: Corrected invalid orbitVisible.')
      } else if (
        (key === 'showSun' || key === 'showMoon1' || key === 'showMoon2') &&
        currentType !== 'boolean'
      ) {
        validatedMode[key] = defaultValue
        console.warn(`Save Validation: Corrected invalid ${key}.`)
      } else if (
        key === 'radarVisibilityMode' &&
        !['always', 'activeDays'].includes(currentValue)
      ) {
        validatedMode[key] = defaultValue
        console.warn('Save Validation: Corrected invalid radarVisibilityMode.')
      } else if (
        // NEW: Add validation for radarFlowDirection before saving
        key === 'radarFlowDirection' &&
        !['inward', 'outward'].includes(currentValue)
      ) {
        validatedMode[key] = defaultValue
        console.warn('Save Validation: Corrected invalid radarFlowDirection.')
      } else if (
        // NEW: Add validation for radarAnimationSpeed before saving
        key === 'radarAnimationSpeed' &&
        (typeof currentValue !== 'number' || isNaN(currentValue))
      ) {
        validatedMode[key] = defaultValue
        console.warn('Save Validation: Corrected invalid radarAnimationSpeed.')
      } else if (
        // NEW: Add validation for radarSetsPerDay before saving
        key === 'radarSetsPerDay' &&
        (typeof currentValue !== 'number' ||
          isNaN(currentValue) ||
          currentValue < 0)
      ) {
        validatedMode[key] = defaultValue
        console.warn('Save Validation: Corrected invalid radarSetsPerDay.')
      } else if (
        key === 'activeDeliveryDays' &&
        (currentType !== 'object' || currentValue === null)
      ) {
        // Ensure it's a non-null object
        validatedMode[key] = { ...defaultValue } // Deep copy default object
        console.warn('Save Validation: Corrected invalid activeDeliveryDays.')
      } else if (key === 'activeDeliveryDays') {
        // Further check object structure if needed (ensure all days exist)
        const defaultDays = Object.keys(defaultValue)
        let daysOk = true
        for (const day of defaultDays) {
          if (typeof currentValue[day] !== 'boolean') {
            daysOk = false
            break
          }
        }
        if (!daysOk) {
          validatedMode[key] = { ...defaultValue }
          console.warn(
            'Save Validation: Corrected invalid structure within activeDeliveryDays.'
          )
        }
      }
      // Add checks for number ranges (thickness, speed, etc.) if strict validation is desired
    }
    return validatedMode // Return the validated mode object
  }

  // Prepare modes for saving, ensuring required fields are present and valid
  const modesToSave = {
    A: ensureProperties(savedModes.A), // Pass potentially existing mode data
    B: ensureProperties(savedModes.B),
  }

  // Convert the *prepared* modes object to JSON
  const jsonContent = JSON.stringify(modesToSave, null, 2) // Pretty print

  // Trigger the download
  triggerFileDownload('energyModes.json', jsonContent)
  alert(
    `Saving current session's Mode A & B settings.\nPlease replace the existing 'energyModes.json' file in your project with the downloaded one to make them permanent.`
  )
}

// --- Control Setup ---
function setupControls(initialParams) {
  // --- ADD LOG 1 ---
  console.log(
    '--- Running setupControls for parameters: ---',
    JSON.parse(JSON.stringify(initialParams))
  ) // Log a copy to avoid large object logging issues

  const controlsContainer = document.getElementById('controls')
  if (!controlsContainer) {
    // Add more specific logging
    console.error(
      'setupControls ERROR: Controls container "#controls" not found! Listeners cannot be attached.'
    )
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
  // --- NEW: Get reference to Orbit Toggle ---
  const orbitLayerToggle = document.getElementById('orbitLayerToggle')

  // --- NEW: Get references to Orbit Controls ---
  const sunColorPicker = document.getElementById('sunColor')
  const sunVisibleRadios = document.querySelectorAll('input[name="sunVisible"]')
  const planetColorPicker = document.getElementById('planetColor')
  const moon1VisibleRadios = document.querySelectorAll(
    'input[name="moon1Visible"]'
  )
  const moon1ColorPicker = document.getElementById('moon1Color')
  const moon2VisibleRadios = document.querySelectorAll(
    'input[name="moon2Visible"]'
  )
  const moon2ColorPicker = document.getElementById('moon2Color')
  const orbitSpeedSlider = document.getElementById('orbitSpeed') // Planet speed
  const orbitSpeedValueSpan = document.getElementById('orbitSpeedValue')
  const moonSpeedSlider = document.getElementById('moonSpeed') // Moon speed
  const moonSpeedValueSpan = document.getElementById('moonSpeedValue')
  const mainOrbitColorPicker = document.getElementById('mainOrbitColor')
  const mainOrbitThicknessSlider = document.getElementById('mainOrbitThickness')
  const mainOrbitThicknessValueSpan = document.getElementById(
    'mainOrbitThicknessValue'
  )
  const deliveryDayCheckboxes = document.querySelectorAll(
    'input[name="deliveryDay"]'
  )
  const planetActiveColorPicker = document.getElementById('planetActiveColor')
  const dayMarkColorPicker = document.getElementById('dayMarkColor')
  const radarVisibilityModeRadios = document.querySelectorAll(
    'input[name="radarVisibilityMode"]'
  )
  const radarColorPicker = document.getElementById('radarColor')
  const radarThicknessSlider = document.getElementById('radarThickness')
  const radarThicknessValueSpan = document.getElementById('radarThicknessValue')
  // NEW: Get reference to radar flow direction radios
  const radarFlowDirectionRadios = document.querySelectorAll(
    'input[name="radarFlowDirection"]'
  )
  // NEW: Get reference to radar animation speed controls
  const radarAnimationSpeedSlider = document.getElementById(
    'radarAnimationSpeed'
  )
  const radarAnimationSpeedValueSpan = document.getElementById(
    'radarAnimationSpeedValue'
  )
  // NEW: Get reference to radar sets per day controls
  const radarSetsPerDaySlider = document.getElementById('radarSetsPerDay')
  const radarSetsPerDayValueSpan = document.getElementById(
    'radarSetsPerDayValue'
  )
  // --- End Orbit Control Refs ---

  // --- ADD LOG 2 ---
  console.log('Button Element References:', {
    playStopButton: !!playStopButton, // Log true if found, false if null
    setCurrentAsModeAButton: !!setCurrentAsModeAButton,
    setCurrentAsModeBButton: !!setCurrentAsModeBButton,
    selectModeAButton: !!selectModeAButton,
    selectModeBButton: !!selectModeBButton,
    saveAllModesButton: !!saveAllModesButton,
  })

  // --- Helper functions (Keep existing) ---
  // Helper function to safely set control value and display
  const setupControl = (controlElement, value) => {
    if (!controlElement || value === undefined || value === null) return
    if (controlElement.type === 'checkbox') {
      controlElement.checked = !!value
    } else {
      controlElement.value = value
    }
  }
  // Combined slider/display setup using the value helper
  const setupSliderAndDisplay = (
    sliderElem,
    displayElem,
    value,
    precision = 1
  ) => {
    if (sliderElem) setupControl(sliderElem, value) // Use the refined setupControl
    if (displayElem) updateValueDisplay(displayElem.id, value) // Use existing display update
  }
  const setupColorControl = (picker, colorHex) => {
    // Use the refined setupControl
    setupControl(picker, colorHex)
  }
  const setupRadioControl = (radios, value) => {
    if (!radios || value === undefined) return
    const valueStr = String(value)
    radios.forEach((radio) => {
      radio.checked = radio.value === valueStr
    })
  }
  // --- End Helpers ---

  // --- Set initial values from initialParams ---
  console.log('Setting initial control values...') // Log before setting values
  const params = initialParams // Use the passed-in params

  // Energy Controls Setup (existing)
  setupRadioControl(simTypeRadios, params.simulationType)
  if (particleAmountSlider) particleAmountSlider.max = MAX_PARTICLES
  setupSliderAndDisplay(
    particleAmountSlider,
    particleAmountValue,
    params.particleAmount
  )
  setupSliderAndDisplay(
    particleSizeSlider,
    particleSizeValue,
    params.particleSize
  )
  setupSliderAndDisplay(
    particleSpeedSlider,
    particleSpeedValue,
    params.particleSpeed
  )
  setupColorControl(particleColorPicker, params.particleColorHex)
  setupColorControl(backgroundColorPicker, params.backgroundColorHex)
  setupSliderAndDisplay(
    boundaryRadiusSlider,
    boundaryRadiusValue,
    params.boundaryRadius
  )
  setupSliderAndDisplay(canvasScaleSlider, canvasScaleValue, params.canvasScale)
  setupSliderAndDisplay(
    particleForceSlider,
    particleForceValue,
    params.particleForce
  )
  setupSliderAndDisplay(
    metaballThresholdSlider,
    metaballThresholdValue,
    params.metaballThreshold
  )

  // Set initial state for Orbit Layer Toggle
  if (orbitLayerToggle) {
    // Use the orbitVisible from the final instanceParams (which reflects init success/failure)
    orbitLayerToggle.checked = params.orbitVisible
  }

  // --- NEW: Set initial values for Orbit Controls ---
  setupColorControl(sunColorPicker, params.sunColor)
  setupRadioControl(sunVisibleRadios, params.showSun)
  setupColorControl(planetColorPicker, params.planetColor)
  setupRadioControl(moon1VisibleRadios, params.showMoon1)
  setupColorControl(moon1ColorPicker, params.moon1Color)
  setupRadioControl(moon2VisibleRadios, params.showMoon2)
  setupColorControl(moon2ColorPicker, params.moon2Color)

  // Orbit Speed Slider (Planet) - Convert actual speed to slider value
  if (orbitSpeedSlider && orbitSpeedValueSpan) {
    const initialOrbitSliderValue = calculatePlanetSliderValue(
      params.orbitSpeed
    )
    setupSliderAndDisplay(
      orbitSpeedSlider,
      orbitSpeedValueSpan,
      initialOrbitSliderValue // Set slider to 1-10
    )
    // Update display span *separately* to show the actual speed
    updateValueDisplay(orbitSpeedValueSpan.id, params.orbitSpeed, 3)
  }
  // Moon Speed Slider - Convert actual speed to slider value
  if (moonSpeedSlider && moonSpeedValueSpan) {
    const initialMoonSliderValue = calculateMoonSliderValue(
      params.moonOrbitSpeed
    )
    setupSliderAndDisplay(
      moonSpeedSlider,
      moonSpeedValueSpan,
      initialMoonSliderValue // Set slider to 1-10
    )
    // Update display span *separately* to show the actual speed
    updateValueDisplay(moonSpeedValueSpan.id, params.moonOrbitSpeed, 3)
  }

  setupColorControl(mainOrbitColorPicker, params.mainOrbitColor)
  setupSliderAndDisplay(
    mainOrbitThicknessSlider,
    mainOrbitThicknessValueSpan,
    params.mainOrbitThickness
  )
  setupColorControl(radarColorPicker, params.radarColor)
  setupSliderAndDisplay(
    radarThicknessSlider,
    radarThicknessValueSpan,
    params.radarThickness
  )

  // Delivery Day Checkboxes
  if (deliveryDayCheckboxes && params.activeDeliveryDays) {
    deliveryDayCheckboxes.forEach((checkbox) => {
      const day = checkbox.value
      if (params.activeDeliveryDays.hasOwnProperty(day)) {
        checkbox.checked = params.activeDeliveryDays[day]
      }
    })
  }

  setupColorControl(planetActiveColorPicker, params.planetActiveColor)
  setupColorControl(dayMarkColorPicker, params.dayMarkColor)
  setupRadioControl(radarVisibilityModeRadios, params.radarVisibilityMode)
  // NEW: Setup radar flow direction radios
  setupRadioControl(radarFlowDirectionRadios, params.radarFlowDirection)
  // NEW: Setup radar animation speed slider
  if (radarAnimationSpeedSlider && params.radarAnimationSpeed !== undefined) {
    setupSliderAndDisplay(
      radarAnimationSpeedSlider,
      radarAnimationSpeedValueSpan,
      params.radarAnimationSpeed,
      2 // Precision
    )
  }
  // NEW: Setup radar sets per day slider
  if (radarSetsPerDaySlider && params.radarSetsPerDay !== undefined) {
    setupSliderAndDisplay(
      radarSetsPerDaySlider,
      radarSetsPerDayValueSpan,
      params.radarSetsPerDay,
      0 // Precision for integer display
    )
  }
  // --- End Orbit Controls Initial Values ---

  // --- Event listeners for LIVE controls ---
  console.log('Attaching LIVE control listeners (sliders, colors, etc.)...') // Log before listeners
  // Energy Listeners (existing)
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
  if (boundaryRadiusSlider)
    boundaryRadiusSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value)
      updateValueDisplay('boundaryRadiusValue', v)
      window.updateEnergySimulation({ boundaryRadius: v })
    })
  if (canvasScaleSlider)
    canvasScaleSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value)
      updateValueDisplay('canvasScaleValue', v)
      window.updateEnergySimulation({ canvasScale: v })
    })
  // Metaball/Repel listeners
  if (particleForceSlider)
    particleForceSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value)
      updateValueDisplay('particleForceValue', v)
      window.updateEnergySimulation({ particleForce: v })
    })
  if (metaballThresholdSlider)
    metaballThresholdSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value)
      updateValueDisplay('metaballThresholdValue', v)
      window.updateEnergySimulation({ metaballThreshold: v })
    })

  // Orbit Layer Toggle Listener (existing)
  if (orbitLayerToggle) {
    orbitLayerToggle.addEventListener('change', (e) => {
      window.updateEnergySimulation({ orbitVisible: e.target.checked })
    })
  }

  // --- NEW: Add listeners for Orbit Controls ---
  if (sunColorPicker)
    sunColorPicker.addEventListener('input', (e) =>
      updateOrbitModuleParameters({ sunColor: e.target.value })
    )
  if (sunVisibleRadios)
    sunVisibleRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          updateOrbitModuleParameters({ showSun: e.target.value === 'true' })
        }
      })
    })
  if (planetColorPicker)
    planetColorPicker.addEventListener('input', (e) =>
      updateOrbitModuleParameters({ planetColor: e.target.value })
    )
  if (moon1VisibleRadios)
    moon1VisibleRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          updateOrbitModuleParameters({ showMoon1: e.target.value === 'true' })
        }
      })
    })
  if (moon1ColorPicker)
    moon1ColorPicker.addEventListener('input', (e) =>
      updateOrbitModuleParameters({ moon1Color: e.target.value })
    )
  if (moon2VisibleRadios)
    moon2VisibleRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          updateOrbitModuleParameters({ showMoon2: e.target.value === 'true' })
        }
      })
    })
  if (moon2ColorPicker)
    moon2ColorPicker.addEventListener('input', (e) =>
      updateOrbitModuleParameters({ moon2Color: e.target.value })
    )

  // Orbit Speed Slider Listener (Planet)
  if (orbitSpeedSlider && orbitSpeedValueSpan) {
    orbitSpeedSlider.addEventListener('input', (e) => {
      const sliderValue = parseInt(e.target.value, 10)
      const newActualSpeed = calculateActualPlanetSpeed(sliderValue)
      // Update the display span FIRST
      updateValueDisplay(orbitSpeedValueSpan.id, newActualSpeed, 3)
      // Update the simulation parameter
      updateOrbitModuleParameters({ orbitSpeed: newActualSpeed })
    })
  }
  // Moon Speed Slider Listener
  if (moonSpeedSlider && moonSpeedValueSpan) {
    moonSpeedSlider.addEventListener('input', (e) => {
      const sliderValue = parseInt(e.target.value, 10)
      const newActualMoonSpeed = calculateActualMoonSpeed(sliderValue)
      // Update the display span FIRST
      updateValueDisplay(moonSpeedValueSpan.id, newActualMoonSpeed, 3)
      // Update the simulation parameter
      updateOrbitModuleParameters({ moonOrbitSpeed: newActualMoonSpeed })
    })
  }

  if (mainOrbitColorPicker)
    mainOrbitColorPicker.addEventListener('input', (e) =>
      updateOrbitModuleParameters({ mainOrbitColor: e.target.value })
    )
  if (mainOrbitThicknessSlider)
    mainOrbitThicknessSlider.addEventListener('input', (e) => {
      const thickness = parseInt(e.target.value, 10)
      updateValueDisplay(mainOrbitThicknessValueSpan.id, thickness)
      updateOrbitModuleParameters({ mainOrbitThickness: thickness })
    })
  if (radarColorPicker)
    radarColorPicker.addEventListener('input', (e) =>
      updateOrbitModuleParameters({ radarColor: e.target.value })
    )
  if (radarThicknessSlider)
    radarThicknessSlider.addEventListener('input', (e) => {
      const thickness = parseInt(e.target.value, 10)
      updateValueDisplay(radarThicknessValueSpan.id, thickness)
      updateOrbitModuleParameters({ radarThickness: thickness })
    })

  // Delivery Day Checkbox Listeners
  if (deliveryDayCheckboxes) {
    deliveryDayCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', (e) => {
        const day = e.target.value
        const isChecked = e.target.checked
        // Get the current state from activeParams (or potentially orbit module's state?)
        // For simplicity, let's modify activeParams used by getCurrentSettings
        // NOTE: This assumes activeParams is reliably reflecting the current state.
        // A potentially safer approach would be to fetch the current state from orbit.js if possible.
        const currentDays = activeParams.activeDeliveryDays || {}
        const updatedDays = {
          ...currentDays, // Copy existing days
          [day]: isChecked, // Update the changed day
        }
        // Update the orbit module
        updateOrbitModuleParameters({ activeDeliveryDays: updatedDays })
        // Also update activeParams so getCurrentSettingsFromControls reflects this change
        activeParams.activeDeliveryDays = updatedDays
      })
    })
  }

  if (planetActiveColorPicker)
    planetActiveColorPicker.addEventListener('input', (e) =>
      updateOrbitModuleParameters({ planetActiveColor: e.target.value })
    )
  if (dayMarkColorPicker)
    dayMarkColorPicker.addEventListener('input', (e) =>
      updateOrbitModuleParameters({ dayMarkColor: e.target.value })
    )
  if (radarVisibilityModeRadios)
    radarVisibilityModeRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          updateOrbitModuleParameters({ radarVisibilityMode: e.target.value })
        }
      })
    })
  // NEW: Add listener for radar flow direction
  if (radarFlowDirectionRadios) {
    radarFlowDirectionRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          updateOrbitModuleParameters({ radarFlowDirection: e.target.value })
        }
      })
    })
  }
  // NEW: Add listener for radar animation speed
  if (radarAnimationSpeedSlider) {
    radarAnimationSpeedSlider.addEventListener('input', (e) => {
      const speed = parseFloat(e.target.value)
      updateValueDisplay('radarAnimationSpeedValue', speed, 2)
      updateOrbitModuleParameters({ radarAnimationSpeed: speed })
    })
  }
  // NEW: Add listener for radar sets per day
  if (radarSetsPerDaySlider) {
    radarSetsPerDaySlider.addEventListener('input', (e) => {
      const sets = parseInt(e.target.value, 10)
      updateValueDisplay('radarSetsPerDayValue', sets, 0)
      updateOrbitModuleParameters({ radarSetsPerDay: sets })
    })
  }
  // --- End Orbit Listeners ---

  // ... rest of setupControls (Sim Type, Play/Stop, Mode buttons) ...

  console.log('Finished attaching LIVE control listeners.') // Log after listeners

  // --- ADD LOG 3 ---
  console.log('Attempting to attach BUTTON listeners...')

  // Simulation Type Change Listener (Keep existing)
  if (simTypeRadios.length > 0) {
    // ... simType listener ...
  }

  // Play/Stop Button
  if (playStopButton) {
    // Check if button exists before adding listener
    playStopButton.addEventListener('click', () => {
      const newEnabledState = !simulationRunning // Determine the new state
      simulationRunning = newEnabledState // Update energy.js state
      playStopButton.textContent = simulationRunning ? 'Stop' : 'Play'

      // --- Propagate to orbit module ---
      updateOrbitModuleParameters({ enabled: newEnabledState })
      // --- End propagation ---

      console.log(
        'Play/Stop button clicked. Simulation Running:',
        simulationRunning,
        'Orbit Enabled:',
        newEnabledState
      )
    })
  } else {
    console.warn('Play/Stop button not found, listener not attached.')
  }

  // Mode Management Buttons
  if (setCurrentAsModeAButton) {
    // Check button exists
    setCurrentAsModeAButton.addEventListener('click', () =>
      setCurrentSettingsAsMode('A')
    )
  } else {
    console.warn('Set Mode A button not found, listener not attached.')
  }

  if (setCurrentAsModeBButton) {
    // Check button exists
    setCurrentAsModeBButton.addEventListener('click', () =>
      setCurrentSettingsAsMode('B')
    )
  } else {
    console.warn('Set Mode B button not found, listener not attached.')
  }

  if (selectModeAButton) {
    // Check button exists
    selectModeAButton.addEventListener('click', () => loadModeToPreview('A'))
  } else {
    console.warn('Select Mode A button not found, listener not attached.')
  }

  if (selectModeBButton) {
    // Check button exists
    selectModeBButton.addEventListener('click', () => loadModeToPreview('B'))
  } else {
    console.warn('Select Mode B button not found, listener not attached.')
  }

  if (saveAllModesButton) {
    // Check button exists
    saveAllModesButton.addEventListener('click', saveAllModes)
  } else {
    console.warn('Save All Modes button not found, listener not attached.')
  }

  // --- ADD LOG 4 ---
  console.log('Finished attempting to attach BUTTON listeners.')
} // --- End setupControls ---

// --- Update Simulation Physics ---
function updateParticles(deltaTime) {
  // Guard clause only needs metaballMaterial now
  if (!particles || !metaballMaterial) {
    return
  }

  const currentParams = activeParams
  const speedFactor = currentParams.particleSpeed * deltaTime * 6
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
const energyClock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const deltaTime = energyClock.getDelta()

  // --- 1. Update Physics ---
  if (simulationRunning) {
    updateParticles(deltaTime)
  }
  if (isOrbitLayerVisible) {
    updateOrbitAnimation(deltaTime)
  }

  // --- 2. Render Energy Effect to Target ---
  if (renderer && scene && camera && renderTarget && metaballQuad) {
    renderer.setRenderTarget(renderTarget)
    renderer.clear() // Clear the render target
    renderer.render(scene, camera) // Render metaball shader source
  }

  // --- 3. Render Final Composition to Canvas ---
  if (renderer && finalScene && finalCamera && finalQuad) {
    renderer.setRenderTarget(null) // Switch back to canvas

    // --- Clear Canvas ---
    renderer.autoClear = true // Ensure canvas is cleared before drawing energy layer
    renderer.clear()

    // --- Render Energy Layer FIRST ---
    // (finalQuad uses the transparent renderTarget texture)
    renderer.render(finalScene, finalCamera)

    // --- Prepare for Orbit Overlay ---
    renderer.autoClear = false // Prevent clearing before drawing orbit layer

    // --- Render Orbit Layer (if visible) ON TOP ---
    if (isOrbitLayerVisible) {
      // console.log('Rendering orbit layer - visibility flag is true') // Disabled log
      renderOrbitScene(renderer) // Render orbit scene over the energy layer
    } else {
      // Add this log once to debug
      // console.log('Orbit layer not rendered - visibility flag is false') // Disabled log
    }
  }

  // --- 4. Reset autoClear for next frame ---
  if (renderer) {
    renderer.autoClear = true
  }
}

// --- Global Initialization Function (Assign to window) ---
window.initializeEnergySimulation = function (config = {}) {
  // Modes are loaded synchronously now
  // loadModes(); // Called by initializeSimulations
  init(config)
}

// --- External API (Assign to window) ---
window.updateEnergySimulation = function (newParams) {
  if (!particles || !scene || !metaballMaterial) {
    console.warn(
      '[energy.js] API update called before simulation fully initialized.'
    )
    return
  }
  if (typeof newParams !== 'object' || newParams === null) {
    console.warn(
      '[energy.js] API update called with invalid parameters:',
      newParams
    )
    return
  }

  console.log('[energy.js] API Update with:', newParams)
  let changeDetectedOverall = false
  const previousType = activeParams.simulationType
  const previousAmount = activeParams.particleAmount
  const previousParticleSize = activeParams.particleSize
  const previousOrbitSpeed = activeParams.orbitSpeed // Store previous speed

  const energyKeys = [
    'simulationType',
    'particleAmount',
    'particleSize',
    'particleSpeed',
    'particleColorHex',
    'backgroundColorHex',
    'boundaryRadius',
    'canvasSize',
    'canvasScale',
    'particleForce',
    'metaballThreshold',
    'orbitVisible',
  ]

  for (const key in newParams) {
    if (energyKeys.includes(key)) {
      const incomingValue = newParams[key]
      let processedValue = incomingValue
      if (key === 'orbitVisible') {
        const boolValue =
          typeof incomingValue === 'string'
            ? incomingValue === 'true'
            : !!incomingValue
        if (isOrbitLayerVisible !== boolValue) {
          isOrbitLayerVisible = boolValue
          console.log(
            `[energy.js] API: Set orbit layer visibility to ${isOrbitLayerVisible}`
          )
          changeDetectedOverall = true
        }
        activeParams[key] = isOrbitLayerVisible
        continue
      }
      const targetType = typeof (activeParams[key] !== undefined
        ? activeParams[key]
        : defaultParams[key])
      if (targetType === 'number') {
        processedValue = parseFloat(incomingValue)
        if (isNaN(processedValue)) {
          console.warn(
            `[energy.js] API: Invalid number format for ${key}:`,
            incomingValue,
            `Expected number. Skipping.`
          )
          continue
        }
      } else if (targetType === 'string') {
        processedValue = String(incomingValue)
      }
      if (
        activeParams[key] === undefined ||
        processedValue !== activeParams[key]
      ) {
        activeParams[key] = processedValue
        changeDetectedOverall = true
        console.log(
          `[energy.js] API: Updated activeParams.${key} to ${processedValue}`
        )
      }
    }
  }

  // Update activeParams with non-energy keys if present in newParams
  // This ensures orbitSpeed, etc., get updated in activeParams if passed directly
  for (const key in newParams) {
    if (
      defaultParams.hasOwnProperty(key) &&
      !energyKeys.includes(key) &&
      newParams.hasOwnProperty(key)
    ) {
      // Check if the value is actually different before updating
      if (activeParams[key] !== newParams[key]) {
        if (key === 'orbitSpeed') {
          const parsedSpeed = parseFloat(newParams[key])
          if (!isNaN(parsedSpeed)) {
            if (activeParams[key] !== parsedSpeed) {
              activeParams[key] = parsedSpeed
              changeDetectedOverall = true
              console.log(
                `[energy.js] API: Updated activeParams.orbitSpeed to ${activeParams[key]}`
              )
            }
          } else {
            console.warn(
              `[energy.js] API: Invalid number for orbitSpeed: ${newParams[key]}. Skipping.`
            )
          }
        } else {
          // For other non-energy keys, just assign
          activeParams[key] = newParams[key]
          changeDetectedOverall = true
          console.log(
            `[energy.js] API: Updated activeParams.${key} to ${activeParams[key]}`
          )
        }
      }
    }
  }

  activeParams.particleAmount = Math.max(
    1,
    Math.min(
      activeParams.particleAmount || defaultParams.particleAmount,
      MAX_PARTICLES
    )
  )
  const currentAmount = activeParams.particleAmount
  const sizeChanged = activeParams.particleSize !== previousParticleSize
  let needsParticleRecreation = currentAmount !== previousAmount
  let uniformsUpdated = false

  if (sizeChanged && !needsParticleRecreation) {
    console.log(
      '[energy.js] API: Particle size changed, updating sizes uniform only.'
    )
    particles.forEach((p, index) => {
      if (p && index < currentAmount) {
        p.size = activeParams.particleSize
        particleSizesUniform[index] = p.size
      } else if (index < MAX_PARTICLES) {
        particleSizesUniform[index] = 0
      }
    })
    if (metaballMaterial) {
      metaballMaterial.uniforms.particleSizes.needsUpdate = true
    }
    uniformsUpdated = true
  } else if (needsParticleRecreation) {
    console.log(
      '[energy.js] API: Recreating particles for amount change to:',
      currentAmount
    )
    particles = createParticles(activeParams)
  }

  if (activeParams.simulationType !== previousType) {
    console.log(
      '[energy.js] API: Type changed from',
      previousType,
      'to',
      activeParams.simulationType
    )
  }

  if (metaballMaterial) {
    if (
      scene.background.getHexString() !==
      activeParams.backgroundColorHex?.substring(1)
    ) {
      scene.background.set(activeParams.backgroundColorHex)
      metaballMaterial.uniforms.backgroundColor.value.set(
        activeParams.backgroundColorHex
      )
      uniformsUpdated = true
    }
    if (
      metaballMaterial.uniforms.particleColor.value.getHexString() !==
      activeParams.particleColorHex?.substring(1)
    ) {
      metaballMaterial.uniforms.particleColor.value.set(
        activeParams.particleColorHex
      )
      uniformsUpdated = true
    }
    if (metaballMaterial.uniforms.particleCount.value !== currentAmount) {
      metaballMaterial.uniforms.particleCount.value = currentAmount
      uniformsUpdated = true
    }
    if (
      metaballMaterial.uniforms.boundaryRadius.value !==
      activeParams.boundaryRadius
    ) {
      metaballMaterial.uniforms.boundaryRadius.value =
        activeParams.boundaryRadius
      uniformsUpdated = true
    }
    if (
      metaballMaterial.uniforms.threshold.value !==
      activeParams.metaballThreshold
    ) {
      metaballMaterial.uniforms.threshold.value = activeParams.metaballThreshold
      uniformsUpdated = true
    }
    if (
      metaballMaterial.uniforms.canvasScale.value !== activeParams.canvasScale
    ) {
      metaballMaterial.uniforms.canvasScale.value = activeParams.canvasScale
      uniformsUpdated = true
    }

    if (uniformsUpdated || needsParticleRecreation || sizeChanged) {
      metaballMaterial.uniforms.particlePositions.needsUpdate = true
      metaballMaterial.uniforms.particleSizes.needsUpdate = true
      console.log(
        '[energy.js] API: Flagging position/size uniforms for update.'
      )
    }
  }

  console.log('[energy.js] API: Preparing to update Orbit module.')
  const orbitParamsToUpdate = {}
  const knownOrbitKeys = [
    'enabled',
    'showSun',
    'sunColor',
    'planetColor',
    'showMoon1',
    'moon1Color',
    'showMoon2',
    'moon2Color',
    'orbitSpeed',
    'moonOrbitSpeed',
    'mainOrbitColor',
    'mainOrbitThickness',
    'radarColor',
    'radarThickness',
    'activeDeliveryDays',
    'planetActiveColor',
    'radarVisibilityMode',
    'canvasSize',
    'sunSize',
    'mainOrbitRadius',
    'dayMarkLength',
    'planetSize',
    'moonSize',
    'moonOrbitRadius',
    'numRadarLines',
    'radarMaxRadiusFactor',
    'radarMinRadius',
    'radarAnimationSpeed',
    'dayMarkColor',
    'radarFlowDirection',
    'radarSetsPerDay',
  ]

  for (const key in newParams) {
    if (knownOrbitKeys.includes(key) && newParams.hasOwnProperty(key)) {
      // Only add to orbitParamsToUpdate if the value in newParams is different
      // from what's currently in activeParams, OR if it's a direct command like 'enabled'.
      // For orbitSpeed, we want to ensure it gets passed if it's in newParams.
      if (key === 'orbitSpeed') {
        const parsedSpeed = parseFloat(newParams[key])
        if (!isNaN(parsedSpeed)) {
          orbitParamsToUpdate[key] = parsedSpeed
        }
      } else if (activeParams[key] !== newParams[key] || key === 'enabled') {
        orbitParamsToUpdate[key] = newParams[key]
      }
    }
  }

  if (Object.keys(orbitParamsToUpdate).length > 0) {
    console.log(
      '[energy.js] API: Calling updateOrbitModuleParameters with:',
      orbitParamsToUpdate
    )
    if (typeof updateOrbitModuleParameters === 'function') {
      updateOrbitModuleParameters(orbitParamsToUpdate)
    } else {
      console.error(
        '[energy.js] Error: updateOrbitModuleParameters function not imported correctly or not available!'
      )
    }
  } else {
    console.log(
      '[energy.js] API: No new orbit-specific parameters found in update call to send to orbit module.'
    )
  }

  // Update Comms Timing if orbitSpeed has effectively changed in activeParams
  if (activeParams.orbitSpeed !== previousOrbitSpeed) {
    console.log(
      `[energy.js] Orbit speed in activeParams changed. Old: ${previousOrbitSpeed}, New: ${activeParams.orbitSpeed}. Triggering comms update.`
    )
    updateCommsTimingBasedOnOrbit()
  } else if (
    newParams.hasOwnProperty('orbitSpeed') &&
    parseFloat(newParams.orbitSpeed) === activeParams.orbitSpeed &&
    activeParams.orbitSpeed === previousOrbitSpeed
  ) {
    // This case handles if orbitSpeed was in newParams but didn't change the value in activeParams
    // (e.g. setting it to the same value it already had). We still might want to update comms if it's an explicit call.
    console.log(
      `[energy.js] Orbit speed explicitly provided in newParams but value in activeParams remains ${activeParams.orbitSpeed}. Triggering comms update.`
    )
    updateCommsTimingBasedOnOrbit()
  }

  if (changeDetectedOverall) {
    console.log(
      '[energy.js] API: Applied updates. Current activeParams:',
      JSON.parse(JSON.stringify(activeParams)) // Log a copy
    )
  } else {
    console.log(
      '[energy.js] API: No relevant energy parameters changed in update call.'
    )
  }
} // --- End window.updateEnergySimulation ---

// --- Modify Initialization Logic ---
function initializeSimulations() {
  loadModes()
  window.savedModes = savedModes

  const testContainer = document.getElementById('container')
  const testCanvas = document.getElementById('simulationCanvas')
  if (testContainer && testCanvas) {
    console.log('Attempting initialization for HTML testbed (#container)')
    init({
      containerSelector: '#container',
      createCanvas: false,
    }).then(() => {
      // After the main #container init, which likely sets activeParams
      console.log(
        '[energy.js] Initializing comms timing after testbed simulation setup.'
      )
      updateCommsTimingBasedOnOrbit()
      // Start comms animation if it's not auto-started by updateCommsDotDuration
      if (typeof startCommsAnimation === 'function') {
        // startCommsAnimation(); // updateCommsDotDuration should now handle starting
      }
    })
  }

  const webflowContainers = document.querySelectorAll('.energy-container')
  if (webflowContainers.length > 0) {
    console.log(
      `Found ${webflowContainers.length} Webflow container(s) (.energy-container). Attempting initialization...`
    )
    const initPromises = []
    webflowContainers.forEach((container, index) => {
      let stableSelector = container.id ? `#${container.id}` : null
      if (!stableSelector) {
        stableSelector = `.energy-container:nth-of-type(${index + 1})`
        console.warn(
          `Webflow container lacks ID. Using potentially unstable selector: ${stableSelector}. Add a unique ID for reliability.`
        )
      }
      if (!container.dataset.setMode && !container.dataset.mode) {
        console.log(
          `Webflow container ${stableSelector} has no mode attribute, forcing Mode A`
        )
        container.dataset.setMode = 'A'
      }
      initPromises.push(
        init({
          containerSelector: stableSelector,
          createCanvas: true,
        })
      )
    })
    // If no testbed, and webflow containers exist, the first one might set activeParams
    if (!testContainer) {
      Promise.all(initPromises).then(() => {
        console.log(
          '[energy.js] Initializing comms timing after Webflow simulations setup.'
        )
        updateCommsTimingBasedOnOrbit()
        // if (typeof startCommsAnimation === 'function') {
        //    startCommsAnimation();
        // }
      })
    }
  } else if (!testContainer) {
    // If no simulations are found at all, still attempt to set a default comms timing
    console.log(
      '[energy.js] No simulation containers found. Setting default comms timing.'
    )
    updateCommsTimingBasedOnOrbit() // Will use default activeParams.orbitSpeed
    // if (typeof startCommsAnimation === 'function') {
    //   startCommsAnimation();
    // }
  }
}

// --- Execute Initialization ---
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSimulations)
} else {
  initializeSimulations()
}

// Add this helper function near the top of the file, after the imports
// Make sure there are no duplicate versions of this function in the file
function extractOrbitParams(params) {
  const orbitParams = {}
  // Copy only orbit-specific parameters
  for (const key in params) {
    // Skip energy-specific keys
    if (
      ![
        'simulationType',
        'particleAmount',
        'particleSize',
        'particleSpeed',
        'particleColorHex',
        'backgroundColorHex',
        'boundaryRadius',
        'canvasSize',
        'canvasScale',
        'particleForce',
        'metaballThreshold',
      ].includes(key)
    ) {
      orbitParams[key] = params[key]
    }
  }
  return orbitParams
}

// Add this near the end of the file, before the initialization code
window.setEnergyMode = function (modeId) {
  console.log(`Direct webflow trigger: Setting energy mode to ${modeId}`)
  loadModeToPreview(modeId)

  // Force orbit visibility to true when loaded this way
  isOrbitLayerVisible = true
  console.log(
    `Forcing orbit layer visibility to true for direct mode trigger ${modeId}`
  )
}

// Helper function to calculate and update comms duration
function updateCommsTimingBasedOnOrbit() {
  if (
    typeof getDaySegmentDurationMilliseconds === 'function' &&
    typeof updateCommsDotDuration === 'function'
  ) {
    const currentOrbitSpeed = activeParams.orbitSpeed // This should be the actual orbit speed value
    if (typeof currentOrbitSpeed === 'number') {
      const newDotDuration =
        getDaySegmentDurationMilliseconds(currentOrbitSpeed)
      if (isFinite(newDotDuration) && newDotDuration > 0) {
        console.log(
          `[energy.js] Calculated new dot duration for comms: ${newDotDuration}ms based on orbitSpeed: ${currentOrbitSpeed}`
        )
        updateCommsDotDuration(newDotDuration)
      } else {
        console.warn(
          `[energy.js] Invalid newDotDuration calculated: ${newDotDuration} (orbitSpeed: ${currentOrbitSpeed}). Signaling comms to pause/stop.`
        )
        updateCommsDotDuration(null) // Signal comms to pause or use a very long duration
      }
    } else {
      console.warn(
        '[energy.js] activeParams.orbitSpeed is not a number, cannot update comms timing.'
      )
    }
  } else {
    console.warn(
      '[energy.js] Missing getDaySegmentDurationMilliseconds or updateCommsDotDuration function.'
    )
  }
}
