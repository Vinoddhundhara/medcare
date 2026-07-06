import { createContext, useContext, useState, ReactNode, useRef } from "react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  time: Date;
}

interface AIAssistantState {
  // Symptom Checker
  symptoms: string;
  setSymptoms: (v: string) => void;
  symptomAnalysis: string;
  setSymptomAnalysis: (v: string) => void;
  symptomLoading: boolean;
  setSymptomLoading: (v: boolean) => void;

  // Chatbot
  messages: Message[];
  setMessages: (v: Message[]) => void;
  chatInput: string;
  setChatInput: (v: string) => void;
  chatLoading: boolean;
  setChatLoading: (v: boolean) => void;

  // Medicine Recommendation
  condition: string;
  setCondition: (v: string) => void;
  medicineResult: string;
  setMedicineResult: (v: string) => void;
  medicineLoading: boolean;
  setMedicineLoading: (v: boolean) => void;
}

const AIAssistantContext = createContext<AIAssistantState | undefined>(undefined);

export function AIAssistantProvider({ children }: { children: ReactNode }) {
  // Symptom Checker State
  const [symptoms, setSymptoms] = useState("");
  const [symptomAnalysis, setSymptomAnalysis] = useState("");
  const [symptomLoading, setSymptomLoading] = useState(false);

  // Chatbot State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "Hello! I'm your AI medical assistant. Ask me anything — health questions, medication info, diet tips, and more. How can I help you today?",
      sender: "ai",
      time: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Medicine Recommendation State
  const [condition, setCondition] = useState("");
  const [medicineResult, setMedicineResult] = useState("");
  const [medicineLoading, setMedicineLoading] = useState(false);

  return (
    <AIAssistantContext.Provider
      value={{
        symptoms, setSymptoms,
        symptomAnalysis, setSymptomAnalysis,
        symptomLoading, setSymptomLoading,
        messages, setMessages,
        chatInput, setChatInput,
        chatLoading, setChatLoading,
        condition, setCondition,
        medicineResult, setMedicineResult,
        medicineLoading, setMedicineLoading,
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
