export function createSlidersForMesh(mesh, container) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'mesh-group';
  
    const title = document.createElement('h3');
    title.innerText = mesh.name || 'Unnamed Mesh';
    groupDiv.appendChild(title);
  
    const dict = mesh.morphTargetDictionary;
    const influences = mesh.morphTargetInfluences;
  
    Object.entries(dict).forEach(([name, index]) => {
      const sliderGroup = document.createElement('div');
      sliderGroup.className = 'slider-group';
  
      const label = document.createElement('label');
      label.textContent = `${name} ${index}`;
  
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = 0;
      slider.max = 1;
      slider.step = 0.01;
      slider.value = influences[index] || 0;
  
      slider.oninput = () => {
        influences[index] = parseFloat(slider.value);
      };
  
      sliderGroup.appendChild(label);
      sliderGroup.appendChild(slider);
      groupDiv.appendChild(sliderGroup);
    });
    console.log(dict)
  
    container.appendChild(groupDiv);
  }
  
  export function createAnimationControls(container, { onPlay, onDelayChange }) {
    const controlsDiv = document.createElement('div');
    controlsDiv.style.marginTop = '1em';
  
    const input = document.createElement('textarea');
    input.placeholder = 'Paste JSON blendshape sequence here';
    input.rows = 6;
    input.cols = 40;
    input.style.width = '100%';
    controlsDiv.appendChild(input);
  
    const delayLabel = document.createElement('label');
    delayLabel.textContent = 'Frame Delay (ms): ';
    delayLabel.style.display = 'block';
    delayLabel.style.marginTop = '0.5em';
  
    const delayInput = document.createElement('input');
    delayInput.type = 'number';
    delayInput.value = 100;
    delayInput.min = 10;
    delayInput.style.width = '60px';
    delayInput.oninput = () => {
      onDelayChange(parseInt(delayInput.value));
    };
    delayLabel.appendChild(delayInput);
    controlsDiv.appendChild(delayLabel);
  
    const playBtn = document.createElement('button');
    playBtn.textContent = 'Play Animation';
    playBtn.style.marginTop = '0.5em';
    playBtn.onclick = () => {
        onPlay();
      };
    controlsDiv.appendChild(playBtn);
  
    container.appendChild(controlsDiv);
  }
  
  export function createFileInputs(container, callbacks) {
    const { onAudioLoad, onBlendshapeLoad } = callbacks;
  
    const audioLabel = document.createElement('label');
    audioLabel.textContent = 'Audio (.wav): ';
    const audioInput = document.createElement('input');
    audioInput.type = 'file';
    audioInput.accept = '.wav';
    audioInput.onchange = () => {
      const file = audioInput.files[0];
      if (file) onAudioLoad(file);
    };
    audioLabel.appendChild(audioInput);
  
    const blendLabel = document.createElement('label');
    blendLabel.textContent = 'Blendshapes (.bs.json): ';
    blendLabel.style.display = 'block';
    blendLabel.style.marginTop = '0.5em';
    const blendInput = document.createElement('input');
    blendInput.type = 'file';
    blendInput.accept = '.json,.bs.json';
    blendInput.onchange = () => {
      const file = blendInput.files[0];
      if (file) onBlendshapeLoad(file);
    };
    blendLabel.appendChild(blendInput);
  
    container.appendChild(audioLabel);
    container.appendChild(blendLabel);
  }
  