import * as THREE from 'three'
// --- Import MeshLine using named imports as per documentation ---
import { MeshLine, MeshLineMaterial } from 'three.meshline'

let scene, camera, renderer, container, canvas
// let animationRunning = true // Control play/pause
const PHI = 1.618 // Golden Ratio
const TRANSITION_ANGLE = Math.PI / 36 // Angle for fade transition (5 degrees)

// Base speed for PLANET exponential calculation
const defaultPlanetActualSpeed = 0.1
const planetSpeedBase = defaultPlanetActualSpeed / Math.pow(PHI, 5 - 1) // Slider 5 -> 0.1

// Base speed for MOON exponential calculation
const defaultMoonActualSpeed = 0.4 // Faster default for moons
const moonSpeedBase = defaultMoonActualSpeed / Math.pow(PHI, 5 - 1) // Slider 5 -> 0.4

let orbitParams = {
  // Default parameters for the orbit animation
  enabled: true,
  showSun: true, // New parameter for sun visibility
  sunColor: 0xf6ff47,
  planetColor: 0x607d8b,
  showMoon1: true,
  moon1Color: 0xff3d23,
  showMoon2: true,
  moon2Color: 0x0189d7,
  // Store the *actual* speeds used for animation
  orbitSpeed: defaultPlanetActualSpeed, // Planet's speed around sun
  moonOrbitSpeed: defaultMoonActualSpeed, // Moons' speed around planet
  // --- NEW Line Parameters ---
  mainOrbitColor: 0xd1e7de,
  mainOrbitThickness: 6, // Default thickness in pixels now
  radarColor: 0xa0a0a0, // Default radar color
  radarThickness: 1, // Default radar thickness in pixels now
  // --- NEW Delivery Day Parameters ---
  activeDeliveryDays: {
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
  },
  planetActiveColor: 0xff0000, // Default active color (red)
  // --- NEW Radar Visibility Mode ---
  radarVisibilityMode: 'always', // 'always' or 'activeDays'
  // --- Internal Parameters ---
  canvasSize: 800,
  // -- New internal constants for geometry --
  sunSize: 0.5, // Base size for the sun
  mainOrbitRadius: 1.8, // Radius planet orbits sun
  dayMarkLength: 0.15, // How far the day marks stick out
  planetSize: 0.5 / PHI,
  moonSize: 0.5 / PHI / PHI,
  moonOrbitRadius: (0.5 / PHI) * 1.5,
  // -- NEW: Radar Animation Internal Config --
  numRadarLines: 4, // How many concentric lines
  radarMaxRadiusFactor: 1, // Start slightly outside main orbit
  radarMinRadius: 0.1, // Minimum radius before reset
  radarAnimationSpeed: 0.6, // Units per second inward speed
  dayMarkColor: 0xd1e7de, // <--- Add this line (default color)
}

