import { TTS } from './tts.js';
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
      
      const deltaTime = 16.6; // Approx ms per frame at 60fps
      
      // 1. Automatic Blinking Logic
      this.blinkTimer += deltaTime;
      if (this.blinkTimer > 3000 + Math.random() * 2000) { // Blink every 3-5 seconds
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

      // 4. Dynamic Decay
      // While speaking, use a much slower decay (0.98) to avoid "robotic" snaps
      const decayFactor = this.isProcessing ? 0.98 : 0.92;
      for (let i = 0; i < 52; i++) {
        this.targetInfluences[i] *= decayFactor;
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

      // onVisemeFrame receives a full pre-computed blendshape frame array.
      // tts.js schedules these ahead of time for smooth co-articulation.
      const onVisemeFrame = (frame) => {
        for (let i = 0; i < 52; i++) {
          // Replace entire target, not just non-zero values, so silent frames close the mouth
          this.targetInfluences[i] = frame[i];
        }
      };

      await this.tts.speak(aiResponseText, onVisemeFrame);
      
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
