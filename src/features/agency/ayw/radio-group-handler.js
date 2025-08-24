/**
 * Updates the visual state (.is-pressed, .w--redirected-checked) for labels
 * within the same radio button group.
 * @param {HTMLElement} clickedLabel The clicked label element (.ayw-radiobutt).
 */
export function handleRadioGroupVisuals(clickedLabel) {
  const radioInput = clickedLabel.querySelector('input[type="radio"]')
  if (!radioInput) {
    console.error('Could not find radio input within label:', clickedLabel)
    return
  }
  const groupName = radioInput.getAttribute('name')
  if (!groupName) {
    console.error('Radio input is missing name attribute:', radioInput)
    return
  }

  // Find the direct container of the radio buttons for this group
  // Assumes structure like: .ayw-config-pair-wrapper > label.ayw-radiobutt > input
  const groupWrapper = clickedLabel.closest('.ayw-config-pair-wrapper')
  if (!groupWrapper) {
    console.error(
      'Could not find parent .ayw-config-pair-wrapper for radio group:',
      clickedLabel
    )
    // Fallback: Query the whole document (less efficient, might cross different groups if names collide)
    // const groupLabels = Array.from(
    //   document.querySelectorAll(`.ayw-radiobutt input[name="${groupName}"]`)
    // ).map(input => input.closest('.ayw-radiobutt'));
    // Instead of fallback, let's stop to enforce structure:
    return
  }

  // Find labels *only within this specific wrapper*
  const groupLabels = Array.from(
    groupWrapper.querySelectorAll(`.ayw-radiobutt input[name="${groupName}"]`)
  ).map((input) => input.closest('.ayw-radiobutt'))

  // Remove 'is-pressed' and Webflow checked state from all labels IN THIS GROUP/WRAPPER
  groupLabels.forEach((label) => {
    if (label) {
      label.classList.remove('is-pressed')
      const webflowInput = label.querySelector('.w-radio-input')
      if (webflowInput) {
        webflowInput.classList.remove('w--redirected-checked')
      }
    }
  })

  // Add 'is-pressed' and Webflow checked state to the CLICKED label/input
  clickedLabel.classList.add('is-pressed')
  const clickedWebflowInput = clickedLabel.querySelector('.w-radio-input')
  if (clickedWebflowInput) {
    clickedWebflowInput.classList.add('w--redirected-checked')
  }
}

/**
 * Toggles visuals and underlying state for a single checkbox wrapper.
 * Expects a structure like: .w-checkbox.ayw-checkbox.ielo > input[type="checkbox"].checkbox-ayw
 *
 * Behavior:
 * - Adds/removes .is-pressed on the wrapper based on checked state
 * - Adds/removes Webflow's .w--redirected-checked on the visual input element
 * - Toggles the native checkbox checked state and dispatches a change event
 *
 * @param {HTMLElement} clickedWrapper The clicked checkbox wrapper (.ayw-checkbox)
 * @returns {boolean|undefined} The new checked state, or undefined if failed
 */
export function handleCheckboxVisuals(clickedWrapper) {
  if (!clickedWrapper) {
    console.error('handleCheckboxVisuals: clickedWrapper is not provided')
    return
  }

  const checkboxInput = clickedWrapper.querySelector('input[type="checkbox"]')
  if (!checkboxInput) {
    console.error(
      'Could not find checkbox input within wrapper:',
      clickedWrapper
    )
    return
  }

  // Determine the next state and apply it to the input
  const nextChecked = !checkboxInput.checked
  checkboxInput.checked = nextChecked

  // Update wrapper pressed state
  if (nextChecked) {
    clickedWrapper.classList.add('is-pressed')
  } else {
    clickedWrapper.classList.remove('is-pressed')
  }

  // Update Webflow visual input state, if present
  const webflowInput = clickedWrapper.querySelector('.w-checkbox-input')
  if (webflowInput) {
    if (nextChecked) {
      webflowInput.classList.add('w--redirected-checked')
    } else {
      webflowInput.classList.remove('w--redirected-checked')
    }
  }

  // Notify any listeners that the value changed
  const changeEvent = new Event('change', { bubbles: true })
  checkboxInput.dispatchEvent(changeEvent)

  return nextChecked
}
