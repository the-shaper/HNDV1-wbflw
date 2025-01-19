function initAccordionAYW() {
  class Accordion {
    constructor(element) {
      this.element = element
      this.items = element.querySelectorAll('.ayw-accordion-duo')
      // Store dynamic elements for better performance
      this.dynamicElements = {
        tab1: document.querySelector('.ayw-dynamic-read-me.tab1'),
        tab2: document.querySelector('.ayw-dynamic-read-me.tab2'),
        tab3: document.querySelector('.ayw-dynamic-read-me.tab3'),
      }
      this.init()
    }

    init() {
      this.items.forEach((item, index) => {
        const header = item.querySelector('.ayw-accordion-tab')
        const content = item.querySelector('.ayw-accordion-pane')

        // Set initial state
        gsap.set(content, { height: 0 })

        // Open first item by default
        if (index === 0) {
          const contentInner = item.querySelector('.ayw-accordion-pane-content')
          const tabNumber = item.querySelector('.ayw-tab-number-wrapper')
          const tabTitle = item.querySelector('.ayw-tab-title-wrapper')

          item.classList.add('is-active')
          tabNumber?.classList.add('is-active')
          tabTitle?.classList.add('is-active')
          gsap.set(content, { height: contentInner.offsetHeight })
        }

        header.addEventListener('click', () => this.toggleItem(item))
      })
    }

    updateDynamicElements(openPaneNumber) {
      // Hide all dynamic elements first
      Object.values(this.dynamicElements).forEach((element) => {
        if (element) element.classList.add('off')
      })

      // If no pane is open (openPaneNumber is null) or invalid, show tab1 by default
      if (!openPaneNumber) {
        const defaultElement = this.dynamicElements.tab1
        if (defaultElement) {
          defaultElement.classList.remove('off')
        }
        return
      }

      // Show the corresponding dynamic element
      const activeElement = this.dynamicElements[`tab${openPaneNumber}`]
      if (activeElement) {
        activeElement.classList.remove('off')
      }
    }

    toggleItem(clickedItem) {
      const content = clickedItem.querySelector('.ayw-accordion-pane')
      const contentInner = clickedItem.querySelector(
        '.ayw-accordion-pane-content'
      )
      const tabNumber = clickedItem.querySelector('.ayw-tab-number-wrapper')
      const tabTitle = clickedItem.querySelector('.ayw-tab-title-wrapper')
      const isOpen = clickedItem.classList.contains('is-active')
      const paneNumber = clickedItem
        .querySelector('.ayw-accordion-pane')
        .getAttribute('open-pane')

      // If the clicked item is already open, do nothing
      if (isOpen) return

      // Close all other items
      this.items.forEach((item) => {
        if (item !== clickedItem && item.classList.contains('is-active')) {
          item.classList.remove('is-active')
          const itemContent = item.querySelector('.ayw-accordion-pane')
          const itemTabNumber = item.querySelector('.ayw-tab-number-wrapper')
          const itemTabTitle = item.querySelector('.ayw-tab-title-wrapper')

          itemTabNumber?.classList.remove('is-active')
          itemTabTitle?.classList.remove('is-active')

          gsap.to(itemContent, {
            height: 0,
            duration: 0.4,
            ease: 'power2.out',
          })
        }
      })

      // Open clicked item
      clickedItem.classList.add('is-active')
      tabNumber?.classList.add('is-active')
      tabTitle?.classList.add('is-active')
      gsap.to(content, {
        height: contentInner.offsetHeight,
        duration: 0.4,
        ease: 'power2.out',
      })
      // Show corresponding dynamic element
      this.updateDynamicElements(paneNumber)
    }
  }

  const accordions = document.querySelectorAll('.ayw-accordion-wrapper')
  accordions.forEach((accordion) => new Accordion(accordion))
}

export default initAccordionAYW
