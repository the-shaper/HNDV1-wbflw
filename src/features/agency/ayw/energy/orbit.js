import * as THREE from 'three'
// --- Import MeshLine using named imports as per documentation ---
import { MeshLine, MeshLineMaterial } from 'three.meshline'
import modesDataFromFile from './energyModes.json'

let orbitScene,
  orbitCamera,
  orbitRenderer,
  orbitContainer,
  orbitCanvas,
  radarLineMaterialRef // Keep radar material reference accessible
let isStandaloneMode = false // Track mode
let internalAnimationLoopId = null // ID for standalone animation loop
const clock = new THREE.Clock() // Central clock for delta time

const PHI = 1.618 // Golden Ratio
const TRANSITION_ANGLE = Math.PI / 36 // Angle for fade transition (5 degrees)

// --- Add missing constants definitions here ---
const dayNames = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]
const daySegmentAngle = (Math.PI * 2) / 6 // Angle per day segment (60 degrees)
// --- End of added constants ---

// Base speed for PLANET exponential calculation
const defaultPlanetActualSpeed = 0.1
const planetSpeedBase = defaultPlanetActualSpeed / Math.pow(PHI, 5 - 1) // Slider 5 -> 0.1

// Base speed for MOON exponential calculation
const defaultMoonActualSpeed = 0.4 // Faster default for moons
const moonSpeedBase = defaultMoonActualSpeed / Math.pow(PHI, 5 - 1) // Slider 5 -> 0.4

// --- Module-level defaults ---
// Keep these as a reference, but the function will prioritize passed params
const defaultInternalOrbitParams = {
  enabled: true,
  showSun: true,
  sunColor: 0xf6ff47,
  planetColor: 0x607d8b,
  showMoon1: true,
  moon1Color: 0xff3d23,
  showMoon2: true,
  moon2Color: 0x0189d7,
  orbitSpeed: defaultPlanetActualSpeed,
  moonOrbitSpeed: defaultMoonActualSpeed,
  mainOrbitColor: 0xd1e7de,
  mainOrbitThickness: 6,
  radarColor: 0xa0a0a0,
  radarThickness: 1,
  activeDeliveryDays: {
    /* Default days */
  },
  planetActiveColor: 0xeeff00,
  radarVisibilityMode: 'activeDays',
  canvasSize: 800,
  sunSize: 0.5,
  mainOrbitRadius: 1.8,
  dayMarkLength: 0.15,
  planetSize: 0.5 / PHI,
  moonSize: 0.5 / PHI / PHI,
  moonOrbitRadius: (0.5 / PHI) * 1.5,
  numRadarLines: 3,
  radarMaxRadiusFactor: 1,
  radarMinRadius: 0.3,
  radarAnimationSpeed: 0.6,
  dayMarkColor: 0xd1e7de,
  radarFlowDirection: 'inward', // Changed from 'outward' to match energy.js default
  radarSetsPerDay: 1, // New parameter: How many sets of waves per day
}
// Remove the module-level mutable orbitParams
// let orbitParams = { ...defaultInternalOrbitParams }; // REMOVE THIS

// --- Module-level variables for interpolation ---
let basePlanetColorObject = new THREE.Color()
let activePlanetColorObject = new THREE.Color()

// --- NEW: Module-level state for "Sets per Day" logic ---
let currentSimulatedDayIndex = -1 // Tracks the current day (0-5) for 'always' mode's per-day count
let setsFiredForContinuousLoop = 0 // Counter for sets triggered in the current day - FOR 'always' mode
let setsFiredInActiveDayBurst = 0 // Counter for sets fired in the current 'activeDays' burst
let activeDayBurstInitiated = false // Has a burst been started for the current active day period?
let allLinesPreviouslyCompleted = true // Helper to detect when a set *just* finished.

// --- NEW: Function to reset planet position and related animation states ---
function resetOrbitalState() {
  if (!orbitScene) {
    console.warn('[orbit.js resetOrbitalState] orbitScene not available.')
    return
  }

  const planetPivot = orbitScene.getObjectByName('planetPivot')
  if (planetPivot) {
    planetPivot.rotation.z = 0 // Reset to 12 o'clock position
    console.log(
      '[orbit.js resetOrbitalState] Planet pivot rotation reset to 0.'
    )
  } else {
    console.warn('[orbit.js resetOrbitalState] Planet pivot not found.')
  }

  // Reset day and radar animation counters
  currentSimulatedDayIndex = -1
  setsFiredForContinuousLoop = 0
  setsFiredInActiveDayBurst = 0
  activeDayBurstInitiated = false
  allLinesPreviouslyCompleted = true
  console.log(
    '[orbit.js resetOrbitalState] Day/radar animation counters reset.'
  )

  // Reset radar lines to their initial states based on current defaultInternalOrbitParams
  const radarGroup = orbitScene.getObjectByName('radarSignalGroup')
  if (radarGroup && radarGroup.userData.lines && defaultInternalOrbitParams) {
    const lines = radarGroup.userData.lines
    const {
      radarMinRadius: minScale,
      mainOrbitRadius,
      radarMaxRadiusFactor,
      radarFlowDirection: flowDirection,
      numRadarLines, // numRadarLines is an instanceParam, ensure it's in defaultInternalOrbitParams
    } = defaultInternalOrbitParams

    const maxScale = mainOrbitRadius * radarMaxRadiusFactor
    const radiusRange = maxScale - minScale
    const setSpreadFactor = 0.5 // Consistent with animation logic

    lines.forEach((lineMesh, i) => {
      let resetScale
      if (flowDirection === 'inward') {
        resetScale =
          maxScale -
          (i / Math.max(1, numRadarLines - 1)) * (radiusRange * setSpreadFactor)
        resetScale = Math.max(minScale, resetScale)
      } else {
        // 'outward'
        resetScale =
          minScale +
          (i / Math.max(1, numRadarLines - 1)) * (radiusRange * setSpreadFactor)
        resetScale = Math.min(maxScale, resetScale)
      }
      if (numRadarLines === 1) {
        resetScale = flowDirection === 'inward' ? maxScale : minScale
      }

      lineMesh.scale.set(resetScale, resetScale, 1)
      lineMesh.userData.hasCompletedCycle = false
      // Visibility will be handled by the animation loop based on radarVisibilityMode
      // However, if radarVisibilityMode is 'always', ensure they are visible.
      if (defaultInternalOrbitParams.radarVisibilityMode === 'always') {
        lineMesh.visible = true
      } else {
        // For 'activeDays', visibility depends on lerpFactor, let animation loop handle.
        // For safety, ensure they are not stuck visible if they shouldn't be.
        // This might be complex, the animation loop should correctly set visibility.
        // For now, let's assume the animation loop will correctly set visibility on the next frame.
      }
    })
    console.log('[orbit.js resetOrbitalState] Radar lines reset.')
  }
}
// --- END NEW FUNCTION ---

// Helper to update value display spans (moved from HTML)
function updateValueDisplay(spanId, value, precision = 3) {
  const display = document.getElementById(spanId)
  if (display && value !== undefined && value !== null) {
    const num = parseFloat(value)
    if (!isNaN(num)) {
      display.textContent = num.toFixed(precision) // Use precision
    } else {
      display.textContent = value
    }
  } else if (display) {
    display.textContent = '?'
  }
}

