# Voice Navigator - Fish Audio TTS

A Chrome extension that helps elderly users navigate websites using voice commands, visual highlights, and an interactive assistant for easier, independent browsing. Features premium text-to-speech powered by Fish Audio API, enhanced cursor guidance, and a chatbox interface.

## Features

### Core Features
- 🎤 **Voice Commands**: Navigate websites hands-free with natural voice commands
- 🐟 **Fish Audio TTS**: High-quality, natural-sounding text-to-speech responses
- 🧭 **Assistant Panel**: Interactive chatbox for text-based guidance and help
- 🖱️ **Enhanced Cursor**: Large, accessible cursor with animated guidance
- 🎯 **Smart Highlighting**: Multi-layer visual feedback (arrows, pulsing dots, tooltips)
- 📍 **Step Indicators**: Clear on-screen instructions for each action
- 🔄 **Automatic Fallback**: Uses native browser TTS if Fish Audio is not configured
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
- **"click [element]"** - Click on an element (e.g., "click login", "click search")
- **"highlight [element]"** - Highlight an element without clicking
- **"go back"** - Navigate back to the previous page
- **"repeat"** - Repeat the last action

### Assistant Panel / Chatbox

The assistant panel provides a friendly chat interface for guidance:

1. **Open the Assistant**: Click the "🧭 Open Assistant Panel" button in the extension popup
2. **Ask Questions**: Type questions like "How do I login?" or "Find the search button"
3. **Get Guidance**: The assistant will find elements and visually guide you to them
4. **Interactive Help**: Click "Help Guide" for a list of available commands

**Assistant Panel Features**:
- **Draggable**: Click and drag the header to move the panel anywhere on screen
- **Minimizable**: Click the "−" button to minimize when not in use
- **Chat History**: All your questions and responses are saved during your session
- **Visual Feedback**: The assistant coordinates with all visual guides (arrows, highlights, cursors)

## Setup Instructions

### 1. Get a Fish Audio API Key

1. Visit [fish.audio](https://fish.audio)
2. Sign up for an account
3. Navigate to your API settings
4. Generate a new API key

### 2. Install the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked"
4. Select the `help-nav` directory
5. The extension will now be installed

### 3. Configure Fish Audio

1. Click the extension icon in your browser toolbar
2. Click "Settings" in the popup
3. Enter your Fish Audio API key
4. (Optional) Enter a Reference ID for a specific voice model
5. Click "Save Settings"

### 4. Start Using

1. Click the extension icon
2. Click "Start listening"
3. Say a voice command
4. The extension will respond with voice feedback and perform the action

## Technical Details

### File Structure

- `manifest.json` - Extension configuration and permissions
- `background.js` - Speech recognition and command processing
- `content.js` - DOM interaction, command execution, and coordination
- `fish-audio.js` - Fish Audio API integration for premium TTS
- `assistant-panel.js` - Interactive chatbox and guidance system
- `cursor-guide.js` - Enhanced cursor and visual guidance features
- `popup.html/js` - Extension popup interface with controls
- `options.html/js` - Settings page for API configuration

### Architecture

The extension uses a multi-layered approach for maximum accessibility:

1. **Background Layer** (background.js): Handles voice recognition and command parsing
2. **Content Layer** (content.js): Coordinates all visual elements and actions
3. **Visual Modules**:
   - `assistant-panel.js`: Provides chat interface and conversational guidance
   - `cursor-guide.js`: Manages cursor enhancements and visual pointers
   - `fish-audio.js`: Handles audio feedback
4. **User Interface**: Popup for quick controls, Options page for configuration

### Fish Audio Integration

The extension uses Fish Audio's TTS API to provide high-quality voice responses. Key features:

- **API Endpoint**: `https://api.fish.audio/v1/tts`
- **Format**: MP3 audio
- **Fallback**: Automatically uses browser's native TTS if Fish Audio fails
- **Configuration**: API key stored securely in Chrome's sync storage

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

**Assistant Panel not appearing?**
- Make sure you're on a regular webpage (not chrome:// or extension pages)
- Try refreshing the page after installing the extension
- Check browser console for any error messages
- Click "Open Assistant Panel" in the popup again

**Fish Audio not working?**
- Check that your API key is correctly entered in Settings
- Verify you have an active internet connection
- Check the browser console for error messages
- The extension will automatically fall back to native TTS

**Voice recognition not working?**
- Ensure you've granted microphone permissions
- Check your system microphone settings
- Try speaking more clearly or closer to the microphone
- Check if another app is using the microphone

**Visual guides not appearing?**
- Refresh the page to reload all content scripts
- Check if the page has security policies blocking scripts
- Try on a different website to verify the extension works

**Commands not executing?**
- Make sure you're on a webpage (not chrome:// pages)
- Try refreshing the page
- Check that the element you're trying to interact with exists
- The element must be visible on the page

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
