import React from "react";
import { X, Volume2, VolumeX, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const t_header = {
  en: {
    title: "AI Medical Assistant",
    subtitle: "Your personal healthcare assistant",
    online: "Online",
    download: "Download Chat History",
    clear: "Clear Chat History",
    mute: "Mute Voice Assistant Output",
    unmute: "Enable Voice Assistant Output",
    close: "Close assistant",
  },
  hi: {
    title: "AI मेडिकल सहायक",
    subtitle: "आपका व्यक्तिगत स्वास्थ्य सहायक",
    online: "ऑनलाइन",
    download: "चैट इतिहास डाउनलोड करें",
    clear: "चैट इतिहास साफ़ करें",
    mute: "आवाज़ बंद करें",
    unmute: "आवाज़ चालू करें",
    close: "बंद करें",
  },
};

interface AssistantHeaderProps {
  onClose: () => void;
  isMuted: boolean;
  onMuteToggle: () => void;
  onClearHistory: () => void;
  onDownloadChat: () => void;
  hasMessages: boolean;
  language: "en" | "hi";
}

export function AssistantHeader({
  onClose,
  isMuted,
  onMuteToggle,
  onClearHistory,
  onDownloadChat,
  hasMessages,
  language,
}: AssistantHeaderProps) {
  const tt = t_header[language];

  return (
    <div className="flex items-center justify-between border-b border-border/60 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md px-5 py-4 shrink-0 rounded-t-3xl">
      {/* Brand & Status */}
      <div className="flex items-center gap-3">
        {/* Glow indicator */}
        <div className="relative flex h-3 w-3 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </div>

        <div className="space-y-0.5">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 leading-none">
            {tt.title}
            <span className="text-[10px] text-green-600 dark:text-green-400 font-semibold">{tt.online}</span>
          </h3>
          <p className="text-[10px] text-muted-foreground font-medium">
            {tt.subtitle}
          </p>
        </div>
      </div>

      {/* Control Actions */}
      <div className="flex items-center gap-1.5">
        {/* Download Chat */}
        {hasMessages && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onDownloadChat}
            className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
            title={tt.download}
          >
            <Download className="w-4 h-4" />
          </Button>
        )}

        {/* Clear Chat History */}
        {hasMessages && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onClearHistory}
            className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
            title={tt.clear}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}

        {/* Global Mute Toggle */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onMuteToggle}
          className={cn(
            "w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted",
            isMuted && "text-red-500 hover:text-red-600"
          )}
          title={isMuted ? tt.unmute : tt.mute}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>

        {/* Close Bottom Sheet */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onClose}
          className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
          title={tt.close}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default AssistantHeader;
