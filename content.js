// content.js
// Receives actions from background.js and interacts with the DOM

console.log("✅ Spotlight content.js loaded on:", window.location.href);

// Check if Fish Audio is configured
let useFishAudio = false;
let ttsRequestId = 0;
const pendingTTSRequests = new Map();

// Initialize on load - check Fish Audio config
chrome.storage.local.get(["fishAudioApiKey"], (data) => {
  useFishAudio = !!data.fishAudioApiKey;
  console.log(
    "Fish Audio TTS:",
    useFishAudio ? "enabled" : "disabled (falling back to native TTS)"
  );
});

// Initialize assistant panel
let assistant = null;
(function initAssistant() {
  if (typeof assistantPanel !== "undefined") {
    assistant = assistantPanel;
    assistant.init();
    // Set visible flag so it shows up when created
    assistant.isVisible = true;
    console.log("Assistant Panel initialized");
  }
})();

// Initialize cursor guide
let cursor = null;
(function initCursor() {
  if (typeof cursorGuide !== "undefined") {
    cursor = cursorGuide;
    cursor.init();
    cursor.enableLargeCursor(); // Enable large cursor by default for elderly users
    console.log("Cursor Guide initialized");
  }
})();

// Speak function - requests TTS from background script
async function speak(text) {
  if (!text) return;

  // Send spoken text to assistant panel for display
  chrome.runtime.sendMessage({
    type: "VOICE_SPEAKING",
    text: text,
  });

  // Try Fish Audio via background script if configured
  if (useFishAudio) {
    try {
      const requestId = ++ttsRequestId;

      // Send TTS request to background script (no CORS issues there)
      chrome.runtime.sendMessage({
        type: "GENERATE_TTS",
        text: text,
        requestId: requestId,
      });

      // Wait for response with timeout
      await new Promise((resolve) => {
        pendingTTSRequests.set(requestId, resolve);
        // Timeout after 5 seconds and use native TTS
        setTimeout(() => {
          if (pendingTTSRequests.has(requestId)) {
            pendingTTSRequests.delete(requestId);
            console.log("Fish Audio TTS timeout, using native TTS");
            speakNative(text);
            resolve();
          }
        }, 5000);
      });
    } catch (error) {
      console.error("Fish Audio error, using native TTS:", error);
      speakNative(text);
    }
  } else {
    // Use native speech synthesis as fallback
    speakNative(text);
  }
}

// Native speech synthesis fallback
function speakNative(text) {
  if (!text) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.95;
  speechSynthesis.speak(u);
}

// Check if an input field contains sensitive data
function isSensitiveInput(el) {
  if (!el || el.tagName !== "INPUT") return false;

  const type = (el.type || "").toLowerCase();
  const name = (el.name || "").toLowerCase();
  const id = (el.id || "").toLowerCase();
  const autocomplete = (el.autocomplete || "").toLowerCase();

  // Sensitive input types
  const sensitiveTypes = ["password", "tel", "email", "number"];
  if (sensitiveTypes.includes(type)) return true;

  // Sensitive field patterns (credit cards, SSN, etc.)
  const sensitivePatterns = [
    "password",
    "passwd",
    "pwd",
    "ssn",
    "social-security",
    "credit",
    "card",
    "cvv",
    "cvc",
    "ccv",
    "pin",
    "security-code",
    "account",
    "routing",
    "tax-id",
    "ein",
  ];

  const fieldText = `${name} ${id} ${autocomplete}`.toLowerCase();
  return sensitivePatterns.some((pattern) => fieldText.includes(pattern));
}

// Check if element is a form control (input, textarea, select)
function isFormControl(el) {
  if (!el || !el.tagName) return false;
  const tagName = el.tagName.toUpperCase();
  return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
}

// Get safe text from element, avoiding sensitive input values
function getSafeElementText(el) {
  if (!el) return "";

  // For sensitive inputs or any form control, only use non-value attributes
  if (isSensitiveInput(el) || isFormControl(el)) {
    const ariaLabel = el.ariaLabel || "";
    const placeholder = el.placeholder || "";
    const title = el.title || "";
    return (ariaLabel || placeholder || title).trim();
  }

  // For non-form elements, use text content (never .value)
  const innerText = el.innerText || "";
  const textContent = el.textContent || "";
  const ariaLabel = el.ariaLabel || "";
  const placeholder = el.placeholder || "";
  const title = el.title || "";
  return (innerText || textContent || ariaLabel || placeholder || title).trim();
}

