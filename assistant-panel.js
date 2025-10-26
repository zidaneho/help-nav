// assistant-panel.js
// Creates an overlay assistant panel with chatbox and visual guidance

class AssistantPanel {
  constructor() {
    this.panel = null;
    this.isVisible = false;
    this.isExpanded = false;
    this.messages = [];
    this.currentStep = 0;
    this.instructionMode = false;
    this.highlightedElement = null;
    this.recognition = null;
    this.isListening = false;
    this.lastExpandedPos = { x: null, y: null };
  }

  // Initialize and inject the panel
  init() {
    if (this.panel) return;

    this.createPanel();
    this.initSpeechRecognition();
    // Start collapsed by default
    this.isExpanded = false;
    console.log("Assistant Panel initialized (collapsed)");
  }

  // Create the panel HTML structure (loaded from external template)
  createPanel() {
    const panel = document.createElement("div");
    panel.id = "nav-assistant-panel";
    panel.className = "collapsed";

    // Append empty shell first so expand/collapse works immediately
    document.body.appendChild(panel);
    this.panel = panel;

    // Load HTML template and then attach listeners
    const url = chrome.runtime.getURL("assistant-panel.html");
    fetch(url)
      .then((res) => res.text())
      .then((html) => {
        this.panel.innerHTML = html.replace(
          /__LOGO_URL__/g,
          chrome.runtime.getURL("/images/logo.svg")
        );
        this.attachEventListeners();
      })
      .catch((err) => {
        console.error("Failed to load assistant panel template:", err);
      });
  }

  // Expand the panel
  expand() {
    if (!this.panel) this.init();
    this.panel.classList.remove("collapsed");
    this.panel.classList.add("expanded");
    this.isExpanded = true;
    this.isVisible = true;
    if (this.lastExpandedPos.x && this.lastExpandedPos.y) {
      this.panel.style.left = this.lastExpandedPos.x;
      this.panel.style.top = this.lastExpandedPos.y;
      this.panel.style.right = "auto";
      this.panel.style.bottom = "auto";
    }
  }

  // Collapse the panel
  collapse() {
    if (this.panel) {
      this.panel.classList.remove("expanded");
      this.panel.classList.add("collapsed");
      this.isExpanded = false;
      // Reset inline styles so the CSS default position takes over
      this.panel.style.left = "";
      this.panel.style.top = "";
      this.panel.style.right = "";
      this.panel.style.bottom = "";
    }
  }

  // Show the panel (same as expand)
  show() {
    this.expand();
  }

  // Hide the panel completely
  hide() {
    if (this.panel) {
      this.panel.style.display = "none";
      this.isVisible = false;
    }
  }

