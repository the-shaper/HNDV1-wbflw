import anime from 'animejs/lib/anime.es.js' // Standard ES import

// Module-scoped variables
let mainTimeline
let isDotXMotionEnabled = false // Retain for now, controlled by config
let activeDotXAnimation = null

// New state for independent wave
let independentWaveAnimation = null

// --- New module-scoped variables for tasks icon and combo classes ---
let tasksIconRotationAnimation = null
let currentMoon1ComboSuffix = null
let currentMoon2ComboSuffix = null
const TASKS_ICON_WRAP_SELECTOR = '.energy-checkpoints-iconwrap.tasks'
const MOON1_ICON_SELECTOR = '#moon1'
const MOON2_ICON_SELECTOR = '#moon2'

// --- New module-scoped variables for checkpoint signal ---
const CHCKPT_DOT1_SELECTOR = '#chckpt-dot1'
const CHCKPT_DOT2_SELECTOR = '#chckpt-dot2'
let checkpointSignalIntervalId = null
let checkpointSignalActiveDotElement = null // Stores the DOM element that is currently "active"
let checkpointSignalLastUsedSuffix = null // Stores the suffix string used by the last interval

// --- New module-scoped variables for RV Icon Sequence ---
const RV_ICON_SELECTORS = [
  '#energy-rvIcon1',
  '#energy-rvIcon2',
  '#energy-rvIcon3',
]
let rvIconElements = [] // Will be populated with DOM elements
let rvIconSequenceTimeoutId = null
let rvIconSequenceCurrentLogicalIndex = 0 // 0, 1, or 2, represents the step in the 3-item sequence
let rvIconSequenceActiveDOMElement = null // Stores the DOM element that is currently "on"
let rvIconSequenceLastUsedSuffix = null // Stores the suffix string used by the last sequence

// --- New module-scoped variables for energyCore rotation and bounce ---
let energyCoreRotationAnimation = null
const ENERGY_CORE_SELECTOR = '#energyCore'

// --- Configuration Modes ---
const commsModeConfigs = {
  A: {
    durationPerDot: Infinity,
    masterWaveEnabled: true,
    independentWaveEnabled: false,
    dotXMotionEnabled: false,
    waveSpeedMode: 'sync',
    customWaveDuration: 200,
    independentWaveAmplitude: 14,
    independentWaveCycleMs: 500,
    independentWaveStaggerDelay: 111,
    activeDotColor: '#FF3C23', // Example: Orange-Red for Mode A
    tasksIconRotationSpeed: 111, // Degrees per second. A lower number means slower. e.g., 36 for a 10-second rotation.
    moon1IconComboSuffix: 'orange', // Suffix for #moon1 in Mode A
    moon2IconComboSuffix: 'transparent', // Suffix for #moon2 in Mode A
    // --- New checkpoint signal parameters for Mode A ---
    checkpointSignalSuffix: 'litup', // Example suffix for Mode A
    checkpointSignalIntervalMs: 1000, // e.g., alternate every 1 second
    // --- New RV Icon Sequence parameters for Mode A ---
    rvIconSequenceSuffix: 'orange', // Example suffix for Mode A
    rvIconSequenceDirection: 'backward', // 'forward' (1->2->3) or 'backward' (3->2->1)
    rvIconLitDurationMs: 333, // How long each icon stays lit
    rvIconSequenceLoopDelayMs: 1990, // Pause AFTER a full 1,2,3 sequence
    // --- New energyCore rotation parameters for Mode A ---
    energyCoreRotationDegrees: -360, // Resting position
    energyCoreRotationDuration: 111, // Duration for the rotation animation in ms
    energyCoreRotationEasing: 'easeInOutQuad', // Easing function
    energyCoreBounceScales: [1, 0.85, 1.15, 1], // Bounce sequence: base -> small -> big -> base
    energyCoreBounceTimings: [0, 25, 60, 100], // Timing percentages for each scale step
  },
  B: {
    durationPerDot: 300,
    masterWaveEnabled: true,
    independentWaveEnabled: true,
    dotXMotionEnabled: false, //delete this and its corresponding code
    waveSpeedMode: 'custom',
    customWaveDuration: 33,
    independentWaveAmplitude: 19,
    independentWaveCycleMs: 469,
    independentWaveStaggerDelay: 45,
    activeDotColor: '#00A9FF', // Example: Blue for Mode B
    tasksIconRotationSpeed: 88, // Faster rotation, e.g., 5-second rotation
    moon1IconComboSuffix: 'blue', // Suffix for #moon1 in Mode B
    moon2IconComboSuffix: 'blue', // Suffix for #moon2 in Mode B
    // --- New checkpoint signal parameters for Mode B ---
    checkpointSignalSuffix: 'litup', // Example suffix for Mode B
    checkpointSignalIntervalMs: 500, // e.g., alternate every 0.5 seconds
    // --- New RV Icon Sequence parameters for Mode B ---
    rvIconSequenceSuffix: 'blue', // Example suffix for Mode B
    rvIconSequenceDirection: 'backward', // 'forward' (1->2->3) or 'backward' (3->2->1)
    rvIconLitDurationMs: 222, // How long each icon stays lit
    rvIconSequenceLoopDelayMs: 444, // Pause AFTER a full 1,2,3 sequence
    // --- New energyCore rotation parameters for Mode B ---
    energyCoreRotationDegrees: 180, // 180 degrees rotation
    energyCoreRotationDuration: 111, // Slightly faster duration for Mode B
    energyCoreRotationEasing: 'easeInOutQuad', // Easing function
    energyCoreBounceScales: [1, 0.8, 1.2, 1], // More dramatic bounce for Mode B
    energyCoreBounceTimings: [0, 30, 65, 100], // Slightly different timing for variety
  },
}

