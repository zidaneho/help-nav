# Spotlight

A voice-guided web navigation assistant that helps users browse websites using voice commands and visual guidance. Spotlight highlights exactly where to click, making web navigation intuitive and accessible for everyone, especially elderly users and those with cognitive or visual challenges.

## Features

### Core Features
- 🧠 **Claude AI Reasoning**: Understands complex commands like "I want to make an appointment" and figures out what to click
- 🎤 **Natural Voice Commands**: Navigate websites hands-free with conversational language
- 💡 **Spotlight Panel**: Interactive assistant that minimizes to stay out of your way
- 🎯 **Smart Highlighting**: Multi-layer visual feedback (arrows, pulsing dots, tooltips, animated cursor)
- 👆 **Show, Don't Do**: Highlights where to click instead of auto-clicking, maintaining user control
- 🐟 **Fish Audio TTS**: Optional premium text-to-speech (auto-falls back to native browser TTS)
- 🖱️ **Enhanced Cursor**: Large, accessible cursor with animated guidance
- 📍 **Step Indicators**: Clear on-screen instructions for each action
- ♿ **Accessibility First**: Designed specifically for elderly and cognitive load-sensitive users

### Visual Enhancements
- **Pulsing Highlights**: Animated yellow outlines around target elements
- **Arrow Pointers**: Red arrows pointing to elements you need to click
- **Animated Cursor**: Guided cursor animation showing where to click
- **Tooltips**: Helpful text labels on interactive elements
- **Target Dots**: Pulsing red dots marking exact click locations
- **Large Cursor Mode**: Enlarged cursor for better visibility (enabled by default)
- **Smooth Animations**: All transitions use smooth, non-jarring animations

## How to Use

### Voice Commands

Spotlight uses Claude AI to understand both simple and complex commands:

**Simple Commands:**
- **"scroll down"** / **"scroll up"** - Navigate the page
- **"click login"** / **"click search"** - Find specific elements
- **"go back"** - Navigate back to the previous page
- **"repeat"** - Repeat the last action

**Intelligent Complex Commands (powered by Claude):**
- **"I want to make an appointment for my driver's license"** - Claude analyzes the page and finds "Appointments", "Schedule", or "Book" buttons
- **"Help me find cheap flights to New York"** - Finds search or booking interfaces
- **"I need to update my address"** - Identifies account/profile settings
- **"Show me how to contact support"** - Finds contact or help links

Claude reads the page content and understands your intent, finding the right elements even if you don't know exactly what they're called!

### Spotlight Panel

The Spotlight panel provides a friendly chat interface for guidance:

1. **Open Spotlight**: Click the "💡 Open Spotlight" button in the extension popup
2. **Auto-Minimizes**: The panel starts minimized at the bottom-right and automatically minimizes when searching
3. **Ask Questions**: Type questions like "How do I login?" or "Find the search button"
4. **Get Visual Guidance**: Spotlight finds elements and highlights them with multiple visual cues
5. **Interactive Help**: Click "Help Guide" for a list of available commands

**Spotlight Panel Features**:
- **Draggable**: Click and drag the header to move the panel anywhere on screen
- **Auto-Minimize**: Minimizes during searches so you can see the highlighted elements
- **Black Text**: All text is in high-contrast black for better readability
- **Chat History**: All your questions and responses are saved during your session
- **Visual Feedback**: Coordinates with all visual guides (arrows, highlights, animated cursors)

## Setup Instructions

### 1. Get Claude API Key (Required)

Spotlight uses Claude AI to understand complex commands intelligently:

1. Visit [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in to your account
3. Go to API Keys section
4. Create a new API key
5. Copy the key - you'll need it in step 3

### 2. Install the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked"
4. Select the `help-nav` directory
5. The extension will now be installed

### 3. Configure Claude API

1. Click the extension icon → "Settings"
2. Paste your Claude API key in the "Claude AI Configuration" section
3. Click "Save Settings"

**You must configure Claude to use Spotlight's intelligent commands!**

### 4. Start Using

1. Click the extension icon
2. Click "🎤 Start listening" (allow microphone access when prompted)
3. Say an intelligent command:
   - Simple: "click search"
   - Complex: **"I want to make an appointment for my driver's license"**
4. Spotlight uses Claude to understand your intent and highlights where to click!

### 5. Configure Fish Audio (Optional)

For premium TTS voices:

1. Visit [fish.audio](https://fish.audio) and get an API key
2. Click the extension icon → "Settings"
3. Enter your Fish Audio API key
4. (Optional) Enter a Reference ID for a specific voice
5. Click "Save Settings"

Note: Without Fish Audio, Spotlight uses your browser's native text-to-speech.

## Technical Details

### File Structure

- `manifest.json` - Extension configuration and permissions
- `background.js` - Command processing and Fish Audio TTS (avoids CORS)
- `content.js` - DOM interaction, element finding, and visual coordination
- `assistant-panel.js` - Spotlight panel (chat interface and guidance system)
- `cursor-guide.js` - Enhanced cursor and visual guidance features
- `popup.html/js` - Extension popup interface with voice controls
- `options.html/js` - Settings page for Fish Audio API configuration

### Architecture

Spotlight uses a multi-layered AI-powered approach:

1. **AI Reasoning Layer** (Claude API):
   - Receives user command + simplified DOM snapshot
   - Understands user intent using natural language processing
   - Identifies the best element(s) to interact with
   - Returns structured action with reasoning

2. **Background Layer** (background.js):
   - Handles Claude API calls (no CORS restrictions)
   - Processes Fish Audio TTS API calls
   - Coordinates between popup and content scripts

3. **Content Layer** (content.js):
   - Generates DOM snapshots for Claude
   - Finds elements based on Claude's reasoning
   - Coordinates all visual elements and highlighting

4. **Visual Modules**:
   - `assistant-panel.js`: Spotlight panel (chat interface and conversational guidance)
   - `cursor-guide.js`: Manages cursor enhancements and visual pointers

5. **User Interface**: Popup for voice controls, Options page for API configuration

**Key Design Choices**:
- **Claude AI**: Replaces simple keyword matching with intelligent reasoning
- **DOM Context**: Sends page structure to Claude for accurate element identification
- **Show, Don't Click**: Highlights elements instead of auto-clicking to maintain user control and help users learn

### Claude AI Integration

Spotlight uses Anthropic's Claude 3.5 Sonnet for intelligent command understanding:

**How It Works:**
1. **User speaks**: "I want to make an appointment for my driver's license"
2. **DOM Snapshot**: Content script extracts interactive elements (buttons, links, inputs) with their text
3. **Claude Reasoning**: Background script sends command + DOM to Claude API
4. **Action Response**: Claude analyzes and returns:
   ```json
   {
     "reasoning": "User wants to schedule a driver's license appointment",
     "action": "click",
     "selector": "appointments",
     "speak": "I found the appointments button. Click it to schedule."
   }
   ```
5. **Element Highlighting**: Content script finds and highlights the element
6. **User Action**: User clicks the highlighted element themselves

**Why Claude?**
- **Natural Language**: Understands intent, not just keywords
- **Context Aware**: Reads the actual page content
- **Multi-Step Ready**: Can identify sequences of actions (future feature)
- **No Training**: Works on any website without custom configuration

**Privacy**:
- Only sends: user command + a redacted DOM snapshot of visible labels/titles/placeholders for interactive elements (buttons/links/labelled inputs) and key headings.
- Never sends: input values, passwords, multi-factor codes, payment or personal identifiers. Password and sensitive fields are excluded client‑side.
- Claude API: https://api.anthropic.com/v1/messages

### Fish Audio Integration (Optional)

Spotlight supports Fish Audio's premium TTS API for high-quality voice responses:

- **CORS Solution**: API calls made from background script to avoid browser restrictions
- **API Endpoint**: `https://api.fish.audio/v1/tts`
- **Format**: MP3 audio (converted to base64 for message passing)
- **Automatic Fallback**: Uses browser's native TTS if Fish Audio unavailable or fails
- **Configuration**: API key stored securely in Chrome's sync storage
- **Privacy**: Only TTS requests sent to Fish Audio, no browsing data transmitted

### Permissions

- `storage` - Save user settings and API keys (Claude, Fish Audio)
- `activeTab` - Interact with the current webpage
- `scripting` - Inject content scripts for DOM analysis
- `https://api.anthropic.com/*` - Make requests to Claude AI for command understanding
- `https://api.fish.audio/*` - Make requests to Fish Audio TTS API (optional)

## Development

To modify the extension:

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

## Use Cases

This extension is designed for:

### Elderly Users
- **Large Visual Cues**: Pulsing highlights, arrows, and large cursor make it easy to see where to click
- **Voice Guidance**: Spoken instructions reduce reading burden
- **Step-by-Step Help**: Clear instructions for each action
- **Simplified Navigation**: No need to search for buttons or links

### Cognitive Load-Sensitive Users
- **Reduced Complexity**: Visual guides eliminate the need to process complex layouts
- **One Task at a Time**: Step indicators focus attention on single actions
- **Interactive Help**: Chat with the assistant instead of reading documentation
- **Consistent Experience**: Same guidance system works on any website

### Users with Visual Impairments
- **High Contrast Highlights**: Bright yellow and red visual markers
- **Audio Feedback**: Voice confirms every action
- **Large Cursor**: Easy-to-see cursor for those with limited vision
- **Text-to-Speech**: Premium Fish Audio voices or native browser TTS

### Anyone Navigating Complex Sites
- **Bad UX Helper**: Makes poorly designed websites easier to use
- **Training Mode**: Learn how to use new websites with guidance
- **Accessibility Overlay**: Adds missing accessibility features to any site

## Troubleshooting

**"Configure Claude API" warning in popup?**
- You haven't set up your Claude API key yet
- Click the warning or go to Settings
- Get API key from [console.anthropic.com](https://console.anthropic.com/)
- Paste it in the "Claude AI Configuration" section and save
- **Spotlight requires Claude to understand commands**

**Commands not being understood?**
- Check that Claude API key is configured in Settings
- Check browser console (F12) → Service Worker for Claude API errors
- Verify you have an active internet connection
- Make sure you're on a regular webpage (not chrome:// pages)
- Check Claude API usage/quota at console.anthropic.com

**Spotlight panel not appearing?**
- Make sure you're on a regular webpage (not chrome:// or extension pages)
- Try refreshing the page after installing the extension
- Check browser console (F12) for any error messages
- Click "💡 Open Spotlight" in the popup again

**Fish Audio not working?**
- This is optional - native TTS will be used instead
- Check that your API key is correctly entered in Settings
- Verify you have an active internet connection
- Check the browser console for error messages

**Voice recognition not working?**
- **First time?** Click "🎤 Start listening" - Chrome will ask for microphone permission
- Look for the microphone icon in Chrome's address bar and click "Allow"
- Check your system microphone settings
- Try speaking more clearly or closer to the microphone
- Check if another app is using the microphone
- Keep the popup open while using voice commands

**Visual guides not appearing?**
- Refresh the page to reload all content scripts
- Check if the page has security policies blocking scripts
- Try on a different website to verify the extension works

**Commands not highlighting elements?**
- Check browser console (F12) for debug logs showing what was found
- Make sure you're on a regular webpage (not chrome:// pages)
- Try using the exact text on the button (e.g., "click Google Search")
- The element must be visible on the page
- Try: "click search", "click login", "click sign in" on common sites

**Cursor appears too large/small?**
- This can be adjusted in future updates
- Large cursor is enabled by default for accessibility

## Privacy & Security

- API keys are stored locally in Chrome's sync storage
- Voice recognition is handled by the browser (nothing sent to external servers for speech-to-text)
- Only TTS requests are sent to Fish Audio API
- No browsing data is collected or transmitted

## License

MIT License - Feel free to modify and distribute