// Find element by normalized coordinates (0-1 range)
function findElementByCoordinates(click_point, bbox) {
  if (
    !click_point ||
    typeof click_point.x !== "number" ||
    typeof click_point.y !== "number"
  ) {
    console.log("findElementByCoordinates: Invalid click_point provided");
    return null;
  }

  // Convert normalized coordinates to pixel coordinates
  const x = Math.round(click_point.x * window.innerWidth);
  const y = Math.round(click_point.y * window.innerHeight);

  console.log("findElementByCoordinates: Converted coordinates:", { x, y });
  console.log("findElementByCoordinates: Normalized coordinates:", click_point);

  // Find element at the click point
  let element = document.elementFromPoint(x, y);

  if (!element) {
    console.log("findElementByCoordinates: No element found at coordinates");
    return null;
  }

  // Debug: Log what element was actually found
  console.log("findElementByCoordinates: Element at coordinates:", {
    tagName: element.tagName,
    textContent: element.textContent?.substring(0, 50),
    className: element.className,
    id: element.id,
  });
  
  // Debug: Show coordinate details
  console.log("findElementByCoordinates: Coordinate analysis:", {
    normalizedCoords: click_point,
    pixelCoords: { x, y },
    viewportSize: { width: window.innerWidth, height: window.innerHeight },
    scrollPosition: { x: window.scrollX, y: window.scrollY }
  });

  // If we have a bounding box, try to find a more specific interactive element within it
  if (bbox) {
    const bboxX = Math.round(bbox.x * window.innerWidth);
    const bboxY = Math.round(bbox.y * window.innerHeight);
    const bboxWidth = Math.round(bbox.width * window.innerWidth);
    const bboxHeight = Math.round(bbox.height * window.innerHeight);

    // Look for interactive elements within the bounding box
    const interactiveSelectors =
      'button, a, input, select, textarea, [role="button"], [tabindex], [onclick]';
    const candidates = document.querySelectorAll(interactiveSelectors);

    for (const candidate of candidates) {
      const rect = candidate.getBoundingClientRect();
      if (
        rect.left >= bboxX &&
        rect.top >= bboxY &&
        rect.right <= bboxX + bboxWidth &&
        rect.bottom <= bboxY + bboxHeight
      ) {
        console.log(
          "findElementByCoordinates: Found interactive element in bbox:",
          candidate
        );
        return candidate;
      }
    }
  }

  // If no specific interactive element found, try to find the closest interactive parent
  let current = element;
  while (current && current !== document.body) {
    if (
      (current.tagName &&
        ["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA"].includes(
          current.tagName
        )) ||
      current.hasAttribute("onclick") ||
      current.hasAttribute("role") ||
      current.hasAttribute("tabindex")
    ) {
      console.log(
        "findElementByCoordinates: Found interactive parent:",
        current
      );
      return current;
    }
    current = current.parentElement;
  }

  console.log(
    "findElementByCoordinates: Using element at coordinates:",
    element
  );
  return element;
}

// Find element by text or aria-label
function findElement(keyword) {
  if (!keyword) {
    console.log("findElement: No keyword provided");
    return null;
  }

  console.log("findElement: Searching for keyword:", keyword);

  // Search for interactive elements
  const elements = document.querySelectorAll(
    "button, a, input, textarea, select, [role=button], [role=link], [onclick]"
  );

  keyword = keyword.toLowerCase().trim();
  console.log("findElement: Found", elements.length, "interactive elements");

  // First pass: exact match
  for (const el of elements) {
    const text = getSafeElementText(el).toLowerCase().trim();
    if (text === keyword) {
      console.log("findElement: Found exact match:", el);
      return el;
    }
  }

  // Second pass: partial match
  for (const el of elements) {
    const text = getSafeElementText(el).toLowerCase().trim();
    if (text.includes(keyword)) {
      console.log("findElement: Found partial match:", el, "text:", text);
      return el;
    }
  }

  console.log("findElement: No element found for keyword:", keyword);
  return null;
}

