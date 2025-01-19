function initPortfolioScroll() {
  gsap.registerPlugin(ScrollTrigger)

  $('.slider-gallery_component').each(function (index) {
    let childTriggers = $(this).find('.card-scroll_gal-item')
    let childTargets = $(this).find('.swiper-gal-slide')
    let dropShadow = $(this).find('.drop-shadow').first() // Select only the first drop-shadow
    let scrollerContainer = $(this).find('.scroll-nav-wrapper')
    let galleryScrollCard = $(this).find('.gallery-scroll-card')

    function makeItemActive(index) {
      childTriggers.removeClass('is-active')
      childTargets.removeClass('is-active')
      galleryScrollCard.removeClass('is-active')

      // Fade out all targets
      gsap.to(childTargets, { opacity: 0, duration: 0.2 })

      // Fade in the active target
      gsap.to(childTargets.eq(index), { opacity: 1, duration: 0.2, delay: 0.1 })

      childTriggers.eq(index).addClass('is-active')
      childTargets.eq(index).addClass('is-active')
      galleryScrollCard.eq(index).addClass('is-active')

      // Animate the shadow
      gsap.to(dropShadow, {
        opacity: 0,
        duration: 0.05,
        onComplete: () => {
          gsap.to(dropShadow, { opacity: 1, duration: 0.02, delay: 0.1 })
        },
      })
    }

    makeItemActive(0)

    childTriggers.each(function (index) {
      ScrollTrigger.create({
        trigger: $(this),
        start: 'top center',
        end: 'bottom center',
        scroller: scrollerContainer,
        onToggle: (self) => {
          if (self.isActive) {
            makeItemActive(index)
            $(this)[0].dispatchEvent(
              new CustomEvent('toggleActive', { detail: { isActive: true } })
            )
          } else {
            $(this)[0].dispatchEvent(
              new CustomEvent('toggleActive', { detail: { isActive: false } })
            )
          }
        },
      })
    })

    const contentWrapper = document.querySelector('.scroll-nav-wrapper')
    const scrollDot = document.querySelector('.scroll-dot')
    const customScrollbar = document.querySelector('.scroll-line-project')

    contentWrapper.addEventListener('scroll', () => {
      const contentHeight =
        contentWrapper.scrollHeight - contentWrapper.clientHeight
      const scrollbarHeight = customScrollbar.clientHeight
      const scrollPosition = contentWrapper.scrollTop

      const dotPosition =
        (scrollPosition / contentHeight) * scrollbarHeight - 6.5
      scrollDot.style.top = `${dotPosition}px`
    })

    let currentWheelHandler = null // Store the current wheel event handler

    // Function to handle custom scrolling
    function enableCustomScroll(enable) {
      const scrollerContainer = $('.scroll-nav-wrapper')[0] // Select globally

      // Always remove the previous event listener if it exists
      if (currentWheelHandler) {
        document.removeEventListener('wheel', currentWheelHandler)
        currentWheelHandler = null
      }

      if (enable && scrollerContainer) {
        currentWheelHandler = function handleWheel(e) {
          e.preventDefault()

          // Calculate a scroll factor based on the container's height
          const containerHeight = scrollerContainer.scrollHeight
          const viewportHeight = window.innerHeight
          const scrollFactor = Math.max(
            0.1,
            Math.min(1, viewportHeight / containerHeight)
          )

          // Apply the scroll factor to the delta
          const adjustedDelta = e.deltaY * scrollFactor

          scrollerContainer.scrollTop += adjustedDelta
        }

        document.addEventListener('wheel', currentWheelHandler, {
          passive: false,
        })
      }
    }

    // New function to handle arrow visual feedback
    function setupArrowFeedback() {
      const arrows = {
        ArrowUp: document.querySelector('.fillarrow[data-direction="up"]'),
        ArrowDown: document.querySelector('.fillarrow[data-direction="down"]'),
        ArrowLeft: document.querySelector('.fillarrow[data-direction="left"]'),
        ArrowRight: document.querySelector(
          '.fillarrow[data-direction="right"]'
        ),
      }

      function flickArrow(direction, flick) {
        const arrow = arrows[direction]
        if (arrow) {
          arrow.classList.toggle('flick', flick)
        }
      }

      function handleKeyDown(e) {
        if (Object.keys(arrows).includes(e.code)) {
          flickArrow(e.code, true)
        }
      }

      function handleKeyUp(e) {
        if (Object.keys(arrows).includes(e.code)) {
          flickArrow(e.code, false)
        }
      }

      document.addEventListener('keydown', handleKeyDown)
      document.addEventListener('keyup', handleKeyUp)

      // Return a cleanup function
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.removeEventListener('keyup', handleKeyUp)
      }
    }

    let cleanupArrowFeedback = null

    // Add event listener for tab changes
    document.addEventListener('tabChange', function (e) {
      if (e.detail.tab === 'tab2') {
        enableCustomScroll(true)
        if (cleanupArrowFeedback) cleanupArrowFeedback()
        cleanupArrowFeedback = setupArrowFeedback()
      } else {
        enableCustomScroll(false)
        if (cleanupArrowFeedback) {
          cleanupArrowFeedback()
          cleanupArrowFeedback = null
        }
      }
    })

    // Function to scroll to center a specific item
    function scrollToCenter(item) {
      let container = scrollerContainer[0]
      let containerHeight = container.clientHeight
      let itemTop = item.offsetTop
      let itemHeight = item.offsetHeight

      // Calculate the scroll position to center the item
      let scrollTo = itemTop - containerHeight / 2 + itemHeight / 2

      // Use GSAP to animate the scroll
      gsap.to(container, {
        scrollTop: scrollTo,
        duration: 0.5,
        ease: 'power2.out',
      })
    }

    // Add click event listeners to all card items
    childTriggers.each(function () {
      $(this).on('click', function () {
        scrollToCenter(this)
      })
    })
  })
}

initPortfolioScroll()

export default initPortfolioScroll
