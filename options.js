const selectedClassName = "current";

// API configuration
const claudeApiKeyInput = document.getElementById("claudeApiKey");
const apiKeyInput = document.getElementById("apiKey");
const referenceIdInput = document.getElementById("referenceId");
const showDebugMarkerInput = document.getElementById("showDebugMarker");
const saveBtn = document.getElementById("saveBtn");
const statusDiv = document.getElementById("status");

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
chrome.storage.local.get(
  [
    "claudeApiKey",
    "fishAudioApiKey",
    "fishAudioReferenceId",
    "showDebugMarker",
  ],
  (data) => {
    if (data.claudeApiKey) {
      claudeApiKeyInput.value = data.claudeApiKey;
    }
    if (data.fishAudioApiKey) {
      apiKeyInput.value = data.fishAudioApiKey;
    }
    if (data.fishAudioReferenceId) {
      referenceIdInput.value = data.fishAudioReferenceId;
    }
    // Default to false if not set (only if element exists)
    if (showDebugMarkerInput) {
      showDebugMarkerInput.checked = data.showDebugMarker || false;
    }
  }
);

// Show status message with auto-hide
function showStatus(message, type = "success") {
  if (!statusDiv) return;

  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;

  // Auto-hide success messages after 4 seconds
  if (type === "success") {
    setTimeout(() => {
      statusDiv.className = "status";
    }, 4000);
  }
}

// Save settings with enhanced feedback
saveBtn.addEventListener("click", async () => {
  const claudeKey = claudeApiKeyInput.value.trim();
  const fishKey = apiKeyInput.value.trim();
  const referenceId = referenceIdInput.value.trim();
  const showDebugMarker = showDebugMarkerInput
    ? showDebugMarkerInput.checked
    : false;

  // Validation
  if (!claudeKey) {
    showStatus(
      "Please enter a Claude API key (required for intelligent commands)",
      "error"
    );
    claudeApiKeyInput.focus();
    return;
  }

  // Show loading state
  saveBtn.disabled = true;
  saveBtn.classList.add("loading");
  saveBtn.textContent = "Saving...";
  showStatus("Saving settings...", "warning");

  try {
    // Save to storage
    await new Promise((resolve, reject) => {
      chrome.storage.local.set(
        {
          claudeApiKey: claudeKey,
          fishAudioApiKey: fishKey,
          fishAudioReferenceId: referenceId,
          showDebugMarker: showDebugMarker,
        },
        () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        }
      );
    });

    // Notify background script to reload settings
    chrome.runtime.sendMessage({ type: "RELOAD_CONFIG" });

    // Show success message
    showStatus("Settings saved successfully!", "success");
  } catch (error) {
    console.error("Error saving settings:", error);
    showStatus("Failed to save settings. Please try again.", "error");
  } finally {
    // Reset button state
    saveBtn.disabled = false;
    saveBtn.classList.remove("loading");
    saveBtn.textContent = "Save Settings";
  }
});