let activeCommsConfig = {} // Will be initialized by initCommsSystem

const DAY_ELEMENT_SELECTOR = '.ayw-energycomms-day'
const ACTIVE_CLASS = 'is-on'
const INDICATOR_WRAP_SELECTOR = '.ayw-energycomms-indicatorwrap.messaging'

/**
 * Manages the continuous rotation animation for the tasks icon.
 * @param {object} config - The activeCommsConfig for the current mode.
 */
function updateTasksIconRotation(config) {
  const iconWrap = document.querySelector(TASKS_ICON_WRAP_SELECTOR)
  if (!iconWrap) {
    console.warn(
      `[comms.js] Element "${TASKS_ICON_WRAP_SELECTOR}" not found for rotation.`
    )
    return
  }

  if (tasksIconRotationAnimation) {
    tasksIconRotationAnimation.pause()
    anime.remove(iconWrap) // Remove previous animation instance and its transforms
    tasksIconRotationAnimation = null
  }

  const rotationSpeedDps = config.tasksIconRotationSpeed // Degrees per second

  if (typeof rotationSpeedDps !== 'number' || rotationSpeedDps <= 0) {
    console.log(
      '[comms.js] Tasks icon rotation speed is zero or invalid. Rotation paused.'
    )
    iconWrap.style.transform = 'rotate(0deg)' // Reset rotation
    return
  }

  // Duration for one full 360-degree rotation in milliseconds
  const durationMs = (360 / rotationSpeedDps) * 1000

  tasksIconRotationAnimation = anime({
    targets: iconWrap,
    rotate: [0, 360], // Explicitly animate from 0 to 360 degrees
    duration: durationMs,
    easing: 'linear',
    loop: true,
  })
}

/**
 * Updates the combo classes for moon1 and moon2 icons based on the mode config.
 * @param {object} config - The activeCommsConfig for the current mode.
 */