// --- Module-level variables for interpolation ---
let basePlanetColorObject = new THREE.Color()
let activePlanetColorObject = new THREE.Color()
let radarLineMaterialRef = null // To hold the shared radar material

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

  if (playStopButton) {
    console.log('Play/Stop button found, attaching event listener.')
    playStopButton.textContent = initialParams.enabled ? 'Stop' : 'Play'
    playStopButton.addEventListener('click', () => {
      console.log(
        'Play/Stop button clicked. Current state:',
        orbitParams.enabled
      )
      const newEnabledState = !orbitParams.enabled
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
        // Create an update object dynamically
        const update = {
          activeDeliveryDays: {
            ...orbitParams.activeDeliveryDays,
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
}

// Function to create the main orbit scene
function createOrbitScene(targetContainer) {
  if (!targetContainer) {
    console.error('Orbit Error: Target container not provided.')
    return
  }
  container = targetContainer

  // --- Basic Scene Setup ---
  scene = new THREE.Scene()
  // Let's keep the background transparent for now, assuming layering later
  // scene.background = new THREE.Color(0xedf7ee);

  // Use OrthographicCamera for a 2D look
  const aspect = 1 // Assuming square canvas
  const frustumSize = 5 // Adjust this to control zoom level relative to object sizes
  camera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    100
  )
  camera.position.z = 10 // Look down the Z axis

  // --- Canvas and Renderer ---
  canvas = document.createElement('canvas')
  canvas.classList.add('orbit-simulation-canvas')
  container.appendChild(canvas)
  setupCanvasCSS(container, canvas) // Use the corrected CSS setup

  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true, // Make canvas transparent
  })
  renderer.setSize(orbitParams.canvasSize, orbitParams.canvasSize, false)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0) // Transparent background

  // --- Create Scene Elements ---

  // Material definitions (reusable)
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: orbitParams.sunColor,
    depthTest: true, // Default, but explicit
    depthWrite: true, // Default, but explicit
  })
  const planetMaterial = new THREE.MeshBasicMaterial({
    color: orbitParams.planetColor,
    depthTest: true, // Default, but explicit
    depthWrite: true, // Default, but explicit
  })
  const moon1Material = new THREE.MeshBasicMaterial({
    color: orbitParams.moon1Color,
    depthTest: true, // Default, but explicit
    depthWrite: true, // Default, but explicit
  })
  const moon2Material = new THREE.MeshBasicMaterial({
    color: orbitParams.moon2Color,
    depthTest: true, // Default, but explicit
    depthWrite: true, // Default, but explicit
  })

  // Orbit/Day Marks Material - REMOVE transparency settings
  const orbitLineMaterial = new MeshLineMaterial({
    color: orbitParams.mainOrbitColor,
    lineWidth: orbitParams.mainOrbitThickness,
    resolution: new THREE.Vector2(
      orbitParams.canvasSize,
      orbitParams.canvasSize
    ),
    sizeAttenuation: 0,
    transparent: false, // Orbit line is opaque
    depthTest: true, // Enable depth test
    depthWrite: true, // Write to depth buffer
  })

  // --- UPDATED Radar Material ---
  // Use the imported MeshLineMaterial directly
  radarLineMaterialRef = new MeshLineMaterial({
    color: orbitParams.radarColor,
    lineWidth: orbitParams.radarThickness,
    resolution: new THREE.Vector2(
      orbitParams.canvasSize,
      orbitParams.canvasSize
    ),
    sizeAttenuation: 0,
    transparent: true,
    opacity: 1.0,
    depthTest: true, // Keep depth test enabled
    depthWrite: false, // Keep depth write disabled for transparency
  })

  // Geometry definitions (reusable)
  const circleGeometry = (radius) => new THREE.CircleGeometry(radius, 32) // 32 segments for smooth circle

  // NEW: Define geometry for a single day mark rectangle
  const dayMarkWidth = 0.02 // Adjust world units as needed
  const dayMarkHeight = 0.16 // Adjust world units as needed
  const dayMarkGeometry = new THREE.PlaneGeometry(dayMarkWidth, dayMarkHeight)

  // NEW: Base Radar Circle Geometry (radius 1, scaled later)
  const radarBasePoints = []
  const radarDivisions = 64
  for (let i = 0; i <= radarDivisions; i++) {
    const angle = (i / radarDivisions) * Math.PI * 2
    radarBasePoints.push(
      Math.cos(angle), // Radius 1
      Math.sin(angle), // Radius 1
      0 // Z coordinate
    )
  }
  const radarBaseLineGeometry = new MeshLine()
  radarBaseLineGeometry.setPoints(radarBasePoints, (p) => 1) // Constant width profile

  // 1. Sun
  const sun = new THREE.Mesh(
    circleGeometry(orbitParams.sunSize / 2),
    sunMaterial
  )
  sun.name = 'sun'
  sun.position.z = 1 // Closer to camera
  sun.visible = orbitParams.showSun // Set initial visibility
  scene.add(sun)

  // 2. Main Orbit Path
  const orbitPoints = []
  const divisions = 64
  for (let i = 0; i <= divisions; i++) {
    const angle = (i / divisions) * Math.PI * 2
    orbitPoints.push(
      Math.cos(angle) * orbitParams.mainOrbitRadius,
      Math.sin(angle) * orbitParams.mainOrbitRadius,
      0 // Z coordinate
    )
  }
  // Use MeshLine for geometry
  const mainOrbitLineGeometry = new MeshLine() // Use MeshLine directly
  mainOrbitLineGeometry.setPoints(orbitPoints, (p) => 1) // p=>1 gives constant width
  const mainOrbitPath = new THREE.Mesh(mainOrbitLineGeometry, orbitLineMaterial) // Pass MeshLine instance as geometry
  mainOrbitPath.name = 'mainOrbitPath'
  mainOrbitPath.position.z = 0.01 // Further from camera
  scene.add(mainOrbitPath)

  // --- NEW: Create Day Marks using PlaneGeometry ---
  const numDayMarks = 6
  const dayMarksGroup = new THREE.Group()
  dayMarksGroup.name = 'dayMarksGroup'
  scene.add(dayMarksGroup) // Group itself doesn't need Z

  // Rotate the entire day mark arrangement so the first gap (Monday) starts at 12 o'clock.
  const dayMarkRotationOffset = Math.PI / 2 // Changed from Math.PI / -2

  for (let i = 0; i < numDayMarks; i++) {
    const angle = (i / numDayMarks) * Math.PI * 2 + dayMarkRotationOffset
    // Position slightly outside the main orbit radius
    const positionRadius =
      orbitParams.mainOrbitRadius + dayMarkHeight / 2 + 0.02 // Adjust offset as needed

    // Create a Mesh for this mark
    const dayMarkMaterial = new THREE.MeshBasicMaterial({
      color: orbitParams.dayMarkColor,
      depthTest: true,
      depthWrite: true,
    })

    const dayMark = new THREE.Mesh(dayMarkGeometry, dayMarkMaterial)

    // Position the mark
    dayMark.position.x = Math.cos(angle) * positionRadius
    dayMark.position.y = Math.sin(angle) * positionRadius
    dayMark.position.z = 0.1 // Same depth as orbit line

    // Rotate the mark to point outwards radially
    dayMark.rotation.z = angle + Math.PI / 2

    dayMarksGroup.add(dayMark)
  }

  // 4. Planet Pivot (Parent for Planet and Moons)
  const planetPivot = new THREE.Object3D()
  planetPivot.name = 'planetPivot'
  scene.add(planetPivot)

  // 5. Planet
  const planet = new THREE.Mesh(
    circleGeometry(orbitParams.planetSize / 2),
    planetMaterial
  )
  planet.name = 'planet'
  // Start planet at the 12 o'clock position
  planet.position.x = 0 // Changed from orbitParams.mainOrbitRadius
  planet.position.y = orbitParams.mainOrbitRadius // Added
  planet.position.z = 1 // Closer to camera
  planetPivot.add(planet) // Add planet to its pivot

  // 6. Moon 1 Pivot & Mesh
  const moon1Pivot = new THREE.Object3D()
  moon1Pivot.name = 'moon1Pivot'
  planet.add(moon1Pivot) // Add moon pivot TO THE PLANET mesh

  const moon1 = new THREE.Mesh(
    circleGeometry(orbitParams.moonSize / 2),
    moon1Material
  )
  moon1.name = 'moon1'
  moon1.position.x = orbitParams.moonOrbitRadius // Position relative to planet
  moon1.position.z = 1 // Closer to camera (relative to planet's -0.1 is fine)
  moon1.visible = orbitParams.showMoon1
  moon1Pivot.add(moon1) // Add moon mesh to its pivot

  // 7. Moon 2 Pivot & Mesh
  const moon2Pivot = new THREE.Object3D()
  moon2Pivot.name = 'moon2Pivot'
  moon2Pivot.rotation.z = Math.PI // Start 180 degrees opposite Moon 1
  planet.add(moon2Pivot) // Add moon pivot TO THE PLANET mesh

  const moon2 = new THREE.Mesh(
    circleGeometry(orbitParams.moonSize / 2),
    moon2Material
  )
  moon2.name = 'moon2'
  moon2.position.x = orbitParams.moonOrbitRadius // Position relative to planet
  moon2.position.z = 1 // Closer to camera
  moon2.visible = orbitParams.showMoon2
  moon2Pivot.add(moon2) // Add moon mesh to its pivot

  // --- MODIFIED: Radar Signal Group Setup ---
  const radarSignalGroup = new THREE.Group()
  radarSignalGroup.name = 'radarSignalGroup'
  // Set initial visibility based on mode (animate handles 'activeDays' on first frame)
  radarSignalGroup.visible = orbitParams.radarVisibilityMode === 'always'
  scene.add(radarSignalGroup)

  // Create and add the radar lines
  const radarLines = []
  const radarMaxRadius =
    orbitParams.mainOrbitRadius * orbitParams.radarMaxRadiusFactor
  const radiusRange = radarMaxRadius - orbitParams.radarMinRadius

  for (let i = 0; i < orbitParams.numRadarLines; i++) {
    const radarLineMesh = new THREE.Mesh(
      radarBaseLineGeometry,
      radarLineMaterialRef
    )
    // Distribute initial scales evenly within the range
    const initialScale =
      orbitParams.radarMinRadius + (i / orbitParams.numRadarLines) * radiusRange
    radarLineMesh.scale.set(initialScale, initialScale, 1)
    radarLineMesh.name = `radarLine_${i}`
    radarLineMesh.position.z = 0.0 // Middle depth
    radarSignalGroup.add(radarLineMesh)
    radarLines.push(radarLineMesh)
  }
  // Store the array on the group for easy access in animate function
  radarSignalGroup.userData.lines = radarLines

  // --- NEW: Initialize Color Objects ---
  basePlanetColorObject.setHex(orbitParams.planetColor)
  activePlanetColorObject.setHex(orbitParams.planetActiveColor)

  // --- Setup Controls ---
  setupOrbitControls(orbitParams) // Call the controls setup

  // --- Start Animation Loop ---
  animate()

  // --- Resize Handling ---
  window.addEventListener('resize', onWindowResize, false)
}

