/**
 * Text-to-Speech wrapper using the browser's native SpeechSynthesis API.
 */
export class TTS {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.selectedVoice = null;
    
    const loadVoices = () => {
      this.voices = this.synth.getVoices();
      this.selectedVoice = this.voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || this.voices[0];
    };
    
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
    loadVoices();
  }

  /**
   * Speak the given text and trigger viseme updates.
   * @param {string} text - The text to speak.
   * @param {Function} onViseme - Callback for viseme updates (char).
   */
  speak(text, onViseme) {
    return new Promise((resolve) => {
      if (this.synth.speaking) {
        this.synth.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = this.selectedVoice;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      let boundaryDetected = false;
      let fallbackTimeout = null;
      let fallbackInterval = null;

      utterance.onboundary = (event) => {
        if (!boundaryDetected) {
          console.log(`TTS: Native boundary detected: ${event.name}`);
          boundaryDetected = true;
          if (fallbackTimeout) clearTimeout(fallbackTimeout);
          if (fallbackInterval) clearInterval(fallbackInterval);
        }

        if (event.name === 'word') {
          const word = text.slice(event.charIndex).split(/\s/)[0];
          if (!word) return;
          word.split('').forEach((char, i) => {
            setTimeout(() => onViseme(char), i * 60);
          });
        } else if (event.name === 'char') {
          onViseme(text.charAt(event.charIndex));
        }
      };

      utterance.onstart = () => {
        console.log('TTS: Speech started');
        // If no boundary events are detected within 500ms of starting, use fallback
        fallbackTimeout = setTimeout(() => {
          if (!boundaryDetected) {
            console.warn('TTS: No native boundaries, starting manual fallback loop.');
            let charIndex = 0;
            fallbackInterval = setInterval(() => {
              if (charIndex < text.length) {
                onViseme(text.charAt(charIndex));
                charIndex++;
              } else {
                clearInterval(fallbackInterval);
              }
            }, 80); 
          }
        }, 500);
      };

      utterance.onend = () => {
        console.log('TTS: Speech ended');
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        if (fallbackInterval) clearInterval(fallbackInterval);
        setTimeout(() => onViseme(' '), 100); 
        resolve();
      };

      utterance.onerror = (err) => {
        console.error('TTS: Speech error:', err);
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        if (fallbackInterval) clearInterval(fallbackInterval);
        resolve();
      };

      console.log(`TTS: Speaking text (${text.length} chars)`);
      this.synth.speak(utterance);
    });
  }

  stop() {
    this.synth.cancel();
  }
}
