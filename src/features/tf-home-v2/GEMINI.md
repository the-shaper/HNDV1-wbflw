### Shader Refactoring (Completed)

- [x] **Create a Common Shader Chunk:** Isolate the repeated Simplex Noise functions (`snoise`, `mod289`, `permute`, `taylorInvSqrt`) into a single JavaScript string variable named `NOISE_SHADER_CHUNK`.
- [x] **Refactor the Vertex Shader:** Remove the noise functions from `VERTEX_SHADER_SOURCE` and prepend the new `NOISE_SHADER_CHUNK` to it.
- [x] **Refactor the Liquid Post-Processing Shader:** Remove the noise functions from the `LiquidShader`'s fragment shader and prepend the new `NOISE_SHADER_CHUNK` to it.
- [x] **Verification:** After the code is refactored, I will ask you to perform a visual check to confirm that the animation and effects still render correctly, as there are no automated tests for this project.

### Secondary Optimization Plan (Completed)

- [x] **Simplify DOMContentLoaded Logic:** Remove the redundant `document.readyState` check and rely on a single `DOMContentLoaded` event listener for initialization.
- [x] **Remove Unused `fileInput` Variable:** Delete the declaration and assignment of the `fileInput` variable, as it is no longer used.
- [x] **Streamline GUI Update Logic:** Refactor the `createImageGUI` function to remove redundant checks for `imagePlane` existence.

### Vertex-Based Liquid Effect (Performance Test)

1.  **Create a New Scene Object:**
    *   Instantiate a new, highly-segmented `THREE.PlaneGeometry` (e.g., 128x128 segments).
    *   Create a new `THREE.ShaderMaterial` for this plane.
2.  **Develop the Vertex Shader:**
    *   The new material's vertex shader will perform the "liquid" calculations, displacing the plane's vertices using the existing noise functions.
    *   The background image will be passed as a `uniform sampler2D` texture to this shader.
3.  **Develop the Fragment Shader:**
    *   The fragment shader will be very simple: its only job is to apply the texture to the displaced geometry.
4.  **Add GUI Controls:**
    *   Create a new folder in the GUI named "Optimized Liquid Effect (Vertex)".
    *   Add controls to toggle this new effect on/off and adjust its parameters (e.g., speed, amount, frequency).
5.  **Implement Control Logic:**
    *   Ensure that when the new vertex effect is enabled, the old fragment-based `liquidPass` and the original `imagePlane` are automatically disabled to allow for a clear A/B comparison.
6.  **Verification:**
    *   Visually compare the performance and aesthetics of the original fragment-based effect versus the new vertex-based effect.

---
### PACT

- **Do not add a "Load Image" button or any image-loading functionality to the "Optimized Liquid Effect (Vertex)" GUI or its associated code unless explicitly asked to.** The optimized effect is a lens/filter and should not be responsible for loading its own textures.
---