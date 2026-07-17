import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Activity, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { VoicePlayer } from "./VoicePlayer";
import { RiskCard } from "./RiskCard";
import { DoctorRecommendationCard } from "./DoctorRecommendationCard";
import { BookAppointmentCard } from "./BookAppointmentCard";
import type { AIDoctorResult } from "@/context/AIAssistantContext";
import { detectLanguage } from "@/lib/languageDetector";

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  analysis?: {
    symptoms: string;
    analysisText: string;
    recommendedSpecialist: string;
    riskLevel: string;
    urgency: string;
    doctors: AIDoctorResult[];
  } | null;
}

interface ChatMessageProps {
  message: ChatMessageData;
  isMuted: boolean;
  onMuteToggle: () => void;
  selectedDoctor: AIDoctorResult | null;
  onSelectDoctor: (doctor: AIDoctorResult) => void;
}

// Custom Markdown + Rich Text Parser to render formatting as styled HTML elements
function renderMarkdown(text: string) {
  if (!text) return null;

  // Split content by code blocks: ```code```
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    // If it's a code block
    if (part.startsWith("```") && part.endsWith("```")) {
      const codeLines = part.slice(3, -3).trim().split("\n");
      // Check for language label on first line
      const firstLine = codeLines[0]?.trim();
      const hasLang = ["typescript", "javascript", "json", "python", "html", "css"].includes(firstLine?.toLowerCase());
      const language = hasLang ? firstLine : "code";
      const codeContent = hasLang ? codeLines.slice(1).join("\n") : codeLines.join("\n");

      return (
        <pre key={index} className="my-3 p-3 bg-zinc-950 dark:bg-black text-zinc-100 rounded-xl overflow-x-auto font-mono text-xs border border-border/20 shadow-inner">
          <div className="flex justify-between items-center text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1.5 border-b border-zinc-800 pb-1">
            <span>{language}</span>
          </div>
          <code>{codeContent}</code>
        </pre>
      );
    }

    // Process lists, tables, links, bold, and linebreaks in the text block
    const lines = part.split("\n");
    let inList = false;
    let listItems: string[] = [];
    const elements: React.ReactNode[] = [];

    const flushList = (key: number) => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${key}`} className="list-disc pl-5 my-2 space-y-1 text-xs md:text-sm">
            {listItems.map((item, itemIdx) => (
              <li key={itemIdx}>{parseInlineMarkdown(item)}</li>
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    // Detect if lines form a table block
    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = (key: number) => {
      if (tableRows.length > 0) {
        // First row is header
        const headers = tableRows[0];
        const bodyRows = tableRows.slice(1);

        elements.push(
          <div key={`table-${key}`} className="my-3 overflow-x-auto border border-border rounded-xl shadow-sm">
            <table className="min-w-full divide-y divide-border text-xs md:text-sm text-left">
              <thead className="bg-muted text-muted-foreground font-semibold">
                <tr>
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="px-4 py-2 text-[10px] md:text-xs uppercase tracking-wider font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white dark:bg-zinc-900/40">
                {bodyRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-4 py-2 font-medium">
                        {parseInlineMarkdown(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        inTable = false;
      }
    };

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();

      // Table Row Detection: starting with |
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        flushList(lineIdx);
        inTable = true;
        // Split and filter out empty cells from outer pipes
        const cells = line
          .split("|")
          .map((c) => c.trim())
          .filter((_, cIdx, arr) => cIdx > 0 && cIdx < arr.length - 1);

        // Skip divider rows (e.g. |---|---|)
        const isDivider = cells.every((c) => /^\:?-+\:?$/.test(c));
        if (!isDivider) {
          tableRows.push(cells);
        }
        return;
      } else if (inTable) {
        flushTable(lineIdx);
      }

      // Bullet List Detection: starts with • or - or *
      const listMatch = line.match(/^[\s\t]*[•\-\*]\s+(.*)/);
      if (listMatch) {
        inList = true;
        listItems.push(listMatch[1]);
      } else {
        if (inList) {
          flushList(lineIdx);
        }

        if (trimmed === "") {
          elements.push(<div key={`br-${lineIdx}`} className="h-2" />);
        } else {
          elements.push(
            <p key={`p-${lineIdx}`} className="text-xs md:text-sm leading-relaxed mb-1.5 font-medium">
              {parseInlineMarkdown(line)}
            </p>
          );
        }
      }
    });

    // Flush any remaining blocks
    flushList(lines.length);
    flushTable(lines.length);

    return <React.Fragment key={index}>{elements}</React.Fragment>;
  });
}

// Inline processing for **bold**, [links](urls)
function parseInlineMarkdown(text: string): React.ReactNode[] {
  // Regex to split by bold (**text**) and links ([text](url))
  const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-extrabold text-zinc-950 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 font-bold hover:underline inline-flex items-center gap-0.5"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return part;
  });
}

export function ChatMessage({
  message,
  isMuted,
  onMuteToggle,
  selectedDoctor,
  onSelectDoctor,
}: ChatMessageProps) {
  const isAI = message.role === "assistant";
  const initials = isAI ? "AI" : "ME";

  // Conditions parsing helper
  const conditions = React.useMemo(() => {
    if (!message.analysis || !message.analysis.analysisText) return [];
    const analysis = message.analysis.analysisText;
    const list: string[] = [];
    const causeSection = analysis.match(/Possible Causes\s*\n([\s\S]*?)(?=\n\n|\nRecommended|\n✔|\n🚨)/i);
    if (causeSection) {
      const lines = causeSection[1].split("\n").filter((l) => l.trim());
      for (const line of lines) {
        const m = line.match(/^\d+\.\s*(.+)/);
        if (m) list.push(m[1].trim());
      }
    }
    return list.slice(0, 4);
  }, [message.analysis]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "flex gap-3 w-full max-w-full pb-4",
        isAI ? "justify-start" : "justify-end"
      )}
    >
      {/* Avatar (Left side for AI) */}
      {isAI && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0 self-start mt-1">
          {initials}
        </div>
      )}

      {/* Bubble Container */}
      <div className={cn("flex flex-col max-w-[85%] sm:max-w-[75%]", isAI ? "items-start" : "items-end")}>
        {/* Timestamp */}
        <div className="flex items-center gap-1.5 mb-1 px-1 text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
          <Clock className="w-2.5 h-2.5" />
          {format(message.timestamp, "h:mm a")}
        </div>

        {/* Text bubble */}
        <div
          className={cn(
            "p-3.5 rounded-2xl shadow-sm border text-sm leading-relaxed",
            isAI
              ? "bg-white dark:bg-zinc-900 border-border/60 text-zinc-800 dark:text-zinc-200 rounded-tl-sm"
              : "bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-blue-600/30 rounded-tr-sm"
          )}
        >
          {renderMarkdown(message.content)}

          {/* Render Text-to-Speech controls for AI responses */}
          {isAI && (
            <VoicePlayer
              text={message.content}
              isMuted={isMuted}
              onMuteToggle={onMuteToggle}
              messageId={message.id}
              language={detectLanguage(message.content)}
            />
          )}
        </div>

        {/* Smart Medical Flow Attachments (Risk Card, Recommendations, Booking Cards) */}
        {isAI && message.analysis && (
          <div className="mt-3.5 w-full flex flex-col gap-3">
            {/* Card 1: Severity Risk Level */}
            <RiskCard riskLevel={message.analysis.riskLevel} />

            {/* Card 2, 3, 4: Possible conditions, Specialist, Nearby Doctors list */}
            <DoctorRecommendationCard
              conditions={conditions}
              specialist={message.analysis.recommendedSpecialist}
              doctors={message.analysis.doctors}
              selectedDoctor={selectedDoctor}
              onSelectDoctor={onSelectDoctor}
            />

            {/* Card 5 & 6: Earliest available slot and Booking Dialog action */}
            {selectedDoctor && (
              <BookAppointmentCard
                doctor={selectedDoctor}
                symptoms={message.analysis.symptoms}
                risk={message.analysis.riskLevel}
                specialist={message.analysis.recommendedSpecialist}
              />
            )}
          </div>
        )}
      </div>

      {/* Avatar (Right side for User) */}
      {!isAI && (
        <div className="w-8 h-8 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-700 dark:text-zinc-300 shadow-sm border border-border/40 shrink-0 self-start mt-1">
          {initials}
        </div>
      )}
    </motion.div>
  );
}

export default ChatMessage;
