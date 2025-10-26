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
    this.createCustomCursor();
    console.log("Cursor Guide initialized");
  }

  // Create animated custom cursor
  createCustomCursor() {
    if (this.customCursor) return;

    const cursor = document.createElement("div");
    cursor.className = "nav-animated-cursor";
    cursor.style.display = "none";
    document.body.appendChild(cursor);
    this.customCursor = cursor;
  }

  // Enable large cursor mode for entire page
  enableLargeCursor() {
    document.body.classList.add("nav-large-cursor");
  }

  // Disable large cursor mode
  disableLargeCursor() {
    document.body.classList.remove("nav-large-cursor");
  }

  // Guide cursor to specific element
  guideTo(element) {
    if (!element) return;

    this.isGuiding = true;
    this.targetElement = element;

    // Show custom cursor
    if (this.customCursor) {
      this.customCursor.style.display = "block";
      this.animateCursorToElement(element);
    }

    // Add tooltip to element
    this.addTooltip(element);

    // Add target dot
    this.addTargetDot(element);

    // Enlarge the target
    element.classList.add("nav-enlarged-target");
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

      currentX =
        window.innerWidth / 2 +
        (targetX - window.innerWidth / 2) * easeProgress;
      currentY =
        window.innerHeight / 2 +
        (targetY - window.innerHeight / 2) * easeProgress;

      this.customCursor.style.left = currentX + "px";
      this.customCursor.style.top = currentY + "px";

      if (step < steps) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  // Add tooltip to element
  addTooltip(element, text = "Click here") {
    // Remove existing tooltips
    document.querySelectorAll(".nav-tooltip").forEach((t) => t.remove());

    const tooltip = document.createElement("div");
    tooltip.className = "nav-tooltip";
    tooltip.textContent = text;

    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + rect.width / 2 + "px";
    tooltip.style.top = rect.top - 40 + "px";
    tooltip.style.transform = "translateX(-50%)";

    document.body.appendChild(tooltip);

    // Auto-remove after 5 seconds
    setTimeout(() => tooltip.remove(), 5000);
  }

  // Add pulsing dot to target
  addTargetDot(element) {
    // Remove existing dots
    document.querySelectorAll(".nav-target-dot").forEach((d) => d.remove());

    const dot = document.createElement("div");
    dot.className = "nav-target-dot";

    const rect = element.getBoundingClientRect();
    dot.style.left = rect.left + rect.width / 2 - 10 + "px";
    dot.style.top = rect.top + rect.height / 2 - 10 + "px";
    dot.style.position = "fixed";

    document.body.appendChild(dot);

    // Auto-remove after 5 seconds
    setTimeout(() => dot.remove(), 5000);
  }

  // Create cursor trail effect
  createCursorTrail(x, y) {
    const trail = document.createElement("div");
    trail.className = "nav-cursor-trail";
    trail.style.left = x + "px";
    trail.style.top = y + "px";

    document.body.appendChild(trail);

    // Remove after animation
    setTimeout(() => trail.remove(), 600);
  }

  // Stop guiding
  stopGuiding() {
    this.isGuiding = false;

    if (this.customCursor) {
      this.customCursor.style.display = "none";
    }

    // Clean up
    document.querySelectorAll(".nav-tooltip").forEach((t) => t.remove());
    document.querySelectorAll(".nav-target-dot").forEach((d) => d.remove());
    document.querySelectorAll(".nav-enlarged-target").forEach((e) => {
      e.classList.remove("nav-enlarged-target");
    });

    this.targetElement = null;
  }

  // Enable cursor trail effect
  enableCursorTrail() {
    document.addEventListener("mousemove", this.handleMouseMove.bind(this));
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
    document.querySelectorAll(".nav-focus-ring").forEach((e) => {
      e.classList.remove("nav-focus-ring");
    });

    if (element) {
      element.classList.add("nav-focus-ring");
    }
  }
}

// Create singleton instance
const cursorGuide = new CursorGuide();
