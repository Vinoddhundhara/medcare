import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Mic, Loader2, Volume2, VolumeX, Sparkles } from "lucide-react";
import { AssistantBottomSheet } from "./AssistantBottomSheet";
import { cn } from "@/lib/utils";

export function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Poll SpeechSynthesis state to update isSpeaking dynamically
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const timer = setInterval(() => {
      setIsSpeaking(window.speechSynthesis.speaking);
    }, 200);

    return () => clearInterval(timer);
  }, []);

  // Poll SpeechRecognition listening state by checking mic indicators
  useEffect(() => {
    // Check if any element indicates listening
    const timer = setInterval(() => {
      const listeningElement = document.querySelector(".bg-red-500.animate-pulse");
      setIsListening(!!listeningElement);
    }, 300);

    return () => clearInterval(timer);
  }, []);

  const handleToggleOpen = () => {
    setIsOpen(!isOpen);
    // If closing, cancel any speaking voice
    if (isOpen && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    if (!isMuted && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  // Determine current assistant state
  const isThinking = statusText === "Thinking...";

  // ─── Animations ────────────────────────────────────────────────────────────
  // Floating up/down translation
  const floatTransition = {
    y: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    },
  };

  return (
    <>
      <div className="fixed bottom-[25px] right-[25px] z-50 flex items-center gap-3">
        {/* Thinking / Status Tooltip Banner */}
        <AnimatePresence>
          {(isThinking || isSpeaking || isListening) && (
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 15, scale: 0.95 }}
              className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-border/80 px-3.5 py-1.5 rounded-full shadow-lg text-[10px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2"
            >
              {isListening && (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span className="tracking-wide">Listening...</span>
                </>
              )}
              {isThinking && (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span className="tracking-wide text-primary">Thinking...</span>
                </>
              )}
              {isSpeaking && (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="tracking-wide text-emerald-600 dark:text-emerald-400">Speaking...</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Action Button */}
        <motion.div
          animate={{
            y: isOpen ? 0 : [0, -8, 0],
          }}
          transition={isOpen ? {} : floatTransition}
          className="relative shrink-0"
        >
          {/* Outer glowing rotating ring (Idle state) */}
          <AnimatePresence>
            {!isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  rotate: 360,
                  scale: isListening ? 1.15 : isSpeaking ? 1.08 : 1,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  rotate: { repeat: Infinity, ease: "linear", duration: isListening ? 2 : 4 },
                  scale: { duration: 0.3 },
                }}
                className={cn(
                  "absolute -inset-1.5 rounded-full blur-[4px] pointer-events-none transition-all duration-500",
                  isListening
                    ? "bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-500 shadow-[0_0_20px_rgba(59,130,246,0.6)]"
                    : isSpeaking
                    ? "bg-gradient-to-tr from-emerald-400 via-teal-500 to-green-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                    : "bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-600 opacity-60 shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                )}
              />
            )}
          </AnimatePresence>

          {/* Core Widget Button (70x70) */}
          <motion.button
            onClick={handleToggleOpen}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "w-[70px] h-[70px] rounded-full flex items-center justify-center text-white border-0 cursor-pointer transition-all duration-500 select-none relative z-10 outline-none",
              isOpen
                ? "bg-zinc-900 dark:bg-zinc-800 shadow-xl"
                : isListening
                ? "bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-[0_8px_25px_rgba(6,182,212,0.4)]"
                : isSpeaking
                ? "bg-gradient-to-tr from-emerald-500 to-teal-600 shadow-[0_8px_25px_rgba(16,185,129,0.4)]"
                : "bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 shadow-[0_8px_25px_rgba(99,102,241,0.4)]"
            )}
            title="Open AI Medical Assistant"
            aria-label="Open AI Medical Assistant"
          >
            {isOpen ? (
              /* Close visualizer */
              <motion.div
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                className="flex items-center justify-center"
              >
                <MessageSquare className="w-6 h-6 text-white" />
              </motion.div>
            ) : (
              /* Idle / Listening / Speaking icon indicators */
              <div className="relative w-full h-full flex items-center justify-center">
                {isListening ? (
                  /* Waveform representation for voice capturing */
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-6 bg-white rounded-full animate-[bounce_0.8s_infinite_-0.2s]" />
                    <span className="w-1.5 h-8 bg-white rounded-full animate-[bounce_0.8s_infinite_0s]" />
                    <span className="w-1.5 h-6 bg-white rounded-full animate-[bounce_0.8s_infinite_0.2s]" />
                  </div>
                ) : isSpeaking ? (
                  /* Audio ripples for AI output */
                  <div className="relative flex items-center justify-center">
                    <span className="absolute animate-[ping_1.5s_infinite] w-8 h-8 rounded-full bg-emerald-400 opacity-60" />
                    <Volume2 className="w-6 h-6 text-white relative z-10" />
                  </div>
                ) : isThinking ? (
                  /* Spinner animation */
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                ) : (
                  /* Standard Idle state */
                  <motion.div
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ repeat: Infinity, duration: 2.2 }}
                    className="flex items-center justify-center"
                  >
                    <Sparkles className="w-6 h-6 text-white" />
                  </motion.div>
                )}
              </div>
            )}
          </motion.button>
        </motion.div>
      </div>

      {/* Slide up Bottom Sheet Drawer */}
      <AssistantBottomSheet
        isOpen={isOpen}
        onClose={handleToggleOpen}
        isMuted={isMuted}
        onMuteToggle={handleMuteToggle}
        onSetStatusText={setStatusText}
      />
    </>
  );
}

export default FloatingAIAssistant;