// Function to update parameters (called by UI controls)
function updateOrbitParameters(newParams) {
  console.log('Updating orbit params:', newParams)
  let needsVisualUpdate = false

  for (const key in newParams) {
    if (orbitParams.hasOwnProperty(key)) {
      const newValue = newParams[key]
      let processedValue = newValue
      let skipGeneralComparison = false // Flag to skip final check

      // --- Color processing ---
      if (
        typeof orbitParams[key] === 'number' &&
        typeof newValue === 'string' &&
        newValue.startsWith('#')
      ) {
        processedValue = new THREE.Color(newValue).getHex()
      }
      // --- Other type processing (float, boolean, objects) ---
      else if (
        typeof orbitParams[key] === 'number' &&
        typeof newValue === 'string'
      ) {
        processedValue = parseFloat(newValue)
        if (isNaN(processedValue)) continue // Skip invalid numbers
      } else if (
        typeof orbitParams[key] === 'boolean' &&
        typeof newValue === 'string'
      ) {
        processedValue = newValue === 'true' || newValue === true
      } else if (
        typeof orbitParams[key] === 'boolean' &&
        typeof newValue === 'boolean'
      ) {
        processedValue = newValue
      } else if (key === 'activeDeliveryDays' && typeof newValue === 'object') {
        if (JSON.stringify(orbitParams[key]) !== JSON.stringify(newValue)) {
          orbitParams[key] = { ...newValue }
          console.log(`Orbit param ${key} updated to:`, orbitParams[key])
        }
        skipGeneralComparison = true
      } else if (
        key === 'radarVisibilityMode' &&
        typeof newValue === 'string'
      ) {
        if (
          orbitParams[key] !== newValue &&
          (newValue === 'always' || newValue === 'activeDays')
        ) {
          orbitParams[key] = newValue
          console.log(`Orbit param ${key} updated to:`, orbitParams[key])
        }
        skipGeneralComparison = true
      }

      // --- Apply processed value ---
      // Special check for float speeds
      if (key === 'orbitSpeed' || key === 'moonOrbitSpeed') {
        if (Math.abs(orbitParams[key] - processedValue) > 0.0001) {
          orbitParams[key] = processedValue
          console.log(`Orbit param ${key} updated to:`, processedValue)
        }
      } else if (
        !skipGeneralComparison &&
        orbitParams[key] !== processedValue
      ) {
        orbitParams[key] = processedValue
        console.log(`Orbit param ${key} updated to:`, processedValue)
        if (key !== 'enabled') {
          needsVisualUpdate = true

          // --- Update Color Objects if relevant color changed ---
          if (key === 'planetColor') {
            basePlanetColorObject.setHex(orbitParams.planetColor)
          } else if (key === 'planetActiveColor') {
            activePlanetColorObject.setHex(orbitParams.planetActiveColor)
          }
        }
      }
    }
  }

  // Apply *other* visual updates if needed (thickness, non-interpolated colors etc.)
  if (needsVisualUpdate && scene) {
    console.log(
      'Applying non-interpolated visual updates. Current orbitParams:',
      orbitParams
    )

    const sun = scene.getObjectByName('sun')
    const moon1 = scene.getObjectByName('moon1')
    const moon2 = scene.getObjectByName('moon2')
    const radarGroup = scene.getObjectByName('radarSignalGroup')
    const mainOrbitPathMesh = scene.getObjectByName('mainOrbitPath')
    const dayMarksGroup = scene.getObjectByName('dayMarksGroup')

    // Update non-interpolated colors
    if (sun?.material && newParams.sunColor !== undefined)
      sun.material.color.setHex(orbitParams.sunColor)
    if (moon1?.material && newParams.moon1Color !== undefined)
      moon1.material.color.setHex(orbitParams.moon1Color)
    if (moon2?.material && newParams.moon2Color !== undefined)
      moon2.material.color.setHex(orbitParams.moon2Color)

    // Update visibility (Sun and Moons)
    if (newParams.showSun !== undefined && sun)
      sun.visible = orbitParams.showSun
    if (newParams.showMoon1 !== undefined && moon1)
      moon1.visible = orbitParams.showMoon1
    if (newParams.showMoon2 !== undefined && moon2)
      moon2.visible = orbitParams.showMoon2

    // --- Update Day Mark Material Color ---
    if (newParams.dayMarkColor !== undefined && dayMarksGroup) {
      dayMarksGroup.children.forEach((mark) => {
        if (
          mark instanceof THREE.Mesh &&
          mark.material instanceof THREE.MeshBasicMaterial
        ) {
          mark.material.color.setHex(orbitParams.dayMarkColor)
        }
      })
    }

    // --- Update MeshLine Material Properties (Orbit Line) ---
    const orbitLineMaterialRef = mainOrbitPathMesh?.material
    if (orbitLineMaterialRef instanceof MeshLineMaterial) {
      if (newParams.mainOrbitColor !== undefined) {
        orbitLineMaterialRef.color.setHex(orbitParams.mainOrbitColor)
      }
      if (newParams.mainOrbitThickness !== undefined) {
        orbitLineMaterialRef.uniforms.lineWidth.value =
          orbitParams.mainOrbitThickness
      }
    }

    // --- Radar Line Updates (Color/Thickness Only) ---
    if (radarLineMaterialRef instanceof MeshLineMaterial) {
      if (newParams.radarColor !== undefined) {
        radarLineMaterialRef.color.setHex(orbitParams.radarColor)
      }
      if (newParams.radarThickness !== undefined) {
        radarLineMaterialRef.uniforms.lineWidth.value =
          orbitParams.radarThickness
      }
    }
  }
}

