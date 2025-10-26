// content.js
// Receives actions from background.js and interacts with the DOM

// Check if Fish Audio is configured
let useFishAudio = false;
let ttsRequestId = 0;
const pendingTTSRequests = new Map();

// Initialize on load - check Fish Audio config
chrome.storage.sync.get(['fishAudioApiKey'], (data) => {
  useFishAudio = !!data.fishAudioApiKey;
  console.log('Fish Audio TTS:', useFishAudio ? 'enabled' : 'disabled (falling back to native TTS)');
});

// Initialize assistant panel
let assistant = null;
(function initAssistant() {
  if (typeof assistantPanel !== 'undefined') {
    assistant = assistantPanel;
    assistant.init();
    console.log('Assistant Panel initialized');
  }
})();

// Initialize cursor guide
let cursor = null;
(function initCursor() {
  if (typeof cursorGuide !== 'undefined') {
    cursor = cursorGuide;
    cursor.init();
    cursor.enableLargeCursor(); // Enable large cursor by default for elderly users
    console.log('Cursor Guide initialized');
  }
})();

// Speak function - requests TTS from background script
async function speak(text) {
  if (!text) return;
  
  // Try Fish Audio via background script if configured
  if (useFishAudio) {
    try {
      const requestId = ++ttsRequestId;
      
      // Send TTS request to background script (no CORS issues there)
      chrome.runtime.sendMessage({
        type: 'GENERATE_TTS',
        text: text,
        requestId: requestId
      });
      
      // Wait for response with timeout
      await new Promise((resolve) => {
        pendingTTSRequests.set(requestId, resolve);
        // Timeout after 5 seconds and use native TTS
        setTimeout(() => {
          if (pendingTTSRequests.has(requestId)) {
            pendingTTSRequests.delete(requestId);
            console.log('Fish Audio TTS timeout, using native TTS');
            speakNative(text);
            resolve();
          }
        }, 5000);
      });
    } catch (error) {
      console.error('Fish Audio error, using native TTS:', error);
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

// Find element by text or aria-label
function findElement(keyword) {
  if (!keyword) {
    console.log('findElement: No keyword provided');
    return null;
  }
  
  console.log('findElement: Searching for keyword:', keyword);
  
  // Search for interactive elements
  const elements = document.querySelectorAll(
    "button, a, input, textarea, select, [role=button], [role=link], [onclick]"
  );
  
  keyword = keyword.toLowerCase().trim();
  console.log('findElement: Found', elements.length, 'interactive elements');
  
  // First pass: exact match
  for (const el of elements) {
    const text = (el.innerText || el.textContent || el.value || el.ariaLabel || el.placeholder || el.title || "").toLowerCase().trim();
    if (text === keyword) {
      console.log('findElement: Found exact match:', el);
      return el;
    }
  }
  
  // Second pass: partial match
  for (const el of elements) {
    const text = (el.innerText || el.textContent || el.value || el.ariaLabel || el.placeholder || el.title || "").toLowerCase().trim();
    if (text.includes(keyword)) {
      console.log('findElement: Found partial match:', el, 'text:', text);
      return el;
    }
  }
  
  console.log('findElement: No element found for keyword:', keyword);
  return null;
}

// Highlight an element with enhanced visuals
function highlight(el) {
  console.log('highlight: Called with element:', el);
  if (!el) {
    console.log('highlight: No element provided');
    return;
  }
  
  // Remove previous highlights
  document.querySelectorAll('.nav-target-highlight').forEach(e => {
    e.classList.remove('nav-target-highlight');
  });
  
  // Add enhanced highlight class
  el.classList.add('nav-target-highlight');
  console.log('highlight: Added nav-target-highlight class');
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  console.log('highlight: Scrolled element into view');
  
  // Create arrow pointer if assistant is available
  if (assistant) {
    console.log('highlight: Creating arrow pointer');
    assistant.createArrowPointer(el);
  }
  
  // Guide cursor to element
  if (cursor) {
    console.log('highlight: Guiding cursor to element');
    cursor.guideTo(el);
    const elementText = el.innerText || el.value || el.ariaLabel || 'this element';
    cursor.addTooltip(el, `Click: ${elementText.substring(0, 30)}`);
  }
  
  // Create step indicator
  console.log('highlight: Creating step indicator');
  createStepIndicator('Click this highlighted element');
}

// Create step indicator
function createStepIndicator(text) {
  // Remove existing indicator
  const existing = document.querySelector('.nav-step-indicator');
  if (existing) existing.remove();
  
  const indicator = document.createElement('div');
  indicator.className = 'nav-step-indicator';
  indicator.textContent = text;
  document.body.appendChild(indicator);
  
  // Auto-remove after 5 seconds
  setTimeout(() => indicator.remove(), 5000);
}

// Listen for Fish Audio config reload and TTS responses
chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === "RELOAD_FISH_AUDIO_CONFIG") {
    // Reload config
    chrome.storage.sync.get(['fishAudioApiKey'], (data) => {
      useFishAudio = !!data.fishAudioApiKey;
      console.log('Fish Audio config reloaded:', useFishAudio ? 'enabled' : 'disabled');
    });
  }
  
  // Handle TTS audio response from background
  if (msg.type === 'TTS_AUDIO') {
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
        const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
        const audioURL = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioURL);
        
        audio.onended = () => {
          URL.revokeObjectURL(audioURL);
          resolve();
        };
        
        audio.onerror = (error) => {
          console.error('Error playing audio:', error);
          URL.revokeObjectURL(audioURL);
          resolve();
        };
        
        audio.play().catch(error => {
          console.error('Error playing audio:', error);
          resolve();
        });
      } catch (error) {
        console.error('Error processing TTS audio:', error);
        resolve();
      }
    }
  }
  
  // Handle TTS error - fallback to native
  if (msg.type === 'TTS_ERROR') {
    const resolve = pendingTTSRequests.get(msg.requestId);
    if (resolve) {
      pendingTTSRequests.delete(msg.requestId);
      console.log('Fish Audio error:', msg.error, '- using native TTS');
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
        assistant.addMessage(`Could not find: ${msg.keyword}. Try being more specific.`);
      }
    }
  }
});

// Handle commands from background.js
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== "NAV_ACTION") return;

  console.log('content.js: Received NAV_ACTION message:', msg);
  const { action, selector, speak: voice, direction } = msg.payload;
  console.log('content.js: Action:', action, 'Selector:', selector);
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
    console.log('content.js: Attempting to highlight with selector:', selector);
    const el = findElement(selector);
    if (el) {
      console.log('content.js: Element found, highlighting:', el);
      highlight(el);
    } else {
      console.log('content.js: No element found for selector:', selector);
    }
    speak(voice);
  } else if (action === "click") {
    console.log('content.js: Attempting to find element for click with selector:', selector);
    const el = findElement(selector);
    if (el) {
      console.log('content.js: Element found, highlighting:', el);
      highlight(el);
      // Don't auto-click - just show where to click
    } else {
      console.log('content.js: No element found for selector:', selector);
      speak('Sorry, I could not find ' + selector + ' on this page.');
    }
    speak(voice);
  }
});