// NEW: Function to setup UI controls
function setupOrbitControls(initialParams) {
  const controlsContainer = document.getElementById('controls')
  if (!controlsContainer) {
    console.warn('Orbit Controls: Controls container not found.')
    return // Exit if controls don't exist
  }

  // --- Get references to controls ---
  const sunColorPicker = document.getElementById('sunColor')
  const sunVisibleRadios = document.querySelectorAll('input[name="sunVisible"]') // New radio buttons
  const planetColorPicker = document.getElementById('planetColor')
  const moon1VisibleRadios = document.querySelectorAll(
    'input[name="moon1Visible"]'
  )
  const moon1ColorPicker = document.getElementById('moon1Color')
  const moon2VisibleRadios = document.querySelectorAll(
    'input[name="moon2Visible"]'
  )
  const moon2ColorPicker = document.getElementById('moon2Color')
  const orbitSpeedSlider = document.getElementById('orbitSpeed')
  const orbitSpeedValueSpan = document.getElementById('orbitSpeedValue') // Reference the span directly
  const moonSpeedSlider = document.getElementById('moonSpeed')
  const moonSpeedValueSpan = document.getElementById('moonSpeedValue')
  const playStopButton = document.getElementById('playStopButton')
  // NEW Line Control Refs
  const mainOrbitColorPicker = document.getElementById('mainOrbitColor')
  const mainOrbitThicknessSlider = document.getElementById('mainOrbitThickness')
  const mainOrbitThicknessValueSpan = document.getElementById(
    'mainOrbitThicknessValue'
  )
  const radarColorPicker = document.getElementById('radarColor')
  const radarThicknessSlider = document.getElementById('radarThickness')
  const radarThicknessValueSpan = document.getElementById('radarThicknessValue')
  // NEW: Delivery Day Controls Refs
  const deliveryDayCheckboxes = document.querySelectorAll(
    'input[name="deliveryDay"]'
  )
  const planetActiveColorPicker = document.getElementById('planetActiveColor')
  // NEW: Radar Visibility Mode Refs
  const radarVisibilityModeRadios = document.querySelectorAll(
    'input[name="radarVisibilityMode"]'
  )
  const dayMarkColorPicker = document.getElementById('dayMarkColor')
  // NEW: Radar Flow Direction Refs
  const radarFlowDirectionRadios = document.querySelectorAll(
    'input[name="radarFlowDirection"]'
  )
  // NEW: Radar Animation Speed Control Refs
  const radarAnimationSpeedSlider = document.getElementById(
    'radarAnimationSpeed'
  )
  const radarAnimationSpeedValueSpan = document.getElementById(
    'radarAnimationSpeedValue'
  )

  // --- MOVED Helpers Definition Up ---
  const setupRadioControl = (radios, value) => {
    if (!radios) return
    const valueStr = String(value)
    radios.forEach((radio) => {
      radio.checked = radio.value === valueStr
    })
  }
  const setupColorControl = (picker, colorHex) => {
    if (picker && colorHex !== undefined) {
      picker.value = '#' + new THREE.Color(colorHex).getHexString()
    }
  }
  // NEW: Generic Slider Setup Helper
  const setupSlider = (slider, valueSpanId, value, precision = 0) => {
    if (slider && value !== undefined) slider.value = value
    // Thickness sliders now map 1:1, so use precision 0 for display
    const displayPrecision = valueSpanId?.includes('ThicknessValue')
      ? 0
      : precision
    if (valueSpanId) updateValueDisplay(valueSpanId, value, displayPrecision)
  }

  // --- Set initial values from initialParams ---
  setupColorControl(sunColorPicker, initialParams.sunColor)
  setupRadioControl(sunVisibleRadios, initialParams.showSun) // New sun visibility
  setupColorControl(planetColorPicker, initialParams.planetColor)
  setupRadioControl(moon1VisibleRadios, initialParams.showMoon1)
  setupColorControl(moon1ColorPicker, initialParams.moon1Color)
  setupRadioControl(moon2VisibleRadios, initialParams.showMoon2)
  setupColorControl(moon2ColorPicker, initialParams.moon2Color)

  // Setup Planet Speed Slider (using generic helper now)
  if (orbitSpeedSlider && orbitSpeedValueSpan) {
    const initialSliderValue = calculatePlanetSliderValue(
      initialParams.orbitSpeed
    )
    setupSlider(orbitSpeedSlider, null, initialSliderValue) // Call setupSlider
    updateValueDisplay('orbitSpeedValue', initialParams.orbitSpeed, 3)
  }
  // Setup Moon Speed Slider (using generic helper)
  if (moonSpeedSlider && moonSpeedValueSpan) {
    const initialMoonSliderValue = calculateMoonSliderValue(
      initialParams.moonOrbitSpeed
    )
    setupSlider(moonSpeedSlider, null, initialMoonSliderValue) // Call setupSlider
    updateValueDisplay('moonSpeedValue', initialParams.moonOrbitSpeed, 3)
  }
  // NEW: Setup Line Controls
  setupColorControl(mainOrbitColorPicker, initialParams.mainOrbitColor)
  setupSlider(
    mainOrbitThicknessSlider,
    'mainOrbitThicknessValue',
    initialParams.mainOrbitThickness,
    0 // Display as integer
  )
  setupColorControl(radarColorPicker, initialParams.radarColor)
  setupSlider(
    radarThicknessSlider,
    'radarThicknessValue',
    initialParams.radarThickness,
    0 // Display as integer
  )

  // NEW: Setup Radar Visibility Mode
  setupRadioControl(
    radarVisibilityModeRadios,
    initialParams.radarVisibilityMode
  )
  // NEW: Setup Radar Flow Direction
  setupRadioControl(radarFlowDirectionRadios, initialParams.radarFlowDirection)
  // NEW: Setup Delivery Day Controls
  if (deliveryDayCheckboxes) {
    deliveryDayCheckboxes.forEach((checkbox) => {
      const day = checkbox.value
      if (
        initialParams.activeDeliveryDays &&
        initialParams.activeDeliveryDays.hasOwnProperty(day)
      ) {
        checkbox.checked = initialParams.activeDeliveryDays[day]
      }
    })
  }
  setupColorControl(planetActiveColorPicker, initialParams.planetActiveColor)
  setupColorControl(dayMarkColorPicker, initialParams.dayMarkColor)

  // NEW: Setup Radar Animation Speed Slider
  if (
    radarAnimationSpeedSlider &&
    initialParams.radarAnimationSpeed !== undefined
  ) {
    setupSlider(
      radarAnimationSpeedSlider,
      'radarAnimationSpeedValue',
      initialParams.radarAnimationSpeed,
      2 // Precision for display
    )
  }

  if (playStopButton) {
    console.log('Play/Stop button found, attaching event listener.')
    playStopButton.textContent = initialParams.enabled ? 'Stop' : 'Play' // Uses initialParams for initial setup
    playStopButton.addEventListener('click', () => {
      // Read current state from defaultInternalOrbitParams
      const currentEnabledState = defaultInternalOrbitParams.enabled
      const newEnabledState = !currentEnabledState
      console.log(
        'Play/Stop button clicked. Current state was:',
        currentEnabledState,
        'New state:',
        newEnabledState
      )
      playStopButton.textContent = newEnabledState ? 'Stop' : 'Play'
      updateOrbitParameters({ enabled: newEnabledState })
    })
  } else {
    console.error('Play/Stop button not found!')
  }

  // --- Event Listeners ---
  if (sunColorPicker)
    sunColorPicker.addEventListener('input', (e) => {
      updateOrbitParameters({ sunColor: e.target.value })
    })

  if (sunVisibleRadios)
    sunVisibleRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          updateOrbitParameters({ showSun: e.target.value === 'true' })
        }
      })
    })

  if (planetColorPicker)
    planetColorPicker.addEventListener('input', (e) => {
      updateOrbitParameters({ planetColor: e.target.value })
    })

  if (moon1VisibleRadios)
    moon1VisibleRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          updateOrbitParameters({ showMoon1: e.target.value === 'true' })
        }
      })
    })

  if (moon1ColorPicker)
    moon1ColorPicker.addEventListener('input', (e) => {
      updateOrbitParameters({ moon1Color: e.target.value })
    })

  if (moon2VisibleRadios)
    moon2VisibleRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          updateOrbitParameters({ showMoon2: e.target.value === 'true' })
        }
      })
    })

  if (moon2ColorPicker)
    moon2ColorPicker.addEventListener('input', (e) => {
      updateOrbitParameters({ moon2Color: e.target.value })
    })

  // Update Speed Slider Listener
  if (orbitSpeedSlider && orbitSpeedValueSpan) {
    orbitSpeedSlider.addEventListener('input', (e) => {
      const sliderValue = parseInt(e.target.value, 10) // Get slider value (1-10)
      const newActualSpeed = calculateActualPlanetSpeed(sliderValue) // Calculate corresponding actual speed

      // Update the display span with the actual speed
      updateValueDisplay('orbitSpeedValue', newActualSpeed, 3) // Use precision

      // Update the simulation parameter with the actual speed
      updateOrbitParameters({ orbitSpeed: newActualSpeed })
    })
  }

  // NEW: Update Moon Speed Slider Listener
  if (moonSpeedSlider && moonSpeedValueSpan) {
    moonSpeedSlider.addEventListener('input', (e) => {
      const sliderValue = parseInt(e.target.value, 10)
      const newActualMoonSpeed = calculateActualMoonSpeed(sliderValue)
      updateValueDisplay('moonSpeedValue', newActualMoonSpeed, 3) // Use precision
      updateOrbitParameters({ moonOrbitSpeed: newActualMoonSpeed })
    })
  }

  // NEW: Line Control Listeners
  if (mainOrbitColorPicker) {
    mainOrbitColorPicker.addEventListener('input', (e) => {
      updateOrbitParameters({ mainOrbitColor: e.target.value })
    })
  }
  if (mainOrbitThicknessSlider) {
    mainOrbitThicknessSlider.addEventListener('input', (e) => {
      const thickness = parseInt(e.target.value, 10) // Gets integer 1-6
      updateValueDisplay('mainOrbitThicknessValue', thickness, 0) // Display as integer
      updateOrbitParameters({ mainOrbitThickness: thickness }) // Pass 1-6 to update function
    })
  }
  if (radarColorPicker) {
    radarColorPicker.addEventListener('input', (e) => {
      updateOrbitParameters({ radarColor: e.target.value })
    })
  }
  if (radarThicknessSlider) {
    radarThicknessSlider.addEventListener('input', (e) => {
      const thickness = parseInt(e.target.value, 10) // Use parseInt for 1-5
      updateValueDisplay('radarThicknessValue', thickness, 0) // Display as integer
      updateOrbitParameters({ radarThickness: thickness })
    })
  }

  // NEW: Delivery Day Listeners
  if (deliveryDayCheckboxes) {
    deliveryDayCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', (e) => {
        const day = e.target.value
        const isChecked = e.target.checked
        // Read current activeDeliveryDays from defaultInternalOrbitParams
        const currentActiveDays = defaultInternalOrbitParams.activeDeliveryDays
        const update = {
          activeDeliveryDays: {
            // Ensure currentActiveDays is an object before spreading
            ...(typeof currentActiveDays === 'object' &&
            currentActiveDays !== null
              ? currentActiveDays
              : {}),
            [day]: isChecked,
          },
        }
        updateOrbitParameters(update)
      })
    })
  }

  if (planetActiveColorPicker) {
    planetActiveColorPicker.addEventListener('input', (e) => {
      updateOrbitParameters({ planetActiveColor: e.target.value })
    })
  }

  // NEW: Radar Visibility Mode Listener
  if (radarVisibilityModeRadios) {
    radarVisibilityModeRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          updateOrbitParameters({ radarVisibilityMode: e.target.value }) // 'always' or 'activeDays'
        }
      })
    })
  }

  if (dayMarkColorPicker)
    dayMarkColorPicker.addEventListener('input', (e) => {
      updateOrbitParameters({ dayMarkColor: e.target.value })
    })

  // NEW: Radar Flow Direction Listener
  if (radarFlowDirectionRadios) {
    radarFlowDirectionRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          // Add a log to confirm this listener fires and what value it's sending
          console.log(
            '[orbit.js setupOrbitControls] Radar flow changed to:',
            e.target.value
          )
          updateOrbitParameters({ radarFlowDirection: e.target.value }) // 'inward' or 'outward'
        }
      })
    })
  }

  // NEW: Radar Animation Speed Listener
  if (radarAnimationSpeedSlider) {
    radarAnimationSpeedSlider.addEventListener('input', (e) => {
      const speed = parseFloat(e.target.value)
      updateValueDisplay('radarAnimationSpeedValue', speed, 2)
      updateOrbitParameters({ radarAnimationSpeed: speed })
    })
  }
}

