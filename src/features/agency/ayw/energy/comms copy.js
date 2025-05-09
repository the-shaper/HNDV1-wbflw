import anime from 'animejs/lib/anime.es.js' // Or your specific import path for Anime.js
// Remove incorrect import - stagger is likely a method on the anime object
// import { stagger } from 'animejs/lib/anime.es.js'
// import { animate, stagger } from 'animejs'

// Global animation control variables
let mainTimeline
let currentDurationPerDot = 500 // Default initial duration, will be updated
let isAsyncEffectEnabled = false // Controls whether the async wave effect is active

/**
 * Internal helper function to initialize or restart the main animation.
 * It uses currentDurationPerDot and isAsyncEffectEnabled to configure the animation.
 */
function startOrUpdateMainAnimation() {
  const indicatorWrap = document.querySelector('.ayw-energycomms-indicatorwrap')
  if (!indicatorWrap) {
    console.warn(
      '[comms.js] Element with class .ayw-energycomms-indicatorwrap not found. Cannot start animation.'
    )
    return
  }

  const dayElements = Array.from(
    indicatorWrap.querySelectorAll('.ayw-energycomms-day')
  )
  if (dayElements.length === 0) {
    console.warn(
      '[comms.js] No .ayw-energycomms-day elements found. Cannot start animation.'
    )
    return
  }

  // Assign IDs for logging if not present
  dayElements.forEach((el, idx) => {
    if (!el.id) el.id = `comms-dot-${idx}`
  })

  // 1. Cleanup previous animation instance and visual state
  if (mainTimeline) {
    mainTimeline.pause()
    anime.remove(dayElements) // Remove targets from anime.js
  }
  dayElements.forEach((el) => {
    el.classList.remove('is-on')
    el.style.transform = '' // Reset any transforms
  })

  // 2. Validate currentDurationPerDot
  if (
    typeof currentDurationPerDot !== 'number' ||
    !isFinite(currentDurationPerDot) ||
    currentDurationPerDot <= 0
  ) {
    console.warn(
      `[comms.js] Invalid currentDurationPerDot (${currentDurationPerDot}). Animation will not run.`
    )
    // Ensure mainTimeline is null if we can't proceed
    mainTimeline = null
    return
  }

  const numberOfDots = dayElements.length
  const totalCycleDuration = currentDurationPerDot * numberOfDots

  console.log(
    `[comms.js] Starting/Updating main animation: ${numberOfDots} dots, ${currentDurationPerDot}ms/dot, total ${totalCycleDuration}ms. Async effect: ${isAsyncEffectEnabled}.`
  )

  // 3. Create new timeline
  mainTimeline = anime.timeline({
    loop: true,
    // Optional: Add loopComplete if needed for logging
    // loopComplete: function (anim) {
    //   console.log(
    //     '%cMAIN TIMELINE loop iteration finished. Restarting...',
    //     'color: orange; font-weight: bold;'
    //   )
    // },
  })

  // 4. Add animation segment to the timeline
  mainTimeline.add({
    targets: {}, // We control targets manually in the update callback
    duration: totalCycleDuration,
    easing: `steps(${numberOfDots})`, // Ensures one step per dot for the 'is-on' logic
    update: function (anim) {
      let currentStepIndex = Math.floor(
        anim.currentTime / currentDurationPerDot
      )
      currentStepIndex = Math.min(currentStepIndex, numberOfDots - 1)
      currentStepIndex = Math.max(currentStepIndex, 0)

      dayElements.forEach((dotElement, index) => {
        // --- Dot Lighting (Working Hours effect) ---
        if (index === currentStepIndex) {
          if (!dotElement.classList.contains('is-on')) {
            dotElement.classList.add('is-on')
          }
        } else {
          if (dotElement.classList.contains('is-on')) {
            dotElement.classList.remove('is-on')
          }
        }

        // --- Wave Effect (Async Hours visual) ---
        if (isAsyncEffectEnabled) {
          const distance = Math.min(
            Math.abs(index - currentStepIndex),
            numberOfDots - Math.abs(index - currentStepIndex)
          )
          const waveAmplitude = 8 // Max pixels to move for the wave
          // Cosine wave: peak at active dot (distance 0), diminishes
          const waveOffset =
            waveAmplitude * Math.cos((distance * Math.PI) / (numberOfDots / 2)) // Adjusted for smoother wave

          dotElement.style.transform = `translateY(${-waveOffset}px)`
        } else {
          // Ensure transform is cleared if async effect is disabled
          if (dotElement.style.transform !== '') {
            dotElement.style.transform = ''
          }
        }
      })
    },
    begin: function (anim) {
      // console.log('%cMain animation segment BEGINNING.', 'color: cyan;')
      // Initial visual reset can be ensured here too, though cleanup above handles it
      dayElements.forEach((el) => {
        el.classList.remove('is-on')
        if (!isAsyncEffectEnabled) {
          el.style.transform = ''
        }
      })
    },
    // complete: function (anim) {
    //   console.log('%cMain animation segment COMPLETED.', 'color: lightgreen;')
    // },
  })

  mainTimeline.play()
}

