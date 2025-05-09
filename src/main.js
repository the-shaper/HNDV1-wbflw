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

document.addEventListener('DOMContentLoaded', () => {
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
    ])
      .then(([aywModule, dashboardModule, energyModule, commsModule]) => {
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

        console.log('AYW and Energy modules initialized.')
      })
      .catch((error) => {
        console.error('Failed to load one or more AYW related modules:', error)
      })
  } else {
    console.log('AYW page element not found. Skipping AYW module loading.')
  }
})

// stopWorkingHoursAnimation() // Keep this outside DOMContentLoaded if it's meant to be available globally or called elsewhere
