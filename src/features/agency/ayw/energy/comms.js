import anime from 'animejs/lib/anime.es.js' // Or your specific import path for Anime.js
// Remove incorrect import - stagger is likely a method on the anime object
// import { stagger } from 'animejs/lib/anime.es.js'
// import { animate, stagger } from 'animejs'

// Variable to store the timeline instance, allowing us to control it later (e.g., pause, switch modes)
let workingHoursTimeline
// Variable to store the async wave animation
let asyncHoursTimeline

// Initialize with a sensible default, or Infinity if you want it to wait for the first update
let currentDurationPerDot = 500 // Default initial duration, will be updated

/**
 * Updates the duration for each dot in the comms animation.
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
      `[comms.js] Dot duration updated to: ${currentDurationPerDot}ms (from ${oldDuration}ms)`
    )

    // Check if animation instance exists and was ever configured/played
    const isTimelineInitialized =
      workingHoursTimeline && workingHoursTimeline.duration > 0

    if (
      isTimelineInitialized &&
      (workingHoursTimeline.playing || !workingHoursTimeline.paused)
    ) {
      // If actively running or was running
      if (oldDuration !== currentDurationPerDot) {
        console.log(
          '[comms.js] Animation running, restarting with new duration.'
        )
        stopWorkingHoursAnimation() // Cleanly stop
        startWorkingHoursAnimation() // Restart with new currentDurationPerDot
      }
    } else {
      // Not running (never started, paused, or stopped due to invalid duration)
      console.log(
        '[comms.js] Animation not actively running. Attempting to start/restart with new valid duration.'
      )
      // This will effectively start it if it was paused due to invalid duration,
      // or if it's the first time a valid duration is set.
      // Ensure clean state if it was merely paused/partially configured
      if (workingHoursTimeline) {
        stopWorkingHoursAnimation()
      }
      startWorkingHoursAnimation()
    }

    // Add this at the end of the function
    if (asyncHoursTimeline && !asyncHoursTimeline.paused) {
      updateAsyncAnimation()
    }
  } else {
    console.warn(
      `[comms.js] Received invalid new duration: ${newDuration}. Stopping animation if running.`
    )
    currentDurationPerDot = Infinity // Set to invalid state
    if (workingHoursTimeline && workingHoursTimeline.playing) {
      stopWorkingHoursAnimation()
    }
  }
}

/**
 * Starts the "working hours" animation mode.
 * Dots light up sequentially in a loop using the global currentDurationPerDot.
 */
export function startWorkingHoursAnimation() {
  // Use the globally stored currentDurationPerDot
  const durationPerDot = currentDurationPerDot

  if (!isFinite(durationPerDot) || durationPerDot <= 0) {
    console.warn(
      `[comms.js] Cannot start animation with invalid durationPerDot: ${durationPerDot}`
    )
    // Ensure any existing animation is stopped if it somehow was running
    if (workingHoursTimeline && workingHoursTimeline.playing) {
      stopWorkingHoursAnimation()
    }
    return
  }

  const indicatorWrap = document.querySelector('.ayw-energycomms-indicatorwrap')
  if (!indicatorWrap) {
    console.warn('Element with class .ayw-energycomms-indicatorwrap not found.')
    return
  }

  const dayElements = Array.from(
    indicatorWrap.querySelectorAll('.ayw-energycomms-day')
  )
  if (dayElements.length === 0) {
    console.warn(
      'No .ayw-energycomms-day elements found within .ayw-energycomms-indicatorwrap.'
    )
    return
  }

  // Assign IDs for logging if not present
  dayElements.forEach((el, idx) => {
    if (!el.id) el.id = `comms-dot-${idx}`
  })

  if (workingHoursTimeline) {
    workingHoursTimeline.pause()
    anime.remove(dayElements) // Clean up targets from previous anime instance
    dayElements.forEach((el) => el.classList.remove('is-on'))
  }

  const numberOfDots = dayElements.length
  const totalCycleDuration = durationPerDot * numberOfDots

  console.log(
    `[comms.js] Starting animation: ${numberOfDots} dots, ${durationPerDot}ms/dot, total ${totalCycleDuration}ms.`
  )

  workingHoursTimeline = anime.timeline({
    loop: true,
    loopComplete: function (anim) {
      // console.log(
      //   '%cTIMELINE loop iteration finished. Restarting...',
      //   'color: orange; font-weight: bold;'
      // )
    },
  })

  workingHoursTimeline.add({
    targets: {},
    duration: totalCycleDuration,
    easing: `steps(${numberOfDots})`,
    update: function (anim) {
      let currentStepIndex = Math.floor(anim.currentTime / durationPerDot)
      currentStepIndex = Math.min(currentStepIndex, numberOfDots - 1)
      currentStepIndex = Math.max(currentStepIndex, 0) // Ensure not negative if currentTime is weird

      dayElements.forEach((dotElement, index) => {
        if (index === currentStepIndex) {
          if (!dotElement.classList.contains('is-on')) {
            dotElement.classList.add('is-on')
          }
        } else {
          if (dotElement.classList.contains('is-on')) {
            dotElement.classList.remove('is-on')
          }
        }
      })
    },
    begin: function (anim) {
      // console.log('%cSingle animation segment BEGINNING.', 'color: cyan;')
      dayElements.forEach((el) => el.classList.remove('is-on'))
    },
    complete: function (anim) {
      // console.log('%cSingle animation segment COMPLETED.', 'color: lightgreen;')
    },
  })
}

