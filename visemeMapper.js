/**
 * ARKit blendshape indices used:
 *   17 = jawOpen
 *   18 = mouthClose
 *   19 = mouthFunnel   (kept LOW to prevent permanent "O" shape)
 *   20 = mouthPucker   (kept LOW)
 *   29 = mouthStretchLeft
 *   30 = mouthStretchRight
 *   31 = mouthRollLower
 *   33 = mouthShrugLower
 *   34 = mouthShrugUpper
 *   35 = mouthPressLeft
 *   36 = mouthPressRight
 *   51 = tongueOut
 */
export const visemeMap = {
  // Neutral / spaces
  'default': {},

  // Vowels — use mouth corners/stretch rather than funnel to avoid "O" look
  'A': { 29: 0.15, 30: 0.15, 33: 0.10 },           // Ah  — slight open corners
  'E': { 29: 0.35, 30: 0.35 },                       // Eh  — pulled corners
  'I': { 29: 0.45, 30: 0.45, 34: 0.15 },            // Ee  — wide, slight upper shrug
  'O': { 19: 0.20, 20: 0.15, 29: 0.05, 30: 0.05 }, // Oh  — funnel LOW (was 0.9!)
  'U': { 19: 0.15, 20: 0.25 },                       // Oo  — pucker LOW (was 0.9!)

  // Consonants
  'M': { 18: 0.80, 35: 0.20, 36: 0.20 },  // M,B,P  — close
  'F': { 31: 0.30, 18: 0.20 },             // F,V    — roll lower
  'L': { 51: 0.20 },                        // L      — tongue hint
  'S': { 29: 0.20, 30: 0.20 },             // S,T,Z  — slight stretch
  'R': { 19: 0.10, 20: 0.10 },             // R      — minimal rounding
  'W': { 19: 0.15, 20: 0.20 },             // W      — slight pucker
};

/**
 * Returns a 52-element blendshape frame for a given character.
 * jawOpen (index 17) is always 0.
 */
export function getFrameForViseme(char) {
  const frame = new Array(52).fill(0);
  const key = char.toUpperCase();

  let viseme = 'default';
  if (/[AEIOU]/.test(key)) viseme = key;
  else if (/[MBP]/.test(key)) viseme = 'M';
  else if (/[FV]/.test(key))  viseme = 'F';
  else if (/[L]/.test(key))   viseme = 'L';
  else if (/[SZTD]/.test(key))viseme = 'S';
  else if (/[R]/.test(key))   viseme = 'R';
  else if (/[WQ]/.test(key))  viseme = 'W';
  // Everything else → no secondary shape (neutral)

  const weights = visemeMap[viseme] || {};
  for (const [idx, weight] of Object.entries(weights)) {
    frame[parseInt(idx)] = weight;
  }
  frame[17] = 0;
  return frame;
}
