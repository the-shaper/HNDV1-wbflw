// At the top of the file, after any existing imports (assuming GSAP core is imported elsewhere, add these for plugins)
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'

gsap.registerPlugin(Draggable, InertiaPlugin)

function initServiceSelect() {
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
    if (window.matchMedia('(max-width: 375px)').matches) {
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
    if (window.matchMedia('(max-width: 375px)').matches) {
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
    if (window.matchMedia('(max-width:375px)').matches) {
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
    '(max-width: 375px) and (orientation: portrait)'
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

      // Parse svw to numeric for snaps (e.g., '33svw' -> 33/100 * innerWidth ~123px on 375px)
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

              // Parse svw to numeric for snaps (e.g., '33svw' -> 33/100 * innerWidth ~123px on 375px)
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

// Export for use in main.js
export default initServiceSelect
