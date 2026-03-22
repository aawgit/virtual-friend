import { getFrameForViseme } from './visemeMapper.js';

/**
 * Build a secondary phoneme schedule (mouth shape only, not jaw) for a given duration.
 * Vowels are held longer; consonants and spaces are brief.
 */
function buildPhonemeSchedule(text, durationMs) {
  const chars = Array.from(text);
  const weights = chars.map(ch => {
    const k = ch.toUpperCase();
    if (/\s/.test(k)) return 0.3;
    if (/[AEIOU]/.test(k)) return 1.6;
    if (/[MBP]/.test(k)) return 0.7;
    return 1.0;
  });
  const total = weights.reduce((s, w) => s + w, 0);
  const schedule = [];
  let cursor = 0;
  chars.forEach((ch, i) => {
    const hold = (weights[i] / total) * durationMs;
    schedule.push({ ch, delay: Math.round(cursor) });
    cursor += hold;
  });
  return schedule;
}

/**
 * TTS class — uses a Web Worker running Kokoro (ONNX WASM).
 * The main thread stays responsive during model loading and audio generation.
 */
export class TTS {
  constructor() {
    this._worker = null;
    this._audioCtx = null;
    this._analyser = null;
    this._source = null;
    this._freqData = null;
    this._scheduleTimeouts = [];
    this._pendingRequest = null;
    this._workerReady = false;
    this.onModelProgress = null;
    this._initWorker();
  }

  _initWorker() {
    // Module workers allow ESM imports inside the worker
    this._worker = new Worker('./tts-worker.js', { type: 'module' });
    this._worker.onmessage = (e) => this._handleWorkerMessage(e.data);
    this._worker.onerror = (err) => {
      console.error('TTS Worker error:', err);
      if (this._pendingRequest) {
        this._pendingRequest.reject(new Error('Worker error'));
        this._pendingRequest = null;
      }
    };
  }

  _handleWorkerMessage(msg) {
    switch (msg.type) {
      case 'progress':
        if (this.onModelProgress) this.onModelProgress(msg.progress);
        break;
      case 'ready':
        this._workerReady = true;
        console.log('TTS: Kokoro worker ready.');
        break;
      case 'result':
        if (this._pendingRequest && this._pendingRequest.id === msg.requestId) {
          this._pendingRequest.resolve({ samples: msg.samples, sampleRate: msg.sampleRate });
          this._pendingRequest = null;
        }
        break;
      case 'error':
        if (this._pendingRequest && this._pendingRequest.id === msg.requestId) {
          this._pendingRequest.reject(new Error(msg.message));
          this._pendingRequest = null;
        }
        break;
    }
  }

  _getAudioCtx() {
    if (!this._audioCtx || this._audioCtx.state === 'closed') {
      this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this._audioCtx;
  }

  /**
   * Returns the current speech amplitude (0–1) to drive jaw animation.
   * Called every frame by the animation loop.
   */
  getAmplitude() {
    if (!this._analyser) return 0;
    if (!this._freqData) this._freqData = new Uint8Array(this._analyser.frequencyBinCount);
    this._analyser.getByteFrequencyData(this._freqData);
    // Speech frequency range ~100–4000 Hz, fftSize=256, sampleRate=24000 → 93.75 Hz/bin
    let sum = 0;
    for (let i = 1; i < 43; i++) sum += this._freqData[i];
    return sum / (42 * 255);
  }

  /**
   * Send text to the Worker, receive AudioBuffer, play through AnalyserNode.
   * Secondary phoneme shapes fire on a schedule derived from audio duration.
   *
   * @param {string} text
   * @param {Function} onSecondaryFrame - (frame: number[]) => void, for lip shapes (jaw excluded)
   */
  speak(text, onSecondaryFrame) {
    return new Promise((resolve) => {
      this.stop();

      const requestId = Date.now().toString();

      // Promise that the Worker resolves with audio data
      const audioDataPromise = new Promise((res, rej) => {
        this._pendingRequest = { id: requestId, resolve: res, reject: rej };
      });

      this._worker.postMessage({ type: 'generate', text, voice: 'af_bella', requestId });

      audioDataPromise.then(async ({ samples, sampleRate }) => {
        const durationMs = (samples.length / sampleRate) * 1000;

        // Set up Web Audio pipeline
        const ctx = this._getAudioCtx();
        if (ctx.state === 'suspended') await ctx.resume();

        const buffer = ctx.createBuffer(1, samples.length, sampleRate);
        buffer.copyToChannel(samples, 0);

        this._analyser = ctx.createAnalyser();
        this._analyser.fftSize = 256;
        this._analyser.smoothingTimeConstant = 0.85; // Smooth amplitude
        this._freqData = null;

        this._source = ctx.createBufferSource();
        this._source.buffer = buffer;
        this._source.connect(this._analyser);
        this._analyser.connect(ctx.destination);

        // Schedule secondary (lip shape only) frames
        const schedule = buildPhonemeSchedule(text, durationMs);
        schedule.forEach(({ ch, delay }) => {
          const t = setTimeout(() => {
            const frame = getFrameForViseme(ch);
            frame[17] = 0; // Zero jaw — driven by amplitude in animation loop
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

        console.log(`TTS: Playing ${(durationMs / 1000).toFixed(1)}s of audio`);
        this._source.start();

      }).catch(err => {
        console.error('TTS: Audio generation failed:', err);
        resolve();
      });
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
    if (this._pendingRequest) {
      this._pendingRequest.reject(new Error('Stopped'));
      this._pendingRequest = null;
    }
    this._analyser = null;
    this._freqData = null;
  }
}
