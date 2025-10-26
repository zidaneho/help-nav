// popup.js (Manifest V3)
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const repeatBtn = document.getElementById("repeatBtn");
const assistantBtn = document.getElementById("assistantBtn");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const lastTranscriptEl = document.getElementById("lastTranscript");
const ttsStatus = document.getElementById("ttsStatus");
const settingsLink = document.getElementById("settingsLink");

// Speech recognition (runs in popup context)
let recognition = null;
let isListening = false;

function setListeningUI(listening) {
  if (listening) {
    statusDot.classList.add("listening");
    statusText.textContent = "Listening…";
    startBtn.disabled = true;
    stopBtn.disabled = false;
  } else {
    statusDot.classList.remove("listening");
    statusText.textContent = "Idle";
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

function sendMessage(msg) {
  chrome.runtime.sendMessage(msg);
}

// Initialize speech recognition
function initSpeechRecognition() {
  if (!("webkitSpeechRecognition" in window)) {
    console.error("Speech recognition not supported");
    startBtn.disabled = true;
    statusText.textContent = "Speech recognition not supported";
    return false;
  }

  recognition = new webkitSpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onresult = (event) => {
    const transcript =
      event.results[event.results.length - 1][0].transcript.trim();
    console.log("Heard:", transcript);
    lastTranscriptEl.textContent = transcript;

    // Send command to background
    chrome.runtime.sendMessage({
      type: "VOICE_COMMAND",
      text: transcript,
    });
  };

  recognition.onstart = () => {
    console.log("Speech recognition started");
    setListeningUI(true);
    
    // Hide the hint once mic is successfully accessed
    const micHint = document.getElementById("micHint");
    if (micHint) {
      micHint.style.display = "none";
      // Remember that they've used it
      localStorage.setItem("micPermissionGranted", "true");
    }
  };

  recognition.onend = () => {
    console.log("Speech recognition ended. isListening:", isListening);
    if (isListening) {
      // Restart if we're still supposed to be listening
      setTimeout(() => {
        try {
          recognition.start();
        } catch (e) {
          console.error("Error restarting recognition:", e);
          isListening = false;
          setListeningUI(false);
        }
      }, 100);
    } else {
      setListeningUI(false);
      chrome.runtime.sendMessage({
        type: "UPDATE_LISTENING_STATUS",
        listening: false,
      });
    }
  };

  recognition.onerror = (e) => {
    console.error("Speech recognition error:", e.error, e);

    // Handle specific errors
    if (e.error === "not-allowed" || e.error === "service-not-allowed") {
      alert(
        "Microphone permission denied. Please allow microphone access in your browser settings."
      );
      isListening = false;
      setListeningUI(false);
      statusText.textContent = "Microphone access denied";
    } else if (e.error === "no-speech") {
      // No speech detected, keep listening
      console.log("No speech detected, continuing...");
    } else if (e.error === "audio-capture") {
      alert("No microphone found. Please connect a microphone.");
      isListening = false;
      setListeningUI(false);
    } else if (e.error === "aborted") {
      // User stopped it, this is fine
      console.log("Speech recognition aborted");
    } else {
      // Other errors - stop listening
      isListening = false;
      setListeningUI(false);
      statusText.textContent = `Error: ${e.error}`;
    }
  };

  return true;
}

// Start listening
function startListening() {
  if (!recognition && !initSpeechRecognition()) {
    return;
  }

  // Don't start if already listening
  if (isListening) {
    console.log("Already listening");
    return;
  }

  isListening = true;
  setListeningUI(true);

  try {
    console.log("Starting speech recognition...");
    recognition.start();
    chrome.runtime.sendMessage({
      type: "UPDATE_LISTENING_STATUS",
      listening: true,
    });
  } catch (e) {
    console.error("Error starting recognition:", e);
    // If it's already started, that's okay
    if (e.message && e.message.includes("already started")) {
      console.log("Recognition already running");
    } else {
      isListening = false;
      setListeningUI(false);
      alert("Could not start speech recognition: " + e.message);
    }
  }
}

// Stop listening
function stopListening() {
  isListening = false;
  setListeningUI(false);

  if (recognition) {
    recognition.stop();
  }

  chrome.runtime.sendMessage({
    type: "UPDATE_LISTENING_STATUS",
    listening: false,
  });
}

// Wire buttons
startBtn.addEventListener("click", () => {
  startListening();
});

stopBtn.addEventListener("click", () => {
  stopListening();
});

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

// Initialize speech recognition on load
initSpeechRecognition();

// Request current status from background
sendMessage({ type: "GET_STATUS" });

// Hide mic hint if permission already granted
if (localStorage.getItem("micPermissionGranted") === "true") {
  const micHint = document.getElementById("micHint");
  if (micHint) {
    micHint.style.display = "none";
  }
}

// Check configuration
chrome.storage.local.get(["claudeApiKey", "fishAudioApiKey"], (data) => {
  // Check Claude (required for intelligent commands)
  if (!data.claudeApiKey) {
    statusText.textContent = "⚠️ Configure Claude API";
    statusText.style.color = "#ea580c";
    statusText.style.cursor = "pointer";
    statusText.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
  }
  
  // Check Fish Audio (optional for TTS)
  if (data.fishAudioApiKey) {
    ttsStatus.textContent = "🐟 Fish Audio (Premium)";
    ttsStatus.style.color = "#16a34a";
  } else {
    ttsStatus.textContent = "🔊 Native TTS (Basic)";
    ttsStatus.style.color = "#ea580c";
  }
});

// Open settings when link is clicked
settingsLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
