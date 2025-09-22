console.log('[CrtIntro] Script file loaded successfully!')

import anime from 'animejs'

// Minimal fallback settings (hardcoded defaults, overridable via data attrs)
const fallbackSettings = {
  dotDuration: 120,
  squishDuration: 160,
  lineHoldDuration: 0,
  horizontalDuration: 260,
  verticalDuration: 111,
  finalPaddingPx: 0,
  anticipationStretchPx: 6,
  anticipationDuration: 140,
  anticipationRecoilDuration: 120,
  glowStrength: 1.0,
  minRy: 1,
  flashOpacity: 0.9,
  glowOpacity: 0.45,
  easing: 'easeOutQuad',
  fadeIn: false,
  fadeInDuration: 250,
  startDelay: 0,
}

// Read settings from data attributes on containerEl
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
  if (data['fade-in']) settings.fadeIn = data['fade-in'] === 'true'
  if (data['fade-in-duration'])
    settings.fadeInDuration = parseInt(data['fade-in-duration'], 10)
  if (data['start-delay'])
    settings.startDelay = parseInt(data['start-delay'], 10)
  return settings
}

// CRT Intro Creation Function
export async function createCrtIntro(containerEl, options = {}) {
  console.log('[CrtIntro] createCrtIntro called with:', {
    containerEl,
    containerTagName: containerEl?.tagName,
    containerClasses: containerEl?.className,
    containerId: containerEl?.id,
    options,
  })

  if (!containerEl) {
    console.error('[CrtIntro] Invalid container element provided.')
    return
  }

  if (containerEl.tagName.toLowerCase() === 'canvas') {
    console.error('[CrtIntro] Container cannot be a <canvas>. Use a <div>.')
    return
  }

  // Ensure container is positioned relative for absolute children
  if (window.getComputedStyle(containerEl).position === 'static') {
    containerEl.style.position = 'relative'
  }

  console.log('[CrtIntro] Container validated successfully')

  // Merge settings
  const settings = {
    ...fallbackSettings,
    ...readSettingsFromDOM(containerEl),
    ...options,
  }

  console.log('[CrtIntro] Final settings:', settings)

  // Query existing elements (like energy.js queries canvas)
  const overlay = containerEl.querySelector('#crt-overlay')
  const svg = containerEl.querySelector('#crt-svg')
  const maskEllipse = containerEl.querySelector('#mask-ellipse')
  const flashWhite = containerEl.querySelector('#flash-white')
  const flashGlow = containerEl.querySelector('#flash-glow')
  const blur1 = containerEl.querySelector(
    '#crtGlow feGaussianBlur[result="blur1"]'
  )
  const blur2 = containerEl.querySelector(
    '#crtGlow feGaussianBlur[result="blur2"]'
  )

  if (
    !overlay ||
    !svg ||
    !maskEllipse ||
    !flashWhite ||
    !flashGlow ||
    !blur1 ||
    !blur2
  ) {
    console.warn(
      '[CrtIntro] Required elements not found in container—embed #crt-overlay with SVG first. Overlay: ' +
        !!overlay +
        ', SVG: ' +
        !!svg +
        ', Ellipse: ' +
        !!maskEllipse +
        ', Flash: ' +
        !!flashWhite +
        ', Glow: ' +
        !!flashGlow
    )
    return // Early return—no animation
  }

  console.log('[CrtIntro] Elements found - ready to animate')

  // Apply inline styles to existing overlay/SVG (like phoneLine.js styles canvas)
  overlay.style.position = 'absolute'
  overlay.style.inset = '0'
  overlay.style.background = '#000'
  overlay.style.zIndex = '10'
  overlay.style.opacity = '1'
  overlay.style.pointerEvents = 'auto'
  overlay.style.overflow = 'hidden'
  overlay.style.width = '100%'
  overlay.style.height = '100%'

  svg.style.width = '100%'
  svg.style.height = '100%'
  svg.style.display = 'block'

  // Reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    overlay.style.transition = 'opacity 200ms ease-out'
    overlay.style.opacity = '0'
    return
  }

  console.log('[CrtIntro] Starting animation')
  try {
    const tl = await executeAnimation(settings, containerEl)
    window._crtTl = tl
    console.log('[CrtIntro] Timeline created')
  } catch (error) {
    console.error('[CrtIntro] Animation execution failed:', error)
    overlay.style.transition = 'opacity 200ms ease-out'
    overlay.style.opacity = '0'
    setTimeout(() => {
      overlay.style.pointerEvents = 'none'
    }, 220)
  }

  // Cleanup (fade and disable)
  function cleanup() {
    if (window._crtTl) {
      try {
        window._crtTl.pause()
      } catch (e) {}
    }
    overlay.style.transition = 'opacity 200ms ease-out'
    overlay.style.opacity = '0'
    setTimeout(() => {
      overlay.style.pointerEvents = 'none'
    }, 220)
    console.log('[CrtIntro] Cleanup - faded')
  }

  return {
    destroy: cleanup,
    runAnimation: () => createCrtIntro(containerEl, options), // Re-run
  }
}