function updateIconComboClasses(config) {
  const moon1Element = document.querySelector(MOON1_ICON_SELECTOR)
  const moon2Element = document.querySelector(MOON2_ICON_SELECTOR)

  const newMoon1Suffix = config.moon1IconComboSuffix
  const newMoon2Suffix = config.moon2IconComboSuffix

  // Handle Moon 1
  if (moon1Element) {
    if (currentMoon1ComboSuffix && currentMoon1ComboSuffix !== newMoon1Suffix) {
      moon1Element.classList.remove(currentMoon1ComboSuffix)
    }
    if (newMoon1Suffix && newMoon1Suffix !== currentMoon1ComboSuffix) {
      moon1Element.classList.add(newMoon1Suffix)
    }
    currentMoon1ComboSuffix = newMoon1Suffix || null
  } else {
    // console.warn(`[comms.js] Element "${MOON1_ICON_SELECTOR}" not found for combo class.`)
  }

  // Handle Moon 2
  if (moon2Element) {
    if (currentMoon2ComboSuffix && currentMoon2ComboSuffix !== newMoon2Suffix) {
      moon2Element.classList.remove(currentMoon2ComboSuffix)
    }
    if (newMoon2Suffix && newMoon2Suffix !== currentMoon2ComboSuffix) {
      moon2Element.classList.add(newMoon2Suffix)
    }
    currentMoon2ComboSuffix = newMoon2Suffix || null
  } else {
    // console.warn(`[comms.js] Element "${MOON2_ICON_SELECTOR}" not found for combo class.`)
  }
}

/**
 * Manages the intermittent checkpoint signal effect.
 * Alternates a combo class between two checkpoint dots.
 * @param {object} config - The activeCommsConfig for the current mode.
 */
function updateCheckPointSignal(config) {
  const dot1Element = document.querySelector(CHCKPT_DOT1_SELECTOR)
  const dot2Element = document.querySelector(CHCKPT_DOT2_SELECTOR)

  // Clear any existing interval and remove the last used suffix
  if (checkpointSignalIntervalId) {
    clearInterval(checkpointSignalIntervalId)
    checkpointSignalIntervalId = null
  }

  if (checkpointSignalLastUsedSuffix) {
    if (dot1Element)
      dot1Element.classList.remove(checkpointSignalLastUsedSuffix)
    if (dot2Element)
      dot2Element.classList.remove(checkpointSignalLastUsedSuffix)
  }
  checkpointSignalActiveDotElement = null // Reset active dot

  const newSuffix = config.checkpointSignalSuffix
  const newIntervalMs = config.checkpointSignalIntervalMs

  // Store the new suffix as the one currently in use for cleanup next time
  checkpointSignalLastUsedSuffix = newSuffix

  if (!dot1Element || !dot2Element) {
    console.warn(
      '[comms.js] Checkpoint signal dot elements not found. Signal stopped.'
    )
    checkpointSignalLastUsedSuffix = null // Nothing to clean up if elements are missing
    return
  }

  if (
    typeof newIntervalMs !== 'number' ||
    newIntervalMs <= 0 ||
    !newSuffix ||
    newSuffix.trim() === ''
  ) {
    console.log(
      '[comms.js] Checkpoint signal interval/suffix invalid. Signal stopped.'
    )
    // Ensure suffix is removed if signal is stopped
    if (newSuffix) {
      dot1Element.classList.remove(newSuffix)
      dot2Element.classList.remove(newSuffix)
    }
    checkpointSignalLastUsedSuffix = null // Mark that no suffix is actively managed by an interval
    return
  }

  const toggleSignalClasses = () => {
    if (!checkpointSignalLastUsedSuffix) return // Safety check if suffix became invalid

    if (checkpointSignalActiveDotElement === dot1Element) {
      dot1Element.classList.remove(checkpointSignalLastUsedSuffix)
      dot2Element.classList.add(checkpointSignalLastUsedSuffix)
      checkpointSignalActiveDotElement = dot2Element
    } else {
      // Handles initial state (null) or if dot2Element was active
      if (dot2Element)
        dot2Element.classList.remove(checkpointSignalLastUsedSuffix) // remove from dot2 if it was active
      dot1Element.classList.add(checkpointSignalLastUsedSuffix)
      checkpointSignalActiveDotElement = dot1Element
    }
  }

  // Initial toggle to set the first dot active
  toggleSignalClasses()

  // Start the interval
  checkpointSignalIntervalId = setInterval(toggleSignalClasses, newIntervalMs)
}

/**
 * Manages the sequential lighting effect for RV icons.
 * @param {object} config - The activeCommsConfig for the current mode.
 */
