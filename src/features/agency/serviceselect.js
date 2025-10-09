// At the top of the file, after any existing imports (assuming GSAP core is imported elsewhere, add these for plugins)
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'

gsap.registerPlugin(Draggable, InertiaPlugin)

// Modal Controller for hash-based modal loading
class AgencyModalController {
  constructor() {
    console.log('🎯 [CONSTRUCTOR] AgencyModalController constructor called')
    this.modals = new Map()
    console.log('🎯 [CONSTRUCTOR] Created modals Map, calling init()')
    this.init()
    console.log('🎯 [CONSTRUCTOR] AgencyModalController constructor completed')
  }

  init() {
    console.log('🔧 [MODAL] AgencyModalController init() called...')

    // Register modals
    this.registerModals()

    // Listen for hash changes (only if not already listening)
    if (!this.hashListenerAdded) {
      window.addEventListener('hashchange', this.handleHashChange.bind(this))
      this.hashListenerAdded = true
      console.log('🔧 [MODAL] Hash change event listener added')
    }

    // Check initial hash on page load
    console.log('🔧 [MODAL] Checking initial hash:', window.location.hash)
    this.handleHashChange()

    // Handle close button clicks
    this.setupCloseButtons()

    // Setup click outside to close functionality
    this.setupClickOutsideToClose()

    // Setup modal trigger buttons to prevent page reload
    this.setupModalTriggers()
  }

  registerModals() {
    let agencyModals = document.querySelector('#agencyModals')

    if (!agencyModals) {
      console.warn(
        '🔧 [MODAL] #agencyModals not found, searching for alternative...'
      )
      // Try to find alternative container
      const modalFrame = document.querySelector('.services-modal-framewrap')
      if (modalFrame) {
        agencyModals = modalFrame.parentElement
        console.log('🔧 [MODAL] Using alternative modal container')
      }
    }

    if (!agencyModals) {
      console.error(
        '❌ [MODAL] No modal container found. Modals will not work.'
      )
      return
    }

    this.processModalFrames(agencyModals)
  }

  processModalFrames(container) {
    // Look for modals by their IDs
    const sfModal = document.querySelector('#sfModal')
    const msModal = document.querySelector('#msModal')

    console.log('🔧 [MODAL] Looking for modals by ID...')

    // Initialize modals as hidden
    if (sfModal) {
      this.modals.set('sfModal', {
        element: sfModal,
        container: container,
      })
      sfModal.classList.add('non')
      console.log('✅ [MODAL] Registered sfModal')
    }

    if (msModal) {
      this.modals.set('msModal', {
        element: msModal,
        container: container,
      })
      msModal.classList.add('non')
      console.log('✅ [MODAL] Registered msModal')
    }

    if (this.modals.size === 0) {
      console.error(
        '❌ [MODAL] No modals found! Make sure elements have IDs #sfModal and #msModal'
      )
    } else {
      console.log(
        `✅ [MODAL] Registered ${this.modals.size} modals: ${Array.from(
          this.modals.keys()
        ).join(', ')}`
      )
    }
  }

  handleHashChange(event) {
    const hash = window.location.hash.substring(1) // Remove #

    console.log(`🔧 [MODAL] Hash changed to: ${hash || '(empty)'}`)

    if (!hash) {
      this.closeAllModals()
      return
    }

    // Check if hash matches a registered modal
    if (this.modals.has(hash)) {
      console.log(`✅ [MODAL] Opening modal: ${hash}`)
      const { element, container } = this.modals.get(hash)
      this.openModal(element, container)
    } else {
      console.warn(
        `⚠️ [MODAL] Hash "${hash}" doesn't match any registered modal. Available: ${Array.from(
          this.modals.keys()
        ).join(', ')}`
      )
    }
  }

  openModal(element, container) {
    if (!element || !container) {
      console.error(
        '❌ [MODAL] Cannot open modal - missing element or container'
      )
      return
    }

    // Show modal overlay by removing .non class from container
    container.classList.remove('non')

    // Hide all modal frames first
    this.modals.forEach(({ element: otherElement }) => {
      otherElement.classList.add('non')
    })

    // Show the target modal frame
    element.classList.remove('non')

    console.log('✅ [MODAL] Modal opened successfully')
  }

  closeModal(container) {
    if (!container) return

    // Hide modal overlay
    container.classList.add('non')

    // Hide all modal frames
    this.modals.forEach(({ element }) => {
      element.classList.add('non')
    })

    // Clear hash
    window.location.hash = ''

    console.log('✅ [MODAL] Modal closed')
  }

  closeAllModals() {
    // Find the modal container
    let container = null

    // Try to get from registered modals
    if (this.modals.size > 0) {
      const firstModal = this.modals.values().next().value
      container = firstModal?.container
    }

    // Fallback: try to find by selector
    if (!container) {
      container = document.querySelector('#agencyModals')
    }

    if (container) {
      this.closeModal(container)
    } else {
      console.warn('⚠️ [MODAL] No container found, closing modals directly')
      // Fallback: directly hide all modal frames
      this.modals.forEach(({ element }) => {
        element?.classList.add('non')
      })
      window.location.hash = ''
    }
  }

  setupCloseButtons() {
    const closeButtons = document.querySelectorAll('#closeAgencyModal')
    closeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.closeAllModals()
      })
    })
    console.log(`✅ [MODAL] Setup ${closeButtons.length} close buttons`)
  }

  setupClickOutsideToClose() {
    // Find the modal container
    const agencyModals = document.querySelector('#agencyModals')

    if (!agencyModals) {
      console.warn(
        '⚠️ [MODAL] #agencyModals container not found for click-outside-to-close functionality'
      )
      return
    }

    // Add click event listener to the modal container
    agencyModals.addEventListener('click', (event) => {
      // Check if the click is on the container itself (not on the modal content)
      if (event.target === agencyModals) {
        console.log('🖱️ [MODAL] Clicked outside modal content, closing modal')
        this.closeAllModals()
        return
      }

      // Check if the click is outside the modal content but within the container
      const modalContent = event.target.closest('#msModal, #sfModal')
      if (!modalContent) {
        // Click is outside both modal elements but within the container
        console.log('🖱️ [MODAL] Clicked outside modal elements, closing modal')
        this.closeAllModals()
      }
    })

    console.log(
      '✅ [MODAL] Click-outside-to-close functionality setup complete'
    )
  }

  // Setup modal trigger buttons to prevent page reload
  setupModalTriggers() {
    console.log('🔧 [MODAL] Setting up modal trigger buttons...')

    // Find all buttons that should trigger modals
    const modalTriggers = document.querySelectorAll(
      'a[href*="#msModal"], a[href*="#sfModal"]'
    )
    console.log(
      `🔧 [MODAL] Found ${modalTriggers.length} modal trigger buttons`
    )

    modalTriggers.forEach((trigger, index) => {
      const href = trigger.getAttribute('href')

      if (!href) return

      let hash = null

      // Extract hash from URL (handle both absolute and relative URLs)
      if (href.includes('#')) {
        const hashMatch = href.match(/#(.+)$/)
        if (hashMatch) {
          hash = hashMatch[1]
        }
      }

      if (hash) {
        console.log(`🔧 [MODAL] Setting up trigger ${index} for hash: ${hash}`)

        // Add click handler to prevent page navigation and just change hash
        trigger.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()

          console.log(`🔧 [MODAL] Button clicked, opening modal: ${hash}`)

          // Update the hash to trigger the modal
          window.location.hash = hash
        })
      }
    })
  }
}

