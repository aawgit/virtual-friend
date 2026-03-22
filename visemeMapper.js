/**
 * Mapping of phonemes/visemes to ARKit blendshape weights.
 */
export const visemeMap = {
  // Silent / Neutral
  'default': { 18: 0.1 }, 
  
  // Vowels - Refined for natural shapes
  'A': { 17: 0.8, 19: 0.1, 33: 0.2 }, // Ah (JawOpen + slight funnel + lower shrug)
  'E': { 17: 0.4, 29: 0.4, 30: 0.4, 33: 0.2 }, // Eh (JawOpen + stretch + lower shrug)
  'I': { 17: 0.2, 29: 0.7, 30: 0.7, 34: 0.3 }, // Ee (JawOpen low + high stretch + upper shrug)
  'O': { 17: 0.5, 19: 0.9, 20: 0.4 }, // Oh (JawOpen + high funnel + pucker)
  'U': { 17: 0.3, 20: 0.9, 19: 0.5 }, // Oo (JawOpen low + high pucker + funnel)
  
  // Consonants
  'M': { 18: 1.0, 35: 0.4, 36: 0.4, 33: 0.3 }, // M, B, P (MouthClose + pressure)
  'F': { 18: 0.8, 31: 0.6, 32: 0.2 }, // F, V (MouthClose + roll lower)
  'L': { 17: 0.4, 51: 0.4 }, // L (JawOpen + tongue out)
  'S': { 17: 0.1, 29: 0.4, 30: 0.4, 35: 0.2, 36: 0.2 }, // S, T, Z (Teeth visible - slight jaw + stretch + press)
  'R': { 17: 0.2, 19: 0.4, 20: 0.2 }, // R (Slight funnel)
  'W': { 17: 0.2, 19: 0.7, 20: 0.7 }, // W (Funnel + pucker)
};

/**
 * Get a blendshape frame (array of 52 values) for a given character/phoneme.
 * @param {string} char - The character or phoneme to map.
 * @returns {Array} 52-length array of weights.
 */
export function getFrameForViseme(char) {
  const frame = new Array(52).fill(0);
  const key = char.toUpperCase();
  
  let viseme = 'default';
  if (/[AEIOU]/.test(key)) viseme = key;
  else if (/[MBP]/.test(key)) viseme = 'M';
  else if (/[FV]/.test(key)) viseme = 'F';
  else if (/[L]/.test(key)) viseme = 'L';
  else if (/[SZTD]/.test(key)) viseme = 'S';
  else if (/[R]/.test(key)) viseme = 'R';
  else if (/[WQ]/.test(key)) viseme = 'W';
  // Use 'E' as a generic vocalizer for other consonants or non-Latin characters (like Sinhala)
  else if (/[A-Z]/.test(key) || (key.charCodeAt(0) > 127 && key !== ' ')) viseme = 'E';

  const weights = visemeMap[viseme] || visemeMap['default'];
  for (const [index, weight] of Object.entries(weights)) {
    frame[parseInt(index)] = weight;
  }
  
  return frame;
}
