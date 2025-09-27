import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// Fixed size like energy.js

export default function initCleanSlate3d(container) {
  console.log(
    'Init called with container:',
    container
      ? `Found (class: ${container.className}, size: ${container.clientWidth}x${container.clientHeight})`
      : 'Null - no init'
  )
  if (!container) {
    console.warn('No .cleanslate-container found - skipping 3D init')
    return
  }

  // Get native dimensions
  let w = container.clientWidth
  let h = container.clientHeight
  if (w === 0 || h === 0) {
    console.warn('Container has zero size - deferring init to next frame')
    requestAnimationFrame(() => initCleanSlate3d(container))
    return
  }

  // Scene
  const scene = new THREE.Scene()

  // Camera - adapt to native aspect
  const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000)
  camera.position.set(0, 0, 2)
  camera.lookAt(0, 0, 0)
  console.log('Camera setup: native aspect', w / h)

  // Renderer - use native size
  const renderer = new THREE.WebGLRenderer({
    canvas: container,
    antialias: true,
    alpha: true,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(w, h, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.setClearColor(0x000000, 0)

  // Canvas CSS - fill container exactly
  const canvas = renderer.domElement
  console.log('Canvas setup: native', w, 'x', h, 'buffer, fills container')

  // WebGL log
  console.log('WebGL support:', !!renderer.getContext() ? 'Active' : 'Failed')

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 2)
  scene.add(ambientLight)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8)
  directionalLight.position.set(10, 10, 5)
  scene.add(directionalLight)

  // Model loader (replaces debug cube)
  const loader = new GLTFLoader()
  loader.load(
    'https://246nut3nns.ufs.sh/f/Il8RTlUMQ40GogOY49s0c6GFTHn7tPybWik8mp3jVYAwerdU',
    (gltf) => {
      const model = gltf.scene
      scene.add(model)
      // Center and scale model
      const box = new THREE.Box3().setFromObject(model)
      const center = box.getCenter(new THREE.Vector3())
      model.position.sub(center)
      model.position.y = -0.3
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      if (maxDim > 0) {
        camera.fov = 27
        camera.updateProjectionMatrix()

        //recalculate distance
        const fovInRadians = camera.fov * (Math.PI / 180)
        let cameraZ = Math.abs(maxDim / (2.7 * Math.tan(fovInRadians / 2.2)))
        cameraZ *= 1.6
        camera.position.z = cameraZ
      }
      console.log('Model loaded', { children: model.children.length })
    },
    undefined,
    (error) => console.error('GLB load error:', error)
  )

  console.log('GLTF loader initiated')

  // Axes and grid
  // const axesHelper = new THREE.AxesHelper(5)
  // scene.add(axesHelper)
  // const gridHelper = new THREE.GridHelper(10, 10)
  // scene.add(gridHelper)
  // console.log('Axes/grid added')

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableZoom = false
  controls.enablePan = false
  controls.enableDamping = true
  controls.dampingFactor = 0.05

  // Keep renderer/camera in sync with canvas size (container is the canvas)
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      // Use contentRect to read CSS size
      const newW = Math.max(0, Math.floor(entry.contentRect.width))
      const newH = Math.max(0, Math.floor(entry.contentRect.height))
      if (newW > 0 && newH > 0) {
        renderer.setSize(newW, newH, false)
        camera.aspect = newW / newH
        camera.updateProjectionMatrix()
      }
    }
  })
  resizeObserver.observe(container)

  // Animate loop - always runs, throttles when hidden
  function animate() {
    requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }
  animate()

  // Initial render
  renderer.render(scene, camera)
  console.log('Initial render - check for blue/cube')

  console.log('3D Setup complete - running continuously, scaled by CSS')

  // No API - always on
}