function updateRvIconSequence(config) {
  // 1. Clear any previous sequence timeouts and classes
  if (rvIconSequenceTimeoutId) {
    clearTimeout(rvIconSequenceTimeoutId)
    rvIconSequenceTimeoutId = null
  }
  // Ensure rvIconElements is populated for cleanup, even if it's the first run
  if (rvIconElements.length === 0) {
    rvIconElements = RV_ICON_SELECTORS.map((selector) =>
      document.querySelector(selector)
    )
  }
  rvIconElements.forEach((el) => {
    if (el && rvIconSequenceLastUsedSuffix) {
      el.classList.remove(rvIconSequenceLastUsedSuffix)
    }
  })
  rvIconSequenceActiveDOMElement = null
  rvIconSequenceCurrentLogicalIndex = 0 // Reset logical index

  // 2. Get new config parameters
  const suffix = config.rvIconSequenceSuffix
  const direction = config.rvIconSequenceDirection
  const litDuration = config.rvIconLitDurationMs
  const loopDelay = config.rvIconSequenceLoopDelayMs

  rvIconSequenceLastUsedSuffix = suffix // Store for the current sequence's cleanup

  // 3. Validate parameters and elements
  const allElementsFound = rvIconElements.every((el) => el !== null)
  if (!allElementsFound) {
    console.warn('[comms.js] Not all RV Icon elements found. Sequence stopped.')
    rvIconSequenceLastUsedSuffix = null // Nothing to clean up if elements were missing
    return
  }
  if (
    !suffix ||
    typeof litDuration !== 'number' ||
    litDuration <= 0 ||
    typeof loopDelay !== 'number' ||
    loopDelay < 0
  ) {
    console.log(
      '[comms.js] RV Icon sequence parameters invalid. Sequence stopped.'
    )
    rvIconElements.forEach((el) => {
      if (el && suffix) el.classList.remove(suffix)
    }) // Attempt cleanup with current suffix
    rvIconSequenceLastUsedSuffix = null // Mark that no suffix is actively managed
    return
  }

  // 4. Define the function that handles one step of the sequence
  function executeRvIconStep() {
    if (!rvIconSequenceLastUsedSuffix) return // Stop if suffix became invalid (e.g. mode changed rapidly)

    // Deactivate previously active element
    if (rvIconSequenceActiveDOMElement) {
      rvIconSequenceActiveDOMElement.classList.remove(
        rvIconSequenceLastUsedSuffix
      )
    }

    // Determine the actual DOM element index based on direction and logical index
    let domElementIndex
    if (direction === 'backward') {
      domElementIndex = 2 - rvIconSequenceCurrentLogicalIndex // Maps 0,1,2 to 2,1,0
    } else {
      // Default to 'forward'
      domElementIndex = rvIconSequenceCurrentLogicalIndex // Maps 0,1,2 to 0,1,2
    }

    const currentElementToActivate = rvIconElements[domElementIndex]

    if (currentElementToActivate) {
      currentElementToActivate.classList.add(rvIconSequenceLastUsedSuffix)
      rvIconSequenceActiveDOMElement = currentElementToActivate
    }

    // Prepare for the next step or loop
    rvIconSequenceCurrentLogicalIndex++

    if (rvIconSequenceCurrentLogicalIndex < 3) {
      // More icons in this current sequence run
      rvIconSequenceTimeoutId = setTimeout(executeRvIconStep, litDuration)
    } else {
      // End of the current 1,2,3 (or 3,2,1) sequence run
      // This timeout is for the duration the *last* icon stays lit
      rvIconSequenceTimeoutId = setTimeout(() => {
        // Deactivate the last lit icon
        if (rvIconSequenceActiveDOMElement && rvIconSequenceLastUsedSuffix) {
          rvIconSequenceActiveDOMElement.classList.remove(
            rvIconSequenceLastUsedSuffix
          )
        }
        rvIconSequenceActiveDOMElement = null
        rvIconSequenceCurrentLogicalIndex = 0 // Reset for the next full loop

        // Schedule the start of the *next* sequence after the loopDelay
        rvIconSequenceTimeoutId = setTimeout(executeRvIconStep, loopDelay)
      }, litDuration)
    }
  }

  // 5. Start the first step of the sequence
  // Add a small delay before starting if desired, or start immediately
  rvIconSequenceTimeoutId = setTimeout(executeRvIconStep, 0) // Start immediately
}

