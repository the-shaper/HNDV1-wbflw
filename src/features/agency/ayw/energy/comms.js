import anime from 'animejs/lib/anime.es.js' // Standard ES import

// Module-scoped variables
let mainTimeline
let currentDurationPerDot = Infinity // Start in a "paused" state, waiting for the first valid duration
let isStaggerEffectEnabled = true // User requested default true
let isDotXMotionEnabled = false // Defined from previous step, ensure it's here
let activeDotXAnimation = null // Defined from previous step, ensure it's here
let staggerWaveSpeedMode = 'sync' // 'sync' or 'custom'
let customStaggerWaveDuration = 200 // Default custom duration in ms

// New state for independent wave
let isIndependentWaveMotionEnabled = true // Default to off
let independentWaveAnimation = null // Instance for the independent wave animation

const DAY_ELEMENT_SELECTOR = '.ayw-energycomms-day'
const ACTIVE_CLASS = 'is-on'
const INDICATOR_WRAP_SELECTOR = '.ayw-energycomms-indicatorwrap'

// Constants for the independent wave
const INDEPENDENT_WAVE_AMPLITUDE = 22 // px
const INDEPENDENT_WAVE_CYCLE_MS = 500 // ms for a full up-and-down cycle
const INDEPENDENT_WAVE_STAGGER_DELAY = 111 // ms delay per dot for the wave

/**
 * Initializes or restarts the main day highlight animation and the optional synchronized wave effect.
 * Uses currentDurationPerDot to configure the animation speed.
 */
