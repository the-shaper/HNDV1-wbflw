import gsap from 'gsap' // Make sure gsap is imported if not already

// --- Configuration ---
const ACCORDION_CONFIG = {
  animationSpeed: 0.66, // Duration in seconds, copied from serviceselect.js
  easingType: 'expo.inOut', // GSAP easing string, copied from serviceselect.js
}
// --- End Configuration ---

function initAccordionAYW() {
  class Accordion {
    constructor(element) {
      this.element = element
      this.items = Array.from(element.querySelectorAll('.ayw-accordion-duo')) // Convert to Array
      // Store dynamic elements for better performance
      this.dynamicElements = {
        tab1: document.querySelector('.ayw-dynamic-read-me.tab1'),
        tab2: document.querySelector('.ayw-dynamic-read-me.tab2'),
        tab3: document.querySelector('.ayw-dynamic-read-me.tab3'),
      }
      this.activeIndex = 0 // Track active index
      this.init()
    }

    init() {
      this.items.forEach((item, index) => {
        const header = item.querySelector('.ayw-accordion-tab')
        const content = item.querySelector('.ayw-accordion-pane')

        // Set initial state for content and flex-grow
        gsap.set(content, { height: 0 })
        gsap.set(item, { flexGrow: 0 })

        // Open first item by default
        if (index === 0) {
          this.openItem(item, false) // Open without animation initially
          this.activeIndex = 0
        }

        header.addEventListener('click', () => this.toggleItem(item))
      })

      // Make instance accessible (simple global method)
      window.aywAccordion = this
    }

    updateDynamicElements(openPaneNumber) {
      // Hide all dynamic elements first
      Object.values(this.dynamicElements).forEach((element) => {
        if (element) element.classList.add('off')
      })

      // If no pane is open (openPaneNumber is null or invalid), default behavior (e.g., show tab1)
      let targetTab = openPaneNumber || 1 // Default to 1 if null/undefined

      // Show the corresponding dynamic element
      const activeElement = this.dynamicElements[`tab${targetTab}`]
      if (activeElement) {
        activeElement.classList.remove('off')
      } else {
        // Fallback if dynamic element for index doesn't exist, show tab 1
        const defaultElement = this.dynamicElements.tab1
        if (defaultElement) {
          defaultElement.classList.remove('off')
        }
      }
    }

    // Renamed from toggleItem to make intention clearer when called internally
    openItem(itemToOpen, animate = true) {
      const content = itemToOpen.querySelector('.ayw-accordion-pane')
      const contentInner = itemToOpen.querySelector(
        '.ayw-accordion-pane-content'
      )
      const tabNumber = itemToOpen.querySelector('.ayw-tab-number-wrapper')
      const tabTitle = itemToOpen.querySelector('.ayw-tab-title-wrapper')
      const paneNumber = itemToOpen
        .querySelector('.ayw-accordion-pane')
        ?.getAttribute('open-pane') // Use optional chaining

      // Update active index FIRST
      this.activeIndex = this.items.indexOf(itemToOpen)
      console.log(`Accordion: Updated activeIndex to ${this.activeIndex}`) // Add log

      // Dispatch event AFTER updating activeIndex
      if (paneNumber) {
        // Only dispatch if we have a valid pane number
        this.element.dispatchEvent(
          new CustomEvent('accordionItemOpened', {
            // Pass the new activeIndex and paneNumber in the detail
            detail: { paneNumber: paneNumber, activeIndex: this.activeIndex },
            bubbles: true, // Allow event to bubble up
          })
        )
        console.log(
          `Accordion: Dispatched accordionItemOpened for pane ${paneNumber} (activeIndex: ${this.activeIndex})`
        )
      } else {
        // Even if paneNumber is missing, we might still want to notify about the index change
        this.element.dispatchEvent(
          new CustomEvent('accordionItemOpened', {
            detail: { activeIndex: this.activeIndex }, // Send index anyway
            bubbles: true,
          })
        )
        console.warn(
          `Accordion: Dispatched accordionItemOpened without paneNumber (activeIndex: ${this.activeIndex})`
        )
      }

      // Close currently active item (if different)
      this.items.forEach((item) => {
        if (item !== itemToOpen && item.classList.contains('is-active')) {
          this.closeItem(item, animate)
        }
      })

      // Open the target item
      itemToOpen.classList.add('is-active')
      tabNumber?.classList.add('is-active')
      tabTitle?.classList.add('is-active')

      // Use config animation speed, or 0 if not animating
      const duration = animate ? ACCORDION_CONFIG.animationSpeed : 0
      const targetHeight = contentInner ? contentInner.offsetHeight : 'auto' // Calculate target height for animation

      // Animate height from 0 to content height (or auto if no inner)
      gsap.to(content, {
        height: targetHeight,
        duration: duration, // Use configured duration
        ease: ACCORDION_CONFIG.easingType, // Use configured ease
        onComplete: () => {
          // After animation, remove inline height AND set flex-grow
          gsap.set(content, { height: 'auto' })
        },
      })

      // Show corresponding dynamic element
      // Update: Use the reliable activeIndex now
      this.updateDynamicElements(paneNumber) // Keep using paneNumber if needed for dynamic elements

      // Optional: Dispatch event when item changes - redundant if using accordionItemOpened
      // this.element.dispatchEvent(new CustomEvent('accordionChanged', { detail: { activeIndex: this.activeIndex } }));
    }

    closeItem(itemToClose, animate = true) {
      // Set flex-grow to 0 immediately when closing starts
      gsap.set(itemToClose, { flexGrow: 0 })

      itemToClose.classList.remove('is-active')
      const itemContent = itemToClose.querySelector('.ayw-accordion-pane')
      const itemTabNumber = itemToClose.querySelector('.ayw-tab-number-wrapper')
      const itemTabTitle = itemToClose.querySelector('.ayw-tab-title-wrapper')

      itemTabNumber?.classList.remove('is-active')
      itemTabTitle?.classList.remove('is-active')

      // Use config animation speed, or 0 if not animating
      const duration = animate ? ACCORDION_CONFIG.animationSpeed : 0
      gsap.to(itemContent, {
        height: 0,
        duration: duration, // Use configured duration
        ease: ACCORDION_CONFIG.easingType, // Use configured ease
      })
    }

    toggleItem(clickedItem) {
      const isOpen = clickedItem.classList.contains('is-active')

      // If the clicked item is already open, do nothing (consistent behavior)
      if (isOpen) return

      this.openItem(clickedItem, true) // Open the clicked item with animation
    }

    // --- New Navigation Methods ---
    openByIndex(index, animate = true) {
      const targetIndex = Math.max(0, Math.min(index, this.items.length - 1))
      const targetItem = this.items[targetIndex]
      if (targetItem && !targetItem.classList.contains('is-active')) {
        this.openItem(targetItem, animate)
      }
    }

    openNext(animate = true) {
      let nextIndex = this.activeIndex + 1
      if (nextIndex >= this.items.length) {
        console.log('Accordion: Cannot open next, already at the last item.')
        return
      }
      this.openByIndex(nextIndex, animate)
    }

    openPrev(animate = true) {
      let prevIndex = this.activeIndex - 1
      if (prevIndex < 0) {
        console.log(
          'Accordion: Cannot open previous, already at the first item.'
        )
        return
      }
      this.openByIndex(prevIndex, animate)
    }
    // --- End New Navigation Methods ---
  }

  const accordions = document.querySelectorAll('.ayw-accordion-wrapper')
  // Ensure only one instance if multiple wrappers exist but we need a single controller point
  if (accordions.length > 0) {
    new Accordion(accordions[0]) // Initialize only the first one found
    if (accordions.length > 1) {
      console.warn(
        'Multiple .ayw-accordion-wrapper elements found. Only initializing the first one for navigation control.'
      )
    }
  }
}

export default initAccordionAYW
