console.log('[TwilightFringe] Script file loaded successfully!')
import * as THREE from 'three'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

// Add logging prefix for easy identification
const LOG_PREFIX = '[TwilightFringe]'

// Clamp the renderer pixel ratio – global constant
const MAX_PIXEL_RATIO = 1.5

// --- Global PNG load signaling ---
const TF_GLOBAL = (window.__twilightFringe = window.__twilightFringe || {
  pngStatus: 'pending',
  pngNotified: false,
})

function notifyPngStatus(status, detail = {}) {
  if (status === 'ready' && TF_GLOBAL.pngNotified) return
  TF_GLOBAL.pngStatus = status
  if (status === 'ready') TF_GLOBAL.pngNotified = true
  const eventName =
    status === 'ready'
      ? 'twilightFringe:pngReady'
      : status === 'failed'
      ? 'twilightFringe:pngFailed'
      : status === 'skipped'
      ? 'twilightFringe:pngSkipped'
      : 'twilightFringe:pngStatus'
  window.dispatchEvent(new CustomEvent(eventName, { detail }))
}

// Minimal fallback settings (only used if JSON loading fails completely)
const fallbackSettings = {
  showGUI: false,
  showMainEffect: true,
  showPng: true,
  pngImagePath: '',
  backgroundColor: '#313e3f',
  speed: 0.1,
  magnitude: 0.0,
  lacunarity: 1.8,
  gain: 1.0,
  noiseScaleX: 0.1,
  noiseScaleY: 0.2,
  noiseScaleZ: 0.3,
  wireframe: false,
  edgeColor: '#0e8684',
  midColor: '#172021',
  coreColor: '#161a27',
  colorBias: 0.73,
  alphaBias: 0.78,
  alphaPower: 9.3,
  blending: 'Normal',
  glowEnabled: true,
  glowThreshold: 0.1,
  glowStrength: 0.44,
  glowRadius: 0.0,
  fresnelEnabled: true,
  fresnelColor: '#ffffff',
  fresnelIntensity: 1.0,
  fresnelPower: 2.0,
  liquidEnabled: false, // DEFAULT OFF – we will enable it only if explicitly requested
  liquidAmount: 0.01,
  liquidSpeed: 0.3,
  liquidFrequency: 4.0,
  mouseEnabled: true,
  mouseRadius: 0.2,
  mouseIntensity: 0.05,
  mouseFringeIntensity: 5.0, // New setting for interactive fringe strength
  imageVisible: true,
  imageSize: 2.0,
  imageSizeTablet: 1.6,
  imageSizeMobileHorizontal: 1.3,
  imageSizeMobileVertical: 1.1,
  meshVisible: true,
  fringeAmount: 0.005,
  liquidFlow: 'Static',
  imageBrightness: 1.0,
  imageContrast: 1.0,
  imagePositionX: 0.0,
  imagePositionY: 0.0,

  // --- NEW: Main mesh transform defaults ---
  meshScale: 1.0,
  meshScaleX: 1.0,
  meshScaleY: 1.0,
  meshScaleZ: 1.0,
  meshPositionX: 0.0,
  meshPositionY: 0.0,
  meshPositionZ: 0.0,

  // Settings for the new, optimized liquid effect
  optimizedLiquidEnabled: false,
  optimizedLiquidSpeed: 0.3,
  optimizedLiquidFrequency: 4.0,
  optimizedLiquidAmount: 0.05,

  // Flow direction for optimized liquid
  optimizedLiquidFlow: 'Static',

  // --- Diffuse (blur + noise) layer defaults ---
  diffuseEnabled: false,
  diffuseBlur: 1.0, // blur intensity (pixel radius units)
  diffuseNoise: 0.05, // legacy noise intensity (mapped to grainAmount)

  // Grain (noise) new parameters
  grainSize: 1.0, // size of grain in pixels
  grainAmount: 0.05, // magnitude of grain displacement
  grainOpacity: 1.0, // blending factor of grain effect

  // Radial wave parameters for optimized liquid
  radialWaveFrequency: 20.0,
  radialWaveSpeed: 1.0,
  radialWaveAmplitude: 0.04,
}

// Load settings from JSON with multiple path attempts
async function loadDefaultSettings() {
  // Determine if we're in production or development
  const isProduction =
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1')

  const baseUrl = isProduction ? 'https://twilight-fringe.vercel.app/' : '/'

  const possiblePaths = [
    `${baseUrl}twilightModes.json`,
    `${baseUrl}src/features/tf-home-v2/twilightModes.json`,
    './twilightModes.json',
    './src/features/tf-home-v2/twilightModes.json',
    '/src/features/tf-home-v2/twilightModes.json',
    'twilightModes.json',
    // Add the current script's directory relative path
    new URL('./twilightModes.json', import.meta.url).href,
  ]

  console.log(
    `${LOG_PREFIX} Attempting to load settings from multiple paths...`
  )

  for (const path of possiblePaths) {
    try {
      console.log(`${LOG_PREFIX} Trying to load from: ${path}`)
      const response = await fetch(path)
      if (response.ok) {
        const modes = await response.json()
        const defaultSettings = {
          ...fallbackSettings,
          ...(modes.default || {}),
        }
        console.log(`${LOG_PREFIX} Successfully loaded settings from: ${path}`)
        console.log(`${LOG_PREFIX} Loaded settings:`, defaultSettings)
        return defaultSettings
      } else {
        console.log(
          `${LOG_PREFIX} Failed to load from ${path}: ${response.status}`
        )
      }
    } catch (error) {
      console.log(`${LOG_PREFIX} Error loading from ${path}:`, error.message)
    }
  }

  console.warn(`${LOG_PREFIX} All paths failed, using fallback settings`)
  return fallbackSettings
}

// --- Helper to read settings from data attributes ---
function readSettingsFromDOM(containerEl) {
  if (!containerEl || !containerEl.dataset) return {}

  const settings = {}
  const data = containerEl.dataset

  const toCamelCase = (str) =>
    str.replace(/-([a-z])/g, (g) => g[1].toUpperCase())

  for (const key in data) {
    const camelKey = toCamelCase(key)
    if (fallbackSettings.hasOwnProperty(camelKey)) {
      const value = data[key]
      const defaultValue = fallbackSettings[camelKey]

      if (typeof defaultValue === 'number') {
        settings[camelKey] = parseFloat(value)
      } else if (typeof defaultValue === 'boolean') {
        settings[camelKey] = value === 'true'
      } else {
        settings[camelKey] = value
      }
    }
  }
  return settings
}

// --- Responsive Image Size Helpers (following serviceselect.js pattern) ---
function getResponsiveImageSize(settings) {
  if (window.matchMedia('(max-width: 430px)').matches) {
    return settings.imageSizeMobileVertical
  }

  if (window.matchMedia('(max-width: 568px)').matches) {
    return settings.imageSizeMobileHorizontal
  }

  if (window.matchMedia('(max-width: 1024px)').matches) {
    return settings.imageSizeTablet
  }

  return settings.imageSize
}

// --- GLSL Shaders (inlined so no HTML <script> tags are needed) ---
const NOISE_SHADER_CHUNK = `
// Perlin Noise (unchanged)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857; // 1/7
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}
`