// Move all animation functions to module level (before createCrtIntro)
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function setupSvgSizing(containerEl, svgId = 'crt-svg') {
  const svg = containerEl.querySelector('#' + svgId)
  const cw = containerEl.clientWidth
  const ch = containerEl.clientHeight
  if (!svg) {
    console.warn('[CrtIntro] SVG #' + svgId + ' not found')
    return { cw, ch }
  }
  svg.setAttribute('viewBox', `0 0 ${cw} ${ch}`)
  return { cw, ch }
}

function applyVisualParams(params) {
  const blur1 = document.querySelector(
    '#crtGlow feGaussianBlur[result="blur1"]'
  )
  const blur2 = document.querySelector(
    '#crtGlow feGaussianBlur[result="blur2"]'
  )
  const s = params.glowStrength
  if (blur1) blur1.setAttribute('stdDeviation', String(12 * s))
  if (blur2) blur2.setAttribute('stdDeviation', String(24 * s))
  const flashWhite = document.getElementById('flash-white')
  const flashGlow = document.getElementById('flash-glow')
  if (flashWhite)
    flashWhite.setAttribute('opacity', String(clamp(params.flashOpacity, 0, 1)))
  if (flashGlow)
    flashGlow.setAttribute('opacity', String(clamp(params.glowOpacity, 0, 1)))
}

function resetOverlayState(containerEl) {
  const overlay = containerEl.querySelector('#crt-overlay')
  const maskEllipse = containerEl.querySelector('#mask-ellipse')
  if (overlay) {
    overlay.style.opacity = '1'
    overlay.style.pointerEvents = 'auto'
  }
  if (maskEllipse) {
    maskEllipse.setAttribute('rx', '2')
    maskEllipse.setAttribute('ry', '2')
  }
}

function computeTimelineEasing(params) {
  return params.easing
}

