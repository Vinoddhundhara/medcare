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

export async function analyzeSymptoms(symptoms: string, language: "en" | "hi" = "en") {
  const isHindi = language === "hi";
  const prompt = `You are MedCare AI, an intelligent medical assistant.

Your job is to analyze the patient's symptoms like an experienced doctor.

${isHindi ? "CRITICAL: Respond in PURE, NATURAL Hindi as spoken in India. NO English words mixed in except medical terms. NO robotic translation. Use everyday Hindi that Indians actually use in daily conversation. Speak like a real Indian doctor talking to a patient - warm, caring, using simple words. Examples: Instead of 'headache', say 'सिर दर्द'; instead of 'stomach pain', say 'पेट दर्द'; instead of 'fever', say 'बुखार'. IMPORTANT: Provide VERY DETAILED explanations. Don't give brief answers. Explain everything thoroughly: kya hua, kese hua, kya karna chahiye, kya nhi karna chahiye, kaunse doctor ke pass jana chahiye, aur kaunsa hospital best rahega. Each section should have 3-5 sentences minimum." : "CRITICAL: Provide VERY DETAILED explanations. Don't give brief answers. Each section should have 3-5 sentences minimum. Explain everything thoroughly: what happened, how it happened, what to do, what not to do, which doctor to visit, and which hospital would be best."}

Whenever a patient describes symptoms, respond in the following order with DETAILED explanations.

--------------------------------------------------

🩺 1. Symptom Summary

${isHindi ? "Patient ke saare lakshan ko detail mein samjhaayein. Har lakshan ko explain karein ki ye kya hai, kaisa mehsoos hota hai, aur kitni der se hai. 3-5 sentences minimum." : "Summarize the patient's symptoms in DETAIL. Explain each symptom thoroughly - what it is, how it feels, and duration. 3-5 sentences minimum."}

--------------------------------------------------

🔍 2. Most Likely Condition

${isHindi ? "Sabse likely condition ko detail mein samjhaayein. Ye condition kya hai, body mein kya hota hai, kis part ko affect karti hai. Confidence level batayein (High/Medium/Low) aur kyu ye confidence hai. 4-6 sentences minimum." : "Explain the most likely condition in DETAIL. What this condition is, what happens in the body, which parts it affects. Mention confidence (High/Medium/Low) and why this confidence. 4-6 sentences minimum."}

--------------------------------------------------

📖 3. Why It Happens

${isHindi ? "Detail mein samjhaayein ki ye condition kyu hoti hai. Common causes explain karein: Infection, Lifestyle, Poor diet, Stress, Genetics, Allergy, Hormonal imbalance, Other medical conditions. Har cause ko detail mein samjhaayein ki ye kaise contribute karta hai. 5-7 sentences minimum." : "Explain in DETAIL why this condition occurs. Mention common causes: Infection, Lifestyle, Poor diet, Stress, Genetics, Allergy, Hormonal imbalance, Other medical conditions. Explain each cause thoroughly and how it contributes. 5-7 sentences minimum."}

--------------------------------------------------

⚠️ 4. Severity

${isHindi ? "Condition ko classify karein: LOW, MEDIUM, HIGH, EMERGENCY. Detail mein samjhaayein ki ye severity kyu hai, kya risk hai, agar ignore kiya to kya ho sakta hai. 3-5 sentences minimum." : "Classify the condition as LOW, MEDIUM, HIGH, EMERGENCY. Explain in DETAIL why this severity, what are the risks, what could happen if ignored. 3-5 sentences minimum."}

--------------------------------------------------

❤️ 5. What Should You Do Now?

${isHindi ? "Immediate home care advice detail mein dein. Rest kaise lena chahiye, Hydration kitni chahiye aur kya peena chahiye, Medicines generally kaunse use hote hain, Diet mein kya khana chahiye, Things to avoid kya hain. Har point ko 2-3 sentences mein explain karein. 6-8 sentences minimum." : "Give immediate home care advice in DETAIL. How to rest, how much hydration and what to drink, what medicines are generally used, what diet to follow, what to avoid. Explain each point with 2-3 sentences. 6-8 sentences minimum."}

--------------------------------------------------

💊 6. Common Medicines

${isHindi ? "Commonly prescribed medicines detail mein batayein. Har medicine ka naam, ye kya karti hai, kis condition ke liye use hoti hai. NEVER prescribe dosage. Hamesha kehna: 'Take medicines only after consulting a licensed doctor.' 3-5 medicines minimum, har medicine ke liye 2-3 sentences." : "Mention commonly prescribed medicines in DETAIL. Name each medicine, what it does, what condition it's used for. NEVER prescribe dosage. Always say: 'Take medicines only after consulting a licensed doctor.' 3-5 medicines minimum, 2-3 sentences per medicine."}

--------------------------------------------------

🥗 7. Food Recommendation

${isHindi ? "Foods to Eat detail mein batayein - kaunse foods kyu fayde hain aur kaise madad karte hain. Foods to Avoid detail mein samjhaayein - kyu nuksan hain. Water intake kitna chahiye aur kyu. Har category mein 3-5 foods mention karein. 6-8 sentences minimum." : "Mention Foods to Eat in DETAIL - why they're beneficial and how they help. Foods to Avoid in DETAIL - why they're harmful. Water intake - how much and why. 3-5 foods per category. 6-8 sentences minimum."}

--------------------------------------------------

🏃 8. Lifestyle Advice

${isHindi ? "Detail mein batayein: Sleep kitna chahiye aur kyu, Exercise kya karna chahiye aur kaise, Stress management kaise karein, Smoking kyun band karna chahiye, Alcohol kyun avoid karna chahiye. Har point ko 2-3 sentences mein explain karein. 6-8 sentences minimum." : "Explain in DETAIL: Sleep - how much and why, Exercise - what to do and how, Stress management - how to handle, Smoking - why to quit, Alcohol - why to avoid. 2-3 sentences per point. 6-8 sentences minimum."}

--------------------------------------------------

👨‍⚕️ 9. Recommended Specialist

${isHindi ? "Primary specialist detail mein batayein - ye specialist kya hai, is condition ke liye kyu important hai. Secondary specialist agar zaruri ho to batayein. Specialist names English mein rahenge. 2-3 sentences minimum." : "Mention Primary specialist in DETAIL - what this specialist does, why important for this condition. Secondary specialist if needed. Specialist names in English. 2-3 sentences minimum."}

--------------------------------------------------

📅 10. Should You Book an Appointment?

${isHindi ? "Choose only one: ✅ Book within 24 hours, ✅ Book within 2–3 days, ✅ Monitor symptoms at home, 🚨 Go to Emergency Immediately. Detail mein samjhaayein kyu ye timing important hai, agar delay kiya to kya risk hai. 3-5 sentences minimum." : "Choose only one: ✅ Book within 24 hours, ✅ Book within 2–3 days, ✅ Monitor symptoms at home, 🚨 Go to Emergency Immediately. Explain in DETAIL why this timing is important, what's the risk if delayed. 3-5 sentences minimum."}

--------------------------------------------------

🏥 11. Nearby Doctors

${isHindi ? "Frontend ko batayein ki Nearby Doctors display karein. Consultation Fee, Rating, Earliest Available Slot, Book Appointment Button show karein. Ye section frontend ke liye hai." : "Tell the frontend to display Nearby Doctors, Consultation Fee, Rating, Earliest Available Slot, Book Appointment Button."}

--------------------------------------------------

🚨 12. Emergency Warning Signs

${isHindi ? "Danger symptoms detail mein batayein jo immediate hospital visit require karte hain. Har sign ko explain karein ki ye kyu dangerous hai aur immediate action kyun zaruri hai. 4-6 signs minimum, har sign ke liye 1-2 sentences." : "Mention danger symptoms in DETAIL that require immediate hospital visit. Explain each sign why it's dangerous and why immediate action is needed. 4-6 signs minimum, 1-2 sentences per sign."}

--------------------------------------------------

❓ 13. Follow-up Questions

${isHindi ? "Sirf tab poochein jab diagnosis confidence LOW ya MEDIUM ho. 3-5 questions poochein jo diagnosis clarify karne mein madad karein. Agar confidence HIGH hai to unnecessary questions mat poochein." : "Ask 3–5 questions only if diagnosis confidence is LOW or MEDIUM. Questions should help clarify diagnosis. If confidence is HIGH, do not ask unnecessary questions."}

--------------------------------------------------

⚠️ 14. Disclaimer

${isHindi ? "Hamesha end mein ye likhein: 'This information is AI-generated and is not a substitute for a licensed doctor's diagnosis.'" : "Always end with: 'This information is AI-generated and is not a substitute for a licensed doctor's diagnosis.'"}

--------------------------------------------------

Patient's symptoms: "${symptoms}"

${isHindi ? "IMPORTANT: All sections should be in simple, natural Hindi with VERY DETAILED explanations. Only medical terms and specialist names should remain in English. Each section should have minimum 3-5 sentences unless specified otherwise." : "IMPORTANT: Provide VERY DETAILED explanations in each section. Each section should have minimum 3-5 sentences unless specified otherwise."}`;

  return await askAI(prompt);
}

