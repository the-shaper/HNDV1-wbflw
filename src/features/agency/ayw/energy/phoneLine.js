;(function () {
  'use strict'

  // --- Default Configurable Parameters ---
  // This 'config' object will hold the currently active parameters.
  // It will be initialized from one of the modes.
  const config = {}

  // --- Mode-Specific Configurations ---
  const modeConfigs = {
    A: {
      lineThickness: 3,
      lineColor: '#FF3C23',
      waveAmplitude: 9,
      spatialFrequency: 3,
      animationSpeed: 0.025,
    },
    B: {
      // Example values for Mode B - please customize
      lineThickness: 2,
      lineColor: '#0189d7',
      waveAmplitude: 16,
      spatialFrequency: 6,
      animationSpeed: 0.06,
    },
  }

  // Initialize main config with Mode A's settings by default
  Object.assign(config, modeConfigs.A)

  // --- State Variables ---
  let canvas = null
  let ctx = null
  let parentElement = null
  let phase = 0 // Or 0, your preference for starting phase
  let animationFrameId = null
  let isPlaying = false // Correctly initialize as false for auto-play logic
  let resizeObserver = null

  /**
   * Adjusts canvas dimensions for high DPI screens and draws the wave.
   */
  function drawWave() {
    if (!canvas || !ctx || !parentElement) {
      // Ensure parentElement is available for clientWidth/Height
      if (!parentElement) {
        parentElement = document.querySelector('.ayw-phone-line-size-wrap')
        if (!parentElement) return
      } else {
        return
      }
    }

    const dpr = window.devicePixelRatio || 1
    const logicalWidth = parentElement.clientWidth // Current width of the parent
    const logicalHeight = parentElement.clientHeight // Current height of the parent

    // Set the actual drawing buffer size considering DPR for sharpness
    canvas.width = logicalWidth * dpr
    canvas.height = logicalHeight * dpr

    // Set the CSS display size of the canvas
    // canvas.style.width is '100%'
    // canvas.style.height is '100%', dimensions are taken from parentElement's clientWidth/Height
    // No explicit setting of canvas.style.height here as it's 100% from init,
    // but if we needed to force it to the clientHeight (e.g. if parent had padding), this would be the place.

    // Scale the context so that all drawing operations use logical pixel values
    ctx.save() // Save the default state
    ctx.scale(dpr, dpr)

    const centerY = logicalHeight / 2

    // Clear the canvas (using logical dimensions)
    ctx.clearRect(0, 0, logicalWidth, logicalHeight)

    // Configure context properties
    ctx.lineWidth = config.lineThickness
    ctx.strokeStyle = config.lineColor

    // Begin drawing the path
    ctx.beginPath()
    // Pin the start of the wave to the vertical center
    ctx.moveTo(0, centerY)

    // Loop from x=1 to logicalWidth - 1 to draw the wave segments
    for (let x = 1; x < logicalWidth; x++) {
      // spatialAngle determines the shape of the wave along its length
      // (x / logicalWidth) normalizes x to a 0-1 range
      // config.spatialFrequency determines how many full sine cycles fit
      // 2 * Math.PI makes it a full cycle for frequency = 1
      const spatialAngle =
        (x / logicalWidth) * config.spatialFrequency * 2 * Math.PI
      const spatialComponent = Math.sin(spatialAngle) // Sinusoidal shape along x-axis

      // temporalComponent makes the wave animate over time
      const temporalComponent = Math.cos(phase) // Cosine variation for standing wave

      const y =
        centerY + config.waveAmplitude * spatialComponent * temporalComponent
      ctx.lineTo(x, y)
    }

    // Pin the end of the wave to the vertical center
    ctx.lineTo(logicalWidth, centerY)

    // Stroke the path
    ctx.stroke()

    ctx.restore() // Restore the context to its state before scaling
  }

  /**
   * The main animation loop.
   */
  function animate() {
    if (!isPlaying) {
      return
    }
    phase += config.animationSpeed
    drawWave()
    animationFrameId = requestAnimationFrame(animate)
  }

  // --- Public Control API Functions ---

  /**
   * Starts or resumes the wave animation.
   */
  function play() {
    if (isPlaying) {
      return
    }
    isPlaying = true
    // Ensure animate is called to start the loop if it's not already running
    if (!animationFrameId) {
      animate()
    }
  }

  /**
   * Pauses the wave animation.
   */
  function pause() {
    if (!isPlaying) {
      return
    }
    isPlaying = false
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  /**
   * Resets the temporal component of the wave (phase) to 0.
   * If paused, this will redraw the wave in its initial maximum amplitude shape.
   */
  function resetPhase() {
    phase = 0
    if (!isPlaying) {
      // If paused, redraw immediately to show the reset state
      drawWave()
    }
  }

  /**
   * Updates a configurable parameter of the wave.
   * @param {string} parameterName - The name of the parameter to update.
   * @param {*} value - The new value for the parameter.
   */
  function updateParameter(parameterName, value) {
    const validParameters = [
      'lineThickness',
      'lineColor',
      'waveAmplitude',
      'spatialFrequency',
      'animationSpeed',
    ]

    if (!validParameters.includes(parameterName)) {
      console.warn(`Waveform: Invalid parameter name "${parameterName}"`)
      return
    }

    config[parameterName] = value

    // If the wave is paused, redraw to reflect the parameter change immediately
    if (!isPlaying) {
      drawWave()
    }
    // If playing, the animation loop will pick up the new parameter value on the next frame.
    // For canvasHeight, drawWave itself handles applying the new height.
  }

  /**
   * Sets the waveform parameters based on a predefined mode.
   * @param {string} modeName - The name of the mode to activate ("A" or "B").
   */
  function setMode(modeName) {
    const newModeConfig = modeConfigs[modeName]
    if (!newModeConfig) {
      console.warn(`Waveform: Unknown mode "${modeName}"`)
      return
    }

    // Update the main config object with all parameters from the selected mode
    Object.assign(config, newModeConfig)

    if (!isPlaying) {
      drawWave() // Redraw if paused to show changes immediately
    }
    console.log(`Waveform mode set to: ${modeName}`)
  }

  /**
   * Initializes the waveform an
   * Finds the target parent, creates and appends the canvas,
   * sets initial styles, and draws the first frame.
   */
  function init() {
    parentElement = document.querySelector('.ayw-phone-line-size-wrap')
    if (!parentElement) {
      console.error(
        'Waveform: Parent element .ayw-phone-line-size-wrap not found.'
      )
      return
    }

    // Prevent multiple initializations if script is run more than once
    if (parentElement.querySelector('canvas.ayw-waveform-canvas')) {
      console.warn(
        'Waveform: Canvas already initialized in this parent element.'
      )
      return
    }

    canvas = document.createElement('canvas')
    canvas.classList.add('ayw-waveform-canvas')

    // Style the canvas to fill its parent
    canvas.style.width = '100%'
    canvas.style.height = '100%' // Make canvas height responsive to parent

    parentElement.appendChild(canvas)
    ctx = canvas.getContext('2d')

    if (!ctx) {
      console.error('Waveform: Failed to get 2D rendering context.')
      canvas.remove()
      canvas = null
      return
    }

    resizeObserver = new ResizeObserver((entries) => {
      if (!isPlaying) {
        drawWave()
      }
    })
    resizeObserver.observe(parentElement)

    // Expose the API on the window object
    window.waveform = {
      play,
      pause,
      resetPhase,
      updateParameter,
      setMode, // Expose the new setMode function
    }

    // Add event listeners for mode triggers
    const modeTriggers = document.querySelectorAll('[data-set-mode]')
    modeTriggers.forEach((trigger) => {
      trigger.addEventListener('click', function () {
        const mode = this.getAttribute('data-set-mode')
        if (modeConfigs[mode]) {
          // Check if the mode exists in our configurations
          setMode(mode)
        } else {
          console.warn(
            `Waveform: Invalid mode value "${mode}" on trigger element or mode not defined.`
          )
        }
      })
    })

    // Initial draw (happens regardless of play state)
    drawWave()

    // Now, explicitly start the animation if auto-play is desired
    play() // This will now correctly start the animation
  }

  /**
   * Cleans up the waveform: stops animation, removes observers, and removes the canvas.
   * This is an additional utility function not explicitly requested but good for completeness.
   */
  function destroy() {
    pause() // Stop animation
    if (resizeObserver && parentElement) {
      resizeObserver.unobserve(parentElement)
      resizeObserver = null
    }
    if (canvas) {
      canvas.remove()
      canvas = null
      ctx = null
    }
    parentElement = null
    if (window.waveform) {
      delete window.waveform // Remove API from window
    }
    // Note: Event listeners on DOMContentLoaded are not removed here,
    // but they fire once and self-remove or are harmless after init.
  }
  // Optionally, expose destroy if needed:
  // if (window.waveform) window.waveform.destroy = destroy;
  // Or add it to the API object in init. For now, keeping it internal.

  // --- DOM Ready ---
  // Wait for the DOM to be fully loaded before initializing
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    // DOMContentLoaded has already fired
    init()
  }
})()
