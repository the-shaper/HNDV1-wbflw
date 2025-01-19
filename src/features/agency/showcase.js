function initShowcase() {
  $('.slider-main_component').each(function (index) {
    const totemSwiper = new Swiper($(this).find('.swiper')[0], {
      slidesPerView: 1,
      speed: 0.25,
      loop: true,
      allowTouchMove: false,
      effect: 'coverflow',
      coverflowEffect: {
        rotate: 66,
        scale: 1,
        slideShadows: false,
      },
    })

    const titlesSwiper = new Swiper(
      $(this).find('.swiper.is-slider-titles')[0],
      {
        slidesPerView: 1,
        speed: 333,
        effect: 'fade',
        fadeEffect: {
          crossFade: true,
        },
        loop: true,
        keyboard: true,
        mousewheel: true,
        navigation: {
          nextEl: $(this).find('.swiper-next')[0],
          prevEl: $(this).find('.swiper-prev')[0],
        },

        on: {
          slideChange: function () {
            const activeIndex = this.activeIndex
            const activeSlide = $(this.slides).eq(activeIndex)

            const invisibleLink = activeSlide.find('.invisible-link')

            const url = invisibleLink.attr('href')

            console.log('Active index:', activeIndex)
            console.log('Active slide element:', activeSlide)
            console.log('Fetched URL:', url)

            $('#openButton')
              .off('click')
              .on('click', function () {
                window.location.href = url
              })
          },
        },
      }
    )

    titlesSwiper.controller.control = totemSwiper

    $('.w-tab-menu').on('click', '.w-tab-link', function (e) {
      if ($(this).text() === 'Showcase') {
        titlesSwiper.update()
      }
    })
  })
}

export default initShowcase