/**
 * Manages the rotation and bounce scale animation for the energyCore element.
 * @param {object} config - The activeCommsConfig for the current mode.
 */
function updateEnergyCoreRotation(config) {
  const energyCoreElement = document.querySelector(ENERGY_CORE_SELECTOR)
  if (!energyCoreElement) {
    console.warn(
      `[comms.js] Element "${ENERGY_CORE_SELECTOR}" not found for rotation.`
    )
    return
  }

  // Stop any existing animation
  if (energyCoreRotationAnimation) {
    energyCoreRotationAnimation.pause()
    anime.remove(energyCoreElement) // Remove previous animation instance
    energyCoreRotationAnimation = null
  }

  const targetRotation = config.energyCoreRotationDegrees
  const duration = config.energyCoreRotationDuration
  const easing = config.energyCoreRotationEasing
  const bounceScales = config.energyCoreBounceScales || [1, 0.85, 1.15, 1]
  const bounceTimings = config.energyCoreBounceTimings || [0, 25, 60, 100]

  // Validate parameters
  if (
    typeof targetRotation !== 'number' ||
    typeof duration !== 'number' ||
    duration <= 0 ||
    !Array.isArray(bounceScales) ||
    !Array.isArray(bounceTimings) ||
    bounceScales.length !== bounceTimings.length
  ) {
    console.warn(
      '[comms.js] Invalid energyCore animation parameters. Animation stopped.'
    )
    energyCoreElement.style.transform = 'rotate(0deg) scale(1)' // Reset to default
    return
  }

  // Create scale keyframes based on timing percentages
  const scaleKeyframes = bounceScales.map((scale, index) => ({
    value: scale,
    duration:
      index === 0
        ? 0
        : ((bounceTimings[index] - bounceTimings[index - 1]) / 100) * duration,
    easing: index === bounceScales.length - 1 ? 'easeOutBack' : 'easeInOutQuad',
  }))

  // Create the combined rotation and bounce animation
  energyCoreRotationAnimation = anime({
    targets: energyCoreElement,
    rotate: targetRotation + 'deg',
    scale: scaleKeyframes,
    duration: duration,
    easing: easing, // This applies to rotation, scale uses its own easing per keyframe
    complete: function () {
      console.log(
        `[comms.js] energyCore animated to ${targetRotation} degrees with bounce effect`
      )
    },
  })
}