async function executeAnimation(params, containerEl) {
  const overlay = containerEl.querySelector('#crt-overlay')
  const svg = containerEl.querySelector('#crt-svg')
  const maskEllipse = containerEl.querySelector('#mask-ellipse')
  if (!overlay || !svg || !maskEllipse) {
    console.warn('[CrtIntro] Elements missing in execute - aborting')
    return null
  }
  const dims = setupSvgSizing(containerEl)
  if (dims.cw === 0 || dims.ch === 0) {
    console.warn('[CrtIntro] Zero dims - fallback fade')
    overlay.style.transition = 'opacity 200ms ease-out'
    overlay.style.opacity = '0'
    setTimeout(() => {
      overlay.style.pointerEvents = 'none'
    }, 220)
    return null
  }
  const cx = Math.round(dims.cw / 2)
  const cy = Math.round(dims.ch / 2)
  const maxRx = Math.round(dims.cw / 2 + params.finalPaddingPx)
  const maxRy = Math.round(dims.ch / 2 + params.finalPaddingPx)
  maskEllipse.setAttribute('cx', cx)
  maskEllipse.setAttribute('cy', cy)
  maskEllipse.setAttribute('rx', '2')
  maskEllipse.setAttribute('ry', '2')
  applyVisualParams(params)
  if (window._crtTl) {
    try {
      window._crtTl.pause()
    } catch (e) {}
  }
  const tl = anime.timeline({
    autoplay: true,
    easing: computeTimelineEasing(params),
  })
  window._crtTl = tl
  tl.add({
    targets: maskEllipse,
    rx: [2, 8],
    ry: [2, 8],
    duration: params.dotDuration,
  })
    .add({
      targets: maskEllipse,
      ry: params.minRy,
      duration: params.squishDuration,
    })
    .add(
      (function () {
        const frames = []
        const hold = params.lineHoldDuration
        const antPx = params.anticipationStretchPx
        const antMs = params.anticipationDuration
        const recMs = params.anticipationRecoilDuration
        if (hold > 0) frames.push({ value: '+=0', duration: hold })
        if (antPx > 0 && antMs > 0)
          frames.push({ value: `+=${antPx}`, duration: antMs })
        if (antPx > 0 && recMs > 0)
          frames.push({ value: `-=${antPx}`, duration: recMs })
        frames.push({ value: maxRx, duration: params.horizontalDuration })
        return { targets: maskEllipse, rx: frames }
      })()
    )
    .add({ targets: maskEllipse, ry: maxRy, duration: params.verticalDuration })
    .add({
      targets: overlay,
      opacity: [1, 0],
      duration: 420,
      complete: function () {
        console.log('[CrtIntro] Fade complete - revealing content') // Temp log
        overlay.style.pointerEvents = 'none'
      },
    })
  function alignOnce() {
    const { cw, ch } = setupSvgSizing(containerEl)
    if (maskEllipse) {
      maskEllipse.setAttribute('rx', String(maxRx))
      maskEllipse.setAttribute('ry', String(maxRy))
    }
  }
  alignOnce()
  // Add resize listener to container if needed (debounced for performance)
  const resizeObserver = new ResizeObserver(alignOnce)
  resizeObserver.observe(containerEl)
  console.log('[CrtIntro] Executing animation')
  return tl
}

// Expose global API for manual control (updated to use container)
window.CrtIntroAPI = {
  runAnimation: (containerEl) => {
    const overlay = containerEl?.querySelector('#crt-overlay')
    if (overlay) {
      if (window._crtTl) {
        try {
          window._crtTl.pause()
        } catch (e) {}
      }
      containerEl.removeChild(overlay)
    }
    console.log('[CrtIntro] Instance destroyed successfully.')
  },
}

// Auto-initialization (like the others)
function initializeCrtIntro() {
  console.log('[CrtIntro] initializeCrtIntro called')
  const containers = document.querySelectorAll('.tf-home-intro-content')
  console.log(
    `[CrtIntro] Found ${containers.length} .tf-home-intro-content containers`
  )
  if (containers.length === 0) {
    console.warn(
      '[CrtIntro] No .tf-home-intro-content found - embed SVG HTML first'
    )
    return
  }
  containers.forEach(async (container, index) => {
    const svg = container.querySelector('#crt-svg')
    if (!svg) {
      console.warn(`[CrtIntro] No SVG in container ${index + 1} - skipping`)
      return
    }
    console.log(
      `[CrtIntro] Processing container ${index + 1}/${containers.length}:`,
      {
        className: container.className,
        dims: `${container.clientWidth}x${container.clientHeight}`,
      }
    )
    try {
      await createCrtIntro(container, {})
      console.log(`[CrtIntro] Initialized container ${index + 1}`)
    } catch (error) {
      console.error(`[CrtIntro] Error in container ${index + 1}:`, error)
    }
  })
}

// Standard DOM ready init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCrtIntro)
} else {
  initializeCrtIntro()
}
