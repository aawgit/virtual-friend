import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { blendshapeNameMap, arkitBlendshapeOrder } from '../utils/constants';

const ThreeJSViewer = ({
  blendshapeValues,
  modelScale,
  modelRotation,
  onMeshesLoaded
}) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const requestRef = useRef(null);

  useEffect(() => {
    // Initialize Three.js scene
    if (!containerRef.current) return;

    // Clean up existing renderer if it exists
    if (rendererRef.current) {
      if (containerRef.current.contains(rendererRef.current.domElement)) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current.dispose();
      rendererRef.current = null;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting - brighter setup
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, 2, 2);
    scene.add(dirLight);

    // Add helper light from the other side
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.set(-2, 1, 1);
    scene.add(dirLight2);


    // Load model
    loadModel();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      cameraRef.current.aspect = rect.width / rect.height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(rect.width, rect.height);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // Animation loop
    const animate = () => {
      if (sceneRef.current && cameraRef.current && rendererRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestRef.current);
      if (containerRef.current && rendererRef.current && rendererRef.current.domElement) {
        if (containerRef.current.contains(rendererRef.current.domElement)) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, []);

  // Apply scale when it changes
  useEffect(() => {
    if (sceneRef.current && typeof modelScale === 'number') {
      sceneRef.current.children.forEach(child => {
        if (child.type === 'Group' || child.isMesh) {
          child.scale.set(modelScale, modelScale, modelScale);
        }
      });
    }
  }, [modelScale]);

  // Apply rotation when it changes
  useEffect(() => {
    if (sceneRef.current && typeof modelRotation === 'number') {
      sceneRef.current.children.forEach(child => {
        if (child.type === 'Group' || child.isMesh) {
          child.rotation.y = modelRotation;
        }
      });
    }
  }, [modelRotation]);

  // Apply blendshape values when they change
  useEffect(() => {
    if (!blendshapeValues) return;
    console.log('Applying blendshape values:', blendshapeValues);

    if (sceneRef.current) {
      // Find all morphable meshes
      const morphMeshes = [];
      sceneRef.current.traverse((child) => {
        if (child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
          morphMeshes.push(child);
        }
      });

      console.log('Found morphMeshes for applying values:', morphMeshes.length);

      // Process each morph mesh
      morphMeshes.forEach(mesh => {
        const dict = mesh.morphTargetDictionary || {};
        const influences = mesh.morphTargetInfluences || [];

        console.log('Processing mesh with morphTargets:', mesh.name);
        console.log('Morph dictionary:', Object.keys(dict));
        console.log('Morph influences length:', influences.length);

        // Create reverse lookup: ARKit name -> modelName
        const modelNameByArkit = {};
        for (const [modelName, index] of Object.entries(dict)) {
          const arkitName = blendshapeNameMap[modelName];
          if (arkitName) {
            modelNameByArkit[arkitName] = { modelName, index };
            console.log(`Mapped "${modelName}" to ARKit "${arkitName}" at index ${index}`);
          } else {
            console.log(`No ARKit mapping found for "${modelName}"`);
          }
        }

        console.log('ARKit to model name mapping:', modelNameByArkit);

        // Apply blendshape values in ARKit order
        let appliedCount = 0;
        arkitBlendshapeOrder.forEach((arkitName, i) => {
          const mapping = modelNameByArkit[arkitName];
          if (mapping && blendshapeValues[i] !== undefined) {
            const value = Math.max(0, Math.min(1, blendshapeValues[i]));
            influences[mapping.index] = value;
            if (value > 0.01) {
              console.log(`Applied "${arkitName}" with value ${value} to index ${mapping.index} (${mapping.modelName})`);
              appliedCount++;
            }
          }
        });

        console.log(`Applied ${appliedCount} blendshape values with significant effect`);

      });
    }
  }, [blendshapeValues]);

  const loadModel = () => {
    if (!sceneRef.current) return;
    console.log('Loading model...');

    const loader = new FBXLoader();
    // Try with the correct path to the assets in a Vite project
    loader.load('/assets/Ally Face Head Model with hair.fbx', (fbx) => {
      console.log('Model loaded successfully');
      console.log('Model bounding box:', new THREE.Box3().setFromObject(fbx));
      console.log('Model position:', fbx.position);
      console.log('Model scale:', fbx.scale);
      console.log('Model rotation:', fbx.rotation);
      console.log('Model visible:', fbx.visible);
      console.log('Model children count:', fbx.children.length);

      // Center the model
      const box = new THREE.Box3().setFromObject(fbx);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      console.log('Model center:', center);
      console.log('Model size:', size);

      // Center the model at origin
      fbx.position.sub(center);

      // Scale to fit view properly
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = maxDim > 0 ? 1.0 / maxDim : 1;
      fbx.scale.setScalar(scale * 1.5);

      console.log('Applied scale:', scale * 1.5);
      console.log('Final model position:', fbx.position);

      sceneRef.current.add(fbx);
      fbx.rotation.x = 0.1;

      console.log('After adding to scene - Model in scene:', sceneRef.current.children.includes(fbx));
      console.log('Scene children count:', sceneRef.current.children.length);

      const meshesWithMorphTargets = [];
      fbx.traverse((child) => {
        console.log('Model child:', child.type, child.name);
        if (child.isMesh) {
          console.log('Found mesh:', child.name);
          console.log('Has morphTargetDictionary:', !!child.morphTargetDictionary);
          console.log('Has morphTargetInfluences:', !!child.morphTargetInfluences);

          if (child.morphTargetDictionary && child.morphTargetInfluences) {
            console.log('Morph dictionary keys:', Object.keys(child.morphTargetDictionary));
            console.log('Morph influences length:', child.morphTargetInfluences.length);
            meshesWithMorphTargets.push(child);
          }
        }
      });

      console.log('Final meshesWithMorphTargets:', meshesWithMorphTargets);
      console.log('onMeshesLoaded callback exists:', !!onMeshesLoaded);

      if (meshesWithMorphTargets.length === 0) {
        console.warn('No morph targets found in this model.');
        console.warn('This means the sliders will be disabled and model may not be visible');
      } else {
        console.log('Found', meshesWithMorphTargets.length, 'meshes with morph targets');
        console.log('Calling onMeshesLoaded with meshes:', meshesWithMorphTargets);
        // Notify parent component that meshes are loaded
        onMeshesLoaded && onMeshesLoaded(meshesWithMorphTargets);
      }

      cameraRef.current.lookAt(0, 0, 0);

    },
      (xhr) => {
        console.log(`Loading progress: ${Math.round(xhr.loaded / xhr.total * 100)}%`);
      },
      (err) => {
        console.error('Error loading FBX:', err);
        console.error('Error details:', err.message);
      });
  };

  return (
    <div className="viewer-section">
      <div ref={containerRef} className="threejs-container"></div>
      <div className="attribution">
        3D Model: <a href="https://sketchfab.com/3d-models/ally-pretty-beautiful-face-head-model-with-hair-b579aa8891654634bb990108009808b8" target="_blank">Ally Face Model</a> by skullvez
      </div>
    </div>
  );
};

export default ThreeJSViewer;