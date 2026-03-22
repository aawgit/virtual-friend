import { getMeshMapping } from './utils/indexMapper.js';
import { updateProgressBar } from './ui.js';

let meshMappings = new Map();

let animationData = [];
let morphMeshes = [];
let isPlaying = false;
let frameDelay = 100; // Expected delay between frames in ms

/**
 * Set the animation data and target meshes.
 * @param {Array} data - Array of blendshape frames.
 * @param {Array} meshes - Array of Three.js meshes with morph targets.
 */
export function setAnimationData(data, meshes) {
    animationData = data;
    morphMeshes = meshes;
    meshMappings.clear(); // Clear cache when mesh changes
}

/**
 * Set the delay between frames manually.
 * @param {number} ms - Delay in milliseconds.
 */
export function setDelay(ms) {
    frameDelay = ms;
}

/**
 * Apply a specific blendshape frame to all target meshes.
 * @param {Array} frame - Array of blendshape values for the current frame.
 */
function applyBlendshapeFrame(frame) {
    if (!frame) return;
    morphMeshes.forEach(mesh => {
        const influences = mesh.morphTargetInfluences;
        
        let mapping = meshMappings.get(mesh);
        if (!mapping) {
            mapping = getMeshMapping(mesh);
            meshMappings.set(mesh, mapping);
        }

        frame.forEach((value, inputIndex) => {
            const modelIndex = mapping[inputIndex];
            if (modelIndex !== undefined && modelIndex < influences.length) {
                influences[modelIndex] = value;
            }
        });
    });
}

/**
 * Play the animation synchronized with the provided AudioContext.
 * @param {AudioContext} audioContext - The AudioContext used for playback.
 * @returns {Promise<void>}
 */
export async function playAnimation(audioContext) {
    if (!animationData.length || isPlaying) return;
    isPlaying = true;

    const startTime = audioContext.currentTime;
    
    return new Promise((resolve) => {
        function animate() {
            if (!isPlaying) {
                updateProgressBar(100);
                resolve();
                return;
            }

            const elapsed = (audioContext.currentTime - startTime) * 1000; // in ms
            const frameIndex = Math.floor(elapsed / frameDelay);

            if (frameIndex < animationData.length) {
                applyBlendshapeFrame(animationData[frameIndex]);
                const progress = (frameIndex / animationData.length) * 10000 / 100; // to keep precision
                updateProgressBar(Math.min(100, (frameIndex / (animationData.length - 1)) * 100));
                requestAnimationFrame(animate);
            } else {
                isPlaying = false;
                updateProgressBar(100);
                console.log("Animation completed:", animationData.length, "frames");
                resolve();
            }
        }
        requestAnimationFrame(animate);
    });
}

/**
 * Stop the current animation.
 */
export function stopAnimation() {
    isPlaying = false;
}