/**
 * Updates the duration for each dot in the main animation.
 * If an animation is running, it will be stopped and restarted with the new duration.
 * If not running and a valid duration is provided, it will be started.
 * @param {number | null} newDuration - The new duration in milliseconds. If null or invalid, stops animation.
 */
export function updateCommsDotDuration(newDuration) {
  const oldDuration = currentDurationPerDot

  if (
    typeof newDuration === 'number' &&
    newDuration > 0 &&
    isFinite(newDuration)
  ) {
    currentDurationPerDot = newDuration
    console.log(
      `[comms.js] Dot duration updated to: ${currentDurationPerDot}ms (from ${oldDuration}ms). Restarting animation.`
    )
    startOrUpdateMainAnimation()
  } else {
    console.warn(
      `[comms.js] Received invalid new duration: ${newDuration}. Stopping animation if running.`
    )
    currentDurationPerDot = Infinity // Set to invalid state
    if (mainTimeline) {
      mainTimeline.pause()
      // Clean up visual state of dots
      const indicatorWrap = document.querySelector(
        '.ayw-energycomms-indicatorwrap'
      )
      if (indicatorWrap) {
        const dayElements = indicatorWrap.querySelectorAll(
          '.ayw-energycomms-day'
        )
        dayElements.forEach((el) => {
          el.classList.remove('is-on')
          el.style.transform = ''
        })
      }
    }
    mainTimeline = null // Ensure it's cleared
    console.log('[comms.js] Animation stopped due to invalid duration.')
  }
}

/**
 * Enables or disables the asynchronous visual effect (e.g., wave).
 * This will restart the animation to apply the change.
 * @param {boolean} isEnabled - True to enable the async effect, false to disable.
 */
export function setAsyncEffectEnabled(isEnabled) {
  if (typeof isEnabled !== 'boolean') {
    console.error(
      '[comms.js] Invalid value for setAsyncEffectEnabled. Expecting boolean.'
    )
    return
  }
  if (isAsyncEffectEnabled === isEnabled) {
    console.log(
      `[comms.js] Async effect is already ${
        isEnabled ? 'enabled' : 'disabled'
      }. No change.`
    )
    return
  }

  isAsyncEffectEnabled = isEnabled
  console.log(
    `[comms.js] Async effect set to: ${isAsyncEffectEnabled}. Restarting animation.`
  )
  startOrUpdateMainAnimation()
}

// --- Removed/Commented Out Old Functions ---
// export function startWorkingHoursAnimation() { ... }
// export function stopWorkingHoursAnimation() { ... }
// export function startAsyncHoursAnimation() { ... }
// export function stopAsyncHoursAnimation() { ... }
// export function updateAsyncAnimation() { ... }
// export function testAsyncAnimation() { ... }
// export function toggleAnimationMode() { ... }

// --- How to use (example): ---
// Make sure your HTML is set up and this script is loaded.

// To initialize and start with default duration (500ms per dot, async effect off):
// updateCommsDotDuration(500); // Or some initial call from your main script

// To change speed:
// updateCommsDotDuration(1000); // 1 second per dot

// To enable the async (wave) effect:
// setAsyncEffectEnabled(true);

// To disable the async (wave) effect:
// setAsyncEffectEnabled(false);

// To stop the animation (e.g., by providing an invalid duration):
// updateCommsDotDuration(null);
// updateCommsDotDuration(0);