//STAGGERWAVE
// animate('.ayw-energycomms-day', {
//   x: stagger(['2rem', '-2rem'], { ease: 'inOut(3)' }),
//   delay: stagger(100, { ease: 'inOut(3)' }),
//   loop: true,
// })

/**
 * Stops the "working hours" animation mode and resets dots.
 */
export function stopWorkingHoursAnimation() {
  if (workingHoursTimeline) {
    console.log('[comms.js] Stopping working hours animation.')
    workingHoursTimeline.pause()
    // Optional: Reset timeline progress to 0 if desired on stop
    // workingHoursTimeline.seek(0);

    // Visually reset the dots
    const indicatorWrap = document.querySelector(
      '.ayw-energycomms-indicatorwrap'
    )
    if (indicatorWrap) {
      const dayElements = indicatorWrap.querySelectorAll('.ayw-energycomms-day')
      dayElements.forEach((el) => {
        el.classList.remove('is-on')
        // It's good practice to remove targets from anime.js if the timeline might be discarded
        // or to prevent issues if a new timeline is created with the same targets.
        // However, anime.remove(dayElements) is better placed before creating a new timeline.
      })
    }
  }
}

/**
 * Starts the async hours animation that creates a wave effect where
 * the active dot is at the peak of the wave.
 */
export function startAsyncHoursAnimation() {
  const durationPerDot = currentDurationPerDot

  if (!isFinite(durationPerDot) || durationPerDot <= 0) {
    console.warn(
      `[comms.js] Cannot start async animation with invalid durationPerDot: ${durationPerDot}`
    )
    if (asyncHoursTimeline && !asyncHoursTimeline.paused) {
      stopAsyncHoursAnimation()
    }
    return
  }

  const indicatorWrap = document.querySelector('.ayw-energycomms-indicatorwrap')
  if (!indicatorWrap) {
    console.warn('Element with class .ayw-energycomms-indicatorwrap not found.')
    return
  }

  const dayElements = Array.from(
    indicatorWrap.querySelectorAll('.ayw-energycomms-day')
  )
  if (dayElements.length === 0) {
    console.warn(
      'No .ayw-energycomms-day elements found within .ayw-energycomms-indicatorwrap.'
    )
    return
  }

  // Clean up previous animation if it exists
  if (asyncHoursTimeline) {
    asyncHoursTimeline.pause()
    anime.remove(dayElements, 'translateY')
  }

  // Reset all transforms to ensure clean state
  dayElements.forEach((el) => {
    el.style.transform = ''
  })

  const numberOfDots = dayElements.length
  const totalCycleDuration = durationPerDot * numberOfDots

  console.log(
    `[comms.js] Starting async animation: ${numberOfDots} dots, ${durationPerDot}ms/dot, total ${totalCycleDuration}ms.`
  )

  // Create the async wave animation
  asyncHoursTimeline = anime.timeline({
    loop: true,
  })

  // Add wave animation
  asyncHoursTimeline.add({
    targets: {},
    duration: totalCycleDuration,
    easing: 'linear',
    update: function (anim) {
      let currentStepIndex = Math.floor(anim.currentTime / durationPerDot)
      currentStepIndex = Math.min(currentStepIndex, numberOfDots - 1)
      currentStepIndex = Math.max(currentStepIndex, 0)

      // Calculate position in wave for each dot relative to active dot
      dayElements.forEach((dotElement, index) => {
        // Calculate distance from current active dot (considering circular arrangement)
        const distance = Math.min(
          Math.abs(index - currentStepIndex),
          numberOfDots - Math.abs(index - currentStepIndex)
        )

        // Create wave effect - dots further from active dot move less
        const waveAmplitude = 10 // Max pixels to move
        const waveOffset = waveAmplitude * Math.cos(distance * (Math.PI / 3))

        // Apply transform - active dot at peak (most negative Y is highest visually)
        dotElement.style.transform = `translateY(${-waveOffset}px)`

        // Set active dot
        if (index === currentStepIndex) {
          if (!dotElement.classList.contains('is-on')) {
            dotElement.classList.add('is-on')
          }
        } else {
          if (dotElement.classList.contains('is-on')) {
            dotElement.classList.remove('is-on')
          }
        }
      })
    },
  })
}

