import * as THREE from 'https://esm.sh/three@0.160.0';
import { FBXLoader } from 'https://esm.sh/three@0.160.0/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { createSlidersForMesh, createAnimationControls } from './ui.js';
import { playAnimation, setAnimationData, setDelay } from './animation.js';
import { createFileInputs } from './ui.js';



const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 0.6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0x888888));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(1, 2, 3);
scene.add(dirLight);

const morphMeshes = [];
const sliderContainer = document.getElementById('sliderContainer');

let audioBuffer = null;
let audioContext = null;
let blendshapeFrames = [];
let computedDelay = 100;
// const container = document.getElementById('sliderContainer');

function loadModel(url) {
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

  loader.load(url, (model) => {
    let root;
    if (model.scene) {
      // GLTF
      root = model.scene;
    } else {
      // FBX
      root = model;
    }
    // root.rotation.y += Math.PI
    scene.add(root);

    root.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
        morphMeshes.push(child);
        createSlidersForMesh(child, sliderContainer);
      }
    });

    if (morphMeshes.length === 0) {
      console.warn('No morph targets found in this model.');
    }

  }, undefined, (err) => {
    console.error(`Error loading ${ext.toUpperCase()} model:`, err);
  });
}

// loader.load('./assets/raccoon_head.fbx', (fbx) => {
//   // fbx.scale.set(0.04, 0.04, 0.04);
//   scene.add(fbx);

//   fbx.traverse((child) => {
//     if (child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
//       morphMeshes.push(child);
//       createSlidersForMesh(child, sliderContainer);
//     }
//   });

//   if (morphMeshes.length === 0) {
//     console.warn('No morph targets found in this model.');
//   }
// }, undefined, (err) => {
//   console.error('Error loading FBX:', err);
// });

loadModel('./assets/Asian_business_woman_ARKit.glb');

createAnimationControls(sliderContainer, {
    onPlay: () => {
      if (blendshapeFrames.length && audioBuffer) {
        playAudio();
        setAnimationData(blendshapeFrames, morphMeshes); // Pass actual data
        playAnimation(); // <-- Add this if not already called inside setAnimationData
      } else {
        alert("Please load both the audio and blendshape files.");
      }
    }
  });
  

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();


createFileInputs(sliderContainer, {
  onAudioLoad: async (file) => {
    audioContext = new AudioContext();
    const arrayBuffer = await file.arrayBuffer();
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    computeFrameDelay();
  },
  onBlendshapeLoad: async (file) => {
    const text = await file.text();
    try {
      blendshapeFrames = JSON.parse(text);
      console.log(blendshapeFrames)
      computeFrameDelay();
    } catch (e) {
      alert('Invalid blendshape JSON.');
      console.error(e);
    }
  }
});

function computeFrameDelay() {
  if (audioBuffer && blendshapeFrames.length) {
    const duration = audioBuffer.duration; // in seconds
    const frameCount = blendshapeFrames.length;
    computedDelay = (duration / frameCount) * 1000;
    setDelay(computedDelay);
    setAnimationData(blendshapeFrames, morphMeshes);
    console.log(`Auto-calculated frame delay: ${computedDelay.toFixed(1)} ms`);
  }
}

function playAudio() {
  if (!audioContext || !audioBuffer) return;
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start();
}

