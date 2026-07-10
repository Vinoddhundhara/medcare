import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function askAI(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text || "";
}

export async function analyzeSymptoms(symptoms: string) {
  const prompt = `You are a medical AI assistant. A patient has described the following symptoms: "${symptoms}"

Analyze the symptoms and respond in this EXACT format (keep every emoji, heading, and bullet style):

🩺 Symptom Summary
• [Main suspected condition]
• [Key symptom 1]
• [Key symptom 2]
• [Key symptom 3]
• [Duration/timeline if mentioned, otherwise "Duration not specified"]

⚠️ Risk Level
[write only one word: LOW or MEDIUM or HIGH or EMERGENCY]

Possible Causes
1. [Most likely cause]
2. [Second likely cause]
3. [Third likely cause]
4. [Fourth cause]

Recommended Actions
✔ [Action 1]
✔ [Action 2]
✔ [Action 3]
✔ [Action 4]

🚨 Go to the Emergency Department Immediately If
• [Emergency sign 1]
• [Emergency sign 2]
• [Emergency sign 3]
• [Emergency sign 4]
• [Emergency sign 5]

Recommended Specialist
👨‍⚕️ [Primary specialist - write ONLY the specialty name e.g. Cardiologist, General Physician, Pediatrician]
👨‍⚕️ [Secondary specialist if needed]

Urgency
[e.g. Consult a Cardiologist within 1 hour.]

Disclaimer
This is educational information only and is not a medical diagnosis.`;

  return await askAI(prompt);
}

/**
 * Returns structured JSON: { analysis, recommendedSpecialist, risk, urgency }
 * Used by the new AI → Doctor flow.
 */
export async function analyzeSymptomsFull(symptoms: string): Promise<{
  analysis: string;
  recommendedSpecialist: string;
  risk: string;
  urgency: string;
}> {
  const analysis = await analyzeSymptoms(symptoms);

  // Extract specialist — line after "👨‍⚕️" on first recommended specialist line
  const specialistMatch = analysis.match(/👨‍⚕️\s*([^\n👨]+)/);
  const recommendedSpecialist = specialistMatch
    ? specialistMatch[1].trim().replace(/^(Primary specialist.*?[:–-]\s*)/i, "")
    : "General Physician";

  // Extract risk level
  const riskMatch = analysis.match(/⚠️\s*Risk Level\s*\n([A-Z]+)/i);
  const risk = riskMatch ? riskMatch[1].trim() : "MEDIUM";

  // Extract urgency
  const urgencyMatch = analysis.match(/Urgency\s*\n([^\n]+)/i);
  const urgency = urgencyMatch ? urgencyMatch[1].trim() : `Consult a ${recommendedSpecialist} soon.`;

  return { analysis, recommendedSpecialist, risk, urgency };
}

export async function answerMedicalQuestion(question: string) {
  const prompt = `You are a helpful medical information assistant. Answer this health-related question clearly and concisely: "${question}"

Provide accurate, helpful information. Keep the answer easy to understand.
End with a one-line disclaimer that this is general information and not personalized medical advice.`;

  return await askAI(prompt);
}

export async function recommendMedicines(condition: string) {
  const prompt = `You are a medical AI assistant. A patient is asking about medicines commonly used for: "${condition}"

Respond in this EXACT format:

💊 Condition Overview
[1-2 sentence description of the condition]

🔵 Commonly Used Medicines

1. [Medicine Name] ([Generic/Brand])
   • Type: [e.g., Antibiotic / Analgesic / Antidiabetic]
   • Common Use: [what it treats]
   • Typical Dosage: [general dosage info]
   • Common Side Effects: [2-3 side effects]

2. [Medicine Name] ([Generic/Brand])
   • Type: [type]
   • Common Use: [use]
   • Typical Dosage: [dosage]
   • Common Side Effects: [side effects]

3. [Medicine Name] ([Generic/Brand])
   • Type: [type]
   • Common Use: [use]
   • Typical Dosage: [dosage]
   • Common Side Effects: [side effects]

⚠️ Important Precautions
• [Precaution 1]
• [Precaution 2]
• [Precaution 3]

🚫 Do NOT self-medicate. Always consult a licensed doctor before taking any medicine. This information is for educational purposes only.`;

  return await askAI(prompt);
}

export async function generateDietPlan(input: {
  condition: string;
  age: string;
  weight: string;
  activityLevel: string;
  foodPreference: string;
}) {
  const prompt = `You are a certified nutritionist and dietitian AI. A patient needs a personalized 7-day diet plan.

Patient Details:
- Medical Condition: ${input.condition}
- Age: ${input.age}
- Weight: ${input.weight}
- Activity Level: ${input.activityLevel}
- Food Preference: ${input.foodPreference}

Respond in this EXACT format:

🥗 Personalized 7-Day Diet Plan
Condition: ${input.condition}

📋 Nutritional Goals
• Daily Calories: [recommended range]
• Protein: [grams/day]
• Carbohydrates: [grams/day]
• Fats: [grams/day]
• Water Intake: [liters/day]

━━━━━━━━━━━━━━━━━━━━━━

📅 Day 1
🌅 Breakfast: [specific meal with portion size]
🌿 Mid-Morning Snack: [specific snack]
☀️ Lunch: [specific meal with portion size]
🍎 Evening Snack: [specific snack]
🌙 Dinner: [specific meal with portion size]

📅 Day 2
🌅 Breakfast: [specific meal]
🌿 Mid-Morning Snack: [snack]
☀️ Lunch: [specific meal]
🍎 Evening Snack: [snack]
🌙 Dinner: [specific meal]

📅 Day 3
🌅 Breakfast: [specific meal]
🌿 Mid-Morning Snack: [snack]
☀️ Lunch: [specific meal]
🍎 Evening Snack: [snack]
🌙 Dinner: [specific meal]

📅 Day 4
🌅 Breakfast: [specific meal]
🌿 Mid-Morning Snack: [snack]
☀️ Lunch: [specific meal]
🍎 Evening Snack: [snack]
🌙 Dinner: [specific meal]

📅 Day 5
🌅 Breakfast: [specific meal]
🌿 Mid-Morning Snack: [snack]
☀️ Lunch: [specific meal]
🍎 Evening Snack: [snack]
🌙 Dinner: [specific meal]

📅 Day 6
🌅 Breakfast: [specific meal]
🌿 Mid-Morning Snack: [snack]
☀️ Lunch: [specific meal]
🍎 Evening Snack: [snack]
🌙 Dinner: [specific meal]

📅 Day 7
🌅 Breakfast: [specific meal]
🌿 Mid-Morning Snack: [snack]
☀️ Lunch: [specific meal]
🍎 Evening Snack: [snack]
🌙 Dinner: [specific meal]

━━━━━━━━━━━━━━━━━━━━━━

✅ Foods to Include
• [Food 1 and why it helps]
• [Food 2 and why it helps]
• [Food 3 and why it helps]
• [Food 4 and why it helps]
• [Food 5 and why it helps]

❌ Foods to Avoid
• [Food 1 and why to avoid]
• [Food 2 and why to avoid]
• [Food 3 and why to avoid]
• [Food 4 and why to avoid]

💡 Lifestyle Tips
• [Tip 1 specific to condition]
• [Tip 2 specific to condition]
• [Tip 3 specific to condition]

⚠️ Disclaimer
This diet plan is AI-generated for educational purposes only. Please consult a registered dietitian or your doctor before making dietary changes.`;

  return await askAI(prompt);
}
