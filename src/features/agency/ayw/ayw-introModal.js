function initIntroModal() {
  const modalWrapper = document.querySelector('.ayw-intro-modal')
  const closeButton = document.getElementById('openAYW')
  const logElement = document.getElementById('AYW-introLog')

  if (!modalWrapper || !closeButton) {
    console.warn(
      'Intro modal wrapper (.ayw-intro-modal) or close button (#openAYW) not found. AYW Intro Modal script will not run.'
    )
    return
  }

  // Log tracker functionality
  if (logElement) {
    // Update to second state when this module initializes
    logElement.textContent = 'Loading config in 2...'

    // After a delay, update to "1..."
    setTimeout(() => {
      logElement.textContent = 'Loading config in 1...'

      // Then after 0.3 seconds, show final message
      setTimeout(() => {
        logElement.textContent = 'All Systems Go!'
      }, 300) // 0.3 seconds
    }, 800) // 800ms delay before showing "1..."
  } else {
    console.warn('Log element (#AYW-introLog) not found.')
  }

  const handleClose = () => {
    modalWrapper.classList.remove('on')

    modalWrapper.addEventListener(
      'transitionend',
      function handler(event) {
        if (event.propertyName === 'opacity') {
          modalWrapper.removeEventListener('transitionend', handler)
        }
      },
      { once: true }
    )
  }

  closeButton.addEventListener('click', handleClose)

  console.log('AYW Intro Modal script initialized.')
}

export default initIntroModal
