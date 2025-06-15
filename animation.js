import {blendshapeIndexMap, blendshapeIndexMap2} from './utils/indexMapper.js'
let animationData = [];
let delay = 100;
let morphMeshes = [];
let isPlaying = false;

export function setAnimationData(data, meshes) {
    animationData = data;
    morphMeshes = meshes;
}

export function setDelay(ms) {
    delay = ms;
}

const MOUTH_SCALE = 0.6; // 👈 adjust this value as needed

function applyBlendshapeFrame(frame) {
    morphMeshes.forEach(mesh => {
        const influences = mesh.morphTargetInfluences;

        frame.forEach((value, inputIndex) => {
            const modelIndex = blendshapeIndexMap2[inputIndex];
            if (modelIndex !== undefined && modelIndex < influences.length) {
                influences[modelIndex] = value;
            }
        });
    });
}

export function setDelayFromAudio(audioDuration, frameCount) {
    delay = audioDuration / frameCount * 1000; // in milliseconds
}

export async function playAnimation() {
    if (!animationData.length || isPlaying) return;
    isPlaying = true;

    for (let i = 0; i < animationData.length; i++) {
        applyBlendshapeFrame(animationData[i]);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    console.log("Set animation data:", animationData.length, "frames");
    isPlaying = false;
}
