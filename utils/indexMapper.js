/**
 * Standard ARKit blendshape names in the order they typically appear in 52-frame data.
 */
export const arkitNames = [
  "eyeBlinkLeft", "eyeLookDownLeft", "eyeLookInLeft", "eyeLookOutLeft", "eyeLookUpLeft", "eyeSquintLeft", "eyeWideLeft",
  "eyeBlinkRight", "eyeLookDownRight", "eyeLookInRight", "eyeLookOutRight", "eyeLookUpRight", "eyeSquintRight", "eyeWideRight",
  "jawForward", "jawLeft", "jawRight", "jawOpen", "mouthClose", "mouthFunnel", "mouthPucker", "mouthLeft", "mouthRight",
  "mouthSmileLeft", "mouthSmileRight", "mouthFrownLeft", "mouthFrownRight", "mouthDimpleLeft", "mouthDimpleRight",
  "mouthStretchLeft", "mouthStretchRight", "mouthRollLower", "mouthRollUpper", "mouthShrugLower", "mouthShrugUpper",
  "mouthPressLeft", "mouthPressRight", "mouthLowerDownLeft", "mouthLowerDownRight", "mouthUpperUpLeft", "mouthUpperUpRight",
  "browDownLeft", "browDownRight", "browInnerUp", "browOuterUpLeft", "browOuterUpRight", "cheekPuff", "cheekSquintLeft",
  "cheekSquintRight", "noseSneerLeft", "noseSneerRight", "tongueOut"
];

/**
 * Alternate naming conventions (PascalCase, underscore, etc.)
 */
const alternateNames = {
  "jawOpen": ["JawOpen", "Jaw_Open", "MouthOpen", "Jaw_Open_ARKit"],
  "mouthFunnel": ["MouthFunnel", "LipsFunnel"],
  "mouthPucker": ["MouthPucker", "LipsPucker"],
  "mouthSmileLeft": ["MouthSmile_L", "MouthSmileLeft"],
  "mouthSmileRight": ["MouthSmile_R", "MouthSmileRight"],
  "mouthClose": ["MouthClose", "LipsLowerClose", "LipsUpperClose"]
};

/**
 * Build a dynamic mapping for a specific mesh.
 * @param {THREE.Mesh} mesh 
 * @returns {Object} { arkitIndex: modelIndex }
 */
export function getMeshMapping(mesh) {
  const dictionary = mesh.morphTargetDictionary;
  if (!dictionary) return {};

  const mapping = {};
  const dictKeys = Object.keys(dictionary);
  
  arkitNames.forEach((standardName, arkitIndex) => {
    const lowerStandard = standardName.toLowerCase();
    
    // 1. Try exact or case-insensitive match
    let foundKey = dictKeys.find(key => key.toLowerCase() === lowerStandard);
    
    // 2. Try fuzzy match (ends with) if not found
    // This handles prefixes like 'Wolf3D_Head.jawOpen' or 'mesh_0.jawOpen'
    if (!foundKey) {
      foundKey = dictKeys.find(key => {
        const k = key.toLowerCase();
        return k.endsWith(lowerStandard) || k.endsWith('.' + lowerStandard) || k.endsWith('_' + lowerStandard);
      });
    }

    // 3. Try alternate names fuzzy
    if (!foundKey && alternateNames[standardName]) {
      for (const alt of alternateNames[standardName]) {
        const lowerAlt = alt.toLowerCase();
        foundKey = dictKeys.find(key => {
          const k = key.toLowerCase();
          return k === lowerAlt || k.endsWith('.' + lowerAlt) || k.endsWith('_' + lowerAlt) || k.endsWith(lowerAlt);
        });
        if (foundKey) break;
      }
    }

    if (foundKey) {
      mapping[arkitIndex] = dictionary[foundKey];
      // Diagnostic logging for critical speech visemes
      if (arkitIndex === 17 || arkitIndex === 18) {
        console.log(`Mapper: Matched ARKit [${standardName}] to model [${foundKey}]`);
      }
    }
  });

  return mapping;
}

// Keep the legacy maps for backward compatibility if needed, but they should be phased out
export const blendshapeIndexMap2 = { 0: 50, 1: 23, 2: 27, 3: 29, 4: 25, 5: 5, 6: 7, 7: 51, 8: 24, 9: 28, 10: 30, 11: 26, 12: 6, 13: 8, 14: 9, 15: 10, 16: 11, 17: 34, 18: 35, 19: 36, 20: 14, 21: 21, 22: 22, 23: 47, 24: 48, 25: 12, 26: 13, 27: 37, 28: 38, 29: 39, 30: 40, 31: 41, 32: 42, 33: 15, 34: 16, 35: 43, 36: 44, 37: 19, 38: 20, 39: 45, 40: 46, 41: 0, 42: 1, 43: 2, 44: 3, 45: 4, 46: 31, 47: 32, 48: 33, 49: 17, 50: 18, 51: 49 };
export const blendshapeIndexMap = { 0: 12, 5: 16, 6: 14, 7: 13, 12: 17, 13: 15, 14: 24, 15: 25, 16: 27, 17: 26, 18: 29, 19: 28, 20: 32, 21: 42, 22: 43, 23: 44, 24: 45, 25: 40, 26: 41, 27: 38, 28: 39, 29: 33, 30: 34, 31: 31, 32: 36, 33: 30, 34: 37, 35: 29, 36: 35, 37: 30, 38: 30, 39: 37, 40: 37, 41: 1, 42: 2, 43: 3, 44: 4, 45: 5, 46: 48, 47: 7, 48: 8, 49: 49, 50: 49 };