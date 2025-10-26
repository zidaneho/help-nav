const selectedClassName = "current";

// API configuration
const claudeApiKeyInput = document.getElementById('claudeApiKey');
const apiKeyInput = document.getElementById('apiKey');
const referenceIdInput = document.getElementById('referenceId');
const showDebugMarkerInput = document.getElementById('showDebugMarker');
const saveBtn = document.getElementById('saveBtn');
const statusDiv = document.getElementById('status');

// Show status message
function showStatus(message, type = "info") {
  if (!statusDiv) return;
  statusDiv.textContent = message;
  statusDiv.classList.remove("error", "success");
  statusDiv.classList.add(type === "error" ? "error" : "success");
  setTimeout(() => (statusDiv.textContent = ""), 2000);
}

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

// Load saved Fish Audio settings
chrome.storage.local.get(['claudeApiKey', 'fishAudioApiKey', 'fishAudioReferenceId', 'showDebugMarker'], (data) => {
  if (data.claudeApiKey) {
    claudeApiKeyInput.value = data.claudeApiKey;
  }
  if (data.fishAudioApiKey) {
    apiKeyInput.value = data.fishAudioApiKey;
  }
  if (data.fishAudioReferenceId) {
    referenceIdInput.value = data.fishAudioReferenceId;
  }
  // Default to false if not set
  showDebugMarkerInput.checked = data.showDebugMarker || false;
});

// Save settings
saveBtn.addEventListener('click', () => {
  const claudeKey = claudeApiKeyInput.value.trim();
  const fishKey = apiKeyInput.value.trim();
  const referenceId = referenceIdInput.value.trim();
  const showDebugMarker = showDebugMarkerInput.checked;

<<<<<<< HEAD
  chrome.storage.sync.set(
    {
      fishAudioApiKey: apiKey,
      fishAudioReferenceId: referenceId,
    },
    () => {
      showStatus("Settings saved successfully!", "success");
      // Notify background script to reload settings
      chrome.runtime.sendMessage({ type: "RELOAD_FISH_AUDIO_CONFIG" });
    }
  );
=======
  if (!claudeKey) {
    showStatus('Please enter a Claude API key (required for intelligent commands)', 'error');
    return;
  }

  chrome.storage.local.set({
    claudeApiKey: claudeKey,
    fishAudioApiKey: fishKey,
    fishAudioReferenceId: referenceId,
    showDebugMarker: showDebugMarker
  }, () => {
    showStatus('Settings saved successfully!', 'success');
    // Notify background script to reload settings
    chrome.runtime.sendMessage({ type: 'RELOAD_CONFIG' });
  });
>>>>>>> 21d247aaf7dd9392c5b4afa87b9f072ca608ac88
});
