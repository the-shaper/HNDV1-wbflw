Import methods
ES Modules
To import Anime.js using the ES Modules syntax, you can use the import statement as shown below:

import {
  animate,
  createTimeline,
  createTimer,
  // ...other methods
} from 'animejs';

Global object
You can define Anime.js globally using a script tag like this:

<script src="path/to/anime.iife.min.js"></script>

Then access all the modules directly from anime object:

anime.animate();
anime.createTimeline();
anime.createTimer();
// ...other methods

Or you can mimic the ESM import syntax by using the object destructuring syntax like this:

const {
  animate,
  createTimeline,
  createTimer,
  // ...other methods
} = anime;

---

Using Anime.js in vanilla JavaScript is pretty straightforward, simply import the modules you need and start animating.

The following example showcase how to uses Anime.js methods with a vanilla JS code base.

Using with vanilla JS code example
JavaScript
HTML
import { animate, utils, createDraggable, createSpring } from 'animejs';

const [ $logo ] = utils.$('.logo.js');
const [ $button ] = utils.$('button');
let rotations = 0;

// Created a bounce animation loop
animate('.logo.js', {
  scale: [
    { to: 1.25, ease: 'inOut(3)', duration: 200 },
    { to: 1, ease: createSpring({ stiffness: 300 }) }
  ],
  loop: true,
  loopDelay: 250,
});

// Make the logo draggable around its center
createDraggable('.logo.js', {
  container: [0, 0, 0, 0],
  releaseEase: createSpring({ stiffness: 200 })
});

// Animate logo rotation on click
const rotateLogo = () => {
  rotations++;
  $button.innerText = `rotations: ${rotations}`;
  animate($logo, {
    rotate: rotations * 360,
    ease: 'out(4)',
    duration: 1500,
  });
}

$button.addEventListener('click', rotateLogo);