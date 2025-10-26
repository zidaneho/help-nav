// assistant-panel.js
// Creates an overlay assistant panel with chatbox and visual guidance

class AssistantPanel {
  constructor() {
    this.panel = null;
    this.isVisible = false;
    this.messages = [];
    this.currentStep = 0;
    this.instructionMode = false;
    this.highlightedElement = null;
  }

  // Initialize and inject the panel
  init() {
    if (this.panel) return;
    
    this.createPanel();
    this.attachEventListeners();
    // Start minimized by default
    this.panel.classList.add('minimized');
    console.log('Assistant Panel initialized (minimized)');
  }

  // Create the panel HTML structure
  createPanel() {
    const panel = document.createElement('div');
    panel.id = 'nav-assistant-panel';
    panel.innerHTML = `
      <div class="nav-assistant-header">
        <div class="nav-assistant-title">
          <span class="nav-assistant-icon">💡</span>
          <span>Spotlight</span>
        </div>
        <button id="nav-assistant-minimize" class="nav-assistant-btn-icon" aria-label="Minimize">−</button>
        <button id="nav-assistant-close" class="nav-assistant-btn-icon" aria-label="Close">×</button>
      </div>
      
      <div class="nav-assistant-body">
        <div id="nav-assistant-messages" class="nav-assistant-messages">
          <div class="nav-assistant-message assistant">
            <div class="nav-assistant-avatar">🤖</div>
            <div class="nav-assistant-content">
              <p>Hello! I'm here to help you navigate this website.</p>
              <p>You can:</p>
              <ul>
                <li>Ask me questions in the chat</li>
                <li>Use voice commands</li>
                <li>Request step-by-step guidance</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div class="nav-assistant-input-area">
          <input 
            type="text" 
            id="nav-assistant-input" 
            placeholder="Ask me how to navigate..."
            aria-label="Chat input"
          />
          <button id="nav-assistant-send" class="nav-assistant-btn-primary" aria-label="Send">
            Send
          </button>
        </div>
        
        <div class="nav-assistant-actions">
          <button id="nav-assistant-help" class="nav-assistant-btn-secondary">
            📖 Help Guide
          </button>
          <button id="nav-assistant-reset" class="nav-assistant-btn-secondary">
            🔄 Reset
          </button>
        </div>
      </div>
    `;
    
    // Add styles
    this.injectStyles();
    
    document.body.appendChild(panel);
    this.panel = panel;
  }

