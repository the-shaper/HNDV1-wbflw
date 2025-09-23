import * as THREE from 'three'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import modesDataFromFile from './auroraSettings.json'

export function initializeAuroraVisualization(options = {}) {
  const { containerSelector = 'body', createCanvas = false } = options

  // Get the target container
  const targetContainer =
    containerSelector === 'body'
      ? document.body
      : document.querySelector(containerSelector)

  if (!targetContainer) {
    console.warn(`Container not found: ${containerSelector}`)
    return
  }

  // --- Scene Setup ---
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )
  camera.position.z = 1.5

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)

  // Append to target container instead of body
  targetContainer.appendChild(renderer.domElement)

  // Make sure the canvas fills the container properly
  renderer.domElement.style.position = 'absolute'
  renderer.domElement.style.top = '0'
  renderer.domElement.style.left = '0'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'

  const globalControls = {
    enableAurora: true,
    enableWaveform1: true,
    enableWaveform2: true,
    enableInteractiveAurora: true,
    syncToWaveform: true,
  }

  const guiColorParams = {
    bgColor: '#EDF7EE',
    auroraColor1: '#0aff26',
    auroraColor2: '#4b00a6',
    waveform1Color: '#000000',
    waveform2Color: '#85daff',
    interactiveAuroraColor1: '#ff8800',
    interactiveAuroraColor2: '#ff0055',
  }
  renderer.setClearColor(guiColorParams.bgColor)

  // --- Zoom Control Variable ---
  const zoomSpeed = 0.1 // Determines how fast the zoom changes
  const minZoom = 0.5 // Closest zoom level
  const maxZoom = 5.0 // Furthest zoom level

  // --- Camera Controls for GUI ---
  const cameraControls = {
    zoom: camera.position.z, // Initialize with current camera Z position
  }

  // --- Uniforms ---
  const uniformsWaveform1 = {
    uTime: { value: 0.0 },
    uWaveFrequency: { value: 50.0 },
    uWaveAmplitude: { value: 0.01 },
    uWaveSpeed: { value: 1.0 },
    uGlowSize: { value: 0.001 },
    uWaveThickness: { value: 0.01 },
    uFringeAmount: { value: 0.45 },
    uWaveColor: { value: new THREE.Color(guiColorParams.waveform1Color) },
    uResolution: {
      value: new THREE.Vector2(window.innerWidth, window.innerHeight),
    },
  }
  const uniformsWaveform2 = {
    uTime: { value: 0.0 },
    uWaveFrequency: { value: 6.5 },
    uWaveAmplitude: { value: 0.01 },
    uWaveSpeed: { value: -0.8 },
    uGlowSize: { value: 0.002 },
    uWaveThickness: { value: 0.004 },
    uFringeAmount: { value: 0.1 },
    uWaveColor: { value: new THREE.Color(guiColorParams.waveform2Color) },
    uResolution: {
      value: new THREE.Vector2(window.innerWidth, window.innerHeight),
    },
  }
  const uniformsAurora = {
    uTime: { value: 0.0 },
    uFrequency: { value: 2.9 },
    uSolarWind: { value: 4.2 },
    uVisibility: { value: 0.58 },
    uPositionY: { value: 0.5 },
    uAuroraHeight: { value: 0.23 },
    uAuroraHeightVariation: { value: 0.0 },
    uAuroraCurveBias: { value: 5.0 },
    uAuroraSparsity: { value: 0.11 },
    uRayOscillation: { value: 0.0 },
    uEmanationSpeed: { value: 0.1 },
    uColor1: { value: new THREE.Color(guiColorParams.auroraColor1) },
    uColor2: { value: new THREE.Color(guiColorParams.auroraColor2) },
    uResolution: {
      value: new THREE.Vector2(window.innerWidth, window.innerHeight),
    },
    uSyncToWaveform: { value: globalControls.syncToWaveform },
    uSyncWaveFrequency: { value: uniformsWaveform1.uWaveFrequency.value },
    uSyncWaveAmplitude: { value: uniformsWaveform1.uWaveAmplitude.value },
    uSyncWaveSpeed: { value: uniformsWaveform1.uWaveSpeed.value },
  }

  const uniformsInteractiveAurora = {
    uTime: { value: 0.0 },
    uFrequency: { value: 10.0 },
    uSolarWind: { value: 5.0 },
    uVisibility: { value: 1.0 },
    uPositionY: { value: 0.5 },
    uAuroraHeight: { value: 0.2 },
    uRayOscillation: { value: 0.02 },
    uColor1: {
      value: new THREE.Color(guiColorParams.interactiveAuroraColor1),
    },
    uColor2: {
      value: new THREE.Color(guiColorParams.interactiveAuroraColor2),
    },
    uResolution: {
      value: new THREE.Vector2(window.innerWidth, window.innerHeight),
    },
    uMousePos: { value: new THREE.Vector2(0.5, 0.5) },
    uMouseActive: { value: false },
    uFocusWidth: { value: 0.2 },
  }

  // --- Materials & Meshes ---
  const auroraMaterial = new THREE.ShaderMaterial({
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: document.getElementById('fragmentShaderAurora').textContent,
    uniforms: uniformsAurora,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const auroraPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 2, 32, 32),
    auroraMaterial
  )
  scene.add(auroraPlane)

  const waveformMaterial1 = new THREE.ShaderMaterial({
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: document.getElementById('fragmentShaderWaveform')
      .textContent,
    uniforms: uniformsWaveform1,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const waveformPlane1 = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 2, 32, 32),
    waveformMaterial1
  )
  scene.add(waveformPlane1)

  const waveformMaterial2 = new THREE.ShaderMaterial({
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: document.getElementById('fragmentShaderWaveform')
      .textContent,
    uniforms: uniformsWaveform2,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const waveformPlane2 = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 2, 32, 32),
    waveformMaterial2
  )
  scene.add(waveformPlane2)

  const interactiveAuroraMaterial = new THREE.ShaderMaterial({
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: document.getElementById('fragmentShaderInteractiveAurora')
      .textContent,
    uniforms: uniformsInteractiveAurora,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const interactiveAuroraPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 2, 32, 32),
    interactiveAuroraMaterial
  )
  scene.add(interactiveAuroraPlane)

  // --- GUI Setup ---
  const gui = new GUI()
  gui.title('Master Controls')
  gui
    .add(globalControls, 'enableAurora')
    .name('Enable Aurora')
    .onChange((v) => (auroraPlane.visible = v))
  gui
    .add(globalControls, 'enableWaveform1')
    .name('Enable Waveform 1')
    .onChange((v) => (waveformPlane1.visible = v))
  gui
    .add(globalControls, 'enableWaveform2')
    .name('Enable Waveform 2')
    .onChange((v) => (waveformPlane2.visible = v))
  gui
    .add(globalControls, 'enableInteractiveAurora')
    .name('Enable Interactive Aurora')
    .onChange((v) => (interactiveAuroraPlane.visible = v))

  // --- Add Camera Zoom to Master Controls ---
  gui
    .add(cameraControls, 'zoom', minZoom, maxZoom, 0.01)
    .name('Camera Zoom')
    .onChange((value) => {
      camera.position.z = value
    })

  const auroraFolder = gui.addFolder('Aurora Controls')
  const positionController = auroraFolder
    .add(uniformsAurora.uPositionY, 'value', 0.0, 1.0, 0.01)
    .name('Vertical Position')
  auroraFolder
    .add(uniformsAurora.uSolarWind, 'value', 0.1, 10.0, 0.1)
    .name('Solar Wind Speed')
  auroraFolder
    .add(uniformsAurora.uEmanationSpeed, 'value', 0.1, 2.0, 0.01)
    .name('Emanation Speed')
  auroraFolder
    .add(uniformsAurora.uFrequency, 'value', 0.1, 10.0, 0.1)
    .name('Ray Density')
  auroraFolder
    .add(uniformsAurora.uVisibility, 'value', 0.0, 1.0, 0.01)
    .name('Visibility')
  auroraFolder
    .add(uniformsAurora.uAuroraHeight, 'value', 0.05, 1.0, 0.01)
    .name('Height')
  auroraFolder
    .add(uniformsAurora.uAuroraHeightVariation, 'value', 0.0, 1.0, 0.01)
    .name('Height Variation')
  auroraFolder
    .add(uniformsAurora.uAuroraCurveBias, 'value', 0.1, 5.0, 0.01)
    .name('Height Curve Bias')
  auroraFolder
    .add(uniformsAurora.uAuroraSparsity, 'value', 0.0, 1.0, 0.01)
    .name('Sparsity')
  auroraFolder
    .add(uniformsAurora.uRayOscillation, 'value', 0.0, 0.5, 0.001)
    .name('Ray Oscillation')
  auroraFolder
    .addColor(guiColorParams, 'auroraColor1')
    .name('Primary Color')
    .onChange((v) => uniformsAurora.uColor1.value.set(v))
  auroraFolder
    .addColor(guiColorParams, 'auroraColor2')
    .name('Secondary Color')
    .onChange((v) => uniformsAurora.uColor2.value.set(v))

  const waveformFolder1 = gui.addFolder('Waveform 1 Controls')
  waveformFolder1
    .add(uniformsWaveform1.uWaveSpeed, 'value', -5.0, 5.0, 0.1)
    .name('Speed')
    .onChange((v) => {
      uniformsAurora.uSyncWaveSpeed.value = v
    })
  waveformFolder1
    .add(uniformsWaveform1.uWaveFrequency, 'value', 1, 50, 0.5)
    .name('Frequency')
    .onChange((v) => {
      uniformsAurora.uSyncWaveFrequency.value = v
    })
  waveformFolder1
    .add(uniformsWaveform1.uWaveAmplitude, 'value', 0.01, 0.5, 0.01)
    .name('Amplitude')
    .onChange((v) => {
      uniformsAurora.uSyncWaveAmplitude.value = v
    })
  waveformFolder1
    .add(uniformsWaveform1.uGlowSize, 'value', 0.001, 0.2, 0.001)
    .name('Glow Size')
  waveformFolder1
    .add(uniformsWaveform1.uWaveThickness, 'value', 0.0, 0.1, 0.001)
    .name('Thickness Variation')
  waveformFolder1
    .add(uniformsWaveform1.uFringeAmount, 'value', 0.0, 5.0, 0.01)
    .name('Fringe Amount')
  waveformFolder1
    .addColor(guiColorParams, 'waveform1Color')
    .name('Color')
    .onChange((v) => uniformsWaveform1.uWaveColor.value.set(v))

  const waveformFolder2 = gui.addFolder('Waveform 2 Controls')
  waveformFolder2
    .add(uniformsWaveform2.uWaveSpeed, 'value', -5.0, 5.0, 0.1)
    .name('Speed')
  waveformFolder2
    .add(uniformsWaveform2.uWaveFrequency, 'value', 1, 50, 0.5)
    .name('Frequency')
  waveformFolder2
    .add(uniformsWaveform2.uWaveAmplitude, 'value', 0.01, 0.5, 0.01)
    .name('Amplitude')
  waveformFolder2
    .add(uniformsWaveform2.uGlowSize, 'value', 0.001, 0.2, 0.001)
    .name('Glow Size')
  waveformFolder2
    .add(uniformsWaveform2.uWaveThickness, 'value', 0.0, 0.1, 0.001)
    .name('Thickness Variation')
  waveformFolder2
    .add(uniformsWaveform2.uFringeAmount, 'value', 0.0, 5.0, 0.01)
    .name('Fringe Amount')
  waveformFolder2
    .addColor(guiColorParams, 'waveform2Color')
    .name('Color')
    .onChange((v) => uniformsWaveform2.uWaveColor.value.set(v))

  const interactiveAuroraFolder = gui.addFolder('Interactive Aurora Controls')
  interactiveAuroraFolder
    .add(uniformsInteractiveAurora.uFocusWidth, 'value', 0.01, 0.5, 0.001)
    .name('Focus Width')
  interactiveAuroraFolder
    .add(uniformsInteractiveAurora.uPositionY, 'value', 0.0, 1.0, 0.01)
    .name('Vertical Position')
  interactiveAuroraFolder
    .add(uniformsInteractiveAurora.uSolarWind, 'value', 0.1, 10.0, 0.1)
    .name('Flicker Speed')
  interactiveAuroraFolder
    .add(uniformsInteractiveAurora.uFrequency, 'value', 0.1, 20.0, 0.1)
    .name('Ray Density')
  interactiveAuroraFolder
    .add(uniformsInteractiveAurora.uVisibility, 'value', 0.0, 1.0, 0.01)
    .name('Visibility')
  interactiveAuroraFolder
    .add(uniformsInteractiveAurora.uAuroraHeight, 'value', 0.05, 1.0, 0.01)
    .name('Height')
  interactiveAuroraFolder
    .add(uniformsInteractiveAurora.uRayOscillation, 'value', 0.0, 0.5, 0.001)
    .name('Ray Oscillation')
  interactiveAuroraFolder
    .addColor(guiColorParams, 'interactiveAuroraColor1')
    .name('Primary Color')
    .onChange((v) => uniformsInteractiveAurora.uColor1.value.set(v))
  interactiveAuroraFolder
    .addColor(guiColorParams, 'interactiveAuroraColor2')
    .name('Secondary Color')
    .onChange((v) => uniformsInteractiveAurora.uColor2.value.set(v))

  gui
    .add(globalControls, 'syncToWaveform')
    .name('Sync Aurora to Waveform 1')
    .onChange((v) => {
      uniformsAurora.uSyncToWaveform.value = v
      positionController.enable(!v)
    })

  positionController.enable(!globalControls.syncToWaveform)

  gui
    .addColor(guiColorParams, 'bgColor')
    .name('Background Color')
    .onChange((value) => {
      renderer.setClearColor(new THREE.Color(value))
      document.body.style.backgroundColor = value
    })

  // --- Mouse Interaction Logic ---
  renderer.domElement.addEventListener('mousemove', (event) => {
    uniformsInteractiveAurora.uMousePos.value.x =
      event.clientX / window.innerWidth
    uniformsInteractiveAurora.uMousePos.value.y =
      1.0 - event.clientY / window.innerHeight
  })
  renderer.domElement.addEventListener('mouseenter', () => {
    uniformsInteractiveAurora.uMouseActive.value = true
  })
  renderer.domElement.addEventListener('mouseleave', () => {
    uniformsInteractiveAurora.uMouseActive.value = false
  })

  // --- Mouse Wheel Zoom Control ---
  renderer.domElement.addEventListener('wheel', (event) => {
    event.preventDefault() // Prevent page scrolling

    if (event.deltaY < 0) {
      // Scrolling up (zoom in)
      camera.position.z = Math.max(minZoom, camera.position.z - zoomSpeed)
    } else {
      // Scrolling down (zoom out)
      camera.position.z = Math.min(maxZoom, camera.position.z + zoomSpeed)
    }
  })

  // --- Core Logic ---
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight)
    uniformsAurora.uResolution.value = resolution
    uniformsWaveform1.uResolution.value = resolution
    uniformsWaveform2.uResolution.value = resolution
    uniformsInteractiveAurora.uResolution.value = resolution
  }

  window.addEventListener('resize', onWindowResize, false)

  const clock = new THREE.Clock()
  function animate() {
    requestAnimationFrame(animate)
    const elapsedTime = clock.getElapsedTime()
    uniformsAurora.uTime.value = elapsedTime
    uniformsWaveform1.uTime.value = elapsedTime
    uniformsWaveform2.uTime.value = elapsedTime
    uniformsInteractiveAurora.uTime.value = elapsedTime
    renderer.render(scene, camera)
  }

  animate()

  // ----------------------------------------------------------
  // Register this first-created instance as the central context
  // ----------------------------------------------------------
  if (!__mainAuroraContext) {
    __mainAuroraContext = {
      uniformsAurora,
      uniformsWaveform1,
      guiColorParams,
      globalControls,
      waveformPlane1,
    }
    attachExternalModeControls()
  }

  // Return cleanup function
  return {
    destroy: () => {
      window.removeEventListener('resize', onWindowResize)
      targetContainer.removeChild(renderer.domElement)
      gui.destroy()
    },
  }
}

