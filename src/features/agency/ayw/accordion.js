function initAccordionAYW() {
  class Accordion {
    constructor(element) {
      this.element = element
      this.items = element.querySelectorAll('.ayw-accordion-duo')
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

    toggleItem(clickedItem) {
      const content = clickedItem.querySelector('.ayw-accordion-pane')
      const contentInner = clickedItem.querySelector(
        '.ayw-accordion-pane-content'
      )
      const tabNumber = clickedItem.querySelector('.ayw-tab-number-wrapper')
      const tabTitle = clickedItem.querySelector('.ayw-tab-title-wrapper')
      const isOpen = clickedItem.classList.contains('is-active')

      // Close all other items
      this.items.forEach((item) => {
        if (item !== clickedItem && item.classList.contains('is-active')) {
          item.classList.remove('is-active')
          const itemContent = item.querySelector('.ayw-accordion-pane')
          const itemTabNumber = item.querySelector('.ayw-tab-number-wrapper')
          const itemTabTitle = item.querySelector('.ayw-tab-title-wrapper')

          // Remove active state from tab number and title
          itemTabNumber?.classList.remove('is-active')
          itemTabTitle?.classList.remove('is-active')

          gsap.to(itemContent, {
            height: 0,
            duration: 0.4,
            ease: 'power2.out',
          })
        }
      })

      // Toggle clicked item
      if (!isOpen) {
        clickedItem.classList.add('is-active')
        tabNumber?.classList.add('is-active')
        tabTitle?.classList.add('is-active')
        gsap.to(content, {
          height: contentInner.offsetHeight,
          duration: 0.4,
          ease: 'power2.out',
        })
      } else {
        clickedItem.classList.remove('is-active')
        tabNumber?.classList.remove('is-active')
        tabTitle?.classList.remove('is-active')
        gsap.to(content, {
          height: 0,
          duration: 0.4,
          ease: 'power2.out',
        })
      }
    }
  }

  const accordions = document.querySelectorAll('.ayw-accordion-wrapper')
  accordions.forEach((accordion) => new Accordion(accordion))
}

export default initAccordionAYW
