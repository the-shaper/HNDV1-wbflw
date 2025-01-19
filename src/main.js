import './styles/style.css'

// Portfolio
import initPortfolio from './features/portfolio/portfolio'
import initPortfolioScroll from './features/portfolio/portfolioscroll'
import initGalleryTabs from './features/portfolio/gallerytabs'
import initCategoriesMenu from './features/portfolio/categories-menu'

// Agency
import initShowcase from './features/agency/showcase'
import initAgencyTabs from './features/agency/agencytabs'
import initCardTabs from './features/agency/cardtabs'
import initBoardTabs from './features/agency/boardtabs'
import { initAccordionAYW } from './features/agency/ayw'

console.log('Welcome to Vite + JS + Webflow!')

document.addEventListener('DOMContentLoaded', () => {
  initPortfolio()
  initPortfolioScroll()
  //initGalleryTabs()
  initCategoriesMenu()
  // Agency
  initShowcase()
  initAgencyTabs()
  initCardTabs()
  initBoardTabs()
  initAccordionAYW()
})