function initServiceSelect() {
  console.log('🚀 [INIT] initServiceSelect function called')

  // Add global error handler to catch async errors
  window.addEventListener('error', function (event) {
    console.error('🚨 [ERROR] Caught error:', event.error)
    // Don't prevent default - let other handlers also see the error
  })

  // Add unhandled promise rejection handler
  window.addEventListener('unhandledrejection', function (event) {
    console.error('🚨 [ERROR] Unhandled promise rejection:', event.reason)
    // Prevent the error from showing in console (we've already logged it)
    event.preventDefault()
  })

  // Prevent re-initialization of the modal controller
  if (window.agencyModalControllerInitialized) {
    console.log('🚀 [INIT] Modal controller already initialized, skipping')
    return
  }
  window.agencyModalControllerInitialized = true
  console.log('🚀 [INIT] Set modal controller initialization flag')

  // FIX: Ensure DOM is ready before initializing
  function initializeModalControllerWhenReady() {
    console.log(
      '🔧 [FIX] Checking if DOM is ready for modal controller initialization...'
    )
    console.log('🔧 [DEBUG] Document ready state:', document.readyState)
    console.log('🔧 [DEBUG] Current URL:', window.location.href)
    console.log('🔧 [DEBUG] Current hash:', window.location.hash)

    // Check if the modal container exists
    const agencyModals = document.querySelector('#agencyModals')
    console.log('🔧 [DEBUG] #agencyModals element:', agencyModals)

    if (!agencyModals) {
      console.log(
        '🔧 [FIX] #agencyModals not found, checking for alternatives...'
      )

      // Check if we can find any modal-related elements
      const modalFrames = document.querySelectorAll('.services-modal-framewrap')
      console.log(
        '🔧 [DEBUG] Found modal frames:',
        modalFrames.length,
        modalFrames
      )

      if (modalFrames.length > 0) {
        console.log(
          '🔧 [FIX] Found modal frames, proceeding with initialization...'
        )
        try {
          console.log('🚀 [INIT] Creating new AgencyModalController...')
          window.agencyModalController = new AgencyModalController()
          console.log('🚀 [INIT] AgencyModalController created successfully')
          console.log(
            '🚀 [INIT] Modal controller available globally:',
            window.agencyModalController
          )

          // Verify the modal controller was properly initialized
          if (
            window.agencyModalController &&
            window.agencyModalController.modals
          ) {
            console.log('🚀 [INIT] Modal controller verification passed')
          } else {
            console.warn('🚀 [WARNING] Modal controller verification failed')
          }

          return
        } catch (error) {
          console.error(
            '🚀 [ERROR] Failed to create AgencyModalController:',
            error
          )

          // Try to continue with a minimal modal controller
          try {
            console.log(
              '🚀 [INIT] Attempting to create minimal modal controller...'
            )
            window.agencyModalController = {
              modals: new Map(),
              init: function () {
                console.log('🚀 [INIT] Minimal modal controller initialized')
                // Try to find modals
                const modalFrames = document.querySelectorAll(
                  '.services-modal-framewrap'
                )
                if (modalFrames.length > 0) {
                  console.log(
                    `🚀 [INIT] Found ${modalFrames.length} modal frames with minimal controller`
                  )
                  // Register the first modal as sfModal
                  this.modals.set('sfModal', { element: modalFrames[0] })
                  // Register the second modal as msModal if it exists
                  if (modalFrames.length > 1) {
                    this.modals.set('msModal', { element: modalFrames[1] })
                  }
                }
              },
            }
            window.agencyModalController.init()
            console.log(
              '🚀 [INIT] Minimal modal controller created successfully'
            )
          } catch (fallbackError) {
            console.error(
              '🚀 [ERROR] Failed to create even minimal modal controller:',
              fallbackError
            )
          }

          return
        }
      }

      // Try a few more attempts with increasing delays
      console.log('🔧 [FIX] Scheduling retry in 200ms...')
      setTimeout(initializeModalControllerWhenReady, 200)
      return
    }

    console.log('🔧 [FIX] DOM ready, initializing modal controller...')
    // Initialize Modal Controller and make it globally accessible
    try {
      console.log(
        '🚀 [INIT] Creating new AgencyModalController with primary container...'
      )
      window.agencyModalController = new AgencyModalController()
      console.log('🚀 [INIT] AgencyModalController created successfully')
      console.log(
        '🚀 [INIT] Modal controller available globally:',
        window.agencyModalController
      )
    } catch (error) {
      console.error('🚀 [ERROR] Failed to create AgencyModalController:', error)
    }
  }

  // Start modal controller initialization
  console.log('🚀 [INIT] Starting modal controller initialization...')
  console.log(
    '🚀 [DEBUG] Document ready state before check:',
    document.readyState
  )

  if (document.readyState === 'loading') {
    console.log(
      '🚀 [INIT] Document still loading, adding DOMContentLoaded listener'
    )
    document.addEventListener(
      'DOMContentLoaded',
      initializeModalControllerWhenReady
    )
  } else {
    console.log('🚀 [INIT] Document already loaded, initializing immediately')
    initializeModalControllerWhenReady()
  }

  // --- Configuration ---
  const config = {
    triggerEvent: 'mouseover', // 'click' or 'mouseover'
    animationSpeed: 0.44, // Duration in seconds (e.g., 0.75)
    easingType: 'expo.inOut', // GSAP easing string (e.g., 'power2.inOut', 'expo.inOut')
    useAnimationLock: true, // Add this line: true = block events during animation, false = allow
  }
  console.log('⚙️ Accordion Config:', config) // Log the config being used

  const collapsedWidths = {
    desktop: '14svw',
    tablet: '28svw',
    mobileHorizontal: '28svw',
    mobileVertical: '55svw',
  }

  const expandedContentWidths = {
    desktop: '60svw',
    tablet: '33svw',
    mobileHorizontal: '40svw',
    mobileVertical: '55svw',
  }

  const expandedPanelWidths = {
    desktop: '60svw',
    tablet: '33svw',
    mobileHorizontal: '40svw',
    mobileVertical: '55svw',
  }

  const getCollapsedWidth = () => {
    if (window.matchMedia('(max-width: 430px)').matches) {
      return collapsedWidths.mobileVertical
    }

    if (window.matchMedia('(max-width: 568px)').matches) {
      return collapsedWidths.mobileHorizontal
    }

    if (window.matchMedia('(max-width: 768px)').matches) {
      return collapsedWidths.tablet
    }

    return collapsedWidths.desktop
  }

  const getExpandedContentWidth = () => {
    if (window.matchMedia('(max-width: 430px)').matches) {
      return expandedContentWidths.mobileVertical
    }

    if (window.matchMedia('(max-width: 568px)').matches) {
      return expandedContentWidths.mobileHorizontal
    }

    if (window.matchMedia('(max-width: 768px)').matches) {
      return expandedContentWidths.tablet
    }

    return expandedContentWidths.desktop
  }

  const getExpandedPanelWidth = () => {
    if (window.matchMedia('(max-width:430px)').matches) {
      return expandedPanelWidths.mobileVertical
    }

    if (window.matchMedia('(max-width: 568px)').matches) {
      return expandedPanelWidths.mobileHorizontal
    }

    if (window.matchMedia('(max-width: 768px)').matches) {
      return expandedPanelWidths.tablet
    }

    return expandedPanelWidths.desktop
  }

  const applyCollapsedDimensions = (panel) => {
    if (!panel) {
      return
    }

    const collapsedWidth = getCollapsedWidth()
    gsap.set(panel, {
      width: collapsedWidth,
      overflow: 'hidden',
    })
    console.log(`⚓ Collapsed panel width applied: ${collapsedWidth}`)
  }

  const applyExpandedContentDimensions = (
    contentEl,
    width = getExpandedContentWidth()
  ) => {
    if (!contentEl) {
      return
    }

    gsap.set(contentEl, {
      width,
    })
    console.log(`⚓ Expanded content width applied: ${width}`)
  }

  const applyExpandedPanelDimensions = (
    panel,
    width = getExpandedPanelWidth()
  ) => {
    if (!panel) {
      return
    }

    gsap.set(panel, {
      width,
      overflow: 'visible',
    })
    console.log(`⚓ Expanded panel width applied: ${width}`)
  }

  const mobileVerticalMediaQuery = window.matchMedia(
    '(max-width: 430px) and (orientation: portrait)'
  )
  let currentMode = mobileVerticalMediaQuery.matches ? 'draggable' : 'accordion'
  let draggableInstance = null
  let snapPoints = []
  let currentSlide = 0
  let isAnimating = false // Hoist for scope access in all modes (expand/collapse)

  console.log(`🚀 Initializing in ${currentMode} mode`)

  const panels = gsap.utils.toArray('.accordion-panel') // Hoist for both modes (accordion uses querySelectorAll, but utils.toArray is equivalent/safer)

  if (mobileVerticalMediaQuery.matches) {
    const outerWrap = document.querySelector('.accordion-collection-list-wrap')
    console.log('Outer wrap (static track):', outerWrap)
    if (outerWrap) {
      gsap.set(outerWrap, {
        position: 'relative',
      })
    }

    let container = document.querySelector('.collection-list-services')
    if (!container) {
      // Dynamic fallback: parent of first panel
      const firstPanel = document.querySelector('.accordion-panel')
      container = firstPanel ? firstPanel.parentNode : null
    }
    console.log('Draggable target (inner group):', container)
    if (!container) {
      console.warn(
        'No inner container found for Draggable - falling back to accordion'
      )
      currentMode = 'accordion'
    } else if (panels.length) {
      console.log('Panels for draggable:', panels.length)
      // Reset all panels to collapsed state (using local functions)
      panels.forEach((panel) => {
        panel.classList.add('collapsed')
        applyCollapsedDimensions(panel)
        const panelContent = panel.querySelector('.panel-content')
        const panelCover = panel.querySelector('.panel-cover')
        if (panelContent) {
          applyExpandedContentDimensions(panelContent)
          gsap.set(panelContent, { opacity: 0, scale: 0.7 })
          panelContent.classList.remove('active')
        }
        if (panelCover) {
          gsap.set(panelCover, { opacity: 1, pointerEvents: 'auto' })
        }
      })

      // Prevent interference
      gsap.set(panels, { pointerEvents: 'none' })

      // Container (inner group): drag-ready
      gsap.set(container, {
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        overflow: 'visible', // Allow peeks within outer hidden
        width: 'auto', // Let panels dictate
        height: '66svh',
      })

      // Parse svw to numeric for snaps (e.g., '33svw' -> 33/100 * innerWidth ~123px on 375px : UPDATE TO 430px)
      const rawWidth = getExpandedPanelWidth() // '33svw'
      const svwValue = parseFloat(rawWidth.replace('svw', '')) || 33 // Numeric 33
      const panelNum = (svwValue / 100) * window.innerWidth // ~123px
      const viewportWidth = window.innerWidth
      const offset = (viewportWidth - panelNum) / 2 // ~126px for centering peeks
      console.log('Center offset for peeks:', offset)
      console.log('Parsed panel width (svw to px):', panelNum)

      // Panels: svw flex for peeks, no extra margins
      gsap.set(panels, {
        flex: `0 0 ${rawWidth}`, // Keep string for CSS consistency
        margin: 0,
        padding: 0,
      })

      // Define onResize and getSlideIndexAt before Draggable
      let snapPoints = []
      const getSlideIndexAt = (x) =>
        snapPoints.indexOf(gsap.utils.snap(snapPoints, x))

      function onResize() {
        if (!draggableInstance) {
          console.log('Draggable not ready - skipping onResize')
          return
        }
        const centerX = window.innerWidth / 2
        snapPoints = panels.map((el) => {
          const bounds = el.getBoundingClientRect()
          return (
            centerX - (bounds.left + bounds.width / 2) + draggableInstance.x
          )
        })
        console.log('Dynamic snap points (rect-based):', snapPoints)
        draggableInstance.applyBounds({
          minX: snapPoints[snapPoints.length - 1],
          maxX: snapPoints[0],
        })
      }

      // Pre-expansion onResize (collapsed bounds)
      onResize()
      gsap.set(container, { x: snapPoints[0] })
      console.log('Pre-expand x set to first center:', snapPoints[0])

      // Draggable.create (unchanged)
      draggableInstance = Draggable.create(container, {
        type: 'x',
        trigger: container,
        inertia: true,
        resistance: 1,
        overDrag: true,
        snap: {
          x: (value) => gsap.utils.snap(snapPoints, value, panelNum * 0.3),
        },
        edgeResistance: 0.65,
        onDragStart: () => console.log('🖱️ Drag started!'),
        onDrag: () => console.log('Dragging, x:', draggableInstance.x),
        onDragEnd: function () {
          console.log('🖱️ Drag ended, endX:', this.endX)
          updateSlide(this.endX)
        },
        onThrowComplete: function () {
          console.log('🖱️ Throw complete, final x:', this.x)
          updateSlide(this.x)
        },
      })[0]

      console.log('🖱️ Draggable initialized (dynamic snap)')

      // Initial expand with callback for post-animation recalc
      const initialTimeline = expandPanel(panels[0])
      if (initialTimeline) {
        initialTimeline.eventCallback('onComplete', () => {
          onResize() // Recalc with expanded rects
          // NEW: Adjust x to new snapPoints[0] to center expanded panel 0
          gsap.set(container, { x: snapPoints[0] })
          console.log('Post-expand: Centered container x to', snapPoints[0])
          updateSlide(snapPoints[0]) // Lock expansion on final center
          console.log('Post-expand onResize complete - locked on panel 0')

          // Remove .init class from #panel-1 after draggable initialization
          const panel1 = document.querySelector('#panel-1')
          if (panel1 && panel1.classList.contains('init')) {
            panel1.classList.remove('init')
            console.log(
              '🎯 Removed .init class from #panel-1 after draggable initialization'
            )
          }
        })
      } else {
        // Fallback if no timeline (direct set)
        gsap.set(panels[0], { className: '-=collapsed' }) // Manual if needed
        gsap.delayedCall(0.6, () => {
          onResize()
          // NEW: Adjust x to new snapPoints[0] in fallback
          gsap.set(container, { x: snapPoints[0] })
          console.log('Fallback: Centered container x to', snapPoints[0])
          updateSlide(snapPoints[0])
          console.log('Fallback delayed recalc - locked on panel 0')

          // Remove .init class from #panel-1 after draggable initialization (fallback)
          const panel1 = document.querySelector('#panel-1')
          if (panel1 && panel1.classList.contains('init')) {
            panel1.classList.remove('init')
            console.log(
              '🎯 Removed .init class from #panel-1 after draggable initialization (fallback)'
            )
          }
        })
      }
      panels[0].classList.remove('collapsed')
      currentSlide = 0

      // Add listener (unchanged)
      const resizeHandler = () => onResize()
      window.addEventListener('resize', resizeHandler)

      // Update updateSlide (like reference, with expand/collapse):
      function updateSlide(x) {
        const newSlide = getSlideIndexAt(x)
        console.log(
          'getSlideIndexAt endX:',
          x,
          'newSlide:',
          newSlide,
          'current:',
          currentSlide
        )
        if (
          newSlide !== currentSlide &&
          newSlide >= 0 &&
          newSlide < panels.length
        ) {
          if (isAnimating) isAnimating = false
          collapsePanel(panels[currentSlide])
          panels[currentSlide].classList.add('collapsed')

          expandPanel(panels[newSlide])
          panels[newSlide].classList.remove('collapsed')
          currentSlide = newSlide

          console.log(`🔄 Switched to slide ${newSlide} (dynamic center)`)
        } else {
          console.log('No slide change - staying on', currentSlide)
          // NEW: Fallback snap if on same slide but x deviated (e.g., post-resize/expansion)
          if (Math.abs(draggableInstance.x - snapPoints[currentSlide]) > 1) {
            gsap.set(container, { x: snapPoints[currentSlide] })
            console.log(
              `🔧 Auto-snapped to current slide ${currentSlide} center`
            )
          }
        }
      }
    } else {
      console.warn('No panels for Draggable')
    }

    // updateSlide with parsed snap
    function updateSlide(x) {
      if (!snapPoints.length || !panels.length) {
        console.log('No snap points/panels - skipping update')
        return
      }
      const rawRound = Math.round((-x + offset) / panelNum) // Offset-adjusted round
      const tolerance = panelNum * 0.3 // Wider for peeks
      const newSlide = Math.max(0, Math.min(panels.length - 1, rawRound)) // Clamp 0 to 2
      const distance = Math.abs(x - snapPoints[newSlide])
      console.log(
        'Offset-adjusted round:',
        rawRound,
        'newSlide:',
        newSlide,
        'distance:',
        distance.toFixed(1),
        'tolerance:',
        tolerance
      )
      if (newSlide !== currentSlide && distance <= tolerance) {
        if (isAnimating) isAnimating = false
        collapsePanel(panels[currentSlide])
        panels[currentSlide].classList.add('collapsed')

        expandPanel(panels[newSlide])
        panels[newSlide].classList.remove('collapsed')
        currentSlide = newSlide

        console.log(
          `🔄 Switched to slide ${newSlide} (centered, dist:${distance.toFixed(
            1
          )})`
        )
        gsap.to(container, {
          x: snapPoints[newSlide],
          duration: 0.15,
          ease: 'power2.out',
        })
      } else {
        console.log(
          'No center match - staying on',
          currentSlide,
          distance > tolerance ? '(too far)' : '(same)'
        )
        // NEW: Fallback snap if on same slide but x deviated
        if (Math.abs(draggableInstance.x - snapPoints[currentSlide]) > 1) {
          gsap.set(container, { x: snapPoints[currentSlide] })
          console.log(
            `🔧 Auto-snapped to current slide ${currentSlide} center (offset version)`
          )
        }
      }
    }
    return
  }

  // Add animation lock flag
  // Only proceed if we have panels
  if (!panels.length) {
    console.log('No accordion panels found - skipping initialization')
    return
  }

  console.log('🚀 Initializing Service Select Accordion...')
  // Set initial collapsed panel sizes using GSAP
  setupInitialState()

  // Add event listener based on config
  panels.forEach((panel, index) => {
    panel.addEventListener(config.triggerEvent, () => {
      // Log based on the actual trigger event being used
      console.log(`🖱️ Panel ${index} triggered via ${config.triggerEvent}.`)
      // Don't do anything if animation is in progress (and lock is enabled) or if triggered panel is already expanded
      if (config.useAnimationLock && isAnimating) {
        console.log(
          ` L O C K E D: Animation in progress, ${config.triggerEvent} ignored.`
        )
        return
      }
      if (!panel.classList.contains('collapsed')) {
        // console.log(` L O C K E D: Triggered panel is already expanded, ${config.triggerEvent} ignored.`);
        return
      }

      // Set animation lock if enabled
      if (config.useAnimationLock) {
        console.log('🟢 Animation Lock Engaged.')
        isAnimating = true
      }

      // Find the currently expanded panel
      const expandedPanel = document.querySelector(
        '.accordion-panel:not(.collapsed)'
      )
      console.log('🔍 Found expanded panel:', expandedPanel)

      // Collapse the expanded panel
      console.log('🎬 Starting collapse process for:', expandedPanel)
      collapsePanel(expandedPanel)

      // Expand the triggered panel
      console.log(`🎬 Starting expand process for Panel ${index}:`, panel)
      expandPanel(panel)
    })

    // NOTE: If config.triggerEvent is 'mouseover', the note about
    // no automatic 'mouseout' collapse still applies.
  })

  // Function to set up initial state - reworked for Collection List
  function setupInitialState() {
    console.log('🛠️ Setting up initial state...')
    // Since all items have the same classes from Webflow Collection List,
    // we need to programmatically set up initial states

    // Make sure all panels except first are collapsed initially
    panels.forEach((panel, index) => {
      console.log(`-- Initializing Panel ${index} --`)
      // Find potential content and cover elements within the panel
      const panelContent = panel.querySelector('.panel-content')
      const panelCover = panel.querySelector('.panel-cover')

      if (index === 0) {
        // First panel should be expanded
        panel.classList.remove('collapsed')
        console.log(` P${index}: Removed .collapsed`)
        // Ensure expanded panel has correct styling
        applyExpandedPanelDimensions(panel)

        // Make sure content is visible and active
        if (panelContent) {
          applyExpandedContentDimensions(panelContent)
          gsap.set(panelContent, {
            opacity: 1,
            scale: 1, // Adjusted scale for consistency
          })
          console.log(` P${index} Content: GSAP set opacity: 1, scale: 1`)
          panelContent.classList.add('active') // Add active class
          console.log(` P${index} Content: Added .active`)
        }
        // Make sure cover is inactive (hidden and unclickable)
        if (panelCover) {
          gsap.set(panelCover, {
            opacity: 0,
            pointerEvents: 'none',
          })
          console.log(
            ` P${index} Cover: GSAP set opacity: 0, pointerEvents: none`
          )
        }
      } else {
        // All other panels should be collapsed
        panel.classList.add('collapsed')
        console.log(` P${index}: Added .collapsed`)
        // Apply collapsed styling
        applyCollapsedDimensions(panel)

        // Make sure content is styled appropriately and inactive
        if (panelContent) {
          applyExpandedContentDimensions(panelContent)
          gsap.set(panelContent, {
            opacity: 0,
            scale: 0.7,
          })
          // Note: Log message below had wrong opacity, corrected if needed, but keeping as is from original
          console.log(` P${index} Content: GSAP set opacity: 0.1, scale: 0.7`)
          panelContent.classList.remove('active') // Remove active class
          console.log(` P${index} Content: Removed .active`)
        }
        // Make sure cover is active (visible and clickable)
        if (panelCover) {
          gsap.set(panelCover, {
            opacity: 1,
            pointerEvents: 'auto',
          })
          console.log(
            ` P${index} Cover: GSAP set opacity: 1, pointerEvents: auto`
          )
        }
      }
    })
    console.log('✅ Initial state setup complete.')

    // Remove .init class from #panel-1 after accordion is fully initialized (only on initial page load)
    const panel1 = document.querySelector('#panel-1')
    if (panel1 && panel1.classList.contains('init')) {
      panel1.classList.remove('init')
      console.log(
        '🎯 Removed .init class from #panel-1 after accordion initialization'
      )
    }
  }

  // Function to collapse a panel with animation
  function collapsePanel(panel) {
    if (!panel) {
      console.log('💨 CollapsePanel: No panel provided, skipping.')
      // If no panel is expanded after this attempt, potentially release the lock
      if (!document.querySelector('.accordion-panel:not(.collapsed)')) {
        if (config.useAnimationLock) {
          isAnimating = false
          console.log('🔴 Animation Lock Released (no panel to collapse).')
        }
      }
      return
    }
    console.log('💨 CollapsePanel: Starting collapse for', panel)

    const panelContent = panel.querySelector('.panel-content')
    const panelCover = panel.querySelector('.panel-cover')
    const collapsedWidth = getCollapsedWidth()
    const expandedContentWidth = getExpandedContentWidth()
    const expandedPanelWidth = getExpandedPanelWidth()

    if (panelContent) {
      applyExpandedContentDimensions(panelContent, expandedContentWidth)
      panelContent.classList.remove('active')
      console.log('💨 CollapsePanel Content: Removed .active')
    }
    // Removed panelCover.classList.add('active'); - now handled by GSAP
    // console.log('💨 CollapsePanel Cover: Added .active'); // Removed log

    console.log('💨 CollapsePanel: Creating GSAP timeline...')
    const timeline = gsap.timeline()

    // Animate panel width and overflow using fromTo:
    timeline.fromTo(
      panel,
      { width: expandedPanelWidth, overflow: 'visible' }, // Start from expanded state
      {
        width: collapsedWidth, // Animate to collapsed width
        overflow: 'hidden', // Animate overflow
        duration: config.animationSpeed, // Use config.animationSpeed
        ease: config.easingType, // Use config.easingType
        onComplete: () => {
          panel.classList.add('collapsed') // Add class AFTER animation
          console.log('🏁 CollapsePanel COMPLETED: Added .collapsed to', panel)
        },
      },
      0
    )

    // Animate panel content using fromTo:
    if (panelContent) {
      timeline.fromTo(
        panelContent,
        { opacity: 1, scale: 1 }, // Start from visible state
        {
          opacity: 0,
          scale: 0.7,
          duration: config.animationSpeed, // Use config.animationSpeed
          ease: config.easingType, // Use config.easingType
        },
        0
      )
    }

    // Animate panel cover to fade in and enable pointer events
    if (panelCover) {
      timeline.to(
        panelCover,
        {
          opacity: 1,
          pointerEvents: 'auto',
          duration: config.animationSpeed,
          ease: config.easingType,
        },
        0 // Start at the beginning of the timeline
      )
      console.log('💨 CollapsePanel Cover: GSAP fade in initiated.')
    }

    console.log('💨 CollapsePanel: GSAP fromTo timeline initiated.')
  }

  // Function to expand a panel with animation
  function expandPanel(panel) {
    if (!panel) {
      if (config.useAnimationLock) {
        isAnimating = false
        console.log('🔴 Animation Lock Released (no panel).')
      }
      return
    }
    console.log('팽 ExpandPanel: Starting expand for', panel)

    const panelContent = panel.querySelector('.panel-content')
    const panelCover = panel.querySelector('.panel-cover')
    const collapsedWidth = getCollapsedWidth()
    const expandedContentWidth = getExpandedContentWidth()
    const expandedPanelWidth = getExpandedPanelWidth()

    // Removed panelCover.classList.remove('active'); - now handled by GSAP
    // console.log('팽 ExpandPanel Cover: Removed .active'); // Removed log

    console.log('팽 ExpandPanel: Creating GSAP timeline...')
    const timeline = gsap.timeline({
      onComplete: () => {
        console.log('🏁 ExpandPanel Overall Timeline COMPLETED for', panel)
        if (config.useAnimationLock) {
          isAnimating = false // Release lock ONLY after all animations finish if enabled
          console.log('🔴 Animation Lock Released.')
        }
      },
    })

    // Animate panel width and overflow using fromTo:
    timeline.fromTo(
      panel,
      { width: collapsedWidth, overflow: 'hidden' }, // Start from collapsed state
      {
        width: expandedPanelWidth, // Animate to expanded width
        overflow: 'visible', // Animate overflow
        duration: config.animationSpeed, // Use config.animationSpeed
        ease: config.easingType, // Use config.easingType
        onComplete: () => {
          // Remove collapsed class ONLY after animation finishes
          panel.classList.remove('collapsed')
          console.log(
            '🏁 ExpandPanel Width Tween COMPLETED: Removed .collapsed from',
            panel
          )

          // Update active classes *after* width/overflow animation completes
          if (panelContent) {
            panelContent.classList.add('active')
            console.log('팽 ExpandPanel Content: Added .active')
          }
        },
      },
      0 // Start at time 0
    )

    // Animate panel content using fromTo:
    if (panelContent) {
      applyExpandedContentDimensions(panelContent, expandedContentWidth)
      timeline.fromTo(
        panelContent,
        { opacity: 0 }, // Start from hidden state
        {
          opacity: 1,
          scale: 1,
          duration: config.animationSpeed, // Use config.animationSpeed
          ease: config.easingType, // Use config.easingType
        },
        // Add a slight delay AFTER the width animation starts
        // Use a fraction of the animation speed for scalability, e.g., speed / 7.5
        config.animationSpeed / 7.5 // Adjusted delay based on speed
      )
    }

    // Animate panel cover to fade out and disable pointer events
    if (panelCover) {
      timeline.to(
        panelCover,
        {
          opacity: 0,
          pointerEvents: 'none',
          duration: config.animationSpeed,
          ease: config.easingType,
        },
        0 // Start at the beginning of the timeline
      )
      console.log('팽 ExpandPanel Cover: GSAP fade out initiated.')
    }

    console.log('팽 ExpandPanel: GSAP fromTo timeline initiated.')
    return timeline // Return the timeline for callback
  }

  let resizeRafId = null

  const handleResize = () => {
    if (resizeRafId) {
      cancelAnimationFrame(resizeRafId)
    }

    resizeRafId = requestAnimationFrame(() => {
      panels.forEach((panel) => {
        if (panel.classList.contains('collapsed')) {
          applyCollapsedDimensions(panel)
          const collapsedContent = panel.querySelector('.panel-content')
          applyExpandedContentDimensions(collapsedContent)
          return
        }

        applyExpandedPanelDimensions(panel)

        const expandedContent = panel.querySelector('.panel-content')
        applyExpandedContentDimensions(expandedContent)
      })

      // New: Check for mode switch
      const isNowMobileVertical = mobileVerticalMediaQuery.matches
      if (isNowMobileVertical !== (currentMode === 'draggable')) {
        console.log(
          `🔄 Switching to ${
            isNowMobileVertical ? 'draggable' : 'accordion'
          } mode`
        )
        if (currentMode === 'draggable' && draggableInstance) {
          // Teardown draggable
          draggableInstance.kill()
          draggableInstance = null
          snapPoints = []
          // Reset styles
          const container = document.querySelector('.collection-list-services')
          if (container) gsap.set(container, { clearProps: 'all' })
          gsap.set(panels, { clearProps: 'all' })
          gsap.set(panels, { pointerEvents: 'auto' }) // Restore on switch back
          // Reset to initial accordion state
          setupInitialState()
          // Re-add accordion listeners
          panels.forEach((panel, index) => {
            panel.addEventListener(config.triggerEvent, () => {
              if (config.useAnimationLock && isAnimating) {
                console.log(
                  ` L O C K E D: Animation in progress, ${config.triggerEvent} ignored.`
                )
                return
              }
              if (!panel.classList.contains('collapsed')) {
                return
              }
              if (config.useAnimationLock) {
                console.log('🟢 Animation Lock Engaged.')
                isAnimating = true
              }
              const expandedPanel = document.querySelector(
                '.accordion-panel:not(.collapsed)'
              )
              console.log('🔍 Found expanded panel:', expandedPanel)
              console.log('🎬 Starting collapse process for:', expandedPanel)
              collapsePanel(expandedPanel)
              console.log(
                `🎬 Starting expand process for Panel ${index}:`,
                panel
              )
              expandPanel(panel)
            })
          })
        } else if (isNowMobileVertical) {
          // Switch to draggable: remove accordion listeners first
          panels.forEach((panel) =>
            panel.removeEventListener(
              config.triggerEvent /* handler ref or anonymous, but for simplicity, reinitialize */
            )
          )
          // Inlined draggable init (scope access to local functions)
          let container =
            document.querySelector('.collection-list-services') ||
            document.querySelector(
              '[class*="collection-list"], .w-list-unstyled'
            )
          console.log('Container for draggable:', container)
          if (!container) {
            console.warn(
              'No container found for Draggable - falling back to accordion'
            )
            currentMode = 'accordion'
          } else {
            const panels = gsap.utils.toArray('.accordion-panel')
            console.log('Panels for draggable:', panels.length)
            if (!panels.length) {
              console.warn('No panels found for Draggable')
            } else {
              // Reset all panels to collapsed state (using local functions)
              panels.forEach((panel) => {
                panel.classList.add('collapsed')
                applyCollapsedDimensions(panel)
                const panelContent = panel.querySelector('.panel-content')
                const panelCover = panel.querySelector('.panel-cover')
                if (panelContent) {
                  applyExpandedContentDimensions(panelContent)
                  gsap.set(panelContent, { opacity: 0, scale: 0.7 })
                  panelContent.classList.remove('active')
                }
                if (panelCover) {
                  gsap.set(panelCover, { opacity: 1, pointerEvents: 'auto' })
                }
              })

              // Prevent child elements from interfering with drag
              gsap.set(panels, { pointerEvents: 'none' })

              // Set container and panels for horizontal drag
              gsap.set(container, {
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                overflow: 'hidden',
                width: '100%',
                height: '100%',
              })

              // Parse svw to numeric for snaps (e.g., '33svw' -> 33/100 * innerWidth ~123px on 375px : UPDATE TO 430px)
              const rawWidth = getExpandedPanelWidth() // '33svw'
              const svwValue = parseFloat(rawWidth.replace('svw', '')) || 33 // Numeric 33
              const panelNum = (svwValue / 100) * window.innerWidth // ~123px
              const viewportWidth = window.innerWidth
              const offset = (viewportWidth - panelNum) / 2 // ~126px for centering peeks
              console.log('Center offset for peeks:', offset)
              console.log('Parsed panel width (svw to px):', panelNum)

              // Panels: svw flex for peeks, no extra margins
              gsap.set(panels, {
                flex: `0 0 ${rawWidth}`, // Keep string for CSS consistency
                margin: 0,
                padding: 0,
              })

              let snapPoints = []
              const getSlideIndexAt = (x) =>
                snapPoints.indexOf(gsap.utils.snap(snapPoints, x))

              function onResize() {
                const centerX = window.innerWidth / 2
                snapPoints = panels.map((el) => {
                  const bounds = el.getBoundingClientRect()
                  return (
                    centerX -
                    (bounds.left + bounds.width / 2) +
                    draggableInstance.x
                  )
                })
                console.log('Dynamic snap points (rect-based):', snapPoints)
                if (draggableInstance) {
                  draggableInstance.applyBounds({
                    minX: snapPoints[snapPoints.length - 1],
                    maxX: snapPoints[0],
                  })
                }
              }

              // Call initial
              onResize()

              // Add listener (scoped)
              const resizeHandler = () => onResize()
              window.addEventListener('resize', resizeHandler)

              // Initial expand (no call to updateSlide yet)
              expandPanel(panels[0])
              panels[0].classList.remove('collapsed')
              currentSlide = 0

              // Remove .init class from #panel-1 after draggable mode switch initialization
              const panel1 = document.querySelector('#panel-1')
              if (panel1 && panel1.classList.contains('init')) {
                panel1.classList.remove('init')
                console.log(
                  '🎯 Removed .init class from #panel-1 after draggable mode switch'
                )
              }

              // Update Draggable onDragEnd (like reference):
              draggableInstance = Draggable.create(container, {
                type: 'x',
                trigger: container,
                inertia: true,
                resistance: 1,
                overDrag: true,
                snap: {
                  x: (value) =>
                    gsap.utils.snap(snapPoints, value, panelNum * 0.3),
                },
                edgeResistance: 0.65,
                onDragStart: () => console.log('🖱️ Drag started!'),
                onDrag: () => console.log('Dragging, x:', draggableInstance.x),
                onDragEnd: function () {
                  console.log('🖱️ Drag ended, endX:', this.endX)
                  updateSlide(this.endX)
                },
                onThrowComplete: function () {
                  console.log('🖱️ Throw complete, final x:', this.x)
                  updateSlide(this.x)
                },
              })[0]

              console.log('🖱️ Draggable initialized (dynamic snap)')

              // Update updateSlide (like reference, with expand/collapse):
              function updateSlide(x) {
                const newSlide = getSlideIndexAt(x)
                console.log(
                  'getSlideIndexAt endX:',
                  x,
                  'newSlide:',
                  newSlide,
                  'current:',
                  currentSlide
                )
                if (
                  newSlide !== currentSlide &&
                  newSlide >= 0 &&
                  newSlide < panels.length
                ) {
                  if (isAnimating) isAnimating = false
                  collapsePanel(panels[currentSlide])
                  panels[currentSlide].classList.add('collapsed')

                  expandPanel(panels[newSlide])
                  panels[newSlide].classList.remove('collapsed')
                  currentSlide = newSlide

                  console.log(
                    `🔄 Switched to slide ${newSlide} (dynamic center)`
                  )
                } else {
                  console.log('No slide change - staying on', currentSlide)
                  // NEW: Fallback snap if on same slide but x deviated (e.g., post-resize/expansion)
                  if (
                    Math.abs(draggableInstance.x - snapPoints[currentSlide]) > 1
                  ) {
                    gsap.set(container, { x: snapPoints[currentSlide] })
                    console.log(
                      `🔧 Auto-snapped to current slide ${currentSlide} center (resize reinitialize)`
                    )
                  }
                }
              }
            }
          }
          // Define updateSlide here (local scope)
          function updateSlide(x) {
            if (!snapPoints.length || !panels.length) {
              console.log('No snap points/panels - skipping update')
              return
            }
            const rawRound = Math.round((-x + offset) / panelNum) // Offset-adjusted round
            const tolerance = panelNum * 0.3 // Wider for peeks
            const newSlide = Math.max(0, Math.min(panels.length - 1, rawRound)) // Clamp 0 to 2
            const distance = Math.abs(x - snapPoints[newSlide])
            console.log(
              'Raw round:',
              rawRound,
              'clamped newSlide:',
              newSlide,
              'distance to snap:',
              distance,
              'tolerance:',
              tolerance
            )
            if (newSlide !== currentSlide && distance <= tolerance) {
              if (isAnimating) isAnimating = false
              collapsePanel(panels[currentSlide])
              panels[currentSlide].classList.add('collapsed')

              expandPanel(panels[newSlide])
              panels[newSlide].classList.remove('collapsed')
              currentSlide = newSlide

              console.log(
                `🔄 Switched to slide ${newSlide} (center match, dist:${distance.toFixed(
                  1
                )})`
              )
              gsap.to(container, {
                x: snapPoints[newSlide],
                duration: 0.15,
                ease: 'power2.out',
              })
            } else if (distance > tolerance) {
              console.log(
                'No close center match - staying on',
                currentSlide,
                ' (dist too far)'
              )
            } else {
              console.log('Same slide - no change')
            }
            // NEW: Fallback snap if on same slide but x deviated
            if (Math.abs(draggableInstance.x - snapPoints[currentSlide]) > 1) {
              gsap.set(container, { x: snapPoints[currentSlide] })
              console.log(
                `🔧 Auto-snapped to current slide ${currentSlide} center (offset version)`
              )
            }
          }
        }
        currentMode = isNowMobileVertical ? 'draggable' : 'accordion'
      }

      // Recompute snap points if in draggable mode
      if (currentMode === 'draggable' && draggableInstance) {
        computeSnapPoints()
      }
    })
  }

  window.addEventListener('resize', handleResize)
}

