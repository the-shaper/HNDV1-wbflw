import { Rive, Fit } from '@rive-app/webgl2' // WebGL 2 renderer

// Build an absolute URL for the Rive binary; Vite will copy it to /dist
const aywClaraRiv = new URL('./ayw_clara.riv', import.meta.url).href

// Match the actual state machine name exported by the file
const AYW_STATE_MACHINE = 'clara-switch-machine'

/**
 * Initialize AYW Clara Rive animation on the supplied canvas selector.
 * Returns the Rive instance or early-returns if the canvas isn't in the DOM.
 * Integrates with data binding View Model for radio button control.
 *
 * @param {string} [selector='#ayw-rive-canvas']
 */
export default function initAywRiveCanvas(selector = '#ayw-rive-canvas') {
  const canvas = document.querySelector(selector)
  if (!canvas) {
    console.warn(
      `[initAywRiveCanvas] canvas "${selector}" not found – skipping`
    )
    return
  }

  // Basic validation - match the structure of the working tf-home-v2 script
  if (canvas.tagName !== 'CANVAS') {
    console.error(
      `[initAywRiveCanvas] Element "${selector}" is not a canvas element. Found: ${canvas.tagName}`
    )
    return
  }

  // eslint-disable-next-line no-unused-vars
  let riveInstance = null
  let viewModel = null
  let viewModelInstance = null
  let resolvedPropertyNameByKey = {}

  function normalizeName(name) {
    try {
      return String(name)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
    } catch (_) {
      return String(name || '')
    }
  }

  function buildResolvedPropertyMap() {
    try {
      if (!viewModel) {
        console.warn('Cannot enumerate properties: missing View Model schema')
        return
      }

      // Prefer descriptors from the View Model (schema)
      const rawDescriptors =
        typeof viewModel.properties === 'function'
          ? viewModel.properties()
          : viewModel.properties

      const descriptors = Array.from(rawDescriptors || [])
      if (descriptors.length === 0) {
        console.warn('No property descriptors available on View Model')
      }

      const booleanNames = descriptors
        .filter((d) => {
          const t = (d && (d.type || d._type || d.kind)) || ''
          const tStr = String(t).toLowerCase()
          return tStr.includes('bool') || tStr === 'boolean' || t === 1
        })
        .map((d) => d?.name)
        .filter(Boolean)

      const desired = {
        1: 'isA1Selected',
        2: 'isB1Selected',
        3: 'isA2Selected',
        4: 'isB2Selected',
      }

      resolvedPropertyNameByKey = {}
      const lookup = new Map(booleanNames.map((n) => [normalizeName(n), n]))

      for (const [key, wanted] of Object.entries(desired)) {
        if (booleanNames.includes(wanted)) {
          resolvedPropertyNameByKey[key] = wanted
          continue
        }
        const normalized = lookup.get(normalizeName(wanted))
        if (normalized) {
          resolvedPropertyNameByKey[key] = normalized
        }
      }

      console.log('Resolved property map:', resolvedPropertyNameByKey)
      console.log('Available boolean property names:', booleanNames)
    } catch (err) {
      console.warn(
        'Failed building resolved property map:',
        err?.message || err
      )
    }
  }

  const rive = new Rive({
    canvas,
    src: aywClaraRiv,
    autoplay: true,
    fit: Fit.Contain,
    stateMachines: AYW_STATE_MACHINE,

    // Match the sizing settings from the working tf-home-v2 script
    minY: 40,
    minX: 40,
    maxX: 50,
    maxY: 50,

    useOffscreenRenderer: true,
    onLoad: () => {
      rive.resizeDrawingSurfaceToCanvas() // crisp on retina screens
      console.log('AYW Clara Rive animation loaded successfully')

      // Debug: state machines
      try {
        const names =
          typeof rive.stateMachineNames === 'function'
            ? rive.stateMachineNames()
            : rive.stateMachineNames
        console.log('State machines available:', names)
        console.log('State machine requested:', AYW_STATE_MACHINE)
        if (
          Array.isArray(names) &&
          !names.includes(AYW_STATE_MACHINE) &&
          names.length > 0
        ) {
          console.warn(
            `Requested state machine not found. Playing first available: ${names[0]}`
          )
          if (typeof rive.play === 'function') rive.play(names[0])
        }
      } catch (_) {}

      if (typeof rive.startRendering === 'function') {
        rive.startRendering()
      }

      // Initialize data binding integration
      initializeDataBinding()
    },
    onLoadError: (error) => {
      console.error('Failed to load AYW Clara Rive animation:', error)
      console.error('This might be due to:')
      console.error('1. Corrupted .riv file - re-export from Rive')
      console.error('2. Wrong export settings - ensure WebGL2 compatibility')
      console.error('3. Missing vector feathering support - check Rive version')
    },
  })

  /**
   * Debug helper to get available View Models
   */
  function getAvailableViewModels(rive) {
    try {
      if (rive && typeof rive.viewModelNames === 'function') {
        return rive.viewModelNames()
      }
      return 'Unable to get View Model names'
    } catch (error) {
      return `Error getting View Model names: ${error.message}`
    }
  }

  /**
   * Debug helper to get View Model properties
   */
  function getViewModelProperties(viewModel) {
    try {
      if (!viewModel) return 'No View Model available'

      const patterns = [
        () => Object.keys(viewModel),
        () => viewModel.properties,
        () => viewModel._properties,
        () => 'Unable to access properties directly',
      ]

      for (const pattern of patterns) {
        try {
          const result = pattern()
          if (result && typeof result !== 'string') return result
        } catch (e) {
          continue
        }
      }

      return 'Unable to access properties'
    } catch (error) {
      return `Error getting properties: ${error.message}`
    }
  }

  function resolveBooleanProperty(name) {
    // 1) direct
    let prop = null
    try {
      prop = viewModelInstance.boolean(name)
      if (prop) return prop
    } catch (_) {}

    // 2) nested path using the View Model name
    try {
      prop = viewModelInstance.boolean(`RadioController/${name}`)
      if (prop) return prop
    } catch (_) {}

    // 3) chained nested access
    try {
      const nested =
        typeof viewModelInstance.viewModel === 'function'
          ? viewModelInstance.viewModel('RadioController')
          : null
      if (nested && typeof nested.boolean === 'function') {
        prop = nested.boolean(name)
        if (prop) return prop
      }
    } catch (_) {}

    return null
  }

  function logInstanceValues() {
    if (!viewModelInstance) return
    const names = [
      'isA1Selected',
      'isB1Selected',
      'isA2Selected',
      'isB2Selected',
    ]
    const snapshot = {}
    names.forEach((n) => {
      try {
        const p = resolveBooleanProperty(n)
        snapshot[n] = p ? p.value : undefined
      } catch (_) {
        snapshot[n] = 'err'
      }
    })
    console.log('[Rive] Instance values:', snapshot)
  }

  /**
   * Initialize data binding with the View Model and set up radio button listeners
   */
  function initializeDataBinding() {
    try {
      // Get the exported View Model
      viewModel = rive.viewModelByName('RadioController')

      if (!viewModel) {
        console.error(
          'View Model "RadioController" not found. Make sure it\'s exported in your Rive file.'
        )
        return
      }

      console.log('Data binding View Model initialized:', viewModel)
      console.log('Available View Models:', getAvailableViewModels(rive))
      console.log('Available properties:', getViewModelProperties(viewModel))
      console.log('View Model type:', typeof viewModel)
      console.log(
        'View Model methods:',
        Object.getOwnPropertyNames(Object.getPrototypeOf(viewModel))
      )

      // Create a View Model Instance: prefer named instance, then default, then blank
      try {
        const preferredInstanceName = 'AYW-Instance'
        const byName =
          typeof viewModel.instanceByName === 'function'
            ? viewModel.instanceByName(preferredInstanceName)
            : null
        const byDefault =
          !byName && typeof viewModel.defaultInstance === 'function'
            ? viewModel.defaultInstance()
            : null
        const blank =
          !byName && !byDefault && typeof viewModel.instance === 'function'
            ? viewModel.instance()
            : null
        viewModelInstance = byName || byDefault || blank

        if (!viewModelInstance) {
          console.error(
            'Could not create a View Model instance (named/default/blank).'
          )
          return
        }

        if (typeof rive.bindViewModelInstance === 'function') {
          try {
            rive.bindViewModelInstance(viewModelInstance)
            console.log('Bound View Model instance to Rive')
          } catch (bindErr) {
            console.warn(
              'bindViewModelInstance failed or not required:',
              bindErr?.message
            )
          }
        }

        try {
          console.log(
            'View Model instance methods:',
            Object.getOwnPropertyNames(Object.getPrototypeOf(viewModelInstance))
          )
          // Build a map of boolean property names we can set (from schema)
          buildResolvedPropertyMap()

          // Attach observers so we know when values are applied by an advance
          const names = [
            'isA1Selected',
            'isB1Selected',
            'isA2Selected',
            'isB2Selected',
          ]
          names.forEach((n) => {
            try {
              const p = resolveBooleanProperty(n)
              if (p && typeof p.on === 'function') {
                p.on((evt) => {
                  console.log(`[Observer] ${n} applied:`, evt?.data ?? p.value)
                })
                console.log(`[Observer] Attached to ${n}, current:`, p.value)
              }
            } catch (_) {}
          })
        } catch (_) {}
      } catch (instErr) {
        console.error('Error creating/binding View Model instance:', instErr)
        return
      }

      try {
        console.log('Final View Model keys:', Object.keys(viewModel))
      } catch (_) {}

      // Set initial state based on current radio button selections
      updateViewModelFromButtons()
      logInstanceValues()

      // Set up event listeners for radio button changes
      setupRadioButtonListeners()
    } catch (error) {
      console.error('Error initializing data binding:', error)
    }
  }

  /**
   * Update the View Model properties based on current radio button states
   */
  function updateViewModelFromButtons() {
    if (!viewModelInstance) {
      console.warn('View Model instance not available for update')
      return
    }

    try {
      // Find buttons using your existing structure: .ayw-radiobutt[data-button]
      const buttonLabels = document.querySelectorAll(
        '.ayw-radiobutt[data-button]'
      )

      if (buttonLabels.length === 0) {
        console.warn('No radio button labels with data-button attributes found')
        console.warn('Looking for structure: .ayw-radiobutt[data-button]')
        return
      }

      console.log(
        `Found ${buttonLabels.length} radio button labels with data-button`
      )

      // Map button states
      const buttonStates = {}
      buttonLabels.forEach((label) => {
        const buttonValue = label.dataset.button // e.g., "1", "2", "3", "4"
        const input = label.querySelector('input[type="radio"]')
        const isPressed = label.classList.contains('is-pressed')
        const isWebflowChecked = input?.classList.contains(
          'w--redirected-checked'
        )
        const isNativeChecked = !!(input && input.checked)
        const isChecked = Boolean(
          isNativeChecked || isWebflowChecked || isPressed
        )
        buttonStates[buttonValue] = isChecked
      })

      console.log('Current button states:', buttonStates)

      const desiredPropertyByKey = {
        1: 'isA1Selected',
        2: 'isB1Selected',
        3: 'isA2Selected',
        4: 'isB2Selected',
      }

      for (const [key, desiredName] of Object.entries(desiredPropertyByKey)) {
        const isChecked = buttonStates[key] || false

        try {
          if (typeof viewModelInstance.boolean !== 'function') {
            console.error(
              'View Model instance does not support boolean properties API'
            )
            return
          }

          // Use resolved actual name if available; else try the desired name directly
          const actualName = resolvedPropertyNameByKey[key] || desiredName
          const boolProperty = resolveBooleanProperty(actualName)
          if (!boolProperty) {
            console.warn(
              `View Model property "${actualName}" not found on instance. Check exports and names.`
            )
            continue
          }

          const before = boolProperty.value
          boolProperty.value = isChecked
          const after = boolProperty.value
          console.log(`Set ${actualName}: ${before} -> ${after}`)
        } catch (error) {
          console.error(
            `Failed to set View Model property ${desiredName}:`,
            error
          )
        }
      }

      logInstanceValues()
    } catch (error) {
      console.error('Error updating View Model from buttons:', error)
    }
  }

  /**
   * Set up event listeners for radio button changes and app events
   */
  function setupRadioButtonListeners() {
    // Listen for changes on radio inputs
    const radioButtons = document.querySelectorAll(
      '.ayw-radiobutt input[type="radio"]'
    )

    if (radioButtons.length === 0) {
      console.warn(
        'No radio buttons found with structure: .ayw-radiobutt input[type="radio"]'
      )
      return
    }

    console.log(`Setting up listeners for ${radioButtons.length} radio buttons`)

    radioButtons.forEach((button) => {
      button.addEventListener('change', (event) => {
        const label = event.target.closest('.ayw-radiobutt')
        const buttonValue = label?.dataset.button
        console.log(
          '[Rive] Radio input changed:',
          buttonValue,
          event.target.checked
        )
        updateViewModelFromButtons()
      })
    })

    // Also listen to label clicks (Webflow may prevent native change during async toggles)
    const labels = document.querySelectorAll('.ayw-radiobutt[data-button]')
    labels.forEach((label) => {
      label.addEventListener('click', () => {
        setTimeout(() => {
          console.log('[Rive] Label clicked; re-evaluating states')
          updateViewModelFromButtons()
        }, 0)
      })
    })

    // Observe class changes on labels (e.g., is-pressed toggles)
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          console.log('[Rive] Label class changed; re-evaluating states')
          updateViewModelFromButtons()
          break
        }
      }
    })
    labels.forEach((label) => observer.observe(label, { attributes: true }))

    // Listen to the app's custom craft event
    document.addEventListener('craftSettingsChanged', (e) => {
      console.log(
        '[Rive] craftSettingsChanged received; re-evaluating',
        e?.detail
      )
      updateViewModelFromButtons()
    })

    console.log('Radio button listeners initialized')
  }

  // Add window resize listener for dynamic resizing
  const handleResize = () => {
    if (rive) {
      rive.resizeDrawingSurfaceToCanvas()
    }
  }

  window.addEventListener('resize', handleResize)

  return rive // optional – gives you a handle if you need it
}
