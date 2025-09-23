scaffold crt-bloom.js and add a small return API from initializeCrtGlsl() to hand bloom what it needs.

Do it in a new file. Keep crt-glsl.js focused on the overlay shader and animation; put post-processing (composer, bloom, passes) in a separate module. This avoids bloating the core file and lets you toggle bloom per-page without touching the shader.
Suggested structure:
crt-glsl.js (no change to visuals)
Continue exporting initializeCrtGlsl(config), and return handles you need for bloom:
renderer, scene, camera
a reference to the full-screen overlay mesh (or a factory to create the “edge” material)
crt-bloom.js (new)
Imports three/effect-composer passes.
Accepts { renderer, scene, camera, getOverlayGeometryOrMesh }.
Creates an edge/halo mesh on layer 1 (duplicate quad) with the ring-only material.
Wires EffectComposer:
Pass 1: base RenderPass(scene, camera) (layer 0)
Pass 2: bloom source RenderPass (camera.layers set to 1), UnrealBloomPass
Pass 3: composite ShaderPass that does additive RGB, preserves alpha
Exposes render() and setSize(w, h); you call composer.render() instead of renderer.render().
Why separate:
Cleaner responsibilities, easier testing/toggling (enable bloom only when needed).
Webflow embedding stays simple; bloom can be optional.
Future effects (grain, vignette) can live alongside bloom without touching the shader file.

Context
We have a custom ShaderMaterial full-screen overlay that reveals page content via alpha (transparent reveal area, opaque dark area). @crt-glsl

Current renderer/material pipeline is CSS-parity (no color management surprises):
THREE.ColorManagement.enabled = false
renderer.outputColorSpace = THREE.SRGBColorSpace (or outputEncoding = sRGBEncoding)
renderer.toneMapping = THREE.NoToneMapping; material.toneMapped = false
premultipliedAlpha: true and shader outputs premultiplied color: gl_FragColor = vec4(color * alpha, alpha)

The base pass must preserve transparency (reveal shows page content behind canvas).

Goal
Add a bloom effect only to the bright “edge/halo” of the reveal, then composite that bloom additively over the base overlay, preserving the overlay’s alpha and page reveal behavior.

Must-haves
Keep current CSS-parity pipeline unchanged (no tone mapping, premult alpha preserved).
Bloom should NOT brighten the entire overlay; only the edge/halo should contribute.
Maintain responsiveness (resize-safe).
Keep Webflow embedding compatibility (same single canvas, no DOM changes required).
Approach (selective bloom, two-pass + composite)
Use EffectComposer with:
Pass 1: RenderPass for the normal overlay (current scene + material).
Pass 2: A bloom-only render that draws a bright “edge/halo” into a separate buffer.
UnrealBloomPass over the bloom buffer.
Final ShaderPass to composite: result = base.rgb + bloom.rgb, alpha = base.a (premultiplied-safe additive).
To isolate the edge-only source:
Option A (recommended): Duplicate the full-screen mesh with a second material (“edge material”) and put that duplicate on a separate layer (e.g., 1). Keep the original base mesh on layer 0.
Option B: Reuse the same mesh but swap overrideMaterial for the bloom pass to output just a bright ring. Option A is cleaner.
Edge material (bloom source)
Reuse the existing ellipse math but output only a thin ring at the reveal boundary.
Example idea in fragment shader terms (pseudocode):
ellipse = ((x-cx)/rx)^2 + ((y-cy)/ry)^2
ring = smoothstep(1.0 - w, 1.0, ellipse) - smoothstep(1.0, 1.0 + w, ellipse) where w is ring thickness
color = vec3(1.0) * ring (or a tint if desired)
alpha = ring (fully opaque where ring > 0) so bloom has solid source
Output premultiplied: gl_FragColor = vec4(color * alpha, alpha)
Important: This edge material is only used in the bloom scene/layer; it does not affect the base overlay pass.
Composer wiring (pseudocode)
Init:
const composer = new EffectComposer(renderer)
const basePass = new RenderPass(scene, camera) // camera on layers 0
composer.addPass(basePass)
Bloom-only render:
Create bloomRenderTarget scene option:
Option A: Keep same scene and camera, but:
camera.layers.enable(1)
Create a RenderPass for bloomSourcePass that renders only layer 1 (edge mesh on layer 1)
bloomSourcePass.clear = false
composer.addPass(bloomSourcePass)
const bloomPass = new UnrealBloomPass(
new THREE.Vector2(width, height),
strength, radius, threshold
)
composer.addPass(bloomPass)
Composite:
const compositePass = new ShaderPass({
uniforms: { tBase: { value: null }, tBloom: { value: null } },
vertexShader: /* passthrough /,
fragmentShader: uniform sampler2D tBase; uniform sampler2D tBloom; varying vec2 vUv; void main() { vec4 base = texture2D(tBase, vUv); vec4 bloom = texture2D(tBloom, vUv); gl_FragColor = vec4(base.rgb + bloom.rgb, base.a); }
})
composer.addPass(compositePass)
Render loop:
composer.render() instead of renderer.render()
Resizing:
On resizeObserver callback: composer.setSize(newWidth, newHeight); bloomPass.setSize(newWidth, newHeight)
Layer setup (Option A)
Base mesh: layer 0; current overlay material; fully transparent in reveal, opaque in dark overlay; premultiplied alpha output.
Edge mesh (duplicate):
Assign the edge/bloom material described above.
Put it on layer 1.
Keep its geometry identical (full-screen quad).
Do not add to basePass (only rendered by bloom source pass with camera.layers set to 1).
Material/renderer flags to confirm
Keep: THREE.ColorManagement.enabled = false
Keep: renderer.outputColorSpace = THREE.SRGBColorSpace (or outputEncoding for older)
Keep: renderer.toneMapping = THREE.NoToneMapping
Keep: material.toneMapped = false (both base and edge materials)
Keep: premultipliedAlpha: true on renderer; and both base/edge materials write gl_FragColor = vec4(color * alpha, alpha)
Parameters to expose in UI (optional)
Bloom strength: 0.0–2.0 (start ~0.9)
Bloom radius: 0.0–1.5 (start ~0.6)
Bloom threshold: 0.0–1.0 (start ~0.0)
Ring thickness (w): 0.002–0.02 depending on resolution, compute in normalized space (consider u_resolution for consistent thickness)


Optional bloom tint: multiply the ring color before writing to output
Acceptance criteria
Base overlay visually unchanged when bloom strength = 0.0.
With bloom enabled, only the reveal boundary blooms; the dark area and fully transparent reveal area do not glow.
Page content behind canvas remains fully visible where reveal alpha = 0.
Colors match CSS (no color-management surprises).
No flicker on resize; bloom scales correctly.
Deliverables
Code changes to:

Create duplicate edge mesh + material (layer 1)
Initialize EffectComposer with base pass, bloom source pass, UnrealBloomPass, and composite ShaderPass
Handle resize
New UI controls for bloom params (optional)
Clear comments around premultiplied alpha and why the composite preserves base alpha.

Notes
If you prefer faster integration, start with a non-selective bloom (edge ring written into the same pass with alpha=0 but bright RGB), then run UnrealBloomPass for the whole scene and do the same additive composite. However, selective bloom via a separate layer is cleaner and avoids accidentally blooming the dark overlay.
Please implement this exactly, with early returns, readable code, and no placeholders.

---


