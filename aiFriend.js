import { TTS } from './tts.js';
import { getMeshMapping } from './utils/indexMapper.js';
import { setTtsStatus } from './ui.js';

/**
 * AI Friend Coordinator
 * Manages the message loop, LLM interaction, and synchronization.
 */
export class AiFriend {
  constructor(viewer) {
    this.viewer = viewer;
    this.tts = new TTS();
    this.tts.onModelProgress = (p) => {
      if (p.status === 'progress') {
        const pct = p.progress ? p.progress.toFixed(0) : '...';
        setTtsStatus(`Loading voice model: ${pct}% (${p.file || ''})`);
      } else if (p.status === 'done') {
        setTtsStatus(null);
      }
    };
    this.apiKey = localStorage.getItem('ai_friend_api_key') || '';
    this.isProcessing = false;
    this.isGenerating = false;
    
    // Animation state
    this.targetInfluences = new Array(52).fill(0);
    this.animationId = null;
    this.meshMappings = new Map(); // Cache for mesh mapping
  }

  setApiKey(key) {
    this.apiKey = key;
    localStorage.setItem('ai_friend_api_key', key);
  }

  /**
   * Start the smoothing/decay loop.
   */
  startAnimationLoop() {
    if (this.animationId) return;

    this.blinkTimer = 0;
    this.swayTimer = 0;
    
    // Store original camera position to avoid drift
    this.originalCameraPos = this.viewer.camera.position.clone();
    
    // Find head/neck bones for secondary movement
    this.headBones = [];
    this.viewer.morphMeshes.forEach(mesh => {
      // Find the root of the model
      let root = mesh.parent;
      while (root && root.parent && root.type !== 'Scene') root = root.parent;
      
      if (root) {
        root.traverse(node => {
          if (node.isBone && (node.name.toLowerCase().includes('head') || node.name.toLowerCase().includes('neck'))) {
            if (!this.headBones.includes(node)) {
              node.originalRotation = node.rotation.clone();
              this.headBones.push(node);
            }
          }
        });
      }
    });

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      
      const deltaTime = 16.6;
      
      // 1. Automatic Blinking Logic
      this.blinkTimer += deltaTime;
      if (this.blinkTimer > 3000 + Math.random() * 2000) {
        this.targetInfluences[0] = 1.0; // eyeBlinkLeft
        this.targetInfluences[7] = 1.0; // eyeBlinkRight
        this.blinkTimer = 0;
      }

      // 2. Subtle Camera Sway (Oscillation, not drift)
      this.swayTimer += 0.04; 
      const swayIntensity = 0.001; 
      this.viewer.camera.position.x = this.originalCameraPos.x + Math.sin(this.swayTimer) * swayIntensity;
      this.viewer.camera.position.y = this.originalCameraPos.y + Math.cos(this.swayTimer * 0.5) * swayIntensity;

      // 3. Subtle Head/Neck Rotation
      if (this.isProcessing) {
        const rotX = Math.sin(this.swayTimer * 0.5) * 0.02;
        const rotY = Math.cos(this.swayTimer) * 0.02;
        this.headBones.forEach(bone => {
          bone.rotation.x = bone.originalRotation.x + rotX;
          bone.rotation.y = bone.originalRotation.y + rotY;
        });
      }

      // 4. Jaw animation — amplitude-based when audio is playing, oscillatory fallback otherwise
      const amplitude = this.tts.getAmplitude();
      if (amplitude > 0.01) {
        // Real audio amplitude drives jaw, scaled to natural range
        // 1.8x scale: typical amplitude ~0.3–0.5 → jawOpen 0.5–0.9
        this.targetInfluences[17] = Math.min(0.9, amplitude * 1.8);
      } else if (this.isGenerating || this.isProcessing) {
        // Gentle oscillatory jaw while waiting for audio
        this.targetInfluences[17] = ((Math.sin(this.swayTimer * 4) + 1) / 2) * 0.2;
      }

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
          
          // Jaw (17): faster response to audio; other shapes: slower for flow
          const lambda = i === 17
            ? (target > current ? 0.8 : 0.4)
            : (target > current ? 0.5 : 0.15);
          influences[modelIndex] = current + (target - current) * lambda;
        }
      });

      // Decay: jaw decays quickly after sound stops; other shapes linger
      const isActive = this.isProcessing || amplitude > 0.01;
      for (let i = 0; i < 52; i++) {
        const decay = (i === 17) ? 0.85 : (isActive ? 0.97 : 0.92);
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
    // Final reset
    this.targetInfluences.fill(0);
  }

  /**
   * Main chat loop: User message -> LLM -> TTS/LipSync
   */
  async chat(userMessage, onResponseText) {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    // Ensure animation loop is running
    this.startAnimationLoop();

    try {
      const aiResponseText = await this.getLLMResponse(userMessage);
      onResponseText(aiResponseText);

      // onSecondaryFrame receives pre-scheduled lip shapes (jaw excluded)
      // Amplitude-based jaw is handled directly in the animation loop
      const onSecondaryFrame = (frame) => {
        for (let i = 0; i < 52; i++) {
          if (i === 17) continue; // Skip jaw — driven by amplitude
          if (frame[i] > 0) this.targetInfluences[i] = frame[i];
        }
      };

      this.isGenerating = true;
      await this.tts.speak(aiResponseText, onSecondaryFrame);
      this.isGenerating = false;
      
    } catch (error) {
      console.error('AI Friend chat error:', error);
    } finally {
      this.isProcessing = false;
      // Let the decay happen naturally. 
      // We don't stop the loop immediately to avoid race conditions with next messages.
      // The loop will consume minimal resources when targetInfluences are near zero.
      setTimeout(() => {
        if (!this.isProcessing) {
          this.stopAnimationLoop();
        }
      }, 2000);
    }
  }

  async getLLMResponse(message) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const responses = [
      "Hello! I am your AI friend. How can I help you today?",
      "That's interesting. Tell me more about that.",
      "I'm feeling great! It's such a beautiful day in the digital world.",
      "I can move my lips to the words I'm saying. Isn't that cool?",
      "Let's chat more about your day!"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
}
