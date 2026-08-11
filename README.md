# 3D Avatar Blendshape Controller

A modern web application for synchronizing 3D avatar lip-sync animations with audio clips using ARKit-style blendshapes.

## Features

- **Precise Lip Sync**: Animation frames are synchronized with `AudioContext.currentTime` for perfect timing.
- **Modern UI**: Clean, responsive interface with glassmorphism and a dark theme.
- **Real-time Control**: Manual sliders to adjust every morph target influence on the fly.
- **Format Support**: Supports both GLTF/GLB and FBX models.
- **Visual Feedback**: Real-time progress bar during animation playback.

## Current Scope

The app currently focuses on playback of a 3D avatar driven by uploaded audio and uploaded ARKit-style blendshape JSON data. Conversational chat and browser TTS-driven animation experiments have been removed from the main app.

## Getting Started

### Prerequisites

You need a simple web server to serve the files due to CORS restrictions with local file access.

### Running Locally

1. Clone or download the project.
2. Start a local server (e.g., using Python):
   ```bash
   python3 -m http.server 8000
   ```
3. Open `http://localhost:8000` in your browser.

## Usage

1. **Load Model**: By default, an Asian business woman model is loaded. You can change this in `main.js`.
2. **Upload Audio**: Click "Audio File (.wav)" to upload your speech clip.
3. **Upload Blendshapes**: Click "Blendshapes (.json)" to upload the corresponding sequence.
4. **Play**: Click "Play Animation" to see and hear the synchronized playback.
5. **Adjust**: Use the sliders to manually tweak any facial expression.

## Blendshape JSON Format

The expected format is an array of frames, where each frame is an array of 52 values corresponding to ARKit blendshape indices.

```json
[
  [0, 0, 0, ...], // Frame 0 (52 values)
  [0.1, 0.05, 0, ...], // Frame 1
  ...
]
```

## Credits

- Avatar model by [Ready Player Me](https://readyplayer.me/), under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Based on the [ARKit Blendshapes Generator](https://github.com/hillday/arkit-blendshapes-generator) by hillday.

## License

MIT