// ----------  NEW  :  load / manage mode presets  ----------
const defaultMode = {
  auroraFrequency: 2.0,
  auroraSolarWind: 1.0,
  auroraVisibility: 1.0,
  auroraPositionY: 0.5,
  auroraHeight: 0.3,
  auroraColor1: '#00ff88',
  auroraColor2: '#ff0044',
  waveformVisible: true,
  waveFrequency: 8.0,
  waveAmplitude: 0.15,
  waveSpeed: 2.0,
  waveColor: '#ffffff',
}

let savedModes = {
  A: { ...defaultMode, ...(modesDataFromFile.A || {}) },
  B: { ...defaultMode, ...(modesDataFromFile.B || {}) },
}

// Internal single-source context (first initialised instance)
let __mainAuroraContext = null
let __auroraControlsAttached = false

// ---------------  NEW  helper block (place near end of file) ----------------
function triggerFileDownload(filename, text) {
  const blob = new Blob([text], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
}

function getCurrentSettings() {
  const c = __mainAuroraContext
  if (!c) return { ...defaultMode }
  return {
    auroraFrequency: c.uniformsAurora.uFrequency.value,
    auroraSolarWind: c.uniformsAurora.uSolarWind.value,
    auroraVisibility: c.uniformsAurora.uVisibility.value,
    auroraPositionY: c.uniformsAurora.uPositionY.value,
    auroraHeight: c.uniformsAurora.uAuroraHeight.value,
    auroraColor1: c.guiColorParams.auroraColor1,
    auroraColor2: c.guiColorParams.auroraColor2,
    waveformVisible: c.globalControls.enableWaveform1,
    waveFrequency: c.uniformsWaveform1.uWaveFrequency.value,
    waveAmplitude: c.uniformsWaveform1.uWaveAmplitude.value,
    waveSpeed: c.uniformsWaveform1.uWaveSpeed.value,
    waveColor: c.guiColorParams.waveform1Color,
  }
}

function applySettings(s) {
  const c = __mainAuroraContext
  if (!c || !s) return
  c.uniformsAurora.uFrequency.value = s.auroraFrequency
  c.uniformsAurora.uSolarWind.value = s.auroraSolarWind
  c.uniformsAurora.uVisibility.value = s.auroraVisibility
  c.uniformsAurora.uPositionY.value = s.auroraPositionY
  c.uniformsAurora.uAuroraHeight.value = s.auroraHeight
  c.uniformsAurora.uColor1.value.set(s.auroraColor1)
  c.uniformsAurora.uColor2.value.set(s.auroraColor2)

  c.globalControls.enableWaveform1 = !!s.waveformVisible
  c.waveformPlane1.visible = c.globalControls.enableWaveform1

  c.uniformsWaveform1.uWaveFrequency.value = s.waveFrequency
  c.uniformsWaveform1.uWaveAmplitude.value = s.waveAmplitude
  c.uniformsWaveform1.uWaveSpeed.value = s.waveSpeed
  c.uniformsWaveform1.uWaveColor.value.set(s.waveColor)

  // keep GUI colour pickers in sync
  c.guiColorParams.auroraColor1 = s.auroraColor1
  c.guiColorParams.auroraColor2 = s.auroraColor2
  c.guiColorParams.waveform1Color = s.waveColor
}

function attachExternalModeControls() {
  if (__auroraControlsAttached) return
  __auroraControlsAttached = true

  const btnSetA = document.getElementById('setCurrentAsModeA')
  const btnSetB = document.getElementById('setCurrentAsModeB')
  const btnSelA = document.getElementById('selectModeA')
  const btnSelB = document.getElementById('selectModeB')
  const btnSave = document.getElementById('saveAllModes')
  const btnToggleInfoPanel = document.getElementById('toggleInfoPanel')

  btnSetA?.addEventListener('click', () => {
    savedModes.A = { ...defaultMode, ...getCurrentSettings() }
    alert('Current values stored as Mode A (session only).')
  })

  btnSetB?.addEventListener('click', () => {
    savedModes.B = { ...defaultMode, ...getCurrentSettings() }
    alert('Current values stored as Mode B (session only).')
  })

  btnSelA?.addEventListener('click', () => applySettings(savedModes.A))
  btnSelB?.addEventListener('click', () => applySettings(savedModes.B))

  btnSave?.addEventListener('click', () => {
    triggerFileDownload(
      'auroraSettings.json',
      JSON.stringify(savedModes, null, 2)
    )
    alert(
      'A fresh auroraSettings.json has been downloaded – replace the one in your project to make these modes permanent.'
    )
  })

  btnToggleInfoPanel?.addEventListener('click', () => {
    const infoPanel = document.getElementById('info')
    if (infoPanel) {
      infoPanel.classList.toggle('collapsed')
    }
  })
}
// --------------------  end helper block  --------------------
