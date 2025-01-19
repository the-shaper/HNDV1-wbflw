function initAgencyTabs() {
  class TabInterface {
    constructor(container) {
      this.container = container
      this.tabList = this.container.querySelector('.tab-list')
      this.tabs = this.container.querySelectorAll('.tab')
      this.panels = this.container.querySelectorAll('.tab-panel')

      // Add reference to body element
      this.bodyElement = document.querySelector('.body-agency')

      // Initialize all panels as hidden first
      this.panels.forEach((panel) => {
        panel.hidden = true
      })

      this.init()

      // Set first tab as active by default, without focus
      const firstTab = this.tabs[0]
      if (firstTab) {
        this.switchTab(firstTab, true)
      }
    }

    init() {
      this.tabList.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab')) {
          this.switchTab(e.target)
        }
      })

      this.tabList.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          this.switchTabOnArrowPress(e)
        }
      })
    }

    switchTab(newTab, isInitialLoad = false) {
      // Hide all panels first
      this.panels.forEach((panel) => {
        panel.hidden = true
      })

      const oldTab = this.tabList.querySelector('[aria-selected="true"]')
      if (oldTab) {
        oldTab.setAttribute('aria-selected', 'false')
      }

      newTab.setAttribute('aria-selected', 'true')
      const newPanel = this.container.querySelector(
        `[data-panel="${newTab.dataset.tab}"]`
      )
      if (newPanel) {
        newPanel.hidden = false
      }

      // Only apply focus if it's not the initial load
      if (!isInitialLoad) {
        newTab.focus()
      }

      // Handle body background classes
      if (this.bodyElement) {
        // Remove all existing background classes
        this.bodyElement.classList.remove('bg-1', 'bg-2', 'bg-3')

        // Add the appropriate background class based on the tab index
        const tabIndex = Array.from(this.tabs).indexOf(newTab) + 1
        this.bodyElement.classList.add(`bg-${tabIndex}`)
      }
    }

    switchTabOnArrowPress(e) {
      const currentTab = e.target
      const tabsArray = Array.from(this.tabs)
      const currentIndex = tabsArray.indexOf(currentTab)

      let newIndex
      if (e.key === 'ArrowLeft') {
        newIndex = currentIndex === 0 ? tabsArray.length - 1 : currentIndex - 1
      } else {
        newIndex = currentIndex === tabsArray.length - 1 ? 0 : currentIndex + 1
      }

      this.switchTab(tabsArray[newIndex])
      e.preventDefault()
    }
  }

  // Initialize all tab interfaces on the page
  document
    .querySelectorAll('.tab-container')
    .forEach((container) => new TabInterface(container))
}

export default initAgencyTabs
