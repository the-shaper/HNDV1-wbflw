import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { SavePass } from 'three/examples/jsm/postprocessing/SavePass.js'

// Set up selective bloom for the CRT reveal edge while preserving base alpha
// Expects handles returned by initializeCrtGlsl() and wires a composer that renders
// the base overlay and adds bloom from a ring-only duplicate mesh.
export function setupCrtBloom(handles, options = {}) {
  try {
    console.log('[bloom] setup start with options:', options)
  } catch (_) {}
  const { renderer, scene, camera, baseMesh, baseMaterial } = handles || {}
  if (!renderer || !scene || !camera || !baseMesh || !baseMaterial) {
    console.warn('setupCrtBloom: missing required handles')
    return null
  }

  // Apply bloom across the full base render (no edge-only mesh). We still
  // preserve the original alpha by saving the base frame and compositing
  // base.rgb + bloom.rgb with base.a.

  // Composer wiring
  const size = renderer.getSize(new THREE.Vector2())
  const composer = new EffectComposer(renderer)
  try {
    console.log('[bloom] composer created. size:', size.x, size.y)
  } catch (_) {}

  const basePass = new RenderPass(scene, camera)
  composer.addPass(basePass)

  // Save a copy of the base (with correct alpha) for final composite
  const savePass = new SavePass(new THREE.WebGLRenderTarget(size.x, size.y))
  composer.addPass(savePass)

  // Run bloom over the same base render
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(size.x, size.y),
    options.strength ?? 0.9,
    options.radius ?? 0.6,
    options.threshold ?? 0.0
  )
  composer.addPass(bloomPass)

  // Composite: base.rgb + bloom.rgb, keep base.a to preserve transparency
  const compositePass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null }, // bloom chain
      tBase: { value: savePass.renderTarget.texture },
      uBloomIntensity: { value: options.enabled === false ? 0.0 : 1.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse; // bloom result
      uniform sampler2D tBase;    // saved base
      uniform float uBloomIntensity; // 0 disables bloom contribution
      varying vec2 vUv;
      void main() {
        vec4 base  = texture2D(tBase, vUv);
        vec4 bloom = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(base.rgb + bloom.rgb * uBloomIntensity, base.a);
      }
    `,
  })
  compositePass.renderToScreen = true
  composer.addPass(compositePass)
  try {
    console.log('[bloom] passes wired (base/save/bloom/composite)')
  } catch (_) {}

  function setSize(width, height) {
    if (!width || !height) return
    composer.setSize(width, height)
    bloomPass.setSize(width, height)

    // Rebuild save target to match new size
    const newRT = new THREE.WebGLRenderTarget(width, height)
    savePass.renderTarget.dispose()
    savePass.renderTarget = newRT
    compositePass.material.uniforms.tBase.value = newRT.texture
  }

  function render() {
    composer.render()
  }

  function updateBloomParams(params = {}) {
    const { strength, radius, threshold, enabled } = params
    if (typeof strength === 'number') bloomPass.strength = strength
    if (typeof radius === 'number') bloomPass.radius = radius
    if (typeof threshold === 'number') bloomPass.threshold = threshold
    if (typeof enabled === 'boolean') {
      bloomPass.enabled = enabled
      compositePass.material.uniforms.uBloomIntensity.value = enabled
        ? 1.0
        : 0.0
    }
  }

  function dispose() {
    try {
      composer?.dispose?.()
    } catch (_) {}
  }

  return {
    composer,
    render,
    setSize,
    updateBloomParams,
    dispose,
  }
}

// Convenience hook for non-module sites (Webflow)
// No window helpers here: bloom must be wired by crt-glsl.js internally
