import gsap from 'gsap'

function initAgencyTabs() {
  // Lightweight text scramble helper using GSAP (no ScrambleTextPlugin required)
  const activeTweensByElement = new WeakMap()
  const activeBlinkByElement = new WeakMap()
  const activeDelayByElement = new WeakMap()

  function scrambleElementText(targetElement, options = {}) {
    if (!targetElement) return

    const finalText = options.text ?? targetElement.textContent ?? ''
    const duration = options.duration ?? 2
    const characters = options.chars ?? 'TWILIGHTFRINGE'
    const preserveSpaces = options.preserveSpaces ?? true
    const onComplete =
      typeof options.onComplete === 'function' ? options.onComplete : null

    // Kill previous tween on this element, if any
    const previousTween = activeTweensByElement.get(targetElement)
    if (previousTween) {
      previousTween.kill()
      activeTweensByElement.delete(targetElement)
    }

    const textLength = finalText.length
    if (textLength === 0) return

    const state = { progress: 0 }

    function buildRandomTail(startIndex, length) {
      let result = ''
      for (let i = 0; i < length; i++) {
        const originalChar = finalText[startIndex + i]
        if (preserveSpaces && originalChar === ' ') {
          result += ' '
          continue
        }
        const randIndex = Math.floor(Math.random() * characters.length)
        result += characters[randIndex]
      }
      return result
    }

    const tween = gsap.to(state, {
      progress: 1,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        const reveal = Math.floor(state.progress * textLength)
        const head = finalText.slice(0, reveal)
        const tail = buildRandomTail(reveal, textLength - reveal)
        targetElement.textContent = head + tail
      },
      onComplete: () => {
        targetElement.textContent = finalText
        activeTweensByElement.delete(targetElement)
        if (onComplete) onComplete()
      },
    })

    activeTweensByElement.set(targetElement, tween)
    return tween
  }

  function blinkElement(targetElement, options = {}) {
    if (!targetElement) return

    const blinks = Math.max(1, options.blinks ?? 3)
    const halfDuration = options.durationPerHalf ?? 1

    // Kill previous blink on this element, if any
    const previous = activeBlinkByElement.get(targetElement)
    if (previous) {
      previous.kill()
      activeBlinkByElement.delete(targetElement)
    }

    const tl = gsap
      .timeline({
        repeat: Math.max(0, blinks - 1),
        defaults: { ease: 'power1.inOut' },
        onComplete: () => {
          gsap.set(targetElement, { opacity: 1 })
          activeBlinkByElement.delete(targetElement)
        },
      })
      .to(targetElement, { opacity: 0, duration: halfDuration })
      .to(targetElement, { opacity: 1, duration: halfDuration })

    activeBlinkByElement.set(targetElement, tl)
    return tl
  }

  function stopScrambleSequence(targetElement) {
    if (!targetElement) return
    const t = activeTweensByElement.get(targetElement)
    if (t) {
      t.kill()
      activeTweensByElement.delete(targetElement)
    }
    const b = activeBlinkByElement.get(targetElement)
    if (b) {
      b.kill()
      activeBlinkByElement.delete(targetElement)
    }
    const d = activeDelayByElement.get(targetElement)
    if (d) {
      d.kill()
      activeDelayByElement.delete(targetElement)
    }
    gsap.set(targetElement, { opacity: 1 })
  }

  function getWelcomeBaseline(targetElement) {
    if (!targetElement) return { text: '', color: '#ff3d23' }
    // Prefer explicit attribute for base text if present
    const attrText = targetElement.getAttribute('data-welcome')
    const baseText =
      attrText && attrText.trim().length
        ? attrText
        : targetElement.dataset.baseText || targetElement.textContent || ''

    // Prefer explicit attribute for base color, else fallback to stored or default brand color
    const attrColor = targetElement.getAttribute('data-welcome-color')
    const baseColor =
      attrColor && attrColor.trim().length
        ? attrColor
        : targetElement.dataset.baseColor || '#ff3d23'

    // Cache on dataset for subsequent runs
    targetElement.dataset.baseText = baseText
    targetElement.dataset.baseColor = baseColor

    return { text: baseText, color: baseColor }
  }

  class TabInterface {
    constructor(container) {
      this.container = container
      this.tabList = this.container.querySelector('.tab-list')
      this.tabs = this.container.querySelectorAll('.tab')
      this.panels = this.container.querySelectorAll('.tab-panel')

      // Add reference to body element
      this.bodyElement = document.querySelector('.body-agency')

      // Initialize all panels as hidden first
      this.panels.forEach((panel) => {
        panel.hidden = true
      })

      this.init()

      // Set first tab as active by default, without focus
      const firstTab = this.tabs[0]
      if (firstTab) {
        this.switchTab(firstTab, true)
      }
    }

    init() {
      this.tabList.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab')) {
          this.switchTab(e.target, false, 'click')
        }
      })

      this.tabList.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          this.switchTabOnArrowPress(e)
        }
      })
    }

    switchTab(newTab, isInitialLoad = false, reason = null) {
      // Hide all panels first
      this.panels.forEach((panel) => {
        panel.hidden = true
      })

      const oldTab = this.tabList.querySelector('[aria-selected="true"]')
      if (oldTab) {
        oldTab.setAttribute('aria-selected', 'false')
      }

      newTab.setAttribute('aria-selected', 'true')
      const newPanel = this.container.querySelector(
        `[data-panel="${newTab.dataset.tab}"]`
      )
      if (newPanel) {
        newPanel.hidden = false
      }

      // Only apply focus if it's not the initial load
      if (!isInitialLoad) {
        newTab.focus()
      }

      // Handle body background classes
      if (this.bodyElement) {
        // Remove all existing background classes
        this.bodyElement.classList.remove('bg-1', 'bg-2', 'bg-3')

        // Add the appropriate background class based on the tab index
        const tabIndex = Array.from(this.tabs).indexOf(newTab) + 1
        this.bodyElement.classList.add(`bg-${tabIndex}`)
      }

      const tabIndexForScramble = Array.from(this.tabs).indexOf(newTab) + 1
      const oldTabIndex = oldTab
        ? Array.from(this.tabs).indexOf(oldTab) + 1
        : null

      // If leaving Tab 1, stop any ongoing sequences immediately
      if (oldTabIndex === 1 && tabIndexForScramble !== 1) {
        const leavingWelcome = document.querySelector(
          '#services-welcome[data-welcome]'
        )
        if (leavingWelcome) {
          stopScrambleSequence(leavingWelcome)
          // If we previously cached a baseline, restore it on leave
          const baseText = leavingWelcome.dataset.baseText
          const baseColor = leavingWelcome.dataset.baseColor
          if (baseText) leavingWelcome.textContent = baseText
          if (baseColor) gsap.set(leavingWelcome, { color: baseColor })
        }
      }

      // Trigger scramble on Tab 1 on initial load (once) or explicit clicks
      if (tabIndexForScramble === 1 && (reason === 'click' || isInitialLoad)) {
        const welcomeEl = document.querySelector(
          '#services-welcome[data-welcome]'
        )
        if (welcomeEl) {
          // Prevent duplicate initial-load runs across multiple inits
          if (isInitialLoad && welcomeEl.dataset.scrambleInitDone === 'true') {
            return
          }
          if (isInitialLoad) {
            welcomeEl.dataset.scrambleInitDone = 'true'
          }
          // Reset to baseline text and color before starting the sequence
          const base = getWelcomeBaseline(welcomeEl)
          welcomeEl.textContent = base.text
          gsap.set(welcomeEl, { color: base.color })
          // First scramble to current text
          scrambleElementText(welcomeEl, {
            duration: 1.3,
            onComplete: () => {
              // Blink x3 immediately after first scramble, then short pause (0.5s)
              const firstBlink = blinkElement(welcomeEl, {
                blinks: 3,
                durationPerHalf: 0.12,
              })

              const proceed = () => {
                // Ensure no previous delay is pending
                const prevDelay = activeDelayByElement.get(welcomeEl)
                if (prevDelay) {
                  prevDelay.kill()
                  activeDelayByElement.delete(welcomeEl)
                }
                const delay = gsap.delayedCall(1, () => {
                  // Change color and scramble into the new text
                  gsap.to(welcomeEl, { color: '#6a8689', duration: 0.2 })
                  scrambleElementText(welcomeEl, {
                    text: '---choose your quest---',
                    duration: 1,
                    onComplete: () => {
                      // Blink three times, then stay static
                      blinkElement(welcomeEl, {
                        blinks: 3,
                        durationPerHalf: 0.12,
                      })
                      // Restore baseline text and color after the sequence completes when leaving Tab 1 next time
                      const base = getWelcomeBaseline(welcomeEl)
                      welcomeEl.dataset.restoreText = base.text
                      welcomeEl.dataset.restoreColor = base.color
                    },
                  })
                  // Clear stored delay once executed
                  activeDelayByElement.delete(welcomeEl)
                })
                activeDelayByElement.set(welcomeEl, delay)
              }

              if (
                firstBlink &&
                typeof firstBlink.eventCallback === 'function'
              ) {
                firstBlink.eventCallback('onComplete', proceed)
              } else {
                proceed()
              }
            },
          })
        }
      }
    }

    switchTabOnArrowPress(e) {
      const currentTab = e.target
      const tabsArray = Array.from(this.tabs)
      const currentIndex = tabsArray.indexOf(currentTab)

      let newIndex
      if (e.key === 'ArrowLeft') {
        newIndex = currentIndex === 0 ? tabsArray.length - 1 : currentIndex - 1
      } else {
        newIndex = currentIndex === tabsArray.length - 1 ? 0 : currentIndex + 1
      }

      this.switchTab(tabsArray[newIndex], false, 'keyboard')
      e.preventDefault()
    }
  }

  // Initialize all tab interfaces on the page
  document
    .querySelectorAll('.tab-container')
    .forEach((container) => new TabInterface(container))
}

export default initAgencyTabs
