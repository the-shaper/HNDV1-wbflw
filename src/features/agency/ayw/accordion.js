import gsap from 'gsap' // Make sure gsap is imported if not already
import anime from 'animejs'

// --- Configuration ---
const ACCORDION_CONFIG = {
  animationSpeed: 0.66, // Duration in seconds, copied from serviceselect.js
  easingType: 'expo.inOut', // GSAP easing string, copied from serviceselect.js
}
// Scroll behavior for Tab 2 link→anchor navigation
const TAB2_SCROLL_CONFIG = {
  durationMs: 111,
  easing: 'easeInOutQuad',
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
      // Link-to-anchor mapping for Tab 1
      this.tab1LinkHandlersAttached = false
      this.tab1LinkIdToAnchorId = {
        'initiation-button': 'init-anc',
        'dreamcasting-button': 'drm-anc',
      }
      // Preferred display texts for anchors found inside Rich Text (Tab 1)
      this.tab1AnchorTextById = {
        'init-anc': 'Initiation',
        'drm-anc': 'Dreamcasting',
      }
      // Link-to-anchor mapping for Tab 2
      this.tab2LinkHandlersAttached = false
      this.tab2LinkIdToAnchorId = {
        'chkpt-lnk': 'chkpt-anc',
        'tsk-lnk': 'tsk-anc',
        'rmt-lnk': 'rmt-anc',
        'phn-lnk': 'phn-anc',
        'msg-lnk': 'msg-anc',
        'generator-button': 'generator-anc',
        'reactor-button': 'reactor-anc',
      }
      // Preferred display texts for anchors found inside Rich Text (case-insensitive)
      this.tab2AnchorTextById = {
        'chkpt-anc': 'Checkpoints',
        'tsk-anc': 'Tasks',
        'rmt-anc': 'Remote Viewing',
        'phn-anc': 'Phone Line',
        'msg-anc': 'Messaging',
        'generator-anc': 'Generator',
        'reactor-anc': 'Reactor',
      }
      // Keyword fallbacks to match even if copy or punctuation varies slightly
      this.tab2AnchorKeywordsById = {
        'chkpt-anc': ['checkpoint'],
        'tsk-anc': ['task'],
        'rmt-anc': ['remote', 'view'],
        'phn-anc': ['phone'],
        'msg-anc': ['messag'],
        'generator-anc': ['generator'],
        'reactor-anc': ['reactor'],
      }
      this.boundTab2Handlers = new Map()
      this.tab2Scroll = { ...TAB2_SCROLL_CONFIG }

      // Link-to-anchor mapping for Tab 3
      this.tab3LinkHandlersAttached = false
      this.tab3LinkIdToAnchorId = {
        'pow-checks': 'pow-anc',
      }
      // Preferred display texts for anchors found inside Rich Text (case-insensitive)
      this.tab3AnchorTextById = {
        'pow-anc': 'Power',
      }
      // Keyword fallbacks to match even if copy or punctuation varies slightly
      this.tab3AnchorKeywordsById = {
        'pow-anc': ['power'],
      }
      this.boundTab3Handlers = new Map()
      this.tab3Scroll = { ...TAB2_SCROLL_CONFIG }
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

      // Attach/detach Tab 1, 2, and 3 link handlers based on active tab
      const activeTabStr = String(targetTab)
      console.log(
        '[Accordion] updateDynamicElements -> activeTab:',
        activeTabStr
      )

      // Tab 1 handlers
      if (activeTabStr === '1') {
        console.log('[Accordion] Activating Tab 1 link handlers...')
        this.attachTab1LinkHandlers()
      } else {
        console.log('[Accordion] Deactivating Tab 1 link handlers...')
        this.detachTab1LinkHandlers()
      }

      // Tab 2 handlers
      if (activeTabStr === '2') {
        console.log('[Accordion] Activating Tab 2 link handlers...')
        this.attachTab2LinkHandlers()
      } else {
        console.log('[Accordion] Deactivating Tab 2 link handlers...')
        this.detachTab2LinkHandlers()
      }

      // Tab 3 handlers
      if (activeTabStr === '3') {
        console.log('[Accordion] Activating Tab 3 link handlers...')
        this.attachTab3LinkHandlers()
      } else {
        console.log('[Accordion] Deactivating Tab 3 link handlers...')
        this.detachTab3LinkHandlers()
      }

      // Reset scroll position to top for the read-me area on every tab change
      const readMeScrollContainer =
        document.querySelector('.ayw-read-me-wrapper.custom-scrollbar') ||
        activeElement
      if (readMeScrollContainer) {
        readMeScrollContainer.scrollTop = 0
        console.log(
          '[Accordion] Reset scrollTop to 0 for container on tab change'
        )
      } else {
        console.warn(
          '[Accordion] No scroll container found to reset on tab change'
        )
      }
    }

    updateLabelVisibility() {
      this.items.forEach((item) => {
        const tabTitle = item.querySelector('.ayw-tab-title-wrapper')
        const labelWrap = item.querySelector('.ayw-accordion-label-wrap')

        if (!tabTitle || !labelWrap) return // Skip if elements don't exist

        if (tabTitle.classList.contains('is-active')) {
          labelWrap.classList.remove('off')
        } else {
          labelWrap.classList.add('off')
        }
      })
    }

    openItem(itemToOpen, animate = true) {
      const content = itemToOpen.querySelector('.ayw-accordion-pane')
      const contentInner = itemToOpen.querySelector(
        '.ayw-accordion-pane-content'
      )
      const tabNumber = itemToOpen.querySelector('.ayw-tab-number-wrapper')
      const tabTitle = itemToOpen.querySelector('.ayw-tab-title-wrapper')
      const paneNumber = itemToOpen
        .querySelector('.ayw-accordion-pane')
        ?.getAttribute('open-pane')

      // Update active index FIRST
      this.activeIndex = this.items.indexOf(itemToOpen)
      console.log(`Accordion: Updated activeIndex to ${this.activeIndex}`)

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

      // Update label visibility when opening
      this.updateLabelVisibility()

      // Use config animation speed, or 0 if not animating
      const duration = animate ? ACCORDION_CONFIG.animationSpeed : 0
      const targetHeight = contentInner ? contentInner.offsetHeight : 'auto'

      // Animate height from 0 to content height
      gsap.to(content, {
        height: targetHeight,
        duration: duration,
        ease: ACCORDION_CONFIG.easingType,
        onComplete: () => {
          gsap.set(content, { height: 'auto' })
        },
      })

      // Show corresponding dynamic element
      this.updateDynamicElements(paneNumber)

      // Dispatch event
      if (paneNumber) {
        this.element.dispatchEvent(
          new CustomEvent('accordionItemOpened', {
            detail: { paneNumber: paneNumber, activeIndex: this.activeIndex },
            bubbles: true,
          })
        )
      } else {
        this.element.dispatchEvent(
          new CustomEvent('accordionItemOpened', {
            detail: { activeIndex: this.activeIndex },
            bubbles: true,
          })
        )
      }
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

      // Update label visibility when closing
      this.updateLabelVisibility()

      // Use config animation speed, or 0 if not animating
      const duration = animate ? ACCORDION_CONFIG.animationSpeed : 0
      gsap.to(itemContent, {
        height: 0,
        duration: duration,
        ease: ACCORDION_CONFIG.easingType,
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

    // --- Tab 2 Link → Anchor Support ---
    ensureHighlightCSS() {
      if (document.getElementById('ayw-highlight-style')) return
      const style = document.createElement('style')
      style.id = 'ayw-highlight-style'
      style.textContent = `
        .ayw-scroll-flash { animation: aywFlash 1s ease-out 1; }
        @keyframes aywFlash { 0% { background-color: #EAFF36; } 100% { background-color: transparent; } }
      `
      document.head.appendChild(style)
    }

    getTab2Container() {
      // Prefer main scroll wrapper if available
      const mainWrapper = document.querySelector(
        '.ayw-read-me-wrapper.custom-scrollbar'
      )
      if (mainWrapper) {
        console.log(
          '[Accordion] Using main scroll container .ayw-read-me-wrapper.custom-scrollbar'
        )
        return mainWrapper
      }
      const tab2 =
        this.dynamicElements.tab2 ||
        document.querySelector('.ayw-dynamic-read-me.tab2')
      if (tab2) {
        console.log(
          '[Accordion] Using fallback container .ayw-dynamic-read-me.tab2'
        )
      } else {
        console.warn('[Accordion] No Tab 2 container found.')
      }
      return tab2
    }

    getTab1Container() {
      // Prefer main scroll wrapper if available
      const mainWrapper = document.querySelector(
        '.ayw-read-me-wrapper.custom-scrollbar'
      )
      if (mainWrapper) {
        console.log(
          '[Accordion] Using main scroll container .ayw-read-me-wrapper.custom-scrollbar for Tab 1'
        )
        return mainWrapper
      }
      const tab1 =
        this.dynamicElements.tab1 ||
        document.querySelector('.ayw-dynamic-read-me.tab1')
      if (tab1) {
        console.log(
          '[Accordion] Using fallback container .ayw-dynamic-read-me.tab1'
        )
      } else {
        console.warn('[Accordion] No Tab 1 container found.')
      }
      return tab1
    }

    getTab3Container() {
      // Prefer main scroll wrapper if available
      const mainWrapper = document.querySelector(
        '.ayw-read-me-wrapper.custom-scrollbar'
      )
      if (mainWrapper) {
        console.log(
          '[Accordion] Using main scroll container .ayw-read-me-wrapper.custom-scrollbar for Tab 3'
        )
        return mainWrapper
      }
      const tab3 =
        this.dynamicElements.tab3 ||
        document.querySelector('.ayw-dynamic-read-me.tab3')
      if (tab3) {
        console.log(
          '[Accordion] Using fallback container .ayw-dynamic-read-me.tab3'
        )
      } else {
        console.warn('[Accordion] No Tab 3 container found.')
      }
      return tab3
    }

    scrollToAnchor(container, target) {
      if (!container || !target) return
      const containerRect = container.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      const targetTop = targetRect.top - containerRect.top + container.scrollTop
      const rootFontSizePx =
        parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      const offsetPx = rootFontSizePx * 3 // 3rem offset
      const adjustedTop = Math.max(0, targetTop - offsetPx)
      console.log('[Accordion] Scrolling container to target:', {
        targetId: target.id,
        targetTop,
        offsetPx,
        adjustedTop,
        durationMs: this.tab2Scroll.durationMs,
        easing: this.tab2Scroll.easing,
      })

      anime({
        targets: container,
        scrollTop: adjustedTop,
        duration: this.tab2Scroll.durationMs,
        easing: this.tab2Scroll.easing,
        complete: () => {
          // Flash highlight on target
          this.ensureHighlightCSS()
          target.classList.add('ayw-scroll-flash')
          setTimeout(() => target.classList.remove('ayw-scroll-flash'), 900)
        },
      })
    }

    attachTab2LinkHandlers() {
      if (this.tab2LinkHandlersAttached) return
      const container = this.getTab2Container()
      if (!container) return
      // Ensure anchors are assigned based on heading text if IDs can't be set in CMS
      this.ensureTab2Anchors(container)

      console.log('[Accordion] Attaching Tab 2 link handlers...')
      const mappingEntries = Object.entries(this.tab2LinkIdToAnchorId)
      console.log('[Accordion] Link→Anchor mappings:', mappingEntries)

      mappingEntries.forEach(([linkId, anchorId]) => {
        const linkEl = document.getElementById(linkId)
        if (!linkEl) {
          console.warn(`[Accordion] Link element not found: #${linkId}`)
          return
        }
        console.log(`[Accordion] Found link: #${linkId} -> ${anchorId}`)
        const handler = (event) => {
          event.preventDefault()
          const target = this.findTab2AnchorElement(container, anchorId)
          if (!target) {
            console.warn('[Accordion] Anchor target not found for', {
              anchorId,
            })
          }
          if (!target) return
          this.scrollToAnchor(container, target)
        }
        linkEl.addEventListener('click', handler)
        this.boundTab2Handlers.set(linkId, handler)
      })

      this.tab2LinkHandlersAttached = true
      console.log('[Accordion] Tab 2 link handlers attached.')
    }

    detachTab2LinkHandlers() {
      if (!this.tab2LinkHandlersAttached) return
      console.log('[Accordion] Detaching Tab 2 link handlers...')
      this.boundTab2Handlers.forEach((handler, linkId) => {
        const linkEl = document.getElementById(linkId)
        if (linkEl) linkEl.removeEventListener('click', handler)
      })
      this.boundTab2Handlers.clear()
      this.tab2LinkHandlersAttached = false
      console.log('[Accordion] Tab 2 link handlers detached.')
    }
    // --- End Tab 2 Link → Anchor Support ---

    // --- Tab 1 Link → Anchor Support ---
    ensureTab1Anchors(container) {
      const tab1Root =
        container.querySelector('.ayw-dynamic-read-me.tab1') || container
      const headings = Array.from(tab1Root.querySelectorAll('h3'))
      if (headings.length === 0) return
      console.log('[Accordion] Tab 1 headings found:', headings.length)

      Object.entries(this.tab1AnchorTextById).forEach(
        ([anchorId, displayText]) => {
          if (tab1Root.querySelector(`#${anchorId}`)) return
          const exact = headings.find(
            (h) =>
              this.normalizeText(h.textContent) ===
              this.normalizeText(displayText)
          )
          if (exact) {
            exact.id = anchorId
            console.log(
              `[Accordion] (Tab 1) Assigned ID via exact text: #${anchorId} -> "${displayText}"`
            )
          }
        }
      )
    }

    findTab1AnchorElement(container, anchorId) {
      const tab1Root =
        container.querySelector('.ayw-dynamic-read-me.tab1') || container
      const byId = tab1Root.querySelector(`#${anchorId}`)
      if (byId) return byId
      const headings = Array.from(tab1Root.querySelectorAll('h3'))
      if (headings.length === 0) return null
      const displayText = this.tab1AnchorTextById[anchorId]
      if (displayText) {
        const exact = headings.find(
          (h) =>
            this.normalizeText(h.textContent) ===
            this.normalizeText(displayText)
        )
        if (exact) {
          exact.id = anchorId
          console.log(
            `[Accordion] (Tab 1) Found anchor by exact text and assigned ID: #${anchorId}`
          )
          return exact
        }
      }
      console.warn('[Accordion] (Tab 1) Could not resolve anchor element', {
        anchorId,
        displayText,
      })
      return null
    }

    attachTab1LinkHandlers() {
      if (this.tab1LinkHandlersAttached) return
      const container = this.getTab1Container()
      if (!container) return
      this.ensureTab1Anchors(container)

      console.log('[Accordion] Attaching Tab 1 link handlers...')
      const mappingEntries = Object.entries(this.tab1LinkIdToAnchorId)
      mappingEntries.forEach(([linkId, anchorId]) => {
        const linkEl = document.getElementById(linkId)
        if (!linkEl) {
          console.warn(`[Accordion] (Tab 1) Link element not found: #${linkId}`)
          return
        }
        const handler = (event) => {
          event.preventDefault()
          // Ensure Tab 1 is open
          this.openByIndex(0, true)
          const target = this.findTab1AnchorElement(container, anchorId)
          if (!target) return
          this.scrollToAnchor(container, target)
        }
        linkEl.addEventListener('click', handler)
        this.boundTab2Handlers.set(`tab1:${linkId}`, handler)
      })
      this.tab1LinkHandlersAttached = true
      console.log('[Accordion] Tab 1 link handlers attached.')
    }

    detachTab1LinkHandlers() {
      if (!this.tab1LinkHandlersAttached) return
      console.log('[Accordion] Detaching Tab 1 link handlers...')
      this.boundTab2Handlers.forEach((handler, linkId) => {
        if (!String(linkId).startsWith('tab1:')) return
        const id = String(linkId).replace('tab1:', '')
        const linkEl = document.getElementById(id)
        if (linkEl) linkEl.removeEventListener('click', handler)
      })
      // Remove only tab1 entries from the map
      Array.from(this.boundTab2Handlers.keys())
        .filter((k) => String(k).startsWith('tab1:'))
        .forEach((k) => this.boundTab2Handlers.delete(k))
      this.tab1LinkHandlersAttached = false
      console.log('[Accordion] Tab 1 link handlers detached.')
    }
    // --- End Tab 1 Link → Anchor Support ---

    // --- Tab 3 Link → Anchor Support ---
    ensureTab3Anchors(container) {
      const tab3Root =
        container.querySelector('.ayw-dynamic-read-me.tab3') || container
      const headings = Array.from(tab3Root.querySelectorAll('h3'))
      if (headings.length === 0) return
      console.log('[Accordion] Tab 3 headings found:', headings.length)

      Object.entries(this.tab3AnchorTextById).forEach(
        ([anchorId, displayText]) => {
          if (tab3Root.querySelector(`#${anchorId}`)) return
          const exact = headings.find(
            (h) =>
              this.normalizeText(h.textContent) ===
              this.normalizeText(displayText)
          )
          if (exact) {
            exact.id = anchorId
            console.log(
              `[Accordion] (Tab 3) Assigned ID via exact text: #${anchorId} -> "${displayText}"`
            )
          }
        }
      )
    }

    findTab3AnchorElement(container, anchorId) {
      const tab3Root =
        container.querySelector('.ayw-dynamic-read-me.tab3') || container
      const byId = tab3Root.querySelector(`#${anchorId}`)
      if (byId) return byId
      const headings = Array.from(tab3Root.querySelectorAll('h3'))
      if (headings.length === 0) return null
      const displayText = this.tab3AnchorTextById[anchorId]
      if (displayText) {
        const exact = headings.find(
          (h) =>
            this.normalizeText(h.textContent) ===
            this.normalizeText(displayText)
        )
        if (exact) {
          exact.id = anchorId
          console.log(
            `[Accordion] (Tab 3) Found anchor by exact text and assigned ID: #${anchorId}`
          )
          return exact
        }
      }
      console.warn('[Accordion] (Tab 3) Could not resolve anchor element', {
        anchorId,
        displayText,
      })
      return null
    }

    attachTab3LinkHandlers() {
      if (this.tab3LinkHandlersAttached) return
      const container = this.getTab3Container()
      if (!container) return
      this.ensureTab3Anchors(container)

      console.log('[Accordion] Attaching Tab 3 link handlers...')
      const mappingEntries = Object.entries(this.tab3LinkIdToAnchorId)
      mappingEntries.forEach(([linkId, anchorId]) => {
        const linkEl = document.getElementById(linkId)
        if (!linkEl) {
          console.warn(`[Accordion] (Tab 3) Link element not found: #${linkId}`)
          return
        }
        const handler = (event) => {
          event.preventDefault()
          // Ensure Tab 3 is open
          this.openByIndex(2, true)
          const target = this.findTab3AnchorElement(container, anchorId)
          if (!target) return
          this.scrollToAnchor(container, target)
        }
        linkEl.addEventListener('click', handler)
        this.boundTab3Handlers.set(linkId, handler)
      })
      this.tab3LinkHandlersAttached = true
      console.log('[Accordion] Tab 3 link handlers attached.')
    }

    detachTab3LinkHandlers() {
      if (!this.tab3LinkHandlersAttached) return
      console.log('[Accordion] Detaching Tab 3 link handlers...')
      this.boundTab3Handlers.forEach((handler, linkId) => {
        const linkEl = document.getElementById(linkId)
        if (linkEl) linkEl.removeEventListener('click', handler)
      })
      this.boundTab3Handlers.clear()
      this.tab3LinkHandlersAttached = false
      console.log('[Accordion] Tab 3 link handlers detached.')
    }
    // --- End Tab 3 Link → Anchor Support ---

    // --- Utilities for Rich Text Anchors (Tab 2) ---
    normalizeText(str) {
      return (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    }

    headingMatchesKeywords(text, keywords) {
      if (!keywords || !keywords.length) return false
      const norm = this.normalizeText(text)
      return keywords.every((kw) => norm.includes(this.normalizeText(kw)))
    }

    ensureTab2Anchors(container) {
      const tab2Root =
        container.querySelector('.ayw-dynamic-read-me.tab2') || container
      const headings = Array.from(tab2Root.querySelectorAll('h3'))
      if (headings.length === 0) return
      console.log('[Accordion] Tab 2 headings found:', headings.length)

      Object.entries(this.tab2AnchorTextById).forEach(
        ([anchorId, displayText]) => {
          // If already present, skip
          if (tab2Root.querySelector(`#${anchorId}`)) return

          // Try exact text match (case-insensitive, normalized)
          const exact = headings.find(
            (h) =>
              this.normalizeText(h.textContent) ===
              this.normalizeText(displayText)
          )
          if (exact) {
            exact.id = anchorId
            console.log(
              `[Accordion] Assigned ID via exact text: #${anchorId} -> "${displayText}"`
            )
            return
          }

          // Try keyword fallback
          const keywords = this.tab2AnchorKeywordsById[anchorId]
          const kwMatch = headings.find((h) =>
            this.headingMatchesKeywords(h.textContent, keywords)
          )
          if (kwMatch) {
            kwMatch.id = anchorId
            console.log(
              `[Accordion] Assigned ID via keywords: #${anchorId} -> [${(
                keywords || []
              ).join(', ')}]`
            )
          }
        }
      )
    }

    findTab2AnchorElement(container, anchorId) {
      // Prefer direct ID if already assigned
      const tab2Root =
        container.querySelector('.ayw-dynamic-read-me.tab2') || container
      const byId = tab2Root.querySelector(`#${anchorId}`)
      if (byId) return byId

      // Attempt to locate by display text or keywords, then assign ID for future
      const headings = Array.from(tab2Root.querySelectorAll('h3'))
      if (headings.length === 0) return null

      const displayText = this.tab2AnchorTextById[anchorId]
      if (displayText) {
        const exact = headings.find(
          (h) =>
            this.normalizeText(h.textContent) ===
            this.normalizeText(displayText)
        )
        if (exact) {
          exact.id = anchorId
          console.log(
            `[Accordion] Found anchor by exact text and assigned ID: #${anchorId}`
          )
          return exact
        }
      }

      const keywords = this.tab2AnchorKeywordsById[anchorId]
      if (keywords && keywords.length) {
        const kwMatch = headings.find((h) =>
          this.headingMatchesKeywords(h.textContent, keywords)
        )
        if (kwMatch) {
          kwMatch.id = anchorId
          console.log(
            `[Accordion] Found anchor by keywords and assigned ID: #${anchorId}`
          )
          return kwMatch
        }
      }

      console.warn(
        '[Accordion] Could not resolve anchor element from headings',
        {
          anchorId,
          displayText,
          keywords,
          headingsCount: headings.length,
        }
      )
      return null
    }
    // --- End Utilities ---

    // --- Public API for scroll tuning ---
    setTab2ScrollOptions(options) {
      if (!options || typeof options !== 'object') return
      const { durationMs, easing } = options
      if (typeof durationMs === 'number' && durationMs >= 0) {
        this.tab2Scroll.durationMs = durationMs
      }
      if (typeof easing === 'string' && easing.trim()) {
        this.tab2Scroll.easing = easing
      }
      console.log('[Accordion] Updated Tab 2 scroll options:', this.tab2Scroll)
    }

    setTab3ScrollOptions(options) {
      if (!options || typeof options !== 'object') return
      const { durationMs, easing } = options
      if (typeof durationMs === 'number' && durationMs >= 0) {
        this.tab3Scroll.durationMs = durationMs
      }
      if (typeof easing === 'string' && easing.trim()) {
        this.tab3Scroll.easing = easing
      }
      console.log('[Accordion] Updated Tab 3 scroll options:', this.tab3Scroll)
    }
    // --- End Public API ---
  }

  const accordions = document.querySelectorAll('.ayw-accordion-wrapper')
  // Ensure only one instance if multiple wrappers exist but we need a single controller point
  if (accordions.length > 0) {
    const instance = new Accordion(accordions[0]) // Initialize only the first one found
    // Expose minimal API for tuning from console or other modules
    window.aywAccordionSetTab2Scroll = (opts) =>
      instance.setTab2ScrollOptions(opts)
    window.aywAccordionSetTab3Scroll = (opts) =>
      instance.setTab3ScrollOptions(opts)
    if (accordions.length > 1) {
      console.warn(
        'Multiple .ayw-accordion-wrapper elements found. Only initializing the first one for navigation control.'
      )
    }
  }
}

export default initAccordionAYW
