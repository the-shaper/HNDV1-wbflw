function initAYWCraftUI() {
  class CraftUIManager {
    constructor() {
      // Cache DOM elements
      this.modal = document.querySelector('.ayw-craft-modal')
      this.gridIcons = document.querySelectorAll('.ayw-grid-icon-base')
      this.standardIcons = document.querySelectorAll('.ayw-icon-base')
      this.craftItems = document.querySelectorAll('.craft-readme-dynamic')
      this.closeButtons = document.querySelectorAll('.close-btn-wrapper')
      this.accordionTabs = document.querySelectorAll('.ayw-accordion-tab')
      this.radioButtons = document.querySelectorAll('.ayw-radiobutt')

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
      this.handleRadioButtonClick = this.handleRadioButtonClick.bind(this)

      // Initialize without any classes
      this.clearIconStates()

      this.init()

      // Simulate click on first radio button after initialization
      const firstRadioButton = this.radioButtons[0]
      if (firstRadioButton) {
        this.handleRadioButtonClick(firstRadioButton)
      }
    }

    init() {
      // Initialize icon states before setting up event listeners
      this.initializeIconStates()

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

      // Close modal when clicking outside (optional)
      this.modal?.addEventListener('click', (e) => {
        if (e.target === this.modal) {
          this.closeModal()
        }
      })

      // Add click listeners to radio buttons
      this.radioButtons.forEach((button) => {
        button.addEventListener('click', () =>
          this.handleRadioButtonClick(button)
        )
      })
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
    }

    setLevelIndicators(icon, levelName, isActive) {
      const level = this.levelMapping[levelName]
      if (!level) return // Skip if level name isn't valid

      const indicators = icon.querySelectorAll('.ayw-level-indicator')
      const isGridIcon = icon.classList.contains('ayw-grid-icon-base')
      const selectedButton = Array.from(this.radioButtons).find((btn) =>
        btn.classList.contains('is-pressed')
      )
      const buttonType = selectedButton?.getAttribute('data-button')
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
        } else if (isActive && index < level) {
          // Standard icon behavior - show levels up to current level when active
          indicator.classList.add('is-on')
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

      // If clicking the same icon that's currently open, close the modal
      if (
        clickedIcon === this.lastClickedIcon &&
        this.modal?.classList.contains('is-active')
      ) {
        this.closeModal()
        this.removeAnyClickedFromAllIcons()
        this.setLevelIndicators(clickedIcon, levelName, false)
        return
      }

      // Reset all icons (both grid and standard)
      this.gridIcons.forEach((icon) => {
        const iconLevelName = icon.getAttribute('data-level')
        icon.classList.remove('any-clicked')
        this.setLevelIndicators(icon, iconLevelName, false)
      })
      this.standardIcons.forEach((icon) => {
        const iconLevelName = icon.getAttribute('data-level')
        this.setLevelIndicators(icon, iconLevelName, false)
        icon.classList.remove('stroke') // Remove stroke class from all standard icons
      })

      // Activate clicked icon and find its matching pair
      if (clickedIcon.classList.contains('ayw-grid-icon-base')) {
        clickedIcon.classList.add('any-clicked')
      }
      this.setLevelIndicators(clickedIcon, levelName, true)

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
        // Only add any-clicked if it's a grid icon
        if (matchingIcon.classList.contains('ayw-grid-icon-base')) {
          matchingIcon.classList.add('any-clicked')
        } else {
          // Add stroke class if it's the standard icon
          matchingIcon.classList.add('stroke')
        }
        this.setLevelIndicators(matchingIcon, levelName, true)
      }

      // Update last clicked icon
      this.lastClickedIcon = clickedIcon

      // Hide all craft items first
      this.craftItems.forEach((item) => {
        item.style.display = 'none'
      })

      // Find and show the matching craft item
      const matchingCraftItem = Array.from(this.craftItems).find(
        (item) => item.getAttribute('data-craft') === craftId
      )

      if (matchingCraftItem) {
        matchingCraftItem.style.display = 'flex'
        this.modal?.classList.add('is-active')
      }
    }

    removeAnyClickedFromAllIcons() {
      // Remove .any-clicked only from grid icons
      this.gridIcons.forEach((icon) => {
        icon.classList.remove('any-clicked')
        const levelName = icon.getAttribute('data-level')
        this.setLevelIndicators(icon, levelName, false)
      })
      // Reset level indicators and remove stroke class from standard icons
      this.standardIcons.forEach((icon) => {
        const levelName = icon.getAttribute('data-level')
        this.setLevelIndicators(icon, levelName, false)
        icon.classList.remove('stroke')
      })
    }

    closeModal() {
      this.modal?.classList.remove('is-active')
      // Reset last clicked icon when modal closes
      if (this.lastClickedIcon) {
        const levelName = this.lastClickedIcon.getAttribute('data-level')
        this.setLevelIndicators(this.lastClickedIcon, levelName, false)
      }
      this.lastClickedIcon = null
      // Remove .any-clicked from all icons
      this.removeAnyClickedFromAllIcons()
    }

    clearIconStates() {
      // Remove init and selected classes, but preserve base dream class
      this.gridIcons.forEach((icon) => {
        icon.classList.remove('init', 'selected')
      })
    }

    updateIconStates(buttonType) {
      // Clear existing states
      this.clearIconStates()

      this.gridIcons.forEach((icon) => {
        const packageType = icon.getAttribute('data-color')?.toLowerCase()

        if (buttonType === '1') {
          // Button 1: Only show initiation packages
          if (packageType === 'initiation & dreamcaster') {
            icon.classList.add('init')
          }
        } else if (buttonType === '2') {
          // Button 2: Show both types
          if (packageType === 'initiation & dreamcaster') {
            icon.classList.add('init')
          }
          // Add selected class to dreamcaster icons
          if (packageType === 'dreamcaster') {
            icon.classList.add('selected')
          }
        }
      })
    }

    handleRadioButtonClick(clickedButton) {
      // Remove only the is-pressed state from all buttons
      this.radioButtons.forEach((button) => {
        button.classList.remove('is-pressed')

        // Update the Webflow radio input state
        const radioInput = button.querySelector('.w-radio-input')
        if (radioInput) {
          radioInput.classList.remove('w--redirected-checked')
        }
      })

      // Add is-pressed to the clicked button
      clickedButton.classList.add('is-pressed')

      // Update the Webflow radio input state for the clicked button
      const clickedRadioInput = clickedButton.querySelector('.w-radio-input')
      if (clickedRadioInput) {
        clickedRadioInput.classList.add('w--redirected-checked')
      }

      // Update icon states based on selected button
      const buttonType = clickedButton.getAttribute('data-button')
      this.updateIconStates(buttonType)

      // Update level indicators for all grid icons
      this.gridIcons.forEach((icon) => {
        const levelName = icon.getAttribute('data-level')
        this.setLevelIndicators(icon, levelName, false)
      })
    }
  }

  // Initialize the handler
  new CraftUIManager()
}

export default initAYWCraftUI
