Lumos reference:

Color

Benefits
Switch section or element color themes from component & CMS fields

Globally adjust styles like button solid & outlined across multiple types of buttons

Create visual consistency throughout a project

Easily animate between themes with GSAP

Setting themes with data attributes
The following data attributes can be applied to elements to set a theme

data-theme="invert" (inverts the parent's theme)

data-theme="inherit" (inherits from the parent's theme)

data-theme="dark"

data-theme="light"

Setting button styles with data attributes
The following data attributes can be applied to buttons to switch their style (usually between solid and outlined)

data-button-style="primary"

data-button-style="secondary"

Text Color Utilities
u-color-inherit
inherits from parent's font color

Copy
color: inherit;
u-color-faded
--theme--text variable at a 60% opacity

Copy
color: color-mix(in srgb, var(--theme--text) 60%, transparent);
Swatch Folder
All colors should be saved in the swatch folder. These swatches can fit into three categories: dark, light, & brand. Names are abstracted to prevent renaming if values ever change.

Whenever --swatch--brand is applied as a background color, --swatch--brand-text is applied as its font color. If the brand color ever needs to change in the future to a darker color that requires light text, we can update that brand-text color from one place.

Theme Folder
These are the core colors related to the page or section. The values are left empty (set to white) so they can be redefined for light, dark, and brand themes inside the color embed. If multiple backgrounds, text colors, or borders are needed within each theme, we can add additional variables in this folder like background-2, text-2, border-2.

Element Folders
Element folders can be created for elements like buttons, links, cards, or any other elements that need their own background, text, border colors that are different from the section colors. The values are left empty (set to white) so they can be redefined inside the color embed for each of the themes. These elements will change color depending on the theme they're inside of it.

Defining Colors Across Themes
Themes are applied with data attributes so they can be linked to component and cms fields. Link theme and element variables to global swatches and define their values for both light, dark, and any other themes. This code is set in the .page_code_color embed.

Copy
/_ theme light _/
:root,
[data-theme="light"],
[data-theme="dark"] [data-theme="invert"] {
--theme--background: var(--swatch--light);
--theme--text: var(--swatch--dark);
--theme--border: var(--swatch--dark-fade);
/_ button primary _/
--button--background: var(--swatch--brand);
--button--text: var(--swatch--brand-text);
--button--border: var(--swatch--brand);
--button--background-hover: var(--swatch--dark);
--button--text-hover: var(--swatch--light);
--button--border-hover: var(--swatch--dark);
/_ button secondary _/
--button-secondary--background: var(--swatch--transparent);
--button-secondary--text: var(--swatch--dark);
--button-secondary--border: var(--swatch--dark-fade);
--button-secondary--background-hover: var(--swatch--brand);
--button-secondary--text-hover: var(--swatch--brand-text);
--button-secondary--border-hover: var(--swatch--brand);
}
/_ theme dark _/
[data-theme="dark"],
[data-theme="invert"],
[data-theme="light"] [data-theme="invert"] {
--theme--background: var(--swatch--dark);
--theme--text: var(--swatch--light);
--theme--border: var(--swatch--light-fade);
/_ button primary _/
--button--background: var(--swatch--brand);
--button--text: var(--swatch--brand-text);
--button--border: var(--swatch--brand);
--button--background-hover: var(--swatch--light);
--button--text-hover: var(--swatch--dark);
--button--border-hover: var(--swatch--light);
/_ button secondary _/
--button-secondary--background: var(--swatch--transparent);
--button-secondary--text: var(--swatch--light);
--button-secondary--border: var(--swatch--light-fade);
--button-secondary--background-hover: var(--swatch--brand);
--button-secondary--text-hover: var(--swatch--brand-text);
--button-secondary--border-hover: var(--swatch--brand);
}
Using variables that aren’t created in the variable panel
Instead of creating a separate folder just for the secondary version of our button, we can dynamically replace our primary button variables with the secondary version by using a data attribute. This allows us to easily switch the button style from a component field so we don’t have to upkeep multiple versions of the same button component.

Copy
/_ button secondary _/
[data-button-style="secondary"] {
--button--background: var(--button-secondary--background);
--button--text: var(--button-secondary--text);
--button--border: var(--button-secondary--border);
--button--background-hover: var(--button-secondary--background-hover);
--button--text-hover: var(--button-secondary--text-hover);
--button--border-hover: var(--button-secondary--border-hover);
}
Using the data-theme attribute to apply colors
Switching the value of --theme--background or --theme--text on an element doesn’t do anything if the element doesn’t have a background or font color applied. Instead of manually setting a background color and font color each time we apply an attribute, we can let the attribute apply the colors for us. These colors are completely overridable with native style panel.

Copy
/_ apply colors _/
:is(c, :where([data-theme]:not([data-theme="inherit"]))) {
background-color: var(--theme--background);
color: var(--theme--text);
}
Setting an element to invert its parent’s theme with [data-theme=”invert”]
We can apply [data-theme=”invert”] to any element so it does the opposite of its parent’s theme.

Reducing the opacity of any variable natively
Copy
color-mix(in srgb, var(--theme--text) 60%, transparent)

Animating between themes with GSAP
The below script automatically retrieves all themes and theme variables from our .page_code_color embed. This means any future variables we add to the embed will be automatically included in our animations.

gsap.to(".my-card", { ...colorTheme[2] }); animates the card to the second theme in our embed

https://www.youtube.com/watch?v=NrUL4r4r98A

Copy

<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/lumosframework/scripts@v1.0.5/themes.js"></script>
<script>
gsap.to(".my-card", { ...colorThemes[2] });
</script>

Multi-brand sites with Lumos
For multi-brand sites, we can use a data-brand attribute to dynamically switch out the brand colors.
