import { handleRadioGroupVisuals } from './radio-group-handler.js'
import anime from 'animejs'

// We'll need access to the Accordion instance later for navigation
// Assuming Accordion class is exported from accordion.js
// import Accordion from './accordion.js'; // Adjust path if needed

// Assuming energy modes are loaded and accessible, e.g., via a global or imported object
// import modesDataFromFile from './energy/energyModes.json'; // If needed directly

class DashboardController {
  constructor() {
    // --- Element Caching ---
    this.radioLabels = document.querySelectorAll('.ayw-radiobutt')
    this.summaries = {
      craft: document.querySelector('[data-summary="craft"]'),
      energy: document.querySelector('[data-summary="energy"]'), // Add others as needed
      // Add more summaries here, keyed by their data-summary attribute value
    }
    // --- Use data-nav for the primary navigation buttons ---
    this.navPrevButton = document.querySelector('[data-nav="prev"]') // Should select .config-nav-arrows.back-arrow
    this.navNextButton = document.querySelector('[data-nav="next"]') // Should select .config-nav-arrows.fwd-arrow
    this.navApplyButton = document.querySelector('[data-nav="apply"]')
    // NEW: Cache config button wrappers
    this.configButtonWrappers = {
      1: document.getElementById('ayw-config-butts-1'),
      2: document.getElementById('ayw-config-butts-2'),
      3: document.getElementById('ayw-config-butts-3'),
    }

    // --- Instance Storage ---
    // This assumes the Accordion is initialized elsewhere and we can find it if needed,
    // or it's passed during initialization. For simplicity, we'll assume querySelector works
    // or that Accordion registers itself globally (less ideal).
    // A better approach might be dependency injection or a shared registry.
    this.accordionInstance = window.aywAccordion // Example: Assuming accordion.js sets this
    // NEW: Track the currently visible config button pane number
    this.activeConfigPaneNumber = null

    // --- Event Binding ---
    this.handleRadioClick = this.handleRadioClick.bind(this)
    this.handleNavClick = this.handleNavClick.bind(this)
    this.handleAccordionChange = this.handleAccordionChange.bind(this)
    this.updateNavigationArrows = this.updateNavigationArrows.bind(this)

    this.init()
  }