function startOrUpdateDayHighlightAnimation() {
  const indicatorWrap = document.querySelector(INDICATOR_WRAP_SELECTOR)
  if (!indicatorWrap) {
    console.warn(
      `[comms.js] Element with selector "${INDICATOR_WRAP_SELECTOR}" not found. Cannot start animation.`
    )
    return
  }

  const dayElements = Array.from(
    indicatorWrap.querySelectorAll(DAY_ELEMENT_SELECTOR)
  )

  if (dayElements.length === 0) {
    console.warn(
      `[comms.js] No elements found with selector "${DAY_ELEMENT_SELECTOR}". Cannot start animation.`
    )
    return
  }

  // 1. Enhanced Cleanup: Stop and remove all previous Anime.js animations and reset styles
  if (mainTimeline) {
    mainTimeline.pause()
    mainTimeline = null
  }
  if (independentWaveAnimation) {
    independentWaveAnimation.pause()
    independentWaveAnimation = null
  }

  anime.remove(dayElements) // Remove all anime animations from the elements

  dayElements.forEach((el) => {
    el.classList.remove(ACTIVE_CLASS)
    el.style.transform = '' // Reset any transforms
  })

  let previousStepIndex = -1 // Initialize previousStepIndex for tracking active dot changes

  // 2. Validate currentDurationPerDot.
  // ... existing code ...
  if (typeof currentDurationPerDot !== 'number' || currentDurationPerDot <= 0) {
    if (!isFinite(currentDurationPerDot) && currentDurationPerDot > 0) {
      console.log(
        '[comms.js] currentDurationPerDot is Infinity. Animations will be paused.'
      )
    } else {
      console.warn(
        `[comms.js] Invalid currentDurationPerDot (${currentDurationPerDot}). Animations will not run or will be paused.`
      )
      return
    }
  }

  const numberOfDots = dayElements.length
  const totalCycleDuration = currentDurationPerDot * numberOfDots

  console.log(
    `[comms.js] Starting/Updating animations: ${numberOfDots} dots, ${currentDurationPerDot}ms/dot, total cycle ${totalCycleDuration}ms. Synced Wave: ${
      isStaggerEffectEnabled && !isIndependentWaveMotionEnabled
    }, Independent Wave: ${
      isStaggerEffectEnabled && isIndependentWaveMotionEnabled
    }.`
  )

  // 3. Create new timeline for the "is-on" class animation and potentially synced wave
  mainTimeline = anime.timeline({
    loop: true,
  })

  mainTimeline.add({
    targets: dayElements,
    duration: totalCycleDuration,
    easing: `steps(${numberOfDots})`,
    update: function (anim) {
      if (!isFinite(currentDurationPerDot) || currentDurationPerDot <= 0) {
        dayElements.forEach((dotElement) => {
          if (dotElement.classList.contains(ACTIVE_CLASS)) {
            dotElement.classList.remove(ACTIVE_CLASS)
          }
          // Synced wave specific reset if it was active and now paused
          if (
            isStaggerEffectEnabled &&
            !isIndependentWaveMotionEnabled &&
            dotElement.style.transform !== ''
          ) {
            const currentX = isDotXMotionEnabled
              ? anime.get(dotElement, 'translateX', 'px') || '0px'
              : '0px'
            anime.set(dotElement, { translateY: 0, translateX: currentX })
          }
        })
        return
      }

      const currentStepIndex = Math.min(
        Math.floor(anim.currentTime / currentDurationPerDot),
        numberOfDots - 1
      )

      dayElements.forEach((dotElement, index) => {
        if (index === currentStepIndex) {
          if (!dotElement.classList.contains(ACTIVE_CLASS)) {
            dotElement.classList.add(ACTIVE_CLASS)
          }
        } else {
          if (dotElement.classList.contains(ACTIVE_CLASS)) {
            dotElement.classList.remove(ACTIVE_CLASS)
          }
        }
      })

      // Synced Wave Logic (only if enabled AND independent wave is OFF)
      if (
        isStaggerEffectEnabled &&
        !isIndependentWaveMotionEnabled &&
        currentStepIndex !== previousStepIndex
      ) {
        if (
          numberOfDots > 0 &&
          isFinite(currentDurationPerDot) &&
          currentDurationPerDot > 0
        ) {
          const waveAmplitude = 10
          let waveTransitionDuration
          if (staggerWaveSpeedMode === 'custom') {
            waveTransitionDuration = customStaggerWaveDuration
          } else {
            waveTransitionDuration = Math.min(currentDurationPerDot / 3, 250)
          }
          if (waveTransitionDuration <= 0) waveTransitionDuration = 50

          dayElements.forEach((dotElement, elementIdx) => {
            const distance = Math.min(
              Math.abs(elementIdx - currentStepIndex),
              numberOfDots - Math.abs(elementIdx - currentStepIndex)
            )
            let targetY = 0
            if (numberOfDots > 1) {
              const normalizedDistanceFactor = distance / (numberOfDots / 2)
              targetY =
                -waveAmplitude *
                Math.cos(normalizedDistanceFactor * (Math.PI / 2))
            } else if (numberOfDots === 1) {
              targetY = elementIdx === currentStepIndex ? -waveAmplitude : 0
            }

            const currentX = isDotXMotionEnabled
              ? anime.get(dotElement, 'translateX', 'px') || '0px'
              : '0px'
            anime({
              targets: dotElement,
              translateY: targetY,
              translateX: currentX,
              duration: waveTransitionDuration,
              easing: 'easeOutQuad',
            })
          })
        }
      }
      // (No 'else if' for independent wave here, it runs separately)

      if (currentStepIndex !== previousStepIndex) {
        previousStepIndex = currentStepIndex
      }
    },
    begin: function () {
      dayElements.forEach((el) => {
        el.classList.remove(ACTIVE_CLASS)
        // Transform reset is handled globally at the start of startOrUpdateDayHighlightAnimation.
        // Initial state for SYNCED wave (if active)
        if (
          isStaggerEffectEnabled &&
          !isIndependentWaveMotionEnabled &&
          numberOfDots > 0 &&
          isFinite(currentDurationPerDot) &&
          currentDurationPerDot > 0
        ) {
          const initialActiveIndex = 0
          const waveAmplitude = 10
          dayElements.forEach((dotElement, elementIdx) => {
            const distance = Math.min(
              Math.abs(elementIdx - initialActiveIndex),
              numberOfDots - Math.abs(elementIdx - initialActiveIndex)
            )
            let targetY = 0
            if (numberOfDots > 1) {
              const normalizedDistanceFactor = distance / (numberOfDots / 2)
              targetY =
                -waveAmplitude *
                Math.cos(normalizedDistanceFactor * (Math.PI / 2))
            } else if (numberOfDots === 1) {
              targetY = -waveAmplitude
            }
            const currentX = isDotXMotionEnabled
              ? anime.get(dotElement, 'translateX', 'px') || '5px'
              : '0px'
            anime.set(dotElement, { translateY: targetY, translateX: currentX })
          })
          previousStepIndex = initialActiveIndex // Set for the first update cycle
        } else {
          // If synced wave is not active, initial Y is 0 (from global reset)
          // or will be set by independent wave.
          // X motion, if any for dot 0, would be handled by activeDotXAnimation.
        }
      })
      previousStepIndex = -1 // Reset for the very start of the timeline loop
    },
  })

  if (isFinite(totalCycleDuration) && totalCycleDuration > 0) {
    mainTimeline.play()
  } else {
    mainTimeline.pause()
    console.log(
      '[comms.js] Main timeline effectively paused due to non-finite or zero total cycle duration.'
    )
  }

  // 3. Independent Wave Animation (if enabled)
  if (isStaggerEffectEnabled && isIndependentWaveMotionEnabled) {
    independentWaveAnimation = anime({
      targets: dayElements,
      translateY: [
        {
          value: -INDEPENDENT_WAVE_AMPLITUDE,
          duration: INDEPENDENT_WAVE_CYCLE_MS / 2,
          easing: 'easeInOutSine',
        },
        {
          value: 0,
          duration: INDEPENDENT_WAVE_CYCLE_MS / 2,
          easing: 'easeInOutSine',
        },
        // To make it a full wave (down then up) and loop smoothly back to start:
        // { value: INDEPENDENT_WAVE_AMPLITUDE, duration: INDEPENDENT_WAVE_CYCLE_MS / 4, easing: 'easeInOutSine' },
        // { value: 0, duration: INDEPENDENT_WAVE_CYCLE_MS / 4, easing: 'easeInOutSine' }
        // The current two keyframes (down to -amp, up to 0) will repeat.
      ],
      loop: true,
      delay: anime.stagger(INDEPENDENT_WAVE_STAGGER_DELAY),
      // Note: This animation only sets translateY. If isDotXMotionEnabled is true,
      // translateX should be handled by a separate animation (e.g., activeDotXAnimation)
      // and Anime.js should compose these transforms.
    })

    if (!isFinite(currentDurationPerDot) || currentDurationPerDot <= 0) {
      independentWaveAnimation.pause()
    } else {
      independentWaveAnimation.play()
    }
  }
}