// After the defaultInternalOrbitParams definition, add:
let savedModes = {}

// Add a function to load modes (similar to energy.js)
function loadOrbitModes() {
  try {
    savedModes = modesDataFromFile
    console.log('Orbit: Successfully loaded modes:', savedModes)

    // Optional: ensure all required orbit parameters exist
    const ensureOrbitDefaults = (modeKey) => {
      if (!savedModes[modeKey]) return

      // Add any missing parameters from defaults
      for (const key in defaultInternalOrbitParams) {
        if (savedModes[modeKey][key] === undefined) {
          savedModes[modeKey][key] = defaultInternalOrbitParams[key]
        }
      }
    }

    ensureOrbitDefaults('A')
    ensureOrbitDefaults('B')
  } catch (error) {
    console.error('Orbit: Failed to process imported energyModes.json:', error)
  }
}

// Call this function early
loadOrbitModes()

// Modify initializeOrbit to accept an optional modeId
function initializeOrbit(options = {}, initialParams = null, modeId = null) {
  // If modeId is provided, use parameters from that mode
  if (modeId && savedModes[modeId]) {
    initialParams = extractOrbitParamsFromMode(savedModes[modeId])
    console.log(`Orbit: Using parameters from mode ${modeId}`)
  }

  // --- Cleanup previous instance if exists ---
  if (internalAnimationLoopId) {
    cancelAnimationFrame(internalAnimationLoopId)
    internalAnimationLoopId = null
  }
  if (orbitCanvas && orbitContainer && orbitContainer.contains(orbitCanvas)) {
    orbitContainer.removeChild(orbitCanvas)
  }
  // Clear listeners? Depends on how robust re-initialization needs to be.
  // window.removeEventListener('resize', onWindowResize, false);

  // --- Determine Parameters for THIS instance ---
  // Start with internal defaults, then merge initialParams if provided
  let instanceParams = JSON.parse(JSON.stringify(defaultInternalOrbitParams)) // Deep clone defaults

  if (initialParams && typeof initialParams === 'object') {
    console.log('initializeOrbit received initialParams:', initialParams)
    // Merge provided params OVER the cloned defaults for this instance
    const mergeDeep = (target, source) => {
      for (const key in source) {
        if (source.hasOwnProperty(key)) {
          const targetValue = target[key]
          const sourceValue = source[key]

          if (
            sourceValue &&
            typeof sourceValue === 'object' &&
            !Array.isArray(sourceValue) && // Ensure it's not an array
            targetValue &&
            typeof targetValue === 'object' &&
            !Array.isArray(targetValue)
          ) {
            // Deep merge for nested objects
            mergeDeep(targetValue, sourceValue)
          } else if (sourceValue !== undefined) {
            // Assign non-object values or replace if target is not an object
            target[key] = sourceValue
          }
        }
      }
    }
    mergeDeep(instanceParams, initialParams)
    console.log(
      'instanceParams after merge in initializeOrbit:',
      instanceParams
    )
  } else {
    console.log(
      'initializeOrbit using internal defaults as initialParams was null.'
    )
  }
  // --- End Parameter Determination ---
  console.log(
    'Final instanceParams for initialization:',
    JSON.stringify(instanceParams)
  ) // Log the whole thing
  // Add this specific log:
  console.log(
    '[initializeOrbit] instanceParams.activeDeliveryDays BEFORE update:',
    JSON.stringify(instanceParams.activeDeliveryDays)
  )

  // --- NEW: Synchronize shared state for the animation loop ---
  updateOrbitParameters(instanceParams)
  // --- End NEW ---

  // Add this log AFTER the update call:
  console.log(
    '[initializeOrbit] defaultInternalOrbitParams.activeDeliveryDays AFTER update:',
    JSON.stringify(defaultInternalOrbitParams.activeDeliveryDays)
  )

  // --- Setup Scene and Camera ---
  orbitScene = new THREE.Scene()
  // Use OrthographicCamera for a 2D look
  const aspect = 1 // Assuming square canvas
  const frustumSize = 5 // Adjust this to control zoom level relative to object sizes
  orbitCamera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    100
  )
  orbitCamera.position.z = 10 // Look down the Z axis

  // --- Determine Mode and Setup Renderer/Canvas ---
  if (options.targetContainer) {
    // --- Standalone Mode ---
    isStandaloneMode = true
    orbitContainer = options.targetContainer
    orbitCanvas = document.createElement('canvas')
    orbitCanvas.classList.add('orbit-simulation-canvas')
    orbitContainer.appendChild(orbitCanvas)
    setupCanvasCSS(orbitContainer, orbitCanvas) // Apply CSS

    orbitRenderer = new THREE.WebGLRenderer({
      canvas: orbitCanvas,
      antialias: true,
      alpha: true,
    })
    orbitRenderer.setSize(
      instanceParams.canvasSize,
      instanceParams.canvasSize,
      false
    )
    orbitRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    orbitRenderer.setClearColor(0x000000, 0) // Transparent background

    console.log('Orbit Initialized: Standalone Mode')
  } else if (options.existingRenderer) {
    // --- Integration Mode ---
    isStandaloneMode = false
    orbitRenderer = options.existingRenderer // Use the provided renderer
    orbitContainer = null
    orbitCanvas = null
    console.log('Orbit Initialized: Integration Mode')
  } else {
    console.error(
      'Orbit Initialization Error: Must provide targetContainer (standalone) or existingRenderer (integration).'
    )
    return // Stop initialization
  }

  // --- Create Scene Elements (Common to both modes) ---
  // These will now use the potentially updated orbitParams from the merge above
  // Material definitions (reusable)

  // Log values used for Sun Material
  console.log(
    `[Orbit Init Setup] Using instanceParams.sunColor: ${new THREE.Color(
      instanceParams.sunColor
    ).getHexString()}, showSun: ${instanceParams.showSun}`
  )
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: instanceParams.sunColor, // Use instanceParams
    depthTest: true,
    depthWrite: true,
  })

  // Log values used for Planet Material
  console.log(
    `[Orbit Init Setup] Using instanceParams.planetColor: ${new THREE.Color(
      instanceParams.planetColor
    ).getHexString()}`
  )
  const planetMaterial = new THREE.MeshBasicMaterial({
    color: instanceParams.planetColor, // Use instanceParams
    depthTest: true,
    depthWrite: true,
  })

  // Log values used for Moon1 Material
  console.log(
    `[Orbit Init Setup] Using instanceParams.moon1Color: ${new THREE.Color(
      instanceParams.moon1Color
    ).getHexString()}, showMoon1: ${instanceParams.showMoon1}`
  )
  const moon1Material = new THREE.MeshBasicMaterial({
    color: instanceParams.moon1Color, // Use instanceParams
    depthTest: true,
    depthWrite: true,
  })

  // Log values used for Moon2 Material
  console.log(
    `[Orbit Init Setup] Using instanceParams.moon2Color: ${new THREE.Color(
      instanceParams.moon2Color
    ).getHexString()}, showMoon2: ${instanceParams.showMoon2}`
  )
  const moon2Material = new THREE.MeshBasicMaterial({
    color: instanceParams.moon2Color, // Use instanceParams
    depthTest: true,
    depthWrite: true,
  })

  // Log values used for Orbit Line Material
  console.log(
    `[Orbit Init Setup] Using instanceParams.mainOrbitColor: ${new THREE.Color(
      instanceParams.mainOrbitColor
    ).getHexString()}, mainOrbitThickness: ${instanceParams.mainOrbitThickness}`
  )
  const orbitLineMaterial = new MeshLineMaterial({
    color: instanceParams.mainOrbitColor, // Use instanceParams
    lineWidth: instanceParams.mainOrbitThickness, // Use instanceParams
    resolution: new THREE.Vector2(
      instanceParams.canvasSize,
      instanceParams.canvasSize
    ),
    sizeAttenuation: 0,
    transparent: false,
    depthTest: true,
    depthWrite: true,
  })

  // Log values used for Radar Line Material
  console.log(
    `[Orbit Init Setup] Using instanceParams.radarColor: ${new THREE.Color(
      instanceParams.radarColor
    ).getHexString()}, radarThickness: ${instanceParams.radarThickness}`
  )
  radarLineMaterialRef = new MeshLineMaterial({
    color: instanceParams.radarColor, // Use instanceParams
    lineWidth: instanceParams.radarThickness, // Use instanceParams
    resolution: new THREE.Vector2(
      instanceParams.canvasSize,
      instanceParams.canvasSize
    ),
    sizeAttenuation: 0,
    transparent: false,
    opacity: 1.0,
    depthTest: true,
    depthWrite: true,
  })

  // Log values used for Day Mark Material (inside the loop)
  // Add this log inside the day mark creation loop (around line 564)
  // console.log(`[Orbit Init Setup] Day Mark ${i} using instanceParams.dayMarkColor: ${new THREE.Color(instanceParams.dayMarkColor).getHexString()}`);
  // For simplicity, let's log it once before the loop
  console.log(
    `[Orbit Init Setup] Using instanceParams.dayMarkColor for day marks: ${new THREE.Color(
      instanceParams.dayMarkColor
    ).getHexString()}`
  )

  // Log speeds being used
  console.log(
    `[Orbit Init Setup] Using instanceParams.orbitSpeed: ${instanceParams.orbitSpeed}`
  )
  console.log(
    `[Orbit Init Setup] Using instanceParams.moonOrbitSpeed: ${instanceParams.moonOrbitSpeed}`
  )

  // Geometry definitions (reusable)
  const circleGeometry = (radius) => new THREE.CircleGeometry(radius, 32)
  const dayMarkWidth = 0.03
  const dayMarkHeight = 0.22
  const dayMarkGeometry = new THREE.PlaneGeometry(dayMarkWidth, dayMarkHeight)

  // Radar Base Geometry
  const radarBasePoints = []
  const radarDivisions = 64
  for (let i = 0; i <= radarDivisions; i++) {
    const angle = (i / radarDivisions) * Math.PI * 2
    radarBasePoints.push(Math.cos(angle), Math.sin(angle), 0)
  }
  const radarBaseLineGeometry = new MeshLine()
  radarBaseLineGeometry.setPoints(radarBasePoints, (p) => 1)

  // 1. Sun
  const sun = new THREE.Mesh(
    circleGeometry(instanceParams.sunSize / 2), // Use instanceParams
    sunMaterial
  )
  sun.name = 'sun'
  sun.position.z = 2
  sun.visible = instanceParams.showSun // Use instanceParams
  orbitScene.add(sun)

  // 2. Main Orbit Path
  const orbitPoints = []
  const divisions = 64
  for (let i = 0; i <= divisions; i++) {
    const angle = (i / divisions) * Math.PI * 2
    orbitPoints.push(
      Math.cos(angle) * instanceParams.mainOrbitRadius, // Use instanceParams
      Math.sin(angle) * instanceParams.mainOrbitRadius, // Use instanceParams
      0
    )
  }
  const mainOrbitLineGeometry = new MeshLine()
  mainOrbitLineGeometry.setPoints(orbitPoints, (p) => 1)
  const mainOrbitPath = new THREE.Mesh(mainOrbitLineGeometry, orbitLineMaterial)
  mainOrbitPath.name = 'mainOrbitPath'
  mainOrbitPath.position.z = 1
  orbitScene.add(mainOrbitPath)

  // 3. Day Marks
  const numDayMarks = 6
  const dayMarksGroup = new THREE.Group()
  dayMarksGroup.name = 'dayMarksGroup'
  orbitScene.add(dayMarksGroup)
  const dayMarkRotationOffset = Math.PI / 2
  for (let i = 0; i < numDayMarks; i++) {
    const angle = (i / numDayMarks) * Math.PI * 2 + dayMarkRotationOffset
    const positionRadius =
      instanceParams.mainOrbitRadius + dayMarkHeight / 2 - 0.08
    // Create material inside the loop to use the updated dayMarkColor
    const dayMarkMaterial = new THREE.MeshBasicMaterial({
      color: instanceParams.dayMarkColor, // Use instanceParams
      depthTest: true,
      depthWrite: true,
    })
    const dayMark = new THREE.Mesh(dayMarkGeometry, dayMarkMaterial)
    dayMark.position.x = Math.cos(angle) * positionRadius
    dayMark.position.y = Math.sin(angle) * positionRadius
    dayMark.position.z = 1
    dayMark.rotation.z = angle + Math.PI / 2
    dayMarksGroup.add(dayMark)
  }

  // 4. Planet Pivot
  const planetPivot = new THREE.Object3D()
  planetPivot.name = 'planetPivot'
  orbitScene.add(planetPivot)

  // 5. Planet
  const planet = new THREE.Mesh(
    circleGeometry(instanceParams.planetSize / 2), // Use instanceParams
    planetMaterial
  )
  planet.name = 'planet'
  planet.position.y = instanceParams.mainOrbitRadius // Use instanceParams
  planet.position.z = 2
  planetPivot.add(planet)

  // 6. Moon 1 Pivot & Mesh
  const moon1Pivot = new THREE.Object3D()
  moon1Pivot.name = 'moon1Pivot'
  planet.add(moon1Pivot)
  const moon1 = new THREE.Mesh(
    circleGeometry(instanceParams.moonSize / 2), // Use instanceParams
    moon1Material // Use instanceParams
  )
  moon1.name = 'moon1'
  moon1.position.x = instanceParams.moonOrbitRadius // Use instanceParams
  moon1.position.z = 2
  moon1.visible = instanceParams.showMoon1 // Use instanceParams
  moon1Pivot.add(moon1)

  // 7. Moon 2 Pivot & Mesh
  const moon2Pivot = new THREE.Object3D()
  moon2Pivot.name = 'moon2Pivot'
  moon2Pivot.rotation.z = Math.PI
  planet.add(moon2Pivot)
  const moon2 = new THREE.Mesh(
    circleGeometry(instanceParams.moonSize / 2), // Use instanceParams
    moon2Material // Use instanceParams
  )
  moon2.name = 'moon2'
  moon2.position.x = instanceParams.moonOrbitRadius // Use instanceParams
  moon2.position.z = 2
  moon2.visible = instanceParams.showMoon2 // Use instanceParams
  moon2Pivot.add(moon2)

  // 8. Radar Signal Group
  const radarSignalGroup = new THREE.Group()
  radarSignalGroup.name = 'radarSignalGroup'
  // Set initial visibility based on the potentially updated mode
  radarSignalGroup.visible = instanceParams.radarVisibilityMode === 'always' // Use instanceParams
  orbitScene.add(radarSignalGroup)

  const radarLines = []
  const radarMaxRadius =
    instanceParams.mainOrbitRadius * instanceParams.radarMaxRadiusFactor // Use instanceParams
  const radarMinRadiusUsed = instanceParams.radarMinRadius // Use instanceParams for consistency
  const radiusRange = radarMaxRadius - radarMinRadiusUsed
  const numLinesInSet = instanceParams.numRadarLines // Should be 3 by default
  const setSpreadFactor = 0.5 // How spread out lines are within a set (0: superimposed, 1: spread over full range allowed by factor)

  for (let i = 0; i < numLinesInSet; i++) {
    const radarLineMesh = new THREE.Mesh(
      radarBaseLineGeometry,
      radarLineMaterialRef // Use instanceParams in material
    )

    let initialScale
    if (instanceParams.radarFlowDirection === 'inward') {
      // For inward flow, set starts near maxScale, staggered slightly inwards
      // Lines are indexed 0, 1, 2. Line 0 is outermost in the set.
      initialScale =
        radarMaxRadius -
        (i / Math.max(1, numLinesInSet - 1)) * (radiusRange * setSpreadFactor)
      initialScale = Math.max(radarMinRadiusUsed, initialScale)
    } else {
      // 'outward'
      // For outward flow, set starts near minScale, staggered slightly outwards
      // Line 0 is innermost in the set.
      initialScale =
        radarMinRadiusUsed +
        (i / Math.max(1, numLinesInSet - 1)) * (radiusRange * setSpreadFactor)
      initialScale = Math.min(radarMaxRadius, initialScale)
    }
    // If numLinesInSet is 1, the (i / Math.max(1, numLinesInSet - 1)) becomes 0/1=0, so it starts at min/max.
    if (numLinesInSet === 1) {
      initialScale =
        instanceParams.radarFlowDirection === 'inward'
          ? radarMaxRadius
          : radarMinRadiusUsed
    }

    radarLineMesh.scale.set(initialScale, initialScale, 1)
    radarLineMesh.name = `radarLine_${i}`
    radarLineMesh.position.z = 0.1
    radarLineMesh.userData.hasCompletedCycle = false // New state for set logic
    // Store its calculated initial scale for consistent resets
    // radarLineMesh.userData.initialCalculatedScale = initialScale; // We can recalculate on reset

    radarSignalGroup.add(radarLineMesh)
    radarLines.push(radarLineMesh)
  }
  radarSignalGroup.userData.lines = radarLines

  // --- Initialize Color Objects ---
  // .set() is already correctly using instanceParams thanks to the previous fix
  basePlanetColorObject.set(instanceParams.planetColor)
  activePlanetColorObject.set(instanceParams.planetActiveColor)

  // --- Mode-Specific Final Steps ---
  if (isStandaloneMode) {
    // Setup Controls (only if UI elements exist in standalone HTML)
    // Pass the potentially updated orbitParams to setup controls correctly
    setupOrbitControls(instanceParams) // UI setup still uses the local instanceParams
    // Start Animation Loop (only for standalone)
    startInternalAnimationLoop() // Animation loop will now read the synced shared state
    // Setup Resize Handling (only for standalone if needed)
    window.addEventListener('resize', onWindowResize, false)
  }

  // --- Call resetOrbitalState at the end of initialization ---
  // This ensures a consistent start, applying to the initial instanceParams.
  resetOrbitalState()
  // --- End NEW Call ---

  // Return value might be useful for integrator, but not strictly necessary
  // return { scene: orbitScene, camera: orbitCamera };
}

