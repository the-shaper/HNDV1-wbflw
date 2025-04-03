function initMethod() {
  // Only run if we're on a page that has the required elements
  const methodContainer = document.querySelector('.method-container')
  if (!methodContainer) {
    console.log(
      'Method container not found on this page - skipping initialization'
    )
    return
  }

  // CONFIGURATION
  const config = {
    parentSelector: '.method-container',
    contentWrapperSelector: '.method-content-wrapper',
    menuSelector: '.menu-collection-list',
    menuItemSelector: '.method-menu-item',
    contentSelector: '.method-content.custom-scrollbar',
    contentItemSelector: '.method-content-item',
    svgSize: 666,
    menuCollectionSize: 944,
    menuRadius: 333,
    menuOffsetX: 278,
    menuOffsetY: 435,
    startAngle: -90, // This will make items start at 12 o'clock (-90 degrees)
    animationDuration: 0.5, // Animation duration in seconds
    initialRotation: 0, // Set to 0 - rotation is now based on active index
    baseSeenBlur: 1.9, // Base blur for the most recently 'seen' item (in px)
    seenBlurIncrement: 0.3, // Additional blur per step away from active (in px)
    // totalRotation: -360, // No longer needed for continuous scroll rotation
    // Debugging Flags
    showSvgContainerBorder: false, // Default: Hide blue border
    showSvgPathCircle: false, // Default: Hide red SVG circle
    showMenuContainerBorder: false, // Default: Hide green border
    showMenuItemPathCircle: false, // Default: Hide yellow item path circle
    get menuOffsetX() {
      return (this.menuCollectionSize - this.svgSize) / 2
    },
    get menuOffsetY() {
      return (this.menuCollectionSize - this.svgSize) / 2
    },
  }

  // DOM ELEMENTS
  const parentContainer = document.querySelector(config.parentSelector)
  const contentWrapper = document.querySelector(config.contentWrapperSelector)
  const menuContainer = document.querySelector(config.menuSelector)
  const menuItems = Array.from(
    document.querySelectorAll(config.menuItemSelector)
  )
  const contentContainer = document.querySelector(config.contentSelector)

  // Exit if essential elements are missing
  if (!contentWrapper || !menuContainer || !contentContainer) {
    console.log('Method component missing essential containers')
    return
  }

  // Exit if no menu items found
  if (menuItems.length === 0) {
    console.log('Method component missing menu items')
    return
  }

  const contentItems = Array.from(
    document.querySelectorAll(config.contentItemSelector)
  )

  // Exit if no content items found
  if (contentItems.length === 0) {
    console.log('Method component missing content items')
    return
  }

  // Add a variable to track the currently displayed active index
  let currentActiveIndex = -1 // Initialize with -1 to ensure first update runs
  const angleStep = 360 / menuItems.length // Calculate angle step once
  let debugElements = {} // Object to store references to debug elements
  let menuItemHeight = 0 // Variable to store menu item height
  let scaleOffsetY = 0 // Variable to store the calculated Y offset for scaling
  let isClickAnimating = false // --- ADDED Flag ---

  // SETUP
  function initCircularMenu() {
    // --- ADDED: Get item height and calculate offset ---
    if (menuItems.length > 0) {
      // Ensure styles are applied before getting offsetHeight
      requestAnimationFrame(() => {
        menuItemHeight = menuItems[0].offsetHeight
        // Calculate offset: (newHeight - oldHeight) / 2
        // We scale by 1.3
        // --- RE-ENABLED: Uncomment scaleOffsetY calculation ---
        scaleOffsetY = (menuItemHeight * (1.3 - 1)) / 2 // Calculation uses menuItemHeight
        console.log(
          `Calculated menuItemHeight: ${menuItemHeight}, scaleOffsetY: ${scaleOffsetY}` // Updated log
        )
        // --- END RE-ENABLED ---

        // --- MOVED: Initialize position *after* offset is calculated ---
        console.log('Initializing menu position after calculating offset.')
        updateMenuOnScroll() // This will now use the correct scaleOffsetY
        // --- END MOVED ---
      })
    } else {
      // --- ADDED: Fallback if no menu items (edge case) ---
      // Initialize the position based on initial scroll even if offset couldn't be calculated
      updateMenuOnScroll()
      // --- END ADDED ---
    }

    // Create SVG element for visualization (optional, for debugging)
    createSvgPath()

    // Position menu items along the SVG path
    positionMenuItemsOnPath()

    // Add click event listeners
    addMenuClickHandlers()

    // Initialize the position based on initial scroll
    // --- REMOVED: Initial call moved into requestAnimationFrame ---
    // updateMenuOnScroll() // This will also set initial .active and .seen classes
    // --- END REMOVED ---

    // Add scroll event listener
    contentContainer.addEventListener('scroll', updateMenuOnScroll)
  }

  function createSvgPath() {
    // Remove any existing SVG container first
    const existingSvgContainer = contentWrapper.querySelector(
      '.svg-menu-container'
    )
    if (existingSvgContainer) {
      existingSvgContainer.remove()
    }
    // Reset debug elements references
    debugElements = {}

    // Create SVG container
    const svgContainer = document.createElement('div')
    svgContainer.classList.add('svg-menu-container')
    svgContainer.style.position = 'absolute'
    svgContainer.style.width = `${config.svgSize}px`
    svgContainer.style.height = `${config.svgSize}px`
    svgContainer.style.top = '50%'
    svgContainer.style.left = '50%'
    svgContainer.style.transform = 'translate(-50%, -50%)'
    svgContainer.style.pointerEvents = 'none'
    svgContainer.style.zIndex = '10'

    // Conditionally add border for debugging SVG container
    if (config.showSvgContainerBorder) {
      svgContainer.style.border = '1px solid blue'
      debugElements.svgContainerBorder = true // Mark that border is added
    }

    // Create and setup SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.classList.add('debug-svg-path')
    svg.setAttribute('width', config.svgSize)
    svg.setAttribute('height', config.svgSize)
    svg.style.position = 'absolute'
    svg.style.top = '0'
    svg.style.left = '0'

    // Conditionally create and add circle path
    if (config.showSvgPathCircle) {
      const circle = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      )
      circle.setAttribute('cx', config.svgSize / 2)
      circle.setAttribute('cy', config.svgSize / 2)
      circle.setAttribute('r', config.svgSize / 2)
      circle.setAttribute('fill', 'none')
      circle.setAttribute('stroke', 'rgba(255, 0, 0, 0.5)')
      circle.setAttribute('stroke-width', '2')

      svg.appendChild(circle)
      debugElements.svgPathCircle = circle // Store reference
    }

    svgContainer.appendChild(svg)

    // Position the menu collection list
    menuContainer.style.position = 'absolute'
    menuContainer.style.width = `${config.svgSize}px` // Match SVG size exactly
    menuContainer.style.height = `${config.svgSize}px` // Match SVG size exactly
    menuContainer.style.top = '0'
    menuContainer.style.left = '0'
    menuContainer.style.pointerEvents = 'none'

    // Conditionally add border for debugging menu container
    if (config.showMenuContainerBorder) {
      menuContainer.style.border = '1px solid green'
      debugElements.menuContainerBorder = true // Mark that border is added
    }

    // Add debugging info
    console.log('Container sizes:', {
      svgContainer: {
        width: svgContainer.offsetWidth,
        height: svgContainer.offsetHeight,
      },
      menuContainer: {
        width: menuContainer.offsetWidth,
        height: menuContainer.offsetHeight,
        originalWidth: menuContainer.style.width,
        originalHeight: menuContainer.style.height,
      },
    })

    // Append menu to SVG container
    svgContainer.appendChild(menuContainer)

    // Add the container to the *parent* container, not the content wrapper
    parentContainer.appendChild(svgContainer)

    // Store center coordinates
    config.centerX = config.svgSize / 2
    config.centerY = config.svgSize / 2

    // We don't return svg anymore as its creation is conditional
  }

  function positionMenuItemsOnPath() {
    // Use the center of our container
    const centerX = config.svgSize / 2
    const centerY = config.svgSize / 2

    // Remove previous debug circle if it exists
    if (debugElements.menuItemPathCircle) {
      debugElements.menuItemPathCircle.remove()
      delete debugElements.menuItemPathCircle
    }

    // Conditionally add debugging circle for menu items path
    if (config.showMenuItemPathCircle) {
      const debugCircle = document.createElement('div')
      debugCircle.style.position = 'absolute'
      debugCircle.style.width = `${config.menuRadius * 2}px`
      debugCircle.style.height = `${config.menuRadius * 2}px`
      debugCircle.style.border = '1px dashed yellow'
      debugCircle.style.borderRadius = '50%'
      debugCircle.style.top = `${centerY - config.menuRadius}px`
      debugCircle.style.left = `${centerX - config.menuRadius}px`
      debugCircle.style.zIndex = '1' // Ensure it's behind menu items

      menuContainer.appendChild(debugCircle)
      debugElements.menuItemPathCircle = debugCircle // Store reference
    }

    menuItems.forEach((item, index) => {
      // Calculate angle for this item (starting from top)
      const angleDegrees = config.startAngle + angleStep * index
      const angleRadians = angleDegrees * (Math.PI / 180)

      // Calculate position using trigonometry
      const x = centerX + config.menuRadius * Math.cos(angleRadians)
      const y = centerY + config.menuRadius * Math.sin(angleRadians)

      // Calculate rotation to align with the path tangent
      const tangentAngle = angleDegrees + 90

      // Apply position and rotation
      item.style.position = 'absolute'
      item.style.left = '0'
      item.style.top = '0'
      item.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${tangentAngle}deg)`
      item.style.pointerEvents = 'auto'
      item.style.zIndex = '2'

      // Log position for debugging (still useful regardless of visual guides)
      // console.log(`Menu item ${index} (${item.textContent.trim()}):`, {
      //   angle: angleDegrees,
      //   position: { x, y },
      //   radius: config.menuRadius,
      // })
    })
  }

  function addMenuClickHandlers() {
    menuItems.forEach((item, index) => {
      item.addEventListener('click', () => {
        if (index === currentActiveIndex || isClickAnimating) {
          // Also check flag
          return
        }

        if (index < contentItems.length) {
          const targetIndex = index

          // --- ADDED: Set Flag ---
          isClickAnimating = true
          console.log(
            `Click triggered for index ${targetIndex}. Setting isClickAnimating = true.`
          )

          // Update active index FIRST
          currentActiveIndex = targetIndex
          // --- MOVED: Update visual states immediately ---
          console.log(
            `Click detected, updating active/seen states for index ${currentActiveIndex} BEFORE rotation.`
          )
          updateActiveMenuItem(currentActiveIndex)
          updateSeenMenuItems(currentActiveIndex)
          // --- END MOVED ---

          // Calculate target rotation
          const targetRotation = -(angleStep * currentActiveIndex)

          // Animate scroll to the content item - ADDED onComplete
          gsap.to(contentContainer, {
            scrollTop: contentItems[targetIndex].offsetTop,
            duration: 1, // Keep scroll animation duration (can be adjusted)
            ease: 'power2.inOut',
            onComplete: () => {
              // --- ADDED: Reset Flag ---
              isClickAnimating = false
              console.log(
                `Click scroll complete. Setting isClickAnimating = false.`
              )
              // Optional: You *could* force a final rotation check here, but usually not needed
              // updateMenuOnScroll();
            },
          })

          // Animate the menu rotation - Keep onComplete for state updates
          gsap.to(menuContainer, {
            rotation: targetRotation,
            duration: config.animationDuration,
            ease: 'power2.inOut',
            overwrite: 'auto',
            onComplete: () => {
              // State updates are now handled *before* rotation starts
              // --- REMOVED: State updates moved out of onComplete ---
              // console.log(
              //   `Click rotation complete, updating active/seen states for index ${currentActiveIndex}` // No longer accurate here
              // )
              // updateActiveMenuItem(currentActiveIndex) // MOVED
              // updateSeenMenuItems(currentActiveIndex) // MOVED
              // --- END REMOVED ---
              console.log(
                `Click rotation complete for index ${currentActiveIndex}`
              )
            },
          })
        }
      })
    })
  }

  function updateMenuOnScroll() {
    // --- ADDED: Check Flag ---
    if (isClickAnimating) {
      console.log('Scroll event ignored during click animation.')
      return
    }
    // --- END ADDED ---

    const containerRect = contentContainer.getBoundingClientRect()
    let newActiveIndex = 0
    let maxVisibility = 0

    // Find the most visible content item
    contentItems.forEach((item, index) => {
      const rect = item.getBoundingClientRect()
      // Calculate how much of the item is visible within the container bounds
      const visibleTop = Math.max(rect.top, containerRect.top)
      const visibleBottom = Math.min(rect.bottom, containerRect.bottom)
      const visibleHeight = Math.max(0, visibleBottom - visibleTop)
      // Use item's height for ratio, ensure it's not zero
      const visibilityRatio = rect.height > 0 ? visibleHeight / rect.height : 0

      // Check if this item is more visible than the current max
      // Add a small bias towards the current index to prevent flickering if two items have similar visibility
      const bias = index === currentActiveIndex ? 0.01 : 0
      if (visibilityRatio + bias > maxVisibility) {
        maxVisibility = visibilityRatio + bias
        newActiveIndex = index
      }
    })

    // Update rotation only if the active index has changed
    if (newActiveIndex !== currentActiveIndex) {
      // Check flag again just before starting animation (belt-and-suspenders)
      if (isClickAnimating) {
        console.log(
          'Scroll update aborted just before animation start as click is animating.'
        )
        return
      }

      console.log(
        `Scroll detected index change to ${newActiveIndex}, starting rotation.` // Corrected log
      )

      // Update the tracked index FIRST
      currentActiveIndex = newActiveIndex

      // --- MOVED: Update visual states immediately ---
      console.log(
        `Scroll detected index change, updating active/seen states for index ${currentActiveIndex} BEFORE rotation.`
      )
      updateActiveMenuItem(currentActiveIndex)
      updateSeenMenuItems(currentActiveIndex)
      // --- END MOVED ---

      // Calculate target rotation
      const targetRotation = -(angleStep * currentActiveIndex)

      // Animate the menu rotation - Keep onComplete for state updates
      gsap.to(menuContainer, {
        rotation: targetRotation,
        duration: config.animationDuration,
        ease: 'power3.inOut',
        overwrite: 'auto',
        onComplete: () => {
          // State updates are now handled *before* rotation starts
          // --- REMOVED: State updates moved out of onComplete ---
          // console.log(
          //   `Scroll rotation complete, updating active/seen states for index ${currentActiveIndex}` // No longer accurate here
          // )
          // updateActiveMenuItem(currentActiveIndex) // MOVED
          // updateSeenMenuItems(currentActiveIndex) // MOVED
          // --- END REMOVED ---
          console.log(
            `Scroll rotation complete for index ${currentActiveIndex}`
          )
        },
      })
    }
    // No continuous rotation here anymore

    // REMOVED: Continuous rotation logic based on scrollProgress
    /*
    const scrollMax = contentContainer.scrollHeight - contentContainer.clientHeight;
    const scrollProgress = scrollMax > 0 ? contentContainer.scrollTop / scrollMax : 0;
    const currentRotation = config.initialRotation + scrollProgress * config.totalRotation;
    gsap.to(menuContainer, {
        rotation: currentRotation,
        duration: 0.1,
        ease: 'none',
    });
    */

    // Keep active class updated even if index didn't change (useful on initial load)
    // Note: Moved updateActiveMenuItem inside the if block to only update when index changes,
    // but it might be needed here too depending on exact desired initial state handling.
    // updateActiveMenuItem(currentActiveIndex); // Keep this commented/removed as updates happen within the if block
  }

  function updateActiveMenuItem(activeIndex) {
    // Animate item scales first
    menuItems.forEach((item, index) => {
      // --- RE-ENABLED: Restore dynamic scaling ---
      const targetScale = index === activeIndex ? 1.1618 : 1
      // --- END RE-ENABLED ---
      const isActive = index === activeIndex
      const wasActive = item.classList.contains('active')

      // Update class immediately
      if (isActive) {
        item.classList.add('active')
      } else {
        item.classList.remove('active')
      }

      // Animate scale only if the state is actually changing or needs enforcing
      if (
        (isActive && !wasActive) ||
        (!isActive && wasActive) ||
        (isActive && wasActive)
      ) {
        gsap.to(item, {
          scale: targetScale,
          duration: config.animationDuration,
          ease: 'power1.inOut',
          overwrite: 'auto',
        })
      }
    })

    // AFTER the loop, determine the single target Y for the container
    // --- RE-ENABLED: Use scaleOffsetY for container Y ---
    const finalTargetContainerY = // Re-enabled
      activeIndex >= 0 && activeIndex < menuItems.length ? scaleOffsetY : 0 // Re-enabled
    // const finalTargetContainerY = 0 // Commented out the disabled line
    // --- END RE-ENABLED ---

    // Trigger a SINGLE animation for the container's Y position
    gsap.to(menuContainer, {
      y: finalTargetContainerY,
      duration: config.animationDuration, // Also use the same duration
      ease: 'power1.inOut',
      overwrite: 'auto', // Ensures this overrides any remnants
    })
  }

  // --- UPDATED FUNCTION ---
  /**
   * Updates the .seen class and applies progressive blur on menu items
   * based on the active index. Items before the active index get the .seen
   * class and an increasing blur effect.
   * @param {number} activeIndex - The index of the currently active menu item.
   */
  function updateSeenMenuItems(activeIndex) {
    const baseBlur = config.baseSeenBlur
    const increment = config.seenBlurIncrement

    menuItems.forEach((item, index) => {
      const shouldBeSeen = index < activeIndex
      const isSeen = item.classList.contains('seen')

      if (shouldBeSeen) {
        item.classList.add('seen')
        // Calculate blur: Base blur + increments based on how far back it is
        const stepsBack = activeIndex - 1.9 - index
        const blurAmount = baseBlur + stepsBack * increment

        // Apply the filter style directly using GSAP for smooth transition
        gsap.to(item, {
          filter: `blur(${blurAmount}px)`,
          duration: config.animationDuration, // Use the same duration
          ease: 'power1.inOut', // Match other eases
          overwrite: 'auto',
        })
      } else {
        item.classList.remove('seen')
        // Animate the removal of the filter style
        gsap.to(item, {
          filter: 'blur(0px)', // Animate towards no blur
          duration: config.animationDuration, // Use the same duration
          ease: 'power1.inOut',
          overwrite: 'auto',
        })
      }

      // --- REMOVED direct style manipulation ---
      /*
      if (index < activeIndex) {
        // ... code removed ...
      } else {
        // ... code removed ...
      }
      */
    })
  }
  // --- END UPDATED FUNCTION ---

  // Add position controls alongside radius controls
  function addControls() {
    const controls = document.createElement('div')
    controls.style.position = 'fixed'
    controls.style.bottom = '0px'
    controls.style.right = '0px'
    controls.style.zIndex = '9999'
    controls.style.background = 'rgba(0,0,0,0.7)'
    controls.style.padding = '10px'
    controls.innerHTML = `
      <div style="margin-bottom: 10px">
        <label style="color:white">Radius: <span id="radius-value">${config.menuRadius}</span>px</label>
        <input type="range" min="300" max="400" value="${config.menuRadius}" id="radius-slider" style="width:200px">
      </div>
      <div style="margin-bottom: 10px">
        <label style="color:white">Offset X: <span id="offsetx-value">${config.menuOffsetX}</span>px</label>
        <input type="range" min="200" max="350" value="${config.menuOffsetX}" id="offsetx-slider" style="width:200px">
      </div>
      <div style="margin-bottom: 10px">
        <label style="color:white">Offset Y: <span id="offsety-value">${config.menuOffsetY}</span>px</label>
        <input type="range" min="200" max="350" value="${config.menuOffsetY}" id="offsety-slider" style="width:200px">
      </div>
      <button id="apply-changes">Apply Changes</button>
    `
    document.body.appendChild(controls)

    // Add event listeners for all controls
    const radiusSlider = document.getElementById('radius-slider')
    const offsetXSlider = document.getElementById('offsetx-slider')
    const offsetYSlider = document.getElementById('offsety-slider')
    const radiusValue = document.getElementById('radius-value')
    const offsetXValue = document.getElementById('offsetx-value')
    const offsetYValue = document.getElementById('offsety-value')
    const applyButton = document.getElementById('apply-changes')

    radiusSlider.addEventListener('input', () => {
      radiusValue.textContent = radiusSlider.value
    })
    offsetXSlider.addEventListener('input', () => {
      offsetXValue.textContent = offsetXSlider.value
    })
    offsetYSlider.addEventListener('input', () => {
      offsetYValue.textContent = offsetYSlider.value
    })

    applyButton.addEventListener('click', () => {
      config.menuRadius = parseInt(radiusSlider.value)
      config.menuOffsetX = parseInt(offsetXSlider.value)
      config.menuOffsetY = parseInt(offsetYSlider.value)

      // Update menu container position
      menuContainer.style.top = `-${config.menuOffsetY}px`
      menuContainer.style.left = `-${config.menuOffsetX}px`

      // Update menu items position
      positionMenuItemsOnPath()
    })
  }

  // Uncomment to use the controls
  // addControls()

  // Initialize
  initCircularMenu()
}

// Only auto-initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function () {
  initMethod()
})

// Export for use in main.js
export default initMethod
