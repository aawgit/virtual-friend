/**
 * TTS Web Worker — runs Kokoro model off the main thread.
 * Receives: { type: 'generate', text, voice, requestId }
 * Sends:    { type: 'progress', ...progress }
 *           { type: 'ready' }
 *           { type: 'result', requestId, samples, sampleRate }
 *           { type: 'error', requestId, message }
 */

let tts = null;
let loading = false;

async function ensureModel() {
  if (tts) return;
  if (loading) {
    await new Promise(resolve => {
      const interval = setInterval(() => { if (tts) { clearInterval(interval); resolve(); } }, 100);
    });
    return;
  }
  loading = true;

  const { KokoroTTS } = await import('https://esm.sh/kokoro-js@1.2.1');
  tts = await KokoroTTS.from_pretrained(
    'onnx-community/Kokoro-82M-v1.0-ONNX',
    {
      dtype: 'q4',  // Fastest quantization
      progress_callback: (p) => self.postMessage({ type: 'progress', progress: p })
    }
  );

  loading = false;
  self.postMessage({ type: 'ready' });
}

self.addEventListener('message', async (event) => {
  const { type, text, voice, requestId } = event.data;
  if (type !== 'generate') return;

  try {
    await ensureModel();
    const output = await tts.generate(text, { voice: voice || 'af_bella' });
    const samples = output.audio;
    const sampleRate = output.sampling_rate;

    // Transfer ownership of the buffer to avoid copying
    self.postMessage(
      { type: 'result', requestId, samples, sampleRate },
      [samples.buffer]
    );
  } catch (err) {
    self.postMessage({ type: 'error', requestId, message: err.message });
  }
});