const OPTIMIZED_LIQUID_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const OPTIMIZED_LIQUID_FRAGMENT_SHADER = `
  uniform sampler2D tDiffuse;
  uniform float uTime;
  uniform float uOptLiquidSpeed;
  uniform float uOptLiquidFrequency;
  uniform float uOptLiquidAmount;
  uniform float uFringeAmount;
  uniform vec2 uMouse;
  uniform float uMouseEnabled;
  uniform float uMouseRadius;
  uniform float uMouseIntensity;
  uniform float uMouseFringeIntensity; // New uniform for fringe strength
  uniform int uMouseType;
  uniform vec2 uFlowDirection;
  uniform int uFlowMode; // 0 = linear, 1 = radial-drift, 2 = radial-wave
  uniform float uWaveFreq;
  uniform float uWaveSpeed;
  uniform float uWaveAmp;
  varying vec2 vUv;

  ${NOISE_SHADER_CHUNK}

  void main() {
    // Ambient, animated distortion with flow offset (linear or radial)
    float t = uTime * uOptLiquidSpeed * 0.1;
    vec2 flowOffset;
    if (uFlowMode == 0) {
        flowOffset = uFlowDirection * t;
    } else if (uFlowMode == 1) {
        vec2 dir = normalize(vUv - vec2(0.5));
        flowOffset = dir * t;
    } else {
        vec2 dir = normalize(vUv - vec2(0.5));
        float r = length(vUv - vec2(0.5));
        float wave = sin(r * uWaveFreq - uTime * uWaveSpeed) * uWaveAmp;
        flowOffset = dir * wave;
    }
    vec3 noisePos = vec3((vUv + flowOffset) * uOptLiquidFrequency, uTime * uOptLiquidSpeed);
    float noiseX = snoise(noisePos);
    float noiseY = snoise(noisePos + vec3(15.7, 83.2, 45.9));
    vec2 ambientDistortion = vec2(noiseX, noiseY) * uOptLiquidAmount;

    // Mouse-based distortion
    vec2 mouseDistortion = vec2(0.0);
    float dynamicFringe = uFringeAmount; // Start with the base fringe amount

    if (uMouseEnabled > 0.5) {
        float mouseDist = distance(vUv, uMouse);
        float ripple = 1.0 - smoothstep(0.0, uMouseRadius, mouseDist);

        // Make the fringe more intense based on the ripple and the new intensity uniform.
        dynamicFringe += ripple * uMouseIntensity * uMouseFringeIntensity;

        if (uMouseType == 0) { // Ripple / Push
            vec2 direction = normalize(vUv - uMouse);
            mouseDistortion = direction * ripple * uMouseIntensity;
        } else { // Vortex / Swirl
            vec2 direction = normalize(vUv - uMouse);
            vec2 perpendicular = vec2(-direction.y, direction.x);
            mouseDistortion = perpendicular * ripple * uMouseIntensity;
        }
    }

    // Combine ambient and mouse distortions
    vec2 totalDistortion = ambientDistortion + mouseDistortion;

    // Apply the final distortion with the DYNAMIC fringe
    float r = texture2D(tDiffuse, vUv + totalDistortion + vec2(dynamicFringe, 0.0)).r;
    vec4 colorG = texture2D(tDiffuse, vUv + totalDistortion);
    float b = texture2D(tDiffuse, vUv + totalDistortion - vec2(dynamicFringe, 0.0)).b;

    gl_FragColor = vec4(r, colorG.g, b, colorG.a);
  }
`

const VERTEX_SHADER_SOURCE = `
uniform float uTime;
uniform float uSpeed;
uniform float uMagnitude;
uniform float uLacunarity;
uniform float uGain;
uniform vec3 uNoiseScale;
varying float vNoise;
varying float vFresnel;

float fbm(vec3 p) {
    float total = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    for (int i = 0; i < 5; i++) {
        total += snoise(p * frequency) * amplitude;
        frequency *= uLacunarity;
        amplitude *= uGain;
    }
    return total;
}

void main() {
    vec3 noisePos = position * uNoiseScale;
    noisePos.y += uTime * uSpeed;
    float noise = fbm(noisePos);
    float displacementAmount = pow(position.y * 0.5 + 0.5, 2.0);
    vec3 displacement = normal * noise * uMagnitude * displacementAmount;
    vec3 newPosition = position + displacement;
    vec4 worldPosition = modelMatrix * vec4(newPosition, 1.0);
    vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
    vec3 viewDirection = normalize(cameraPosition - worldPosition.xyz);
    vFresnel = 1.0 - dot(viewDirection, worldNormal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
    vNoise = noise;
}`

const FRAGMENT_SHADER_SOURCE = `
uniform vec3 uEdgeColor;
uniform vec3 uMidColor;
uniform vec3 uCoreColor;
uniform float uColorBias;
uniform float uAlphaBias;
uniform float uAlphaPower;
uniform float uFresnelEnabled;
uniform vec3 uFresnelColor;
uniform float uFresnelIntensity;
uniform float uFresnelPower;
varying float vNoise;
varying float vFresnel;

void main() {
    float intensity = smoothstep(-0.5, 1.0, vNoise);
    vec3 color_a = mix(uEdgeColor, uMidColor, smoothstep(0.0, uColorBias, intensity));
    vec3 color_b = mix(uMidColor, uCoreColor, smoothstep(uColorBias, 1.0, intensity));
    vec3 color = mix(color_a, color_b, step(uColorBias, intensity));
    float fresnelFactor = pow(vFresnel, uFresnelPower) * uFresnelIntensity;
    vec3 finalColor = mix(color, uFresnelColor, fresnelFactor * uFresnelEnabled);
    float alpha = pow(clamp(intensity + uAlphaBias, 0.0, 1.0), uAlphaPower);
    gl_FragColor = vec4(finalColor, alpha);
}`

