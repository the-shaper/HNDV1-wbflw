function initTfHomeUI() {
  console.log('Initializing TF Home UI interactions.')

  const triggerIds = ['tfNav1', 'tfNav2', 'tfNav3', 'tfNav4']
  const targetIds = ['tfNavTxt1', 'tfNavTxt2', 'tfNavTxt3', 'tfNavTxt4']
  const hoverClass = 'hover' // Define the class name once for reusability and clarity

  // Ensure arrays are of the same length to avoid mismatches
  if (triggerIds.length !== targetIds.length) {
    console.error(
      'Error: Trigger and Target ID arrays have different lengths. Please check your configuration.'
    )
    return // Early return if configuration is mismatched
  }

  triggerIds.forEach((triggerId, index) => {
    const triggerElement = document.getElementById(triggerId)
    const targetElement = document.getElementById(targetIds[index])

    // Early return/continue if elements are not found
    if (!triggerElement) {
      console.warn(
        `Warning: Trigger element with ID "${triggerId}" not found. Skipping setup for this pair.`
      )
      return // Use return in forEach to skip current iteration
    }
    if (!targetElement) {
      console.warn(
        `Warning: Target element with ID "${targetIds[index]}" not found for trigger "${triggerId}". Skipping setup.`
      )
      return // Use return in forEach to skip current iteration
    }

    // Add mouseover event listener
    triggerElement.addEventListener('mouseover', () => {
      targetElement.classList.add(hoverClass)
      // console.log(`Hovered over #${triggerId}. Added .${hoverClass} to #${targetIds[index]}`);
    })

    // Add mouseout event listener
    triggerElement.addEventListener('mouseout', () => {
      targetElement.classList.remove(hoverClass)
      // console.log(`Hovered out of #${triggerId}. Removed .${hoverClass} from #${targetIds[index]}`);
    })
  })
}

// Export the function as default for dynamic import in main.js
export default initTfHomeUI