  init() {
    if (this.radioLabels.length > 0) {
      // Use event delegation on a common ancestor if preferred, but direct listeners are okay
      this.radioLabels.forEach((label) => {
        label.addEventListener('click', () => this.handleRadioClick(label))
      })
      console.log('Dashboard Controller: Initialized radio listeners.')

      // --- NEW: Set default selection for the first item in each group ---
      const radioInputs = document.querySelectorAll(
        '.ayw-radiobutt input[type="radio"]'
      )
      const groupNames = new Set()

      // Collect all unique group names
      radioInputs.forEach((input) => {
        const groupName = input.getAttribute('name')
        if (groupName) {
          groupNames.add(groupName)
        }
      })

      // For each unique group, find and 'click' the first radio button's label
      groupNames.forEach((groupName) => {
        const firstInputInGroup = document.querySelector(
          `.ayw-radiobutt input[name="${groupName}"]`
        )
        if (firstInputInGroup) {
          const firstLabelInGroup = firstInputInGroup.closest('.ayw-radiobutt')
          if (firstLabelInGroup) {
            // Trigger the click handler directly for the first label
            this.handleRadioClick(firstLabelInGroup)
            console.log(
              `Dashboard Controller: Selected default radio button for group "${groupName}".`
            )
          }
        }
      })
      // --- END NEW ---
    }

    // --- Simplified Navigation Listeners ---
    // Remove the complex logic with isSameNode checks
    if (this.navPrevButton) {
      this.navPrevButton.addEventListener('click', () =>
        this.handleNavClick('prev')
      )
      console.log(
        'Dashboard Controller: Added listener to prev button:',
        this.navPrevButton
      )
    } else {
      console.warn(
        'Dashboard Controller: Previous button [data-nav="prev"] not found.'
      )
    }

    if (this.navNextButton) {
      this.navNextButton.addEventListener('click', () =>
        this.handleNavClick('next')
      )
      console.log(
        'Dashboard Controller: Added listener to next button:',
        this.navNextButton
      )
    } else {
      console.warn(
        'Dashboard Controller: Next button [data-nav="next"] not found.'
      )
    }

    if (this.navApplyButton) {
      this.navApplyButton.addEventListener('click', () =>
        this.handleNavClick('apply')
      )
      console.log('Dashboard Controller: Added listener to apply button.')
    }
    console.log('Dashboard Controller: Initialized navigation listeners.')

    // Listen for the accordion change event
    document.addEventListener('accordionItemOpened', this.handleAccordionChange)
    console.log('Dashboard Controller: Initialized accordion change listener.')

    // Set initial config button visibility *without* animation
    if (
      this.accordionInstance &&
      this.accordionInstance.activeIndex !== undefined &&
      this.accordionInstance.activeIndex !== null // Ensure index is valid
    ) {
      const initialItem =
        this.accordionInstance.items[this.accordionInstance.activeIndex]
      if (initialItem) {
        const initialPane = initialItem.querySelector('.ayw-accordion-pane')
        // Use optional chaining and nullish coalescing for safety
        const initialPaneNumber = initialPane?.getAttribute('open-pane') ?? null
        if (initialPaneNumber) {
          this.setConfigButtonInitialState(initialPaneNumber.toString()) // Ensure string comparison later
          console.log(
            `Dashboard Controller: Set initial config button state for pane ${initialPaneNumber}`
          )
        } else {
          console.warn(
            "Dashboard Controller: Initial accordion pane doesn't have 'open-pane' attribute."
          )
          // Optionally set a default state if no attribute found, e.g., show pane 1
          // this.setConfigButtonInitialState('1');
        }
      }
    } else {
      console.log(
        'Dashboard Controller: No initial accordion item found or index invalid. Defaulting config buttons visibility if possible.'
      )
      // Optionally set a default state if accordion isn't ready, e.g., show pane 1
      // this.setConfigButtonInitialState('1');
    }

    // Set initial arrow state AFTER checking instance
    this.updateNavigationArrows()
    console.log('Dashboard Controller: Set initial navigation arrow state.')
  }

  // NEW: Sets the initial visible config button wrapper without animation
  setConfigButtonInitialState(activePaneNumber) {
    if (!activePaneNumber) return

    Object.entries(this.configButtonWrappers).forEach(([number, wrapper]) => {
      if (wrapper) {
        // Reset potential animation styles
        wrapper.style.opacity = '1'
        wrapper.style.transform = 'rotateX(0deg)'

        if (number === activePaneNumber) {
          wrapper.style.display = 'flex' // Or 'flex', 'grid' depending on your layout
          wrapper.classList.add('is-active')
        } else {
          wrapper.style.display = 'none'
          wrapper.classList.remove('is-active')
        }
      }
    })
    this.activeConfigPaneNumber = activePaneNumber // Store the initial active number
  }