export async function createTwilightFringe(containerEl, options = {}) {
  console.log(`${LOG_PREFIX} createTwilightFringe called with:`, {
    containerEl,
    containerTagName: containerEl?.tagName,
    containerClasses: containerEl?.className,
    containerId: containerEl?.id,
    options,
  })

  if (!containerEl) {
    console.error(`${LOG_PREFIX} Invalid container element provided.`)
    return
  }

  if (containerEl.tagName.toLowerCase() === 'canvas') {
    console.error(
      `${LOG_PREFIX} The container element cannot be a <canvas>. Please use a <div> or another container element. Initialization aborted for this element.`
    )
    return
  }

  console.log(`${LOG_PREFIX} Container element validated successfully`)

  // --- State variables ---
  let gui = null
  let fileInput = null
  let onMouseMove, onResize, onVisibilityChange

  // Load default settings from JSON
  const defaultSettings = await loadDefaultSettings()
  const attributeSettings = readSettingsFromDOM(containerEl)

  // Merge settings: JSON defaults < attributes < options
  const settings = {
    ...defaultSettings,
    ...attributeSettings,
    ...options,
  }
  // Backward compatibility: populate per-axis scale if missing
  if (settings.meshScaleX === undefined)
    settings.meshScaleX = settings.meshScale
  if (settings.meshScaleY === undefined)
    settings.meshScaleY = settings.meshScale
  if (settings.meshScaleZ === undefined)
    settings.meshScaleZ = settings.meshScale
  // Backward compatibility: map legacy diffuseNoise to new grainAmount
  if (
    settings.grainAmount === undefined &&
    settings.diffuseNoise !== undefined
  ) {
    settings.grainAmount = settings.diffuseNoise
  }
  // Ensure liquid & optimised passes are mutually exclusive by default
  if (settings.optimizedLiquidEnabled && settings.liquidEnabled) {
    settings.liquidEnabled = false
  }
  console.log(`${LOG_PREFIX} Final settings:`, settings)

  // Performance tracking
  let isAnimating = false
  let animationId = null
  const clock = new THREE.Clock()
  let lastFrameTime = 0
  const targetFPS = 60
  const frameTime = 1000 / targetFPS

  console.log(`${LOG_PREFIX} Creating Three.js scene...`)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )
  camera.position.z = 3

  console.log(`${LOG_PREFIX} Creating WebGL renderer...`)
  const pixelRatio = Math.min(window.devicePixelRatio, 2) // Cap at 2x for high DPI
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    precision: 'mediump', // Use lower precision for better performance
  })
  renderer.setPixelRatio(pixelRatio)
  renderer.setSize(containerEl.clientWidth, containerEl.clientHeight, false)

  // Container styling with logging
  console.log(`${LOG_PREFIX} Setting up container styling...`)
  const containerStyle = window.getComputedStyle(containerEl)
  console.log(`${LOG_PREFIX} Container computed style:`, {
    position: containerStyle.position,
    width: containerStyle.width,
    height: containerStyle.height,
    display: containerStyle.display,
    visibility: containerStyle.visibility,
  })

  if (containerStyle.position === 'static') {
    console.log(`${LOG_PREFIX} Setting container position to relative`)
    containerEl.style.position = 'relative'
  }
  containerEl.style.overflow = 'hidden'

  console.log(`${LOG_PREFIX} Appending canvas to container...`)
  containerEl.appendChild(renderer.domElement)
  renderer.domElement.style.cssText =
    'position:absolute;top:0;left:0;width:100%;height:100%;'

  console.log(
    `${LOG_PREFIX} Canvas appended successfully. Canvas dimensions:`,
    {
      width: renderer.domElement.width,
      height: renderer.domElement.height,
      clientWidth: renderer.domElement.clientWidth,
      clientHeight: renderer.domElement.clientHeight,
    }
  )

  // The 'loadImage' function is now handled by the GUI controller below.
  if (settings.showGUI) {
    // This setup allows the GUI to trigger a file input dialog.
    fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'image/png'
    fileInput.style.display = 'none'
    document.body.appendChild(fileInput)

    // The GUI's 'Load Image...' button will call this function.
    settings.loadImage = () => fileInput.click()

    // When a file is selected, load it as the new texture.
    fileInput.addEventListener('change', (event) => {
      if (event.target.files && event.target.files[0]) {
        const file = event.target.files[0]
        const reader = new FileReader()
        reader.onload = (e) => {
          loadPngImage(e.target.result)
        }
        reader.readAsDataURL(file)
      }
    })
  } else {
    settings.loadImage = () => {
      console.log('Image loading is only available when showGUI is true.')
    }
  }

  const blendingOptions = {
    Normal: THREE.NormalBlending,
    Additive: THREE.AdditiveBlending,
  }

  const flowDirections = {
    Static: new THREE.Vector2(0, 0),
    Up: new THREE.Vector2(0, 1),
    Down: new THREE.Vector2(0, -1),
    Left: new THREE.Vector2(-1, 0),
    Right: new THREE.Vector2(1, 0),
  }

  console.log(`${LOG_PREFIX} Creating geometry and material...`)
  const geometry = new THREE.IcosahedronGeometry(1, 64)
  const material = new THREE.ShaderMaterial({
    vertexShader: NOISE_SHADER_CHUNK + VERTEX_SHADER_SOURCE,
    fragmentShader: FRAGMENT_SHADER_SOURCE,
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: settings.speed },
      uMagnitude: { value: settings.magnitude },
      uLacunarity: { value: settings.lacunarity },
      uGain: { value: settings.gain },
      uNoiseScale: {
        value: new THREE.Vector3(
          settings.noiseScaleX,
          settings.noiseScaleY,
          settings.noiseScaleZ
        ),
      },
      uEdgeColor: { value: new THREE.Color(settings.edgeColor) },
      uMidColor: { value: new THREE.Color(settings.midColor) },
      uCoreColor: { value: new THREE.Color(settings.coreColor) },
      uColorBias: { value: settings.colorBias },
      uAlphaBias: { value: settings.alphaBias },
      uAlphaPower: { value: settings.alphaPower },
      uFresnelEnabled: { value: settings.fresnelEnabled ? 1.0 : 0.0 },
      uFresnelColor: { value: new THREE.Color(settings.fresnelColor) },
      uFresnelIntensity: { value: settings.fresnelIntensity },
      uFresnelPower: { value: settings.fresnelPower },
    },
    transparent: true,
    blending: blendingOptions[settings.blending],
    depthWrite: false,
  })

  const mainMesh = new THREE.Mesh(geometry, material)
  // Apply per-axis scale (values already defaulted above)
  mainMesh.scale.set(
    settings.meshScaleX,
    settings.meshScaleY,
    settings.meshScaleZ
  )
  mainMesh.position.set(
    settings.meshPositionX,
    settings.meshPositionY,
    settings.meshPositionZ
  )
  mainMesh.visible = settings.showMainEffect
  scene.add(mainMesh)
  console.log(
    `${LOG_PREFIX} Main mesh created and added to scene. Visible:`,
    settings.showMainEffect
  )

  // PNG Image handling
  let imagePlane = null
  let imageFolder = null
  let imageAspectRatio = 1.0
  const textureLoader = new THREE.TextureLoader()

  // Load PNG image if specified
  function loadPngImage(imagePath) {
    if (!imagePath || !settings.showPng) {
      console.log(`${LOG_PREFIX} No PNG image to load or showPng is false`)
      notifyPngStatus('skipped', {
        reason: !imagePath ? 'noPath' : 'showPngFalse',
      })
      return
    }

    // Determine if we're in production or development
    const isProduction =
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1')

    const baseUrl = isProduction ? 'https://twilight-fringe.vercel.app/' : '/'

    // A cleaned-up, non-redundant list of paths to try.
    const possibleImagePaths = [
      ...new Set(
        [
          imagePath,
          new URL(imagePath, import.meta.url).href,
          // Try with the production base URL for relative paths
          imagePath.startsWith('./')
            ? `${baseUrl}${imagePath.substring(2)}`
            : null,
          imagePath.startsWith('/')
            ? `${baseUrl}${imagePath.substring(1)}`
            : null,
          // Try specific known paths
          `${baseUrl}tf-bg-imgs/headbg.png`,
          `${baseUrl}src/features/tf-home-v2/tf-bg-imgs/headbg.png`,
        ].filter(Boolean)
      ),
    ]

    console.log(
      `${LOG_PREFIX} Attempting to load PNG from paths:`,
      possibleImagePaths
    )

    let currentPathIndex = 0

    function tryLoadImage() {
      if (currentPathIndex >= possibleImagePaths.length) {
        console.error(
          `${LOG_PREFIX} Failed to load image from all attempted paths`
        )
        notifyPngStatus('failed', { attempts: possibleImagePaths })
        return
      }

      const currentPath = possibleImagePaths[currentPathIndex]
      console.log(`${LOG_PREFIX} Trying to load PNG from: ${currentPath}`)

      textureLoader.load(
        currentPath,
        (texture) => {
          console.log(
            `${LOG_PREFIX} PNG image loaded successfully from: ${currentPath}`
          )
          texture.colorSpace = THREE.SRGBColorSpace
          imageAspectRatio = texture.image.width / texture.image.height

          if (imagePlane) {
            // Update existing plane
            const responsiveSize = getResponsiveImageSize(settings)
            imagePlane.material.uniforms.map.value = texture
            imagePlane.material.uniforms.brightness.value =
              settings.imageBrightness
            imagePlane.material.uniforms.contrast.value = settings.imageContrast
            imagePlane.position.set(
              settings.imagePositionX,
              settings.imagePositionY,
              1.5
            )
            imagePlane.scale.set(
              responsiveSize * imageAspectRatio,
              responsiveSize,
              1
            )
            imagePlane.material.needsUpdate = true
          } else {
            // Create new plane
            const responsiveSize = getResponsiveImageSize(settings)
            const planeGeo = new THREE.PlaneGeometry(1, 1)
            const planeMat = new THREE.ShaderMaterial({
              uniforms: {
                map: { value: texture },
                brightness: { value: settings.imageBrightness },
                contrast: { value: settings.imageContrast },
              },
              vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
              fragmentShader: `
                uniform sampler2D map;
                uniform float brightness;
                uniform float contrast;
                varying vec2 vUv;
                void main() {
                    vec4 texColor = texture2D(map, vUv);
                    texColor.rgb = (texColor.rgb - 0.5) * contrast + 0.5;
                    texColor.rgb *= brightness;
                    gl_FragColor = texColor;
                }
            `,
              transparent: true,
            })
            imagePlane = new THREE.Mesh(planeGeo, planeMat)
            imagePlane.position.set(
              settings.imagePositionX,
              settings.imagePositionY,
              1.5
            )
            imagePlane.scale.set(
              responsiveSize * imageAspectRatio,
              responsiveSize,
              1
            )
            imagePlane.visible = settings.showPng
            scene.add(imagePlane)
            console.log(
              `${LOG_PREFIX} PNG image plane created and added to scene`
            )
            if (settings.showGUI) {
              createImageGUI()
            }
          }
          // Signal PNG is ready (first ready wins due to guard)
          notifyPngStatus('ready', { path: currentPath })
        },
        undefined,
        (error) => {
          console.log(
            `${LOG_PREFIX} Failed to load from ${currentPath}:`,
            error.message
          )
          currentPathIndex++
          tryLoadImage() // Try next path
        }
      )
    }

    tryLoadImage()
  }

  // Load initial PNG image from settings
  if (settings.pngImagePath) {
    loadPngImage(settings.pngImagePath)
  }

  console.log(`${LOG_PREFIX} Setting up post-processing...`)
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))

  // ---------------- Diffuse (Blur + Noise) Pass ----------------
  const DiffuseShader = {
    uniforms: {
      tDiffuse: { value: null },
      uBlur: { value: settings.diffuseBlur },
      uGrainSize: { value: settings.grainSize },
      uGrainAmount: { value: settings.grainAmount },
      uGrainOpacity: { value: settings.grainOpacity },
      uResolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      },
    },
    vertexShader:
      'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader:
      `uniform sampler2D tDiffuse;\n` +
      `uniform float uBlur;\n` +
      `uniform float uGrainSize;\n` +
      `uniform float uGrainAmount;\n` +
      `uniform float uGrainOpacity;\n` +
      `uniform vec2 uResolution;\n` +
      `varying vec2 vUv;\n` +
      `\n` +
      `float random(in vec2 st) {\n` +
      `    return fract(sin(dot(st.xy ,vec2(12.9898,78.233))) * 43758.5453);\n` +
      `}\n` +
      `\n` +
      `void main(){\n` +
      `    vec2 texel = 1.0 / uResolution;\n` +
      `    float b = uBlur;\n` +
      `    vec4 col = texture2D(tDiffuse, vUv) * 0.2;\n` +
      `    col += texture2D(tDiffuse, vUv + vec2(texel.x * b, 0.0)) * 0.2;\n` +
      `    col += texture2D(tDiffuse, vUv - vec2(texel.x * b, 0.0)) * 0.2;\n` +
      `    col += texture2D(tDiffuse, vUv + vec2(0.0, texel.y * b)) * 0.2;\n` +
      `    col += texture2D(tDiffuse, vUv - vec2(0.0, texel.y * b)) * 0.2;\n` +
      `    vec2 grainCoord = floor(vUv * uResolution / uGrainSize);\n` +
      `    float n = (random(grainCoord) - 0.5) * uGrainAmount;\n` +
      `    col.rgb = mix(col.rgb, col.rgb + n, uGrainOpacity);\n` +
      `    gl_FragColor = col;\n` +
      `}`,
  }

  const diffusePass = new ShaderPass(DiffuseShader)
  diffusePass.enabled = settings.diffuseEnabled
  composer.addPass(diffusePass)

  const LiquidShader = {
    uniforms: {
      tDiffuse: { value: null },
      uTime: { value: 0 },
      uAmount: { value: settings.liquidAmount },
      uSpeed: { value: settings.liquidSpeed },
      uFrequency: { value: settings.liquidFrequency },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uMouseEnabled: { value: settings.mouseEnabled ? 1.0 : 0.0 },
      uMouseRadius: { value: settings.mouseRadius },
      uMouseIntensity: { value: settings.mouseIntensity },
      uFringeAmount: { value: settings.fringeAmount },
      uFlowDirection: { value: flowDirections[settings.liquidFlow] },
    },
    vertexShader:
      'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader:
      NOISE_SHADER_CHUNK +
      `
            uniform sampler2D tDiffuse; uniform float uTime; uniform float uAmount;
            uniform float uSpeed; uniform float uFrequency; uniform vec2 uMouse;
            uniform float uMouseEnabled; uniform float uMouseRadius; uniform float uMouseIntensity;
            uniform float uFringeAmount; uniform vec2 uFlowDirection; varying vec2 vUv;
            void main(){
                vec2 flowOffset = uFlowDirection * uTime * uSpeed * 0.1;
                vec3 noisePos = vec3((vUv + flowOffset) * uFrequency, uTime * uSpeed);
                float noiseX = snoise(noisePos);
                float noiseY = snoise(noisePos + vec3(15.7,83.2,45.9));
                vec2 ambientDistortion = vec2(noiseX,noiseY) * uAmount;
                float mouseDist = distance(vUv,uMouse);
                float ripple = 1.0 - smoothstep(0.0,uMouseRadius,mouseDist);
                vec2 direction = normalize(vUv - uMouse);
                vec2 mouseDistortion = direction * ripple * uMouseIntensity * uMouseEnabled;
                vec2 totalDistortion = ambientDistortion + mouseDistortion;
                float r = texture2D(tDiffuse, vUv + totalDistortion * (1.0 - uFringeAmount)).r;
                vec4 colorG = texture2D(tDiffuse, vUv + totalDistortion);
                float b = texture2D(tDiffuse, vUv + totalDistortion * (1.0 + uFringeAmount)).b;
                vec4 finalColor = vec4(r, colorG.g, b, colorG.a);
                gl_FragColor = finalColor;
            }`,
  }

  const liquidPass = new ShaderPass(LiquidShader)
  liquidPass.material.blending = THREE.NoBlending
  liquidPass.enabled = settings.liquidEnabled
  composer.addPass(liquidPass)

  // --- New Optimized Liquid Pass ---
  const OptimizedLiquidShader = {
    uniforms: {
      tDiffuse: { value: null },
      uTime: { value: 0 },
      uOptLiquidSpeed: { value: settings.optimizedLiquidSpeed },
      uOptLiquidFrequency: { value: settings.optimizedLiquidFrequency },
      uOptLiquidAmount: { value: settings.optimizedLiquidAmount },
      uFringeAmount: { value: settings.optimizedLiquidFringeAmount },
      uFlowDirection: {
        value:
          settings.optimizedLiquidFlow === 'Radial Drift' ||
          settings.optimizedLiquidFlow === 'Radial Wave'
            ? new THREE.Vector2(0, 0) // concentric modes
            : flowDirections[settings.optimizedLiquidFlow] ||
              new THREE.Vector2(0, 0),
      },
      // --- Mouse Interaction Uniforms ---
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uMouseEnabled: { value: settings.mouseEnabled ? 1.0 : 0.0 },
      uMouseRadius: { value: settings.mouseRadius },
      uMouseIntensity: { value: settings.mouseIntensity },
      uMouseFringeIntensity: { value: settings.mouseFringeIntensity }, // New Uniform
      uMouseType: { value: 0 }, // 0 for Ripple, 1 for Vortex
      uFlowMode: {
        value:
          settings.optimizedLiquidFlow === 'Radial Drift'
            ? 1
            : settings.optimizedLiquidFlow === 'Radial Wave'
            ? 2
            : 0,
      },
      // Radial wave uniforms
      uWaveFreq: { value: settings.radialWaveFrequency },
      uWaveSpeed: { value: settings.radialWaveSpeed },
      uWaveAmp: { value: settings.radialWaveAmplitude },
    },
    vertexShader: OPTIMIZED_LIQUID_VERTEX_SHADER, // We will reuse the vertex shader
    fragmentShader: OPTIMIZED_LIQUID_FRAGMENT_SHADER, // We will write a new fragment shader
  }
  const optimizedLiquidPass = new ShaderPass(OptimizedLiquidShader)
  optimizedLiquidPass.enabled = settings.optimizedLiquidEnabled
  composer.addPass(optimizedLiquidPass)
  // --- End New Pass ---

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,
    0.4,
    0.85
  )
  bloomPass.threshold = settings.glowThreshold
  bloomPass.strength = settings.glowStrength
  bloomPass.radius = settings.glowRadius
  bloomPass.enabled = settings.glowEnabled
  composer.addPass(bloomPass)

  function createGUI() {
    if (gui) return
    gui = new GUI()

    // Performance folder
    const performanceFolder = gui.addFolder('Performance')
    performanceFolder
      .add(settings, 'showMainEffect')
      .name('Show Main Effect (Mesh Only)')
      .onChange((v) => {
        mainMesh.visible = v
        updateAnimationState()
        console.log(
          `${LOG_PREFIX} Main effect (mesh) visibility changed to:`,
          v
        )
      })

    // PNG Image folder
    const pngFolder = gui.addFolder('PNG Image')
    pngFolder
      .add(settings, 'showPng')
      .name('Show PNG')
      .onChange((v) => {
        if (imagePlane) {
          imagePlane.visible = v
        }
        console.log(`${LOG_PREFIX} PNG visibility changed to:`, v)
      })

    // Add a text input for PNG path (for testing)
    const pngPathController = {
      path: settings.pngImagePath,
      loadImage: () => loadPngImage(pngPathController.path),
    }
    pngFolder.add(pngPathController, 'path').name('PNG Path')
    pngFolder.add(pngPathController, 'loadImage').name('Load PNG')

    const physicsFolder = gui.addFolder('Physics')
    physicsFolder.add(settings, 'speed', 0.1, 2.0, 0.01).onChange((v) => {
      material.uniforms.uSpeed.value = v
    })
    physicsFolder
      .add(settings, 'magnitude', 0.0, 1.0, 0.01)
      .onChange((v) => (material.uniforms.uMagnitude.value = v))
    physicsFolder
      .add(settings, 'lacunarity', 1.0, 3.0, 0.1)
      .onChange((v) => (material.uniforms.uLacunarity.value = v))
    physicsFolder
      .add(settings, 'gain', 0.1, 1.0, 0.01)
      .onChange((v) => (material.uniforms.uGain.value = v))

    const noiseFolder = physicsFolder.addFolder('Noise Scale')
    noiseFolder
      .add(settings, 'noiseScaleX', 0.1, 5.0, 0.1)
      .onChange((v) => (material.uniforms.uNoiseScale.value.x = v))
    noiseFolder
      .add(settings, 'noiseScaleY', 0.1, 5.0, 0.1)
      .onChange((v) => (material.uniforms.uNoiseScale.value.y = v))
    noiseFolder
      .add(settings, 'noiseScaleZ', 0.1, 5.0, 0.1)
      .onChange((v) => (material.uniforms.uNoiseScale.value.z = v))

    const appearanceFolder = gui.addFolder('Appearance')
    appearanceFolder
      .addColor(settings, 'backgroundColor')
      .onChange((v) => renderer.setClearColor(v))
    appearanceFolder
      .add(settings, 'blending', ['Normal', 'Additive'])
      .onChange((v) => (material.blending = blendingOptions[v]))
    appearanceFolder
      .add(settings, 'wireframe')
      .onChange((v) => (material.wireframe = v))

    // --- NEW: Mesh Transform Controls ---
    const meshTransformFolder = appearanceFolder.addFolder('Mesh Transform')
    const scaleFolder = meshTransformFolder.addFolder('Scale')
    scaleFolder
      .add(settings, 'meshScale', 0.1, 5.0, 0.01)
      .name('uniform')
      .onChange((v) => {
        // Update all axes
        settings.meshScaleX = settings.meshScaleY = settings.meshScaleZ = v
        mainMesh.scale.set(v, v, v)
      })
    scaleFolder
      .add(settings, 'meshScaleX', 0.1, 5.0, 0.01)
      .name('scale X')
      .onChange((v) => {
        mainMesh.scale.x = v
      })
    scaleFolder
      .add(settings, 'meshScaleY', 0.1, 5.0, 0.01)
      .name('scale Y')
      .onChange((v) => {
        mainMesh.scale.y = v
      })
    scaleFolder
      .add(settings, 'meshScaleZ', 0.1, 5.0, 0.01)
      .name('scale Z')
      .onChange((v) => {
        mainMesh.scale.z = v
      })

    const meshPositionFolder = meshTransformFolder.addFolder('Position')
    meshPositionFolder
      .add(settings, 'meshPositionX', -5.0, 5.0, 0.01)
      .name('x')
      .onChange((v) => {
        mainMesh.position.x = v
      })
    meshPositionFolder
      .add(settings, 'meshPositionY', -5.0, 5.0, 0.01)
      .name('y')
      .onChange((v) => {
        mainMesh.position.y = v
      })
    meshPositionFolder
      .add(settings, 'meshPositionZ', -5.0, 5.0, 0.01)
      .name('z')
      .onChange((v) => {
        mainMesh.position.z = v
      })

    const colorFolder = appearanceFolder.addFolder('Colors')
    colorFolder
      .addColor(settings, 'edgeColor')
      .onChange((v) => material.uniforms.uEdgeColor.value.set(v))
    colorFolder
      .addColor(settings, 'midColor')
      .onChange((v) => material.uniforms.uMidColor.value.set(v))
    colorFolder
      .addColor(settings, 'coreColor')
      .onChange((v) => material.uniforms.uCoreColor.value.set(v))
    colorFolder
      .add(settings, 'colorBias', 0.0, 1.0, 0.01)
      .onChange((v) => (material.uniforms.uColorBias.value = v))

    const opacityFolder = appearanceFolder.addFolder('Opacity')
    opacityFolder
      .add(settings, 'alphaBias', -1.0, 1.0, 0.01)
      .onChange((v) => (material.uniforms.uAlphaBias.value = v))
    opacityFolder
      .add(settings, 'alphaPower', 0.1, 10.0, 0.1)
      .onChange((v) => (material.uniforms.uAlphaPower.value = v))

    // --- Diffuse Layer GUI ---
    const diffuseFolder = appearanceFolder.addFolder('Diffuse Softening')
    diffuseFolder
      .add(settings, 'diffuseEnabled')
      .name('enabled')
      .onChange((v) => {
        diffusePass.enabled = v
        updateAnimationState()
      })
    diffuseFolder
      .add(settings, 'diffuseBlur', 0.0, 5.0, 0.1)
      .name('blur')
      .onChange((v) => {
        diffusePass.uniforms.uBlur.value = v
      })
    diffuseFolder
      .add(settings, 'grainSize', 1.0, 20.0, 1.0)
      .name('grain size')
      .onChange((v) => {
        diffusePass.uniforms.uGrainSize.value = v
      })
    diffuseFolder
      .add(settings, 'grainAmount', 0.0, 0.2, 0.005)
      .name('grain amount')
      .onChange((v) => {
        diffusePass.uniforms.uGrainAmount.value = v
      })
    diffuseFolder
      .add(settings, 'grainOpacity', 0.0, 1.0, 0.01)
      .name('grain opacity')
      .onChange((v) => {
        diffusePass.uniforms.uGrainOpacity.value = v
      })

    const fresnelFolder = gui.addFolder('Mesh Glow (Fresnel)')
    fresnelFolder
      .add(settings, 'fresnelEnabled')
      .name('enabled')
      .onChange(
        (v) => (material.uniforms.uFresnelEnabled.value = v ? 1.0 : 0.0)
      )
    fresnelFolder
      .addColor(settings, 'fresnelColor')
      .name('color')
      .onChange((v) => material.uniforms.uFresnelColor.value.set(v))
    fresnelFolder
      .add(settings, 'fresnelIntensity', 0.0, 5.0, 0.01)
      .name('intensity')
      .onChange((v) => (material.uniforms.uFresnelIntensity.value = v))
    fresnelFolder
      .add(settings, 'fresnelPower', 0.1, 10.0, 0.1)
      .name('power')
      .onChange((v) => (material.uniforms.uFresnelPower.value = v))

    const liquidFolder = gui.addFolder('Liquid Filter')
    liquidFolder
      .add(settings, 'liquidEnabled')
      .name('enabled')
      .onChange((v) => {
        liquidPass.enabled = v
        // If fragment liquid is enabled, ensure optimised one is off
        if (v) {
          optimizedLiquidPass.enabled = false
          settings.optimizedLiquidEnabled = false
        }
        updateAnimationState()
      })
    liquidFolder
      .add(settings, 'liquidFlow', ['Static', 'Up', 'Down', 'Left', 'Right'])
      .name('flow direction')
      .onChange((v) =>
        liquidPass.uniforms.uFlowDirection.value.copy(flowDirections[v])
      )
    liquidFolder
      .add(settings, 'liquidAmount', 0.0, 0.2, 0.001)
      .name('amount')
      .onChange((v) => (liquidPass.uniforms.uAmount.value = v))
    liquidFolder
      .add(settings, 'liquidSpeed', 0.0, 2.0, 0.01)
      .name('speed')
      .onChange((v) => (liquidPass.uniforms.uSpeed.value = v))
    liquidFolder
      .add(settings, 'liquidFrequency', 0.0, 20.0, 0.1)
      .name('frequency')
      .onChange((v) => (liquidPass.uniforms.uFrequency.value = v))
    liquidFolder
      .add(settings, 'fringeAmount', 0.0, 0.05, 0.001)
      .name('fringe')
      .onChange((v) => (liquidPass.uniforms.uFringeAmount.value = v))

    const mouseFolder = liquidFolder.addFolder('Mouse Interaction')
    mouseFolder
      .add(settings, 'mouseEnabled')
      .name('enabled')
      .onChange(
        (v) => (liquidPass.uniforms.uMouseEnabled.value = v ? 1.0 : 0.0)
      )
    mouseFolder
      .add(settings, 'mouseRadius', 0.01, 1.0, 0.01)
      .name('radius')
      .onChange((v) => (liquidPass.uniforms.uMouseRadius.value = v))
    mouseFolder
      .add(settings, 'mouseIntensity', 0.0, 0.2, 0.001)
      .name('intensity')
      .onChange((v) => (liquidPass.uniforms.uMouseIntensity.value = v))

    const bloomFolder = gui.addFolder('Scene Glow (Bloom)')
    bloomFolder.add(settings, 'glowEnabled').onChange((v) => {
      bloomPass.enabled = v
      updateAnimationState()
    })
    bloomFolder
      .add(settings, 'glowThreshold', 0.0, 1.0, 0.01)
      .onChange((v) => (bloomPass.threshold = v))
    bloomFolder
      .add(settings, 'glowStrength', 0.0, 3.0, 0.01)
      .onChange((v) => (bloomPass.strength = v))
    bloomFolder
      .add(settings, 'glowRadius', 0.0, 1.0, 0.01)
      .onChange((v) => (bloomPass.radius = v))

    // --- Optimized Liquid Effect GUI ---
    const optLiquidFolder = gui.addFolder('Optimized Liquid Effect (Vertex)')
    optLiquidFolder
      .add(settings, 'optimizedLiquidEnabled')
      .name('enabled')
      .onChange((v) => {
        optimizedLiquidPass.enabled = v
        // Mutual exclusion with fragment liquid
        if (v) {
          liquidPass.enabled = false
          settings.liquidEnabled = false
        }
        updateAnimationState()
      })
    optLiquidFolder
      .add(settings, 'optimizedLiquidFlow', [
        'Static',
        'Up',
        'Down',
        'Left',
        'Right',
        'Radial Drift',
        'Radial Wave',
      ])
      .name('flow direction')
      .onChange((v) => {
        if (v === 'Radial Wave') {
          optimizedLiquidPass.uniforms.uFlowMode.value = 2
          optimizedLiquidPass.uniforms.uFlowDirection.value.set(0, 0)
        } else if (v === 'Radial Drift' || v === 'Radial') {
          optimizedLiquidPass.uniforms.uFlowMode.value = 1
          optimizedLiquidPass.uniforms.uFlowDirection.value.set(0, 0)
        } else {
          optimizedLiquidPass.uniforms.uFlowMode.value = 0
          optimizedLiquidPass.uniforms.uFlowDirection.value.copy(
            flowDirections[v]
          )
        }
      })
    optLiquidFolder
      .add(settings, 'optimizedLiquidSpeed', 0, 2, 0.01)
      .name('speed')
      .onChange((v) => (optimizedLiquidPass.uniforms.uOptLiquidSpeed.value = v))
    optLiquidFolder
      .add(settings, 'optimizedLiquidFrequency', 0, 20, 0.1)
      .name('frequency')
      .onChange(
        (v) => (optimizedLiquidPass.uniforms.uOptLiquidFrequency.value = v)
      )
    optLiquidFolder
      .add(settings, 'optimizedLiquidAmount', 0, 0.2, 0.001)
      .name('amount')
      .onChange(
        (v) => (optimizedLiquidPass.uniforms.uOptLiquidAmount.value = v)
      )
    optLiquidFolder
      .add(settings, 'optimizedLiquidFringeAmount', 0, 0.05, 0.001)
      .name('fringe')
      .onChange((v) => (optimizedLiquidPass.uniforms.uFringeAmount.value = v))

    // --- Mouse Interaction GUI for Optimized Pass ---
    const optMouseFolder = optLiquidFolder.addFolder('Mouse Interaction')
    const mouseTypes = { 'Ripple / Push': 0, 'Vortex / Swirl': 1 }
    const mouseSettings = { type: 0 } // Local object to control the dropdown

    optMouseFolder
      .add(settings, 'mouseEnabled')
      .name('enabled')
      .onChange((v) => {
        optimizedLiquidPass.uniforms.uMouseEnabled.value = v ? 1.0 : 0.0
      })

    optMouseFolder
      .add(mouseSettings, 'type', mouseTypes)
      .name('type')
      .onChange((v) => {
        optimizedLiquidPass.uniforms.uMouseType.value = parseInt(v)
      })

    optMouseFolder
      .add(settings, 'mouseRadius', 0.01, 1.0, 0.01)
      .name('radius')
      .onChange((v) => {
        optimizedLiquidPass.uniforms.uMouseRadius.value = v
      })

    optMouseFolder
      .add(settings, 'mouseIntensity', 0.0, 0.2, 0.001)
      .name('intensity')
      .onChange((v) => {
        optimizedLiquidPass.uniforms.uMouseIntensity.value = v
      })

    optMouseFolder
      .add(settings, 'mouseFringeIntensity', 0.0, 20.0, 0.1)
      .name('fringe intensity')
      .onChange((v) => {
        optimizedLiquidPass.uniforms.uMouseFringeIntensity.value = v
      })

    // --- Export / Save Current Settings ---
    const exportFolder = gui.addFolder('Save / Export Settings')

    // Helper to get a serializable clone wrapped under "default" key
    const getSerializableSettings = () => {
      const inner = {}
      for (const [k, v] of Object.entries(settings)) {
        if (typeof v !== 'function') inner[k] = v
      }
      return { default: inner }
    }

    const exportActions = {
      copyJSON: () => {
        const json = JSON.stringify(getSerializableSettings(), null, 2)
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(json)
            .then(() =>
              console.log(`${LOG_PREFIX} Settings copied to clipboard`)
            )
            .catch((err) => {
              console.error(`${LOG_PREFIX} Clipboard copy failed`, err)
              alert('Could not copy to clipboard')
            })
        } else {
          // Fallback: open prompt
          window.prompt('Copy JSON below', json)
        }
      },
      downloadJSON: () => {
        const json = JSON.stringify(getSerializableSettings(), null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'twilightSettings.json'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        console.log(
          `${LOG_PREFIX} Settings downloaded as twilightSettings.json`
        )
      },
    }

    exportFolder.add(exportActions, 'copyJSON').name('Copy JSON to Clipboard')
    exportFolder.add(exportActions, 'downloadJSON').name('Download JSON File')

    if (imagePlane) {
      createImageGUI()
    }
  }

  function createImageGUI() {
    if (imageFolder || !gui) return // Exit if GUI is not ready or folder already exists

    imageFolder = gui.addFolder('Image Overlay')

    // This check is now sufficient because this function is only called *after* imagePlane is created.
    if (!imagePlane) {
      console.warn(
        `${LOG_PREFIX} createImageGUI called before imagePlane was created. No GUI will be shown.`
      )
      return
    }

    imageFolder
      .add(settings, 'imageVisible')
      .name('visible')
      .onChange((v) => (imagePlane.visible = v))

    imageFolder
      .add(settings, 'imageSize', 0.1, 5.0, 0.01)
      .name('size (desktop)')
      .onChange((v) => {
        const responsiveSize = getResponsiveImageSize(settings)
        imagePlane.scale.set(
          responsiveSize * imageAspectRatio,
          responsiveSize,
          1
        )
      })

    imageFolder
      .add(settings, 'imageSizeTablet', 0.1, 5.0, 0.01)
      .name('size (tablet)')
      .onChange((v) => {
        const responsiveSize = getResponsiveImageSize(settings)
        imagePlane.scale.set(
          responsiveSize * imageAspectRatio,
          responsiveSize,
          1
        )
      })

    imageFolder
      .add(settings, 'imageSizeMobileHorizontal', 0.1, 5.0, 0.01)
      .name('size (mobile H)')
      .onChange((v) => {
        const responsiveSize = getResponsiveImageSize(settings)
        imagePlane.scale.set(
          responsiveSize * imageAspectRatio,
          responsiveSize,
          1
        )
      })

    imageFolder
      .add(settings, 'imageSizeMobileVertical', 0.1, 5.0, 0.01)
      .name('size (mobile V)')
      .onChange((v) => {
        const responsiveSize = getResponsiveImageSize(settings)
        imagePlane.scale.set(
          responsiveSize * imageAspectRatio,
          responsiveSize,
          1
        )
      })

    imageFolder
      .add(settings, 'imageBrightness', 0.0, 3.0, 0.01)
      .name('brightness')
      .onChange((v) => {
        imagePlane.material.uniforms.brightness.value = v
      })

    imageFolder
      .add(settings, 'imageContrast', 0.0, 3.0, 0.01)
      .name('contrast')
      .onChange((v) => {
        imagePlane.material.uniforms.contrast.value = v
      })

    const positionFolder = imageFolder.addFolder('Position')
    positionFolder
      .add(settings, 'imagePositionX', -2.0, 2.0, 0.01)
      .name('x')
      .onChange((v) => {
        imagePlane.position.x = v
      })

    positionFolder
      .add(settings, 'imagePositionY', -2.0, 2.0, 0.01)
      .name('y')
      .onChange((v) => {
        imagePlane.position.y = v
      })
  }

  // ---------------- Helper functions to control animation state ----------------
  function shouldAnimate() {
    return (
      settings.showMainEffect ||
      settings.optimizedLiquidEnabled ||
      (settings.showPostProcessing &&
        (liquidPass?.enabled ||
          diffusePass?.enabled ||
          settings.showMainEffect))
    )
  }

  function updateAnimationState() {
    if (shouldAnimate()) {
      startAnimation()
    } else {
      stopAnimation()
    }
  }
  // ---------------------------------------------------------------------------

  // Consolidated animation control

  function startAnimation() {
    if (isAnimating) return

    isAnimating = true
    clock.start()
    console.log(`${LOG_PREFIX} Starting animation...`)

    function animate() {
      if (!isAnimating) return

      // Check if tab is visible
      if (document.visibilityState === 'hidden') {
        animationId = requestAnimationFrame(animate)
        return
      }

      const currentTime = performance.now()
      const deltaTime = currentTime - lastFrameTime

      // Frame rate limiting
      if (deltaTime < frameTime) {
        animationId = requestAnimationFrame(animate)
        return
      }

      lastFrameTime = currentTime - (deltaTime % frameTime)
      const elapsedTime = clock.getElapsedTime()

      // Update mesh uniforms if needed
      if (settings.showMainEffect && mainMesh?.visible) {
        material.uniforms.uTime.value = elapsedTime
      }

      // Update optimized liquid if enabled
      if (settings.optimizedLiquidEnabled && optimizedLiquidPass?.enabled) {
        optimizedLiquidPass.uniforms.uTime.value = elapsedTime
      }

      // Update post-processing
      if (liquidPass) {
        liquidPass.uniforms.uTime.value = elapsedTime
      }

      // Render the scene
      if (composer) {
        composer.render()
      } else if (renderer && scene && camera) {
        renderer.render(scene, camera)
      }

      animationId = requestAnimationFrame(animate)
    }

    animate()
  }

  function stopAnimation() {
    if (isAnimating) {
      isAnimating = false
      if (animationId) {
        cancelAnimationFrame(animationId)
        animationId = null
      }
      console.log(`${LOG_PREFIX} Animation stopped.`)
    }
  }

  if (settings.showGUI) {
    createGUI()
  }

  console.log(
    `${LOG_PREFIX} Setting background color to:`,
    settings.backgroundColor
  )
  renderer.setClearColor(settings.backgroundColor)

  console.log(`${LOG_PREFIX} Setting up mouse event listener...`)
  onMouseMove = (event) => {
    const mousePos = {
      x: event.clientX / window.innerWidth,
      y: 1.0 - event.clientY / window.innerHeight,
    }
    liquidPass.uniforms.uMouse.value.set(mousePos.x, mousePos.y)
    optimizedLiquidPass.uniforms.uMouse.value.set(mousePos.x, mousePos.y)
  }
  window.addEventListener('mousemove', onMouseMove)

  // Always start animation
  startAnimation()

  console.log(`${LOG_PREFIX} Setting up resize listener...`)
  onResize = () => {
    console.log(
      `${LOG_PREFIX} Window resized to:`,
      window.innerWidth,
      'x',
      window.innerHeight
    )
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    composer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO))

    // Update diffuse resolution uniform
    diffusePass.uniforms.uResolution.value.set(
      window.innerWidth,
      window.innerHeight
    )

    // Update image plane with responsive size
    if (imagePlane) {
      const responsiveSize = getResponsiveImageSize(settings)
      imagePlane.scale.set(responsiveSize * imageAspectRatio, responsiveSize, 1)
      console.log(`${LOG_PREFIX} Image plane resized to: ${responsiveSize}`)
    }
  }
  window.addEventListener('resize', onResize)

  // Add event listeners for visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Restart animation if needed when tab becomes visible
      if (shouldAnimate() && !isAnimating) {
        startAnimation()
      }
    } else {
      // Pause animation when tab is hidden
      if (isAnimating) {
        stopAnimation()
      }
    }
  })

  // Scene cleanup function
  function cleanupScene() {
    scene.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose()
      }
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => {
            if (material.map) material.map.dispose()
            material.dispose()
          })
        } else {
          if (object.material.map) object.material.map.dispose()
          object.material.dispose()
        }
      }
    })

    // Dispose of post-processing passes
    if (composer) {
      composer.passes.forEach((pass) => {
        if (pass.material) pass.material.dispose()
        if (pass.fsQuad) pass.fsQuad.dispose()
      })
    }

    // Dispose of renderer and remove canvas
    if (renderer) {
      renderer.dispose()
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
    }

    scene.clear()
    console.log(`${LOG_PREFIX} Instance destroyed successfully.`)
  }

  // Return public API
  return {
    destroy: cleanupScene,
    startAnimation,
    stopAnimation,
    updateSettings: (newSettings) => {
      Object.assign(settings, newSettings)

      // Apply mesh transform updates if provided
      if (
        'meshScale' in newSettings &&
        typeof settings.meshScale === 'number'
      ) {
        settings.meshScaleX =
          settings.meshScaleY =
          settings.meshScaleZ =
            settings.meshScale
      }

      if (
        typeof settings.meshScaleX === 'number' &&
        typeof settings.meshScaleY === 'number' &&
        typeof settings.meshScaleZ === 'number'
      ) {
        mainMesh.scale.set(
          settings.meshScaleX,
          settings.meshScaleY,
          settings.meshScaleZ
        )
      }

      if (
        typeof settings.meshPositionX === 'number' &&
        typeof settings.meshPositionY === 'number' &&
        typeof settings.meshPositionZ === 'number'
      ) {
        mainMesh.position.set(
          settings.meshPositionX,
          settings.meshPositionY,
          settings.meshPositionZ
        )
      }

      // Apply diffuse settings if provided
      if (typeof settings.diffuseEnabled === 'boolean') {
        diffusePass.enabled = settings.diffuseEnabled
      }
      if (typeof settings.diffuseBlur === 'number') {
        diffusePass.uniforms.uBlur.value = settings.diffuseBlur
      }
      // Grain parameters
      if (typeof settings.grainSize === 'number') {
        diffusePass.uniforms.uGrainSize.value = settings.grainSize
      }
      if (typeof settings.grainAmount === 'number') {
        diffusePass.uniforms.uGrainAmount.value = settings.grainAmount
      }
      if (typeof settings.grainOpacity === 'number') {
        diffusePass.uniforms.uGrainOpacity.value = settings.grainOpacity
      }

      if (settings.showMainEffect) {
        mainMesh.visible = true
        startMeshAnimation()
      } else {
        mainMesh.visible = false
        stopMeshAnimation()
      }

      // Legacy support: if caller provides diffuseNoise, map to grainAmount
      if (
        settings.grainAmount === undefined &&
        typeof settings.diffuseNoise === 'number'
      ) {
        settings.grainAmount = settings.diffuseNoise
      }

      // Optimized liquid flow update
      if (typeof settings.optimizedLiquidFlow === 'string') {
        if (settings.optimizedLiquidFlow === 'Radial') {
          optimizedLiquidPass.uniforms.uFlowMode.value = 1
          optimizedLiquidPass.uniforms.uFlowDirection.value.set(0, 0)
        } else {
          optimizedLiquidPass.uniforms.uFlowMode.value = 0
          optimizedLiquidPass.uniforms.uFlowDirection.value.copy(
            flowDirections[settings.optimizedLiquidFlow] ||
              flowDirections['Static']
          )
        }
      }

      // Radial wave params updates
      if (typeof settings.radialWaveFrequency === 'number') {
        optimizedLiquidPass.uniforms.uWaveFreq.value =
          settings.radialWaveFrequency
      }
      if (typeof settings.radialWaveSpeed === 'number') {
        optimizedLiquidPass.uniforms.uWaveSpeed.value = settings.radialWaveSpeed
      }
      if (typeof settings.radialWaveAmplitude === 'number') {
        optimizedLiquidPass.uniforms.uWaveAmp.value =
          settings.radialWaveAmplitude
      }

      // Update image plane with responsive size if any image size settings changed
      if (
        imagePlane &&
        ('imageSize' in newSettings ||
          'imageSizeTablet' in newSettings ||
          'imageSizeMobileHorizontal' in newSettings ||
          'imageSizeMobileVertical' in newSettings)
      ) {
        const responsiveSize = getResponsiveImageSize(settings)
        imagePlane.scale.set(
          responsiveSize * imageAspectRatio,
          responsiveSize,
          1
        )
        console.log(
          `${LOG_PREFIX} Image size updated to responsive size: ${responsiveSize}`
        )
      }
    },
  }
}