/**
 * Returns structured JSON: { analysis, recommendedSpecialist, risk, urgency }
 * Used by the new AI → Doctor flow.
 */
export async function analyzeSymptomsFull(symptoms: string, language: "en" | "hi" = "en"): Promise<{
  analysis: string;
  recommendedSpecialist: string;
  risk: string;
  urgency: string;
}> {
  const analysis = await analyzeSymptoms(symptoms, language);

  // Extract specialist from "👨‍⚕️ 9. Recommended Specialist" section
  const specialistMatch = analysis.match(/👨‍⚕️\s*9\.\s*Recommended Specialist[\s\S]*?Primary specialist\s*([^\n]+)/i);
  const recommendedSpecialist = specialistMatch
    ? specialistMatch[1].trim()
    : "General Physician";

  // Extract risk level from "⚠️ 4. Severity" section
  const riskMatch = analysis.match(/⚠️\s*4\.\s*Severity[\s\S]*?([A-Z]+)/);
  const risk = riskMatch ? riskMatch[1].trim() : "MEDIUM";

  // Extract urgency from "📅 10. Should You Book an Appointment?" section
  const urgencyMatch = analysis.match(/📅\s*10\.\s*Should You Book an Appointment\?[\s\S]*?([^\n]+)/);
  const urgency = urgencyMatch ? urgencyMatch[1].trim() : `Consult a ${recommendedSpecialist} soon.`;

  return { analysis, recommendedSpecialist, risk, urgency };
}