// FIX: Separate function to initialize accordion immediately (without DOM ready check)
function initializeAccordion() {
  // --- Configuration ---
  const config = {
    triggerEvent: 'mouseover', // 'click' or 'mouseover'
    animationSpeed: 0.44, // Duration in seconds (e.g., 0.75)
    easingType: 'expo.inOut', // GSAP easing string (e.g., 'power2.inOut', 'expo.inOut')
    useAnimationLock: true, // Add this line: true = block events during animation, false = allow
  }
  console.log('⚙️ Accordion Config:', config) // Log the config being used

  const collapsedWidths = {
    desktop: '14svw',
    tablet: '28svw',
    mobileHorizontal: '28svw',
    mobileVertical: '55svw',
  }

  const expandedContentWidths = {
    desktop: '60svw',
    tablet: '33svw',
    mobileHorizontal: '40svw',
    mobileVertical: '55svw',
  }

  const expandedPanelWidths = {
    desktop: '60svw',
    tablet: '33svw',
    mobileHorizontal: '40svw',
    mobileVertical: '55svw',
  }

  const getCollapsedWidth = () => {
    if (window.matchMedia('(max-width: 430px)').matches) {
      return collapsedWidths.mobileVertical
    }

    if (window.matchMedia('(max-width: 568px)').matches) {
      return collapsedWidths.mobileHorizontal
    }

    if (window.matchMedia('(max-width: 768px)').matches) {
      return collapsedWidths.tablet
    }

    return collapsedWidths.desktop
  }

  const getExpandedContentWidth = () => {
    if (window.matchMedia('(max-width: 430px)').matches) {
      return expandedContentWidths.mobileVertical
    }

    if (window.matchMedia('(max-width: 568px)').matches) {
      return expandedContentWidths.mobileHorizontal
    }

    if (window.matchMedia('(max-width: 768px)').matches) {
      return expandedContentWidths.tablet
    }

    return expandedContentWidths.desktop
  }

  const getExpandedPanelWidth = () => {
    if (window.matchMedia('(max-width:430px)').matches) {
      return expandedPanelWidths.mobileVertical
    }

    if (window.matchMedia('(max-width: 568px)').matches) {
      return expandedPanelWidths.mobileHorizontal
    }

    if (window.matchMedia('(max-width: 768px)').matches) {
      return expandedPanelWidths.tablet
    }

    return expandedPanelWidths.desktop
  }

  const applyCollapsedDimensions = (panel) => {
    if (!panel) {
      return
    }

    const collapsedWidth = getCollapsedWidth()
    gsap.set(panel, {
      width: collapsedWidth,
      overflow: 'hidden',
    })
    console.log(`⚓ Collapsed panel width applied: ${collapsedWidth}`)
  }

  const applyExpandedContentDimensions = (
    contentEl,
    width = getExpandedContentWidth()
  ) => {
    if (!contentEl) {
      return
    }

    gsap.set(contentEl, {
      width,
    })
    console.log(`⚓ Expanded content width applied: ${width}`)
  }

  const applyExpandedPanelDimensions = (
    panel,
    width = getExpandedPanelWidth()
  ) => {
    if (!panel) {
      return
    }

    gsap.set(panel, {
      width,
      overflow: 'visible',
    })
    console.log(`⚓ Expanded panel width applied: ${width}`)
  }

  const mobileVerticalMediaQuery = window.matchMedia(
    '(max-width: 430px) and (orientation: portrait)'
  )
  let currentMode = mobileVerticalMediaQuery.matches ? 'draggable' : 'accordion'
  let draggableInstance = null
  let snapPoints = []
  let currentSlide = 0
  let isAnimating = false // Hoist for scope access in all modes (expand/collapse)

  console.log(`🚀 Initializing in ${currentMode} mode`)

  const panels = gsap.utils.toArray('.accordion-panel') // Hoist for both modes (accordion uses querySelectorAll, but utils.toArray is equivalent/safer)

  if (mobileVerticalMediaQuery.matches) {
    const outerWrap = document.querySelector('.accordion-collection-list-wrap')
    console.log('Outer wrap (static track):', outerWrap)
    if (outerWrap) {
      gsap.set(outerWrap, {
        position: 'relative',
      })
    }

    let container = document.querySelector('.collection-list-services')
    if (!container) {
      // Dynamic fallback: parent of first panel
      const firstPanel = document.querySelector('.accordion-panel')
      container = firstPanel ? firstPanel.parentNode : null
    }
    console.log('Draggable target (inner group):', container)
    if (!container) {
      console.warn(
        'No inner container found for Draggable - falling back to accordion'
      )
      currentMode = 'accordion'
    } else if (panels.length) {
      console.log('Panels for draggable:', panels.length)
      // Reset all panels to collapsed state (using local functions)
      panels.forEach((panel) => {
        panel.classList.add('collapsed')
        applyCollapsedDimensions(panel)
        const panelContent = panel.querySelector('.panel-content')
        const panelCover = panel.querySelector('.panel-cover')
        if (panelContent) {
          applyExpandedContentDimensions(panelContent)
          gsap.set(panelContent, { opacity: 0, scale: 0.7 })
          panelContent.classList.remove('active')
        }
        if (panelCover) {
          gsap.set(panelCover, { opacity: 1, pointerEvents: 'auto' })
        }
      })

      // Prevent interference
      gsap.set(panels, { pointerEvents: 'none' })

      // Container (inner group): drag-ready
      gsap.set(container, {
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        overflow: 'visible', // Allow peeks within outer hidden
        width: 'auto', // Let panels dictate
        height: '66svh',
      })

      // Parse svw to numeric for snaps (e.g., '33svw' -> 33/100 * innerWidth ~123px on 375px : UPDATE TO 430px)
      const rawWidth = getExpandedPanelWidth() // '33svw'
      const svwValue = parseFloat(rawWidth.replace('svw', '')) || 33 // Numeric 33
      const panelNum = (svwValue / 100) * window.innerWidth // ~123px
      const viewportWidth = window.innerWidth
      const offset = (viewportWidth - panelNum) / 2 // ~126px for centering peeks
      console.log('Center offset for peeks:', offset)
      console.log('Parsed panel width (svw to px):', panelNum)

      // Panels: svw flex for peeks, no extra margins
      gsap.set(panels, {
        flex: `0 0 ${rawWidth}`, // Keep string for CSS consistency
        margin: 0,
        padding: 0,
      })

      // Define onResize and getSlideIndexAt before Draggable
      let snapPoints = []
      const getSlideIndexAt = (x) =>
        snapPoints.indexOf(gsap.utils.snap(snapPoints, x))

      function onResize() {
        if (!draggableInstance) {
          console.log('Draggable not ready - skipping onResize')
          return
        }
        const centerX = window.innerWidth / 2
        snapPoints = panels.map((el) => {
          const bounds = el.getBoundingClientRect()
          return (
            centerX - (bounds.left + bounds.width / 2) + draggableInstance.x
          )
        })
        console.log('Dynamic snap points (rect-based):', snapPoints)
        draggableInstance.applyBounds({
          minX: snapPoints[snapPoints.length - 1],
          maxX: snapPoints[0],
        })
      }

      // Pre-expansion onResize (collapsed bounds)
      onResize()
      gsap.set(container, { x: snapPoints[0] })
      console.log('Pre-expand x set to first center:', snapPoints[0])

      // Draggable.create (unchanged)
      draggableInstance = Draggable.create(container, {
        type: 'x',
        trigger: container,
        inertia: true,
        resistance: 1,
        overDrag: true,
        snap: {
          x: (value) => gsap.utils.snap(snapPoints, value, panelNum * 0.3),
        },
        edgeResistance: 0.65,
        onDragStart: () => console.log('🖱️ Drag started!'),
        onDrag: () => console.log('Dragging, x:', draggableInstance.x),
        onDragEnd: function () {
          console.log('🖱️ Drag ended, endX:', this.endX)
          updateSlide(this.endX)
        },
        onThrowComplete: function () {
          console.log('🖱️ Throw complete, final x:', this.x)
          updateSlide(this.x)
        },
      })[0]

      console.log('🖱️ Draggable initialized (dynamic snap)')

      // Initial expand with callback for post-animation recalc
      const initialTimeline = expandPanel(panels[0])
      if (initialTimeline) {
        initialTimeline.eventCallback('onComplete', () => {
          onResize() // Recalc with expanded rects
          // NEW: Adjust x to new snapPoints[0] to center expanded panel 0
          gsap.set(container, { x: snapPoints[0] })
          console.log('Post-expand: Centered container x to', snapPoints[0])
          updateSlide(snapPoints[0]) // Lock expansion on final center
          console.log('Post-expand onResize complete - locked on panel 0')

          // Remove .init class from #panel-1 after draggable initialization
          const panel1 = document.querySelector('#panel-1')
          if (panel1 && panel1.classList.contains('init')) {
            panel1.classList.remove('init')
            console.log(
              '🎯 Removed .init class from #panel-1 after draggable initialization'
            )
          }
        })
      } else {
        // Fallback if no timeline (direct set)
        gsap.set(panels[0], { className: '-=collapsed' }) // Manual if needed
        gsap.delayedCall(0.6, () => {
          onResize()
          // NEW: Adjust x to new snapPoints[0] in fallback
          gsap.set(container, { x: snapPoints[0] })
          console.log('Fallback: Centered container x to', snapPoints[0])
          updateSlide(snapPoints[0])
          console.log('Fallback delayed recalc - locked on panel 0')

          // Remove .init class from #panel-1 after draggable initialization (fallback)
          const panel1 = document.querySelector('#panel-1')
          if (panel1 && panel1.classList.contains('init')) {
            panel1.classList.remove('init')
            console.log(
              '🎯 Removed .init class from #panel-1 after draggable initialization (fallback)'
            )
          }
        })
      }
      panels[0].classList.remove('collapsed')
      currentSlide = 0

      // Add listener (unchanged)
      const resizeHandler = () => onResize()
      window.addEventListener('resize', resizeHandler)

      // Update updateSlide (like reference, with expand/collapse):
      function updateSlide(x) {
        const newSlide = getSlideIndexAt(x)
        console.log(
          'getSlideIndexAt endX:',
          x,
          'newSlide:',
          newSlide,
          'current:',
          currentSlide
        )
        if (
          newSlide !== currentSlide &&
          newSlide >= 0 &&
          newSlide < panels.length
        ) {
          if (isAnimating) isAnimating = false
          collapsePanel(panels[currentSlide])
          panels[currentSlide].classList.add('collapsed')

          expandPanel(panels[newSlide])
          panels[newSlide].classList.remove('collapsed')
          currentSlide = newSlide

          console.log(`🔄 Switched to slide ${newSlide} (dynamic center)`)
        } else {
          console.log('No slide change - staying on', currentSlide)
          // NEW: Fallback snap if on same slide but x deviated (e.g., post-resize/expansion)
          if (Math.abs(draggableInstance.x - snapPoints[currentSlide]) > 1) {
            gsap.set(container, { x: snapPoints[currentSlide] })
            console.log(
              `🔧 Auto-snapped to current slide ${currentSlide} center`
            )
          }
        }
      }
    } else {
      console.warn('No panels for Draggable')
    }

    // updateSlide with parsed snap
    function updateSlide(x) {
      if (!snapPoints.length || !panels.length) {
        console.log('No snap points/panels - skipping update')
        return
      }
      const rawRound = Math.round((-x + offset) / panelNum) // Offset-adjusted round
      const tolerance = panelNum * 0.3 // Wider for peeks
      const newSlide = Math.max(0, Math.min(panels.length - 1, rawRound)) // Clamp 0 to 2
      const distance = Math.abs(x - snapPoints[newSlide])
      console.log(
        'Offset-adjusted round:',
        rawRound,
        'newSlide:',
        newSlide,
        'distance:',
        distance.toFixed(1),
        'tolerance:',
        tolerance
      )
      if (newSlide !== currentSlide && distance <= tolerance) {
        if (isAnimating) isAnimating = false
        collapsePanel(panels[currentSlide])
        panels[currentSlide].classList.add('collapsed')

        expandPanel(panels[newSlide])
        panels[newSlide].classList.remove('collapsed')
        currentSlide = newSlide

        console.log(
          `🔄 Switched to slide ${newSlide} (centered, dist:${distance.toFixed(
            1
          )})`
        )
        gsap.to(container, {
          x: snapPoints[newSlide],
          duration: 0.15,
          ease: 'power2.out',
        })
      } else {
        console.log(
          'No center match - staying on',
          currentSlide,
          distance > tolerance ? '(too far)' : '(same)'
        )
        // NEW: Fallback snap if on same slide but x deviated
        if (Math.abs(draggableInstance.x - snapPoints[currentSlide]) > 1) {
          gsap.set(container, { x: snapPoints[currentSlide] })
          console.log(
            `🔧 Auto-snapped to current slide ${currentSlide} center (offset version)`
          )
        }
      }
    }
    return
  }

  // Add animation lock flag
  // Only proceed if we have panels
  if (!panels.length) {
    console.log('No accordion panels found - skipping initialization')
    return
  }

  console.log('🚀 Initializing Service Select Accordion...')
  // Set initial collapsed panel sizes using GSAP
  setupInitialState()

  // Add event listener based on config
  panels.forEach((panel, index) => {
    panel.addEventListener(config.triggerEvent, () => {
      // Log based on the actual trigger event being used
      console.log(`🖱️ Panel ${index} triggered via ${config.triggerEvent}.`)
      // Don't do anything if animation is in progress (and lock is enabled) or if triggered panel is already expanded
      if (config.useAnimationLock && isAnimating) {
        console.log(
          ` L O C K E D: Animation in progress, ${config.triggerEvent} ignored.`
        )
        return
      }
      if (!panel.classList.contains('collapsed')) {
        // console.log(` L O C K E D: Triggered panel is already expanded, ${config.triggerEvent} ignored.`);
        return
      }

      // Set animation lock if enabled
      if (config.useAnimationLock) {
        console.log('🟢 Animation Lock Engaged.')
        isAnimating = true
      }

      // Find the currently expanded panel
      const expandedPanel = document.querySelector(
        '.accordion-panel:not(.collapsed)'
      )
      console.log('🔍 Found expanded panel:', expandedPanel)

      // Collapse the expanded panel
      console.log('🎬 Starting collapse process for:', expandedPanel)
      collapsePanel(expandedPanel)

      // Expand the triggered panel
      console.log(`🎬 Starting expand process for Panel ${index}:`, panel)
      expandPanel(panel)
    })

    // NOTE: If config.triggerEvent is 'mouseover', the note about
    // no automatic 'mouseout' collapse still applies.
  })

  // Function to set up initial state - reworked for Collection List
  function setupInitialState() {
    console.log('🛠️ Setting up initial state...')
    // Since all items have the same classes from Webflow Collection List,
    // we need to programmatically set up initial states

    // Make sure all panels except first are collapsed initially
    panels.forEach((panel, index) => {
      console.log(`-- Initializing Panel ${index} --`)
      // Find potential content and cover elements within the panel
      const panelContent = panel.querySelector('.panel-content')
      const panelCover = panel.querySelector('.panel-cover')

      if (index === 0) {
        // First panel should be expanded
        panel.classList.remove('collapsed')
        console.log(` P${index}: Removed .collapsed`)
        // Ensure expanded panel has correct styling
        applyExpandedPanelDimensions(panel)

        // Make sure content is visible and active
        if (panelContent) {
          applyExpandedContentDimensions(panelContent)
          gsap.set(panelContent, {
            opacity: 1,
            scale: 1, // Adjusted scale for consistency
          })
          console.log(` P${index} Content: GSAP set opacity: 1, scale: 1`)
          panelContent.classList.add('active') // Add active class
          console.log(` P${index} Content: Added .active`)
        }
        // Make sure cover is inactive (hidden and unclickable)
        if (panelCover) {
          gsap.set(panelCover, {
            opacity: 0,
            pointerEvents: 'none',
          })
          console.log(
            ` P${index} Cover: GSAP set opacity: 0, pointerEvents: none`
          )
        }
      } else {
        // All other panels should be collapsed
        panel.classList.add('collapsed')
        console.log(` P${index}: Added .collapsed`)
        // Apply collapsed styling
        applyCollapsedDimensions(panel)

        // Make sure content is styled appropriately and inactive
        if (panelContent) {
          applyExpandedContentDimensions(panelContent)
          gsap.set(panelContent, {
            opacity: 0,
            scale: 0.7,
          })
          // Note: Log message below had wrong opacity, corrected if needed, but keeping as is from original
          console.log(` P${index} Content: GSAP set opacity: 0.1, scale: 0.7`)
          panelContent.classList.remove('active') // Remove active class
          console.log(` P${index} Content: Removed .active`)
        }
        // Make sure cover is active (visible and clickable)
        if (panelCover) {
          gsap.set(panelCover, {
            opacity: 1,
            pointerEvents: 'auto',
          })
          console.log(
            ` P${index} Cover: GSAP set opacity: 1, pointerEvents: auto`
          )
        }
      }
    })
    console.log('✅ Initial state setup complete.')

    // Remove .init class from #panel-1 after accordion is fully initialized (only on initial page load)
    const panel1 = document.querySelector('#panel-1')
    if (panel1 && panel1.classList.contains('init')) {
      panel1.classList.remove('init')
      console.log(
        '🎯 Removed .init class from #panel-1 after accordion initialization'
      )
    }
  }

  // Function to collapse a panel with animation
  function collapsePanel(panel) {
    if (!panel) {
      console.log('💨 CollapsePanel: No panel provided, skipping.')
      // If no panel is expanded after this attempt, potentially release the lock
      if (!document.querySelector('.accordion-panel:not(.collapsed)')) {
        if (config.useAnimationLock) {
          isAnimating = false
          console.log('🔴 Animation Lock Released (no panel to collapse).')
        }
      }
      return
    }
    console.log('💨 CollapsePanel: Starting collapse for', panel)

    const panelContent = panel.querySelector('.panel-content')
    const panelCover = panel.querySelector('.panel-cover')
    const collapsedWidth = getCollapsedWidth()
    const expandedContentWidth = getExpandedContentWidth()
    const expandedPanelWidth = getExpandedPanelWidth()

    if (panelContent) {
      applyExpandedContentDimensions(panelContent, expandedContentWidth)
      panelContent.classList.remove('active')
      console.log('💨 CollapsePanel Content: Removed .active')
    }
    // Removed panelCover.classList.add('active'); - now handled by GSAP
    // console.log('💨 CollapsePanel Cover: Added .active'); // Removed log

    console.log('💨 CollapsePanel: Creating GSAP timeline...')
    const timeline = gsap.timeline()

    // Animate panel width and overflow using fromTo:
    timeline.fromTo(
      panel,
      { width: expandedPanelWidth, overflow: 'visible' }, // Start from expanded state
      {
        width: collapsedWidth, // Animate to collapsed width
        overflow: 'hidden', // Animate overflow
        duration: config.animationSpeed, // Use config.animationSpeed
        ease: config.easingType, // Use config.easingType
        onComplete: () => {
          panel.classList.add('collapsed') // Add class AFTER animation
          console.log('🏁 CollapsePanel COMPLETED: Added .collapsed to', panel)
        },
      },
      0
    )

    // Animate panel content using fromTo:
    if (panelContent) {
      timeline.fromTo(
        panelContent,
        { opacity: 1, scale: 1 }, // Start from visible state
        {
          opacity: 0,
          scale: 0.7,
          duration: config.animationSpeed, // Use config.animationSpeed
          ease: config.easingType, // Use config.easingType
        },
        0
      )
    }

    // Animate panel cover to fade in and enable pointer events
    if (panelCover) {
      timeline.to(
        panelCover,
        {
          opacity: 1,
          pointerEvents: 'auto',
          duration: config.animationSpeed,
          ease: config.easingType,
        },
        0 // Start at the beginning of the timeline
      )
      console.log('💨 CollapsePanel Cover: GSAP fade in initiated.')
    }

    console.log('💨 CollapsePanel: GSAP fromTo timeline initiated.')
  }

  // Function to expand a panel with animation
  function expandPanel(panel) {
    if (!panel) {
      if (config.useAnimationLock) {
        isAnimating = false
        console.log('🔴 Animation Lock Released (no panel).')
      }
      return
    }
    console.log('팽 ExpandPanel: Starting expand for', panel)

    const panelContent = panel.querySelector('.panel-content')
    const panelCover = panel.querySelector('.panel-cover')
    const collapsedWidth = getCollapsedWidth()
    const expandedContentWidth = getExpandedContentWidth()
    const expandedPanelWidth = getExpandedPanelWidth()

    // Removed panelCover.classList.remove('active'); - now handled by GSAP
    // console.log('팽 ExpandPanel Cover: Removed .active'); // Removed log

    console.log('팽 ExpandPanel: Creating GSAP timeline...')
    const timeline = gsap.timeline({
      onComplete: () => {
        console.log('🏁 ExpandPanel Overall Timeline COMPLETED for', panel)
        if (config.useAnimationLock) {
          isAnimating = false // Release lock ONLY after all animations finish if enabled
          console.log('🔴 Animation Lock Released.')
        }
      },
    })

    // Animate panel width and overflow using fromTo:
    timeline.fromTo(
      panel,
      { width: collapsedWidth, overflow: 'hidden' }, // Start from collapsed state
      {
        width: expandedPanelWidth, // Animate to expanded width
        overflow: 'visible', // Animate overflow
        duration: config.animationSpeed, // Use config.animationSpeed
        ease: config.easingType, // Use config.easingType
        onComplete: () => {
          // Remove collapsed class ONLY after animation finishes
          panel.classList.remove('collapsed')
          console.log(
            '🏁 ExpandPanel Width Tween COMPLETED: Removed .collapsed from',
            panel
          )

          // Update active classes *after* width/overflow animation completes
          if (panelContent) {
            panelContent.classList.add('active')
            console.log('팽 ExpandPanel Content: Added .active')
          }
        },
      },
      0 // Start at time 0
    )

    // Animate panel content using fromTo:
    if (panelContent) {
      applyExpandedContentDimensions(panelContent, expandedContentWidth)
      timeline.fromTo(
        panelContent,
        { opacity: 0 }, // Start from hidden state
        {
          opacity: 1,
          scale: 1,
          duration: config.animationSpeed, // Use config.animationSpeed
          ease: config.easingType, // Use config.easingType
        },
        // Add a slight delay AFTER the width animation starts
        // Use a fraction of the animation speed for scalability, e.g., speed / 7.5
        config.animationSpeed / 7.5 // Adjusted delay based on speed
      )
    }

    // Animate panel cover to fade out and disable pointer events
    if (panelCover) {
      timeline.to(
        panelCover,
        {
          opacity: 0,
          pointerEvents: 'none',
          duration: config.animationSpeed,
          ease: config.easingType,
        },
        0 // Start at the beginning of the timeline
      )
      console.log('팽 ExpandPanel Cover: GSAP fade out initiated.')
    }

    console.log('팽 ExpandPanel: GSAP fromTo timeline initiated.')
    return timeline // Return the timeline for callback
  }

  let resizeRafId = null

  const handleResize = () => {
    if (resizeRafId) {
      cancelAnimationFrame(resizeRafId)
    }

    resizeRafId = requestAnimationFrame(() => {
      panels.forEach((panel) => {
        if (panel.classList.contains('collapsed')) {
          applyCollapsedDimensions(panel)
          const collapsedContent = panel.querySelector('.panel-content')
          applyExpandedContentDimensions(collapsedContent)
          return
        }

        applyExpandedPanelDimensions(panel)

        const expandedContent = panel.querySelector('.panel-content')
        applyExpandedContentDimensions(expandedContent)
      })

      // New: Check for mode switch
      const isNowMobileVertical = mobileVerticalMediaQuery.matches
      if (isNowMobileVertical !== (currentMode === 'draggable')) {
        console.log(
          `🔄 Switching to ${
            isNowMobileVertical ? 'draggable' : 'accordion'
          } mode`
        )
        if (currentMode === 'draggable' && draggableInstance) {
          // Teardown draggable
          draggableInstance.kill()
          draggableInstance = null
          snapPoints = []
          // Reset styles
          const container = document.querySelector('.collection-list-services')
          if (container) gsap.set(container, { clearProps: 'all' })
          gsap.set(panels, { clearProps: 'all' })
          gsap.set(panels, { pointerEvents: 'auto' }) // Restore on switch back
          // Reset to initial accordion state
          setupInitialState()
          // Re-add accordion listeners
          panels.forEach((panel, index) => {
            panel.addEventListener(config.triggerEvent, () => {
              if (config.useAnimationLock && isAnimating) {
                console.log(
                  ` L O C K E D: Animation in progress, ${config.triggerEvent} ignored.`
                )
                return
              }
              if (!panel.classList.contains('collapsed')) {
                return
              }
              if (config.useAnimationLock) {
                console.log('🟢 Animation Lock Engaged.')
                isAnimating = true
              }
              const expandedPanel = document.querySelector(
                '.accordion-panel:not(.collapsed)'
              )
              console.log('🔍 Found expanded panel:', expandedPanel)
              console.log('🎬 Starting collapse process for:', expandedPanel)
              collapsePanel(expandedPanel)
              console.log(
                `🎬 Starting expand process for Panel ${index}:`,
                panel
              )
              expandPanel(panel)
            })
          })
        } else if (isNowMobileVertical) {
          // Switch to draggable: remove accordion listeners first
          panels.forEach((panel) =>
            panel.removeEventListener(
              config.triggerEvent /* handler ref or anonymous, but for simplicity, reinitialize */
            )
          )
          // Inlined draggable init (scope access to local functions)
          let container =
            document.querySelector('.collection-list-services') ||
            document.querySelector(
              '[class*="collection-list"], .w-list-unstyled'
            )
          console.log('Container for draggable:', container)
          if (!container) {
            console.warn(
              'No container found for Draggable - falling back to accordion'
            )
            currentMode = 'accordion'
          } else {
            const panels = gsap.utils.toArray('.accordion-panel')
            console.log('Panels for draggable:', panels.length)
            if (!panels.length) {
              console.warn('No panels found for Draggable')
            } else {
              // Reset all panels to collapsed state (using local functions)
              panels.forEach((panel) => {
                panel.classList.add('collapsed')
                applyCollapsedDimensions(panel)
                const panelContent = panel.querySelector('.panel-content')
                const panelCover = panel.querySelector('.panel-cover')
                if (panelContent) {
                  applyExpandedContentDimensions(panelContent)
                  gsap.set(panelContent, { opacity: 0, scale: 0.7 })
                  panelContent.classList.remove('active')
                }
                if (panelCover) {
                  gsap.set(panelCover, { opacity: 1, pointerEvents: 'auto' })
                }
              })

              // Prevent child elements from interfering with drag
              gsap.set(panels, { pointerEvents: 'none' })

              // Set container and panels for horizontal drag
              gsap.set(container, {
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                overflow: 'hidden',
                width: '100%',
                height: '100%',
              })

              // Parse svw to numeric for snaps (e.g., '33svw' -> 33/100 * innerWidth ~123px on 375px : UPDATE TO 430px)
              const rawWidth = getExpandedPanelWidth() // '33svw'
              const svwValue = parseFloat(rawWidth.replace('svw', '')) || 33 // Numeric 33
              const panelNum = (svwValue / 100) * window.innerWidth // ~123px
              const viewportWidth = window.innerWidth
              const offset = (viewportWidth - panelNum) / 2 // ~126px for centering peeks
              console.log('Center offset for peeks:', offset)
              console.log('Parsed panel width (svw to px):', panelNum)

              // Panels: svw flex for peeks, no extra margins
              gsap.set(panels, {
                flex: `0 0 ${rawWidth}`, // Keep string for CSS consistency
                margin: 0,
                padding: 0,
              })

              let snapPoints = []
              const getSlideIndexAt = (x) =>
                snapPoints.indexOf(gsap.utils.snap(snapPoints, x))

              function onResize() {
                const centerX = window.innerWidth / 2
                snapPoints = panels.map((el) => {
                  const bounds = el.getBoundingClientRect()
                  return (
                    centerX -
                    (bounds.left + bounds.width / 2) +
                    draggableInstance.x
                  )
                })
                console.log('Dynamic snap points (rect-based):', snapPoints)
                if (draggableInstance) {
                  draggableInstance.applyBounds({
                    minX: snapPoints[snapPoints.length - 1],
                    maxX: snapPoints[0],
                  })
                }
              }

              // Call initial
              onResize()

              // Add listener (scoped)
              const resizeHandler = () => onResize()
              window.addEventListener('resize', resizeHandler)

              // Initial expand (no call to updateSlide yet)
              expandPanel(panels[0])
              panels[0].classList.remove('collapsed')
              currentSlide = 0

              // Remove .init class from #panel-1 after draggable mode switch initialization
              const panel1 = document.querySelector('#panel-1')
              if (panel1 && panel1.classList.contains('init')) {
                panel1.classList.remove('init')
                console.log(
                  '🎯 Removed .init class from #panel-1 after draggable mode switch'
                )
              }

              // Update Draggable onDragEnd (like reference):
              draggableInstance = Draggable.create(container, {
                type: 'x',
                trigger: container,
                inertia: true,
                resistance: 1,
                overDrag: true,
                snap: {
                  x: (value) =>
                    gsap.utils.snap(snapPoints, value, panelNum * 0.3),
                },
                edgeResistance: 0.65,
                onDragStart: () => console.log('🖱️ Drag started!'),
                onDrag: () => console.log('Dragging, x:', draggableInstance.x),
                onDragEnd: function () {
                  console.log('🖱️ Drag ended, endX:', this.endX)
                  updateSlide(this.endX)
                },
                onThrowComplete: function () {
                  console.log('🖱️ Throw complete, final x:', this.x)
                  updateSlide(this.x)
                },
              })[0]

              console.log('🖱️ Draggable initialized (dynamic snap)')

              // Update updateSlide (like reference, with expand/collapse):
              function updateSlide(x) {
                const newSlide = getSlideIndexAt(x)
                console.log(
                  'getSlideIndexAt endX:',
                  x,
                  'newSlide:',
                  newSlide,
                  'current:',
                  currentSlide
                )
                if (
                  newSlide !== currentSlide &&
                  newSlide >= 0 &&
                  newSlide < panels.length
                ) {
                  if (isAnimating) isAnimating = false
                  collapsePanel(panels[currentSlide])
                  panels[currentSlide].classList.add('collapsed')

                  expandPanel(panels[newSlide])
                  panels[newSlide].classList.remove('collapsed')
                  currentSlide = newSlide

                  console.log(
                    `🔄 Switched to slide ${newSlide} (dynamic center)`
                  )
                } else {
                  console.log('No slide change - staying on', currentSlide)
                  // NEW: Fallback snap if on same slide but x deviated (e.g., post-resize/expansion)
                  if (
                    Math.abs(draggableInstance.x - snapPoints[currentSlide]) > 1
                  ) {
                    gsap.set(container, { x: snapPoints[currentSlide] })
                    console.log(
                      `🔧 Auto-snapped to current slide ${currentSlide} center (resize reinitialize)`
                    )
                  }
                }
              }
            }
          }
          // Define updateSlide here (local scope)
          function updateSlide(x) {
            if (!snapPoints.length || !panels.length) {
              console.log('No snap points/panels - skipping update')
              return
            }
            const rawRound = Math.round((-x + offset) / panelNum) // Offset-adjusted round
            const tolerance = panelNum * 0.3 // Wider for peeks
            const newSlide = Math.max(0, Math.min(panels.length - 1, rawRound)) // Clamp 0 to 2
            const distance = Math.abs(x - snapPoints[newSlide])
            console.log(
              'Raw round:',
              rawRound,
              'clamped newSlide:',
              newSlide,
              'distance to snap:',
              distance,
              'tolerance:',
              tolerance
            )
            if (newSlide !== currentSlide && distance <= tolerance) {
              if (isAnimating) isAnimating = false
              collapsePanel(panels[currentSlide])
              panels[currentSlide].classList.add('collapsed')

              expandPanel(panels[newSlide])
              panels[newSlide].classList.remove('collapsed')
              currentSlide = newSlide

              console.log(
                `🔄 Switched to slide ${newSlide} (center match, dist:${distance.toFixed(
                  1
                )})`
              )
              gsap.to(container, {
                x: snapPoints[newSlide],
                duration: 0.15,
                ease: 'power2.out',
              })
            } else if (distance > tolerance) {
              console.log(
                'No close center match - staying on',
                currentSlide,
                ' (dist too far)'
              )
            } else {
              console.log('Same slide - no change')
            }
            // NEW: Fallback snap if on same slide but x deviated
            if (Math.abs(draggableInstance.x - snapPoints[currentSlide]) > 1) {
              gsap.set(container, { x: snapPoints[currentSlide] })
              console.log(
                `🔧 Auto-snapped to current slide ${currentSlide} center (offset version)`
              )
            }
          }
        }
        currentMode = isNowMobileVertical ? 'draggable' : 'accordion'
      }

      // Recompute snap points if in draggable mode
      if (currentMode === 'draggable' && draggableInstance) {
        computeSnapPoints()
      }
    })
  }

  window.addEventListener('resize', handleResize)
}

