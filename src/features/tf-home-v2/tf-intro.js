import anime from 'animejs'

let tl = null
let homeIntroContent = null
let homeContainer = null
let introWrapper = null

function initTfIntro() {
  const targetSelector = '.tf-logo-intro'
  const el = document.querySelector(targetSelector)
  if (!el) return

  // Ensure transform origin is centered so scaling/expansion radiates from center
  el.style.transformOrigin = '50% 50%'
  el.style.willChange = 'transform, opacity'

  // Measure original width to compute a scaleX that reaches ~2000px
  const rect = el.getBoundingClientRect()
  const originalWidth = rect && rect.width ? rect.width : el.offsetWidth || 0
  const desiredWidthPx = 2000
  const targetScaleX = originalWidth > 0 ? desiredWidthPx / originalWidth : 1

  // Build timeline but do not play
  tl = anime.timeline({ targets: el, autoplay: false })

  // 1) After 1111ms delay, scale uniformly down to 0.1 over 110ms
  tl.add({
    delay: 666,
    duration: 222,
    easing: 'easeOutQuad',
    scale: 0.1,
  })

  // 2) Keep vertical height at 0.1 while expanding horizontally to ~2000px width
  tl.add({
    duration: 260,
    easing: 'easeInOutQuad',
    scaleX: 10,
    scaleY: 0.1,
  })

  // 3) Fade out to 0% opacity over 111ms
  tl.add({
    duration: 111,
    easing: 'linear',
    opacity: 0,
  })

  // Cache elements for later
  homeIntroContent = document.querySelector('.tf-home-intro-content')
  homeContainer = document.querySelector('.home-container')
  introWrapper = document.querySelector('.tf-intro-wrapper')

  if (homeContainer) {
    homeContainer.style.opacity = '0'
  }

  console.log('TF Intro setup complete - awaiting start signal')
}

function startTfIntro() {
  if (!tl) {
    console.warn('TF Intro not initialized - cannot start')
    return
  }

  tl.play()

  // After 1200ms, add .no-bg to .tf-home-intro-content (if present)
  if (homeIntroContent) {
    setTimeout(() => homeIntroContent.classList.add('no-bg'), 1333)
  }

  // After 2222ms, fade in .home-container from 0 → 1 opacity over 222ms
  if (homeContainer) {
    anime({
      targets: homeContainer,
      opacity: 1,
      delay: 1888,
      duration: 222,
      easing: 'linear',
    })
  }

  // After 3333ms, add .non to .tf-intro-wrapper (if present)
  if (introWrapper) {
    setTimeout(() => introWrapper.classList.add('non'), 2222)
  }

  console.log('TF Intro animation started')
}

export { initTfIntro, startTfIntro }

export default initTfIntro
