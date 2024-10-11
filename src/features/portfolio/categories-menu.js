function initCategoriesMenu() {
  document.addEventListener('DOMContentLoaded', function () {
    const scrollContainer = document.querySelector('.scroll-nav-wrapper')

    // Function to update the active category in List 3
    function updateActiveCategory(categoryName, isActive) {
      const categoryTags = document.querySelectorAll('.category-tag-radio')

      categoryTags.forEach((tag) => {
        const parentCategoryItem = tag.closest('.category-tag-item')
        if (
          parentCategoryItem &&
          parentCategoryItem.getAttribute('data-categories') === categoryName
        ) {
          if (isActive) {
            tag.classList.add('is-active')
          } else {
            tag.classList.remove('is-active')
          }
        }
      })
    }

    // Event listener for the custom 'toggleActive' event
    const list1Items = document.querySelectorAll('.card-scroll_gal-item')
    list1Items.forEach((item) => {
      item.addEventListener('toggleActive', function (event) {
        const categoryName = item.getAttribute('data-categories')
        updateActiveCategory(categoryName, event.detail.isActive)
      })
    })

    // Remove duplicate categories from List 3
    const seenCategories = {}
    const categoryTags = document.querySelectorAll('.category-tag-item')

    categoryTags.forEach((tag) => {
      const categoryName = tag.getAttribute('data-categories')
      if (seenCategories[categoryName]) {
        tag.remove()
      } else {
        seenCategories[categoryName] = true
      }
    })

    // Add click-to-scroll functionality for category tags in List 3
    categoryTags.forEach((tag) => {
      tag.addEventListener('click', function () {
        const categoryName = tag.getAttribute('data-categories')
        const projectItems = document.querySelectorAll('.card-scroll_gal-item')
        let targetProject = null

        for (let project of projectItems) {
          if (project.getAttribute('data-categories') === categoryName) {
            targetProject = project
            break
          }
        }

        if (targetProject) {
          let targetScrollY =
            targetProject.offsetTop +
            targetProject.closest('.scroll-cards-wrapper').scrollTop -
            targetProject.closest('.scroll-cards-wrapper').offsetTop
          gsap.to(scrollContainer, {
            duration: 0.3,
            scrollTo: { y: targetScrollY, autoKill: false },
          })
        }
      })
    })

    // Keyboard navigation using arrow keys
    document.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const increment = event.key === 'ArrowDown' ? 1 : -1
        const activeIndex = Array.from(list1Items).findIndex((item) =>
          item.classList.contains('is-active')
        )
        let newIndex = activeIndex + increment

        if (newIndex >= 0 && newIndex < list1Items.length) {
          const targetItem = list1Items[newIndex]
          gsap.to(scrollContainer, {
            duration: 0.3,
            scrollTo: {
              y:
                targetItem.offsetTop +
                targetItem.closest('.scroll-cards-wrapper').scrollTop -
                targetItem.closest('.scroll-cards-wrapper').offsetTop,
              autoKill: false,
            },
          })
        }
      }
    })
  })
}

initCategoriesMenu()

export default initCategoriesMenu