// Helper function to extract orbit-specific parameters
function extractOrbitParamsFromMode(modeData) {
  const orbitParams = {}

  // Copy only orbit-relevant parameters
  Object.keys(defaultInternalOrbitParams).forEach((key) => {
    if (modeData[key] !== undefined) {
      orbitParams[key] = modeData[key]
    }
  })

  return orbitParams
}

// Export a new function to load a specific mode
export function loadOrbitMode(modeId) {
  if (!modeId || !savedModes[modeId]) {
    console.error(`Orbit: Mode ${modeId} not found`)
    return false
  }

  const orbitParams = extractOrbitParamsFromMode(savedModes[modeId])
  updateOrbitParameters(orbitParams)
  resetOrbitalState() // --- NEW: Reset state when a mode is loaded ---
  return true
}

// --- Update Parameters Function (Handles UI inputs or external calls) ---
// >>> This function now needs to update the INSTANCE params <<<
// How do we access the instanceParams specific to this orbit instance from here?
// This reveals a flaw in the current structure for multiple instances.
// For the single instance in energy.html, we can assume we modify a shared state,
// but this isn't ideal for true multi-instance support.
// Let's modify the SHARED orbitParams object for now, assuming only one orbit instance
// is actively controlled via the energy.html UI.
function updateOrbitParameters(newParams) {
  // --- ADDED LOG 1 ---
  console.log(
    '[orbit.js] updateOrbitParameters received:',
    JSON.parse(JSON.stringify(newParams)) // Log a clean copy
  )
  // --- END LOG ---

  const targetParams = defaultInternalOrbitParams // Still using shared state for now

  // Process parameters as before
  for (const key in newParams) {
    if (targetParams.hasOwnProperty(key)) {
      const newValue = newParams[key]
      let processedValue = newValue
      let skipGeneralComparison = false

      // Color processing
      if (
        typeof targetParams[key] === 'number' &&
        typeof newValue === 'string' &&
        newValue.startsWith('#')
      ) {
        processedValue = new THREE.Color(newValue).getHex()
      }
      // Other type processing (keep existing logic)
      else if (
        typeof targetParams[key] === 'number' &&
        typeof newValue === 'string'
      ) {
        processedValue = parseFloat(newValue)
        if (isNaN(processedValue)) continue
      } else if (
        typeof targetParams[key] === 'boolean' &&
        typeof newValue === 'string'
      ) {
        processedValue = newValue === 'true' || newValue === true
      } else if (
        typeof targetParams[key] === 'boolean' &&
        typeof newValue === 'boolean'
      ) {
        processedValue = newValue
      } else if (key === 'activeDeliveryDays' && typeof newValue === 'object') {
        targetParams[key] = { ...newValue } // Always update
        // --- ADDED LOG 2 ---
        console.log(
          `[orbit.js] Updated activeDeliveryDays in targetParams to:`,
          JSON.parse(JSON.stringify(targetParams[key]))
        )
        // --- END LOG ---
        skipGeneralComparison = true
      } else if (
        key === 'radarVisibilityMode' &&
        typeof newValue === 'string'
      ) {
        if (newValue === 'always' || newValue === 'activeDays') {
          targetParams[key] = newValue // Always update
          // --- ADDED LOG 3 ---
          console.log(
            `[orbit.js] Updated radarVisibilityMode in targetParams to:`,
            targetParams[key]
          )
          // --- END LOG ---
        }
        skipGeneralComparison = true
      } else if (key === 'radarFlowDirection' && typeof newValue === 'string') {
        if (newValue === 'inward' || newValue === 'outward') {
          targetParams[key] = newValue // Always update
          console.log(
            `[orbit.js] Updated radarFlowDirection in targetParams to:`,
            targetParams[key]
          )
        }
        skipGeneralComparison = true
      }

      // Apply processed value to the targetParams (simplified)
      if (!skipGeneralComparison) {
        // Only log if value changed, but always update
        if (targetParams[key] !== processedValue) {
          // --- ADDED LOG 4 (conditional) ---
          console.log(
            `[orbit.js] Updating targetParams.${key} from ${targetParams[key]} to:`,
            processedValue
          )
          // --- END LOG ---
        }
        targetParams[key] = processedValue // Update regardless

        // Update Color Objects if relevant
        if (key === 'planetColor') {
          basePlanetColorObject.setHex(targetParams.planetColor)
        } else if (key === 'planetActiveColor') {
          activePlanetColorObject.setHex(targetParams.planetActiveColor)
        }
      }
    }
  }

  // --- Always Apply Visual Updates if scene exists ---
  if (orbitScene) {
    // --- ADDED LOG 5 ---
    console.log(
      '[orbit.js] Applying visual updates based on targetParams:',
      JSON.parse(JSON.stringify(targetParams))
    )
    // --- END LOG ---

    const sun = orbitScene.getObjectByName('sun')
    const moon1 = orbitScene.getObjectByName('moon1')
    const moon2 = orbitScene.getObjectByName('moon2')
    const mainOrbitPathMesh = orbitScene.getObjectByName('mainOrbitPath')
    const dayMarksGroup = orbitScene.getObjectByName('dayMarksGroup')
    const planet = orbitScene.getObjectByName('planet')

    // --- ADDED LOG 6 ---
    console.log('[orbit.js] Found objects:', {
      sun: !!sun,
      moon1: !!moon1,
      moon2: !!moon2,
      mainOrbitPathMesh: !!mainOrbitPathMesh,
      dayMarksGroup: !!dayMarksGroup,
      planet: !!planet,
    })
    // --- END LOG ---

    // Ensure planet color is initialized
    if (planet?.material instanceof THREE.MeshBasicMaterial) {
      planet.material.color.copy(basePlanetColorObject)
    }

    // Always update Materials/Visibility using targetParams
    if (sun?.material) {
      // --- ADDED LOG 7 ---
      console.log(
        `[orbit.js] Setting sun color to hex: ${new THREE.Color(
          targetParams.sunColor
        ).getHexString()}`
      )
      // --- END LOG ---
      sun.material.color.setHex(targetParams.sunColor)
    }
    if (moon1?.material) moon1.material.color.setHex(targetParams.moon1Color)
    if (moon2?.material) moon2.material.color.setHex(targetParams.moon2Color)

    if (sun) sun.visible = targetParams.showSun
    if (moon1) moon1.visible = targetParams.showMoon1
    if (moon2) moon2.visible = targetParams.showMoon2

    // Update Day Mark Material Color
    if (dayMarksGroup) {
      // --- ADDED LOG 8 ---
      console.log(
        `[orbit.js] Setting day marks color to hex: ${new THREE.Color(
          targetParams.dayMarkColor
        ).getHexString()}`
      )
      // --- END LOG ---
      dayMarksGroup.children.forEach((mark) => {
        if (
          mark instanceof THREE.Mesh &&
          mark.material instanceof THREE.MeshBasicMaterial
        ) {
          mark.material.color.setHex(targetParams.dayMarkColor)
        }
      })
    }

    // Update MeshLine Material Properties (Orbit Line)
    const orbitLineMaterialRef = mainOrbitPathMesh?.material
    if (orbitLineMaterialRef instanceof MeshLineMaterial) {
      // --- ADDED LOG 9 ---
      console.log(
        `[orbit.js] Setting orbit line color to hex: ${new THREE.Color(
          targetParams.mainOrbitColor
        ).getHexString()}, thickness: ${targetParams.mainOrbitThickness}`
      )
      // --- END LOG ---
      orbitLineMaterialRef.color.setHex(targetParams.mainOrbitColor)
      orbitLineMaterialRef.uniforms.lineWidth.value =
        targetParams.mainOrbitThickness
    }

    // Radar Line Updates (Color/Thickness)
    if (radarLineMaterialRef instanceof MeshLineMaterial) {
      // --- ADDED LOG 10 ---
      console.log(
        `[orbit.js] Setting radar line color to hex: ${new THREE.Color(
          targetParams.radarColor
        ).getHexString()}, thickness: ${targetParams.radarThickness}`
      )
      // --- END LOG ---
      console.log(
        'Updating radar color to (hex):',
        new THREE.Color(targetParams.radarColor).getHexString()
      )
      radarLineMaterialRef.color.setHex(targetParams.radarColor)
      console.log('Updating radar thickness to:', targetParams.radarThickness)
      radarLineMaterialRef.uniforms.lineWidth.value =
        targetParams.radarThickness
    }

    // Force material updates
    if (sun?.material) sun.material.needsUpdate = true
    if (moon1?.material) moon1.material.needsUpdate = true
    if (moon2?.material) moon2.material.needsUpdate = true
    if (orbitLineMaterialRef) orbitLineMaterialRef.needsUpdate = true
    if (radarLineMaterialRef) radarLineMaterialRef.needsUpdate = true

    // --- ADDED LOG 11 ---
    console.log('[orbit.js] Visual updates applied.')
    // --- END LOG ---
  } else {
    // --- ADDED LOG 12 ---
    console.warn(
      '[orbit.js] updateOrbitParameters called but orbitScene not found. Cannot apply visual updates.'
    )
    // --- END LOG ---
  }
} // --- End updateOrbitParameters ---

