// popup.js (Manifest V3)
const repeatBtn = document.getElementById("repeatBtn"); // Note: This ID is not in popup.html
const assistantBtn = document.getElementById("assistantBtn"); // Note: This ID is not in popup.html
const lastTranscriptEl = document.getElementById("lastTranscript"); // Note: This ID is not in popup.html
const ttsStatus = document.getElementById("ttsStatus");
const settingsLink = document.getElementById("settingsLink");
const logoImg = document.getElementById("logo-img");
// const cursorRadios = ... (REMOVED)

// --- All Speech Recognition Code Removed ---
// (No more startBtn, stopBtn, statusDot, recognition, isListening)
// (No more setListeningUI, initSpeechRecognition, startListening, stopListening)
// ---

// Set logo URL
if (logoImg) {
  logoImg.src = chrome.runtime.getURL("/images/logo.svg");
}

function sendMessage(msg) {
  chrome.runtime.sendMessage(msg);
}

// --- Wire buttons (These buttons are not in your provided popup.html) ---
if (repeatBtn) {
  repeatBtn.addEventListener("click", () => {
    sendMessage({ type: "REPEAT_LAST" });
  });
}

if (assistantBtn) {
  assistantBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "TOGGLE_ASSISTANT" });
      }
    });
  });
}
// --- End wiring buttons not in HTML ---

// Listen for background updates
chrome.runtime.onMessage.addListener((message) => {
  if (!message || typeof message !== "object") return;

  if (message.type === "STATUS_UPDATE") {
    // Update UI with status from background
    if (message.lastTranscript && lastTranscriptEl) {
      lastTranscriptEl.textContent = message.lastTranscript;
    }
  }
});

// Request current status from background
sendMessage({ type: "GET_STATUS" });

// Check Fish Audio configuration
chrome.storage.sync.get(["fishAudioApiKey"], (data) => {
  // TTS Status
  if (data.fishAudioApiKey) {
    ttsStatus.textContent = "🐟 Fish Audio (Premium)";
    ttsStatus.classList.remove("tts-warn");
    ttsStatus.classList.add("tts-ok");
  } else {
    ttsStatus.textContent = "🔊 Native TTS (Basic)";
    ttsStatus.classList.remove("tts-ok");
    ttsStatus.classList.add("tts-warn");
  }

  // Load saved cursor style (REMOVED)
});

// Open settings when link is clicked
settingsLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