// Highlight an element with enhanced visuals
function highlight(el) {
  console.log("highlight: Called with element:", el);
  if (!el) {
    console.log("highlight: No element provided");
    return;
  }

  // Remove previous highlights
  document.querySelectorAll(".nav-target-highlight").forEach((e) => {
    e.classList.remove("nav-target-highlight");
  });

  // Add enhanced highlight class
  el.classList.add("nav-target-highlight");
  console.log("highlight: Added nav-target-highlight class");
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  console.log("highlight: Scrolled element into view");

  // Create arrow pointer if assistant is available
  if (assistant) {
    console.log("highlight: Creating arrow pointer");
    assistant.createArrowPointer(el);
  }

  // Guide cursor to element
  if (cursor) {
    console.log("highlight: Guiding cursor to element");
    cursor.guideTo(el);
    const elementText = getSafeElementText(el) || "this element";
    cursor.addTooltip(el, `Click: ${elementText.substring(0, 30)}`);
  }

  // Create step indicator
  console.log("highlight: Creating step indicator");
  createStepIndicator("Click this highlighted element");
}

// Create step indicator
function createStepIndicator(text) {
  // Remove existing indicator
  const existing = document.querySelector(".nav-step-indicator");
  if (existing) existing.remove();

  const indicator = document.createElement("div");
  indicator.className = "nav-step-indicator";
  indicator.textContent = text;
  document.body.appendChild(indicator);

  // Auto-remove after 5 seconds
  setTimeout(() => indicator.remove(), 5000);
}

// Generate simplified DOM snapshot for Claude
function getDOMSnapshot() {
  const elements = document.querySelectorAll(
    "button, a, input, textarea, select, [role=button], [role=link], h1, h2, h3, label"
  );

  const snapshot = [];
  elements.forEach((el, idx) => {
    // Use safe text extraction that avoids sensitive input values
    const text = getSafeElementText(el);

    // Skip empty text or very long text
    if (text && text.length < 100) {
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute("role") || "";
      const type = el.getAttribute("type") || "";

      // For sensitive inputs, add a marker but don't include the value
      const isSensitive = isSensitiveInput(el);
      const displayText = isSensitive
        ? `[${type || "input"} field]`
        : text.substring(0, 50);

      snapshot.push(
        `[${idx}] <${tag}${role ? ` role="${role}"` : ""}${
          type ? ` type="${type}"` : ""
        }> ${displayText}`
      );
    }
  });

  // Limit to first 100 elements to avoid token limits
  return snapshot.slice(0, 100).join("\n");
}

