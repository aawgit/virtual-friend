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

function applyBlendshapeFrame(frame) {
  morphMeshes.forEach(mesh => {
    const dict = mesh.morphTargetDictionary;
    const influences = mesh.morphTargetInfluences;
    Object.entries(dict).forEach(([name, index], i) => {
      if (i < frame.length) {
        influences[index] = frame[i];
      }
    });
  });
}

export async function playAnimation() {
  if (!animationData.length || isPlaying) return;
  isPlaying = true;

  for (let i = 0; i < animationData.length; i++) {
    applyBlendshapeFrame(animationData[i]);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  isPlaying = false;
}
