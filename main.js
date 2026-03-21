import * as THREE from 'https://esm.sh/three@0.160.0';
import { FBXLoader } from 'https://esm.sh/three@0.160.0/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { createSlidersForMesh, createAnimationControls, createFileInputs } from './ui.js';
import { playAnimation, setAnimationData, setDelay } from './animation.js';

/**
 * Main application class to manage the 3D scene and model interactions.
 */
class Viewer {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 1.6, 0.6);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);

    this.initLights();
    this.morphMeshes = [];
    this.audioBuffer = null;
    this.audioContext = null;
    this.blendshapeFrames = [];

    this.container = document.getElementById('sliderContainer');

    window.addEventListener('resize', () => this.onWindowResize());
    this.animate();
  }

  /**
   * Initialize scene lighting.
   */
  initLights() {
    this.scene.add(new THREE.AmbientLight(0x888888));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(1, 2, 3);
    this.scene.add(dirLight);
  }

  /**
   * Handle window resize events.
   */
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Load a 3D model (FBX or GLTF/GLB).
   * @param {string} url - The URL of the model file.
   */
  async loadModel(url) {
    const ext = url.split('.').pop().toLowerCase();
    let loader;

    if (ext === 'fbx') {
      loader = new FBXLoader();
    } else if (ext === 'gltf' || ext === 'glb') {
      loader = new GLTFLoader();
    } else {
      console.error(`Unsupported model format: ${ext}`);
      return;
    }

    try {
      const model = await new Promise((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
      });

      const root = model.scene || model;
      this.scene.add(root);

      this.morphMeshes = [];
      this.container.innerHTML = ''; // Clear previous UI

      root.traverse((child) => {
        if (child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
          this.morphMeshes.push(child);
          createSlidersForMesh(child, this.container);
        }
      });

      if (this.morphMeshes.length === 0) {
        console.warn('No morph targets found in this model.');
      } else {
        // Re-initialize controls
        this.initControls();
      }
    } catch (err) {
      console.error(`Error loading ${ext.toUpperCase()} model:`, err);
    }
  }

  /**
   * Initialize UI controls for animation and file inputs.
   */
  initControls() {
    createAnimationControls(this.container, {
      onPlay: () => this.handlePlay(),
      onDelayChange: (val) => setDelay(val)
    });

    createFileInputs(this.container, {
      onAudioLoad: async (file) => this.handleAudioLoad(file),
      onBlendshapeLoad: async (file) => this.handleBlendshapeLoad(file)
    });
  }

  /**
   * Handle audio file loading.
   */
  async handleAudioLoad(file) {
    if (!this.audioContext) this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    this.computeFrameDelay();
  }

  /**
   * Handle blendshape JSON file loading.
   */
  async handleBlendshapeLoad(file) {
    const text = await file.text();
    try {
      this.blendshapeFrames = JSON.parse(text);
      this.computeFrameDelay();
    } catch (e) {
      alert('Invalid blendshape JSON.');
      console.error(e);
    }
  }

  /**
   * Compute the delay between frames based on audio duration and frame count.
   */
  computeFrameDelay() {
    if (this.audioBuffer && this.blendshapeFrames.length) {
      const duration = this.audioBuffer.duration;
      const frameCount = this.blendshapeFrames.length;
      const computedDelay = (duration / frameCount) * 1000;
      setDelay(computedDelay);
      setAnimationData(this.blendshapeFrames, this.morphMeshes);
      console.log(`Auto-calculated frame delay: ${computedDelay.toFixed(1)} ms`);
    }
  }

  /**
   * Handle the "Play" button click.
   */
  handlePlay() {
    if (this.blendshapeFrames.length && this.audioBuffer) {
      if (!this.audioContext) this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.playAudio();
      setAnimationData(this.blendshapeFrames, this.morphMeshes);
      playAnimation(this.audioContext);
    } else {
      alert("Please load both the audio and blendshape files.");
    }
  }

  /**
   * Play the loaded audio buffer.
   */
  playAudio() {
    if (!this.audioContext || !this.audioBuffer) return;
    const source = this.audioContext.createBufferSource();
    source.buffer = this.audioBuffer;
    source.connect(this.audioContext.destination);
    source.start();
  }

  /**
   * Main animation loop for Three.js rendering.
   */
  animate() {
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize the viewer
const viewer = new Viewer();
viewer.loadModel('./assets/Asian_business_woman_ARKit.glb');

