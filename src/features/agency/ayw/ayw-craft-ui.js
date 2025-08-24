import anime from 'animejs'

function initAYWCraftUI() {
  class CraftUIManager {
    constructor() {
      // Cache DOM elements
      this.modal = document.querySelector('.ayw-craft-modal')
      this.craftDetails = document.querySelector('.ayw-craft-details')
      this.gridIcons = document.querySelectorAll('.ayw-grid-icon-base')
      this.standardIcons = document.querySelectorAll('.ayw-icon-base')
      this.craftItems = document.querySelectorAll('.craft-readme-dynamic')
      this.closeButtons = document.querySelectorAll('.close-btn-wrapper')
      this.accordionTabs = document.querySelectorAll('.ayw-accordion-tab')
      // Cache the dynamic read-me elements controlled by the accordion
      this.dynamicReadMeElements = document.querySelectorAll(
        '.ayw-dynamic-read-me.tab1'
      )
      // Cache craft bar and radio trigger elements
      this.dreamcastBar = document.getElementById('ayw-craft-bar-dreamcast')
      this.initiationButton = document.getElementById('initiation-button')
      this.dreamcasterButton = document.getElementById('dreamcaster-button')
      this.dreamcastingButton = document.getElementById('dreamcasting-button')

      // Track last clicked icon
      this.lastClickedIcon = null

      // Level name to number mapping - we can update names here if they change in CMS
      this.levelMapping = {
        'Level 1: Foundational': 1,
        'Level 2: Launchpad': 2,
        'Level 3: Broadcasting': 3,
        'Level 4: Dreamcasting': 4,
      }

      // Bind methods
      this.handleIconClick = this.handleIconClick.bind(this)
      this.closeModal = this.closeModal.bind(this)
      this.initializeIconStates = this.initializeIconStates.bind(this)
      this.setLevelIndicators = this.setLevelIndicators.bind(this)
      this.handleCraftSettingsUpdate = this.handleCraftSettingsUpdate.bind(this)
      this.updateDreamcastBarVisibility =
        this.updateDreamcastBarVisibility.bind(this)

      // Initialize without any classes
      this.clearIconStates()

      this.init()
    }

    init() {
      // Initialize icon states before setting up event listeners
      this.initializeIconStates()

      // Ensure all craft items are in their default hidden state (as per CSS)
      // by removing 'is-shown' class if it was somehow present.
      this.craftItems.forEach((item) => {
        item.classList.remove('is-shown')
      })

      // Add click and hover listeners to all grid icons
      this.gridIcons.forEach((icon) => {
        icon.addEventListener('click', () => this.handleIconClick(icon))

        // Add hover listeners
        icon.addEventListener('mouseenter', () => {
          const levelName = icon.getAttribute('data-level')
          if (!icon.classList.contains('any-clicked')) {
            this.setLevelIndicators(icon, levelName, true)
          }
        })

        icon.addEventListener('mouseleave', () => {
          const levelName = icon.getAttribute('data-level')
          if (!icon.classList.contains('any-clicked')) {
            this.setLevelIndicators(icon, levelName, false)
          }
        })
      })

      // Add close modal functionality to all close buttons
      this.closeButtons.forEach((button) => {
        button.addEventListener('click', this.closeModal)
      })

      // Add close modal functionality when clicking accordion tabs
      this.accordionTabs.forEach((tab) => {
        tab.addEventListener('click', this.closeModal)
      })

      // Wire up direct listeners to the craft radio buttons (by ID)
      if (this.initiationButton) {
        this.initiationButton.addEventListener('click', () => {
          const buttonType =
            this.initiationButton.getAttribute('data-button') || '1'
          this.updateDreamcastBarVisibility(buttonType)
        })
      }
      if (this.dreamcasterButton) {
        this.dreamcasterButton.addEventListener('click', () => {
          const buttonType =
            this.dreamcasterButton.getAttribute('data-button') || '2'
          this.updateDreamcastBarVisibility(buttonType)
        })
      }
      if (this.dreamcastingButton) {
        this.dreamcastingButton.addEventListener('click', () => {
          const buttonType =
            this.dreamcastingButton.getAttribute('data-button') || '2'
          this.updateDreamcastBarVisibility(buttonType)
        })
      }

      // Close modal when clicking directly on the modal backdrop
      this.modal?.addEventListener('click', (e) => {
        if (e.target === this.modal) {
          this.closeModal()
        }
      })

      // Add new listener for clicks anywhere else on the document
      document.addEventListener(
        'click',
        this.handleDocumentClickForModalClose.bind(this),
        true // Use capture phase
      )

      // Listen for custom event from DashboardController
      document.addEventListener(
        'craftSettingsChanged',
        this.handleCraftSettingsUpdate
      )

      // Make instance accessible (simple global method)
      window.aywCraftUIManager = this
    }

    initializeIconStates() {
      // Handle grid icons
      this.gridIcons.forEach((icon) => {
        // Initialize level indicators
        const levelName = icon.getAttribute('data-level')
        this.setLevelIndicators(icon, levelName, false)

        // Add .dream class to dreamcaster icons on load
        const packageType = icon.getAttribute('data-color')?.toLowerCase()
        if (packageType === 'dreamcaster') {
          icon.classList.add('dream')
        }
      })

      // Handle standard icons
      this.standardIcons.forEach((icon) => {
        const levelName = icon.getAttribute('data-level')
        this.setLevelIndicators(icon, levelName, false)

        // Add appropriate classes based on package type
        const packageType = icon.getAttribute('data-color')?.toLowerCase()
        if (packageType === 'dreamcaster') {
          icon.classList.add('dream')
        } else if (packageType === 'initiation & dreamcaster') {
          icon.classList.add('init')
        }
      })

      // Trigger initial icon states based on default radio selection (if any)
      // Find the initially checked 'craft' radio button
      const initialCraftRadio = document.querySelector(
        '.ayw-radiobutt input[name="craft"]:checked'
      )
      const initialButtonType = initialCraftRadio
        ? initialCraftRadio.closest('.ayw-radiobutt')?.dataset.button
        : '1' // Default to '1' if none checked
      this.updateIconStates(initialButtonType)
      // Ensure craft bar visibility matches initial selection
      this.updateDreamcastBarVisibility(initialButtonType)
      // Update levels after setting initial states
      this.gridIcons.forEach((icon) => {
        const levelName = icon.getAttribute('data-level')
        this.setLevelIndicators(icon, levelName, false)
      })
    }

    setLevelIndicators(icon, levelName, isActive) {
      const level = this.levelMapping[levelName]
      if (!level) return // Skip if level name isn't valid

      const indicators = icon.querySelectorAll('.ayw-level-indicator')
      const isGridIcon = icon.classList.contains('ayw-grid-icon-base')

      // Get the currently selected button type for 'craft' group
      const buttonType = this._getSelectedCraftButtonType()
      const isIconClicked = icon.classList.contains('any-clicked')

      indicators.forEach((indicator, index) => {
        // First, handle visibility (.is-on)
        indicator.classList.remove('is-on')

        if (isGridIcon) {
          // Add .is-on when:
          // 1. Button 1 is pressed and it's a level 1-2 icon
          // 2. Button 2 is pressed (all levels)
          // 3. Icon is clicked (any-clicked)
          // 4. Icon is being hovered (isActive)
          if (
            (buttonType === '1' && level <= 2) ||
            buttonType === '2' ||
            isIconClicked ||
            isActive
          ) {
            if (index < level) {
              indicator.classList.add('is-on')
            }
          }
        } else {
          // Standard icon hover behavior unchanged
          if (isActive && index < level) {
            indicator.classList.add('is-on')
          }
        }

        // Then handle inactive state (.is-off)
        indicator.classList.remove('is-off')
        if (index >= level) {
          indicator.classList.add('is-off')
        }
      })
    }

    handleIconClick(clickedIcon) {
      const craftId = clickedIcon.getAttribute('data-craft')
      if (!craftId) return

      const levelName = clickedIcon.getAttribute('data-level')
      const isActiveHover = false // Not hovering when clicking

      // If clicking the same icon that's currently open, close the modal
      if (
        clickedIcon === this.lastClickedIcon &&
        this.modal?.classList.contains('is-active')
      ) {
        this.closeModal() // This now handles removing any-clicked and resetting levels
        return
      }

      // --- Reset state BEFORE applying new state ---
      this.removeAnyClickedFromAllIcons() // Handles grid and standard icons

      // Activate clicked icon and find its matching pair
      if (clickedIcon.classList.contains('ayw-grid-icon-base')) {
        clickedIcon.classList.add('any-clicked')
      }
      this.setLevelIndicators(clickedIcon, levelName, true) // Activate clicked icon's levels

      // Find and activate the matching icon
      const isGridIcon = clickedIcon.classList.contains('ayw-grid-icon-base')
      const matchingIcon = isGridIcon
        ? Array.from(this.standardIcons).find(
            (icon) => icon.getAttribute('data-craft') === craftId
          )
        : Array.from(this.gridIcons).find(
            (icon) => icon.getAttribute('data-craft') === craftId
          )

      if (matchingIcon) {
        const matchingLevelName = matchingIcon.getAttribute('data-level')
        if (matchingIcon.classList.contains('ayw-grid-icon-base')) {
          matchingIcon.classList.add('any-clicked')
        } else {
          matchingIcon.classList.add('stroke')
        }
        // Also update levels for the matching icon
        this.setLevelIndicators(matchingIcon, matchingLevelName, true)
      }

      // Update last clicked icon
      this.lastClickedIcon = clickedIcon

      // Hide all craft items first by removing the .is-shown class
      this.craftItems.forEach((item) => {
        item.classList.remove('is-shown')
      })

      // Find and show the matching craft item by adding the .is-shown class
      const matchingCraftItem = Array.from(this.craftItems).find(
        (item) => item.getAttribute('data-craft') === craftId
      )

      if (matchingCraftItem) {
        matchingCraftItem.classList.add('is-shown')
        this.modal?.classList.add('is-active')
        // When modal opens, add .off to all dynamic read-me elements
        this.dynamicReadMeElements.forEach((el) => el.classList.add('off'))

        // Scroll the craft details container to the title inside the shown item
        this.scrollCraftDetailsToItemTitle(matchingCraftItem)
      }
    }

    removeAnyClickedFromAllIcons() {
      // Remove .any-clicked only from grid icons
      this.gridIcons.forEach((icon) => {
        icon.classList.remove('any-clicked')
        const levelName = icon.getAttribute('data-level')
        // Reset levels based on current radio button state, not just 'false'
        this.setLevelIndicators(icon, levelName, false)
      })
      // Reset level indicators and remove stroke class from standard icons
      this.standardIcons.forEach((icon) => {
        icon.classList.remove('stroke')
        const levelName = icon.getAttribute('data-level')
        this.setLevelIndicators(icon, levelName, false) // Standard icons only care about hover
      })
    }

    closeModal() {
      this.modal?.classList.remove('is-active')
      // Reset last clicked icon tracking
      this.lastClickedIcon = null
      // Remove .any-clicked from all icons and reset their level indicators
      this.removeAnyClickedFromAllIcons()

      // Also ensure the currently visible craft item is hidden
      this.craftItems.forEach((item) => {
        item.classList.remove('is-shown')
      })

      // When modal closes, instruct the accordion to refresh its dynamic content display.
      // This ensures the correct .ayw-dynamic-read-me element is shown based on the
      // accordion's current active tab.
      if (
        window.aywAccordion &&
        typeof window.aywAccordion.updateDynamicElements === 'function'
      ) {
        let paneNumberToUpdate // Will hold the 'open-pane' attribute value

        if (
          typeof window.aywAccordion.activeIndex === 'number' &&
          window.aywAccordion.items &&
          window.aywAccordion.items.length > window.aywAccordion.activeIndex &&
          window.aywAccordion.activeIndex >= 0 // Check for valid index
        ) {
          const activeAccordionItem =
            window.aywAccordion.items[window.aywAccordion.activeIndex]
          const paneElement = activeAccordionItem?.querySelector(
            '.ayw-accordion-pane'
          )
          paneNumberToUpdate = paneElement?.getAttribute('open-pane')

          if (!paneNumberToUpdate) {
            console.warn(
              'CraftUIManager: Active accordion item lacks an "open-pane" attribute. Accordion will use default display logic.'
            )
          }
        } else {
          console.warn(
            'CraftUIManager: Could not determine active accordion pane (invalid activeIndex or items). Accordion will use default display logic.'
          )
          // paneNumberToUpdate remains undefined
        }

        // Call the accordion's method to update its display.
        // The updateDynamicElements method in accordion.js is designed to handle
        // an undefined paneNumber by defaulting (e.g., to tab 1).
        window.aywAccordion.updateDynamicElements(paneNumberToUpdate)
      } else {
        console.warn(
          'CraftUIManager: window.aywAccordion.updateDynamicElements not found. Cannot automatically refresh accordion state.'
        )
        // Fallback: If the accordion isn't available, and you strictly wanted to
        // ensure .off is removed ONLY from .tab1 (as per your refined thought):
        // this.dynamicReadMeElements.forEach(el => el.classList.remove('off'));
        // However, this was likely leading to the "all three show up" issue.
        // The preference is to let the accordion manage its state.
      }
    }

    clearIconStates() {
      // Remove init and selected classes, but preserve base dream class
      this.gridIcons.forEach((icon) => {
        icon.classList.remove('init', 'selected')
      })
    }

    updateIconStates(buttonType) {
      // Clear existing states first
      this.clearIconStates()

      this.gridIcons.forEach((icon) => {
        const packageType = icon.getAttribute('data-color')?.toLowerCase()

        // Add .init based on package type AND button selection
        if (packageType === 'initiation & dreamcaster') {
          icon.classList.add('init') // Always has 'init' if it's this type? Check design.
        }

        // Add .selected only if dreamcaster type AND button 2 is selected
        if (buttonType === '2' && packageType === 'dreamcaster') {
          icon.classList.add('selected')
        }

        // Re-evaluate levels after changing classes
        // const levelName = icon.getAttribute('data-level');
        // this.setLevelIndicators(icon, levelName, false); // Done in handleCraftSettingsUpdate
      })
    }

    // --- New method to handle updates from the controller ---
    handleCraftSettingsUpdate(event) {
      console.log('Craft UI received craftSettingsChanged:', event.detail)
      const { dataset } = event.detail
      const buttonType = dataset?.button // Extract button type (e.g., '1' or '2')

      if (!buttonType) return

      // 1. Update icon visual states (init, selected classes)
      this.updateIconStates(buttonType)

      // 2. Update level indicators for all grid icons based on the new state
      this.gridIcons.forEach((icon) => {
        const levelName = icon.getAttribute('data-level')
        // Pass false for isActive (hover), levels depend on buttonType now
        this.setLevelIndicators(icon, levelName, false)
      })

      // 2b. Update dreamcast craft bar visibility
      this.updateDreamcastBarVisibility(buttonType)

      // 3. Reset scroll positions for the modal content and the read-me wrapper
      this.resetCraftModalScroll()
    }

    // Toggle visibility of the Dreamcast craft bar by adding/removing .off
    updateDreamcastBarVisibility(buttonType) {
      if (!this.dreamcastBar) return
      if (buttonType === '2') {
        // Dreamcaster selected → show bar
        this.dreamcastBar.classList.remove('off')
        return
      }
      // Initiation (or anything else) selected → hide bar
      this.dreamcastBar.classList.add('off')
    }

    // Method to get the currently selected 'craft' button type
    // This avoids relying on querying DOM every time, assuming controller keeps state or dispatches it
    // For now, let's query when needed, or pass it from controller event
    _getSelectedCraftButtonType() {
      const selectedButton = document
        .querySelector('.ayw-radiobutt.is-pressed input[name="craft"]')
        ?.closest('.ayw-radiobutt')
      return selectedButton?.getAttribute('data-button') || '1' // Default if none selected
    }

    // New method to handle clicks outside the modal
    handleDocumentClickForModalClose(event) {
      if (!this.modal || !this.modal.classList.contains('is-active')) {
        // Modal doesn't exist or isn't active, so nothing to do.
        return
      }

      // If the click is on or inside the modal, let other event handlers manage it.
      // The existing listener on `this.modal` handles backdrop clicks.
      if (this.modal.contains(event.target)) {
        return
      }

      // If the click is on a grid icon, let its dedicated handler manage it.
      // This prevents closing the modal if a grid icon (which controls the modal) is clicked.
      for (const icon of this.gridIcons) {
        if (icon === event.target || icon.contains(event.target)) {
          return
        }
      }

      // If none of the above conditions returned, the click was outside the modal
      // and not on a grid icon. So, close the modal.
      this.closeModal()
    }

    // --- NEW: Reset scroll positions for Craft modal and Read-Me wrapper ---
    resetCraftModalScroll() {
      // Prefer specifically marked custom scrollbars if present
      const readMeWrapper =
        document.querySelector('.ayw-read-me-wrapper.custom-scrollbar') ||
        document.querySelector('.ayw-read-me-wrapper')
      const craftDetails =
        document.querySelector('.ayw-craft-details.custom-scrollbar') ||
        this.craftDetails ||
        document.querySelector('.ayw-craft-details')
      const collectionListWrapper = document.querySelector(
        '.collection-list-wrapper-16.w-dyn-list'
      )

      if (craftDetails) {
        craftDetails.scrollTop = 0
      }
      if (readMeWrapper) {
        readMeWrapper.scrollTop = 0
      }
      if (collectionListWrapper) {
        collectionListWrapper.scrollTop = 0
      }
      if (!craftDetails && !readMeWrapper && !collectionListWrapper) {
        console.warn(
          'CraftUIManager: No scroll containers found to reset (craftDetails/readMeWrapper/collectionListWrapper).'
        )
      } else {
        console.log(
          'CraftUIManager: Reset scrollTop to 0 for modal/read-me containers.'
        )
      }
    }

    // --- NEW: Smooth scroll to the ayw-readme-title inside a craft item ---
    scrollCraftDetailsToItemTitle(craftItem) {
      const container =
        document.querySelector('.ayw-craft-details.custom-scrollbar') ||
        this.craftDetails ||
        document.querySelector('.ayw-craft-details')
      if (!container || !craftItem) return

      const title = craftItem.querySelector('.ayw-readme-title') || craftItem
      const containerRect = container.getBoundingClientRect()
      const targetRect = title.getBoundingClientRect()
      const targetTop = targetRect.top - containerRect.top + container.scrollTop
      const rootFontSizePx =
        parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      const offsetPx = rootFontSizePx * 3 // 3rem offset similar to accordion behavior
      const adjustedTop = Math.max(0, targetTop - offsetPx)

      console.log('[CraftUI] Scrolling craft details to item title:', {
        craftId: craftItem.getAttribute('data-craft'),
        adjustedTop,
      })

      anime({
        targets: container,
        scrollTop: adjustedTop,
        duration: 0,
        easing: 'easeInOutQuad',
      })
    }
  }

  // Initialize the handler
  new CraftUIManager()
}

export default initAYWCraftUI
