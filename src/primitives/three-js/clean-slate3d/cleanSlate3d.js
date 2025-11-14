import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// Fixed size like energy.js

export default function initCleanSlate3d(container) {
  console.log(
    '🔍 [DEBUG] Init called with container:',
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

  let scene, camera, renderer, controls, animationId

  try {
    console.log('🔍 [DEBUG] Creating scene...')
    // Scene
    scene = new THREE.Scene()
    console.log('✅ [DEBUG] Scene created successfully')

    console.log('🔍 [DEBUG] Setting up camera...')
    // Camera - 80mm lens equivalent (narrower FOV for less distortion)
    // 80mm on full frame ≈ 30° diagonal FOV, using 25° for good composition
    camera = new THREE.PerspectiveCamera(25, w / h, 0.1, 1000)
    camera.position.set(0, 0, 8) // Start further back for 80mm lens
    camera.lookAt(0, 0, 0)
    console.log(
      '✅ [DEBUG] Camera setup: 80mm equivalent (25° FOV), aspect',
      w / h,
      'position:',
      camera.position
    )

    console.log('🔍 [DEBUG] Creating WebGL renderer...')
    // Renderer - use native size
    renderer = new THREE.WebGLRenderer({
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
    console.log(
      '✅ [DEBUG] Canvas setup: native',
      w,
      'x',
      h,
      'buffer, fills container'
    )

    // WebGL log
    const gl = renderer.getContext()
    console.log('✅ [DEBUG] WebGL support:', !!gl ? 'Active' : 'Failed')
    if (gl) {
      console.log('✅ [DEBUG] WebGL version:', gl.getParameter(gl.VERSION))
    }

    console.log('🔍 [DEBUG] Setting up lights...')
    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 2)
    scene.add(ambientLight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8)
    directionalLight.position.set(10, 10, 5)
    scene.add(directionalLight)

    // Add rim light behind object from camera perspective
    console.log('🔍 [DEBUG] Adding rim light behind object...')
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.8)
    rimLight.position.set(-3, -0.077, 3) // X=2 (side offset), Z=3 (behind from camera)
    rimLight.target.position.set(0, -0.077, 0) // Aim at model center
    scene.add(rimLight)
    scene.add(rimLight.target) // Add target to scene for proper aiming

    // Add opposite rim light (mirrored along Z axis)
    console.log('🔍 [DEBUG] Adding opposite rim light...')
    const oppositeRimLight = new THREE.DirectionalLight(0xffffff, 0.8)
    oppositeRimLight.position.set(-1, -0.077, -3) // X=2 (same side), Z=-3 (opposite side)
    oppositeRimLight.target.position.set(0, -0.077, 0) // Aim at model center
    scene.add(oppositeRimLight)
    scene.add(oppositeRimLight.target) // Add target to scene for proper aiming

    console.log('✅ [DEBUG] Lights added including rim lights:')
    console.log('  Rim light at:', rimLight.position)
    console.log('  Opposite rim light at:', oppositeRimLight.position)
    console.log('  Both lights target:', rimLight.target.position)

    // Add a reference cube for debugging
    console.log('🔍 [DEBUG] Adding reference cube...')
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1)
    const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 })
    const referenceCube = new THREE.Mesh(cubeGeometry, cubeMaterial)
    referenceCube.position.set(0, 0, 0)
    scene.add(referenceCube)
    console.log('✅ [DEBUG] Reference cube added at origin')

    console.log('🔍 [DEBUG] Setting up GLTF loader...')
    // Model loader
    const loader = new GLTFLoader()
    loader.load(
      'https://246nut3nns.ufs.sh/f/Il8RTlUMQ40GvraHvNJw2bTSsEONIYHKDlCa9QtB8rdPxhZf',
      (gltf) => {
        console.log('🔍 [DEBUG] GLTF loaded successfully')
        const model = gltf.scene
        scene.add(model)

        // Remove reference cube once model loads
        scene.remove(referenceCube)
        console.log('✅ [DEBUG] Reference cube removed')

        // Center and scale model
        const box = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())

        console.log('🔍 [DEBUG] Model bounds:', { center, size })

        // Debug model structure before any changes
        console.log('🔍 [DEBUG] Model structure before rotation:')
        console.log('  Model rotation:', model.rotation)
        console.log('  Model position:', model.position)
        console.log(
          '  Model children:',
          model.children.map((child, index) => ({
            index,
            name: child.name || `unnamed_${index}`,
            type: child.type,
            position: child.position,
            rotation: child.rotation,
            visible: child.visible,
          }))
        )

        // Center the model
        model.position.sub(center)
        model.position.y = -0.077 // Keep at eye level

        // Keep model as-is (no rotation), move camera to opposite side instead
        console.log('🔍 [DEBUG] Model after centering (no rotation):')
        console.log('  Model rotation:', model.rotation)
        console.log('  Model position:', model.position)

        // Calculate appropriate camera distance for 80mm lens
        const maxDim = Math.max(size.x, size.y, size.z)
        if (maxDim > 0) {
          const fovInRadians = (camera.fov * Math.PI) / 180
          // For 80mm lens, use larger multiplier for more dramatic compression
          const cameraZ =
            Math.abs(maxDim / (2 * Math.tan(fovInRadians / 2))) * 0.9

          // Position camera on opposite side to show back face
          camera.position.set(0, 0, -cameraZ) // Negative Z for opposite side
          camera.lookAt(0, -0.077, 0) // Look at model center
          camera.updateProjectionMatrix()

          console.log('✅ [DEBUG] Camera repositioned for opposite view:', {
            maxDim,
            fovDegrees: camera.fov,
            cameraZ,
            cameraPosition: camera.position,
            lookAtTarget: { x: 0, y: -0.077, z: 0 },
          })
        }

        console.log('✅ [DEBUG] Model loaded and positioned', {
          children: model.children.length,
          modelPosition: model.position,
          cameraPosition: camera.position,
        })
      },
      (progress) => {
        console.log(
          '🔍 [DEBUG] GLTF loading progress:',
          ((progress.loaded / progress.total) * 100).toFixed(1) + '%'
        )
      },
      (error) => {
        console.error('❌ [DEBUG] GLB load error:', error)
      }
    )

    console.log('✅ [DEBUG] GLTF loader initiated')

    console.log('🔍 [DEBUG] Setting up OrbitControls...')
    // Controls
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableZoom = true // Enable zoom for better debugging
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = 0.05

    // Allow Y-axis rotation with 22° limit, keep X-axis full rotation
    const horizontalAngle = Math.PI / 2 // 90° horizontal
    const maxDeviation = (6 * Math.PI) / 180 // 22° in radians

    controls.minPolarAngle = horizontalAngle - maxDeviation // 90° - 22° = 68°
    controls.maxPolarAngle = horizontalAngle + maxDeviation // 90° + 22° = 112°
    controls.minAzimuthAngle = -Infinity // Full left rotation
    controls.maxAzimuthAngle = Infinity // Full right rotation

    // Disable auto-rotate for manual control
    controls.autoRotate = true
    controls.autoRotateSpeed = 1.618

    console.log(
      '✅ [DEBUG] OrbitControls configured - Y-axis ±22°, X-axis full rotation'
    )

    console.log('🔍 [DEBUG] Setting up ResizeObserver...')
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
          console.log('🔍 [DEBUG] Resize handled:', { newW, newH })
        }
      }
    })
    resizeObserver.observe(container)
    console.log('✅ [DEBUG] ResizeObserver attached')

    console.log('🔍 [DEBUG] Starting animation loop...')
    // Animate loop - always runs, throttles when hidden
    function animate() {
      animationId = requestAnimationFrame(animate)
      try {
        controls.update()
        renderer.render(scene, camera)
      } catch (error) {
        console.error('❌ [DEBUG] Animation loop error:', error)
      }
    }
    animate()

    // Initial render
    renderer.render(scene, camera)
    console.log(
      '✅ [DEBUG] Initial render complete - you should see a red cube initially'
    )

    console.log('✅ [DEBUG] 3D Setup complete - running continuously')
  } catch (error) {
    console.error('❌ [DEBUG] Critical error during 3D setup:', error)
    console.error('❌ [DEBUG] Error stack:', error.stack)
  }
}
