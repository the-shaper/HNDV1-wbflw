function initCardTabs() {
  document.addEventListener('DOMContentLoaded', function () {
    // Select all elements
    const tabCards = document.querySelectorAll('.tab-card')
    const tabPanes = document.querySelectorAll('.tab-card-pane')
    const tabTitles = document.querySelectorAll('.tab-card-title')

    // Helper function to show content for a specific index
    function showContent(index) {
      // Hide all panes and titles
      tabPanes.forEach((pane) => pane.classList.add('non'))
      tabTitles.forEach((title) => title.classList.add('non'))
      tabCards.forEach((card) => card.classList.remove('is-active'))

      // Show matching content
      const targetPane = document.querySelector(
        `.tab-card-pane[data-pane-index="${index}"]`
      )
      const targetTitle = document.querySelector(
        `.tab-card-title[data-title-index="${index}"]`
      )
      const targetCard = document.querySelector(
        `.tab-card[data-tab-index="${index}"]`
      )

      if (targetPane) targetPane.classList.remove('non')
      if (targetTitle) targetTitle.classList.remove('non')
      if (targetCard) targetCard.classList.add('is-active')
    }

    // Add click handlers to tab cards
    tabCards.forEach((card) => {
      card.addEventListener('click', () => {
        const index = card.getAttribute('data-tab-index')
        showContent(index)
      })
    })

    // Show first tab by default
    if (tabCards.length > 0) {
      const firstTabIndex = tabCards[0].getAttribute('data-tab-index')
      showContent(firstTabIndex)
    }
  })
}

initCardTabs()

export default initCardTabs