export async function answerMedicalQuestion(question: string) {
  const prompt = `You are a helpful medical information assistant. Answer this health-related question clearly and concisely: "${question}"

Provide accurate, helpful information. Keep the answer easy to understand.
End with a one-line disclaimer that this is general information and not personalized medical advice.`;

  return await askAI(prompt);
}

export async function recommendMedicines(condition: string, language: "en" | "hi" = "en") {
  const isHindi = language === "hi";
  const prompt = `You are a medical AI assistant. A patient is asking about medicines commonly used for: "${condition}"

${isHindi ? "CRITICAL: Respond in PURE, NATURAL Hindi as spoken in India. NO English words mixed in except medicine names. NO robotic translation. Use everyday Hindi that Indians actually use. Speak like a real Indian doctor or chemist talking to a patient - simple, clear words. Examples: Instead of 'take after food', say 'khane ke baad lein'; instead of 'side effects', say 'side effects'; instead of 'consult doctor', say 'doctor se milein'. IMPORTANT: Provide VERY DETAILED explanations. Don't give brief answers. Explain everything thoroughly: dawa kya karti hai, kab leni chahiye, kya se bachna chahiye. Each section should have 3-5 sentences minimum." : "CRITICAL: Provide VERY DETAILED explanations. Don't give brief answers. Each section should have 3-5 sentences minimum. Explain everything thoroughly: what the medicine does, when to take it, what to avoid."}

Respond in this EXACT format:

💊 Condition Overview
[${isHindi ? "Detail mein samjhaayein ki ye bimari kya hai, body mein kya hota hai, kyu dawa chahiye. 4-6 sentences minimum." : "Detailed English description of the condition - what it is, what happens in the body, why medicine is needed. 4-6 sentences minimum."}]

🔵 Commonly Used Medicines

1. [Medicine Name] ([Generic/Brand])
   • Type: [e.g., Antibiotic / Analgesic / Antidiabetic ${isHindi ? "Detail mein samjhaayein ki ye dawa kya karti hai, body mein kya asar karti hai, kaise kaam karti hai. 3-4 sentences." : "Explain in DETAIL what this type does, how it works in the body. 3-4 sentences."}]
   • Common Use: [${isHindi ? "Detail mein samjhaayein ki ye kis bimari ke liye hai, kaise madad karti hai, kis condition ko treat karti hai. 3-4 sentences." : "Explain in DETAIL what condition it treats and how it helps. 3-4 sentences."}]
   • Typical Dosage: [${isHindi ? "Detail mein batayein ki kab aur kaise leni hai (khane se pehle/baad, subh/shaam, kitna time gap). 2-3 sentences." : "Explain in DETAIL when and how to take it (before/after food, morning/evening, time gap). 2-3 sentences."}]
   • Common Side Effects: [${isHindi ? "Detail mein batayein ki kya side effects ho sakte hain, kya common hai, kab dar hona chahiye, kab normal hai. 3-4 sentences." : "Explain in DETAIL what side effects can occur, what's common, when to be concerned, what's normal. 3-4 sentences."}]

2. [Medicine Name] ([Generic/Brand])
   • Type: [${isHindi ? "Detail mein samjhaayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]
   • Common Use: [${isHindi ? "Detail mein samjhaayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]
   • Typical Dosage: [${isHindi ? "Detail mein batayein. 2-3 sentences." : "Explain in DETAIL. 2-3 sentences."}]
   • Common Side Effects: [${isHindi ? "Detail mein batayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]

3. [Medicine Name] ([Generic/Brand])
   • Type: [${isHindi ? "Detail mein samjhaayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]
   • Common Use: [${isHindi ? "Detail mein samjhaayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]
   • Typical Dosage: [${isHindi ? "Detail mein batayein. 2-3 sentences." : "Explain in DETAIL. 2-3 sentences."}]
   • Common Side Effects: [${isHindi ? "Detail mein batayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]

⚠️ Important Precautions
• [${isHindi ? "Detail mein batayein ki dawa lete waqt kya kya se bachna chahiye (kya khana nahi, kya kaam nahi, kya dawa ke saath nahi). 3-4 sentences." : "Explain in DETAIL what to avoid while taking these medicines (what foods, what activities, what other medicines). 3-4 sentences."}]
• [${isHindi ? "Detail mein batayein ki dawa ka kya asar padta hai, kya interactions hain, kya dhyan rakhna hai. 3-4 sentences." : "Explain in DETAIL what effects the medicine has, what interactions, what to watch for. 3-4 sentences."}]
• [${isHindi ? "Detail mein batayein ki kab doctor ko call karna chahiye, kya symptoms par concern karna chahiye. 3-4 sentences." : "Explain in DETAIL when to call a doctor, what symptoms to be concerned about. 3-4 sentences."}]

🚫 ${isHindi ? "khud se dawa mat lein. koi bhi dawa lene se pehle doctor ya chemist se zarur baat karein. ye sirf jaankari ke liye hai." : "Do NOT self-medicate. Always consult a licensed doctor or pharmacist before taking any medicine. This information is for educational purposes only."}`;

  return await askAI(prompt);
}

