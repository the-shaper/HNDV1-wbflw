function initAYWCraftUI() {
  class CraftUIManager {
    constructor() {
      // Cache DOM elements
      this.modal = document.querySelector('.ayw-craft-modal')
      this.gridIcons = document.querySelectorAll('.ayw-grid-icon-base')
      this.standardIcons = document.querySelectorAll('.ayw-icon-base')
      this.craftItems = document.querySelectorAll('.craft-readme-dynamic')
      this.closeButtons = document.querySelectorAll('.close-btn-wrapper') // Get all close buttons
      this.accordionTabs = document.querySelectorAll('.ayw-accordion-tab') // Add accordion tabs

      // Track last clicked icon
      this.lastClickedIcon = null

      // Bind methods
      this.handleIconClick = this.handleIconClick.bind(this)
      this.closeModal = this.closeModal.bind(this)
      this.initializeIconStates = this.initializeIconStates.bind(this)

      this.init()
    }

    init() {
      // Initialize icon states before setting up event listeners
      this.initializeIconStates()

      // Add click listeners to all grid icons
      this.gridIcons.forEach((icon) => {
        icon.addEventListener('click', () => this.handleIconClick(icon))
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
    }

    initializeIconStates() {
      // Handle grid icons
      this.gridIcons.forEach((icon) => {
        const packageType = icon.getAttribute('data-color')?.toLowerCase()
        if (packageType === 'initiation') {
          icon.classList.add('init')
          icon.classList.remove('dream')
        } else if (packageType === 'dreamcaster') {
          icon.classList.add('dream')
          icon.classList.remove('init')
        }
      })

      // Handle standard icons
      this.standardIcons.forEach((icon) => {
        const packageType = icon.getAttribute('data-color')?.toLowerCase()
        if (packageType === 'initiation') {
          icon.classList.add('init')
          icon.classList.remove('dream')
        } else if (packageType === 'dreamcaster') {
          icon.classList.add('dream')
          icon.classList.remove('init')
        }
      })
    }

    handleIconClick(clickedIcon) {
      const craftId = clickedIcon.getAttribute('data-craft')
      if (!craftId) return

      // If clicking the same icon that's currently open, close the modal
      if (
        clickedIcon === this.lastClickedIcon &&
        this.modal?.classList.contains('is-active')
      ) {
        this.closeModal()
        this.removeAnyClickedFromAllIcons() // Remove highlight when closing
        return
      }

      // Remove .any-clicked from all icons first
      this.removeAnyClickedFromAllIcons()

      // Add .any-clicked to the clicked icon
      clickedIcon.classList.add('any-clicked')

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
      // Remove .any-clicked from all grid icons
      this.gridIcons.forEach((icon) => {
        icon.classList.remove('any-clicked')
      })
    }

    closeModal() {
      this.modal?.classList.remove('is-active')
      // Reset last clicked icon when modal closes
      this.lastClickedIcon = null
      // Remove .any-clicked from all icons when modal closes
      this.removeAnyClickedFromAllIcons()
    }
  }

  // Initialize the handler
  new CraftUIManager()
}

export default initAYWCraftUI
