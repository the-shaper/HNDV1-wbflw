function initTfHomeUI() {
  console.log('Initializing TF Home UI interactions.')

  // Navigation hover functionality
  const navTriggerIds = ['tfNav1', 'tfNav2', 'tfNav3', 'tfNav4']
  const navTargetIds = ['tfNavTxt1', 'tfNavTxt2', 'tfNavTxt3', 'tfNavTxt4']
  const hoverClass = 'hover' // Define the class name once for reusability and clarity

  // LCD toggle functionality
  const lcdTriggers = ['lcd-1', 'lcd-2', 'lcd-3', 'lcd-4']
  const lcdListeners = [
    'lcdListen-1',
    'lcdListen-2',
    'lcdListen-3',
    'lcdListen-4',
  ]
  const parentQuads = [
    'parentQuad-1',
    'parentQuad-2',
    'parentQuad-3',
    'parentQuad-4',
  ]
  const nonClass = 'non'

  const isTouchDevice = () =>
    'ontouchstart' in window || navigator.maxTouchPoints > 0

  // Initialize navigation hover functionality
  function initNavHover() {
    // Ensure arrays are of the same length to avoid mismatches
    if (navTriggerIds.length !== navTargetIds.length) {
      console.error(
        'Error: Navigation trigger and target arrays have different lengths.'
      )
      return
    }

    const isTouch = isTouchDevice()

    // Define trigger arrays for different breakpoints
    const desktopTriggers = ['tfNav1', 'tfNav2', 'tfNav3', 'tfNav4']
    const mobileTriggers = ['navTitle1', 'navTitle2', 'navTitle3', 'navTitle4']

    // Media query for max-width 1024px
    const mediaQuery = window.matchMedia('(max-width: 1024px)')
    let currentTriggers = mediaQuery.matches ? mobileTriggers : desktopTriggers

    // Store event handlers for cleanup
    const eventHandlers = new Map()

    // Global variables for touch state
    let currentActiveTriggerId = null
    let activatedStates = new Map()

    // Function to attach listeners to current triggers
    function attachListeners() {
      // Clean up previous listeners
      eventHandlers.forEach((handlers, triggerId) => {
        const element = document.getElementById(triggerId)
        if (element) {
          handlers.mouseover &&
            element.removeEventListener('mouseover', handlers.mouseover)
          handlers.mouseout &&
            element.removeEventListener('mouseout', handlers.mouseout)
          if (isTouch) {
            handlers.touchstart &&
              element.removeEventListener('touchstart', handlers.touchstart)
            handlers.touchend &&
              element.removeEventListener('touchend', handlers.touchend)
          }
        }
      })
      eventHandlers.clear()
      activatedStates.clear()
      currentActiveTriggerId = null

      currentTriggers.forEach((triggerId, index) => {
        const triggerElement = document.getElementById(triggerId)
        const targetElement = document.getElementById(navTargetIds[index])

        if (!triggerElement || !targetElement) {
          console.warn(`Elements for ${triggerId} not found. Skipping.`)
          return
        }

        activatedStates.set(triggerId, false)

        // Define handler functions for removal
        const mouseoverHandler = () => {
          targetElement.classList.add(hoverClass)
        }
        const mouseoutHandler = () => {
          targetElement.classList.remove(hoverClass)
        }

        triggerElement.addEventListener('mouseover', mouseoverHandler)
        triggerElement.addEventListener('mouseout', mouseoutHandler)
        eventHandlers.set(triggerId, {
          mouseover: mouseoverHandler,
          mouseout: mouseoutHandler,
        })

        if (isTouch) {
          const touchstartHandler = () => {
            const newActivated = activatedStates.get(triggerId)

            // If switching from another
            if (
              currentActiveTriggerId &&
              currentActiveTriggerId !== triggerId
            ) {
              // Reset the previous one's activated
              activatedStates.set(currentActiveTriggerId, false)

              // Clear previous hover
              const prevIndex = currentTriggers.indexOf(currentActiveTriggerId)
              if (prevIndex !== -1) {
                const prevTarget = document.getElementById(
                  navTargetIds[prevIndex]
                )
                if (prevTarget) {
                  prevTarget.classList.remove(hoverClass)
                }
              }
              const prevTrigger = document.getElementById(
                currentActiveTriggerId
              )
              if (prevTrigger) {
                prevTrigger.classList.remove(hoverClass) // Clear ::hover sim on prev trigger
              }
            }

            // Now for current: add hover if first touch for this button
            if (!newActivated) {
              targetElement.classList.add(hoverClass)
              triggerElement.classList.add(hoverClass) // Simulate ::hover on trigger
              currentActiveTriggerId = triggerId
            }
          }

          const touchendHandler = (e) => {
            if (!activatedStates.get(triggerId)) {
              activatedStates.set(triggerId, true)
              e.preventDefault()
              // No need for stopPropagation as click won't fire
            }
            // For second touchend, do nothing; click will fire naturally
          }

          triggerElement.addEventListener('touchstart', touchstartHandler, {
            passive: true,
          })
          triggerElement.addEventListener('touchend', touchendHandler, {
            passive: false,
          })
          eventHandlers.set(triggerId, {
            ...eventHandlers.get(triggerId),
            touchstart: touchstartHandler,
            touchend: touchendHandler,
          })
        }
      })

      // Global touchend for outside taps (only if touch)
      if (isTouch) {
        const globalTouchendHandler = (e) => {
          if (currentActiveTriggerId) {
            // Check if tap is on any nav trigger
            const isOnNavTrigger = currentTriggers.some((id) => {
              const element = document.getElementById(id)
              return element && element.contains(e.target)
            })

            if (!isOnNavTrigger) {
              // Reset current
              activatedStates.set(currentActiveTriggerId, false)
              const index = currentTriggers.indexOf(currentActiveTriggerId)
              if (index !== -1) {
                const target = document.getElementById(navTargetIds[index])
                if (target) {
                  target.classList.remove(hoverClass)
                }
              }
              const currentTrigger = document.getElementById(
                currentActiveTriggerId
              )
              if (currentTrigger) {
                currentTrigger.classList.remove(hoverClass) // Clear ::hover sim on current trigger
              }
              currentActiveTriggerId = null
            }
          }
        }

        // Clean up if exists (though unlikely on first attach)
        const existingGlobal = document._tfGlobalTouchend
        if (existingGlobal) {
          document.removeEventListener('touchend', existingGlobal)
        }
        document.addEventListener('touchend', globalTouchendHandler, {
          passive: true,
        })
        document._tfGlobalTouchend = globalTouchendHandler // Store for cleanup
      }
    }

    // Initial attachment
    attachListeners()

    // Handle resize/breakpoint changes
    let prevMatches = mediaQuery.matches
    const resizeHandler = () => {
      if (mediaQuery.matches !== prevMatches) {
        prevMatches = mediaQuery.matches
        currentTriggers = mediaQuery.matches ? mobileTriggers : desktopTriggers
        attachListeners() // Re-attach with new triggers
      }
    }

    // Clean up existing if any
    const existingResize = window._tfResizeHandler
    if (existingResize) {
      window.removeEventListener('resize', existingResize)
    }
    window.addEventListener('resize', resizeHandler)
    window._tfResizeHandler = resizeHandler

    const existingMedia = window._tfMediaHandler
    if (existingMedia) {
      mediaQuery.removeEventListener('change', existingMedia)
    }
    mediaQuery.addEventListener('change', resizeHandler)
    window._tfMediaHandler = resizeHandler
  }

  // Check if any LCD listener is active (nonClass removed)
  function updateNavButtonsBlur() {
    const navButtons = document.querySelectorAll('.tf-home-nav-button')
    const anyActive = Array.from(lcdListeners).some((id) => {
      const element = document.getElementById(id)
      return element && !element.classList.contains(nonClass)
    })

    navButtons.forEach((button) => {
      if (anyActive) {
        button.classList.add('blur')
      } else {
        button.classList.remove('blur')
      }
    })

    // Handle rive-canvas pointer events
    const riveCanvas = document.getElementById('rive-canvas')
    if (riveCanvas) {
      if (anyActive) {
        riveCanvas.style.pointerEvents = 'none'
      } else {
        riveCanvas.style.pointerEvents = 'auto'
      }
    }
  }

  // Initialize LCD toggle functionality
  function initLcdToggles() {
    const mediaQuery = window.matchMedia('(max-width: 430px)')

    // Outside click handler for mobile
    const handleOutsideClick = (e) => {
      if (!mediaQuery.matches) return

      let isInsideAnyContainer = false

      // Check if click is on rive-canvas - treat as outside click
      const riveCanvas = document.getElementById('rive-canvas')
      if (
        riveCanvas &&
        (riveCanvas === e.target || riveCanvas.contains(e.target))
      ) {
        isInsideAnyContainer = false
      } else {
        // Check parentQuads
        parentQuads.forEach((quadId) => {
          const quad = document.getElementById(quadId)
          if (quad && quad.contains(e.target)) {
            isInsideAnyContainer = true
          }
        })

        // Check triggers
        lcdTriggers.forEach((triggerId) => {
          const trigger = document.getElementById(triggerId)
          if (trigger && trigger.contains(e.target)) {
            isInsideAnyContainer = true
          }
        })
      }

      if (!isInsideAnyContainer) {
        // Close all active listeners
        lcdListeners.forEach((listenerId) => {
          const listener = document.getElementById(listenerId)
          if (listener && !listener.classList.contains(nonClass)) {
            listener.classList.add(nonClass)
          }
        })

        // Unblur all triggers
        lcdTriggers.forEach((triggerId) => {
          const trigger = document.getElementById(triggerId)
          if (trigger) {
            trigger.classList.remove(nonClass)
          }
        })

        updateNavButtonsBlur()
      }
    }

    document.addEventListener('click', handleOutsideClick, true)

    lcdTriggers.forEach((triggerId, index) => {
      const trigger = document.getElementById(triggerId)
      const listener = document.getElementById(lcdListeners[index])
      const parentQuad = document.getElementById(parentQuads[index])

      if (!trigger || !listener || !parentQuad) {
        console.warn(`LCD elements for ${triggerId} not found. Skipping.`)
        return
      }

      // Toggle non class on click and update nav buttons
      trigger.addEventListener('click', (e) => {
        e.stopPropagation()

        const isMobile = mediaQuery.matches
        const wasActive = !listener.classList.contains(nonClass)

        if (!isMobile) {
          listener.classList.toggle(nonClass)
        } else {
          if (wasActive) {
            // Deactivate this
            listener.classList.add(nonClass)
            // Unblur others
            lcdTriggers.forEach((otherId, otherIndex) => {
              if (otherIndex !== index) {
                const otherTrigger = document.getElementById(otherId)
                if (otherTrigger) {
                  otherTrigger.classList.remove(nonClass)
                }
              }
            })
          } else {
            // Deactivate others
            lcdListeners.forEach((otherId, otherIndex) => {
              if (otherIndex !== index) {
                const otherListener = document.getElementById(otherId)
                if (otherListener) {
                  otherListener.classList.add(nonClass)
                }
              }
            })
            // Activate this
            listener.classList.remove(nonClass)
            // Blur others
            lcdTriggers.forEach((otherId, otherIndex) => {
              if (otherIndex !== index) {
                const otherTrigger = document.getElementById(otherId)
                if (otherTrigger) {
                  otherTrigger.classList.add(nonClass)
                }
              }
            })
          }
        }
        updateNavButtonsBlur()
      })

      // Add non class when mouse leaves parent quad and update nav buttons
      parentQuad.addEventListener('mouseleave', () => {
        if (!listener.classList.contains(nonClass)) {
          listener.classList.add(nonClass)
          updateNavButtonsBlur()
        }
      })
    })
  }

  // Initialize all functionality
  initNavHover()
  initLcdToggles()
}

// Export the function as default for dynamic import in main.js
export default initTfHomeUI