/**
 * Initializes or restarts the main day highlight animation and the optional synchronized wave effect.
 * Uses parameters from activeCommsConfig.
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

  let previousStepIndex = -1

  // 2. Validate durationPerDot from activeCommsConfig.
  const {
    durationPerDot,
    masterWaveEnabled,
    independentWaveEnabled,
    // dotXMotionEnabled is handled by the global isDotXMotionEnabled variable for now
    waveSpeedMode,
    customWaveDuration,
    independentWaveAmplitude,
    independentWaveCycleMs,
    independentWaveStaggerDelay,
  } = activeCommsConfig

  if (typeof durationPerDot !== 'number' || durationPerDot <= 0) {
    if (!isFinite(durationPerDot) && durationPerDot > 0) {
      console.log(
        '[comms.js] durationPerDot is Infinity. Animations will be paused.'
      )
    } else {
      console.warn(
        `[comms.js] Invalid durationPerDot (${durationPerDot}). Animations will not run or will be paused.`
      )
      return
    }
  }

  const numberOfDots = dayElements.length
  const totalCycleDuration = durationPerDot * numberOfDots

  console.log(
    `[comms.js] Starting/Updating animations: ${numberOfDots} dots, ${durationPerDot}ms/dot, total cycle ${totalCycleDuration}ms. Synced Wave: ${
      masterWaveEnabled && !independentWaveEnabled
    }, Independent Wave: ${masterWaveEnabled && independentWaveEnabled}.`
  )

  mainTimeline = anime.timeline({
    loop: true,
  })

  mainTimeline.add({
    targets: dayElements,
    duration: totalCycleDuration,
    easing: `steps(${numberOfDots})`,
    update: function (anim) {
      if (!isFinite(durationPerDot) || durationPerDot <= 0) {
        dayElements.forEach((dotElement) => {
          if (dotElement.classList.contains(ACTIVE_CLASS)) {
            dotElement.classList.remove(ACTIVE_CLASS)
          }
          if (
            masterWaveEnabled &&
            !independentWaveEnabled &&
            dotElement.style.transform !== ''
          ) {
            const currentX = isDotXMotionEnabled // Use module-scoped isDotXMotionEnabled
              ? anime.get(dotElement, 'translateX', 'px') || '0px'
              : '0px'
            anime.set(dotElement, { translateY: 0, translateX: currentX })
          }
        })
        return
      }

      const currentStepIndex = Math.min(
        Math.floor(anim.currentTime / durationPerDot),
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

      if (
        masterWaveEnabled &&
        !independentWaveEnabled &&
        currentStepIndex !== previousStepIndex
      ) {
        if (
          numberOfDots > 0 &&
          isFinite(durationPerDot) &&
          durationPerDot > 0
        ) {
          const waveAmplitude = 10 // This could also be part of config if desired for synced wave
          let waveTransitionDuration
          if (waveSpeedMode === 'custom') {
            waveTransitionDuration = customWaveDuration
          } else {
            waveTransitionDuration = Math.min(durationPerDot / 3, 250)
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

            const currentX = isDotXMotionEnabled // Use module-scoped isDotXMotionEnabled
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

      if (currentStepIndex !== previousStepIndex) {
        previousStepIndex = currentStepIndex
      }
    },
    begin: function () {
      dayElements.forEach((el) => {
        el.classList.remove(ACTIVE_CLASS)
        if (
          masterWaveEnabled &&
          !independentWaveEnabled &&
          numberOfDots > 0 &&
          isFinite(durationPerDot) &&
          durationPerDot > 0
        ) {
          const initialActiveIndex = 0
          const waveAmplitude = 10 // Could be from config
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
            const currentX = isDotXMotionEnabled // Use module-scoped isDotXMotionEnabled
              ? anime.get(dotElement, 'translateX', 'px') || '0px' // Changed '5px' to '0px' for consistency
              : '0px'
            anime.set(dotElement, { translateY: targetY, translateX: currentX })
          })
          previousStepIndex = initialActiveIndex
        }
      })
      previousStepIndex = -1
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

  if (masterWaveEnabled && independentWaveEnabled) {
    independentWaveAnimation = anime({
      targets: dayElements,
      translateY: [
        {
          value: -independentWaveAmplitude, // From activeCommsConfig
          duration: independentWaveCycleMs / 2, // From activeCommsConfig
          easing: 'easeInOutSine',
        },
        {
          value: 0,
          duration: independentWaveCycleMs / 2, // From activeCommsConfig
          easing: 'easeInOutSine',
        },
      ],
      loop: true,
      delay: anime.stagger(independentWaveStaggerDelay), // From activeCommsConfig
    })

    if (!isFinite(durationPerDot) || durationPerDot <= 0) {
      independentWaveAnimation.pause()
    } else {
      independentWaveAnimation.play()
    }
  }
}

/**
 * Updates the duration for each dot in the day highlight animation.
 * Modifies activeCommsConfig and restarts the animation.
 * @param {number | null} newDuration - The new duration in milliseconds for each dot.
 */
export function updateCommsDotDuration(newDuration) {
  const oldDuration = activeCommsConfig.durationPerDot

  if (
    typeof newDuration === 'number' &&
    newDuration > 0 &&
    isFinite(newDuration)
  ) {
    activeCommsConfig.durationPerDot = newDuration
    console.log(
      `[comms.js] Dot duration updated to: ${activeCommsConfig.durationPerDot}ms (from ${oldDuration}ms). Restarting animation.`
    )
  } else {
    console.warn(
      `[comms.js] Received invalid new duration: ${newDuration}. Animation will be paused/stopped.`
    )
    activeCommsConfig.durationPerDot = Infinity
  }
  startOrUpdateDayHighlightAnimation()
}

/**
 * Enables or disables the master wave effect on the dots.
 * Modifies activeCommsConfig and restarts animations.
 * @param {boolean} isEnabled - True to enable, false to disable.
 */
