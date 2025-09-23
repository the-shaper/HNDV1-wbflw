import anime from 'animejs'

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

  // Build timeline
  const tl = anime.timeline({ targets: el, autoplay: false })

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

  tl.play()

  // After 1200ms, add .no-bg to .tf-home-intro-content (if present)
  const homeIntroContent = document.querySelector('.tf-home-intro-content')
  if (homeIntroContent) {
    setTimeout(() => homeIntroContent.classList.add('no-bg'), 1333)
  }

  // After 2222ms, fade in .home-container from 0 → 1 opacity over 222ms
  const homeContainer = document.querySelector('.home-container')
  if (homeContainer) {
    homeContainer.style.opacity = '0'
    anime({
      targets: homeContainer,
      opacity: 1,
      delay: 1888,
      duration: 222,
      easing: 'linear',
    })
  }

  // After 3333ms, add .non to .tf-intro-wrapper (if present)
  const introWrapper = document.querySelector('.tf-intro-wrapper')
  if (introWrapper) {
    setTimeout(() => introWrapper.classList.add('non'), 2222)
  }
}

export default initTfIntro
