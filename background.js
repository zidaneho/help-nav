// background.js (Manifest V3)
// Handles command processing and coordination
// Note: Speech recognition moved to popup.js (service workers don't support Web Speech API)

console.log("🚀 Background script loaded and initializing...");

let listening = false;
let lastTranscript = "";
let lastAction = null;
let claudeApiKey = null;
let fishAudioApiKey = null;
let fishAudioReferenceId = null;

console.log("Background: Initial state set");

// Load config
chrome.storage.local.get(
  ["claudeApiKey", "fishAudioApiKey", "fishAudioReferenceId"],
  (data) => {
    console.log("Background: Loading config from storage:", {
      claudeApiKey: data.claudeApiKey ? `${data.claudeApiKey.substring(0, 10)}...` : 'not found',
      fishAudioApiKey: data.fishAudioApiKey ? `${data.fishAudioApiKey.substring(0, 10)}...` : 'not found',
      fishAudioReferenceId: data.fishAudioReferenceId || 'not found'
    });
    
    claudeApiKey = data.claudeApiKey || null;
    fishAudioApiKey = data.fishAudioApiKey || null;
    fishAudioReferenceId = data.fishAudioReferenceId || null;
    
    console.log("Background: Config loaded -", 
      "Claude:", claudeApiKey ? "Configured" : "Not configured",
      "Fish Audio:", fishAudioApiKey ? "Configured" : "Not configured"
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
async function queryClaudeForAction(userCommand, base64ImageData, pageUrl) {
  const systemPrompt = `You are an intelligent web navigation assistant. You will be given a SCREENSHOT of a webpage and a user's command.
Your job is to:
1. Analyze the image to understand the full visual layout.
2. Understand the user's command.
3. Identify the best element (button, link, input) to interact with to achieve the user's goal.
4. Provide both text selectors AND precise coordinates for the target element.

Return your response as JSON with this structure:
{
  "reasoning": "Brief explanation of what you see and why you chose this action.",
  "action": "click" | "highlight" | "scroll" | "goback" | "not_found",
  "selector": "The EXACT text on the element (can be null if coordinates are provided)",
  "click_point": {"x": 0.5, "y": 0.3} | null,
  "bbox": {"x": 0.1, "y": 0.2, "width": 0.3, "height": 0.05} | null,
  "direction": "up" | "down" (for scroll),
  "speak": "What to say to the user"
}

COORDINATE SYSTEM:
- All coordinates are normalized (0.0 to 1.0) relative to the image dimensions
- click_point: Center point where user should click (x, y)
- bbox: Bounding box of the target element (x, y, width, height)
- x=0 is left edge, x=1 is right edge
- y=0 is top edge, y=1 is bottom edge

IMPORTANT:
- ALWAYS provide click_point and bbox when you can visually identify a target element
- Set click_point and bbox to null only for scroll/goback/not_found actions
- selector can be null if coordinates are reliable, but prefer providing both when possible
- For elements without clear text (icons, images), rely on coordinates and describe in reasoning`;

  const userPrompt = `User Command: "${userCommand}"

Analyze the attached screenshot for the page at URL: ${pageUrl}.
Identify the target element and provide:
1. The action to take
2. Text selector (if readable text exists)
3. Precise normalized coordinates (click_point and bbox)
4. Clear reasoning for your choice

Respond with JSON only.`;

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
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: base64ImageData,
                },
              },
              { type: "text", text: userPrompt },
            ],
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

    // Robust JSON parsing with validation
    let actionData;

    // First, try parsing the entire response as JSON
    try {
      actionData = JSON.parse(claudeResponse);
    } catch (e) {
      // Fall back to extracting JSON from code blocks or text
      const jsonMatch =
        claudeResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
        claudeResponse.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error("Could not find valid JSON in Claude response");
      }

      try {
        actionData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch (parseError) {
        throw new Error(`Failed to parse JSON: ${parseError.message}`);
      }
    }

    // Validate required fields and schema
    if (!actionData || typeof actionData !== "object") {
      throw new Error("Invalid response: not a valid object");
    }

    if (!actionData.action || typeof actionData.action !== "string") {
      throw new Error("Invalid response: missing or invalid 'action' field");
    }

    const validActions = [
      "click",
      "highlight",
      "scroll",
      "goback",
      "not_found",
    ];
    if (!validActions.includes(actionData.action)) {
      throw new Error(
        `Invalid response: unknown action '${actionData.action}'`
      );
    }

    // Validate and normalize coordinate fields if present
    if (actionData.click_point) {
      if (typeof actionData.click_point !== "object" ||
          typeof actionData.click_point.x !== "number" ||
          typeof actionData.click_point.y !== "number") {
        throw new Error("Invalid response: click_point must be an object with numeric x,y coordinates");
      }
      
      // Clamp coordinates to valid range and warn if out of bounds
      const originalX = actionData.click_point.x;
      const originalY = actionData.click_point.y;
      
      actionData.click_point.x = Math.max(0, Math.min(1, originalX));
      actionData.click_point.y = Math.max(0, Math.min(1, originalY));
      
      if (originalX !== actionData.click_point.x || originalY !== actionData.click_point.y) {
        console.warn(`Claude returned out-of-bounds coordinates (${originalX}, ${originalY}), clamped to (${actionData.click_point.x}, ${actionData.click_point.y})`);
      }
    }

    if (actionData.bbox) {
      if (typeof actionData.bbox !== "object" ||
          typeof actionData.bbox.x !== "number" ||
          typeof actionData.bbox.y !== "number" ||
          typeof actionData.bbox.width !== "number" ||
          typeof actionData.bbox.height !== "number") {
        throw new Error("Invalid response: bbox must be an object with numeric x,y,width,height");
      }
      
      // Clamp bbox coordinates and dimensions to valid ranges
      const original = { ...actionData.bbox };
      
      actionData.bbox.x = Math.max(0, Math.min(1, actionData.bbox.x));
      actionData.bbox.y = Math.max(0, Math.min(1, actionData.bbox.y));
      actionData.bbox.width = Math.max(0.01, Math.min(1, actionData.bbox.width)); // Min 0.01 to avoid zero width
      actionData.bbox.height = Math.max(0.01, Math.min(1, actionData.bbox.height)); // Min 0.01 to avoid zero height
      
      // Ensure bbox doesn't extend beyond image bounds
      if (actionData.bbox.x + actionData.bbox.width > 1) {
        actionData.bbox.width = 1 - actionData.bbox.x;
      }
      if (actionData.bbox.y + actionData.bbox.height > 1) {
        actionData.bbox.height = 1 - actionData.bbox.y;
      }
      
      if (JSON.stringify(original) !== JSON.stringify(actionData.bbox)) {
        console.warn(`Claude returned out-of-bounds bbox, clamped from`, original, 'to', actionData.bbox);
      }
    }

    console.log("Parsed and validated action:", actionData);

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

      // Validate that we have at least one targeting method
      const hasSelector =
        actionData.selector &&
        typeof actionData.selector === "string" &&
        actionData.selector.trim().length > 0;
      const hasCoordinates =
        actionData.click_point &&
        typeof actionData.click_point === "object" &&
        typeof actionData.click_point.x === "number" &&
        typeof actionData.click_point.y === "number";

      if (!hasSelector && !hasCoordinates) {
        throw new Error(
          `Invalid response: ${actionData.action} action requires either a valid selector or click_point coordinates`
        );
      }

      // Map targeting fields with safe fallbacks
      payload.selector = hasSelector ? actionData.selector.trim() : null;

      // Add coordinate-based targeting with validation
      if (hasCoordinates) {
        payload.click_point = actionData.click_point;
      } else {
        payload.click_point = null;
      }

      // Add bounding box with validation
      if (
        actionData.bbox &&
        typeof actionData.bbox === "object" &&
        typeof actionData.bbox.x === "number" &&
        typeof actionData.bbox.y === "number" &&
        typeof actionData.bbox.width === "number" &&
        typeof actionData.bbox.height === "number"
      ) {
        payload.bbox = actionData.bbox;
      } else {
        payload.bbox = null;
      }
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
  console.log("=== HANDLECOMMAND START ===");
  console.log("handleCommand: Received command:", text, "Type:", typeof text, "Length:", text?.length);
  console.log("handleCommand: Claude API key status:", claudeApiKey ? "Configured" : "Not configured");

  // Validate command text
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    console.error("❌ VALIDATION FAILED: Invalid or empty command text");
    sendToActiveTab({
      type: "SPEAK_ERROR",
      message: "No command received. Please speak clearly and try again.",
    });
    console.log("=== HANDLECOMMAND END (validation failed) ===");
    return;
  }
  console.log("✅ Command text validation passed");

  if (!claudeApiKey) {
    console.error("❌ VALIDATION FAILED: Claude API key not configured");
    sendToActiveTab({
      type: "SPEAK_ERROR",
      message:
        "Please configure your Claude API key in settings to use intelligent commands.",
    });
    console.log("=== HANDLECOMMAND END (no API key) ===");
    return;
  }
  console.log("✅ Claude API key validation passed");
  
  console.log("Starting tab query to get active tab...");

  // First, get the current page DOM context from the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    console.log("Tab query callback executed, tabs.length:", tabs?.length);
    if (!tabs.length) {
      console.error("No active tab found");
      return;
    }

    const tab = tabs[0];
    console.log("=== TAB VALIDATION START ===");
    console.log("Background: Active tab info:", {
      url: tab.url,
      title: tab.title,
      id: tab.id,
      status: tab.status
    });

    // Check if URL is undefined (permission issue)
    if (!tab.url) {
      console.error("❌ TAB URL IS UNDEFINED - Possible permissions issue or page not loaded");
      console.error("Tab details:", JSON.stringify(tab));
      sendToActiveTab({
        type: "SPEAK_ERROR",
        message:
          "Cannot access page information. Please reload the extension and try again.",
      });
      return;
    }

    // Check if this is a chrome:// or other restricted page
    if (
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("chrome-extension://") ||
      tab.url.startsWith("edge://") ||
      tab.url.startsWith("moz-extension://") ||
      tab.url === "about:blank"
    ) {
      console.error("❌ RESTRICTED PAGE DETECTED. URL:", tab.url, "Title:", tab.title);
      sendToActiveTab({
        type: "SPEAK_ERROR",
        message:
          `Cannot work on special pages. Current URL: ${tab.url.substring(0, 30)}...`,
      });
      return;
    }
    
    // Additional check for valid HTTP/HTTPS URLs
    if (!tab.url.startsWith("http://") && !tab.url.startsWith("https://")) {
      console.error("❌ INVALID URL SCHEME. URL:", tab.url);
      sendToActiveTab({
        type: "SPEAK_ERROR",
        message:
          `Only works on http/https websites. Current URL scheme: ${tab.url?.split(':')[0] || 'unknown'}`,
      });
      return;
    }
    
    console.log("✅ TAB VALIDATION PASSED. URL:", tab.url);
    console.log("=== TAB VALIDATION END ===");

    try {
      // Capture screenshot of the visible tab
      const imageDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
        format: "jpeg",
        quality: 80,
      });

      if (!imageDataUrl) {
        throw new Error("Failed to capture screenshot");
      }

      const base64ImageData = imageDataUrl.split(",")[1];

      if (!base64ImageData) {
        throw new Error("Failed to extract base64 data from screenshot");
      }

      console.log("Screenshot captured, querying Claude...");
      const action = await queryClaudeForAction(text, base64ImageData, tab.url);

      if (action) {
        console.log("Claude reasoned action:", action);

        // Send Claude's reasoning to assistant panel for display
        sendToActiveTab({
          type: "CLAUDE_RESPONSE",
          reasoning: action.reasoning,
          action: action.payload?.action || "speak",
          selector: action.payload?.selector || "",
        });

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
      
      // Show error in assistant panel
      sendToActiveTab({
        type: "CLAUDE_RESPONSE",
        reasoning: `❌ Error: ${error.message || "Failed to process command"}`,
        action: "error",
        selector: "",
      });
      
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
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "VOICE_COMMAND") {
    // Handle voice command from popup or assistant panel
    console.log("=== VOICE_COMMAND RECEIVED ===");
    console.log("Background: Received VOICE_COMMAND:", msg.text);
    console.log("Message object:", JSON.stringify(msg));
    lastTranscript = msg.text;
    console.log("Calling handleCommand with text:", msg.text);
    handleCommand(msg.text);
    console.log("handleCommand call completed (async)");
    // Don't send response for async operations
    return false;
  }
  if (msg.type === "UPDATE_LISTENING_STATUS") {
    listening = msg.listening;
    return false;
  }
  if (msg.type === "REPEAT_LAST" && lastAction) {
    sendToActiveTab({ type: "NAV_ACTION", payload: lastAction });
    return false;
  }
  if (msg.type === "GET_STATUS") {
    // Return current status to popup
    chrome.runtime.sendMessage({
      type: "STATUS_UPDATE",
      listening: listening,
      lastTranscript: lastTranscript,
    });
    return false;
  }
  if (msg.type === "FIND_AND_GUIDE") {
    // Forward to active tab
    sendToActiveTab(msg);
    return false;
  }
  if (msg.type === "RELOAD_FISH_AUDIO_CONFIG" || msg.type === "RELOAD_CONFIG") {
    console.log("Background: Received RELOAD_CONFIG request");
    // Reload all configs
    chrome.storage.local.get(
      ["claudeApiKey", "fishAudioApiKey", "fishAudioReferenceId"],
      (data) => {
        console.log("Background: Reloading config from storage:", {
          claudeApiKey: data.claudeApiKey ? `${data.claudeApiKey.substring(0, 10)}...` : 'not found',
          fishAudioApiKey: data.fishAudioApiKey ? `${data.fishAudioApiKey.substring(0, 10)}...` : 'not found',
          fishAudioReferenceId: data.fishAudioReferenceId || 'not found'
        });
        
        claudeApiKey = data.claudeApiKey || null;
        fishAudioApiKey = data.fishAudioApiKey || null;
        fishAudioReferenceId = data.fishAudioReferenceId || null;
        
        console.log("Background: Config reloaded -",
          "Claude:", claudeApiKey ? "Configured" : "Not configured",
          "Fish Audio:", fishAudioApiKey ? "Configured" : "Not configured"
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
    return false;
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
