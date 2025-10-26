// background.js (Manifest V3)
// Handles command processing and coordination
// Note: Speech recognition moved to popup.js (service workers don't support Web Speech API)

let listening = false;
let lastTranscript = "";
let lastAction = null;
let fishAudioApiKey = null;
let fishAudioReferenceId = null;

// Load Fish Audio config
chrome.storage.sync.get(["fishAudioApiKey", "fishAudioReferenceId"], (data) => {
  fishAudioApiKey = data.fishAudioApiKey || null;
  fishAudioReferenceId = data.fishAudioReferenceId || null;
  console.log(
    "Fish Audio config loaded:",
    fishAudioApiKey ? "API key present" : "No API key"
  );
});

// Generate TTS using Fish Audio API (background script avoids CORS)
async function generateFishAudioTTS(text) {
  if (!fishAudioApiKey) {
    throw new Error("Fish Audio API key not configured");
  }

  const url = "https://api.fish.audio/v1/tts";
  const requestBody = {
    text: text,
    reference_id: fishAudioReferenceId || undefined,
    format: "mp3",
    latency: "normal",
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${fishAudioApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fish Audio API error:", response.status, errorText);
      throw new Error(`Fish Audio API error: ${response.status}`);
    }

    // Get audio data as blob
    const audioBlob = await response.blob();
    // Convert blob to base64 for passing to content script
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return base64;
  } catch (error) {
    console.error("Error generating Fish Audio TTS:", error);
    throw error;
  }
}

// Command parser (simple keywords)
function handleCommand(text) {
  console.log("handleCommand: Received text:", text);
  text = text.toLowerCase();

  let payload = null;
  if (text.includes("scroll down")) {
    payload = { action: "scroll", direction: "down", speak: "Scrolling down." };
  } else if (text.includes("scroll up")) {
    payload = { action: "scroll", direction: "up", speak: "Scrolling up." };
  } else if (text.includes("click")) {
    const target = text.split("click")[1]?.trim();
    console.log(
      'handleCommand: Extracted target from "click" command:',
      target
    );
    payload = {
      action: "click",
      selector: target,
      speak: `Here's the ${target} button. Click it to proceed.`,
    };
  } else if (text.includes("highlight")) {
    const target = text.split("highlight")[1]?.trim();
    console.log(
      'handleCommand: Extracted target from "highlight" command:',
      target
    );
    payload = {
      action: "highlight",
      selector: target,
      speak: `Highlighting ${target}.`,
    };
  } else if (text.includes("go back")) {
    payload = { action: "goback", speak: "Going back." };
  } else {
    console.log("handleCommand: No matching command found for:", text);
  }

  if (payload) {
    console.log("handleCommand: Sending payload:", payload);
    lastAction = payload;
    // Send nav action to active tab
    sendToActiveTab({ type: "NAV_ACTION", payload });
    // Send AI response to active tab for assistant panel
    sendToActiveTab({
      type: "AI_RESPONSE",
      text: payload.speak || "",
    });
    // Also notify popup with AI response text to render chat bubble
    try {
      chrome.runtime.sendMessage({
        type: "AI_RESPONSE",
        text: payload.speak || "",
      });
    } catch (e) {
      // ignore if no popup is listening
    }
  }
}

// Sends a message to the current tab
function sendToActiveTab(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length) {
      chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
        // Handle connection errors gracefully
        if (chrome.runtime.lastError) {
          console.log(
            "Could not send message to tab:",
            chrome.runtime.lastError.message
          );
          console.log(
            "This usually means the content script is not loaded on this page."
          );
        }
      });
    }
  });
}

// Popup messages
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "VOICE_COMMAND") {
    // Handle voice command from popup
    lastTranscript = msg.text;
    handleCommand(msg.text);
  }
  if (msg.type === "UPDATE_LISTENING_STATUS") {
    listening = msg.listening;
  }
  if (msg.type === "REPEAT_LAST" && lastAction) {
    sendToActiveTab({ type: "NAV_ACTION", payload: lastAction });
  }
  if (msg.type === "GET_STATUS") {
    // Return current status to popup
    chrome.runtime.sendMessage({
      type: "STATUS_UPDATE",
      listening: listening,
      lastTranscript: lastTranscript,
    });
  }
  if (msg.type === "RELOAD_FISH_AUDIO_CONFIG") {
    // Reload Fish Audio config
    chrome.storage.sync.get(
      ["fishAudioApiKey", "fishAudioReferenceId"],
      (data) => {
        fishAudioApiKey = data.fishAudioApiKey || null;
        fishAudioReferenceId = data.fishAudioReferenceId || null;
        console.log("Fish Audio config reloaded");
      }
    );
    // Forward the message to all tabs
    sendToActiveTab({ type: "RELOAD_FISH_AUDIO_CONFIG" });
  }

  // Handle TTS request from content script
  if (msg.type === "GENERATE_TTS") {
    (async () => {
      try {
        const audioBase64 = await generateFishAudioTTS(msg.text);
        // Send audio back to content script
        chrome.tabs.sendMessage(
          sender.tab.id,
          {
            type: "TTS_AUDIO",
            audio: audioBase64,
            requestId: msg.requestId,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.log(
                "Could not send TTS audio to tab:",
                chrome.runtime.lastError.message
              );
            }
          }
        );
      } catch (error) {
        console.error("TTS generation error:", error);
        // Send error back to content script to use fallback
        chrome.tabs.sendMessage(
          sender.tab.id,
          {
            type: "TTS_ERROR",
            error: error.message,
            requestId: msg.requestId,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.log(
                "Could not send TTS error to tab:",
                chrome.runtime.lastError.message
              );
            }
          }
        );
      }
    })();
    return true; // Keep message channel open for async response
  }
});
