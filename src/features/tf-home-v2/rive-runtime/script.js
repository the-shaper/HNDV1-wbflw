import { Rive, Fit } from '@rive-app/webgl2' // WebGL 2 renderer

const twilightRivUrl =
  'https://246nut3nns.ufs.sh/f/Il8RTlUMQ40GytzttPxPd9iEYCg6HMznOBZwoqIaeFupWNVt'

/**
 * Boot a Rive animation on the supplied canvas selector.
 * Returns a Promise that resolves with the Rive instance after loading, or null if canvas not found.
 *
 * @param {string} [selector='#rive-canvas']
 * @returns {Promise<Rive|null>}
 */
export default function initRiveCanvas(selector = '#rive-canvas') {
  return new Promise((resolve, reject) => {
    const canvas = document.querySelector(selector)
    if (!canvas) {
      console.warn(`[initRiveCanvas] canvas "${selector}" not found – skipping`)
      resolve(null)
      return
    }

    console.log(`[initRiveCanvas] Loading Rive from: ${twilightRivUrl}`)

    const isSafari =
      /safari/i.test(navigator.userAgent) &&
      !/chrome|crios|android/i.test(navigator.userAgent)
    const dprClamped = Math.min(
      window.devicePixelRatio || 1,
      isSafari ? 1.25 : 1.5
    )

    // eslint-disable-next-line no-unused-vars
    const riveInstance = new Rive({
      canvas,
      src: twilightRivUrl, // Let Rive handle direct URL load (worked pre-Vite)
      autoplay: true,
      fit: Fit.Contain,

      minY: 40,
      minX: 40,
      maxX: 50,
      maxY: 50,
      //  artboard: 'Default',          // <- uncomment / rename if needed
      stateMachines: 'State Machine 1',
      useOffscreenRenderer: !isSafari,
      onLoad: () => {
        const adjustCanvas = () => {
          const { clientWidth, clientHeight } = canvas
          if (!clientWidth || !clientHeight) return
          canvas.width = Math.round(clientWidth * dprClamped)
          canvas.height = Math.round(clientHeight * dprClamped)
          riveInstance.resizeDrawingSurfaceToCanvas()
        }

        adjustCanvas()
        console.log('[initRiveCanvas] Rive loaded successfully')
        resolve(riveInstance)

        // Responsive refit: Handle window resize and device pixel changes (fixes squeezing)
        let resizeListener = null
        let mediaQuery = null
        const computeSize = () => adjustCanvas()

        // Window resize (for screen size changes)
        resizeListener = () => computeSize()
        window.addEventListener('resize', resizeListener)

        // Device pixel ratio (for zoom/multi-monitor)
        mediaQuery = window.matchMedia(
          `(resolution: ${window.devicePixelRatio}dppx)`
        )
        mediaQuery.addEventListener('change', computeSize)

        // Cleanup on unload (optional, prevents leaks)
        const cleanup = () => {
          if (resizeListener)
            window.removeEventListener('resize', resizeListener)
          if (mediaQuery) mediaQuery.removeEventListener('change', computeSize)
        }
        window.addEventListener('beforeunload', cleanup)
      },
      onLoadError: (err) => {
        console.error('[initRiveCanvas] Rive load error:', err)
        reject(err)
      },
    })
  })
}