  // Inject CSS styles
  injectStyles() {
    if (document.getElementById('nav-assistant-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'nav-assistant-styles';
    style.textContent = `
      #nav-assistant-panel {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 380px;
        max-height: 600px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
        display: flex;
        flex-direction: column;
        transition: all 0.3s ease;
      }
      
      #nav-assistant-panel.minimized {
        max-height: 60px;
      }
      
      #nav-assistant-panel.minimized .nav-assistant-body {
        display: none;
      }
      
      .nav-assistant-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 20px;
        border-radius: 16px 16px 0 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: move;
      }
      
      .nav-assistant-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 600;
        font-size: 16px;
      }
      
      .nav-assistant-icon {
        font-size: 20px;
      }
      
      .nav-assistant-btn-icon {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }
      
      .nav-assistant-btn-icon:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .nav-assistant-body {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
      }
      
      .nav-assistant-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        max-height: 400px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        color: #000000;
      }
      
      .nav-assistant-message {
        display: flex;
        gap: 10px;
        animation: slideIn 0.3s ease;
      }
      
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .nav-assistant-message.user {
        flex-direction: row-reverse;
      }
      
      .nav-assistant-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        flex-shrink: 0;
      }
      
      .nav-assistant-message.assistant .nav-assistant-avatar {
        background: #f0f0f0;
      }
      
      .nav-assistant-message.user .nav-assistant-avatar {
        background: #667eea;
      }
      
      .nav-assistant-content {
        background: #f5f5f5;
        padding: 12px 14px;
        border-radius: 12px;
        max-width: 75%;
        font-size: 14px;
        line-height: 1.5;
        color: #000000;
      }
      
      .nav-assistant-message.user .nav-assistant-content {
        background: #667eea;
        color: white;
      }
      
      .nav-assistant-content p {
        margin: 0 0 8px 0;
        color: #000000;
      }
      
      .nav-assistant-content p:last-child {
        margin-bottom: 0;
      }
      
      .nav-assistant-content ul {
        margin: 8px 0 0 0;
        padding-left: 20px;
        color: #000000;
      }
      
      .nav-assistant-content li {
        margin: 4px 0;
        color: #000000;
      }
      
      .nav-assistant-input-area {
        display: flex;
        gap: 8px;
        padding: 12px 16px;
        border-top: 1px solid #e5e5e5;
      }
      
      #nav-assistant-input {
        flex: 1;
        padding: 10px 14px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 14px;
        font-family: inherit;
      }
      
      #nav-assistant-input:focus {
        outline: none;
        border-color: #667eea;
      }
      
      .nav-assistant-btn-primary {
        background: #667eea;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s;
      }
      
      .nav-assistant-btn-primary:hover {
        background: #5568d3;
      }
      
      .nav-assistant-actions {
        display: flex;
        gap: 8px;
        padding: 12px 16px;
        border-top: 1px solid #e5e5e5;
      }
      
      .nav-assistant-btn-secondary {
        flex: 1;
        background: white;
        border: 1px solid #ddd;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
        color: #000000;
      }
      
      .nav-assistant-btn-secondary:hover {
        background: #f5f5f5;
        border-color: #667eea;
      }
      
      /* Custom cursor styles */
      .nav-cursor-guide {
        cursor: pointer !important;
      }
      
      .nav-cursor-pointer {
        position: fixed;
        width: 24px;
        height: 24px;
        background: #667eea;
        border-radius: 50%;
        pointer-events: none;
        z-index: 999998;
        box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.3);
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.2);
          opacity: 0.8;
        }
      }
      
      /* Enhanced highlight for target elements */
      .nav-target-highlight {
        position: relative;
        outline: 4px solid #FFD54F !important;
        outline-offset: 4px;
        box-shadow: 0 0 0 8px rgba(255, 213, 79, 0.3),
                    0 0 20px rgba(255, 213, 79, 0.5) !important;
        animation: highlightPulse 1.5s ease-in-out infinite;
        z-index: 999997 !important;
      }
      
      @keyframes highlightPulse {
        0%, 100% {
          box-shadow: 0 0 0 8px rgba(255, 213, 79, 0.3),
                      0 0 20px rgba(255, 213, 79, 0.5);
        }
        50% {
          box-shadow: 0 0 0 12px rgba(255, 213, 79, 0.2),
                      0 0 30px rgba(255, 213, 79, 0.7);
        }
      }
      
      /* Arrow pointer to target */
      .nav-arrow-pointer {
        position: fixed;
        width: 0;
        height: 0;
        border-left: 15px solid transparent;
        border-right: 15px solid transparent;
        border-top: 20px solid #FF6B6B;
        z-index: 999998;
        pointer-events: none;
        animation: bounce 1s infinite;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
      }
      
      @keyframes bounce {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-10px);
        }
      }
      
      /* Step indicator */
      .nav-step-indicator {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        padding: 12px 24px;
        border-radius: 24px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 999999;
        font-weight: 600;
        color: #667eea;
        animation: slideDown 0.3s ease;
      }
      
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  // Show the panel
  show() {
    if (!this.panel) this.init();
    this.panel.style.display = 'flex';
    this.isVisible = true;
  }

  // Hide the panel
  hide() {
    if (this.panel) {
      this.panel.style.display = 'none';
      this.isVisible = false;
    }
  }

  // Toggle panel visibility
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  // Minimize/maximize panel
  toggleMinimize() {
    if (this.panel) {
      this.panel.classList.toggle('minimized');
    }
  }

  // Add message to chat
  addMessage(text, isUser = false) {
    const messagesContainer = document.getElementById('nav-assistant-messages');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `nav-assistant-message ${isUser ? 'user' : 'assistant'}`;
    
    const avatar = isUser ? '👤' : '🤖';
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
    // Close button
    const closeBtn = document.getElementById('nav-assistant-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }
    
    // Minimize button
    const minimizeBtn = document.getElementById('nav-assistant-minimize');
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => this.toggleMinimize());
    }
    
    // Send button
    const sendBtn = document.getElementById('nav-assistant-send');
    const input = document.getElementById('nav-assistant-input');
    
    if (sendBtn && input) {
      sendBtn.addEventListener('click', () => this.handleSend());
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleSend();
      });
    }
    
    // Help button
    const helpBtn = document.getElementById('nav-assistant-help');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => this.showHelp());
    }
    
    // Reset button
    const resetBtn = document.getElementById('nav-assistant-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.reset());
    }
    
    // Make panel draggable
    this.makeDraggable();
  }

  // Handle send message
  handleSend() {
    const input = document.getElementById('nav-assistant-input');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;
    
    // Add user message
    this.addMessage(text, true);
    input.value = '';
    
    // Process the message
    this.processUserMessage(text);
  }

  // Process user message and provide guidance
  processUserMessage(text) {
    const lowerText = text.toLowerCase();
    
    // Simple keyword-based responses
    if (lowerText.includes('login') || lowerText.includes('sign in')) {
      this.findAndGuideToElement('login', 'Let me help you find the login button...');
    } else if (lowerText.includes('search')) {
      this.findAndGuideToElement('search', 'Looking for the search feature...');
    } else if (lowerText.includes('menu') || lowerText.includes('navigation')) {
      this.findAndGuideToElement('menu', 'Finding the menu...');
    } else if (lowerText.includes('help')) {
      this.showHelp();
    } else {
      // Generic response
      setTimeout(() => {
        this.addMessage(`I'll help you with "${text}". Try using voice commands or clicking on highlighted elements.`);
      }, 500);
    }
  }

  // Find element and guide user to it
  findAndGuideToElement(keyword, message) {
    this.addMessage(message);
    
    // Minimize panel during search to not obstruct view
    if (!this.panel.classList.contains('minimized')) {
      this.toggleMinimize();
    }
    
    setTimeout(() => {
      // Send message to content script to find and highlight element
      chrome.runtime.sendMessage({
        type: 'FIND_AND_GUIDE',
        keyword: keyword
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
    const messagesContainer = document.getElementById('nav-assistant-messages');
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
    document.querySelectorAll('.nav-target-highlight').forEach(el => {
      el.classList.remove('nav-target-highlight');
    });
    document.querySelectorAll('.nav-arrow-pointer').forEach(el => el.remove());
    document.querySelectorAll('.nav-cursor-pointer').forEach(el => el.remove());
  }

  // Make panel draggable
  makeDraggable() {
    const header = this.panel.querySelector('.nav-assistant-header');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    
    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      initialX = e.clientX - this.panel.offsetLeft;
      initialY = e.clientY - this.panel.offsetTop;
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      this.panel.style.left = currentX + 'px';
      this.panel.style.top = currentY + 'px';
      this.panel.style.right = 'auto';
      this.panel.style.bottom = 'auto';
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  // Create arrow pointing to element
  createArrowPointer(targetElement) {
    this.removeAllHighlights();
    
    const rect = targetElement.getBoundingClientRect();
    const arrow = document.createElement('div');
    arrow.className = 'nav-arrow-pointer';
    arrow.style.left = `${rect.left + rect.width / 2 - 15}px`;
    arrow.style.top = `${rect.top - 30}px`;
    
    document.body.appendChild(arrow);
    
    // Auto-remove after 5 seconds
    setTimeout(() => arrow.remove(), 5000);
  }
}

// Create singleton instance
const assistantPanel = new AssistantPanel();