  // Toggle panel visibility
  toggle() {
    if (this.isExpanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  // Add message to chat
  addMessage(text, isUser = false) {
    const messagesContainer = document.getElementById("nav-assistant-messages");
    if (!messagesContainer) return;

    const messageDiv = document.createElement("div");
    messageDiv.className = `nav-assistant-message ${
      isUser ? "user" : "assistant"
    }`;

    const avatar = isUser ? "👤" : "🤖";
    messageDiv.innerHTML = `
      <div class="nav-assistant-avatar">${avatar}</div>
      <div class="nav-assistant-content">
        <p>${text}</p>
      </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    this.messages.push({ text, isUser, timestamp: Date.now() });
  }

  // Attach event listeners
  attachEventListeners() {
    // Collapsed button expands panel
    const collapsedBtn = document.getElementById("nav-assistant-collapsed");
    if (collapsedBtn) {
      collapsedBtn.addEventListener("click", () => this.expand());
    }

    // Close button collapses panel
    const closeBtn = document.getElementById("nav-assistant-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.collapse());
    }

    // Send button
    const sendBtn = document.getElementById("nav-assistant-send");
    const input = document.getElementById("nav-assistant-input");

    if (sendBtn && input) {
      sendBtn.addEventListener("click", () => this.handleSend());
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.handleSend();
      });
    }

    // Make panel draggable
    this.makeDraggable();
  }

  // Handle send message
  handleSend() {
    const input = document.getElementById("nav-assistant-input");
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    // Add user message
    this.addMessage(text, true);
    input.value = "";

    // Process the message
    this.processUserMessage(text);
  }

  // Process user message and provide guidance
  processUserMessage(text) {
    const lowerText = text.toLowerCase();

    // Simple keyword-based responses
    if (lowerText.includes("login") || lowerText.includes("sign in")) {
      this.findAndGuideToElement(
        "login",
        "Let me help you find the login button..."
      );
    } else if (lowerText.includes("search")) {
      this.findAndGuideToElement("search", "Looking for the search feature...");
    } else if (lowerText.includes("menu") || lowerText.includes("navigation")) {
      this.findAndGuideToElement("menu", "Finding the menu...");
    } else {
      // Generic response
      setTimeout(() => {
        this.addMessage(
          `I'll help you with "${text}". Try using voice commands or clicking on highlighted elements.`
        );
      }, 500);
    }
  }

  // Find element and guide user to it
  findAndGuideToElement(keyword, message) {
    this.addMessage(message);

    setTimeout(() => {
      // Send message to content script to find and highlight element
      chrome.runtime.sendMessage({
        type: "FIND_AND_GUIDE",
        keyword: keyword,
      });
    }, 500);
  }

  // Show help information
  showHelp() {
    this.addMessage(`
      <strong>Available Commands:</strong><br>
      • Say "scroll down/up" to scroll<br>
      • Say "click [element]" to click<br>
      • Say "highlight [element]" to see it<br>
      • Say "go back" to go to previous page<br>
      • Type your question in the chat<br>
      <br>
      The highlighted elements will pulse and an arrow will point to them!
    `);
  }

  // Reset the assistant
  reset() {
    const messagesContainer = document.getElementById("nav-assistant-messages");
    if (messagesContainer) {
      messagesContainer.innerHTML = `
        <div class="nav-assistant-message assistant">
          <div class="nav-assistant-avatar">🤖</div>
          <div class="nav-assistant-content">
            <p>Assistant reset! How can I help you navigate?</p>
          </div>
        </div>
      `;
    }
    this.messages = [];
    this.removeAllHighlights();
  }

  // Remove all visual guides
  removeAllHighlights() {
    document.querySelectorAll(".nav-target-highlight").forEach((el) => {
      el.classList.remove("nav-target-highlight");
    });
    document
      .querySelectorAll(".nav-arrow-pointer")
      .forEach((el) => el.remove());
    document
      .querySelectorAll(".nav-cursor-pointer")
      .forEach((el) => el.remove());
  }

  // Make panel draggable
  makeDraggable() {
    const header = this.panel.querySelector(".nav-assistant-header");
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    header.addEventListener("mousedown", (e) => {
      if (e.target.tagName === "BUTTON") return;
      isDragging = true;
      initialX = e.clientX - this.panel.offsetLeft;
      initialY = e.clientY - this.panel.offsetTop;
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      this.panel.style.left = currentX + "px";
      this.panel.style.top = currentY + "px";
      this.panel.style.right = "auto";
      this.panel.style.bottom = "auto";
    });

    document.addEventListener("mouseup", () => {
      // Check if we were dragging
      if (isDragging) {
        // Save the final position
        this.lastExpandedPos.x = this.panel.style.left;
        this.lastExpandedPos.y = this.panel.style.top;
      }
      // Stop dragging
      isDragging = false;
    });
  }

  // Create arrow pointing to element
  createArrowPointer(targetElement) {
    this.removeAllHighlights();

    const rect = targetElement.getBoundingClientRect();
    const arrow = document.createElement("div");
    arrow.className = "nav-arrow-pointer";
    arrow.style.left = `${rect.left + rect.width / 2 - 15}px`;
    arrow.style.top = `${rect.top - 30}px`;

    document.body.appendChild(arrow);

    // Auto-remove after 5 seconds
    setTimeout(() => arrow.remove(), 5000);
  }

  // Initialize speech recognition to auto-expand and capture user speech
  initSpeechRecognition() {
    if (!("webkitSpeechRecognition" in window)) {
      console.log("Speech recognition not supported");
      return;
    }

    this.recognition = new webkitSpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = "en-US";

    this.recognition.onresult = (event) => {
      const transcript =
        event.results[event.results.length - 1][0].transcript.trim();
      if (!this.isExpanded) this.expand();
      this.addMessage(transcript, true);
      chrome.runtime.sendMessage({ type: "VOICE_COMMAND", text: transcript });
    };

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        setTimeout(() => {
          try {
            this.recognition.start();
          } catch (e) {
            this.isListening = false;
          }
        }, 100);
      }
    };

    this.recognition.onerror = (e) => {
      if (e.error !== "no-speech") this.isListening = false;
    };

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (e) {
      console.log("Could not start speech recognition:", e);
    }
  }
}

// Create singleton instance
const assistantPanel = new AssistantPanel();

// Listen for the "Open Spotlight" button from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TOGGLE_ASSISTANT") {
    // This will show/hide the panel and call init() the first time
    assistantPanel.toggle();
  }
});
