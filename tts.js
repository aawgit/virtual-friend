import { getFrameForViseme } from './visemeMapper.js?v=3';

/**
 * Assigns relative weight to each character for hold duration.
 * Vowels are held 1.5x, spaces are quick pauses, others are baseline.
 */
function charWeight(ch) {
  const k = ch.toUpperCase();
  if (/\s/.test(k)) return 0.3;
  if (/[AEIOU]/.test(k)) return 1.5;
  if (/[MBP]/.test(k)) return 0.8;
  return 1.0;
}

/**
 * Builds a normalized phoneme schedule: [{ch, delay}] across the estimated duration.
 */
function buildPhonemeSchedule(text, estimatedMs) {
  const chars = Array.from(text);
  const weights = chars.map(ch => charWeight(ch));
  const total = weights.reduce((s, w) => s + w, 0);

  const schedule = [];
  let cursor = 0;
  chars.forEach((ch, i) => {
    schedule.push({ ch, delay: Math.round(cursor) });
    cursor += (weights[i] / total) * estimatedMs;
  });
  return schedule;
}

/**
 * Text-to-Speech using the Web Speech API.
 * 
 * Provides two animation signals to the caller:
 *  - `onJawControl(state)`: jaw state = { active: bool, wordStart: bool }
 *    The animation loop uses this to drive a smooth oscillatory jaw.
 *  - `onSecondaryFrame(frame)`: secondary lip shapes (mouth corners, pucker, stretch)
 *    scheduled across estimated speech duration.
 */
export class TTS {
  constructor() {
    this.synth = window.speechSynthesis;
    this.selectedVoice = null;
    this._utterance = null;
    this._timeouts = [];
    this._speaking = false;

    const loadVoices = () => {
      const voices = this.synth.getVoices();
      this.selectedVoice =
        voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0];
    };
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
    loadVoices();
  }

  /**
   * Must be called inside a synchronous UI event handler (click/keydown)
   * to unlock the SpeechSynthesis API in some browsers.
   */
  init() {
    if (this.synth.speaking) return;
    const utterance = new SpeechSynthesisUtterance('');
    utterance.volume = 0;
    this.synth.speak(utterance);
    this.synth.resume();
  }

  /**

   * Returns true while speech is actively playing.
   * Used by external code to decide jaw animation mode.
   */
  get isSpeaking() { return this._speaking; }

  /**
   * Speak text. Fires onSecondaryFrame callbacks spread over estimated speech duration.
   * @param {string} text
   * @param {Function} onSecondaryFrame - (frame: number[]) => void (jaw index zeroed out)
   */
  speak(text, onSecondaryFrame) {
    return new Promise((resolve) => {
      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = this.selectedVoice;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      this._utterance = utterance;

      // Estimate speech duration: ~120ms per character at rate=0.9, slightly conservative
      const estimatedMs = (text.length * 120) / utterance.rate;

      utterance.onstart = () => {
        this._speaking = true;
        console.log(`TTS: speaking ~${(estimatedMs / 1000).toFixed(1)}s`);

        // Schedule secondary (non-jaw) lip shape frames across estimated duration
        const schedule = buildPhonemeSchedule(text, estimatedMs);
        schedule.forEach(({ ch, delay }) => {
          const t = setTimeout(() => {
            if (!this._speaking) return;
            const frame = getFrameForViseme(ch);
            frame[17] = 0; // jaw driven by animation loop
            onSecondaryFrame(frame);
          }, delay);
          this._timeouts.push(t);
        });
      };

      utterance.onend = () => {
        this._speaking = false;
        this._clearTimeouts();
        resolve();
      };

      utterance.onerror = (err) => {
        if (err.error !== 'canceled') console.error('TTS error:', err.error);
        this._speaking = false;
        this._clearTimeouts();
        resolve();
      };

      this.synth.speak(utterance);
    });
  }

  _clearTimeouts() {
    this._timeouts.forEach(clearTimeout);
    this._timeouts = [];
  }

  stop() {
    this._clearTimeouts();
    this._speaking = false;
    this.synth.cancel();
    this._utterance = null;
  }
}
