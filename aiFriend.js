import { TTS } from './tts.js';
import { getMeshMapping } from './utils/indexMapper.js';

/**
 * AI Friend Coordinator
 * Manages the message loop, LLM interaction, and animation.
 *
 * Animation architecture:
 * - jawOpen (ARKit 17)   → driven by a smooth 4Hz oscillator while tts.isSpeaking
 * - all other shapes      → driven by pre-scheduled secondary phoneme frames from TTS
 * - blink                 → timer-based every 3–5 seconds
 * - head sway            → subtle bone rotation while speaking
 */
export class AiFriend {
  constructor(viewer) {
    this.viewer = viewer;
    this.tts = new TTS();
    this.apiKey = localStorage.getItem('ai_friend_api_key') || '';
    this.isProcessing = false;

    // Blendshape animation state
    this.targetInfluences = new Array(52).fill(0);
    this.animationId = null;
    this.meshMappings = new Map();

    // Secondary animation timers
    this.blinkTimer = 0;
    this.jawPhase = 0;       // Running phase for jaw oscillator (radians)
    this.jawFreq = 0.04;     // Phase increment per frame (~4Hz at 60fps)
  }

  setApiKey(key) {
    this.apiKey = key;
    localStorage.setItem('ai_friend_api_key', key);
  }

  // ─── Animation Loop ────────────────────────────────────────────────────────

  startAnimationLoop() {
    if (this.animationId) return;

    this.jawPhase = 0;
    this.blinkTimer = 0;

    // Store original camera position (to prevent drift)
    this.originalCameraPos = this.viewer.camera.position.clone();

    // Find head/neck bones for subtle secondary motion
    this.headBones = [];
    const seen = new Set();
    this.viewer.morphMeshes.forEach(mesh => {
      let root = mesh.parent;
      while (root && root.parent && root.type !== 'Scene') root = root.parent;
      if (root) {
        root.traverse(node => {
          if (!seen.has(node) && node.isBone &&
              (node.name.toLowerCase().includes('head') || node.name.toLowerCase().includes('neck'))) {
            node.originalRotation = node.rotation.clone();
            this.headBones.push(node);
            seen.add(node);
          }
        });
      }
    });

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      const speaking = this.tts.isSpeaking;

      // 1. Blink every 3–5 seconds
      this.blinkTimer += 16.6;
      if (this.blinkTimer > 3000 + Math.random() * 2000) {
        this.targetInfluences[0] = 1.0; // eyeBlinkLeft
        this.targetInfluences[7] = 1.0; // eyeBlinkRight
        this.blinkTimer = 0;
      }

      // 2. Camera micro-sway (absolute, no drift)
      const swayAmt = 0.0008;
      this.viewer.camera.position.x = this.originalCameraPos.x + Math.sin(this.jawPhase * 0.2) * swayAmt;
      this.viewer.camera.position.y = this.originalCameraPos.y + Math.cos(this.jawPhase * 0.1) * swayAmt;

      // 3. Head bone subtle rotation when speaking
      if (speaking) {
        const rotX = Math.sin(this.jawPhase * 0.3) * 0.015;
        const rotY = Math.cos(this.jawPhase * 0.5) * 0.015;
        this.headBones.forEach(b => {
          b.rotation.x = b.originalRotation.x + rotX;
          b.rotation.y = b.originalRotation.y + rotY;
        });
      }

      // 4. Jaw: smooth sin oscillator while speaking, else decay to close
      if (speaking) {
        this.jawPhase += this.jawFreq;
        // Oscillation: full open at peak, partial open at trough
        // Range: 0.15 (trough) to 0.55 (peak) — natural conversational range
        const osc = (Math.sin(this.jawPhase) + 1) / 2; // 0..1
        this.targetInfluences[17] = 0.15 + osc * 0.40;
      } else {
        // Let jaw decay naturally
        this.jawPhase = 0;
      }

      // 5. Apply all targets → morphTargetInfluences via lerp
      this.viewer.morphMeshes.forEach(mesh => {
        const influences = mesh.morphTargetInfluences;
        if (!influences) return;

        let mapping = this.meshMappings.get(mesh);
        if (!mapping) {
          mapping = getMeshMapping(mesh);
          this.meshMappings.set(mesh, mapping);
        }

        for (let i = 0; i < 52; i++) {
          const modelIndex = mapping[i];
          if (modelIndex === undefined) continue;

          const target = this.targetInfluences[i];
          const current = influences[modelIndex];

          // Jaw snaps quickly (lambda 0.7/0.4); other shapes blend slowly (0.4/0.12)
          const lambda = i === 17
            ? (target > current ? 0.70 : 0.40)
            : (target > current ? 0.40 : 0.12);
          influences[modelIndex] = current + (target - current) * lambda;
        }
      });

      // 6. Decay targets
      // Jaw: quick decay (0.80) so it closes between "syllables"
      // Other shapes: slower decay (0.88) for fluid lip shape transitions
      const decaying = !speaking;
      for (let i = 0; i < 52; i++) {
        const decay = i === 17 ? (speaking ? 1.0 : 0.80) : (decaying ? 0.88 : 0.94);
        this.targetInfluences[i] *= decay;
      }
    };

    animate();
  }

  stopAnimationLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.targetInfluences.fill(0);
  }

  // ─── Chat Flow ─────────────────────────────────────────────────────────────

  async chat(userMessage, onResponseText) {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.startAnimationLoop();

    try {
      const aiText = await this.getLLMResponse(userMessage);
      onResponseText(aiText);

      // Secondary frames: lip shapes other than jaw
      const onSecondaryFrame = (frame) => {
        for (let i = 0; i < 52; i++) {
          if (i === 17) continue; // Jaw handled by oscillator
          if (frame[i] > 0) this.targetInfluences[i] = frame[i];
        }
      };

      await this.tts.speak(aiText, onSecondaryFrame);

    } catch (err) {
      console.error('AiFriend chat error:', err);
    } finally {
      this.isProcessing = false;
      setTimeout(() => {
        if (!this.isProcessing) this.stopAnimationLoop();
      }, 1500);
    }
  }

  async getLLMResponse(message) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const responses = [
      "Hello! I am your AI friend. How can I help you today?",
      "That's interesting. Tell me more about that.",
      "I'm feeling great! It's such a beautiful day in the digital world.",
      "I can move my lips to the words I am saying. Isn't that cool?",
      "Let's chat more about your day!"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
}
