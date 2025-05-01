Okay, I understand the request. You want to shift from configuring each instance via multiple individual data-_ attributes to using a single data-mode attribute (e.g., data-mode="A"). These "modes" (like A and B) will represent pre-saved bundles of settings.
You also want the energy.html page to function as a configurator where you can:
Adjust settings using the sliders/pickers.
Save the current settings as "Mode A" or "Mode B".
Load "Mode A" or "Mode B" back into the sliders/pickers and the live simulation on the page.
The saving process should update a persistent store of these modes, ideally a energyModes.json file.
This is a good approach for simplifying configuration in Webflow.
Here's the plan:
Phase 1: Storing and Loading Modes
Create energyModes.json: Create a new file named energyModes.json in the same directory as energy.js. Initialize it with default structures for Mode A and Mode B, perhaps based on the current defaultParams.
Load Modes on Startup:
Modify energy.js to fetch and parse energyModes.json when the script loads. Store the parsed modes (e.g., in a savedModes object). Handle potential errors (file not found, invalid JSON).
This loading needs to happen before initializeSimulations runs, or initializeSimulations needs to wait for it. We'll use async/await.
Modify Initialization Logic (init):
When initializing a simulation instance (for #container or .energy-container), check if the container element has a data-mode attribute (e.g., data-mode="A").
If data-mode exists: Look up the corresponding mode (e.g., 'A') in the savedModes object. Use the settings from that mode, merged over the defaultParams, as the instanceParams for this simulation. Ignore individual data-_ attributes on this container if data-mode is present.
If data-mode does NOT exist: Fall back to using the defaultParams combined with any individual data-_ attributes found using the existing readParametersFromDOM function. (This provides backward compatibility or allows overriding defaults without defining a full mode).
Apply Settings: The rest of the init function proceeds as before, using the determined instanceParams (either from a mode or from defaults/attributes).
Phase 2: Configurator UI in energy.html
Add Buttons: Add four new buttons to the #controls section in energy.html:
"Save as Mode A" (id="saveModeA")
"Save as Mode B" (id="saveModeB")
"Set to Mode A" (id="loadModeA")
"Set to Mode B" (id="loadModeB")
Implement "Save" Logic:
Create a helper function getCurrentSettingsFromControls that reads the current values from all sliders and color pickers in the #controls div and returns them as a parameter object.
Create a saveMode(modeId) function:
Calls getCurrentSettingsFromControls.
Updates the savedModes object in memory with the current settings under the given modeId ('A' or 'B').
Converts the entire savedModes object to a JSON string.
Crucially: Since browser JavaScript cannot directly write to the local file system for security reasons, the most practical way to "save" the energyModes.json is to trigger a file download. The user will then manually replace the old energyModes.json in their project with the downloaded one.
Implement "Load" Logic:
Create a loadModeToControls(modeId) function:
Retrieves the settings for the given modeId from the savedModes object.
Updates the values of all sliders, color pickers, and display spans (#particleAmountValue, etc.) in #controls to match the loaded mode's settings.
Calls window.updateEnergySimulation with the loaded mode's settings to update the live simulation preview on the energy.html page.
Add Event Listeners: In setupControls, add click event listeners to the new buttons to call saveMode('A'), saveMode('B'), loadModeToControls('A'), and loadModeToControls('B').
Confirmation:
Yes, you explained yourself clearly. The plan involves:
Storing mode configurations (A, B) potentially in energyModes.json.
Using data-mode="A" or data-mode="B" on Webflow elements instead of many data-_ attributes.
Adding UI elements (Save/Load buttons) to energy.html to manage these modes.
Triggering a download of the updated energyModes.json when saving.
Does this plan align with your vision? Shall we proceed with creating the energyModes.json file and implementing the JavaScript changes first?
