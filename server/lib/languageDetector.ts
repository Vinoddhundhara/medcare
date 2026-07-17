/**
 * Detects if the given text is primarily Hindi or English
 * Uses Unicode range detection for Devanagari script (Hindi)
 */
export function detectLanguage(text: string): "en" | "hi" {
  if (!text || typeof text !== "string") {
    return "en";
  }

  // Devanagari Unicode range: U+0900 to U+097F
  const devanagariPattern = /[\u0900-\u097F]/;
  
  // Count characters in each script
  let hindiCharCount = 0;
  let totalCharCount = 0;

  for (const char of text) {
    if (char.trim()) {
      totalCharCount++;
      if (devanagariPattern.test(char)) {
        hindiCharCount++;
      }
    }
  }

  // If more than 30% of characters are Hindi, classify as Hindi
  if (totalCharCount > 0 && (hindiCharCount / totalCharCount) > 0.3) {
    return "hi";
  }

  return "en";
}
