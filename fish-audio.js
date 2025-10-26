// fish-audio.js
// Fish Audio API integration for text-to-speech

class FishAudioTTS {
  constructor() {
    this.apiKey = null;
    this.baseURL = 'https://api.fish.audio';
    this.audioContext = null;
    this.isPlaying = false;
    this.audioQueue = [];
  }

  // Initialize with API key from storage
  async init() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['fishAudioApiKey', 'fishAudioReferenceId'], (data) => {
        this.apiKey = data.fishAudioApiKey || null;
        this.referenceId = data.fishAudioReferenceId || null;
        resolve(!!this.apiKey);
      });
    });
  }

  // Set API key
  setApiKey(key) {
    this.apiKey = key;
    chrome.storage.sync.set({ fishAudioApiKey: key });
  }

  // Set reference ID (voice model)
  setReferenceId(id) {
    this.referenceId = id;
    chrome.storage.sync.set({ fishAudioReferenceId: id });
  }

  // Check if API key is configured
  isConfigured() {
    return !!this.apiKey;
  }

  // Generate speech using Fish Audio API
  async generateSpeech(text) {
    if (!this.apiKey) {
      throw new Error('Fish Audio API key not configured');
    }

    if (!text || text.trim() === '') {
      return null;
    }

    const url = `${this.baseURL}/v1/tts`;
    
    const requestBody = {
      text: text,
      reference_id: this.referenceId || undefined,
      format: 'mp3',
      latency: 'normal'
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fish Audio API error:', response.status, errorText);
        throw new Error(`Fish Audio API error: ${response.status}`);
      }

      // Get audio data as blob
      const audioBlob = await response.blob();
      return audioBlob;
    } catch (error) {
      console.error('Error generating speech:', error);
      throw error;
    }
  }

  // Play audio from blob
  async playAudio(audioBlob) {
    if (!audioBlob) return;

    return new Promise((resolve, reject) => {
      const audioURL = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioURL);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioURL);
        this.isPlaying = false;
        resolve();
      };

      audio.onerror = (error) => {
        URL.revokeObjectURL(audioURL);
        this.isPlaying = false;
        reject(error);
      };

      this.isPlaying = true;
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
        this.isPlaying = false;
        reject(error);
      });
    });
  }

  // Speak text using Fish Audio
  async speak(text, fallbackToNative = true) {
    try {
      const audioBlob = await this.generateSpeech(text);
      await this.playAudio(audioBlob);
    } catch (error) {
      console.error('Fish Audio TTS failed:', error);
      
      // Fallback to native speech synthesis if enabled
      if (fallbackToNative && window.speechSynthesis) {
        console.log('Falling back to native TTS');
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.95;
        speechSynthesis.speak(utterance);
      }
    }
  }

  // Stop current playback
  stop() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.isPlaying = false;
  }
}

// Create singleton instance
const fishAudioTTS = new FishAudioTTS();
