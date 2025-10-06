import './styles/style.css'

// Portfolio
import initPortfolio from './features/portfolio/portfolio'
import initPortfolioScroll from './features/portfolio/portfolioscroll'
import initGalleryTabs from './features/portfolio/gallerytabs'
import initCategoriesMenu from './features/portfolio/categories-menu'
// initDashboardController from './features/agency/ayw/dashboard-controller' // Removed for dynamic import

// Agency
// The following modules are now imported dynamically based on page conditions:
// import initShowcase from './features/agency/showcase'
// import initAgencyTabs from './features/agency/agencytabs'
// import initCardTabs from './features/agency/cardtabs' // Keep this static import as it was not listed for dynamic import
// import initBoardTabs from './features/agency/boardtabs'
// import { initAccordionAYW, initAYWCraftUI } from './features/agency/ayw' // Removed for dynamic import
// import initMethod from './features/agency/method' // Removed for dynamic import
// import initServiceSelect from './features/agency/serviceselect' // Removed for dynamic import
// import './features/agency/ayw/energy/energy.js' // Removed for dynamic import (handled dynamically)
// import { startWorkingHoursAnimation, stopWorkingHoursAnimation } from './features/agency/ayw/energy/comms' // Removed for dynamic import (handled dynamically)

console.log('Welcome to Vite + JS + Webflow!')

