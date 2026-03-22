/**
 * Mapping of phonemes/visemes to ARKit blendshape weights.
 */
export const visemeMap = {
  // Silent / Neutral
  'default': { 18: 0.1 }, 
  
  // Vowels - Increased weights for better visibility
  'A': { 17: 0.8, 19: 0.3 }, // Ah
  'E': { 17: 0.4, 23: 0.5, 24: 0.5 }, // Eh
  'I': { 17: 0.3, 23: 0.7, 24: 0.7 }, // Ee
  'O': { 17: 0.5, 21: 0.7, 22: 0.7, 19: 0.9 }, // Oh
  'U': { 17: 0.3, 21: 0.9, 22: 0.9, 20: 0.9 }, // Oo
  
  // Consonants
  'M': { 18: 1.0, 35: 0.7, 36: 0.7 }, // M, B, P
  'F': { 18: 0.8, 31: 0.7, 33: 0.3 }, // F, V
  'L': { 17: 0.5, 51: 0.4 }, // L
  'S': { 17: 0.2, 23: 0.3, 24: 0.3, 35: 0.4, 36: 0.4 }, // S, T, Z
  'R': { 17: 0.3, 19: 0.5, 20: 0.3 }, // R
  'W': { 17: 0.2, 19: 0.8, 20: 0.8 }, // W
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
