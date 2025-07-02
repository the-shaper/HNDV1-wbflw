function initServiceSelect() {
  // --- Configuration ---
  const config = {
    triggerEvent: 'mouseover', // 'click' or 'mouseover'
    animationSpeed: 0.44, // Duration in seconds (e.g., 0.75)
    easingType: 'expo.inOut', // GSAP easing string (e.g., 'power2.inOut', 'expo.inOut')
    useAnimationLock: true, // Add this line: true = block events during animation, false = allow
  }
  console.log('⚙️ Accordion Config:', config) // Log the config being used

  const panels = document.querySelectorAll('.accordion-panel')
  // Add animation lock flag
  let isAnimating = false

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
        gsap.set(panel, {
          width: '60svw', // Use svw consistently
          overflow: 'visible',
        })
        console.log(` P${index}: GSAP set width: 60svw, overflow: visible`) // Updated log

        // Make sure content is visible and active
        if (panelContent) {
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
        gsap.set(panel, {
          width: '14svw', // Use svw consistently
          overflow: 'hidden',
        })
        console.log(` P${index}: GSAP set width: 14svw, overflow: hidden`)

        // Make sure content is styled appropriately and inactive
        if (panelContent) {
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

    if (panelContent) {
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
      { width: '60svw', overflow: 'visible' }, // Start from expanded state
      {
        width: '14svw', // Animate to collapsed width
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
      { width: '14svw', overflow: 'hidden' }, // Start from collapsed state
      {
        width: '60svw', // Animate to expanded width
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
          // The panelCover class update is moved and handled by GSAP, so remove this block.
          // if (panelCover) {
          //   panelCover.classList.remove('active');
          //   console.log('팽 ExpandPanel Cover: Removed .active');
          // }
        },
      },
      0 // Start at time 0
    )

    // Animate panel content using fromTo:
    if (panelContent) {
      timeline.fromTo(
        panelContent,
        { opacity: 0, scale: 0.7 }, // Start from hidden state
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
  }
}

// Export for use in main.js
export default initServiceSelect
