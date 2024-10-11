import './styles/style.css'
import initPortfolio from './features/portfolio/portfolio'
import initPortfolioScroll from './features/portfolio/portfolioscroll'
import initGalleryTabs from './features/portfolio/gallerytabs'
import initCategoriesMenu from './features/portfolio/categories-menu'

console.log('Welcome to Vite + JS + Webflow!')

document.addEventListener('DOMContentLoaded', () => {
  initPortfolio()
  initPortfolioScroll()
  initGalleryTabs()
  initCategoriesMenu()
})