  handleRadioClick(clickedLabel) {
    // 1. Update visual state
    handleRadioGroupVisuals(clickedLabel)

    // 2. Get data
    const radioInput = clickedLabel.querySelector('input[type="radio"]')
    if (!radioInput) return
    const groupName = radioInput.getAttribute('name')
    const selectedValue = radioInput.value
    const dataset = clickedLabel.dataset

    // 3. Update summary element
    const summaryElement = this.summaries[groupName]
    if (summaryElement) {
      summaryElement.textContent = selectedValue
      // Add/remove classes based on group/value if needed (example for 'craft')
      if (groupName === 'craft') {
        summaryElement.classList.remove('orange', 'blue')
        if (dataset.button === '1') {
          summaryElement.classList.add('orange')
        } else if (dataset.button === '2') {
          summaryElement.classList.add('blue')
        }
      }
      if (groupName === 'energy') {
        summaryElement.classList.remove('orange', 'blue')
        if (dataset.button === '3') {
          summaryElement.classList.add('orange')
        } else if (dataset.button === '4') {
          summaryElement.classList.add('blue')
        }
      }
    }

    // 4. Dispatch events or call functions
    const eventDetail = {
      group: groupName,
      value: selectedValue,
      element: clickedLabel,
      dataset: dataset,
    }

    if (groupName === 'craft') {
      document.dispatchEvent(
        new CustomEvent('craftSettingsChanged', { detail: eventDetail })
      )
      console.log('Dispatched craftSettingsChanged:', eventDetail)
    } else if (groupName === 'energy') {
      const modeId = dataset.setMode?.toUpperCase()
      if (modeId && window.savedModes && window.savedModes[modeId]) {
        const modeSettings = window.savedModes[modeId]

        // Call the main update function in energy.js
        // It will handle updating both Energy and Orbit internally.
        if (typeof window.updateEnergySimulation === 'function') {
          window.updateEnergySimulation(modeSettings)
          console.log(
            `Dashboard: Called central updateEnergySimulation for Mode ${modeId}`
          )
        } else {
          console.error(
            'Dashboard: window.updateEnergySimulation is not defined!'
          )
        }
      } else {
        console.warn(
          `Mode ${modeId} not found or window.savedModes not available for energy group.`
        )
      }
    }
    // Add 'else if' for other radio groups
  }

  handleNavClick(action) {
    console.log(`Nav action: ${action}`)
    const accordion = this.accordionInstance || window.aywAccordion

    if (!accordion) {
      console.error('Accordion instance not found for navigation.')
      return
    }

    // Prevent action if the corresponding NAV button exists and is NOT '.on'
    if (
      action === 'prev' &&
      this.navPrevButton &&
      !this.navPrevButton.classList.contains('on')
    ) {
      console.log("Navigation 'prev' ignored: Prev button is not active.")
      return
    }
    if (
      action === 'next' &&
      this.navNextButton &&
      !this.navNextButton.classList.contains('on')
    ) {
      console.log("Navigation 'next' ignored: Next button is not active.")
      return
    }

    switch (action) {
      case 'prev':
        if (typeof accordion.openPrev === 'function') {
          accordion.openPrev()
        } else {
          console.error('Accordion openPrev method not available.')
        }
        break
      case 'next':
        if (typeof accordion.openNext === 'function') {
          accordion.openNext()
        } else {
          console.error('Accordion openNext method not available.')
        }
        break
      case 'apply':
        console.log('Apply button clicked - implement action.')
        break
      default:
        console.warn(`Unhandled nav action: ${action}`)
    }
  }

  handleAccordionChange(event) {
    console.log(
      'Dashboard Controller: handleAccordionChange triggered.',
      event?.detail
    ) // Log event details
    // Config button visibility update
    if (event?.detail?.paneNumber) {
      // Check if event and detail exist
      const { paneNumber } = event.detail
      console.log(
        `Dashboard Controller: Processing accordionItemOpened for pane ${paneNumber}`
      )
      this.updateConfigButtonVisibility(paneNumber.toString())
    } else {
      console.warn(
        'Dashboard Controller: accordionItemOpened event missing paneNumber detail.',
        event
      )
    }

    // Update navigation arrows state
    this.updateNavigationArrows() // Call regardless of paneNumber detail
  }

