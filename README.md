# Spotlight

A voice-guided web navigation assistant that helps users browse websites using voice commands and visual guidance. Spotlight highlights exactly where to click, making web navigation intuitive and accessible for everyone, especially elderly users and those with cognitive or visual challenges.

## Features

### Core Features
- 🎤 **Voice Commands**: Navigate websites hands-free with natural voice commands
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

- **"scroll down"** - Scroll the page down
- **"scroll up"** - Scroll the page up
- **"click [element]"** - Show where to click (e.g., "click login", "click search")
- **"highlight [element]"** - Highlight an element with visual guides
- **"go back"** - Navigate back to the previous page
- **"repeat"** - Repeat the last action

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

### 1. Install the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked"
4. Select the `help-nav` directory
5. The extension will now be installed

### 2. Start Using

1. Click the extension icon
2. Click "🎤 Start listening" (allow microphone access when prompted)
3. Say a voice command (e.g., "click search")
4. Spotlight highlights where to click - you perform the action yourself!

### 3. Configure Fish Audio (Optional)

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

Spotlight uses a multi-layered approach for maximum accessibility:

1. **Background Layer** (background.js): Handles command parsing and Fish Audio TTS API calls
2. **Content Layer** (content.js): Coordinates all visual elements and finds target elements
3. **Visual Modules**:
   - `assistant-panel.js`: Provides Spotlight panel (chat interface and conversational guidance)
   - `cursor-guide.js`: Manages cursor enhancements and visual pointers
4. **User Interface**: Popup for voice controls, Options page for Fish Audio configuration

**Key Design Choice**: Spotlight highlights elements instead of auto-clicking them. This maintains user control and helps users learn where elements are located.

### Fish Audio Integration (Optional)

Spotlight supports Fish Audio's premium TTS API for high-quality voice responses:

- **CORS Solution**: API calls made from background script to avoid browser restrictions
- **API Endpoint**: `https://api.fish.audio/v1/tts`
- **Format**: MP3 audio (converted to base64 for message passing)
- **Automatic Fallback**: Uses browser's native TTS if Fish Audio unavailable or fails
- **Configuration**: API key stored securely in Chrome's sync storage
- **Privacy**: Only TTS requests sent to Fish Audio, no browsing data transmitted

### Permissions

- `storage` - Save user settings and API keys
- `activeTab` - Interact with the current webpage
- `scripting` - Inject content scripts
- `https://api.fish.audio/*` - Make requests to Fish Audio API

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

**Spotlight panel not appearing?**
- Make sure you're on a regular webpage (not chrome:// or extension pages)
- Try refreshing the page after installing the extension
- Check browser console (F12) for any error messages
- Click "💡 Open Spotlight" in the popup again

**Fish Audio not working?**
- Check that your API key is correctly entered in Settings
- Verify you have an active internet connection
- Check the browser console for error messages
- The extension will automatically fall back to native TTS

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
