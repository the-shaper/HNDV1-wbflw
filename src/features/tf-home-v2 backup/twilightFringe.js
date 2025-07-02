console.log('[TwilightFringe] Script file loaded successfully!')
import * as THREE from 'three'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

// Add logging prefix for easy identification
const LOG_PREFIX = '[TwilightFringe]'

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
  liquidEnabled: true,
  liquidAmount: 0.01,
  liquidSpeed: 0.3,
  liquidFrequency: 4.0,
  mouseEnabled: true,
  mouseRadius: 0.2,
  mouseIntensity: 0.05,
  imageVisible: true,
  imageSize: 2.0,
  meshVisible: true,
  fringeAmount: 0.005,
  liquidFlow: 'Static',
  imageBrightness: 1.0,
  imageContrast: 1.0,
  imagePositionX: 0.0,
  imagePositionY: 0.0,
}

// Load settings from JSON with multiple path attempts
async function loadDefaultSettings() {
  const possiblePaths = [
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
        const defaultSettings = modes.default || fallbackSettings
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

// --- GLSL Shaders (inlined so no HTML <script> tags are needed) ---
const VERTEX_SHADER_SOURCE = `
uniform float uTime;
uniform float uSpeed;
uniform float uMagnitude;
uniform float uLacunarity;
uniform float uGain;
uniform vec3 uNoiseScale;
varying float vNoise;
varying float vFresnel;

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

  // Load default settings from JSON
  const defaultSettings = await loadDefaultSettings()
  const attributeSettings = readSettingsFromDOM(containerEl)

  // Merge settings: JSON defaults < attributes < options
  const settings = {
    ...defaultSettings,
    ...attributeSettings,
    ...options,
  }
  console.log(`${LOG_PREFIX} Final settings:`, settings)

  // Performance tracking - separate for mesh and post-processing
  let isMeshAnimating = false
  let isPostProcessingAnimating = false
  let meshAnimationId = null
  let postProcessingAnimationId = null

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
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

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

  let fileInput = null
  if (settings.showGUI) {
    fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'image/png'
    fileInput.style.display = 'none'
    document.body.appendChild(fileInput)
    settings.loadImage = () => fileInput.click()
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
  const geometry = new THREE.IcosahedronGeometry(1, 128)
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER_SOURCE,
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
      return
    }

    // A cleaned-up, non-redundant list of paths to try.
    // 1. The path as provided (for paths relative to HTML or absolute paths).
    // 2. The path resolved relative to the script module (more robust).
    const possibleImagePaths = [
      ...new Set([imagePath, new URL(imagePath, import.meta.url).href]),
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
              settings.imageSize * imageAspectRatio,
              settings.imageSize,
              1
            )
            imagePlane.material.needsUpdate = true
          } else {
            // Create new plane
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
              settings.imageSize * imageAspectRatio,
              settings.imageSize,
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
    fragmentShader: `
            uniform sampler2D tDiffuse; uniform float uTime; uniform float uAmount;
            uniform float uSpeed; uniform float uFrequency; uniform vec2 uMouse;
            uniform float uMouseEnabled; uniform float uMouseRadius; uniform float uMouseIntensity;
            uniform float uFringeAmount; uniform vec2 uFlowDirection; varying vec2 vUv;
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
            vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
            float snoise(vec3 v) {
                const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0,0.5,1.0,2.0);
                vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
                vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g; vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
                vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + C.yyy; vec3 x3 = x0 - D.yyy;
                i = mod289(i);
                vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
                float n_ = 0.142857142857; vec3 ns = n_ * D.wyz - D.xzx;
                vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
                vec4 x = x_ * ns.x + ns.yyyy; vec4 y = y_ * ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
                vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
                vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
                vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
                vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w);
                vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
                p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
                vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                m = m * m; return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
            }
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

  let gui = null

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
        if (v) {
          startMeshAnimation()
        } else {
          stopMeshAnimation()
        }
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
    physicsFolder
      .add(settings, 'speed', 0.1, 2.0, 0.01)
      .onChange((v) => (material.uniforms.uSpeed.value = v))
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
      .onChange((v) => (liquidPass.enabled = v))
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
    bloomFolder
      .add(settings, 'glowEnabled')
      .onChange((v) => (bloomPass.enabled = v))
    bloomFolder
      .add(settings, 'glowThreshold', 0.0, 1.0, 0.01)
      .onChange((v) => (bloomPass.threshold = v))
    bloomFolder
      .add(settings, 'glowStrength', 0.0, 3.0, 0.01)
      .onChange((v) => (bloomPass.strength = v))
    bloomFolder
      .add(settings, 'glowRadius', 0.0, 1.0, 0.01)
      .onChange((v) => (bloomPass.radius = v))

    gui.add(settings, 'loadImage').name('Load Image...')

    if (imagePlane) {
      createImageGUI()
    }
  }

  function createImageGUI() {
    if (imageFolder || !gui) return
    imageFolder = gui.addFolder('Image Overlay')
    imageFolder
      .add(settings, 'imageVisible')
      .name('visible')
      .onChange((v) => (imagePlane.visible = v))
    imageFolder
      .add(settings, 'imageSize', 0.1, 5.0, 0.01)
      .name('size')
      .onChange((v) => {
        if (imagePlane) {
          imagePlane.scale.set(v * imageAspectRatio, v, 1)
        }
      })
    imageFolder
      .add(settings, 'imageBrightness', 0.0, 3.0, 0.01)
      .name('brightness')
      .onChange((v) => {
        if (imagePlane) {
          imagePlane.material.uniforms.brightness.value = v
        }
      })
    imageFolder
      .add(settings, 'imageContrast', 0.0, 3.0, 0.01)
      .name('contrast')
      .onChange((v) => {
        if (imagePlane) {
          imagePlane.material.uniforms.contrast.value = v
        }
      })

    const positionFolder = imageFolder.addFolder('Position')
    positionFolder
      .add(settings, 'imagePositionX', -2.0, 2.0, 0.01)
      .name('x')
      .onChange((v) => {
        if (imagePlane) {
          imagePlane.position.x = v
        }
      })
    positionFolder
      .add(settings, 'imagePositionY', -2.0, 2.0, 0.01)
      .name('y')
      .onChange((v) => {
        if (imagePlane) {
          imagePlane.position.y = v
        }
      })
  }

  // Separate animation controls for mesh and post-processing
  function startMeshAnimation() {
    if (isMeshAnimating) return

    isMeshAnimating = true
    console.log(`${LOG_PREFIX} Starting mesh animation...`)

    const meshClock = new THREE.Clock()

    function animateMesh() {
      if (!isMeshAnimating) return

      meshAnimationId = requestAnimationFrame(animateMesh)
      const elapsedTime = meshClock.getElapsedTime()

      // Only update mesh uniforms
      if (settings.showMainEffect && mainMesh.visible) {
        material.uniforms.uTime.value = elapsedTime
      }
    }

    animateMesh()
  }

  function stopMeshAnimation() {
    if (!isMeshAnimating) return

    isMeshAnimating = false
    if (meshAnimationId) {
      cancelAnimationFrame(meshAnimationId)
      meshAnimationId = null
    }
    console.log(`${LOG_PREFIX} Mesh animation stopped`)
  }

  function startPostProcessingAnimation() {
    if (isPostProcessingAnimating) return

    isPostProcessingAnimating = true
    console.log(`${LOG_PREFIX} Starting post-processing animation...`)

    const postClock = new THREE.Clock()
    let frameCount = 0

    function animatePostProcessing() {
      if (!isPostProcessingAnimating) return

      postProcessingAnimationId = requestAnimationFrame(animatePostProcessing)
      const elapsedTime = postClock.getElapsedTime()

      // Update post-processing uniforms
      liquidPass.uniforms.uTime.value = elapsedTime

      // Render the scene
      composer.render()

      // Log every 1800 frames (once every 30 seconds at 60fps) - much less frequent
      if (frameCount % 1800 === 0 && frameCount > 0) {
        console.log(
          `${LOG_PREFIX} Post-processing running - Frame ${frameCount}, Time: ${elapsedTime.toFixed(
            2
          )}s, Mesh Active: ${isMeshAnimating}`
        )
      }
      frameCount++
    }

    animatePostProcessing()
  }

  function stopPostProcessingAnimation() {
    if (!isPostProcessingAnimating) return

    isPostProcessingAnimating = false
    if (postProcessingAnimationId) {
      cancelAnimationFrame(postProcessingAnimationId)
      postProcessingAnimationId = null
    }
    console.log(`${LOG_PREFIX} Post-processing animation stopped`)
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
  window.addEventListener('mousemove', (event) => {
    liquidPass.uniforms.uMouse.value.set(
      event.clientX / window.innerWidth,
      1.0 - event.clientY / window.innerHeight
    )
  })

  // Always start post-processing animation (for liquid effects, bloom, etc.)
  startPostProcessingAnimation()

  // Start mesh animation only if main effect is enabled
  if (settings.showMainEffect) {
    startMeshAnimation()
  } else {
    console.log(
      `${LOG_PREFIX} Main effect disabled, mesh animation not started`
    )
  }

  console.log(`${LOG_PREFIX} Setting up resize listener...`)
  window.addEventListener('resize', () => {
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  })

  console.log(`${LOG_PREFIX} TwilightFringe instance created successfully!`)

  return {
    destroy: () => {
      console.log(`${LOG_PREFIX} Destroying instance...`)
      stopMeshAnimation()
      stopPostProcessingAnimation()
      scene.clear()
      renderer.dispose()
      geometry.dispose()
      material.dispose()
    },
    startMeshAnimation,
    stopMeshAnimation,
    updateSettings: (newSettings) => {
      Object.assign(settings, newSettings)
      if (settings.showMainEffect) {
        mainMesh.visible = true
        startMeshAnimation()
      } else {
        mainMesh.visible = false
        stopMeshAnimation()
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

console.log(`${LOG_PREFIX} Script loaded, waiting for DOMContentLoaded...`)

document.addEventListener('DOMContentLoaded', () => {
  console.log(`${LOG_PREFIX} DOMContentLoaded event fired`)
  initializeTwilightFringe()
})

// Also try immediate initialization in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
  console.log(
    `${LOG_PREFIX} Document still loading, waiting for DOMContentLoaded`
  )
} else {
  console.log(`${LOG_PREFIX} Document already loaded, initializing immediately`)
  initializeTwilightFringe()
}