// --- Canvas CSS Setup (Used only in Standalone) ---
function setupCanvasCSS(targetContainer, targetCanvas) {
  if (!targetContainer || !targetCanvas) return
  targetCanvas.style.display = 'block'
  const currentPosition = window.getComputedStyle(targetContainer).position
  if (currentPosition === 'static') {
    targetContainer.style.position = 'relative'
  }
  targetContainer.style.display = 'flex'
  targetContainer.style.aspectRatio = '1 / 1'
  targetContainer.style.maxWidth = targetContainer.style.maxWidth || '100%'
  targetContainer.style.maxHeight = targetContainer.style.maxHeight || '100%'
  targetContainer.style.margin = targetContainer.style.margin || '0 auto'
  targetContainer.style.overflow = 'hidden'
  targetCanvas.style.flexGrow = '1'
  targetCanvas.style.width = 'auto'
  targetCanvas.style.height = '100%'
  targetCanvas.style.objectFit = 'contain'
}

// --- Resize Handling (Used only in Standalone) ---
function onWindowResize() {
  // Only relevant if standalone needs responsive canvas sizing beyond CSS
  // Or if resolution needs update for MeshLineMaterial (though currently fixed)
  // console.log("Window resize detected - Standalone mode");
  // Orthographic camera doesn't usually need aspect update
  // Renderer size is fixed internally, CSS handles display scaling
}