  // REVISED: Helper function to update visibility WITH animation
  updateConfigButtonVisibility(newActivePaneNumber) {
    const previousPaneNumber = this.activeConfigPaneNumber

    // Do nothing if the pane hasn't actually changed
    if (newActivePaneNumber === previousPaneNumber || !newActivePaneNumber) {
      return
    }

    const outgoingWrapper = this.configButtonWrappers[previousPaneNumber]
    const incomingWrapper = this.configButtonWrappers[newActivePaneNumber]
    const duration = 162 // Animation duration in ms
    const easingOut = 'easeOutElastic'
    const easingIn = 'easeInQuad'

    // Animate out the previous wrapper
    if (outgoingWrapper) {
      outgoingWrapper.classList.remove('is-active') // Remove active class
      anime({
        targets: outgoingWrapper,
        rotateX: -90, // Flip backwards
        opacity: 0,
        duration: duration,
        easing: easingOut,
        complete: () => {
          outgoingWrapper.style.display = 'none' // Hide after animation
        },
      })
    } else {
      console.log(
        'Dashboard Controller: No outgoing wrapper found for pane',
        previousPaneNumber
      )
    }

    // Animate in the new wrapper
    if (incomingWrapper) {
      // Prepare the incoming wrapper (start flipped forward, transparent)
      incomingWrapper.style.display = 'flex'
      incomingWrapper.style.opacity = '0'
      // Setting transform directly bypasses potential CSS transitions
      incomingWrapper.style.transform = 'rotateX(90deg)'

      // Add class immediately or use anime's 'begin' callback if preferred
      incomingWrapper.classList.add('is-active')

      anime({
        targets: incomingWrapper,
        rotateX: 0, // Flip to front
        opacity: 1,
        duration: duration,
        easing: easingIn,
        // Optional: delay slightly to ensure outgoing is animating
        // delay: 50,
        complete: () => {
          // Ensure final state is clean (if needed)
          incomingWrapper.style.transform = 'rotateX(0deg)'
          incomingWrapper.style.opacity = '1'
        },
      })
    } else {
      console.warn(
        'Dashboard Controller: Incoming wrapper not found for pane',
        newActivePaneNumber
      )
    }

    // Update the tracking property AFTER initiating animations
    this.activeConfigPaneNumber = newActivePaneNumber
  }

  // --- NEW Method ---
  updateNavigationArrows() {
    const accordion = this.accordionInstance || window.aywAccordion
    console.log('updateNavigationArrows: Running...') // Log entry

    // Use navPrevButton and navNextButton directly
    if (!this.navPrevButton || !this.navNextButton) {
      console.warn(
        'updateNavigationArrows: Arrow buttons (navPrevButton/navNextButton) not found in DOM.'
      )
      return // Exit if buttons aren't cached
    }

    if (!accordion || typeof accordion.activeIndex !== 'number') {
      console.warn(
        'updateNavigationArrows: Accordion instance not ready or activeIndex invalid.'
      )
      // Ensure buttons are disabled if accordion isn't usable
      this.navPrevButton.classList.remove('on')
      this.navNextButton.classList.remove('on')
      return
    }

    const currentIndex = accordion.activeIndex
    const totalItems = accordion.items.length
    console.log(
      `updateNavigationArrows: currentIndex=${currentIndex}, totalItems=${totalItems}`
    ) // Log state

    // Update Next button
    if (currentIndex < totalItems - 1) {
      console.log('updateNavigationArrows: Enabling Next button')
      this.navNextButton.classList.add('on')
    } else {
      console.log('updateNavigationArrows: Disabling Next button')
      this.navNextButton.classList.remove('on')
    }

    // Update Prev button
    if (currentIndex > 0) {
      console.log('updateNavigationArrows: Enabling Prev button')
      this.navPrevButton.classList.add('on')
    } else {
      console.log('updateNavigationArrows: Disabling Prev button')
      this.navPrevButton.classList.remove('on')
    }
    console.log(
      `updateNavigationArrows: Final state -> Prev: ${this.navPrevButton.classList.contains(
        'on'
      )}, Next: ${this.navNextButton.classList.contains('on')}`
    )
  }
  // --- End NEW Method ---
}

// Function to initialize the controller
function initDashboardController() {
  // Make instance potentially accessible globally if needed by other modules temporarily
  // Avoid if possible, prefer dependency injection or event-based communication.
  window.aywDashboardController = new DashboardController()
}

export default initDashboardController
