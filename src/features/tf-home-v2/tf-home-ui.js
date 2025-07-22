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

  // Initialize navigation hover functionality
  function initNavHover() {
    // Ensure arrays are of the same length to avoid mismatches
    if (navTriggerIds.length !== navTargetIds.length) {
      console.error(
        'Error: Navigation trigger and target arrays have different lengths.'
      )
      return
    }

    navTriggerIds.forEach((triggerId, index) => {
      const triggerElement = document.getElementById(triggerId)
      const targetElement = document.getElementById(navTargetIds[index])

      if (!triggerElement || !targetElement) {
        console.warn(`Elements for ${triggerId} not found. Skipping.`)
        return
      }

      // Add mouseover event listener
      triggerElement.addEventListener('mouseover', () => {
        targetElement.classList.add(hoverClass)
      })

      // Add mouseout event listener
      triggerElement.addEventListener('mouseout', () => {
        targetElement.classList.remove(hoverClass)
      })
    })
  }

  // Check if any LCD listener is active (nonClass removed)
  function updateNavButtonsBlur() {
    const navButtons = document.querySelectorAll('.tf-home-nav-button')
    const anyActive = Array.from(lcdListeners).some(id => {
      const element = document.getElementById(id)
      return element && !element.classList.contains(nonClass)
    })

    navButtons.forEach(button => {
      if (anyActive) {
        button.classList.add('blur')
      } else {
        button.classList.remove('blur')
      }
    })
  }

  // Initialize LCD toggle functionality
  function initLcdToggles() {
    lcdTriggers.forEach((triggerId, index) => {
      const trigger = document.getElementById(triggerId)
      const listener = document.getElementById(lcdListeners[index])
      const parentQuad = document.getElementById(parentQuads[index])

      if (!trigger || !listener || !parentQuad) {
        console.warn(`LCD elements for ${triggerId} not found. Skipping.`)
        return
      }

      // Toggle non class on click and update nav buttons
      trigger.addEventListener('click', () => {
        listener.classList.toggle(nonClass)
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
