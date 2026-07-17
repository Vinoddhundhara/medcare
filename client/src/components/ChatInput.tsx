import React, { useState, useRef, useEffect } from "react";
import { Send, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceRecorder } from "./VoiceRecorder";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const t_input = {
  en: {
    placeholder: "Describe your symptoms...",
    listening: "Listening...",
    attachTitle: "Attach medical reports",
    attachToast: "Attachment Mode",
    attachDesc: "Medical file upload (prescriptions, lab results) is coming soon in the next release!",
    sendTitle: "Send query",
  },
  hi: {
    placeholder: "अपने लक्षण बताएं...",
    listening: "सुन रहा है...",
    attachTitle: "मेडिकल रिपोर्ट अटैच करें",
    attachToast: "अटैचमेंट मोड",
    attachDesc: "मेडिकल फ़ाइल अपलोड (प्रिस्क्रिप्शन, लैब रिजल्ट) जल्द ही अगले अपडेट में आ रहा है!",
    sendTitle: "भेजें",
  },
};

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  language?: "en" | "hi";
}

export function ChatInput({ onSendMessage, isLoading, disabled = false, language = "en" }: ChatInputProps) {
  const tt = t_input[language];
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const handleSend = () => {
    if (!inputText.trim() || isLoading || disabled) return;
    onSendMessage(inputText.trim());
    setInputText("");
    // Focus back on textarea after sending
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea heights
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [inputText]);

  const handleTranscript = (text: string) => {
    setInputText(text);
  };

  const handleMockAttachment = () => {
    toast({
      title: tt.attachToast,
      description: tt.attachDesc,
    });
  };

  return (
    <div className="flex items-end gap-2 bg-white dark:bg-zinc-900 border border-border/80 dark:border-zinc-800 rounded-2xl p-2 shadow-sm transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
      {/* Attachment Button */}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={handleMockAttachment}
        disabled={isLoading || disabled}
        className="rounded-full w-10 h-10 text-muted-foreground hover:bg-muted"
        title={tt.attachTitle}
      >
        <Paperclip className="w-5 h-5" />
      </Button>

      {/* Input area */}
      <Textarea
        ref={textareaRef}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isListening ? tt.listening : tt.placeholder}
        disabled={isLoading || disabled}
        rows={1}
        className="flex-1 min-h-[40px] max-h-[120px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-2.5 text-sm bg-transparent leading-relaxed"
      />

      {/* Voice Recorder component (Mic trigger) */}
      <VoiceRecorder
        onTranscript={handleTranscript}
        onSend={onSendMessage}
        isListening={isListening}
        setIsListening={setIsListening}
        disabled={isLoading || disabled}
        language={language}
      />

      {/* Send Button */}
      <Button
        type="button"
        size="icon"
        onClick={handleSend}
        disabled={!inputText.trim() || isLoading || disabled}
        className={cn(
          "rounded-full w-10 h-10 shrink-0 shadow-sm transition-all duration-300",
          inputText.trim()
            ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
        title={tt.sendTitle}
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default ChatInput;
