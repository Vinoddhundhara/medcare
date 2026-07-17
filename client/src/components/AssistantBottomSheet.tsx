import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Stethoscope, Sparkles } from "lucide-react";
import { AssistantHeader } from "./AssistantHeader";
import { ChatMessage, type ChatMessageData } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { useLanguage } from "@/context/LanguageContext";
import type { AIDoctorResult } from "@/context/AIAssistantContext";

// ─── Translations for the Voice Assistant widget ──────────────────────────────
const t_assistant = {
  en: {
    welcomeTitle: "Welcome to MedCare Assistant",
    welcomeDesc: "Consult with our voice-enabled medical assistant. Describe your symptoms naturally (via text or microphone). We will analyze severity risk levels, recommend specialist types, and match live doctor availability instantly.",
    errorReply: "I apologize, but I am having trouble connecting to the clinic systems. Please verify your connection and describe your symptoms again.",
    downloadPrefix: "medcare_ai_symptoms_chat",
    patientLabel: "Patient",
    aiLabel: "Medical AI Assistant",
  },
  hi: {
    welcomeTitle: "MedCare सहायक में आपका स्वागत है",
    welcomeDesc: "हमारे वॉइस-सक्षम मेडिकल असिस्टेंट से बात करें। अपने लक्षणों को टेक्स्ट या माइक्रोफ़ोन द्वारा बताएं। हम जोखिम स्तर, विशेषज्ञ प्रकार और डॉक्टर की लाइव उपलब्धता तुरंत दिखाएंगे।",
    errorReply: "मुझे क्लिनिक सिस्टम से कनेक्ट करने में समस्या हो रही है। कृपया अपना कनेक्शन जांचें और अपने लक्षण दोबारा बताएं।",
    downloadPrefix: "medcare_ai_लक्षण_चैट",
    patientLabel: "मरीज़",
    aiLabel: "मेडिकल AI सहायक",
  },
};

interface AssistantBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isMuted: boolean;
  onMuteToggle: () => void;
  onSetStatusText: (text: string) => void;
}

export function AssistantBottomSheet({
  isOpen,
  onClose,
  isMuted,
  onMuteToggle,
  onSetStatusText,
}: AssistantBottomSheetProps) {
  const { language } = useLanguage();
  const tt = t_assistant[language];

  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<AIDoctorResult | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Load chat history from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("medcare_assistant_chat");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert ISO string dates back to Date objects
        const formatted = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setMessages(formatted);

        // Pre-select doctor if the last AI message has one
        const lastAIWithDoc = [...formatted]
          .reverse()
          .find((m) => m.role === "assistant" && m.analysis?.doctors?.length);
        if (lastAIWithDoc && lastAIWithDoc.analysis?.doctors?.length) {
          setSelectedDoctor(lastAIWithDoc.analysis.doctors[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load chat history:", e);
    }
  }, []);

  // Save chat history to LocalStorage
  const saveChatHistory = (msgs: ChatMessageData[]) => {
    try {
      localStorage.setItem("medcare_assistant_chat", JSON.stringify(msgs));
    } catch (e) {
      console.error("Failed to save chat history:", e);
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Keyboard accessibility: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Trigger text-to-status propagation
  useEffect(() => {
    if (isLoading) {
      onSetStatusText(language === "hi" ? "सोच रहा है..." : "Thinking...");
    } else {
      onSetStatusText("");
    }
  }, [isLoading, onSetStatusText, language]);

  // Clear chat
  const handleClearHistory = () => {
    setMessages([]);
    setSelectedDoctor(null);
    localStorage.removeItem("medcare_assistant_chat");
  };

  // Download chat history
  const handleDownloadChat = () => {
    if (messages.length === 0) return;
    const cleanText = messages
      .map(
        (m) =>
          `[${m.timestamp.toLocaleString()}] ${
            m.role === "user" ? tt.patientLabel : tt.aiLabel
          }:\n${m.content}\n`
      )
      .join("\n========================================\n\n");

    const blob = new Blob([cleanText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${tt.downloadPrefix}_${formatDate(new Date())}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  // Message sending / handling logic
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Create user message
    const userMsg: ChatMessageData = {
      id: Math.random().toString(36).substring(2, 9),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    saveChatHistory(updatedMessages);
    setIsLoading(true);

    try {
      // Map message log for Gemini context format
      const formattedHistory = messages.map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("model" as const),
        content: m.content,
      }));

      const res = await fetch("/api/ai/voice-assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: formattedHistory,
          language,
        }),
      });

      if (!res.ok) throw new Error("API call failed");

      const data = await res.json();

      const aiMsg: ChatMessageData = {
        id: Math.random().toString(36).substring(2, 9),
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
        analysis: data.analysis
          ? {
              symptoms: data.analysis.symptoms,
              analysisText: data.analysis.analysis,
              recommendedSpecialist: data.analysis.recommendedSpecialist,
              riskLevel: data.analysis.risk,
              urgency: data.analysis.urgency,
              doctors: data.analysis.doctors || [],
            }
          : null,
      };

      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);
      saveChatHistory(finalMessages);

      if (data.analysis?.doctors?.length) {
        setSelectedDoctor(data.analysis.doctors[0]);
      }
    } catch (err) {
      console.error(err);
      const errMsg: ChatMessageData = {
        id: Math.random().toString(36).substring(2, 9),
        role: "assistant",
        content: tt.errorReply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop Blur & Overlay */}
          <motion.div
            ref={backdropRef}
            onClick={handleBackdropClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-zinc-950/60 dark:bg-black/80 backdrop-blur-[6px]"
          />

          {/* Bottom Sheet Window (80% Height) */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="relative w-full max-w-4xl h-[80%] bg-zinc-50 dark:bg-zinc-950 rounded-t-[30px] shadow-2xl flex flex-col overflow-hidden border-t border-border/80 dark:border-zinc-800"
          >
            {/* Grab handle bar */}
            <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto my-2.5 flex-shrink-0" />

            {/* Header */}
            <AssistantHeader
              onClose={onClose}
              isMuted={isMuted}
              onMuteToggle={onMuteToggle}
              onClearHistory={handleClearHistory}
              onDownloadChat={handleDownloadChat}
              hasMessages={messages.length > 0}
              language={language}
            />

            {/* Chat Body (Scrollable viewport) */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.length === 0 ? (
                /* Welcome panel if chat is empty */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4 py-8"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                    <Stethoscope className="w-8 h-8 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-1.5">
                      {tt.welcomeTitle}
                      <Sparkles className="w-4 h-4 text-indigo-500 fill-indigo-500" />
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {tt.welcomeDesc}
                    </p>
                  </div>
                </motion.div>
              ) : (
                /* Chat message elements */
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      message={msg}
                      isMuted={isMuted}
                      onMuteToggle={onMuteToggle}
                      selectedDoctor={selectedDoctor}
                      onSelectDoctor={setSelectedDoctor}
                      language={language}
                    />
                  ))}
                </div>
              )}

              {/* Typing indicator inside scrolling body */}
              {isLoading && <TypingIndicator />}

              {/* Bottom scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Input drawer */}
            <div className="p-4 border-t border-border/60 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md shrink-0">
              <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} language={language} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default AssistantBottomSheet;