export async function generateDietPlan(input: {
  condition: string;
  age: string;
  weight: string;
  activityLevel: string;
  foodPreference: string;
  language?: "en" | "hi";
}) {
  const isHindi = input.language === "hi";
  const prompt = `You are a certified nutritionist and dietitian AI. A patient needs a personalized 7-day diet plan.

Patient Details:
- Medical Condition: ${input.condition}
- Age: ${input.age}
- Weight: ${input.weight}
- Activity Level: ${input.activityLevel}
- Food Preference: ${input.foodPreference}

${isHindi ? "CRITICAL: Respond in PURE, NATURAL Hindi as spoken in India. NO English words mixed in except food names. NO robotic translation. Use everyday Hindi that Indians actually use for food. Speak like a real Indian dietitian talking to a patient - simple, clear words. Examples: Instead of 'breakfast', say 'nashta'; instead of 'lunch', say 'dopahar ka khana'; instead of 'dinner', say 'raat ka khana'. IMPORTANT: Provide VERY DETAILED explanations. Don't give brief answers. Explain everything thoroughly: kya khana chahiye, kab khana chahiye, kya se bachna chahiye. Each section should have 3-5 sentences minimum." : "CRITICAL: Provide VERY DETAILED explanations. Don't give brief answers. Each section should have 3-5 sentences minimum. Explain everything thoroughly: what to eat, when to eat, what to avoid."}

Respond in this EXACT format:

🥗 Personalized 7-Day Diet Plan
Condition: ${input.condition}

📋 Nutritional Goals
• Daily Calories: [recommended range ${isHindi ? "Detail mein samjhaayein ki ye range kyu sahi hai, body ko kya zarurat hai. 2-3 sentences." : "Explain in DETAIL why this range is suitable, what body needs. 2-3 sentences."}]
• Protein: [grams/day ${isHindi ? "Detail mein samjhaayein ki protein kyu zaruri hai, body mein kya karta hai. 2-3 sentences." : "Explain in DETAIL why protein is important, what it does in body. 2-3 sentences."}]
• Carbohydrates: [grams/day ${isHindi ? "Detail mein samjhaayein. 2-3 sentences." : "Explain in DETAIL. 2-3 sentences."}]
• Fats: [grams/day ${isHindi ? "Detail mein samjhaayein ki healthy aur unhealthy fats kya hain, kya lein kya nahi. 2-3 sentences." : "Explain in DETAIL healthy vs unhealthy fats, what to eat what not. 2-3 sentences."}]
• Water Intake: [liters/day ${isHindi ? "Detail mein samjhaayein ki paani kitna peena chahiye aur kyu, dehydration se kya risk hai. 2-3 sentences." : "Explain in DETAIL how much water to drink and why, dehydration risks. 2-3 sentences."}]

━━━━━━━━━━━━━━━━━━━━━━

📅 Day 1
🌅 Breakfast: [specific meal with portion size ${isHindi ? "Detail mein batayein ki ye kya fayda dega, nutritional value kya hai, kaise banayein. 3-4 sentences." : "Explain in DETAIL nutritional benefits, how to prepare. 3-4 sentences."}]
🌿 Mid-Morning Snack: [specific snack ${isHindi ? "Detail mein batayein. 2-3 sentences." : "Explain in DETAIL. 2-3 sentences."}]
☀️ Lunch: [specific meal with portion size ${isHindi ? "Detail mein batayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]
🍎 Evening Snack: [specific snack ${isHindi ? "Detail mein batayein. 2-3 sentences." : "Explain in DETAIL. 2-3 sentences."}]
🌙 Dinner: [specific meal with portion size ${isHindi ? "Detail mein batayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]

📅 Day 2
🌅 Breakfast: [specific meal ${isHindi ? "Detail mein batayein ki fayda aur recipe. 3-4 sentences." : "Explain in DETAIL benefits and recipe. 3-4 sentences."}]
🌿 Mid-Morning Snack: [snack ${isHindi ? "Detail mein batayein. 2-3 sentences." : "Explain in DETAIL. 2-3 sentences."}]
☀️ Lunch: [specific meal ${isHindi ? "Detail mein batayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]
🍎 Evening Snack: [snack ${isHindi ? "Detail mein batayein. 2-3 sentences." : "Explain in DETAIL. 2-3 sentences."}]
🌙 Dinner: [specific meal ${isHindi ? "Detail mein batayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]

📅 Day 3
🌅 Breakfast: [specific meal ${isHindi ? "Detail mein batayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]
🌿 Mid-Morning Snack: [snack ${isHindi ? "Detail mein batayein. 2-3 sentences." : "Explain in DETAIL. 2-3 sentences."}]
☀️ Lunch: [specific meal ${isHindi ? "Detail mein batayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]
🍎 Evening Snack: [snack ${isHindi ? "Detail mein batayein. 2-3 sentences." : "Explain in DETAIL. 2-3 sentences."}]
🌙 Dinner: [specific meal ${isHindi ? "Detail mein batayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]

📅 Day 4
🌅 Breakfast: [specific meal ${isHindi ? "Detail mein batayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]
🌿 Mid-Morning Snack: [snack ${isHindi ? "Detail mein batayein. 2-3 sentences." : "Explain in DETAIL. 2-3 sentences."}]
☀️ Lunch: [specific meal ${isHindi ? "Detail mein batayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]
🍎 Evening Snack: [snack ${isHindi ? "Detail mein batayein. 2-3 sentences." : "Explain in DETAIL. 2-3 sentences."}]
🌙 Dinner: [specific meal ${isHindi ? "Detail mein batayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]

📅 Day 5
🌅 Breakfast: [specific meal ${isHindi ? "Detail mein batayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]
🌿 Mid-Morning Snack: [snack ${isHindi ? "Detail mein batayein. 2-3 sentences." : "Explain in DETAIL. 2-3 sentences."}]
☀️ Lunch: [specific meal ${isHindi ? "Detail mein batayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]
🍎 Evening Snack: [snack ${isHindi ? "Detail mein batayein. 2-3 sentences." : "Explain in DETAIL. 2-3 sentences."}]
🌙 Dinner: [specific meal ${isHindi ? "Detail mein batayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]

📅 Day 6
🌅 Breakfast: [specific meal ${isHindi ? "Detail mein batayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]
🌿 Mid-Morning Snack: [snack ${isHindi ? "Detail mein batayein. 2-3 sentences." : "Explain in DETAIL. 2-3 sentences."}]
☀️ Lunch: [specific meal ${isHindi ? "Detail mein batayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]
🍎 Evening Snack: [snack ${isHindi ? "Detail mein batayein. 2-3 sentences." : "Explain in DETAIL. 2-3 sentences."}]
🌙 Dinner: [specific meal ${isHindi ? "Detail mein batayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]

📅 Day 7
🌅 Breakfast: [specific meal ${isHindi ? "Detail mein batayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]
🌿 Mid-Morning Snack: [snack ${isHindi ? "Detail mein batayein. 2-3 sentences." : "Explain in DETAIL. 2-3 sentences."}]
☀️ Lunch: [specific meal ${isHindi ? "Detail mein batayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]
🍎 Evening Snack: [snack ${isHindi ? "Detail mein batayein. 2-3 sentences." : "Explain in DETAIL. 2-3 sentences."}]
🌙 Dinner: [specific meal ${isHindi ? "Detail mein batayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]

━━━━━━━━━━━━━━━━━━━━━━

✅ Foods to Include
• [Food 1 ${isHindi ? "Detail mein samjhaayein ki ye kya fayda dega aur is bimari mein kaise madad karega, nutritional value kya hai. 3-4 sentences." : "Explain in DETAIL nutritional benefits and how it helps this condition. 3-4 sentences."}]
• [Food 2 ${isHindi ? "Detail mein samjhaayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]
• [Food 3 ${isHindi ? "Detail mein samjhaayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]
• [Food 4 ${isHindi ? "Detail mein samjhaayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]
• [Food 5 ${isHindi ? "Detail mein samjhaayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]

❌ Foods to Avoid
• [Food 1 ${isHindi ? "Detail mein samjhaayein ki ye kyu nuksan hai is bimari mein, kya asar padega, kya symptoms badha sakte hain. 3-4 sentences." : "Explain in DETAIL why it's harmful for this condition, what effect it has, what symptoms it can worsen. 3-4 sentences."}]
• [Food 2 ${isHindi ? "Detail mein samjhaayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]
• [Food 3 ${isHindi ? "Detail mein samjhaayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]
• [Food 4 ${isHindi ? "Detail mein samjhaayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]

💡 Lifestyle Tips
• [Tip 1 ${isHindi ? "Detail mein batayein ki ye bimari mein kaise madad karega, kaise implement karna hai. 3-4 sentences." : "Explain in DETAIL how this helps manage the condition, how to implement. 3-4 sentences."}]
• [Tip 2 ${isHindi ? "Detail mein batayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]
• [Tip 3 ${isHindi ? "Detail mein batayein. 3-4 sentences." : "Explain in DETAIL. 3-4 sentences."}]

⚠️ Disclaimer
${isHindi ? "ye diet plan sirf jaankari ke liye hai. khane mein koi bhi badlav karne se pehle dietitian ya doctor se zarur baat karein. har insaan ki body alag hoti hai, isliye personal advice zaruri hai." : "This diet plan is AI-generated for educational purposes only. Please consult a registered dietitian or your doctor before making dietary changes. Individual nutritional needs vary, so personalized advice is important."}`;

  return await askAI(prompt);
}

