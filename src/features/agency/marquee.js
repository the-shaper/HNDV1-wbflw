/**
 * Seamless Scrolling Marquee
 *
 * Creates a continuous horizontal scrolling marquee effect
 * by duplicating content and using requestAnimationFrame for smooth animation.
 */

function initMarquee() {
  // Configuration
  const config = {
    speed: 1, // pixels per frame
    direction: 'left', // 'left' or 'right'
    pauseOnHover: true,
  }

  // DOM elements
  const marqueeContent = document.getElementById('marquee-content')
  const marqueeTrack = document.getElementById('marquee-track')
  const originalText = document.getElementById('marquee-txt')

  // Exit if elements don't exist
  if (!marqueeContent || !marqueeTrack || !originalText) {
    console.warn('Marquee elements not found. Skipping marquee initialization.')
    return
  }

  // Clone the original text to create seamless loop
  const clonedText = originalText.cloneNode(true)
  clonedText.id = 'marquee-txt-clone' // Give it a unique ID
  marqueeTrack.appendChild(clonedText)

  // Animation variables
  let position = 0
  let animationId = null
  let isPaused = false
  let textWidth = 0
  let isInitialized = false

  // Calculate the width of one text element
  function getTextWidth() {
    // Get the actual width including padding, margins, and borders
    const computedStyle = window.getComputedStyle(originalText)
    const width = originalText.offsetWidth
    const marginLeft = parseFloat(computedStyle.marginLeft)
    const marginRight = parseFloat(computedStyle.marginRight)
    const paddingLeft = parseFloat(computedStyle.paddingLeft)
    const paddingRight = parseFloat(computedStyle.paddingRight)

    // Calculate total width including all spacing
    const totalWidth =
      width + marginLeft + marginRight + paddingLeft + paddingRight
    console.log('Text element width calculation:', {
      offsetWidth: width,
      marginLeft,
      marginRight,
      paddingLeft,
      paddingRight,
      totalWidth,
    })

    return totalWidth
  }

  // Initialize text width after DOM is ready
  function initializeWidth() {
    const newTextWidth = getTextWidth()

    // Only update if width actually changed or this is first initialization
    if (newTextWidth !== textWidth || !isInitialized) {
      textWidth = newTextWidth

      // Make sure both text elements are visible
      originalText.style.visibility = 'visible'
      clonedText.style.visibility = 'visible'

      isInitialized = true
    }
  }

  // Animation function using requestAnimationFrame
  function animate() {
    if (!isPaused) {
      // Ensure we have a valid text width
      if (textWidth === 0) {
        initializeWidth()
        return // Skip this frame and try again next frame
      }

      // Move in the specified direction
      if (config.direction === 'left') {
        position -= config.speed

        // SMOOTH RESET: When we've scrolled past one text width, jump ahead
        // But do it smoothly by using a threshold slightly before the exact width
        if (position <= -textWidth) {
          position += textWidth
        }
      } else {
        position += config.speed

        // For right direction, jump back when we go past 0
        if (position >= 0) {
          position -= textWidth
        }
      }

      // Apply the transform
      marqueeTrack.style.transform = `translateX(${position}px)`
    }

    // Continue the animation loop
    animationId = requestAnimationFrame(animate)
  }

  // Handle window resize and content changes
  function handleResize() {
    // Recalculate dimensions if needed
    initializeWidth()
  }

  // Create a MutationObserver to detect text content changes
  function setupContentObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'childList' ||
          mutation.type === 'characterData'
        ) {
          // When content changes, recalculate width but maintain position
          const previousWidth = textWidth
          initializeWidth()

          // If width changed, adjust position proportionally to maintain smooth scrolling
          if (previousWidth > 0 && textWidth !== previousWidth) {
            // Calculate what percentage of the previous width we've scrolled
            const scrollPercentage =
              Math.abs(position % previousWidth) / previousWidth

            // Apply the same percentage to the new width
            position = -(scrollPercentage * textWidth)
          }
        }
      })
    })

    // Observe both the original text and its parent for changes
    observer.observe(originalText, {
      childList: true,
      characterData: true,
      subtree: true,
    })

    return observer
  }

  // Pause on hover functionality
  function setupHoverEvents() {
    if (config.pauseOnHover) {
      marqueeContent.addEventListener('mouseenter', () => {
        isPaused = true
      })

      marqueeContent.addEventListener('mouseleave', () => {
        isPaused = false
      })
    }
  }

  // Initialize
  function init() {
    // Set initial position
    position = 0
    marqueeTrack.style.transform = `translateX(0px)`

    // Initialize width after a brief delay to ensure DOM is fully rendered
    setTimeout(initializeWidth, 100)

    // Setup hover events
    setupHoverEvents()

    // Setup content observer to detect text changes
    const contentObserver = setupContentObserver()

    // Start animation after width is calculated
    setTimeout(() => {
      animate()
    }, 150)

    // Add resize listener with throttling
    let resizeTimeout
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        initializeWidth()
        handleResize()
      }, 100)
    })

    // Return the observer for cleanup
    return contentObserver
  }

  // Cleanup function
  function destroy(contentObserver) {
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }

    // Disconnect the observer if it exists
    if (contentObserver) {
      contentObserver.disconnect()
    }

    // Remove cloned element
    const clonedElement = document.getElementById('marquee-txt-clone')
    if (clonedElement) {
      clonedElement.remove()
    }

    // Reset styles
    marqueeTrack.style.transform = ''

    console.log('Marquee destroyed')
  }

  // Start the marquee and store the observer
  const contentObserver = init()

  // Return control object for external control if needed
  return {
    destroy: () => destroy(contentObserver),
    pause: () => {
      isPaused = true
    },
    resume: () => {
      isPaused = false
    },
    setSpeed: (newSpeed) => {
      config.speed = newSpeed
    },
    setDirection: (newDirection) => {
      if (newDirection === 'left' || newDirection === 'right') {
        config.direction = newDirection
      }
    },
  }
}

// Export for use in other modules
export default initMarquee