// --- NEW: Core Animation Update Logic ---
// Needs access to the correct parameters for the instance.
// Again, for simplicity with the current structure, we'll read from the shared defaults object.
function updateOrbitAnimation(deltaTime) {
  // Use the shared defaults object (targetParams from updateOrbitParameters)
  const currentInstanceParams = defaultInternalOrbitParams

  if (!orbitScene || !currentInstanceParams.enabled) {
    return
  }

  // --- Get references ---
  const planetPivot = orbitScene.getObjectByName('planetPivot')
  const moon1Pivot = orbitScene.getObjectByName('moon1Pivot')
  const moon2Pivot = orbitScene.getObjectByName('moon2Pivot')
  const planet = orbitScene.getObjectByName('planet')
  const radarGroup = orbitScene.getObjectByName('radarSignalGroup')

  if (!planetPivot || !planet) {
    // console.warn('[updateOrbitAnimation] Missing planetPivot or planet object.');
    return
  }

  // --- Animation Calculations ---
  const baseSpeedMultiplier = 5
  const planetEffectiveSpeed =
    currentInstanceParams.orbitSpeed * baseSpeedMultiplier
  const moonEffectiveSpeed =
    currentInstanceParams.moonOrbitSpeed * baseSpeedMultiplier

  // --- Planet Rotation and Day Calculation ---
  planetPivot.rotation.z -= deltaTime * planetEffectiveSpeed * 0.5
  const pivotAngle = planetPivot.rotation.z
  const dayProgressAngle =
    ((-pivotAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  let dayIndex = Math.floor(dayProgressAngle / daySegmentAngle)
  dayIndex = dayIndex % 6
  const currentDayName = dayNames[dayIndex]
  const angleWithinSegment = dayProgressAngle % daySegmentAngle
  // --- End Day Calculation ---

  // --- Day Change Detection (for 'always' mode's per-day set limit) ---
  if (dayIndex !== currentSimulatedDayIndex) {
    // console.log(`Day changed from ${currentSimulatedDayIndex} to ${dayIndex}. Resetting continuous loop count.`);
    currentSimulatedDayIndex = dayIndex
    setsFiredForContinuousLoop = 0
  }

  // --- Lerp Factor for Planet Color and Radar Opacity ---
  let isDayActive = false
  let lerpFactor = 0.0
  const activeDaysState = currentInstanceParams.activeDeliveryDays

  if (activeDaysState && typeof activeDaysState === 'object') {
    isDayActive = currentDayName && activeDaysState[currentDayName] === true
    const nextDayIndex = (dayIndex + 1) % 6
    const nextDayName = dayNames[nextDayIndex]
    const isNextDayActive = nextDayName && activeDaysState[nextDayName] === true

    const transitionPointStart = TRANSITION_ANGLE
    const transitionPointEnd = daySegmentAngle - TRANSITION_ANGLE

    if (isDayActive) {
      if (!isNextDayActive) {
        // Active day followed by INACTIVE day
        if (angleWithinSegment > transitionPointEnd) {
          lerpFactor = (daySegmentAngle - angleWithinSegment) / TRANSITION_ANGLE
        } else {
          lerpFactor = 1.0
        }
      } else {
        // Active day followed by ACTIVE day
        lerpFactor = 1.0
      }
    } else {
      // Current day is INACTIVE
      if (isNextDayActive) {
        // Inactive day followed by ACTIVE day
        if (angleWithinSegment > transitionPointEnd) {
          lerpFactor =
            (angleWithinSegment - transitionPointEnd) / TRANSITION_ANGLE
        } else {
          lerpFactor = 0.0
        }
      } else {
        // Inactive day followed by INACTIVE day
        lerpFactor = 0.0
      }
    }
    lerpFactor = Math.max(0.0, Math.min(1.0, lerpFactor))
  } else {
    // console.warn('[updateOrbitAnimation] activeDeliveryDays state is invalid.');
    isDayActive = false
    lerpFactor = 0.0
  }
  // --- End Lerp Factor ---

  // --- Planet Color Update ---
  if (planet.material instanceof THREE.MeshBasicMaterial) {
    planet.material.color.lerpColors(
      basePlanetColorObject,
      activePlanetColorObject,
      lerpFactor
    )
  }

  // --- Moon Animation ---
  if (moon1Pivot) moon1Pivot.rotation.z += deltaTime * moonEffectiveSpeed
  if (moon2Pivot) moon2Pivot.rotation.z += deltaTime * moonEffectiveSpeed

  // --- Radar Line Animation Logic ---
  if (radarGroup && radarGroup.userData.lines) {
    const lines = radarGroup.userData.lines
    const speed = currentInstanceParams.radarAnimationSpeed
    const minScale = currentInstanceParams.radarMinRadius
    const maxScale =
      currentInstanceParams.mainOrbitRadius *
      currentInstanceParams.radarMaxRadiusFactor
    const flowDirection = currentInstanceParams.radarFlowDirection
    const numLinesInSet = currentInstanceParams.numRadarLines
    const radiusRange = maxScale - minScale
    const setSpreadFactor = 0.5
    const setsParamValue = currentInstanceParams.radarSetsPerDay // How many sets in a loop or burst

    let currentSetHasActivelyAnimatingLine = false
    let allLinesHaveCompletedTheirCycleThisFrame = true

    lines.forEach((lineMesh) => {
      if (lineMesh.userData.hasCompletedCycle) {
        if (lineMesh.visible) lineMesh.visible = false
      } else {
        allLinesHaveCompletedTheirCycleThisFrame = false
        currentSetHasActivelyAnimatingLine = true

        if (!lineMesh.visible) lineMesh.visible = true

        if (flowDirection === 'inward') {
          lineMesh.scale.x -= speed * deltaTime
          if (lineMesh.scale.x <= minScale) {
            lineMesh.scale.x = minScale
            lineMesh.userData.hasCompletedCycle = true
          }
        } else {
          lineMesh.scale.x += speed * deltaTime
          if (lineMesh.scale.x >= maxScale) {
            lineMesh.scale.x = maxScale
            lineMesh.userData.hasCompletedCycle = true
          }
        }
        lineMesh.scale.y = lineMesh.scale.x
      }
    })

    const aSetJustFinished =
      allLinesHaveCompletedTheirCycleThisFrame && !allLinesPreviouslyCompleted
    allLinesPreviouslyCompleted = allLinesHaveCompletedTheirCycleThisFrame

    const resetAndStartSet = () => {
      lines.forEach((lineMesh, i) => {
        let resetScale
        if (flowDirection === 'inward') {
          resetScale =
            maxScale -
            (i / Math.max(1, numLinesInSet - 1)) *
              (radiusRange * setSpreadFactor)
          resetScale = Math.max(minScale, resetScale)
        } else {
          resetScale =
            minScale +
            (i / Math.max(1, numLinesInSet - 1)) *
              (radiusRange * setSpreadFactor)
          resetScale = Math.min(maxScale, resetScale)
        }
        if (numLinesInSet === 1)
          resetScale = flowDirection === 'inward' ? maxScale : minScale

        lineMesh.scale.set(resetScale, resetScale, 1)
        lineMesh.userData.hasCompletedCycle = false
        lineMesh.visible = true
      })
      allLinesPreviouslyCompleted = false
      currentSetHasActivelyAnimatingLine = true
    }

    if (currentInstanceParams.radarVisibilityMode === 'always') {
      radarGroup.visible = true
      if (radarLineMaterialRef)
        radarLineMaterialRef.uniforms.opacity.value = 1.0

      if (
        (aSetJustFinished || !currentSetHasActivelyAnimatingLine) &&
        setsFiredForContinuousLoop < setsParamValue
      ) {
        resetAndStartSet()
        setsFiredForContinuousLoop++
      }
    } else {
      const radarIsVisuallyActive = isDayActive && lerpFactor > 0.1

      radarGroup.visible = lerpFactor > 0.001
      if (radarLineMaterialRef) {
        // radarLineMaterialRef.uniforms.opacity.value = lerpFactor; // This line no longer has a visual effect on opaque materials
      }

      if (radarIsVisuallyActive) {
        if (!activeDayBurstInitiated) {
          activeDayBurstInitiated = true
          setsFiredInActiveDayBurst = 0

          if (setsFiredInActiveDayBurst < setsParamValue) {
            resetAndStartSet()
            setsFiredInActiveDayBurst++
          }
        } else if (
          (aSetJustFinished || !currentSetHasActivelyAnimatingLine) &&
          setsFiredInActiveDayBurst < setsParamValue
        ) {
          resetAndStartSet()
          setsFiredInActiveDayBurst++
        }
      } else {
        if (activeDayBurstInitiated) {
          activeDayBurstInitiated = false
        }
      }
    }
  }
} // --- End updateOrbitAnimation ---

// --- NEW: Scene Rendering Function ---
// Renders the orbit scene onto the provided renderer
function renderOrbitScene(rendererToUse) {
  if (!rendererToUse || !orbitScene || !orbitCamera) {
    // console.error("Cannot render orbit scene: Missing renderer, scene, or camera.");
    return
  }
  // The calling function (internal loop or energy.js) should handle autoClear settings
  rendererToUse.render(orbitScene, orbitCamera)
}

// --- NEW: Internal Animation Loop (Standalone Mode Only) ---
function startInternalAnimationLoop() {
  // Use the module-level clock
  function loop() {
    internalAnimationLoopId = requestAnimationFrame(loop)
    const deltaTime = clock.getDelta() // Get delta time

    // Update animation state (using the new dedicated function)
    updateOrbitAnimation(deltaTime)

    // Render the scene (using the new dedicated function and internal renderer)
    if (orbitRenderer) {
      // Standalone controls its own clearing
      orbitRenderer.autoClear = true
      renderOrbitScene(orbitRenderer)
    }
  }
  // Stop any previous loop before starting
  if (internalAnimationLoopId) {
    cancelAnimationFrame(internalAnimationLoopId)
  }
  loop() // Start the new loop
}

// --- Speed Calculation Helpers (Keep as is) ---
// Helper to calculate actual PLANET speed from slider value (1-10)
function calculateActualPlanetSpeed(sliderValue) {
  const clampedSliderValue = Math.max(1, sliderValue)
  return planetSpeedBase * Math.pow(PHI, clampedSliderValue - 1)
}

// Helper to calculate PLANET slider value (1-10) from actual speed
function calculatePlanetSliderValue(actualSpeed) {
  if (actualSpeed <= planetSpeedBase) return 1
  const sliderValue =
    Math.log(actualSpeed / planetSpeedBase) / Math.log(PHI) + 1
  return Math.round(Math.max(1, Math.min(10, sliderValue)))
}

// --- NEW: Moon Speed Helpers ---
// Helper to calculate actual MOON speed from slider value (1-10)
function calculateActualMoonSpeed(sliderValue) {
  const clampedSliderValue = Math.max(1, sliderValue)
  return moonSpeedBase * Math.pow(PHI, clampedSliderValue - 1)
}

// Helper to calculate MOON slider value (1-10) from actual speed
function calculateMoonSliderValue(actualSpeed) {
  if (actualSpeed <= moonSpeedBase) return 1
  const sliderValue = Math.log(actualSpeed / moonSpeedBase) / Math.log(PHI) + 1
  return Math.round(Math.max(1, Math.min(10, sliderValue)))
}

// --- Exports ---
export {
  initializeOrbit,
  updateOrbitParameters, // Keep exporting for energy.js import
  updateOrbitAnimation,
  renderOrbitScene,
  calculateActualPlanetSpeed,
  calculatePlanetSliderValue,
  calculateActualMoonSpeed,
  calculateMoonSliderValue,
  resetOrbitalState,
}