// Apply CSS (Similar to energy.js, maybe abstract later)
function setupCanvasCSS(targetContainer, targetCanvas) {
  if (!targetContainer || !targetCanvas) return
  targetCanvas.style.display = 'block' // Keep as block
  const currentPosition = window.getComputedStyle(targetContainer).position
  if (currentPosition === 'static') {
    targetContainer.style.position = 'relative' // Still potentially useful
  }
  // Ensure container styles allow flex items to work
  targetContainer.style.display = 'flex' // Make sure container is flex if not already
  targetContainer.style.aspectRatio = '1 / 1'
  targetContainer.style.maxWidth = targetContainer.style.maxWidth || '100%'
  targetContainer.style.maxHeight = targetContainer.style.maxHeight || '100%'
  targetContainer.style.margin = targetContainer.style.margin || '0 auto'
  targetContainer.style.overflow = 'hidden'

  // Style canvas to work correctly within the flex container
  targetCanvas.style.flexGrow = '1' // Allow canvas to grow
  targetCanvas.style.width = 'auto' // Let flexbox handle width
  targetCanvas.style.height = '100%' // Fill height
  targetCanvas.style.objectFit = 'contain' // Maintain aspect ratio if needed

  // REMOVED the absolute positioning that was hiding the controls
  // targetCanvas.style.position = 'absolute'
  // targetCanvas.style.top = '0'
  // targetCanvas.style.left = '0'
  // targetCanvas.style.pointerEvents = 'none'
}