export function setStaggerEffectEnabled(isEnabled) {
  if (typeof isEnabled !== 'boolean') {
    console.error(
      '[comms.js] Invalid value for setStaggerEffectEnabled. Expecting boolean.'
    )
    return
  }
  if (activeCommsConfig.masterWaveEnabled === isEnabled) {
    console.log(
      `[comms.js] Master wave effect is already ${
        isEnabled ? 'enabled' : 'disabled'
      }. No change.`
    )
    return
  }

  activeCommsConfig.masterWaveEnabled = isEnabled
  console.log(
    `[comms.js] Master wave effect set to: ${activeCommsConfig.masterWaveEnabled}. Restarting animations.`
  )
  startOrUpdateDayHighlightAnimation()
}

/**
 * Enables or disables the independent wave motion.
 * Modifies activeCommsConfig and restarts animations.
 * @param {boolean} isEnabled - True to enable, false to disable.
 */
export function setIndependentWaveMotionEnabled(isEnabled) {
  if (typeof isEnabled !== 'boolean') {
    console.error(
      '[comms.js] Invalid value for setIndependentWaveMotionEnabled. Expecting boolean.'
    )
    return
  }
  if (activeCommsConfig.independentWaveEnabled === isEnabled) {
    console.log(
      `[comms.js] Independent wave motion is already ${
        isEnabled ? 'enabled' : 'disabled'
      }. No change.`
    )
    return
  }

  activeCommsConfig.independentWaveEnabled = isEnabled
  console.log(
    `[comms.js] Independent wave motion set to: ${activeCommsConfig.independentWaveEnabled}. Restarting animations.`
  )
  startOrUpdateDayHighlightAnimation()
}

/**
 * Sets the comms animation parameters based on a predefined mode.
 * @param {string} modeName - The name of the mode to activate ("A" or "B").
 */
export function setCommsConfigMode(modeName) {
  const newModeConfig = commsModeConfigs[modeName]
  if (!newModeConfig) {
    console.warn(`[comms.js] Unknown mode "${modeName}"`)
    return
  }

  activeCommsConfig = { ...newModeConfig }
  isDotXMotionEnabled = activeCommsConfig.dotXMotionEnabled

  const indicatorWrap = document.querySelector(INDICATOR_WRAP_SELECTOR)
  if (indicatorWrap) {
    indicatorWrap.style.setProperty(
      '--comms-active-dot-color',
      activeCommsConfig.activeDotColor
    )
  } else {
    console.warn(
      `[comms.js] Element with selector "${INDICATOR_WRAP_SELECTOR}" not found. Cannot set active dot color variable.`
    )
  }

  console.log(`[comms.js] Comms config mode set to: ${modeName}`)
  startOrUpdateDayHighlightAnimation()

  // Update tasks icon rotation and moon combo classes
  updateTasksIconRotation(activeCommsConfig)
  updateIconComboClasses(activeCommsConfig)

  // --- NEW: Update checkpoint signal ---
  updateCheckPointSignal(activeCommsConfig)
  // --- END NEW ---

  // --- NEW: Update RV Icon Sequence ---
  updateRvIconSequence(activeCommsConfig)
  // --- END NEW ---

  // --- NEW: Update energyCore rotation ---
  updateEnergyCoreRotation(activeCommsConfig)
  // --- END NEW ---

  // --- NEW: Update #energyTitle class based on mode ---
  const energyTitleElement = document.querySelector('#energyTitle')
  if (energyTitleElement) {
    energyTitleElement.classList.remove('mode-a', 'mode-b') // Remove both classes first

    if (modeName === 'A') {
      energyTitleElement.classList.add('mode-a')
    } else if (modeName === 'B') {
      energyTitleElement.classList.add('mode-b')
    }
  } else {
    console.warn(
      '[comms.js] Element with ID #energyTitle not found. Cannot update mode class.'
    )
  }
  // --- END NEW ---
}

/**
 * Initializes the comms system: sets default mode and attaches event listeners.
 */
