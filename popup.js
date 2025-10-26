// popup.js (Manifest V3)
const repeatBtn = document.getElementById("repeatBtn");
const assistantBtn = document.getElementById("assistantBtn");
const lastTranscriptEl = document.getElementById("lastTranscript");
const ttsStatus = document.getElementById("ttsStatus");
const settingsLink = document.getElementById("settingsLink");

// --- All Speech Recognition Code Removed ---
// (No more startBtn, stopBtn, statusDot, recognition, isListening)
// (No more setListeningUI, initSpeechRecognition, startListening, stopListening)
// ---

function sendMessage(msg) {
  chrome.runtime.sendMessage(msg);
}

// Wire buttons
repeatBtn.addEventListener("click", () => {
  sendMessage({ type: "REPEAT_LAST" });
});

assistantBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "TOGGLE_ASSISTANT" });
    }
  });
});

// Listen for background updates
chrome.runtime.onMessage.addListener((message) => {
  if (!message || typeof message !== "object") return;

  if (message.type === "STATUS_UPDATE") {
    // Update UI with status from background
    if (message.lastTranscript) {
      lastTranscriptEl.textContent = message.lastTranscript;
    }
  }
});

// Request current status from background
sendMessage({ type: "GET_STATUS" });

// Check Fish Audio configuration
chrome.storage.sync.get(["fishAudioApiKey"], (data) => {
  if (data.fishAudioApiKey) {
    ttsStatus.textContent = "🐟 Fish Audio (Premium)";
    ttsStatus.classList.remove("tts-warn");
    ttsStatus.classList.add("tts-ok");
  } else {
    ttsStatus.textContent = "🔊 Native TTS (Basic)";
    ttsStatus.classList.remove("tts-ok");
    ttsStatus.classList.add("tts-warn");
  }
});

// Open settings when link is clicked
settingsLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
