import React, { useEffect, useState, useRef } from "react";
import { Volume2, VolumeX, Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoicePlayerProps {
  text: string;
  isMuted: boolean;
  onMuteToggle: () => void;
  messageId: string;
  language?: "en" | "hi";
}

export function VoicePlayer({ text, isMuted, onMuteToggle, messageId, language = "en" }: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Clean HTML/Markdown tags before speaking
  const cleanTextForSpeech = (rawText: string) => {
    return rawText
      .replace(/<[^>]*>/g, "") // remove HTML
      .replace(/[\#\*\_\[\]\(\)\-\+\`\|]/g, " ") // remove markdown characters
      .replace(/\s+/g, " ")
      .trim();
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
  };

  const speak = () => {
    if (!window.speechSynthesis) return;

    // Cancel anything playing
    window.speechSynthesis.cancel();

    if (isMuted) return;

    const speechText = cleanTextForSpeech(text);
    if (!speechText) return;

    const utterance = new SpeechSynthesisUtterance(speechText);
    utteranceRef.current = utterance;

    // Select appropriate voice based on language
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice: SpeechSynthesisVoice | undefined;

    if (language === "hi") {
      // Try to find Hindi voices in order of preference
      selectedVoice = voices.find((v) => v.name.includes("Google हिन्दी")) ||
                     voices.find((v) => v.name.includes("Google Hindi")) ||
                     voices.find((v) => v.name.includes("Microsoft Heera")) ||
                     voices.find((v) => v.name.includes("Microsoft Swara")) ||
                     voices.find((v) => v.lang === "hi-IN") ||
                     voices.find((v) => v.lang.startsWith("hi"));
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = "hi-IN";
      } else {
        // Fallback to hi-IN even if no specific voice found
        utterance.lang = "hi-IN";
      }
    } else {
      // English voice selection
      selectedVoice = voices.find(
        (v) => v.name.includes("Google") && v.lang.startsWith("en")
      ) || voices.find((v) => v.lang.startsWith("en"));

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    // Adjust speech parameters for more natural speech
    utterance.rate = 0.9; // Slightly slower for better clarity
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      console.error("SpeechSynthesis error", e);
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const togglePause = () => {
    if (!window.speechSynthesis) return;

    if (isPlaying) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
    } else {
      speak();
    }
  };

  // Speak automatically when the message mounts, if not muted
  useEffect(() => {
    // Small timeout to allow voices to load
    const timer = setTimeout(() => {
      if (!isMuted) {
        speak();
      }
    }, 150);

    return () => {
      stopSpeaking();
    };
  }, [text, isMuted, language]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  return (
    <div className="flex items-center gap-1 bg-muted/60 backdrop-blur-sm rounded-full p-1 border border-border/40 shadow-sm self-start mt-2">
      <Button
        variant="ghost"
        size="icon"
        className="w-7 h-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
        onClick={togglePause}
        title={isPlaying && !isPaused ? "Pause voice" : "Play voice"}
      >
        {isPlaying && !isPaused ? (
          <Pause className="w-3.5 h-3.5 text-primary" />
        ) : (
          <Play className="w-3.5 h-3.5" />
        )}
      </Button>

      {isPlaying && (
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={speak}
          title="Replay voice"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      )}

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "w-7 h-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted",
          isMuted && "text-red-500 hover:text-red-600"
        )}
        onClick={onMuteToggle}
        title={isMuted ? "Unmute voice" : "Mute voice"}
      >
        {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      </Button>
    </div>
  );
}
