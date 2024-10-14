function colorModeToggle(colorVars, duration = 0.3, ease = 'power1.out') {
  function attr(defaultVal, attrVal) {
    const defaultValType = typeof defaultVal
    if (typeof attrVal !== 'string' || attrVal.trim() === '') return defaultVal
    if (attrVal === 'true' && defaultValType === 'boolean') return true
    if (attrVal === 'false' && defaultValType === 'boolean') return false
    if (isNaN(attrVal) && defaultValType === 'string') return attrVal
    if (!isNaN(attrVal) && defaultValType === 'number') return +attrVal
    return defaultVal
  }

  const htmlElement = document.documentElement
  const computed = getComputedStyle(htmlElement)
  let toggleEl
  let togglePressed = 'false'

  const scriptTag = document.querySelector('[tr-color-vars]')
  if (!scriptTag) {
    console.warn('Script tag with tr-color-vars attribute not found')
    return
  }

  let colorModeDuration = duration
  let colorModeEase = ease
  const cssVariables = colorVars

  if (!cssVariables.length) {
    console.warn('Value of tr-color-vars attribute not found')
    return
  }

  let lightColors = {}
  let darkColors = {}
  cssVariables.split(',').forEach(function (item) {
    let lightValue = computed.getPropertyValue(`--color--${item}`)
    let darkValue = computed.getPropertyValue(`--dark--${item}`)
    if (lightValue.length) {
      if (!darkValue.length) darkValue = lightValue
      lightColors[`--color--${item}`] = lightValue
      darkColors[`--color--${item}`] = darkValue
    }
  })

  if (!Object.keys(lightColors).length) {
    console.warn('No variables found matching tr-color-vars attribute value')
    return
  }

  function setColors(colorObject, animate, targetElement) {
    console.log('setColors called:', { colorObject, animate, targetElement })
    if (typeof gsap !== 'undefined' && animate) {
      console.log('Using GSAP for animation')
      gsap.to(targetElement, {
        ...colorObject,
        duration: colorModeDuration,
        ease: colorModeEase,
      })
    } else {
      console.log(
        'GSAP not available or animation disabled, applying colors directly'
      )
      Object.keys(colorObject).forEach(function (key) {
        console.log(`Setting ${key} to ${colorObject[key]}`)
        targetElement.style.setProperty(key, colorObject[key])
      })
    }
  }

  function goDark(dark, animate, targetElement = htmlElement) {
    console.log('goDark called:', { dark, animate, targetElement })
    if (dark) {
      targetElement.classList.add('dark-mode')
      setColors(darkColors, animate, targetElement)
    } else {
      targetElement.classList.remove('dark-mode')
      setColors(lightColors, animate, targetElement)
    }
  }

  function checkPreference(e) {
    goDark(e.matches, false)
  }
  const colorPreference = window.matchMedia('(prefers-color-scheme: dark)')
  colorPreference.addEventListener('change', (e) => {
    checkPreference(e)
  })

  let storagePreference = localStorage.getItem('dark-mode')
  if (storagePreference !== null) {
    storagePreference === 'true' ? goDark(true, false) : goDark(false, false)
  } else {
    checkPreference(colorPreference)
  }

  window.addEventListener('DOMContentLoaded', (event) => {
    toggleEl = document.querySelectorAll('[tr-color-toggle]')
    toggleEl.forEach(function (element) {
      element.setAttribute('aria-label', 'View Dark Mode')
      element.setAttribute('role', 'button')
      element.setAttribute('aria-pressed', togglePressed)
    })
    document.addEventListener('click', function (e) {
      const targetElement = e.target.closest('[tr-color-toggle]')
      if (targetElement) {
        let darkClass = htmlElement.classList.contains('dark-mode')
        darkClass ? goDark(false, true) : goDark(true, true)
      }
    })
  })

  // Return an object with the goDark function
  return {
    goDark: goDark,
  }
}

export default colorModeToggle
