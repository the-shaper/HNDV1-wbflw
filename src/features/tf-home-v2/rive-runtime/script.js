import { Rive, Fit } from '@rive-app/webgl2' // WebGL 2 renderer
// Build an absolute URL for the Rive binary; Vite will copy it to /dist
const twilightRiv = new URL('./tf-dialog-run.riv', import.meta.url).href

/**
 * Boot a Rive animation on the supplied canvas selector.
 * Returns the Rive instance or early-returns if the canvas isn't in the DOM.
 *
 * @param {string} [selector='#rive-canvas']
 */
export default function initRiveCanvas(selector = '#rive-canvas') {
  const canvas = document.querySelector(selector)
  if (!canvas) {
    console.warn(`[initRiveCanvas] canvas "${selector}" not found – skipping`)
    return
  }

  // eslint-disable-next-line no-unused-vars
  const riveInstance = new Rive({
    canvas,
    src: twilightRiv,
    autoplay: true,
    fit: Fit.Contain,
    minX: 45,
    minY: 45,
    maxX: 75,
    maxY: 75,
    //  artboard: 'Default',          // <- uncomment / rename if needed
    stateMachines: 'State Machine 1',
    useOffscreenRenderer: true,
    onLoad: () => riveInstance.resizeDrawingSurfaceToCanvas(), // crisp on retina screens
  })

  return riveInstance // optional – gives you a handle if you need it
}