// Initialize accordion immediately when the script loads
console.log('🚀 [SCRIPT] About to call initializeAccordion()')
initializeAccordion()
console.log('🚀 [SCRIPT] initializeAccordion() completed')

// Export for use in main.js
export default initServiceSelect

// Add a final log to confirm the script has loaded completely
console.log('🚀 [SCRIPT] serviceselect.js script loaded completely')

// CRITICAL: Call initServiceSelect immediately to ensure modal controller initializes
console.log(
  '🚀 [SCRIPT] Calling initServiceSelect directly from script level...'
)
initServiceSelect()
console.log('🚀 [SCRIPT] Direct call to initServiceSelect completed')

// Add a test function to manually trigger modals for debugging
window.testModal = function (modalName) {
  console.log(`🧪 [TEST] Testing modal: ${modalName}`)
  console.log('🧪 [TEST] Modal controller:', window.agencyModalController)

  if (!window.agencyModalController) {
    console.error('🧪 [TEST] Modal controller not found')
    return
  }

  if (!window.agencyModalController.modals) {
    console.error('🧪 [TEST] Modal controller modals not found')
    return
  }

  const modal = window.agencyModalController.modals.get(modalName)
  if (!modal) {
    console.error(`🧪 [TEST] Modal "${modalName}" not found in controller`)
    console.log(
      '🧪 [TEST] Available modals:',
      Array.from(window.agencyModalController.modals.keys())
    )
    return
  }

  console.log(`🧪 [TEST] Found modal "${modalName}":`, modal)

  // Try to manually show the modal
  if (modal.element) {
    modal.element.classList.remove('non')
    console.log(`🧪 [TEST] Removed .non class from modal "${modalName}"`)

    // Also try to show the container if available
    if (modal.container) {
      modal.container.classList.remove('non')
      console.log(`🧪 [TEST] Removed .non class from container`)
    } else {
      // Try to find any parent container
      const parent = modal.element.parentElement
      if (parent) {
        parent.classList.remove('non')
        console.log(`🧪 [TEST] Removed .non class from parent container`)
      }
    }
  }
}

// Add a test function to manually close all modals
window.closeAllTestModals = function () {
  console.log('🧪 [TEST] Closing all modals')
  const modalFrames = document.querySelectorAll('.services-modal-framewrap')
  modalFrames.forEach((frame) => {
    frame.classList.add('non')
  })

  // Also try to close any parent containers
  const containers = document.querySelectorAll(
    '#agencyModals, .services-modal-framewrap'
  )
  containers.forEach((container) => {
    container.classList.add('non')
  })
}

console.log(
  '🧪 [TEST] Test functions added. Use testModal("sfModal") or testModal("msModal") to test'
)
