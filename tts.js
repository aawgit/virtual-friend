import { getFrameForViseme } from './visemeMapper.js';

/**
 * Converts text into a sequence of phoneme groups (viseme keys).
 * Each entry represents a distinct mouth shape we should animate through.
 * @param {string} text
 * @returns {string[]} Array of viseme keys (vowel or group key like 'A','M','S' etc.)
 */
function textToPhonemes(text) {
  const phonemes = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i].toUpperCase();
    if (/\s/.test(ch)) {
      // Silence between words
      phonemes.push(' ');
    } else {
      phonemes.push(ch);
    }
  }
  return phonemes;
}

/**
 * Get the hold duration (ms) for a phoneme.
 * Vowels are held longer; consonants and spaces are quicker.
 */
function getPhonemeHoldMs(phoneme, baseMs) {
  if (/[AEIOU]/.test(phoneme)) return baseMs * 1.5;  // Vowels: longer
  if (/[MBP]/.test(phoneme))   return baseMs * 0.8;  // Bilabials: quick snap
  if (/[FV]/.test(phoneme))    return baseMs * 0.9;
  if (phoneme === ' ')          return baseMs * 0.5;  // Silence: brief pause
  return baseMs;                                       // Consonants: normal
}

/**
 * Text-to-Speech wrapper using the browser's native SpeechSynthesis API.
 * Uses pre-scheduled viseme timelines for smooth co-articulation.
 */
export class TTS {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.selectedVoice = null;
    this._stopSchedule = null;
    
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
   * Speak the given text and trigger viseme frame updates via co-articulation schedule.
   * @param {string} text - The text to speak.
   * @param {Function} onVisemeFrame - Callback: (blendshapeFrame: number[]) => void
   */
  speak(text, onVisemeFrame) {
    return new Promise((resolve) => {
      if (this.synth.speaking) {
        this.synth.cancel();
      }
      if (this._stopSchedule) {
        this._stopSchedule();
        this._stopSchedule = null;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = this.selectedVoice;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      // Pre-build phoneme timeline
      const phonemes = textToPhonemes(text);
      const nonSpacePhonemesCount = phonemes.filter(p => p !== ' ').length;
      
      // Estimate total speech duration. ~70ms per phoneme at rate=0.9 empirically.
      const baseMsPerPhoneme = 70 / utterance.rate;

      // Build a list of {frame, delay} objects
      let cumulativeMs = 0;
      const schedule = phonemes.map(phoneme => {
        const holdMs = getPhonemeHoldMs(phoneme, baseMsPerPhoneme);
        const entry = { phoneme, frame: getFrameForViseme(phoneme === ' ' ? 'default' : phoneme), delay: cumulativeMs };
        cumulativeMs += holdMs;
        return entry;
      });

      let timeouts = [];
      let started = false;

      const startSchedule = () => {
        if (started) return;
        started = true;
        console.log(`TTS: Dispatching ${schedule.length} viseme frames over ~${cumulativeMs}ms`);

        schedule.forEach(({ frame, delay }) => {
          const t = setTimeout(() => onVisemeFrame(frame), delay);
          timeouts.push(t);
        });
      };

      this._stopSchedule = () => {
        timeouts.forEach(clearTimeout);
        timeouts = [];
      };

      utterance.onstart = () => {
        console.log('TTS: Speech started');
        startSchedule();
      };

      // Fallback: if onstart never fires, kick off after 200ms
      const fallbackStart = setTimeout(() => startSchedule(), 200);

      utterance.onend = () => {
        console.log('TTS: Speech ended');
        clearTimeout(fallbackStart);
        this._stopSchedule = null;
        // Trigger a neutral close after speech
        setTimeout(() => onVisemeFrame(getFrameForViseme(' ')), 150);
        resolve();
      };

      utterance.onerror = (err) => {
        clearTimeout(fallbackStart);
        console.error('TTS: Speech error:', err);
        this._stopSchedule = null;
        resolve();
      };

      console.log(`TTS: Speaking text (${text.length} chars)`);
      this.synth.speak(utterance);
    });
  }

  stop() {
    if (this._stopSchedule) {
      this._stopSchedule();
      this._stopSchedule = null;
    }
    this.synth.cancel();
  }
}
