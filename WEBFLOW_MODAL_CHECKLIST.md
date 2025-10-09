# Webflow Modal Setup Checklist

## Required HTML Structure

Your Webflow page needs these elements for the modals to work:

### 1. Modal Container

```html
<!-- Main container with ID -->
<div id="agencyModals" class="non">
  <!-- Your modal frames go here -->
</div>
```

### 2. Modal Frames (inside the container)

```html
<!-- First modal frame = sfModal -->
<div class="services-modal-framewrap non">
  <!-- Content for sfModal -->
</div>

<!-- Second modal frame = msModal -->
<div class="services-modal-framewrap non">
  <!-- Content for msModal -->
</div>
```

**Important:** The order matters!

- First `.services-modal-framewrap` = `sfModal`
- Second `.services-modal-framewrap` = `msModal`

### 3. Trigger Buttons

```html
<!-- Button to open msModal -->
<a
  href="https://www.twilightfringe.com/agency#msModal"
  class="openlink_wrapper w-inline-block"
>
  <div class="services-button">NOTIFY ME</div>
</a>

<!-- Button to open sfModal -->
<a
  href="https://www.twilightfringe.com/agency#sfModal"
  class="openlink_wrapper w-inline-block"
>
  <div class="services-button">OPEN SFMODAL</div>
</a>
```

### 4. Close Button (inside each modal frame)

```html
<button id="closeAgencyModal">Close</button>
<!-- or -->
<div id="closeAgencyModal">X</div>
```

**Note:** Multiple elements can have the same ID `closeAgencyModal` - the script will add listeners to all of them.

## CSS Classes

Make sure your CSS has a `.non` class to hide elements:

```css
.non {
  display: none !important;
}
```

## Verification Steps

### In Webflow Designer:

1. **Check Container:**

   - Look for element with ID `agencyModals`
   - Should have class `non` by default (hidden)

2. **Check Modal Frames:**

   - Count `.services-modal-framewrap` elements
   - Should have at least 2
   - Both should have class `non` by default (hidden)
   - First one = sfModal
   - Second one = msModal

3. **Check Buttons:**

   - All modal trigger buttons should have:
     - Element type: Link (`<a>`)
     - Href containing `#msModal` or `#sfModal`
     - Full URL is fine: `https://www.twilightfringe.com/agency#msModal`

4. **Check Close Buttons:**
   - All close buttons should have ID `closeAgencyModal`
   - Can be inside each modal frame

### In Browser Console:

After the page loads, run:

```javascript
// Check if controller exists
console.log(window.agencyModalController)

// Check registered modals
console.log(window.agencyModalController.modals)

// Should see Map with entries: sfModal, msModal
```

## Common Issues

### Modal doesn't open when clicking button:

- Check that the hash in the button href matches the modal name exactly
- Verify JavaScript is loaded (check console for initialization logs)
- Make sure `e.preventDefault()` is working (button shouldn't reload page)

### Modal opens but nothing shows:

- Check that `.non` class is being removed from container
- Verify modal frame has content
- Check CSS z-index if modal is behind other elements

### Multiple modals show at once:

- Ensure all modal frames have `.non` class initially
- Check that only one modal frame is missing `.non` when modal is open

### Hash in URL but modal doesn't open:

- Check that modal names match exactly (case-sensitive)
- Verify modals were registered (check console logs)
- Try manually: `window.agencyModalController.modals.get('msModal')`

## Debug Commands

Open browser console and try:

```javascript
// See what modals are registered
Array.from(window.agencyModalController.modals.keys())

// Manually test opening a modal
window.testModal('msModal')
window.testModal('sfModal')

// Manually close all modals
window.closeAllTestModals()

// Check current hash
window.location.hash
```
