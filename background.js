// background.js (Manifest V3)
// Handles command processing and coordination
// Note: Speech recognition moved to popup.js (service workers don't support Web Speech API)

let listening = false;
let lastTranscript = "";
let lastAction = null;
let claudeApiKey = null;
let fishAudioApiKey = null;
let fishAudioReferenceId = null;

// Load config
chrome.storage.local.get(
  ["claudeApiKey", "fishAudioApiKey", "fishAudioReferenceId"],
  (data) => {
    claudeApiKey = data.claudeApiKey || null;
    fishAudioApiKey = data.fishAudioApiKey || null;
    fishAudioReferenceId = data.fishAudioReferenceId || null;
    console.log("Claude API:", claudeApiKey ? "Configured" : "Not configured");
    console.log(
      "Fish Audio:",
      fishAudioApiKey ? "Configured" : "Not configured"
    );
  }
);

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
    const bytes = new Uint8Array(arrayBuffer);

    // Convert to base64 in chunks to avoid stack overflow
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);
    return base64;
  } catch (error) {
    console.error("Error generating Fish Audio TTS:", error);
    throw error;
  }
}

// Query Claude API for action reasoning
async function queryClaudeForAction(userCommand, domSnapshot, pageUrl) {
  const systemPrompt = `You are an intelligent web navigation assistant. You help users navigate websites by identifying the correct elements to interact with.

Given a user's command, the current page URL, and a simplified DOM structure, your job is to:
1. Understand what the user wants to do
2. Check if the current page is relevant to the user's goal
3. Identify the best element(s) to interact with, OR suggest the user needs to navigate elsewhere first

Return your response as JSON with this structure:
{
  "reasoning": "Brief explanation of what you understood and whether the page is relevant",
  "action": "click" | "highlight" | "scroll" | "goback" | "not_found",
  "selector": "text to search for in elements (for click/highlight)",
  "direction": "up" | "down" (for scroll),
  "speak": "What to say to the user",
  "multiStep": false | true,
  "nextSteps": ["step 1", "step 2"] (if multi-step)
}

IMPORTANT CONTEXT RULES:
- If the user's goal doesn't match the current page (e.g., "make appointment" on google.com), use action "not_found" and tell them they're on the wrong page
- If the page IS relevant but you can't find the exact element, still suggest the closest match
- For search engines (google.com, bing.com), suggest using the search box to find the right site

Examples:
- User: "I want to make an appointment" on dmv.ca.gov → action: "click", selector: "appointments"
- User: "I want to make an appointment" on google.com → action: "not_found", speak: "You're on Google. Try searching for 'DMV appointment' first, or tell me which service you want to book an appointment for."
- User: "click search" → selector: "search"
- User: "scroll down" → action: "scroll", direction: "down"

Be helpful and context-aware!`;

  const userPrompt = `Page URL: ${pageUrl}

DOM Snapshot (interactive elements):
${domSnapshot}

User Command: "${userCommand}"

Analyze if this page is relevant to the user's goal. What action should be taken? Respond with JSON only.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": claudeApiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const claudeResponse = data.content[0].text;

    // Parse JSON response
    const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse Claude response as JSON");
    }

    const actionData = JSON.parse(jsonMatch[0]);
    console.log("Parsed action:", actionData);

    // Convert Claude's action format to our payload format
    let payload = {
      speak: actionData.speak || "Processing...",
    };

    if (actionData.action === "not_found") {
      // Claude determined the page isn't relevant to user's goal
      // Just speak the message, don't try to highlight anything
      return {
        payload: null,
        reasoning: actionData.reasoning,
        speakOnly: true,
        message: actionData.speak,
      };
    } else if (actionData.action === "scroll") {
      payload.action = "scroll";
      payload.direction = actionData.direction || "down";
    } else if (actionData.action === "goback") {
      payload.action = "goback";
    } else if (
      actionData.action === "click" ||
      actionData.action === "highlight"
    ) {
      payload.action = actionData.action;
      payload.selector = actionData.selector;
    }

    return {
      payload: payload,
      reasoning: actionData.reasoning,
      multiStep: actionData.multiStep,
      nextSteps: actionData.nextSteps,
    };
  } catch (error) {
    console.error("Error querying Claude:", error);
    throw error;
  }
}

// Use Claude to understand commands and reason about page actions
async function handleCommand(text) {
  console.log("handleCommand: Received command:", text);

  if (!claudeApiKey) {
    console.error("Claude API key not configured");
    sendToActiveTab({
      type: "SPEAK_ERROR",
      message:
        "Please configure your Claude API key in settings to use intelligent commands.",
    });
    return;
  }

  // First, get the current page DOM context from the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (!tabs.length) {
      console.error("No active tab found");
      return;
    }

    const tab = tabs[0];

    // Check if this is a chrome:// or other restricted page
    if (
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("chrome-extension://") ||
      tab.url.startsWith("edge://")
    ) {
      console.error("Cannot run on chrome:// or restricted pages");
      sendToActiveTab({
        type: "SPEAK_ERROR",
        message:
          "Spotlight cannot work on Chrome special pages. Please navigate to a regular website.",
      });
      return;
    }

    try {
      // Request DOM snapshot from content script with timeout
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve(null), 5000); // 5 second timeout
      });

      const responsePromise = new Promise((resolve) => {
        chrome.tabs.sendMessage(
          tab.id,
          { type: "GET_DOM_SNAPSHOT" },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error("Message error:", chrome.runtime.lastError.message);
              resolve(null);
            } else {
              resolve(response);
            }
          }
        );
      });

      const response = await Promise.race([responsePromise, timeoutPromise]);

      if (!response) {
        console.error(
          "Could not get DOM snapshot - content script may not be loaded"
        );
        sendToActiveTab({
          type: "SPEAK_ERROR",
          message:
            "Please refresh the page and try again. Spotlight needs to load on this page first.",
        });
        return;
      }

      console.log("Got DOM snapshot, querying Claude...");

      // Send command + DOM to Claude for reasoning
      const action = await queryClaudeForAction(
        text,
        response.domSnapshot,
        response.url
      );

      if (action) {
        console.log("Claude reasoned action:", action);

        // If Claude says page isn't relevant, just speak the message
        if (action.speakOnly) {
          console.log("Page not relevant to user goal:", action.reasoning);
          sendToActiveTab({
            type: "SPEAK_ERROR",
            message: action.message,
          });
        } else if (action.payload) {
          // Normal action - execute it
          lastAction = action.payload;
          sendToActiveTab({ type: "NAV_ACTION", payload: action.payload });
        }
      }
    } catch (error) {
      console.error("Error processing command with Claude:", error);
      sendToActiveTab({
        type: "SPEAK_ERROR",
        message:
          "Sorry, I encountered an error processing your command. Check the console for details.",
      });
    }
  });
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
  if (msg.type === "RELOAD_FISH_AUDIO_CONFIG" || msg.type === "RELOAD_CONFIG") {
    // Reload all configs
    chrome.storage.local.get(
      ["claudeApiKey", "fishAudioApiKey", "fishAudioReferenceId"],
      (data) => {
        claudeApiKey = data.claudeApiKey || null;
        fishAudioApiKey = data.fishAudioApiKey || null;
        fishAudioReferenceId = data.fishAudioReferenceId || null;
        console.log(
          "Config reloaded - Claude:",
          claudeApiKey ? "Yes" : "No",
          "Fish Audio:",
          fishAudioApiKey ? "Yes" : "No"
        );
      }
    );
    // Forward the message to all tabs
    chrome.tabs.query({}, (tabs) => {
      for (const t of tabs) {
        chrome.tabs.sendMessage(t.id, { type: "RELOAD_CONFIG" }, () => {
          if (chrome.runtime.lastError) {
            //ignore tabs without content scripts
          }
        });
      }
    });
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
