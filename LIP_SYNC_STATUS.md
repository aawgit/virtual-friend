# AI Friend Lip Sync - Progress & Status

This document summarizes the attempts and current state of the lip-sync animation feature for the `AiFriend` class. **Any AI agent resuming work on this project should read this document first.**

## Current Status
**Active Branch:** `feature/natural-lipsync-webspeech`

We have arrived at a zero-latency, smooth, heuristic-based lip-sync animation system using the browser's native Web Speech API. 

## The Journey & Architectural Decisions

### 1. The Real-Time Audio Buffer Challenge (Amplitude-based Sync)
We initially attempted to achieve perfect lip-sync by generating audio buffers and driving the `jawOpen` blendshape using a Web Audio `AnalyserNode` to read real-time amplitude. 
- **Implementation:** We integrated `kokoro-js` (an 82M parameter ONNX model running in WASM). To prevent main-thread freezing, we moved it to a Web Worker.
- **The Blocker:** While the sync was highly accurate, the audio generation time (3-8 seconds latency) was unacceptable for a real-time conversational agent.
- **Conclusion:** Unless we use a fast cloud-based streaming TTS service (like ElevenLabs) or a local fast Python server, client-side inference is too slow for real-time WebGL avatars.

### 2. The Final Architecture (Web Speech API + Oscillatory Jaw)
To achieve zero-latency responses, we reverted to the native Web Speech API and redesigned the animation logic to be heuristic rather than strictly phoneme-timed or amplitude-driven.

#### `tts.js`
- Uses Web Speech API.
- Exposes an `isSpeaking` boolean property.
- Schedules "secondary frames" (lip shapes excluding the jaw) over the estimated duration of the speech.
- Uses estimated phoneme timing (vowels hold longer, consonants quick) to dispatch these secondary shapes.

#### `aiFriend.js` (Animation Loop)
- **Jaw Movement (`jawOpen` / 17):** Instead of snapping per-character, `jawOpen` is driven by a smooth **4Hz Sine Oscillator** whenever `tts.isSpeaking` is true. This mimics the natural cadence of syllables.
- **Secondary Lip Shapes:** Driven by the scheduled events from `tts.js`. Blends are smoothly applied using linear interpolation (lerping).
- **Secondary Body Movements:** 
  - Suble absolute camera sway (using Sin/Cos to prevent drift).
  - Head/Neck bone rotation synchronized with the camera sway.
  - Automatic blinking every 3-5 seconds.
- **Decay/Smoothing:** Carefully tuned `lambda` values. The jaw snaps open/closed quickly, while lip shapes flow and blend smoothly into one another.

#### `visemeMapper.js`
- **The "O" Shape Bug:** Previous versions had heavily weighted `mouthFunnel` (19) and `mouthPucker` (20), causing the avatar to look like it was perpetually saying "O" because the shapes decayed slowly.
- **The Fix:** We drastically reduced funnel/pucker weights. Vowels are now differentiated using mouth corner stretching (`mouthStretchLeft/Right`) instead of funnelling, which looks much more natural. `jawOpen` is hardcoded to 0 in this file, as the oscillator in `aiFriend.js` controls it exclusively.

## Next Steps / Future Improvements
1. **Cloud TTS Integration:** If higher-quality, amplitude-synced voices are desired in the future with low latency, integrate a streaming TTS API (e.g., ElevenLabs, OpenAI TTS). The amplitude-reading logic from the `kokoro-js` attempt can be resurrected for this.
2. **Review & Refine:** The user needs to verify the fluid oscillatory animation style and the adjusted viseme weights on the `feature/natural-lipsync-webspeech` branch.