/**
 * Updates the duration for each dot in the day highlight animation.
 * If an animation is running, it will be stopped and restarted with the new duration.
 * If not running and a valid duration is provided, it will be started.
 * @param {number | null} newDuration - The new duration in milliseconds for each dot.
 *                                     If null, 0, or not a positive finite number,
 *                                     the animation will be paused/stopped.
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
  } else {
    console.warn(
      `[comms.js] Received invalid new duration: ${newDuration}. Animation will be paused/stopped.`
    )
    currentDurationPerDot = Infinity // Set to Infinity to signal a paused state
  }

  // Always restart/update, even if pausing. startOrUpdate will handle invalid durations.
  startOrUpdateDayHighlightAnimation()
}

/**
 * Enables or disables the synchronized wave effect on the dots.
 * This will restart the animations to apply the change.
 * @param {boolean} isEnabled - True to enable the synchronized wave effect, false to disable.
 */
export function setStaggerEffectEnabled(isEnabled) {
  if (typeof isEnabled !== 'boolean') {
    console.error(
      '[comms.js] Invalid value for setStaggerEffectEnabled. Expecting boolean.'
    )
    return
  }
  if (isStaggerEffectEnabled === isEnabled) {
    console.log(
      `[comms.js] Master wave effect is already ${
        isEnabled ? 'enabled' : 'disabled'
      }. No change.`
    )
    return
  }

  isStaggerEffectEnabled = isEnabled
  console.log(
    `[comms.js] Master wave effect set to: ${isStaggerEffectEnabled}. Restarting animations.`
  )
  // Cleanup is handled by startOrUpdateDayHighlightAnimation
  startOrUpdateDayHighlightAnimation()
}

/**
 * Enables or disables the independent wave motion.
 * This requires isStaggerEffectEnabled to also be true for the wave to show.
 * @param {boolean} isEnabled - True to enable the independent wave motion, false to disable.
 */
export function setIndependentWaveMotionEnabled(isEnabled) {
  if (typeof isEnabled !== 'boolean') {
    console.error(
      '[comms.js] Invalid value for setIndependentWaveMotionEnabled. Expecting boolean.'
    )
    return
  }
  if (isIndependentWaveMotionEnabled === isEnabled) {
    console.log(
      `[comms.js] Independent wave motion is already ${
        isEnabled ? 'enabled' : 'disabled'
      }. No change.`
    )
    return
  }

  isIndependentWaveMotionEnabled = isEnabled
  console.log(
    `[comms.js] Independent wave motion set to: ${isIndependentWaveMotionEnabled}. Restarting animations.`
  )
  // Cleanup and re-evaluation of wave effects are handled by startOrUpdateDayHighlightAnimation
  startOrUpdateDayHighlightAnimation()
}

// Example of how energy.js might call this:
// import { updateCommsDotDuration, setStaggerEffectEnabled, setIndependentWaveMotionEnabled } from './comms.js';
//
// function onOrbitSpeedChange(newOrbitSpeed) {
//   const newDotMs = getDaySegmentDurationMilliseconds(newOrbitSpeed);
//   updateCommsDotDuration(newDotMs);
// }
//
// // To enable independent wave:
// setStaggerEffectEnabled(true);
// setIndependentWaveMotionEnabled(true);
//
// // To enable synced wave:
// setStaggerEffectEnabled(true);
// setIndependentWaveMotionEnabled(false);
//
// // To disable all waves:
// setStaggerEffectEnabled(false);
// // setIndependentWaveMotionEnabled(false); // This would also work, or just the master toggle.

// Optional: Automatically start with a default (paused) state if no external call is made.
// This ensures that if `updateCommsDotDuration` is never called, the animation doesn't try to run with undefined behavior.
// However, it's better to rely on the controlling module (e.g., energy.js) to initialize the timing.
// If energy.js is guaranteed to call updateCommsDotDuration on its init, this immediate call isn't strictly necessary.
// For robustness, ensuring the animation is in a defined state (even if paused) initially can be good.
// startOrUpdateDayHighlightAnimation(); // This would try to start with currentDurationPerDot = Infinity (paused)
