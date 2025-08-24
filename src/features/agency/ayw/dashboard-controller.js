import {
  handleRadioGroupVisuals,
  handleCheckboxVisuals,
} from './radio-group-handler.js'
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
      shaper: document.querySelector('[data-summary="shaper"]'),
      projectName: document.querySelector('[data-summary="project-name"]'),
      iconCraft: document.querySelector('[data-summary="icon-craft"]'),
      iconEnergy: document.querySelector('[data-summary="icon-energy"]'),
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
    // --- NEW: Cache Commitment Form Scroll Elements ---
    this.commitmentForm = document.querySelector('.commitment-form') // Optional parent container
    this.commitmentFieldsWrapper = this.commitmentForm?.querySelector(
      '.commitment-fields-wrapper'
    )
    this.commitmentScrollbarTrack = this.commitmentForm?.querySelector(
      '.scroll-line-project.commitment'
    )
    this.commitmentScrollDot =
      this.commitmentScrollbarTrack?.querySelector('.scroll-dot')

    // NEW: Cache text display elements by ID
    this.textTargets = {
      phone: document.getElementById('dataPhone'),
      sms: document.getElementById('dataSms'),
      tasks: document.getElementById('dataTasks'),
      video: document.getElementById('dataVideoSum'),
    }

    // NEW: Cache Price Display Element
    this.priceDisplayElement = document.getElementById('aywLivePrice')
    if (!this.priceDisplayElement) {
      console.warn(
        'Dashboard Controller: Price display element (#aywLivePrice) not found. Price calculation will not be displayed.'
      )
    }

    // NEW: Cache Shaper Name Input
    this.shaperNameInput = document.getElementById('aywShaperName')
    // NEW: Cache Shaper confirmation label and default text
    this.summaryShaperLabel = document.getElementById('summary-shaper-label')
    this.defaultShaperLabelText = this.summaryShaperLabel
      ? this.summaryShaperLabel.textContent
      : ''

    // NEW: Cache Project Name Input
    this.projectNameInput = document.getElementById('aywProjectName')
    // NEW: Cache Project confirmation label and default text
    this.summaryProjectLabel = document.getElementById('summary-project-label')
    this.defaultProjectLabelText = this.summaryProjectLabel
      ? this.summaryProjectLabel.textContent
      : ''

    // NEW: Cache Dial Band and Form Signal elements
    this.dialBandElement =
      document.querySelector('.ayw-dialBand') ||
      document.querySelector('.ayw-dialband')
    this.formSignalElement = document.getElementById('ayw-form-signal')

    // NEW: Cache checkbox wrappers for commitment/other toggles
    this.checkboxWrappers = document.querySelectorAll(
      '.w-checkbox.ayw-checkbox.ielo'
    )

    // NEW: Cache forms and action buttons for APPLY readiness
    this.formsToValidate = Array.from(
      document.querySelectorAll('#AYW-Form, [data-form="ayw"]')
    )
    this.actionButtons = document.querySelectorAll('.ayw-actionbutt')
    this.applyNavButtons = document.querySelectorAll('.config-nav-action-btn')

    // NEW: Cache Form Guide elements
    this.formGuideWrap =
      document.getElementById('form-guide-txt-wrap') ||
      document.querySelector('.form-guide-txt-wrap')
    this.formGuideText = document.getElementById('ayw-form-guide-txt')

    // --- Instance Storage ---
    // This assumes the Accordion is initialized elsewhere and we can find it if needed,
    // or it's passed during initialization. For simplicity, we'll assume querySelector works
    // or that Accordion registers itself globally (less ideal).
    // A better approach might be dependency injection or a shared registry.
    this.accordionInstance = window.aywAccordion // Example: Assuming accordion.js sets this
    // NEW: Track the currently visible config button pane number
    this.activeConfigPaneNumber = null

    // NEW: Store current costs for calculation
    this.currentCraftCost = 0
    this.currentEnergyCost = 0

    // --- Event Binding ---
    this.handleRadioClick = this.handleRadioClick.bind(this)
    this.handleNavClick = this.handleNavClick.bind(this)
    this.handleAccordionChange = this.handleAccordionChange.bind(this)
    this.updateNavigationArrows = this.updateNavigationArrows.bind(this)
    // --- NEW: Bind Commitment Scroll Handler ---
    this.handleCommitmentScroll = this.handleCommitmentScroll.bind(this)
    this.handleShaperNameInput = this.handleShaperNameInput.bind(this)
    this.handleProjectNameInput = this.handleProjectNameInput.bind(this)
    this.evaluateFormCompletion = this.evaluateFormCompletion.bind(this)
    this.setupFormCompletionWatcher = this.setupFormCompletionWatcher.bind(this)

    this.init()
  }

  // --- NEW: Form Completion Watcher Setup ---
  setupFormCompletionWatcher() {
    if (!this.formsToValidate || this.formsToValidate.length === 0) {
      console.warn(
        'Dashboard Controller: No forms found for completion watching (#AYW-Form or [data-form="ayw"]).'
      )
      return
    }

    // Listen for changes within each form
    this.formsToValidate.forEach((formEl) => {
      formEl.addEventListener('input', this.evaluateFormCompletion, true)
      formEl.addEventListener('change', this.evaluateFormCompletion, true)
    })

    // Initial evaluation
    this.evaluateFormCompletion()
  }

  // --- NEW: Determine current pane number as string ('1'|'2'|'3') ---
  getCurrentPaneNumber() {
    const accordion = this.accordionInstance || window.aywAccordion
    if (!accordion || typeof accordion.activeIndex !== 'number') return null
    const currentItem = accordion.items?.[accordion.activeIndex]
    if (!currentItem) return null
    const paneEl = currentItem.querySelector('.ayw-accordion-pane')
    const paneNumber = paneEl?.getAttribute('open-pane')
    return paneNumber ? String(paneNumber) : null
  }

  // --- NEW: Evaluate if all required fields are complete ---
  evaluateFormCompletion() {
    if (!this.formsToValidate || this.formsToValidate.length === 0) return

    // Gather all required fields across target forms
    const requiredFields = this.formsToValidate.flatMap((formEl) =>
      Array.from(formEl.querySelectorAll('[required]'))
    )

    // Determine if the devotion checkbox exists and is checked
    const devotionCheckbox = document.querySelector(
      '.ayw-checkbox input[type="checkbox"]'
    )
    const devotionExists = Boolean(devotionCheckbox)
    const isDevotionChecked = devotionExists ? devotionCheckbox.checked : true

    const isRadioGroupComplete = (input) => {
      if (input.type !== 'radio') return true
      const form = input.form || input.closest('form')
      const groupSelector = `input[type="radio"][name="${CSS.escape(
        input.name
      )}"]`
      const groupInputs = form
        ? Array.from(form.querySelectorAll(groupSelector))
        : Array.from(document.querySelectorAll(groupSelector))
      return groupInputs.some((el) => el.checked)
    }

    const areAllRequiredValid = requiredFields.every((field) => {
      if (field.disabled) return true
      const tag = field.tagName.toLowerCase()
      const type = field.type?.toLowerCase?.() || ''

      if (type === 'radio') return isRadioGroupComplete(field)
      if (type === 'checkbox') return field.checked

      if (tag === 'select') return field.value !== '' && field.checkValidity()

      const value = typeof field.value === 'string' ? field.value.trim() : ''
      if (value === '') return false
      return field.checkValidity ? field.checkValidity() : true
    })

    if (areAllRequiredValid && isDevotionChecked) {
      // Override signal to APPLY
      if (this.formSignalElement) {
        this.formSignalElement.textContent = 'APPLY'
      }
      // Enable action buttons
      if (this.actionButtons && this.actionButtons.length > 0) {
        this.actionButtons.forEach((btn) => btn.classList.add('is-ready'))
      }
      if (this.applyNavButtons && this.applyNavButtons.length > 0) {
        this.applyNavButtons.forEach(
          (btn) => (btn.style.pointerEvents = 'auto')
        )
      }
      // Show guide with success message if guide exists
      if (this.formGuideWrap && this.formGuideText) {
        this.formGuideWrap.classList.remove('non')
        this.formGuideText.textContent = 'great! click apply to continue'
      }
      return
    }

    // Not complete: revert visuals
    if (this.actionButtons && this.actionButtons.length > 0) {
      this.actionButtons.forEach((btn) => btn.classList.remove('is-ready'))
    }
    if (this.applyNavButtons && this.applyNavButtons.length > 0) {
      this.applyNavButtons.forEach((btn) => (btn.style.pointerEvents = 'none'))
    }

    // Guide visibility and prompt based on devotion checkbox state
    if (this.formGuideWrap && this.formGuideText) {
      if (devotionExists && isDevotionChecked && !areAllRequiredValid) {
        this.formGuideWrap.classList.remove('non')
        this.formGuideText.textContent =
          'Please complete the Devotion form to continue'
      } else if (devotionExists && !isDevotionChecked) {
        this.formGuideWrap.classList.add('non')
      } else if (!devotionExists) {
        // If no devotion checkbox exists, keep guide hidden by default
        this.formGuideWrap.classList.add('non')
      }
    }

    // Restore the current pane number on the signal element
    if (this.formSignalElement) {
      const pane = this.getCurrentPaneNumber()
      if (pane) {
        this.formSignalElement.textContent = pane
      }
    }
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
      // Use a slight delay or ensure accordion is ready if necessary,
      // but handleRadioClick should be idempotent enough for initial calls
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
          // NEW: Also update dial band and signal text for the initial pane
          this.updateDialBandAndSignal(initialPaneNumber.toString())
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

    // --- NEW: Initialize Commitment Scrollbar ---
    this.setupCommitmentScrollbar()

    // --- NEW: Initialize Checkbox Visuals & Listeners ---
    if (this.checkboxWrappers && this.checkboxWrappers.length > 0) {
      this.checkboxWrappers.forEach((wrapper) => {
        // Initial visual sync with current checked state (no toggling)
        this.syncCheckboxWrapperVisual(wrapper)

        // Prevent native input toggle and route through our visual handler
        wrapper.addEventListener('click', (e) => {
          // If the actual input was clicked, prevent its default toggle
          if (e.target && e.target.matches('input[type="checkbox"]')) {
            e.preventDefault()
            e.stopPropagation()
          } else {
            e.preventDefault()
          }
          handleCheckboxVisuals(wrapper)
          // Re-evaluate form completion state after checkbox visual toggle
          this.evaluateFormCompletion()
        })

        // Keyboard accessibility: space/enter on input should toggle via handler
        const input = wrapper.querySelector('input[type="checkbox"]')
        if (input) {
          input.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault()
              handleCheckboxVisuals(wrapper)
            }
          })
        }
      })
      console.log('Dashboard Controller: Initialized checkbox visuals.')
    } else {
      console.log(
        'Dashboard Controller: No checkbox wrappers found to initialize.'
      )
    }

    // --- NEW: Initialize Form Completion Watcher ---
    this.setupFormCompletionWatcher()

    if (!this.shaperNameInput) {
      console.warn(
        'Dashboard Controller: Shaper name input field (#aywShaperName) not found. Cannot set up listener.'
      )
      return // Exit if critical elements are missing
    }

    if (!this.summaries.shaper) {
      console.warn(
        'Dashboard Controller: Shaper summary element ([data-summary="shaper"]) not found. Shaper name input will not update the summary.'
      )
      // We can still add the listener, but it won't do anything if the target is missing
      // Depending on requirements, you might return here instead
    }

    this.shaperNameInput.addEventListener('input', this.handleShaperNameInput)
    console.log('Dashboard Controller: Added input listener to #aywShaperName.')
    // Initial confirmation label evaluation for shaper name
    if (this.shaperNameInput.value && this.summaryShaperLabel) {
      this.summaryShaperLabel.textContent = 'Shaper'
    }

    // Optional: Trigger an initial update if the input field already has a value on load
    // No, wait, this should only update the summary, not price logic. Price update is in handleRadioClick.
    // if (this.shaperNameInput.value && this.summaries.shaper) {
    //   this.handleShaperNameInput({ target: this.shaperNameInput });
    // }

    this.setupProjectNameListener()

    // The initial price calculation happens implicitly when the default radio buttons are 'clicked' in the groupNames.forEach loop.
    // However, if no radio buttons are found or clicked, the price might remain 0.
    // A fallback could be added here to explicitly calculate and display the initial price if needed,
    // but the current approach of simulating clicks should cover it.
    console.log(
      'Dashboard Controller: Initial setup complete, default radio clicks handle initial price display.'
    )
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
    const selectedCost = parseFloat(dataset.cost || '0') // Get and parse the cost, default to 0 if missing or invalid

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

    // 4. Update specific text elements based on data attributes
    if (this.textTargets.phone && dataset.phone !== undefined) {
      this.textTargets.phone.textContent = dataset.phone
      console.log(`Dashboard: Updated #dataPhone with value "${dataset.phone}"`)
    }
    if (this.textTargets.sms && dataset.sms !== undefined) {
      this.textTargets.sms.textContent = dataset.sms
      console.log(`Dashboard: Updated #dataSms with value "${dataset.sms}"`)
    }
    if (this.textTargets.tasks && dataset.tasks !== undefined) {
      this.textTargets.tasks.textContent = dataset.tasks
      console.log(`Dashboard: Updated #dataTasks with value "${dataset.tasks}"`)
    }
    if (this.textTargets.video && dataset.video !== undefined) {
      this.textTargets.video.textContent = dataset.video
      console.log(`Dashboard: Updated #dataVideo with value "${dataset.video}"`)
    }

    // Update classes on text target elements if the group is 'energy'
    if (groupName === 'energy') {
      const targetElements = [
        this.textTargets.phone,
        this.textTargets.sms,
        this.textTargets.tasks,
        this.textTargets.video,
      ].filter((element) => element !== null) // Filter out any elements not found

      const buttonValue = dataset.button // Get the data-button value

      if (buttonValue === '3') {
        // Corresponds to the "orange" mode based on icon logic
        targetElements.forEach((element) => {
          element.classList.add('orange')
          element.classList.remove('blue')
        })
        console.log(
          "Dashboard: Added '.orange' and removed '.blue' classes from text targets for energy mode 3."
        )
      } else if (buttonValue === '4') {
        // Corresponds to the "blue" mode based on icon logic
        targetElements.forEach((element) => {
          element.classList.add('blue')
          element.classList.remove('orange')
        })
        console.log(
          "Dashboard: Added '.blue' and removed '.orange' classes from text targets for energy mode 4."
        )
      } else {
        console.warn(
          `Dashboard: Unhandled button value "${buttonValue}" for energy group text target class update.`
        )
      }
    }

    // NEW: Update stored cost based on group
    if (groupName === 'craft') {
      this.currentCraftCost = selectedCost
      console.log(
        `Dashboard: Updated currentCraftCost to ${this.currentCraftCost}`
      )
    } else if (groupName === 'energy') {
      this.currentEnergyCost = selectedCost
      console.log(
        `Dashboard: Updated currentEnergyCost to ${this.currentEnergyCost}`
      )
    } else {
      console.warn(
        `Dashboard: Unhandled radio group "${groupName}" for cost storage.`
      )
      // Don't return here, we still want to update the display based on the OTHER costs if applicable
      // e.g. if a non-cost affecting button is clicked, the price display shouldn't disappear.
    }

    // NEW: Calculate the total price (sum of current craft and energy costs)
    const priceToDisplay = this.currentCraftCost + this.currentEnergyCost
    console.log(
      `Dashboard: Calculating total price: Craft=${this.currentCraftCost}, Energy=${this.currentEnergyCost}, Total=${priceToDisplay}`
    )

    // Update the price display element if found
    if (this.priceDisplayElement) {
      // Format the number using toLocaleString for thousand separators and no decimals
      const formattedPrice = priceToDisplay.toLocaleString(undefined, {
        // Use undefined for default locale or specify 'en-US'
        minimumFractionDigits: 0, // Ensure no decimal places
        maximumFractionDigits: 0, // Ensure no decimal places
      })

      // Prepend the dollar sign
      this.priceDisplayElement.textContent = `$${formattedPrice}`
      console.log(`Dashboard: Updated #aywLivePrice to $${formattedPrice}`)
    } else {
      console.warn(
        'Dashboard: Cannot update price display, #aywLivePrice element not found.'
      )
    }

    // 5. Dispatch events or call functions
    const eventDetail = {
      group: groupName,
      value: selectedValue,
      element: clickedLabel,
      dataset: dataset,
      cost: selectedCost, // Include the cost in the event detail
    }

    if (groupName === 'craft') {
      document.dispatchEvent(
        new CustomEvent('craftSettingsChanged', { detail: eventDetail })
      )
      console.log('Dispatched craftSettingsChanged:', eventDetail)
    } else if (groupName === 'energy') {
      const modeId = dataset.setMode?.toUpperCase()
      if (modeId) {
        // Check if modeId is present
        if (typeof window.setEnergyMode === 'function') {
          window.setEnergyMode(modeId) // Call the corrected mode setting function
          console.log(
            `Dashboard: Called window.setEnergyMode for Mode ${modeId}`
          )
        } else {
          console.error(
            'Dashboard: window.setEnergyMode is not defined! Cannot set energy mode.'
          )
        }
      } else {
        console.warn(
          `Dashboard: No data-set-mode attribute found on clicked energy radio label.`
        )
      }
      document.dispatchEvent(
        new CustomEvent('energySettingsChanged', { detail: eventDetail })
      )
      console.log('Dispatched energySettingsChanged:', eventDetail)
    }
    // Add 'else if' for other radio groups

    // Update icon classes based on group and dataset.button
    if (groupName === 'craft' && this.summaries.iconCraft) {
      this.summaries.iconCraft.classList.remove('craft1', 'craft2')
      if (dataset.button === '1') {
        this.summaries.iconCraft.classList.add('craft1')
      } else if (dataset.button === '2') {
        this.summaries.iconCraft.classList.add('craft2')
      }
    } else if (groupName === 'energy' && this.summaries.iconEnergy) {
      this.summaries.iconEnergy.classList.remove('energy1', 'energy2')
      if (dataset.button === '3') {
        this.summaries.iconEnergy.classList.add('energy1')
      } else if (dataset.button === '4') {
        this.summaries.iconEnergy.classList.add('energy2')
      }
    }
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
      // NEW: Update dial band classes and form signal text
      this.updateDialBandAndSignal(paneNumber.toString())
      // NEW: Re-evaluate form completion to potentially override signal with APPLY
      this.evaluateFormCompletion()
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

  // --- NEW: Update dial band classes and form signal text based on active pane ---
  updateDialBandAndSignal(activePaneNumber) {
    const pane = String(activePaneNumber)

    // Update dial band combo class
    if (this.dialBandElement) {
      this.dialBandElement.classList.remove('d-1', 'd-2', 'd-3')
      if (pane === '1') {
        this.dialBandElement.classList.add('d-1')
      } else if (pane === '2') {
        this.dialBandElement.classList.add('d-2')
      } else if (pane === '3') {
        this.dialBandElement.classList.add('d-3')
      }
    } else {
      console.warn('Dashboard Controller: .ayw-dialBand element not found.')
    }

    // Update form signal text
    if (this.formSignalElement) {
      if (pane === '1' || pane === '2' || pane === '3') {
        this.formSignalElement.textContent = pane
      }
      // Future: when required form fields are completed, set to "APPLY!"
    } else {
      console.warn('Dashboard Controller: #ayw-form-signal element not found.')
    }
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

  // --- NEW: Method to Setup Commitment Scrollbar ---
  setupCommitmentScrollbar() {
    if (
      !this.commitmentFieldsWrapper ||
      !this.commitmentScrollbarTrack ||
      !this.commitmentScrollDot
    ) {
      console.warn(
        'Dashboard Controller: Commitment form scrollbar elements (.commitment-fields-wrapper, .scroll-line-project.commitment, or .scroll-dot) not found. Skipping setup.'
      )
      return
    }

    // Add the scroll listener
    this.commitmentFieldsWrapper.addEventListener(
      'scroll',
      this.handleCommitmentScroll
    )
    console.log(
      'Dashboard Controller: Added scroll listener to .commitment-fields-wrapper.'
    )

    // Initial update in case content is already scrolled or sized
    this.handleCommitmentScroll()
  }

  // --- NEW: Scroll Handler for Commitment Form ---
  handleCommitmentScroll() {
    // Re-check elements just in case, though unlikely to change after init
    if (
      !this.commitmentFieldsWrapper ||
      !this.commitmentScrollbarTrack ||
      !this.commitmentScrollDot
    ) {
      return // Should not happen if setup succeeded, but good practice
    }

    const contentWrapper = this.commitmentFieldsWrapper
    const scrollbarTrack = this.commitmentScrollbarTrack
    const scrollDot = this.commitmentScrollDot

    // Calculate the total scrollable height (total content height - visible height)
    const contentScrollableHeight =
      contentWrapper.scrollHeight - contentWrapper.clientHeight
    // Get the height of the custom scrollbar track
    const scrollbarTrackHeight = scrollbarTrack.clientHeight
    // Get the current scroll position from the top
    const scrollPosition = contentWrapper.scrollTop

    // Calculate the ratio of how far the content has been scrolled (0 to 1)
    // Avoid division by zero if content isn't scrollable
    const scrollRatio =
      contentScrollableHeight > 0 ? scrollPosition / contentScrollableHeight : 0

    // Calculate the dot's desired top position based on the scroll ratio and track height
    const dotPosition = scrollRatio * scrollbarTrackHeight

    // Apply the offset from the original portfolio code (-6.5).
    // This offset likely accounts for roughly half the height of the dot element
    // to visually center it on the track. You might need to adjust this value
    // based on the actual height and border-box sizing of your .scroll-dot element.
    const finalDotPosition = dotPosition - 6.5

    // Apply the calculated top position to the scroll dot element
    scrollDot.style.top = `${finalDotPosition}px`
  }
  // --- End NEW Methods ---

  // --- NEW: Sync checkbox wrapper visuals without changing checked state ---
  syncCheckboxWrapperVisual(wrapper) {
    if (!wrapper) return
    const checkboxInput = wrapper.querySelector('input[type="checkbox"]')
    if (!checkboxInput) return
    const webflowInput = wrapper.querySelector('.w-checkbox-input')

    if (checkboxInput.checked) {
      wrapper.classList.add('is-pressed')
      if (webflowInput) webflowInput.classList.add('w--redirected-checked')
    } else {
      wrapper.classList.remove('is-pressed')
      if (webflowInput) webflowInput.classList.remove('w--redirected-checked')
    }
  }

  // --- NEW Method to Setup Project Name Listener ---
  setupProjectNameListener() {
    if (!this.projectNameInput) {
      console.warn(
        'Dashboard Controller: Project name input field (#aywProjectName) not found. Cannot set up listener.'
      )
      return
    }

    if (!this.summaries.projectName) {
      console.warn(
        'Dashboard Controller: Project name summary element ([data-summary="project-name"]) not found. Project name input will not update the summary.'
      )
      // We can still add the listener, but it won't do anything if the target is missing
      // Depending on requirements, you might return here instead
    }

    this.projectNameInput.addEventListener('input', this.handleProjectNameInput)
    console.log(
      'Dashboard Controller: Added input listener to #aywProjectName.'
    )

    // Optional: Trigger an initial update if the input field already has a value on load
    if (this.projectNameInput.value && this.summaries.projectName) {
      this.handleProjectNameInput({ target: this.projectNameInput })
    }
    // Initial confirmation label evaluation for project name
    if (this.projectNameInput.value && this.summaryProjectLabel) {
      this.summaryProjectLabel.textContent = 'Project/Brand'
    }
  }

  // NEW: Handler for the shaper name input field
  handleShaperNameInput(event) {
    // Use optional chaining for safety if shaperSummary might be null
    if (this.summaries.shaper) {
      this.summaries.shaper.textContent = event.target.value
    }
    // Re-evaluate completion when shaper name changes
    this.evaluateFormCompletion()

    // Update confirmation label based on content
    if (this.summaryShaperLabel) {
      const value = (event.target.value || '').trim()
      this.summaryShaperLabel.textContent = value
        ? 'Shaper'
        : this.defaultShaperLabelText
    }
  }

  // NEW: Handler for the project name input field
  handleProjectNameInput(event) {
    // Use optional chaining for safety if projectNameSummary might be null
    if (this.summaries.projectName) {
      this.summaries.projectName.textContent = event.target.value
    }
    // Re-evaluate completion when project name changes
    this.evaluateFormCompletion()

    // Update confirmation label based on content
    if (this.summaryProjectLabel) {
      const value = (event.target.value || '').trim()
      this.summaryProjectLabel.textContent = value
        ? 'Project/Brand'
        : this.defaultProjectLabelText
    }
  }
}

// Function to initialize the controller
function initDashboardController() {
  // Make instance potentially accessible globally if needed by other modules temporarily
  // Avoid if possible, prefer dependency injection or event-based communication.
  window.aywDashboardController = new DashboardController()
}

export default initDashboardController
