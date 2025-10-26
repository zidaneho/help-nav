const page = document.getElementById('buttonDiv');
const selectedClassName = 'current';
const presetButtonColors = ['#3aa757', '#e8453c', '#f9bb2d', '#4688f1'];

// Fish Audio API configuration
const apiKeyInput = document.getElementById('apiKey');
const referenceIdInput = document.getElementById('referenceId');
const saveBtn = document.getElementById('saveBtn');
const statusDiv = document.getElementById('status');

// Reacts to a button click by marking the selected button and saving
// the selection
function handleButtonClick(event) {
  // Remove styling from the previously selected color
  const current = event.target.parentElement.querySelector(
    `.${selectedClassName}`
  );
  if (current && current !== event.target) {
    current.classList.remove(selectedClassName);
  }

  // Mark the button as selected
  const color = event.target.dataset.color;
  event.target.classList.add(selectedClassName);
  chrome.storage.sync.set({ color });
}

// Add a button to the page for each supplied color
function constructOptions(buttonColors) {
  chrome.storage.sync.get('color', (data) => {
    const currentColor = data.color;

    // For each color we were provided…
    for (const buttonColor of buttonColors) {
      // …create a button with that color…
      const button = document.createElement('button');
      button.dataset.color = buttonColor;
      button.style.backgroundColor = buttonColor;

      // …mark the currently selected color…
      if (buttonColor === currentColor) {
        button.classList.add(selectedClassName);
      }

      // …and register a listener for when that button is clicked
      button.addEventListener('click', handleButtonClick);
      page.appendChild(button);
    }
  });
}

// Initialize the page by constructing the color options
constructOptions(presetButtonColors);

// Load saved Fish Audio settings
chrome.storage.sync.get(['fishAudioApiKey', 'fishAudioReferenceId'], (data) => {
  if (data.fishAudioApiKey) {
    apiKeyInput.value = data.fishAudioApiKey;
  }
  if (data.fishAudioReferenceId) {
    referenceIdInput.value = data.fishAudioReferenceId;
  }
});

// Save Fish Audio settings
saveBtn.addEventListener('click', () => {
  const apiKey = apiKeyInput.value.trim();
  const referenceId = referenceIdInput.value.trim();

  if (!apiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }

  chrome.storage.sync.set({
    fishAudioApiKey: apiKey,
    fishAudioReferenceId: referenceId
  }, () => {
    showStatus('Settings saved successfully!', 'success');
    // Notify background script to reload settings
    chrome.runtime.sendMessage({ type: 'RELOAD_FISH_AUDIO_CONFIG' });
  });
});

// Show status message
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  
  if (type === 'success') {
    setTimeout(() => {
      statusDiv.className = 'status';
    }, 3000);
  }
}
