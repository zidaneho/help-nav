// cursor-guide.js
// Custom cursor modifications for guided navigation

class CursorGuide {
  constructor() {
    this.customCursor = null;
    this.isGuiding = false;
    this.targetElement = null;
    this.cursorTrail = [];
  }

  // Initialize cursor guide
  init() {
    this.injectStyles();
    this.createCustomCursor();
    console.log('Cursor Guide initialized');
  }

  // Inject cursor styles
  injectStyles() {
    if (document.getElementById('cursor-guide-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'cursor-guide-styles';
    style.textContent = `
      /* Large, accessible cursor for elderly users */
      .nav-large-cursor {
        cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="%23000" stroke="%23fff" stroke-width="2" d="M2 2 L2 28 L10 20 L14 28 L18 26 L14 18 L24 18 Z"/></svg>') 0 0, auto !important;
      }
      
      /* Animated cursor pointer for guidance */
      .nav-animated-cursor {
        position: fixed;
        width: 40px;
        height: 40px;
        pointer-events: none;
        z-index: 999999;
        transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
      
      .nav-animated-cursor::before {
        content: '👆';
        position: absolute;
        font-size: 32px;
        animation: pointPulse 1.5s ease-in-out infinite;
      }
      
      @keyframes pointPulse {
        0%, 100% {
          transform: scale(1) translateY(0);
        }
        50% {
          transform: scale(1.2) translateY(-5px);
        }
      }
      
      /* Cursor trail effect */
      .nav-cursor-trail {
        position: fixed;
        width: 12px;
        height: 12px;
        background: radial-gradient(circle, #667eea 0%, transparent 70%);
        border-radius: 50%;
        pointer-events: none;
        z-index: 999998;
        opacity: 0;
        animation: trailFade 0.6s ease-out forwards;
      }
      
      @keyframes trailFade {
        0% {
          opacity: 0.8;
          transform: scale(1);
        }
        100% {
          opacity: 0;
          transform: scale(0.3);
        }
      }
      
      /* Enlarged clickable areas for accessibility */
      .nav-enlarged-target {
        position: relative;
        transform: scale(1.15);
        transition: transform 0.2s ease;
        z-index: 10;
      }
      
      .nav-enlarged-target:hover {
        transform: scale(1.2);
      }
      
      /* Focus ring for keyboard navigation */
      .nav-focus-ring {
        outline: 4px solid #667eea !important;
        outline-offset: 4px !important;
        box-shadow: 0 0 0 8px rgba(102, 126, 234, 0.2) !important;
      }
      
      /* Tooltip for guided elements */
      .nav-tooltip {
        position: absolute;
        background: #1f2937;
        color: white;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        white-space: nowrap;
        z-index: 999999;
        pointer-events: none;
        animation: tooltipFadeIn 0.3s ease;
      }
      
      .nav-tooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 6px solid transparent;
        border-top-color: #1f2937;
      }
      
      @keyframes tooltipFadeIn {
        from {
          opacity: 0;
          transform: translateY(-5px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* Path visualization - draws a line to the target */
      .nav-path-line {
        position: fixed;
        height: 3px;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        transform-origin: left center;
        z-index: 999997;
        pointer-events: none;
        opacity: 0.7;
        animation: pathDraw 1s ease-out forwards;
      }
      
      @keyframes pathDraw {
        from {
          width: 0;
        }
        to {
          width: 100%;
        }
      }
      
      /* Pulsing dot on target */
      .nav-target-dot {
        position: absolute;
        width: 20px;
        height: 20px;
        background: #FF6B6B;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 0 4px rgba(255, 107, 107, 0.3);
        animation: dotPulse 1.5s ease-in-out infinite;
      }
      
      @keyframes dotPulse {
        0%, 100% {
          transform: scale(1);
          box-shadow: 0 0 0 4px rgba(255, 107, 107, 0.3);
        }
        50% {
          transform: scale(1.3);
          box-shadow: 0 0 0 8px rgba(255, 107, 107, 0.1);
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  // Create animated custom cursor
  createCustomCursor() {
    if (this.customCursor) return;
    
    const cursor = document.createElement('div');
    cursor.className = 'nav-animated-cursor';
    cursor.style.display = 'none';
    document.body.appendChild(cursor);
    this.customCursor = cursor;
  }

  // Enable large cursor mode for entire page
  enableLargeCursor() {
    document.body.classList.add('nav-large-cursor');
  }

  // Disable large cursor mode
  disableLargeCursor() {
    document.body.classList.remove('nav-large-cursor');
  }

  // Guide cursor to specific element
  guideTo(element) {
    if (!element) return;
    
    this.isGuiding = true;
    this.targetElement = element;
    
    // Show custom cursor
    if (this.customCursor) {
      this.customCursor.style.display = 'block';
      this.animateCursorToElement(element);
    }
    
    // Add tooltip to element
    this.addTooltip(element);
    
    // Add target dot
    this.addTargetDot(element);
    
    // Enlarge the target
    element.classList.add('nav-enlarged-target');
  }

  // Animate cursor movement to element
  animateCursorToElement(element) {
    const rect = element.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;
    
    // Smooth animation to target
    let currentX = window.innerWidth / 2;
    let currentY = window.innerHeight / 2;
    const steps = 30;
    let step = 0;
    
    const animate = () => {
      step++;
      const progress = step / steps;
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      
      currentX = window.innerWidth / 2 + (targetX - window.innerWidth / 2) * easeProgress;
      currentY = window.innerHeight / 2 + (targetY - window.innerHeight / 2) * easeProgress;
      
      this.customCursor.style.left = currentX + 'px';
      this.customCursor.style.top = currentY + 'px';
      
      if (step < steps) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  // Add tooltip to element
  addTooltip(element, text = 'Click here') {
    // Remove existing tooltips
    document.querySelectorAll('.nav-tooltip').forEach(t => t.remove());
    
    const tooltip = document.createElement('div');
    tooltip.className = 'nav-tooltip';
    tooltip.textContent = text;
    
    const rect = element.getBoundingClientRect();
    tooltip.style.left = (rect.left + rect.width / 2) + 'px';
    tooltip.style.top = (rect.top - 40) + 'px';
    tooltip.style.transform = 'translateX(-50%)';
    
    document.body.appendChild(tooltip);
    
    // Auto-remove after 5 seconds
    setTimeout(() => tooltip.remove(), 5000);
  }

  // Add pulsing dot to target
  addTargetDot(element) {
    // Remove existing dots
    document.querySelectorAll('.nav-target-dot').forEach(d => d.remove());
    
    const dot = document.createElement('div');
    dot.className = 'nav-target-dot';
    
    const rect = element.getBoundingClientRect();
    dot.style.left = (rect.left + rect.width / 2 - 10) + 'px';
    dot.style.top = (rect.top + rect.height / 2 - 10) + 'px';
    dot.style.position = 'fixed';
    
    document.body.appendChild(dot);
    
    // Auto-remove after 5 seconds
    setTimeout(() => dot.remove(), 5000);
  }

  // Create cursor trail effect
  createCursorTrail(x, y) {
    const trail = document.createElement('div');
    trail.className = 'nav-cursor-trail';
    trail.style.left = x + 'px';
    trail.style.top = y + 'px';
    
    document.body.appendChild(trail);
    
    // Remove after animation
    setTimeout(() => trail.remove(), 600);
  }

  // Stop guiding
  stopGuiding() {
    this.isGuiding = false;
    
    if (this.customCursor) {
      this.customCursor.style.display = 'none';
    }
    
    // Clean up
    document.querySelectorAll('.nav-tooltip').forEach(t => t.remove());
    document.querySelectorAll('.nav-target-dot').forEach(d => d.remove());
    document.querySelectorAll('.nav-enlarged-target').forEach(e => {
      e.classList.remove('nav-enlarged-target');
    });
    
    this.targetElement = null;
  }

  // Enable cursor trail effect
  enableCursorTrail() {
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
  }

  // Handle mouse move for trail
  handleMouseMove(e) {
    // Throttle trail creation
    if (Math.random() > 0.7) {
      this.createCursorTrail(e.clientX, e.clientY);
    }
  }

  // Add focus ring to element
  addFocusRing(element) {
    document.querySelectorAll('.nav-focus-ring').forEach(e => {
      e.classList.remove('nav-focus-ring');
    });
    
    if (element) {
      element.classList.add('nav-focus-ring');
    }
  }
}

// Create singleton instance
const cursorGuide = new CursorGuide();
