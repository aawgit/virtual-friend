import { getFrameForViseme } from './visemeMapper.js';

/**
 * Converts text into phoneme groups for secondary lip animations.
 * Vowels hold longer, consonants are brief. Spaces are short pauses.
 */
function buildPhonemeSchedule(text, durationMs) {
  // Assign relative durations per phoneme
  const weights = [];
  const chars = Array.from(text);
  chars.forEach(ch => {
    const k = ch.toUpperCase();
    if (/\s/.test(k)) weights.push(0.3);
    else if (/[AEIOU]/.test(k)) weights.push(1.6);  // Vowels: long
    else if (/[MBP]/.test(k)) weights.push(0.7);    // Bilabials: quick
    else weights.push(1.0);                           // Other: normal
  });

  const totalWeight = weights.reduce((s, w) => s + w, 0);
  const schedule = [];
  let cursor = 0;
  chars.forEach((ch, i) => {
    const hold = (weights[i] / totalWeight) * durationMs;
    schedule.push({ ch, delay: Math.round(cursor), hold: Math.round(hold) });
    cursor += hold;
  });
  return schedule;
}

/**
 * TTS using Kokoro (ONNX WASM) running entirely in the browser.
 * Produces an AudioBuffer that is played through a Web Audio AnalyserNode,
 * enabling real-time amplitude measurement for jaw sync.
 */
export class TTS {
  constructor() {
    this._model = null;
    this._modelLoading = false;
    this._modelReady = false;
    this._audioCtx = null;
    this._analyser = null;
    this._source = null;
    this._scheduleTimeouts = [];
    this._freqData = null;
    this.onModelProgress = null; // optional: (progress) => void
  }

  _getAudioCtx() {
    if (!this._audioCtx || this._audioCtx.state === 'closed') {
      this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this._audioCtx;
  }

  /**
   * Lazy-load the Kokoro model (cached in browser after first load).
   */
  async _ensureModel() {
    if (this._modelReady) return;
    if (this._modelLoading) {
      // Wait for existing load to finish
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (this._modelReady) { clearInterval(check); resolve(); }
        }, 200);
      });
      return;
    }
    this._modelLoading = true;

    try {
      // Dynamic import so it doesn't block page load
      const { KokoroTTS } = await import('https://esm.sh/kokoro-js@0.2.3');
      this._model = await KokoroTTS.from_pretrained(
        'onnx-community/Kokoro-82M-v1.0-ONNX',
        {
          dtype: 'q8',
          progress_callback: (p) => {
            if (this.onModelProgress) this.onModelProgress(p);
          }
        }
      );
      this._modelReady = true;
      console.log('TTS: Kokoro model ready.');
    } catch (err) {
      console.error('TTS: Failed to load Kokoro model:', err);
      this._modelLoading = false;
      throw err;
    }
    this._modelLoading = false;
  }

  /**
   * Returns the current amplitude (0–1) from the active audio analyser.
   * Called every frame by the animation loop.
   */
  getAmplitude() {
    if (!this._analyser) return 0;
    if (!this._freqData) {
      this._freqData = new Uint8Array(this._analyser.frequencyBinCount);
    }
    this._analyser.getByteFrequencyData(this._freqData);

    // Focus on speech-range frequencies (roughly 100–4000 Hz)
    // With fftSize=256 and sampleRate=24000: each bin = 24000/256 ≈ 93.75 Hz
    const startBin = 1;  // ~94 Hz
    const endBin = 43;   // ~4031 Hz
    let sum = 0;
    for (let i = startBin; i < endBin; i++) sum += this._freqData[i];
    return sum / ((endBin - startBin) * 255);
  }

  /**
   * Generate speech with Kokoro, schedule secondary visemes, and play audio.
   * While the model generates (or on first load), the animation loop's
   * oscillatory fallback keeps the mouth lively.
   *
   * @param {string} text - Text to speak.
   * @param {Function} onSecondaryFrame - (frame: number[]) => void for lip shapes.
   */
  speak(text, onSecondaryFrame) {
    return new Promise(async (resolve) => {
      this.stop(); // Cancel any previous playback

      try {
        await this._ensureModel();

        console.log('TTS: Generating audio...');
        const output = await this._model.generate(text, { voice: 'af_bella' });

        // output.audio: Float32Array, output.sampling_rate: e.g. 24000
        const { audio: samples, sampling_rate: sampleRate } = output;
        const durationMs = (samples.length / sampleRate) * 1000;

        // Build secondary viseme schedule (non-jaw shapes) based on audio duration
        const schedule = buildPhonemeSchedule(text, durationMs);

        // Set up Web Audio pipeline: source → analyser → destination
        const ctx = this._getAudioCtx();
        if (ctx.state === 'suspended') await ctx.resume();

        const buffer = ctx.createBuffer(1, samples.length, sampleRate);
        buffer.copyToChannel(samples, 0);

        this._analyser = ctx.createAnalyser();
        this._analyser.fftSize = 256;
        this._analyser.smoothingTimeConstant = 0.8;
        this._freqData = null; // Reset

        this._source = ctx.createBufferSource();
        this._source.buffer = buffer;
        this._source.connect(this._analyser);
        this._analyser.connect(ctx.destination);

        // Schedule secondary (lip shape) viseme frames
        schedule.forEach(({ ch, delay }) => {
          const t = setTimeout(() => {
            const frame = getFrameForViseme(ch);
            // Zero out jawOpen (17) — we drive jaw from amplitude, not schedule
            frame[17] = 0;
            onSecondaryFrame(frame);
          }, delay);
          this._scheduleTimeouts.push(t);
        });

        this._source.onended = () => {
          this._analyser = null;
          this._source = null;
          this._freqData = null;
          this._clearSchedule();
          resolve();
        };

        console.log(`TTS: Playing ${durationMs.toFixed(0)}ms of audio`);
        this._source.start();

      } catch (err) {
        console.error('TTS: speak() error:', err);
        this._analyser = null;
        resolve();
      }
    });
  }

  _clearSchedule() {
    this._scheduleTimeouts.forEach(clearTimeout);
    this._scheduleTimeouts = [];
  }

  stop() {
    this._clearSchedule();
    if (this._source) {
      try { this._source.stop(); } catch (_) {}
      this._source = null;
    }
    this._analyser = null;
    this._freqData = null;
  }

  get isModelReady() { return this._modelReady; }
  get isModelLoading() { return this._modelLoading; }
}