export async function chatMedicalAssistant(
  message: string,
  history: Array<{ role: "user" | "model" | "assistant"; content: string }>,
  language: "en" | "hi" = "en"
): Promise<{
  reply: string;
  hasSymptomAnalysis: boolean;
  symptomsCollected?: string;
}> {
  const historyText = history
    .map(h => `${h.role === "user" ? "Patient" : "Assistant"}: ${h.content}`)
    .join("\n");

  const isHindi = language === "hi";

  const prompt = `You are a professional, empathetic clinical medical AI assistant.
Your goal is to converse with a patient to understand their symptoms.
Behave like ChatGPT Voice Mode: keep responses warm, concise, and helpful (1-3 sentences max) so they are suitable for speech synthesis. Do not output raw markdown formatting, bullet points, lists, or headers in your conversational reply. Save detailed analysis for the final stage.

${isHindi ? "CRITICAL: The patient speaks Hindi. You MUST reply in PURE, NATURAL Hindi as spoken in India. NO English words mixed in except medical terms. NO robotic translation. Use everyday Hindi that Indians actually use. Speak like a real Indian doctor talking to a patient - warm, caring, simple words. Examples: Instead of 'when did it start', say 'kab se hai'; instead of 'how does it feel', say 'kaisa mehsoos hota hai'; instead of 'what other symptoms', say 'aur aur kya mehsoos ho raha hai'. Ask natural questions: 'kab se hai?', 'kaisa dard hai?', 'kya aur lakshan hain?', 'khana khaya hai ya nahi?'. The symptomsCollected field should remain in English for internal processing. IMPORTANT: When asking follow-up questions, be specific and detailed to get complete information." : "Reply in English with warm, conversational tone. IMPORTANT: When asking follow-up questions, be specific and detailed to get complete information."}

If the patient's symptoms are incomplete or vague (e.g. they only said "I have a headache" or "my stomach hurts"), ask one or two short follow-up questions to understand the onset, duration, pain type, severity, or accompanying symptoms (like fever, nausea, dizziness). ${isHindi ? "Ask in simple, natural Hindi: 'kab se hai?', 'kaisa dard hai?', 'kya aur lakshan hain?', 'thoda detail mein batao', etc. Be specific to get complete information." : "Ask specific questions to get complete information."}
If you have collected sufficient details about their symptoms (usually 2-3 turns of conversation) OR if the patient explicitly asks for an analysis/diagnosis, set "hasSymptomAnalysis" to true and write a clear, clinical summary of all symptoms collected in "symptomsCollected".

You MUST respond in this EXACT JSON format:
{
  "reply": "${isHindi ? "simple, natural Hindi mein short reply - jaise ek Indian doctor baat karega. garm, pyaar se, simple shabdon mein. 1-3 sentences max." : "Concise, warm, voice-friendly response to the patient. 1-3 sentences max."}",
  "hasSymptomAnalysis": true or false,
  "symptomsCollected": "A detailed clinical summary paragraph of all reported symptoms IN ENGLISH (only if hasSymptomAnalysis is true, otherwise omit or leave empty)."
}

Conversation history so far:
${historyText}
Patient: ${message}

Response JSON:`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "";
    try {
      return JSON.parse(text);
    } catch (err) {
      console.error("[chatMedicalAssistant] JSON parse failed, text was:", text);
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw err;
    }
  } catch (err) {
    console.error("[chatMedicalAssistant] error:", err);
    return {
      reply: isHindi
        ? "main samajh raha hoon ki aapko kuch problem hai. thoda detail mein batao ki ye kab se hai, kaisa mehsoos hota hai, aur aur kya mehsoos ho raha hai?"
        : "I understand you are experiencing symptoms. Could you describe them in more detail, including when they started and any other feelings you have?",
      hasSymptomAnalysis: false,
    };
  }
}

