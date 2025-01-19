// This is the first fully functional version of our navigation portfolio
function initPortfolio() {
  document.addEventListener('DOMContentLoaded', function () {
    const galleryItems = document.querySelectorAll('.card-scroll_gal-item')
    let currentSlide = 0

    function showSlide(slideIndex) {
      const activeCard = document.querySelector(
        '.card-scroll_gal-item.is-active'
      )
      if (!activeCard) return

      const visibleCards = Array.from(
        activeCard.querySelectorAll(
          '.swiper-slide.gallery-scroll-card-content:not(.w-condition-invisible)'
        )
      )
      const visibleDots = Array.from(
        activeCard.querySelectorAll(
          '.item-gallery-dot:not(.w-condition-invisible)'
        )
      )

      visibleCards.forEach((card, i) => {
        if (i === slideIndex) {
          card.classList.add('is-active')
          card.style.display = 'flex'
        } else {
          card.classList.remove('is-active')
          setTimeout(() => {
            card.style.display = 'none'
          }, 10)
        }
      })

      visibleDots.forEach((dot, i) => {
        if (i === slideIndex) {
          dot.classList.add('is-active')
        } else {
          dot.classList.remove('is-active')
        }
      })

      const activeSwiperSlide = document.querySelector(
        '.swiper-gal-slide.is-active'
      )
      if (activeSwiperSlide) {
        const mainImages = activeSwiperSlide.querySelectorAll(
          '.gal-main-image:not(.w-condition-invisible)'
        )

        mainImages.forEach((mainImage, index) => {
          if (index === slideIndex) {
            mainImage.classList.add('is-active')
          } else {
            mainImage.classList.remove('is-active')
          }
        })
      }

      currentSlide = slideIndex
    }

    function showPreviousSlide() {
      const activeCard = document.querySelector(
        '.card-scroll_gal-item.is-active'
      )
      if (!activeCard) return

      const visibleCards = Array.from(
        activeCard.querySelectorAll(
          '.swiper-slide.gallery-scroll-card-content:not(.w-condition-invisible)'
        )
      )
      if (visibleCards.length > 0) {
        const previousSlide =
          (currentSlide - 1 + visibleCards.length) % visibleCards.length
        showSlide(previousSlide)
      }
    }

    function showNextSlide() {
      const activeCard = document.querySelector(
        '.card-scroll_gal-item.is-active'
      )
      if (!activeCard) return

      const visibleCards = Array.from(
        activeCard.querySelectorAll(
          '.swiper-slide.gallery-scroll-card-content:not(.w-condition-invisible)'
        )
      )
      if (visibleCards.length > 0) {
        const nextSlide = (currentSlide + 1) % visibleCards.length
        showSlide(nextSlide)
      }
    }

    function resetSlider() {
      currentSlide = 0
      const activeCard = document.querySelector(
        '.card-scroll_gal-item.is-active'
      )
      if (!activeCard) return

      const visibleCards = Array.from(
        activeCard.querySelectorAll(
          '.swiper-slide.gallery-scroll-card-content:not(.w-condition-invisible)'
        )
      )
      const visibleDots = Array.from(
        activeCard.querySelectorAll(
          '.item-gallery-dot:not(.w-condition-invisible)'
        )
      )

      visibleCards.forEach((card, index) => {
        card.style.display = index === 0 ? 'flex' : 'none'
        card.classList.remove('is-active', 'fade-in', 'fade-out')
        if (index === 0) card.classList.add('is-active')
      })

      visibleDots.forEach((dot, index) => {
        dot.classList.remove('is-active')
        if (index === 0) dot.classList.add('is-active')
      })

      const activeSwiperSlide = document.querySelector(
        '.swiper-gal-slide.is-active'
      )
      if (activeSwiperSlide) {
        const mainImages = activeSwiperSlide.querySelectorAll(
          '.gal-main-image:not(.w-condition-invisible)'
        )

        mainImages.forEach((mainImage, index) => {
          mainImage.classList.remove('is-active')
          if (index === 0) mainImage.classList.add('is-active')
        })
      }
    }

    function updateActiveElements() {
      const activeCard = document.querySelector(
        '.card-scroll_gal-item.is-active'
      )
      if (!activeCard) return

      // Remove this line if you're not using visibleCards
      // const visibleCards = Array.from(
      //   activeCard.querySelectorAll(
      //     '.swiper-slide.gallery-scroll-card-content:not(.w-condition-invisible)'
      //   )
      // )

      const activeSwiperSlide = document.querySelector(
        '.swiper-gal-slide.is-active'
      )
      if (activeSwiperSlide) {
        const mainImages = activeSwiperSlide.querySelectorAll(
          '.gal-main-image:not(.w-condition-invisible)'
        )

        mainImages.forEach((mainImage, index) => {
          if (index === currentSlide) {
            mainImage.classList.add('is-active')
          } else {
            mainImage.classList.remove('is-active')
          }
        })
      }
    }

    document.addEventListener('keydown', (event) => {
      const activeCard = document.querySelector(
        '.card-scroll_gal-item.is-active'
      )
      if (!activeCard) return

      if (event.key === 'ArrowLeft') {
        showPreviousSlide()
      } else if (event.key === 'ArrowRight') {
        showNextSlide()
      }
    })

    galleryItems.forEach((item) => {
      const cards = item.querySelectorAll(
        '.swiper-slide.gallery-scroll-card-content:not(.w-condition-invisible)'
      )
      const dots = item.querySelectorAll(
        '.item-gallery-dot:not(.w-condition-invisible)'
      )

      cards.forEach((card, index) => {
        card.addEventListener('click', () => {
          if (
            item.classList.contains('is-active') &&
            !card.classList.contains('is-active')
          ) {
            showSlide(index)
          }
        })
      })

      dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
          if (
            item.classList.contains('is-active') &&
            !dot.classList.contains('is-active')
          ) {
            showSlide(index)
          }
        })
      })

      item.addEventListener('toggleActive', (event) => {
        if (event.detail.isActive) {
          resetSlider()
          updateActiveElements()
        }
      })
    })

    showSlide(0)
  })
}

// Call the function immediately
initPortfolio()

// Also export it in case you want to use it elsewhere
export default initPortfolio


