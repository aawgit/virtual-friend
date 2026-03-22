import { TTS } from './tts.js';
import { getFrameForViseme } from './visemeMapper.js';
import { getMeshMapping } from './utils/indexMapper.js';

/**
 * AI Friend Coordinator
 * Manages the message loop, LLM interaction, and synchronization.
 */
export class AiFriend {
  constructor(viewer) {
    this.viewer = viewer;
    this.tts = new TTS();
    this.apiKey = localStorage.getItem('ai_friend_api_key') || '';
    this.isProcessing = false;
    
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

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      
      const deltaTime = 16.6; // Approx ms per frame at 60fps
      
      // 1. Automatic Blinking Logic
      this.blinkTimer += deltaTime;
      if (this.blinkTimer > 3000 + Math.random() * 2000) { // Blink every 3-5 seconds
        this.targetInfluences[0] = 1.0; // eyeBlinkLeft
        this.targetInfluences[7] = 1.0; // eyeBlinkRight
        this.blinkTimer = 0;
      }

      // 2. Subtle Camera/Head Sway (if talking)
      if (this.isProcessing) {
        this.swayTimer += 0.05;
        this.viewer.camera.position.x += Math.sin(this.swayTimer) * 0.0005;
        this.viewer.camera.position.y += Math.cos(this.swayTimer * 0.5) * 0.0005;
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
          
          // Smoother lambda: faster opening (0.6), slower closing (0.2)
          const lambda = target > current ? 0.6 : 0.2;
          influences[modelIndex] = current + (target - current) * lambda;
        }
      });

      // Gradually decay target influences back to zero
      // Slower decay (0.92 instead of 0.8) keeps the mouth open longer during fluid speech
      for (let i = 0; i < 52; i++) {
        this.targetInfluences[i] *= 0.92;
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

      const onViseme = (char) => {
        const frame = getFrameForViseme(char);
        // Set targets - the loop will handle transition and decay
        for (let i = 0; i < 52; i++) {
          if (frame[i] > 0) {
            this.targetInfluences[i] = frame[i];
          }
        }
      };

      await this.tts.speak(aiResponseText, onViseme);
      
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