// Simplified initialization
async function initializeTwilightFringe() {
  console.log(`${LOG_PREFIX} initializeTwilightFringe called`)

  const containers = document.querySelectorAll('.tf-fringe-bg')
  console.log(
    `${LOG_PREFIX} Found ${containers.length} containers with .tf-fringe-bg class`
  )

  if (containers.length === 0) {
    console.warn(`${LOG_PREFIX} No containers found with .tf-fringe-bg class`)
    return
  }

  for (const [index, container] of containers.entries()) {
    console.log(
      `${LOG_PREFIX} Processing container ${index + 1}/${containers.length}:`,
      {
        element: container,
        tagName: container.tagName,
        className: container.className,
        id: container.id,
        dataset: container.dataset,
      }
    )

    const showGUI = container.dataset.showGui === 'true'

    console.log(`${LOG_PREFIX} Settings for container ${index + 1}:`, {
      showGUI,
    })

    try {
      await createTwilightFringe(container, {
        showGUI: showGUI,
      })
      console.log(
        `${LOG_PREFIX} Successfully initialized container ${index + 1}`
      )
    } catch (error) {
      console.error(
        `${LOG_PREFIX} Error initializing container ${index + 1}:`,
        error
      )
    }
  }
}

// Standard practice to initialize after DOM is ready, preventing double-execution.
if (document.readyState === 'loading') {
} else {
  // DOMContentLoaded has already fired
  initializeTwilightFringe()
}
