import colorModeToggle from './dark-mode-toggle'

function initGalleryTabs() {
  gsap.registerPlugin(ScrollTrigger)
  console.log('GSAP available:', typeof gsap !== 'undefined')

  // Initialize colorMode outside of DOMContentLoaded
  const colorMode = colorModeToggle(
    'background,maininfo,secondinfo,thirdinfo,accent,subaccent',
    0.3
  )

  // Function to set initial background and color mode
  function setInitialBackgroundAndColorMode() {
    const backgroundUrls = document.getElementById('backgroundUrls')
    const galleryBackground = document.getElementById('galleryBackground')

    if (!backgroundUrls || !galleryBackground) {
      console.error('Required elements not found for initial setup')
      return
    }

    // Check all tab backgrounds
    const tabBackgrounds = backgroundUrls.querySelectorAll(
      'img[data-tab-bg^="tab"]'
    )
    let initialBgImage = null

    for (let img of tabBackgrounds) {
      if (img.src) {
        initialBgImage = img
        break
      }
    }

    if (initialBgImage) {
      // Set initial background
      galleryBackground.style.backgroundImage = `url(${initialBgImage.src})`

      // Set initial color mode
      const initialColorMode = initialBgImage.getAttribute('data-color-mode')
      const isDarkMode =
        initialColorMode && initialColorMode.toLowerCase() === 'dark'
      console.log('Initial color mode:', initialColorMode || 'light (default)')
      console.log('Applying initial dark mode:', isDarkMode)
      colorMode.goDark(isDarkMode, false, galleryBackground)
      colorMode.goDark(isDarkMode, false, document.documentElement)

      // Set initial blur effect
      const blurAttribute = initialBgImage.getAttribute('data-blur')
      const applyBlur =
        blurAttribute === 'true' || blurAttribute === '{{ bg-1-blur }}'
      galleryBackground.classList.toggle('blur-effect', applyBlur)
    } else {
      // No background images found, default to light mode
      console.log('No background images found. Defaulting to light mode.')
      colorMode.goDark(false, false, galleryBackground)
      colorMode.goDark(false, false, document.documentElement)
      galleryBackground.style.backgroundImage = 'none'
      galleryBackground.classList.remove('blur-effect')
    }
  }

  // Use MutationObserver to detect when backgroundUrls is populated
  const observer = new MutationObserver((mutations, obs) => {
    const backgroundUrls = document.getElementById('backgroundUrls')
    if (
      backgroundUrls &&
      backgroundUrls.querySelector('img[data-tab-bg="tab1"]')
    ) {
      setInitialBackgroundAndColorMode()
      obs.disconnect() // Stop observing once we've set the initial state
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  function galleryTabs() {
    document.addEventListener('DOMContentLoaded', function () {
      const buttons = document.querySelectorAll('.gal-tab')
      const contents = document.querySelectorAll('.gal-content-wrapper')
      const releasesMenu = document.querySelector('.releases-menu-wrapper')
      const galleryBackground = document.getElementById('galleryBackground')
      const backgroundUrls = document.getElementById('backgroundUrls')

      // Check if required elements exist
      if (!galleryBackground || !backgroundUrls) {
        console.error('Required elements not found')
        return
      }

      // Log computed styles
      const computedStyle = getComputedStyle(document.documentElement)
      console.log(
        'Light mode background:',
        computedStyle.getPropertyValue('--color--background')
      )
      console.log(
        'Dark mode background:',
        computedStyle.getPropertyValue('--dark--background')
      )

      // Log background URLs
      const images = backgroundUrls.querySelectorAll('img')
      images.forEach((img) => {
        console.log(
          `Tab ${img.getAttribute(
            'data-tab-bg'
          )}: Color Mode = ${img.getAttribute('data-color-mode')}`
        )
      })

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

          if (bgImageElement) {
            // Get the color mode from the data attribute
            const colorModeValue =
              bgImageElement.getAttribute('data-color-mode')
            console.log('Color mode value:', colorModeValue)

            if (colorModeValue) {
              // Apply the color mode to the background
              const isDarkMode = colorModeValue.toLowerCase() === 'dark'
              console.log('Applying dark mode:', isDarkMode)
              colorMode.goDark(isDarkMode, true, galleryBackground)
              colorMode.goDark(isDarkMode, true, document.documentElement)
            }

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
          }
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