// Unified message listener - handles all messages from background and popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("content.js: Received message type:", msg.type);

  // Get DOM snapshot for Claude
  if (msg.type === "GET_DOM_SNAPSHOT") {
    console.log("content.js: Generating DOM snapshot...");
    const snapshot = getDOMSnapshot();
    sendResponse({
      domSnapshot: snapshot,
      url: window.location.href,
    });
    return true; // Keep channel open for async response
  }

  // Handle NAV_ACTION commands from background.js
  if (msg.type === "NAV_ACTION") {
    console.log("content.js: Received NAV_ACTION message:", msg);
    const {
      action,
      selector,
      speak: voice,
      direction,
      click_point,
      bbox,
    } = msg.payload;
    console.log(
      "content.js: Action:",
      action,
      "Selector:",
      selector,
      "Coordinates:",
      click_point
    );

    function findTargetElement(click_point, bbox, selector) {
      let el = null;

      // Primary: Use coordinate-based targeting
      if (click_point) {
        console.log("content.js: Using coordinates for targeting");
        el = findElementByCoordinates(click_point, bbox);
        
        // Validate if coordinate-found element matches intended selector
        if (el && selector) {
          const elementText = getSafeElementText(el).toLowerCase();
          const selectorLower = selector.toLowerCase();
          const isMatch = elementText.includes(selectorLower) || selectorLower.includes(elementText);
          
          console.log("content.js: Coordinate vs Selector validation:", {
            foundElementText: elementText,
            intendedSelector: selector,
            isMatch: isMatch
          });
          
          // If coordinate element doesn't match selector, try text search as backup
          if (!isMatch) {
            console.log("content.js: Coordinate mismatch! Trying text selector as backup");
            const textEl = findElement(selector);
            if (textEl) {
              console.log("content.js: Text selector found better match, using that instead");
              return textEl;
            }
          }
        }
        
        if (el) return el;
      }

      // Fallback: Use text selector only if no coordinates provided
      if (!el && selector) {
        console.log(
          "content.js: No coordinates, falling back to text selector:",
          selector
        );
        return findElement(selector);
      }
      return null;
    }

    if (action === "scroll") {
      window.scrollBy({
        top: direction === "up" ? -400 : 400,
        behavior: "smooth",
      });
      speak(voice);
    } else if (action === "goback") {
      window.history.back();
      speak(voice);
    } else if (action === "highlight") {
      console.log(
        "content.js: Attempting to highlight - Coordinates:",
        click_point,
        "Selector:",
        selector
      );
      const el = findTargetElement(click_point, bbox, selector);

      if (el) {
        console.log("content.js: Element found, highlighting:", el);
        highlight(el);
      } else {
        console.log("content.js: No element found");
      }
      speak(voice);
    } else if (action === "click") {
      console.log(
        "content.js: Attempting to click - Coordinates:",
        click_point,
        "Selector:",
        selector
      );
      const el = findTargetElement(click_point, bbox, selector);      
      if (el) {
        console.log("content.js: Element found, highlighting:", el);
        highlight(el);
        // Don't auto-click - just show where to click
      } else {
        console.log("content.js: No element found");
        speak("Sorry, I could not find the target element on this page.");
      }
      speak(voice);
    }
  }

  // Reload config
  if (msg.type === "RELOAD_FISH_AUDIO_CONFIG" || msg.type === "RELOAD_CONFIG") {
    chrome.storage.local.get(["fishAudioApiKey"], (data) => {
      useFishAudio = !!data.fishAudioApiKey;
      console.log(
        "Fish Audio config reloaded:",
        useFishAudio ? "enabled" : "disabled"
      );
    });
  }

  // Speak error message
  if (msg.type === "SPEAK_ERROR") {
    console.log("content.js: Speaking error:", msg.message);
    speak(msg.message);
  }

  // Handle TTS audio response from background
  if (msg.type === "TTS_AUDIO") {
    const resolve = pendingTTSRequests.get(msg.requestId);
    if (resolve) {
      pendingTTSRequests.delete(msg.requestId);
      try {
        // Convert base64 back to blob and play
        const binaryString = atob(msg.audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const audioBlob = new Blob([bytes], { type: "audio/mpeg" });
        const audioURL = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioURL);

        audio.onended = () => {
          URL.revokeObjectURL(audioURL);
          resolve();
        };

        audio.onerror = (error) => {
          console.error("Error playing audio:", error);
          URL.revokeObjectURL(audioURL);
          resolve();
        };

        audio.play().catch((error) => {
          console.error("Error playing audio:", error);
          resolve();
        });
      } catch (error) {
        console.error("Error processing TTS audio:", error);
        resolve();
      }
    }
  }

  // Handle TTS error - fallback to native
  if (msg.type === "TTS_ERROR") {
    const resolve = pendingTTSRequests.get(msg.requestId);
    if (resolve) {
      pendingTTSRequests.delete(msg.requestId);
      console.log("Fish Audio error:", msg.error, "- using native TTS");
      resolve();
    }
  }

  // Toggle assistant panel
  if (msg.type === "TOGGLE_ASSISTANT" && assistant) {
    assistant.toggle();
  }

  // Show assistant panel
  if (msg.type === "SHOW_ASSISTANT" && assistant) {
    assistant.show();
  }

  // Find and guide to element
  if (msg.type === "FIND_AND_GUIDE" && msg.keyword) {
    const el = findElement(msg.keyword);
    if (el) {
      highlight(el);
      speak(`I found the ${msg.keyword}. It's highlighted on the page.`);
      if (assistant) {
        assistant.addMessage(`Found and highlighted: ${msg.keyword}`);
      }
    } else {
      speak(`Sorry, I couldn't find ${msg.keyword} on this page.`);
      if (assistant) {
        assistant.addMessage(
          `Could not find: ${msg.keyword}. Try being more specific.`
        );
      }
    }
  }
});
