function initGalleryTabs() {
  gsap.registerPlugin(ScrollTrigger)
  console.log('GSAP:', window.gsap)

  function galleryTabs() {
    document.addEventListener('DOMContentLoaded', function () {
      const buttons = document.querySelectorAll('.gal-tab')
      const contents = document.querySelectorAll('.gal-content-wrapper')
      const releasesMenu = document.querySelector('.releases-menu-wrapper')
      const galleryBackground = document.getElementById('galleryBackground')
      const backgroundUrls = document.getElementById('backgroundUrls')

      // Set initial background image immediately
      const initialBgImage = backgroundUrls.querySelector('img')
      if (initialBgImage && initialBgImage.src) {
        galleryBackground.style.backgroundImage = `url(${initialBgImage.src})`

        // Apply blur if needed
        const blurAttribute = initialBgImage.getAttribute('data-blur')
        const applyBlur =
          blurAttribute === 'true' ||
          blurAttribute === '{{ bg-1-blur }}' ||
          blurAttribute === '{{ bg-2-blur }}' ||
          blurAttribute === '{{ bg-3-blur }}' ||
          blurAttribute === '{{ bg-4-blur }}'

        if (applyBlur) {
          galleryBackground.classList.add('blur-effect')
        }
      }

      // Ensure first content is visible
      if (contents.length > 0) {
        contents.forEach((content, index) => {
          if (index === 0) {
            content.classList.remove('non')
          } else {
            content.classList.add('non')
          }
        })
      }

      // Set first button as active
      if (buttons.length > 0) {
        buttons[0].classList.add('is-active')
      }

      // Remove initial-load class after a short delay
      setTimeout(() => {
        document.body.classList.remove('initial-load')
      }, 100)

      buttons.forEach((button) => {
        button.addEventListener('click', () => {
          const target = button.getAttribute('data-tab')
          console.log('Clicked tab:', target)

          const bgImageElement = backgroundUrls.querySelector(
            `img[data-tab-bg="${target}"]`
          )

          let backgroundImage =
            bgImageElement && bgImageElement.src ? bgImageElement.src : ''

          // Add transitioning class to initiate fade-out
          galleryBackground.classList.add('transitioning')

          // Handle transition end to update background and reverse transition
          const handleTransitionEnd = (event) => {
            if (
              event.propertyName === 'opacity' &&
              galleryBackground.classList.contains('transitioning')
            ) {
              // Update the background image after fade-out
              galleryBackground.style.backgroundImage = backgroundImage
                ? `url(${backgroundImage})`
                : ''

              // Remove the transitioning class to fade-in
              galleryBackground.classList.remove('transitioning')

              // Remove the event listener to prevent multiple triggers
              galleryBackground.removeEventListener(
                'transitionend',
                handleTransitionEnd
              )
            }
          }

          galleryBackground.addEventListener(
            'transitionend',
            handleTransitionEnd
          )

          const blurAttribute = bgImageElement
            ? bgImageElement.getAttribute('data-blur')
            : 'false'
          console.log('Blur attribute:', blurAttribute)

          const applyBlur =
            blurAttribute === 'true' ||
            blurAttribute === '{{ bg-1-blur }}' ||
            blurAttribute === '{{ bg-2-blur }}' ||
            blurAttribute === '{{ bg-3-blur }}' ||
            blurAttribute === '{{ bg-4-blur }}'
          console.log('Apply blur:', applyBlur)

          if (applyBlur) {
            galleryBackground.classList.add('blur-effect')
            console.log('Blur effect added')
          } else {
            galleryBackground.classList.remove('blur-effect')
            console.log('Blur effect removed')
          }

          buttons.forEach((btn) => btn.classList.remove('is-active'))
          button.classList.add('is-active')

          contents.forEach((content) => {
            if (content.getAttribute('id') === target) {
              console.log('Showing content:', target)
              content.classList.remove('non')
            } else {
              content.classList.add('non')
            }
          })

          if (target === 'tab2') {
            releasesMenu.classList.add('is-active')
          } else {
            releasesMenu.classList.remove('is-active')
          }

          ScrollTrigger.refresh()
        })
      })

      function handleButtonClick(button) {
        const isGlance = button.classList.contains('glance')
        const isToken = button.classList.contains('token')

        document
          .querySelector('.gallery-button.glance')
          .classList.toggle('is-active', isGlance)
        document
          .querySelector('.gallery-button.token')
          .classList.toggle('is-active', isToken)

        document
          .querySelector('.brandintro-glance-wrapper')
          .classList.toggle('is-active', isGlance)
        document
          .querySelector('.brandintro-token-wrapper')
          .classList.toggle('is-active', isToken)

        document
          .querySelector('.glance-container')
          .classList.toggle('is-active', isGlance)
        document
          .querySelector('.token-container')
          .classList.toggle('is-active', isToken)
      }

      document.querySelectorAll('.gallery-button').forEach(function (button) {
        button.addEventListener('click', function () {
          handleButtonClick(this)
        })
      })

      document.querySelector('.gallery-button.glance').click()
    })
  }

  galleryTabs()
}

initGalleryTabs()

export default initGalleryTabs
