function initPortfolioScroll() {
  gsap.registerPlugin(ScrollTrigger)

  $('.slider-gallery_component').each(function (index) {
    let childTriggers = $(this).find('.card-scroll_gal-item')
    let childTargets = $(this).find('.swiper-gal-slide')
    let scrollerContainer = $(this).find('.scroll-nav-wrapper')
    let galleryScrollCard = $(this).find('.gallery-scroll-card')

    function makeItemActive(index) {
      childTriggers.removeClass('is-active')
      childTargets.removeClass('is-active')
      galleryScrollCard.removeClass('is-active')
      childTriggers.eq(index).addClass('is-active')
      childTargets.eq(index).addClass('is-active')
      galleryScrollCard.eq(index).addClass('is-active')
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
        onEnter: () => {
          childTargets.eq(index).addClass('is-active')
        },
        onLeave: () => {
          childTargets.eq(index).removeClass('is-active')
        },
        onEnterBack: () => {
          childTargets.eq(index).addClass('is-active')
        },
        onLeaveBack: () => {
          childTargets.eq(index).removeClass('is-active')
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
  })
}

initPortfolioScroll()

export default initPortfolioScroll
