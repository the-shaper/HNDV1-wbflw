function initBoardTabs() {
  document.addEventListener('DOMContentLoaded', function () {
    // Initialize all board tab containers
    function initializeBoardTabSet(container) {
      const boardTabs = container.querySelectorAll('.board-tab')
      const boardPanes = container.querySelectorAll('.board-pane')

      function showBoardContent(index) {
        // Hide all panes and deactivate all tabs
        boardPanes.forEach((pane) => pane.classList.add('non'))
        boardTabs.forEach((tab) => tab.classList.remove('is-active'))

        // Show selected pane and activate selected tab
        const targetPane = container.querySelector(
          `.board-pane[data-board-index="${index}"]`
        )
        const targetTab = container.querySelector(
          `.board-tab[data-board-index="${index}"]`
        )

        if (targetPane) targetPane.classList.remove('non')
        if (targetTab) targetTab.classList.add('is-active')
      }

      // Add click handlers to board tabs
      boardTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          const index = tab.getAttribute('data-board-index')
          showBoardContent(index)
        })
      })

      // Show first board tab by default
      if (boardTabs.length > 0) {
        const firstTabIndex = boardTabs[0].getAttribute('data-board-index')
        showBoardContent(firstTabIndex)
      }
    }

    // Initialize board tabs for each tab-card-pane
    const tabCardPanes = document.querySelectorAll('.tab-card-pane')
    tabCardPanes.forEach((pane) => {
      initializeBoardTabSet(pane)
    })

    // Re-initialize board tabs when tab-card changes
    const tabCards = document.querySelectorAll('.tab-card')
    tabCards.forEach((card) => {
      card.addEventListener('click', () => {
        // Small delay to ensure pane is visible
        setTimeout(() => {
          const activePane = document.querySelector('.tab-card-pane:not(.non)')
          if (activePane) {
            initializeBoardTabSet(activePane)
          }
        }, 50)
      })
    })
  })
}

initBoardTabs()

export default initBoardTabs
