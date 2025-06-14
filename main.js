import * as THREE from 'https://esm.sh/three@0.160.0';
import { FBXLoader } from 'https://esm.sh/three@0.160.0/examples/jsm/loaders/FBXLoader.js';
import { createSlidersForMesh, createAnimationControls } from './ui.js';
import { playAnimation, setAnimationData, setDelay } from './animation.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0.5, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0x888888));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(1, 2, 3);
scene.add(dirLight);

const morphMeshes = [];
const sliderContainer = document.getElementById('sliderContainer');

const loader = new FBXLoader();
loader.load('./assets/Ally Face Head Model with hair.fbx', (fbx) => {
  fbx.scale.set(4, 4, 4);
  scene.add(fbx);

  fbx.traverse((child) => {
    if (child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
      morphMeshes.push(child);
      createSlidersForMesh(child, sliderContainer);
    }
  });

  if (morphMeshes.length === 0) {
    console.warn('No morph targets found in this model.');
  }
}, undefined, (err) => {
  console.error('Error loading FBX:', err);
});

createAnimationControls(sliderContainer, {
  onPlay: (data) => {
    setAnimationData(data, morphMeshes);
    playAnimation();
  },
  onDelayChange: setDelay
});

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
