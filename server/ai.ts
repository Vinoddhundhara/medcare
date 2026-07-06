import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function askAI(prompt: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text;
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
👨‍⚕️ [Primary specialist]
👨‍⚕️ [Secondary specialist]

Disclaimer
This is educational information only and is not a medical diagnosis.`;

  return await askAI(prompt);
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
