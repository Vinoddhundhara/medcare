import { createContext, useContext, useState, ReactNode } from "react";

export interface AIDoctorResult {
  id: number;
  name: string;
  specialization: string;
  experience: number;
  consultationFee: number;
  hospital: string;
  hospitalId: number | null;
  availability: string[];
  onlineEnabled?: boolean;
  offlineEnabled?: boolean;
  videoEnabled?: boolean;
  onlineFee?: number | null;
  offlineFee?: number | null;
  videoFee?: number | null;
}

interface AIAssistantState {
  // Symptom Checker + Doctor Recommendation
  symptoms: string;
  setSymptoms: (v: string) => void;
  symptomAnalysis: string;
  setSymptomAnalysis: (v: string) => void;
  symptomLoading: boolean;
  setSymptomLoading: (v: boolean) => void;
  recommendedSpecialist: string;
  setRecommendedSpecialist: (v: string) => void;
  riskLevel: string;
  setRiskLevel: (v: string) => void;
  urgency: string;
  setUrgency: (v: string) => void;
  recommendedDoctors: AIDoctorResult[];
  setRecommendedDoctors: (v: AIDoctorResult[]) => void;

  // Medicine Recommendation
  condition: string;
  setCondition: (v: string) => void;
  medicineResult: string;
  setMedicineResult: (v: string) => void;
  medicineLoading: boolean;
  setMedicineLoading: (v: boolean) => void;

  // Diet Plan
  dietCondition: string;
  setDietCondition: (v: string) => void;
  dietAge: string;
  setDietAge: (v: string) => void;
  dietWeight: string;
  setDietWeight: (v: string) => void;
  dietActivity: string;
  setDietActivity: (v: string) => void;
  dietFoodPref: string;
  setDietFoodPref: (v: string) => void;
  dietPlan: string;
  setDietPlan: (v: string) => void;
  dietLoading: boolean;
  setDietLoading: (v: boolean) => void;
}

const AIAssistantContext = createContext<AIAssistantState | undefined>(undefined);

export function AIAssistantProvider({ children }: { children: ReactNode }) {
  // Symptom Checker
  const [symptoms, setSymptoms] = useState("");
  const [symptomAnalysis, setSymptomAnalysis] = useState("");
  const [symptomLoading, setSymptomLoading] = useState(false);
  const [recommendedSpecialist, setRecommendedSpecialist] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [urgency, setUrgency] = useState("");
  const [recommendedDoctors, setRecommendedDoctors] = useState<AIDoctorResult[]>([]);

  // Medicine Recommendation
  const [condition, setCondition] = useState("");
  const [medicineResult, setMedicineResult] = useState("");
  const [medicineLoading, setMedicineLoading] = useState(false);

  // Diet Plan
  const [dietCondition, setDietCondition] = useState("");
  const [dietAge, setDietAge] = useState("");
  const [dietWeight, setDietWeight] = useState("");
  const [dietActivity, setDietActivity] = useState("");
  const [dietFoodPref, setDietFoodPref] = useState("");
  const [dietPlan, setDietPlan] = useState("");
  const [dietLoading, setDietLoading] = useState(false);

  return (
    <AIAssistantContext.Provider
      value={{
        symptoms, setSymptoms,
        symptomAnalysis, setSymptomAnalysis,
        symptomLoading, setSymptomLoading,
        recommendedSpecialist, setRecommendedSpecialist,
        riskLevel, setRiskLevel,
        urgency, setUrgency,
        recommendedDoctors, setRecommendedDoctors,
        condition, setCondition,
        medicineResult, setMedicineResult,
        medicineLoading, setMedicineLoading,
        dietCondition, setDietCondition,
        dietAge, setDietAge,
        dietWeight, setDietWeight,
        dietActivity, setDietActivity,
        dietFoodPref, setDietFoodPref,
        dietPlan, setDietPlan,
        dietLoading, setDietLoading,
      }}
    >
      {children}
    </AIAssistantContext.Provider>
  );
}

export function useAIAssistant() {
  const context = useContext(AIAssistantContext);
  if (!context) throw new Error("useAIAssistant must be used within AIAssistantProvider");
  return context;
}