function initializeAppOnce() {
  if (window.__tfMainInitialized) {
    return
  }
  window.__tfMainInitialized = true

  initPortfolio()
  initPortfolioScroll()
  initGalleryTabs()
  initCategoriesMenu()

  // Agency
  //initCardTabs() // Keep this static call

  // AYW and Energy modules are now initialized conditionally below

  // Check if the page has the data-page="agency-main" attribute
  const isAgencyMainPage = document.querySelector('[data-page="agency-main"]')

  if (isAgencyMainPage) {
    console.log(
      'Agency main page detected. Dynamically importing specific modules.'
    )

    // Dynamically import and initialize initShowcase
    import('./features/agency/showcase')
      .then((module) => {
        if (typeof module.default === 'function') {
          module.default()
        } else {
          console.error(
            'Error: initShowcase not exported as default function or is not a function.'
          )
        }
      })
      .catch((error) => {
        console.error('Failed to load the agency showcase module:', error)
      })

    // Dynamically import and initialize initAgencyTabs
    import('./features/agency/agencytabs')
      .then((module) => {
        if (typeof module.default === 'function') {
          module.default()
        } else {
          console.error(
            'Error: initAgencyTabs not exported as default function or is not a function.'
          )
        }
      })
      .catch((error) => {
        console.error('Failed to load the agency tabs module:', error)
      })

    // Dynamically import and initialize initBoardTabs
    import('./features/agency/boardtabs')
      .then((module) => {
        if (typeof module.default === 'function') {
          module.default()
        } else {
          console.error(
            'Error: initBoardTabs not exported as default function or is not a function.'
          )
        }
      })
      .catch((error) => {
        console.error('Failed to load the board tabs module:', error)
      })

    // Dynamically import and initialize initMethod
    import('./features/agency/method')
      .then((module) => {
        if (typeof module.default === 'function') {
          module.default()
        } else {
          console.error(
            'Error: initMethod not exported as default function or is not a function.'
          )
        }
      })
      .catch((error) => {
        console.error('Failed to load the method module:', error)
      })

    // Dynamically import and initialize initServiceSelect
    import('./features/agency/serviceselect')
      .then((module) => {
        if (typeof module.default === 'function') {
          module.default()
        } else {
          console.error(
            'Error: initServiceSelect not exported as default function or is not a function.'
          )
        }
      })
      .catch((error) => {
        console.error('Failed to load the service select module:', error)
      })

    // Dynamically import and initialize marquee
    import('./features/agency/marquee')
      .then((module) => {
        if (typeof module.default === 'function') {
          module.default()
        } else {
          console.error(
            'Error: initMarquee not exported as default function or is not a function.'
          )
        }
      })
      .catch((error) => {
        console.error('Failed to load the marquee module:', error)
      })

    // Clean Slate 3D - init on load if container exists
    // TODO: Re-enable when needed for future Three.js implementations
    // const cleanSlateContainer = document.querySelector('.cleanslate-container')
    // if (cleanSlateContainer) {
    //   import('../primitives/three-js/clean-slate3d/cleanSlate3d.js')
    //     .then((module) => {
    //       if (typeof module.default === 'function') {
    //         module.default(cleanSlateContainer)
    //         console.log('Clean Slate 3D initialized on load.')
    //       } else {
    //         console.error(
    //           'Error: initCleanSlate3d not exported as default function or is not a function.'
    //         )
    //       }
    //     })
    //     .catch((error) => {
    //       console.error('Failed to load the Clean Slate 3D module:', error)
    //     })
    // } else {
    //   console.log('No .cleanslate-container found on load – skipping 3D init.')
    // }
  } else {
    console.log(
      'Agency main page element not found. Skipping agency-specific module loading.'
    )
  }

  // Check if the page has the data-page="ayw" attribute
  const isAywPage = document.querySelector('[data-page="ayw"]')

  if (isAywPage) {
    console.log(
      'AYW page element found. Dynamically importing specific modules.'
    )

    // Dynamically import and initialize AYW and Energy modules
    Promise.all([
      import('./features/agency/ayw'), // Contains initAccordionAYW, initAYWCraftUI (named exports)
      import('./features/agency/ayw/dashboard-controller'), // Contains initDashboardController (default export)
      import('./features/agency/ayw/energy/energy.js'), // For side effects
      import('./features/agency/ayw/energy/comms'), // Contains startWorkingHoursAnimation, stopWorkingHoursAnimation (named exports)
      import('./features/agency/ayw/energy/phoneLine.js'), // Import for side effects (self-initializing IIFE)
      import('./features/agency/ayw/ayw-introModal.js'), // Import the new intro modal script
      import('./features/agency/ayw/ayw-rive/ayw-rive-script.js'), // AYW Rive animation script
    ])
      .then(
        ([
          aywModule,
          dashboardModule,
          energyModule,
          commsModule,
          phoneLineModule, // phoneLineModule will be undefined or an empty object as it's an IIFE
          introModalModule,
          aywRiveModule,
        ]) => {
          // Initialize AYW modules if exports are functions
          if (typeof aywModule.initAccordionAYW === 'function') {
            aywModule.initAccordionAYW()
          } else {
            console.error(
              'Error: initAccordionAYW not found or not a function in ./features/agency/ayw.'
            )
          }

          if (typeof aywModule.initAYWCraftUI === 'function') {
            aywModule.initAYWCraftUI()
          } else {
            console.error(
              'Error: initAYWCraftUI not found or not a function in ./features/agency/ayw.'
            )
          }

          // Initialize Dashboard Controller if default export is a function
          if (typeof dashboardModule.default === 'function') {
            dashboardModule.default() // initDashboardController
          } else {
            console.error(
              'Error: initDashboardController not exported as default function or is not a function in ./features/agency/ayw/dashboard-controller.'
            )
          }

          // Energy.js was imported for side effects, no explicit call needed here.
          // phoneLine.js was imported for side effects, its IIFE has run.
          console.log('phoneLine.js module loaded (self-initialized).')

          // Start Working Hours Animation if named export is a function
          if (typeof commsModule.startWorkingHoursAnimation === 'function') {
            commsModule.startWorkingHoursAnimation()
          } else {
            console.error(
              'Error: startWorkingHoursAnimation not found or not a function in ./features/agency/ayw/energy/comms.'
            )
          }

          // stopWorkingHoursAnimation is now available via commsModule.stopWorkingHoursAnimation()
          // but is not called by default in this block.

          // Initialize Intro Modal
          if (typeof introModalModule.default === 'function') {
            introModalModule.default()
          } else {
            console.error(
              'Error: initIntroModal not exported as default function or is not a function in ./features/agency/ayw/ayw-introModal.js.'
            )
          }

          // Initialize AYW Rive Canvas if canvas exists
          if (typeof aywRiveModule.default === 'function') {
            // Only initialize if there's an AYW Rive canvas on the page
            const aywRiveCanvas = document.getElementById('ayw-rive-canvas')
            if (aywRiveCanvas) {
              aywRiveModule.default() // initAywRiveCanvas
              console.log('AYW Rive canvas initialized.')
            } else {
              console.log(
                'No #ayw-rive-canvas found – skipping AYW Rive initialization.'
              )
            }
          } else {
            console.error(
              'Error: initAywRiveCanvas not exported as default function or is not a function in ./features/agency/ayw/ayw-rive/ayw-rive-script.js.'
            )
          }

          console.log('AYW and Energy modules initialized.')
        }
      )
      .catch((error) => {
        console.error('Failed to load one or more AYW related modules:', error)
      })
  } else {
    console.log('AYW page element not found. Skipping AYW module loading.')
  }

  // Check if the page has the data-page="home" attribute for TF Home UI
  const isHomePage = document.querySelector('[data-page="home"]')

  if (isHomePage) {
    console.log(
      'Home page detected. Initializing home-specific modules with Rive dependency.'
    )

    // Gate Rive init until TwilightFringe PNG is ready (or timeout)
    const riveCanvas = document.getElementById('rive-canvas')
    let riveLoaded = Promise.resolve()
    if (riveCanvas) {
      const waitForPngReady = () =>
        new Promise((resolve) => {
          const already = window.__twilightFringe?.pngStatus
          if (already === 'ready' || already === 'skipped') {
            resolve()
            return
          }
          const onReady = () => {
            window.removeEventListener('twilightFringe:pngReady', onReady)
            window.removeEventListener('twilightFringe:pngSkipped', onSkip)
            window.removeEventListener('twilightFringe:pngFailed', onFail)
            resolve()
          }
          const onSkip = () => {
            window.removeEventListener('twilightFringe:pngReady', onReady)
            window.removeEventListener('twilightFringe:pngSkipped', onSkip)
            window.removeEventListener('twilightFringe:pngFailed', onFail)
            resolve()
          }
          const onFail = () => {
            window.removeEventListener('twilightFringe:pngReady', onReady)
            window.removeEventListener('twilightFringe:pngSkipped', onSkip)
            window.removeEventListener('twilightFringe:pngFailed', onFail)
            resolve()
          }
          window.addEventListener('twilightFringe:pngReady', onReady)
          window.addEventListener('twilightFringe:pngSkipped', onSkip)
          window.addEventListener('twilightFringe:pngFailed', onFail)
          // Timeout safety (3s): don't block forever if assets slow
          setTimeout(() => {
            try {
              window.removeEventListener('twilightFringe:pngReady', onReady)
              window.removeEventListener('twilightFringe:pngSkipped', onSkip)
              window.removeEventListener('twilightFringe:pngFailed', onFail)
            } catch (e) {}
            resolve()
          }, 3000)
        })

      riveLoaded = waitForPngReady()
        .then(() => import('./features/tf-home-v2/rive-runtime/script.js'))
        .then(({ default: initRiveCanvas }) => initRiveCanvas())
        .catch((err) => {
          console.error('Failed to load Rive runtime:', err)
          return Promise.resolve() // Continue without Rive
        })
    }

    // Load Twilight Fringe background effect first (auto-initialises via side-effects)
    import('./features/tf-home-v2/twilightFringe.js').catch((error) => {
      console.error('Failed to load Twilight Fringe module:', error)
    })

    // Initialize CRT GLSL WebGL instance after TwilightFringe is set up; start its animation after Rive loads
    const crtIntroEl = document.querySelector('[data-crt-intro]')
    if (crtIntroEl) {
      const crtImport = import('./features/tf-home-v2/crt-glsl/crt-glsl.js')
      crtImport
        .then(({ initializeCrtGlsl }) => {
          const bg = crtIntroEl.getAttribute('data-crt-bg')
          const cfg = bg
            ? { container: crtIntroEl, initialBgColorHex: bg }
            : { container: crtIntroEl }
          initializeCrtGlsl(cfg)
        })
        .catch((err) => console.error('Failed to import CRT GLSL:', err))

      // Start CRT animation after Rive loads
      riveLoaded.then(() => {
        crtImport
          .then(({ startCrtAnimation }) => {
            if (typeof startCrtAnimation === 'function') startCrtAnimation()
          })
          .catch((err) => console.error('Failed to start CRT animation:', err))
      })
    }

    // Chain TF Home UI after Rive load
    riveLoaded.then(() => {
      console.log('Rive loaded (or skipped). Initializing TF Home UI.')
      import('./features/tf-home-v2/tf-home-ui.js')
        .then((module) => {
          if (typeof module.default === 'function') {
            module.default() // Call initTfHomeUI
          } else {
            console.error(
              'Error: initTfHomeUI not exported as default function or is not a function.'
            )
          }
        })
        .catch((error) => {
          console.error('Failed to load the TF Home UI module:', error)
        })
    })

    // TF Intro: initialize when .tf-logo-intro is present
    const tfLogoIntroEl = document.querySelector('.tf-logo-intro')
    if (tfLogoIntroEl) {
      const tfImport = import('./features/tf-home-v2/tf-intro.js')
      tfImport
        .then(({ initTfIntro }) => {
          initTfIntro() // Setup early
          console.log(
            'TF Intro setup complete - awaiting Rive for animation start'
          )
        })
        .catch((err) => console.error('Failed to import TF Intro:', err))

      // Start TF Intro animation after Rive loads
      riveLoaded.then(() => {
        tfImport
          .then(({ startTfIntro }) => {
            startTfIntro()
            console.log('TF Intro animation started after Rive load')
            // Hide the loading wrap element
            const loadingWrap = document.querySelector(
              '.tf-intro-loading-wrap-2'
            )
            if (loadingWrap) {
              loadingWrap.style.display = 'none'
            }
          })
          .catch((err) =>
            console.error('Failed to start TF Intro animation:', err)
          )
      })
    }
  } else {
    console.log(
      'Home page element not found. Skipping TF Home UI and related module loading.'
    )
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAppOnce)
} else {
  initializeAppOnce()
}

// stopWorkingHoursAnimation() // Keep this outside DOMContentLoaded if it's meant to be available globally or called elsewhere
