const selectedClassName = "current";

// Fish Audio API configuration
const apiKeyInput = document.getElementById("apiKey");
const referenceIdInput = document.getElementById("referenceId");
const saveBtn = document.getElementById("saveBtn");
const statusDiv = document.getElementById("status");

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
chrome.storage.sync.get(["fishAudioApiKey", "fishAudioReferenceId"], (data) => {
  if (data.fishAudioApiKey) {
    apiKeyInput.value = data.fishAudioApiKey;
  }
  if (data.fishAudioReferenceId) {
    referenceIdInput.value = data.fishAudioReferenceId;
  }
});

// Save Fish Audio settings
saveBtn.addEventListener("click", () => {
  const apiKey = apiKeyInput.value.trim();
  const referenceId = referenceIdInput.value.trim();

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
});