/**
 * Stops the async hours animation and resets the wave effect.
 */
export function stopAsyncHoursAnimation() {
  if (asyncHoursTimeline) {
    console.log('[comms.js] Stopping async hours animation.')
    asyncHoursTimeline.pause()

    // Reset the transformations on dots
    const indicatorWrap = document.querySelector(
      '.ayw-energycomms-indicatorwrap'
    )
    if (indicatorWrap) {
      const dayElements = indicatorWrap.querySelectorAll('.ayw-energycomms-day')
      dayElements.forEach((el) => {
        el.style.transform = ''

        // Only remove is-on class if workingHoursTimeline is not active
        if (!workingHoursTimeline || workingHoursTimeline.paused) {
          el.classList.remove('is-on')
        }
      })
    }
  }
}

/**
 * Updates the async animation when the dot duration changes.
 * Call this whenever currentDurationPerDot changes.
 */
export function updateAsyncAnimation() {
  if (asyncHoursTimeline && !asyncHoursTimeline.paused) {
    stopAsyncHoursAnimation()
    startAsyncHoursAnimation()
  }
}

// The animation will now be started/restarted by updateCommsDotDuration
// when a valid duration is set, including on the initial setup call from energy.js.
// So, no explicit auto-start call needed here in comms.js itself.

// --- How to use (example): ---
// Make sure your HTML is set up and this script is loaded.
// Then, you can call:
// startWorkingHoursAnimation(); // Starts with default 500ms per dot
// startWorkingHoursAnimation(1000); // Starts with 1 second per dot

// To stop it:
// stopWorkingHoursAnimation();

// Test functions for the async hours animation
export function testAsyncAnimation() {
  // Stop working hours animation first to avoid conflicts
  stopWorkingHoursAnimation()
  // Start the async animation
  startAsyncHoursAnimation()
  console.log('[comms.js] Testing async animation started')
}

export function toggleAnimationMode() {
  if (asyncHoursTimeline && !asyncHoursTimeline.paused) {
    // Switch to regular mode
    stopAsyncHoursAnimation()
    startWorkingHoursAnimation()
    console.log('[comms.js] Switched to regular animation')
  } else if (workingHoursTimeline && !workingHoursTimeline.paused) {
    // Switch to async mode
    stopWorkingHoursAnimation()
    startAsyncHoursAnimation()
    console.log('[comms.js] Switched to async animation')
  } else {
    // Nothing running, start async
    startAsyncHoursAnimation()
    console.log('[comms.js] Started async animation')
  }
}

// Uncomment one of these lines to test
// testAsyncAnimation(); // Start just the async animation
// toggleAnimationMode(); // Toggle between animation modes
