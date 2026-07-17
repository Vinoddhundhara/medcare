import React, { useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const t_recorder = {
  en: {
    permDeniedTitle: "Permission Denied",
    permDeniedDesc: "Please allow microphone access in your browser settings.",
    notSupportedTitle: "Not Supported",
    notSupportedDesc: "Speech recognition is not supported in this browser. Try Chrome or Safari.",
    stopLabel: "Stop listening",
    startLabel: "Start voice input",
  },
  hi: {
    permDeniedTitle: "अनुमति नहीं मिली",
    permDeniedDesc: "कृपया ब्राउज़र सेटिंग्स में माइक्रोफ़ोन की अनुमति दें।",
    notSupportedTitle: "समर्थित नहीं",
    notSupportedDesc: "इस ब्राउज़र में स्पीच पहचान काम नहीं करती। Chrome या Safari आज़माएं।",
    stopLabel: "सुनना बंद करें",
    startLabel: "आवाज़ से इनपुट शुरू करें",
  },
};

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  onSend: (text: string) => void;
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
  disabled?: boolean;
  language?: "en" | "hi";
}

export function VoiceRecorder({
  onTranscript,
  onSend,
  isListening,
  setIsListening,
  disabled = false,
  language = "en",
}: VoiceRecorderProps) {
  const { toast } = useToast();
  const tt = t_recorder[language];
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef<string>("");

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech Recognition API is not supported in this browser.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    // Set language for recognition: Hindi or English-India
    rec.lang = language === "hi" ? "hi-IN" : "en-IN";

    rec.onstart = () => {
      setIsListening(true);
      finalTranscriptRef.current = "";
    };

    rec.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const totalTranscript = finalTranscriptRef.current + finalTranscript + interimTranscript;
      onTranscript(totalTranscript);

      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (finalTranscript || interimTranscript) {
        silenceTimeoutRef.current = setTimeout(() => {
          const finalVal = finalTranscriptRef.current + finalTranscript;
          if (finalVal.trim()) {
            onSend(finalVal);
            stopListening();
          }
        }, 2200);
      }
    };

    rec.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event.error);
      if (event.error === "not-allowed") {
        toast({
          title: tt.permDeniedTitle,
          description: tt.permDeniedDesc,
          variant: "destructive",
        });
      }
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };
  }, [language, setIsListening, onTranscript, onSend, toast, tt]);

  const startListening = () => {
    if (disabled) return;
    if (!recognitionRef.current) {
      toast({
        title: tt.notSupportedTitle,
        description: tt.notSupportedDesc,
        variant: "destructive",
      });
      return;
    }
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.error(e);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error(e);
      }
    }
    setIsListening(false);
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const hasSupport = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  if (!hasSupport) return null;

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={toggleListening}
      disabled={disabled}
      className={cn(
        "rounded-full w-10 h-10 transition-all duration-300 relative",
        isListening
          ? "bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]"
          : "hover:bg-muted text-muted-foreground"
      )}
      title={isListening ? tt.stopLabel : tt.startLabel}
      aria-label={isListening ? tt.stopLabel : tt.startLabel}
    >
      {isListening ? (
        <MicOff className="w-5 h-5 animate-pulse" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </Button>
  );
}