// Resize handling
function onWindowResize() {
  // Orthographic camera doesn't need aspect update like perspective
  // Renderer size is fixed internally, CSS handles display size
}

// Animation Loop - Use separate speeds
const clock = new THREE.Clock()
// Array defining the order of days for calculation
const dayNames = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]
const daySegmentAngle = (Math.PI * 2) / 6 // Angle per day segment (60 degrees)

function animate() {
  requestAnimationFrame(animate)

  if (!orbitParams.enabled) {
    clock.getDelta()
    return
  }

  const deltaTime = clock.getDelta()
  const baseSpeedMultiplier = 5
  const planetEffectiveSpeed = orbitParams.orbitSpeed * baseSpeedMultiplier
  const moonEffectiveSpeed = orbitParams.moonOrbitSpeed * baseSpeedMultiplier

  const planetPivot = scene.getObjectByName('planetPivot')
  const moon1Pivot = scene.getObjectByName('moon1Pivot')
  const moon2Pivot = scene.getObjectByName('moon2Pivot')
  const planet = scene.getObjectByName('planet')
  const radarGroup = scene.getObjectByName('radarSignalGroup')

  let isDayActive = false
  let lerpFactor = 0.0 // Default to inactive state

  if (planetPivot && planet) {
    planetPivot.rotation.z -= deltaTime * planetEffectiveSpeed * 0.5

    const currentAngle = planetPivot.rotation.z
    const clockwiseAngle = (-currentAngle + 2 * Math.PI) % (2 * Math.PI)
    let dayIndex = Math.floor(clockwiseAngle / daySegmentAngle)
    dayIndex = dayIndex === 6 ? 0 : dayIndex
    const currentDayName = dayNames[dayIndex]

    isDayActive =
      currentDayName && orbitParams.activeDeliveryDays[currentDayName] === true

    // --- Calculate Transition ---
    const nextDayIndex = (dayIndex + 1) % 6
    const nextDayName = dayNames[nextDayIndex]
    const isNextDayActive = orbitParams.activeDeliveryDays[nextDayName] === true
    const transitionOccurs = isDayActive !== isNextDayActive

    const angleWithinSegment = clockwiseAngle % daySegmentAngle

    lerpFactor = isDayActive ? 1.0 : 0.0 // Base factor for current day

    if (
      transitionOccurs &&
      angleWithinSegment > daySegmentAngle - TRANSITION_ANGLE
    ) {
      // We are in the transition zone before the next segment starts
      const transitionProgress =
        (angleWithinSegment - (daySegmentAngle - TRANSITION_ANGLE)) /
        TRANSITION_ANGLE
      if (isDayActive) {
        // Fading out
        lerpFactor = 1.0 - transitionProgress
      } else {
        // Fading in
        lerpFactor = transitionProgress
      }
      lerpFactor = Math.max(0, Math.min(1, lerpFactor)) // Clamp between 0 and 1
    }

    // --- Update planet color using lerp ---
    planet.material.color.lerpColors(
      basePlanetColorObject,
      activePlanetColorObject,
      lerpFactor
    )
  } // End if (planetPivot && planet)

  // --- Update Radar Visibility & Opacity ---
  if (radarGroup && radarLineMaterialRef) {
    if (orbitParams.radarVisibilityMode === 'activeDays') {
      radarGroup.visible = lerpFactor > 0.001 // Make invisible if fully faded out
      radarLineMaterialRef.uniforms.opacity.value = lerpFactor
    } else {
      // 'always' mode
      radarGroup.visible = true
      radarLineMaterialRef.uniforms.opacity.value = 1.0
    }
  }

  // --- Moon Animation ---
  if (moon1Pivot) {
    moon1Pivot.rotation.z += deltaTime * moonEffectiveSpeed
  }
  if (moon2Pivot) {
    moon2Pivot.rotation.z += deltaTime * moonEffectiveSpeed
  }

  // --- Radar Line Scaling Animation ---
  if (radarGroup && radarGroup.visible && radarGroup.userData.lines) {
    const lines = radarGroup.userData.lines
    const speed = orbitParams.radarAnimationSpeed
    const minScale = orbitParams.radarMinRadius
    const maxScale =
      orbitParams.mainOrbitRadius * orbitParams.radarMaxRadiusFactor

    lines.forEach((lineMesh) => {
      // Decrease scale
      lineMesh.scale.x -= speed * deltaTime
      lineMesh.scale.y = lineMesh.scale.x // Keep it circular

      // Optional: Fade out line as it shrinks
      // ...

      // Reset if too small
      if (lineMesh.scale.x <= minScale) {
        lineMesh.scale.set(maxScale, maxScale, 1)
        // Reset opacity if fading
        // ...
      }
    })
  }

  // --- Render ---
  renderer.render(scene, camera)
}

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
export { createOrbitScene, updateOrbitParameters }
