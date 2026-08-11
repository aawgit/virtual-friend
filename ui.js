/**
 * Create UI sliders for each morph target in a mesh.
 * @param {THREE.Mesh} mesh - The mesh containing morph targets.
 * @param {HTMLElement} container - The container to append the sliders to.
 */
export function createSlidersForMesh(mesh, container) {
  // Ensure a dedicated sub-container for manual controls exists
  let controlsContainer = container.querySelector('#manualControlsContainer');
  if (!controlsContainer) {
    controlsContainer = document.createElement('div');
    controlsContainer.id = 'manualControlsContainer';
    controlsContainer.className = 'manual-controls-container hidden';
    
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'Show Manual Controls';
    toggleBtn.className = 'btn btn-secondary';
    toggleBtn.style.marginBottom = '16px';
    toggleBtn.onclick = () => {
      const isHidden = controlsContainer.classList.toggle('hidden');
      toggleBtn.textContent = isHidden ? 'Show Manual Controls' : 'Hide Manual Controls';
    };
    container.prepend(toggleBtn); // Put toggle at the top
    container.appendChild(controlsContainer);
  }

  const groupDiv = document.createElement('div');
  groupDiv.className = 'mesh-group';

  const title = document.createElement('h3');
  title.innerText = mesh.name || 'Unnamed Mesh';
  groupDiv.appendChild(title);

  const dict = mesh.morphTargetDictionary;
  const influences = mesh.morphTargetInfluences;

  if (!dict) return;

  Object.entries(dict).forEach(([name, index]) => {
    const sliderGroup = document.createElement('div');
    sliderGroup.className = 'slider-group';

    const label = document.createElement('label');
    const nameSpan = document.createElement('span');
    nameSpan.textContent = name;
    const valueSpan = document.createElement('span');
    valueSpan.textContent = (influences[index] || 0).toFixed(2);
    
    label.appendChild(nameSpan);
    label.appendChild(valueSpan);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0;
    slider.max = 1;
    slider.step = 0.01;
    slider.value = influences[index] || 0;

    slider.oninput = () => {
      const val = parseFloat(slider.value);
      influences[index] = val;
      valueSpan.textContent = val.toFixed(2);
    };

    sliderGroup.appendChild(label);
    sliderGroup.appendChild(slider);
    groupDiv.appendChild(sliderGroup);
  });

  controlsContainer.appendChild(groupDiv);
}

/**
 * Create animation controls (Play button, progress bar, etc.).
 * @param {HTMLElement} container - The container to append the controls to.
 * @param {Object} options - Callbacks for play and delay changes.
 */
export function createAnimationControls(container, { onPlay, onDelayChange }) {
  const controlsDiv = document.createElement('div');
  controlsDiv.className = 'controls-panel';

  const playBtn = document.createElement('button');
  playBtn.textContent = 'Play Animation';
  playBtn.className = 'btn';
  playBtn.onclick = () => onPlay();
  controlsDiv.appendChild(playBtn);

  const progressContainer = document.createElement('div');
  progressContainer.className = 'progress-container';
  progressContainer.id = 'progressContainer';
  const progressBar = document.createElement('div');
  progressBar.className = 'progress-bar';
  progressBar.id = 'progressBar';
  progressContainer.appendChild(progressBar);
  controlsDiv.appendChild(progressContainer);

  container.appendChild(controlsDiv);
}

/**
 * Create file input fields for audio and blendshapes.
 * @param {HTMLElement} container - The container to append the inputs to.
 * @param {Object} callbacks - Callbacks for file loading.
 */
export function createFileInputs(container, callbacks) {
  const { onAudioLoad, onBlendshapeLoad } = callbacks;

  const wrapper = document.createElement('div');
  wrapper.className = 'file-input-wrapper';

  const audioGroup = document.createElement('div');
  audioGroup.className = 'file-input-group';
  const audioLabel = document.createElement('label');
  audioLabel.textContent = 'Audio File (.wav)';
  const audioInput = document.createElement('input');
  audioInput.type = 'file';
  audioInput.accept = '.wav';
  audioInput.onchange = () => {
    const file = audioInput.files[0];
    if (file) onAudioLoad(file);
  };
  audioGroup.appendChild(audioLabel);
  audioGroup.appendChild(audioInput);

  const blendGroup = document.createElement('div');
  blendGroup.className = 'file-input-group';
  const blendLabel = document.createElement('label');
  blendLabel.textContent = 'Blendshapes (.json)';
  const blendInput = document.createElement('input');
  blendInput.type = 'file';
  blendInput.accept = '.json';
  blendInput.onchange = () => {
    const file = blendInput.files[0];
    if (file) onBlendshapeLoad(file);
  };
  blendGroup.appendChild(blendLabel);
  blendGroup.appendChild(blendInput);

  wrapper.appendChild(audioGroup);
  wrapper.appendChild(blendGroup);
  container.appendChild(wrapper);
}

/**
 * Update the progress bar during animation.
 * @param {number} percent - The current progress percentage (0-100).
 */
export function updateProgressBar(percent) {
  const container = document.getElementById('progressContainer');
  const bar = document.getElementById('progressBar');
  if (container && bar) {
    container.style.display = 'block';
    bar.style.width = `${percent}%`;
    if (percent >= 100) {
      setTimeout(() => {
        container.style.display = 'none';
        bar.style.width = '0%';
      }, 500);
    }
  }
}