import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, AlertCircle, Skull } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RiskCardProps {
  riskLevel: string;
  language?: "en" | "hi";
}

const t_risk = {
  en: {
    heading: "Clinical Risk Level",
    emergency: { label: "Emergency", desc: "Immediate medical attention is required. Please visit the nearest emergency room or call ambulance services." },
    high:      { label: "High Risk",   desc: "Significant symptoms detected. We strongly advise consulting a specialist or physician today." },
    medium:    { label: "Medium Risk", desc: "Moderate symptoms. A consultation with a doctor is recommended within the next 24-48 hours." },
    low:       { label: "Low Risk",    desc: "Symptoms appear to be mild. Monitor your health, rest, stay hydrated, and consult a doctor if condition worsens." },
  },
  hi: {
    heading: "नैदानिक जोखिम स्तर",
    emergency: { label: "आपातकाल", desc: "तुरंत चिकित्सा सहायता ज़रूरी है। कृपया नज़दीकी आपातकक्ष जाएं या एम्बुलेंस बुलाएं।" },
    high:      { label: "उच्च जोखिम",  desc: "गंभीर लक्षण मिले हैं। आज ही किसी विशेषज्ञ या डॉक्टर से परामर्श लेने की दृढ़ सलाह है।" },
    medium:    { label: "मध्यम जोखिम", desc: "मध्यम लक्षण हैं। अगले 24-48 घंटों में डॉक्टर से मिलना उचित रहेगा।" },
    low:       { label: "कम जोखिम",   desc: "लक्षण हल्के लग रहे हैं। आराम करें, पानी पिएं, और यदि स्थिति बिगड़े तो डॉक्टर से मिलें।" },
  },
};

export function RiskCard({ riskLevel, language = "en" }: RiskCardProps) {
  const level = riskLevel.toUpperCase().trim();
  const tt = t_risk[language];

  const getRiskConfig = () => {
    if (level.includes("EMERGENCY")) {
      return {
        ...tt.emergency,
        colorClass: "text-red-600 bg-red-500/10 border-red-500/20",
        pillClass: "bg-red-600 text-white animate-pulse",
        icon: <Skull className="w-6 h-6 text-red-600" />,
      };
    }
    if (level.includes("HIGH")) {
      return {
        ...tt.high,
        colorClass: "text-red-500 bg-red-500/5 border-red-500/15",
        pillClass: "bg-red-500 text-white",
        icon: <AlertTriangle className="w-6 h-6 text-red-500 animate-bounce" />,
      };
    }
    if (level.includes("MEDIUM")) {
      return {
        ...tt.medium,
        colorClass: "text-amber-600 bg-amber-500/5 border-amber-500/15",
        pillClass: "bg-amber-500 text-black",
        icon: <AlertCircle className="w-6 h-6 text-amber-500" />,
      };
    }
    return {
      ...tt.low,
      colorClass: "text-green-600 bg-green-500/5 border-green-500/15",
      pillClass: "bg-green-600 text-white",
      icon: <CheckCircle2 className="w-6 h-6 text-green-500" />,
    };
  };

  const config = getRiskConfig();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full"
    >
      <Card className={cn("overflow-hidden border border-solid backdrop-blur-md shadow-sm", config.colorClass)}>
        <CardContent className="p-4 flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-white/70 dark:bg-zinc-800/80 shadow-sm flex-shrink-0">
            {config.icon}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{tt.heading}</h4>
              <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", config.pillClass)}>
                {config.label}
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {config.desc}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default RiskCard;