function initCommsSystem() {
  setCommsConfigMode('A') // This will now also set the initial --comms-active-dot-color

  const modeTriggers = document.querySelectorAll('[data-set-mode]')
  modeTriggers.forEach((trigger) => {
    trigger.addEventListener('click', function () {
      const mode = this.getAttribute('data-set-mode')?.toUpperCase()
      const phoneTitle = this.getAttribute('data-phone') // Get the data-phone attribute value
      const smsTitle = this.getAttribute('data-sms') // Get the data-sms attribute value
      const taskValue = this.getAttribute('data-tasks') // Get the data-task attribute value
      const videoValue = this.getAttribute('data-video') // Get the data-video attribute value
      const energyTitleValue = this.getAttribute('data-energy-title') // Get the data-energy-title attribute value

      if (mode && commsModeConfigs[mode]) {
        setCommsConfigMode(mode)

        // Update the phone line title
        const phoneTitleElement = document.querySelector('#ayw-phoneLine-title')
        if (phoneTitleElement) {
          if (phoneTitle !== null && phoneTitle !== undefined) {
            phoneTitleElement.textContent = phoneTitle
          } else {
            console.warn(
              `[comms.js] data-phone attribute is missing or empty on the trigger for mode "${mode}". Title not changed.`
            )
            // Optional: Clear the text or set a default if the attribute is missing
            // phoneTitleElement.textContent = '';
          }
        } else {
          console.warn(
            '[comms.js] Element with ID #ayw-phoneLine-title not found. Cannot update title.'
          )
        }

        // Update the SMS title
        const smsTitleElement = document.querySelector('#ayw-sms-title')
        if (smsTitleElement) {
          if (smsTitle !== null && smsTitle !== undefined) {
            smsTitleElement.textContent = smsTitle
          } else {
            console.warn(
              `[comms.js] data-sms attribute is missing or empty on the trigger for mode "${mode}". Title not changed.`
            )
            // Optional: Clear the text or set a default if the attribute is missing
            // smsTitleElement.textContent = '';
          }
        } else {
          console.warn(
            '[comms.js] Element with ID #ayw-sms-title not found. Cannot update title.'
          )
        }

        // Update the #dataTask element
        const dataTaskElement = document.querySelector('#dataTask')
        if (dataTaskElement) {
          if (taskValue !== null && taskValue !== undefined) {
            dataTaskElement.textContent = taskValue
          } else {
            console.warn(
              `[comms.js] data-tasks attribute is missing or empty on the trigger for mode "${mode}". #dataTask content not changed.`
            )
            // Optional: Clear the text or set a default
            // dataTaskElement.textContent = '';
          }
        } else {
          console.warn(
            '[comms.js] Element with ID #dataTask not found. Cannot update content.'
          )
        }

        // Update the #dataVideo element
        const dataVideoElement = document.querySelector('#dataVideo')
        if (dataVideoElement) {
          if (videoValue !== null && videoValue !== undefined) {
            dataVideoElement.textContent = videoValue
          } else {
            console.warn(
              `[comms.js] data-video attribute is missing or empty on the trigger for mode "${mode}". #dataVideo content not changed.`
            )
            // Optional: Clear the text or set a default
            // dataVideoElement.textContent = '';
          }
        } else {
          console.warn(
            '[comms.js] Element with ID #dataVideo not found. Cannot update content.'
          )
        }

        // --- NEW: Update the #energyTitle element ---
        const energyTitleElement = document.querySelector('#energyTitle')
        if (energyTitleElement) {
          if (energyTitleValue !== null && energyTitleValue !== undefined) {
            energyTitleElement.textContent = energyTitleValue
          } else {
            console.warn(
              `[comms.js] data-energy-title attribute is missing or empty on the trigger for mode "${mode}". #energyTitle content not changed.`
            )
            // Optional: Clear the text or set a default if the attribute is missing
            // energyTitleElement.textContent = '';
          }
        } else {
          console.warn(
            '[comms.js] Element with ID #energyTitle not found. Cannot update content.'
          )
        }
        // --- END NEW ---
      } else {
        console.warn(
          `[comms.js] Invalid mode value "${mode}" on trigger element or mode not defined.`
        )
      }
    })
  })
  console.log('[comms.js] Comms system initialized.')
}

// --- DOM Ready ---
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCommsSystem)
} else {
  initCommsSystem()
}
